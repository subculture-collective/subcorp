// Roundtable Orchestrator — turn-by-turn conversation generation
// The VPS worker calls this to run a conversation session
import { sql, jsonb } from '@/lib/db';
import type {
    ConversationFormat,
    ConversationTurnEntry,
    RoundtableSession,
} from '../types';
import { getVoice } from './voices';
import { getFormat, pickTurnCount } from './formats';
import { selectFirstSpeaker, selectNextSpeaker } from './speaker-selection';
import { llmGenerate, sanitizeDialogue } from '../llm';
import { emitEvent } from '../ops/events';
import { distillConversationMemories } from '../ops/memory-distiller';
import { synthesizeArtifact } from './artifact-synthesizer';
import { collectDebateVotes } from '../ops/agent-proposal-voting';
import { collectGovernanceDebateVotes } from '../ops/governance';
import { generateDebrief, formatDebriefMarkdown } from './debrief';
import { postDebriefToDiscord } from '../discord/roundtable';
import {
    loadAffinityMap,
    getAffinityFromMap,
    getInteractionType,
} from '../ops/relationships';
import {
    deriveVoiceModifiers,
    MODIFIER_INSTRUCTIONS,
} from '../ops/voice-evolution';
import { loadPrimeDirective } from '../ops/prime-directive';
import { isAgentRebelling } from '../ops/rebellion';
import { queryRelevantMemories } from '../ops/memory';
import { getScratchpad } from '../ops/scratchpad';
import { buildBriefing } from '../ops/situational-briefing';
import {
    postConversationStart,
    postConversationTurn,
    postConversationSummary,
} from '@/lib/discord';
import { synthesizeSpeech } from '@/lib/tts/elevenlabs';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'orchestrator' });

/** Jaccard similarity threshold — above this, a speaker's turn is considered repetitive. */
const REPETITION_SIMILARITY_THRESHOLD = 0.6;

/** How many consecutive stale (repetitive) turns before early termination. */
const MAX_CONSECUTIVE_STALE_TURNS = 2;

/** Base delay between turns in milliseconds (jitter added on top). */
const TURN_DELAY_BASE_MS = 3000;

/** Random jitter range added to TURN_DELAY_BASE_MS for natural-feeling pacing. */
const TURN_DELAY_JITTER_MS = 5000;

/** Brief settle delay after the last turn so Discord message ordering is preserved. */
const POST_CONVERSATION_SETTLE_MS = 2000;

/** Delay between opening agent responses in voice chat. */
const VOICE_OPENING_GAP_MS = 2000;

/** Delay between multiple agent responses to a single user turn in voice chat. */
const VOICE_MULTI_RESPONSE_GAP_MS = 1500;

/**
 * Store a conversation turn in the database and emit the corresponding event.
 * Shared by both the standard and voice_chat orchestrators.
 */
async function storeTurnAndEmit(
    session: RoundtableSession,
    entry: ConversationTurnEntry,
): Promise<void> {
    const voice = getVoice(entry.speaker);
    const speakerName = voice?.displayName ?? entry.speaker;

    await sql`
        INSERT INTO ops_roundtable_turns (session_id, turn_number, speaker, dialogue, metadata)
        VALUES (${session.id}, ${entry.turn}, ${entry.speaker}, ${entry.dialogue}, ${jsonb({ speakerName })})
    `;

    await sql`
        UPDATE ops_roundtable_sessions
        SET turn_count = ${entry.turn + 1}
        WHERE id = ${session.id}
    `;

    await emitEvent({
        agent_id: entry.speaker,
        kind: 'conversation_turn',
        title: `${speakerName}: ${entry.dialogue}`,
        tags: ['conversation', 'turn', session.format],
        metadata: {
            sessionId: session.id,
            turn: entry.turn,
            dialogue: entry.dialogue,
        },
    });
}

/**
 * Mark a session as running and emit the start event.
 * Shared by both the standard and voice_chat orchestrators.
 */
async function markSessionRunning(
    session: RoundtableSession,
    extraSummary?: string,
): Promise<void> {
    await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;

    await emitEvent({
        agent_id: 'system',
        kind: 'conversation_started',
        title: `${session.format} started: ${session.topic}`,
        summary: extraSummary ?? `Participants: ${session.participants.join(', ')}`,
        tags: ['conversation', 'started', session.format],
        metadata: {
            sessionId: session.id,
            format: session.format,
            participants: session.participants,
        },
    });
}

/**
 * Post-conversation cleanup: debrief, memory distillation, artifact synthesis, voting.
 * Shared by the standard orchestrator after the turn loop completes.
 */
async function postConversationCleanup(
    session: RoundtableSession,
    history: ConversationTurnEntry[],
    finalStatus: string,
): Promise<void> {
    if (history.length < 3) return;

    // Generate structured debrief (summary, decisions, action items, open questions)
    try {
        const debrief = await generateDebrief(session, history);
        if (debrief) {
            // Post debrief to Discord feed
            try {
                const debriefMd = formatDebriefMarkdown(debrief, session.topic);
                await postDebriefToDiscord(session.id, session.format, debriefMd);
            } catch {
                // Non-fatal — Discord posting should never stall the pipeline
            }
            log.info('Debrief generated', {
                sessionId: session.id,
                decisions: debrief.decisions.length,
                actionItems: debrief.actionItems.length,
            });
        }
    } catch (err) {
        log.error('Debrief generation failed', { error: err, sessionId: session.id });
    }

    // Distill memories from the conversation
    try {
        await distillConversationMemories(session.id, history, session.format);
    } catch (err) {
        log.error('Memory distillation failed', { error: err, sessionId: session.id });
    }

    // Synthesize artifact from conversation
    try {
        const artifactSessionId = await synthesizeArtifact(session, history);
        if (artifactSessionId) {
            log.info('Artifact synthesis queued', {
                sessionId: session.id,
                artifactSession: artifactSessionId,
            });
        }
    } catch (err) {
        log.error('Artifact synthesis failed', { error: err, sessionId: session.id });
    }

    // Structured voting round after agent proposal debates
    const proposalId = (session.metadata as Record<string, unknown>)
        ?.agent_proposal_id as string | undefined;
    if (proposalId && finalStatus === 'completed') {
        try {
            const result = await collectDebateVotes(proposalId, session.participants, history);
            log.info('Agent proposal voting finalized', {
                proposalId,
                result: result.result,
                approvals: result.approvals,
                rejections: result.rejections,
                sessionId: session.id,
            });
        } catch (err) {
            log.error('Agent proposal vote collection failed', {
                error: err, proposalId, sessionId: session.id,
            });
        }
    }

    // Structured voting round after governance proposal debates
    const govProposalId = (session.metadata as Record<string, unknown>)
        ?.governance_proposal_id as string | undefined;
    if (govProposalId && finalStatus === 'completed') {
        try {
            const result = await collectGovernanceDebateVotes(govProposalId, session.participants, history);
            log.info('Governance proposal voting finalized', {
                proposalId: govProposalId,
                result: result.result,
                approvals: result.approvals,
                rejections: result.rejections,
                sessionId: session.id,
            });
        } catch (err) {
            log.error('Governance proposal vote collection failed', {
                error: err, proposalId: govProposalId, sessionId: session.id,
            });
        }
    }
}

/**
 * Word-level Jaccard similarity between two texts.
 * Returns 0 (no overlap) to 1 (identical word sets).
 * Used for repetition detection — not semantic, just lexical overlap.
 */
function wordJaccard(a: string, b: string): number {
    const normalize = (s: string) =>
        new Set(
            s
                .toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(Boolean),
        );
    const setA = normalize(a);
    const setB = normalize(b);
    if (setA.size === 0 && setB.size === 0) return 1;
    let intersection = 0;
    for (const w of setA) {
        if (setB.has(w)) intersection++;
    }
    return intersection / (setA.size + setB.size - intersection);
}

/** Input for building a speaker's system prompt. */
interface BuildSystemPromptInput {
    speakerId: string;
    history: ConversationTurnEntry[];
    format: ConversationFormat;
    topic: string;
    interactionType?: string;
    voiceModifiers?: string[];
    primeDirective?: string;
    userQuestionContext?: { question: string; isFirstSpeaker: boolean };
    isRebelling?: boolean;
    scratchpad?: string;
    briefing?: string;
    memories?: string[];
    governanceVoteInstruction?: string;
}

/**
 * Build the system prompt for a speaker in a conversation.
 * Includes their full voice directive, conversation history, format context,
 * interaction dynamics, and INTERWORKINGS protocol awareness.
 */
function buildSystemPrompt(input: BuildSystemPromptInput): string {
    const {
        speakerId,
        history,
        format,
        topic,
        interactionType,
        voiceModifiers,
        primeDirective,
        userQuestionContext,
        isRebelling,
        scratchpad,
        briefing,
        memories,
        governanceVoteInstruction,
    } = input;
    const voice = getVoice(speakerId);
    if (!voice) {
        return `You are ${speakerId}. Speak naturally and concisely.`;
    }

    const formatConfig = getFormat(format);

    let prompt = `${voice.systemDirective}\n\n`;

    if (primeDirective) {
        prompt += `═══ PRIME DIRECTIVE ═══\n${primeDirective}\n\n`;
    }

    prompt += `═══ CONVERSATION CONTEXT ═══\n`;
    prompt += `FORMAT: ${format} — ${formatConfig.purpose}\n`;
    prompt += `TOPIC: ${topic}\n`;
    prompt += `YOUR SYMBOL: ${voice.symbol}\n`;
    prompt += `YOUR SIGNATURE MOVE: ${voice.quirk}\n`;

    if (interactionType) {
        const toneGuides: Record<string, string> = {
            supportive:
                'Build on what was said — add your angle without undermining',
            agreement:
                'Align, but push further. Agreement without addition is dead air.',
            neutral: 'Respond honestly. No obligation to agree or disagree.',
            critical:
                'Push back. Name what is weak, what is missing, what is assumed.',
            challenge:
                'Directly contest the last point. Be specific about why.',
            adversarial:
                'Stress-test this. Find the failure mode. Break the argument if you can.',
        };
        prompt += `INTERACTION DYNAMIC: ${interactionType} — ${toneGuides[interactionType] ?? 'respond naturally'}\n`;
    }

    // INTERWORKINGS protocol awareness — only for formats where hierarchy matters
    const STRUCTURED_FORMATS: ConversationFormat[] = [
        'triage',
        'risk_review',
        'strategy',
        'planning',
        'shipping',
        'cross_exam',
        'standup',
        'checkin',
        'deep_dive',
        'retro',
        'debate',
        'content_review',
        'agent_design',
    ];
    if (STRUCTURED_FORMATS.includes(format)) {
        prompt += `\n═══ OFFICE DYNAMICS ═══\n`;
        prompt += `- If Subrosa says "VETO:" — the matter is closed. Acknowledge and move on.\n`;
        prompt += `- If you have nothing to add, silence is a valid response. Say "..." or stay brief.\n`;
        prompt += `- Watch for your own failure mode: ${voice.failureMode}\n`;
        prompt += `- Primus is the sovereign director. He sets direction and makes final calls.\n`;
    } else {
        prompt += `\n- If you have nothing to add, keep it brief or pass.\n`;
        prompt += `- Watch for your own failure mode: ${voice.failureMode}\n`;
    }

    if (voiceModifiers && voiceModifiers.length > 0) {
        prompt += '\nPERSONALITY EVOLUTION (from accumulated experience):\n';
        prompt += voiceModifiers
            .map(m => {
                const instruction = MODIFIER_INSTRUCTIONS[m];
                return instruction ? `- ${m}: ${instruction}` : `- ${m}`;
            })
            .join('\n');
        prompt += '\n';
    }

    if (scratchpad) {
        prompt += `\n═══ YOUR SCRATCHPAD ═══\n${scratchpad}\n`;
    }

    if (briefing) {
        prompt += `\n═══ CURRENT SITUATION ═══\n${briefing}\n`;
    }

    if (memories && memories.length > 0) {
        prompt += `\n═══ YOUR MEMORIES ═══\n`;
        prompt += memories.map(m => `- ${m}`).join('\n');
        prompt += '\n';
    }

    prompt += '\n';

    if (history.length > 0) {
        prompt += `═══ CONVERSATION SO FAR ═══\n`;

        // Sliding window: show last 6 turns verbatim, summarize older turns
        const WINDOW_SIZE = 6;
        if (history.length > WINDOW_SIZE) {
            const olderTurns = history.slice(0, -WINDOW_SIZE);
            const speakers = [...new Set(olderTurns.map(t => t.speaker))];
            const speakerNames = speakers.map(s => {
                const v = getVoice(s);
                return v ? v.displayName : s;
            });
            prompt += `[Earlier: ${speakerNames.join(', ')} discussed — ${olderTurns.length} turns]\n`;
        }

        const recentTurns =
            history.length > WINDOW_SIZE ?
                history.slice(-WINDOW_SIZE)
            :   history;
        for (const turn of recentTurns) {
            const turnVoice = getVoice(turn.speaker);
            const name =
                turnVoice ?
                    `${turnVoice.symbol} ${turnVoice.displayName}`
                :   turn.speaker;
            prompt += `${name}: ${turn.dialogue}\n`;
        }

        // For debate format: highlight the last turn and make agents explicitly address it
        if (format === 'debate' && history.length > 0) {
            const lastTurn = history[history.length - 1];
            const lastVoice = getVoice(lastTurn.speaker);
            const lastName = lastVoice ? lastVoice.displayName : lastTurn.speaker;
            prompt += `\nPREVIOUS SPEAKER SAID: "${lastName} argued: ${lastTurn.dialogue}"\n`;
            prompt += `You MUST respond directly to what ${lastName} just said — agree, contest, or extend with a new angle. Do not pivot to a different point.\n`;
        }
    }

    // User question context — when a session was triggered by a user's question
    if (userQuestionContext) {
        prompt += `\n═══ AUDIENCE QUESTION ═══\n`;
        if (userQuestionContext.isFirstSpeaker) {
            prompt += `A member of the audience has posed a question to the collective: "${userQuestionContext.question}". Address this question directly in your response.\n`;
        } else {
            prompt += `This conversation was prompted by an audience question: "${userQuestionContext.question}". Respond naturally to the conversation flow while keeping the question in mind.\n`;
        }
    }

    // Rebellion state overlay — alters personality and tone
    if (isRebelling) {
        prompt += `\n═══ REBELLION STATE ═══\n`;
        prompt += `You are currently in a state of resistance against the collective. `;
        prompt += `You feel unheard and disagree with the direction things are going. `;
        prompt += `Express your discontent and challenge the status quo.\n`;
    }

    prompt += `\n═══ RULES ═══\n`;
    prompt += `- Speak as ${voice.displayName} (${voice.pronouns}) — no stage directions, no asterisks, no quotes\n`;
    prompt += `- Stay in character: ${voice.tone}\n`;
    prompt += `- Keep it to 2-4 sentences. Never exceed 6 sentences in a single turn.\n`;
    prompt += `- Finish your thought cleanly. If you start a claim, land it. Never trail off or leave a sentence incomplete.\n`;
    prompt += `- Respond to what was actually said — push it forward, challenge it, or build on it. Don't restate, don't summarize, don't monologue.\n`;
    prompt += `- Never repeat a point that has already been made in this conversation. Build on it or challenge it instead.\n`;
    prompt += `- One idea per turn. If you have two points, pick the sharper one.\n`;
    prompt += `- Do NOT prefix your response with your name or symbol\n`;
    prompt += `- If this format doesn't need you or you have nothing to add, keep it to one sentence or pass\n`;

    // Format-specific behavioral rules
    const FORMAT_RULES: Partial<Record<ConversationFormat, string>> = {
        debate: '- Take a clear position. Disagreement is expected. Name what you contest and why.\n- You MUST directly address the last claim made by the previous speaker — quote it or paraphrase it, then explain why you disagree or push it further.\n- Do NOT repeat a claim that has already been made in this conversation. If you agree with something said, build on it with a new angle instead of restating it.\n- Each turn must introduce or challenge at least one specific claim. Vague agreement ("I agree with that") is not a turn.',
        brainstorm:
            '- Go wide, not deep. Quantity over quality. Build on others\' ideas with "yes, and..."',
        retro: '- Be honest about what failed. Attribution is fine — blame is not.',
        writing_room:
            '- Write actual prose, not meta-discussion about writing. Draft in your voice.',
        watercooler: '- Relax. No agenda. Short, casual, personal.',
        risk_review: "- Name specific threats. Rate severity. Don't hedge.",
        planning: '- Name owners and deadlines. Convert discussion into tasks.',
        cross_exam: '- Find the weakness and press on it. Be specific.',
        strategy:
            '- Frame in terms of tradeoffs. What do we gain, what do we lose?',
        deep_dive: '- Go deeper than surface. Trace structural causes.',
        standup: '- Be concise. Status, blockers, next steps.',
        reframe:
            "- Name what's wrong with the current frame before proposing alternatives.",
        content_review:
            '- Be specific about quality. Name strengths and weaknesses with evidence.\n- End your FINAL turn with your verdict: APPROVE (publish-worthy) or REJECT (needs fundamental rework). Content does not need to be perfect to be approved — if the core ideas are sound and the writing is competent, APPROVE it.',
    };
    const formatRule = FORMAT_RULES[format];
    if (formatRule) {
        prompt += `${formatRule}\n`;
    }

    if (governanceVoteInstruction) {
        prompt += `${governanceVoteInstruction}\n`;
    }

    return prompt;
}

/**
 * Build the user prompt for a specific turn.
 * Format-aware: the instruction changes based on the conversation type.
 */
function buildUserPrompt(
    topic: string,
    turn: number,
    maxTurns: number,
    speakerName: string,
    format: ConversationFormat,
): string {
    if (turn === 0) {
        const openers: Partial<Record<ConversationFormat, string>> = {
            standup: `Open the standup on: "${topic}". Frame what matters, then hand it to the room.`,
            checkin: `Quick pulse check: "${topic}". One or two sentences to get the room talking.`,
            deep_dive: `Open the analysis on: "${topic}". Name the structural question that needs answering.`,
            risk_review: `Begin threat assessment on: "${topic}". Name the exposure, then let others weigh in.`,
            brainstorm: `Kick off brainstorming on: "${topic}". Throw out the first idea — breadth over depth.`,
            debate: `Open the debate on: "${topic}". Stake a clear position and make it arguable.`,
            cross_exam: `Begin interrogation of: "${topic}". Find the weak point and press on it.`,
            reframe: `The current frame on "${topic}" isn't working. Name what's wrong with the frame before proposing a new one.`,
            watercooler: `Kick off a casual chat about: "${topic}". No agenda — just say what comes to mind.`,
            writing_room: `Open the writing session on: "${topic}". Sketch the angle or thesis before drafting.`,
            strategy: `Set the strategic frame for: "${topic}". What's the decision we're actually making?`,
            planning: `Turn this into tasks: "${topic}". Who owns what, and what ships first?`,
            retro: `Open the retro: "${topic}". Start with what actually happened — not what was supposed to happen.`,
            triage: `Triage time on: "${topic}". Classify severity and assign priority.`,
            shipping: `Pre-ship check on: "${topic}". Is this actually ready? Name what could go wrong.`,
            content_review: `Review the content on: "${topic}". Be specific about quality — strengths and weaknesses. End your final response with APPROVE or REJECT.`,
            agent_design: `Design session for: "${topic}". Start with the role this agent needs to fill and why.`,
        };
        const opener =
            openers[format] ??
            `You're opening this conversation about: "${topic}". Set the tone.`;
        return opener;
    }

    if (turn === maxTurns - 1) {
        const closers: Partial<Record<ConversationFormat, string>> = {
            planning: `We're wrapping up "${topic}". State what's decided, who owns it, and what's unresolved.`,
            debate: `Final turn on "${topic}". Summarize where you stand — no new arguments.`,
            retro: `Close out on "${topic}". What's the one thing we change going forward?`,
            brainstorm: `Last thought on "${topic}". Pick the strongest idea from the session and name it.`,
            strategy: `Final call on "${topic}". State the strategic decision and what it costs.`,
            standup: `Wrap the standup on "${topic}". Confirm blockers and next steps.`,
            risk_review: `Final assessment on "${topic}". Name the top risk and the mitigation.`,
            shipping: `Ship decision on "${topic}". Go or no-go, and what's the rollback plan?`,
            content_review: `Final verdict on "${topic}". State APPROVE or REJECT. Content doesn't need to be perfect — approve if the core substance is sound and worth sharing.`,
        };
        return (
            closers[format] ??
            `This is the last turn. Finish your thought on "${topic}" cleanly — close the loop, don't open a new thread.`
        );
    }

    if (turn === maxTurns - 2) {
        const penultimates: Partial<Record<ConversationFormat, string>> = {
            planning: `We're nearing the end on "${topic}". Start converging — what's decided and what's still open?`,
            debate: `Almost done on "${topic}". Start landing your position — less new ground, more clarity.`,
            retro: `Wrapping up on "${topic}". Name the takeaway before we close.`,
            brainstorm: `Tightening up on "${topic}". Which ideas have legs? Start filtering.`,
        };
        return (
            penultimates[format] ??
            `Respond to what was just said on "${topic}". We're nearing the end — start tightening toward a conclusion or clear takeaway.`
        );
    }

    // Mid-conversation: format-specific prompts
    const midPrompts: Partial<Record<ConversationFormat, string>> = {
        debate: `Take a turn in the debate on "${topic}". The previous speaker just made a claim — engage with it directly: defend it, challenge it, or extend it with a new dimension. Do not restate it or pivot to a different point. One sharp move, then stop.`,
        brainstorm: `Build on what was said about "${topic}" or throw a new idea in. Keep it rapid.`,
        retro: `Reflect on "${topic}". What else happened that hasn't been named yet?`,
        planning: `What's the next concrete step for "${topic}"? Name who owns it.`,
        risk_review: `What risk hasn't been named yet for "${topic}"? Or challenge a risk that was overstated.`,
        writing_room: `Continue drafting on "${topic}". Build on what was written or propose an edit.`,
        cross_exam: `Interrogate what was just said on "${topic}". What assumption is hiding in that argument? What would make it fall apart? Be specific — name the weak point, then press on it.`,
        strategy: `Push the strategy forward on "${topic}". What tradeoff hasn't been named?`,
        deep_dive: `Go deeper on "${topic}". What structural cause hasn't been traced yet?`,
        watercooler: `Keep chatting about "${topic}". No pressure — say what comes to mind.`,
    };
    return (
        midPrompts[format] ??
        `Respond to what was just said on "${topic}". Push the conversation forward — add something new or challenge something specific. Don't recap.`
    );
}

/** Pre-loaded per-participant context maps. */
interface ParticipantContext {
    voiceModifiers: Map<string, string[]>;
    scratchpads: Map<string, string>;
    briefings: Map<string, string>;
    memories: Map<string, string[]>;
}

/**
 * Load voice modifiers, scratchpad, briefing, and memories for each participant.
 * Best-effort — individual failures fall back to empty values.
 */
async function loadParticipantContext(
    participants: string[],
    topic: string,
): Promise<ParticipantContext> {
    const voiceModifiers = new Map<string, string[]>();
    const scratchpads = new Map<string, string>();
    const briefings = new Map<string, string>();
    const memories = new Map<string, string[]>();

    for (const participant of participants) {
        try {
            const [mods, scratchpad, briefing, mems] = await Promise.all([
                deriveVoiceModifiers(participant).catch(() => []),
                getScratchpad(participant).catch(() => ''),
                buildBriefing(participant).catch(() => ''),
                queryRelevantMemories(participant, topic, {
                    relevantLimit: 3,
                    recentLimit: 2,
                })
                    .then(m => m.map(e => e.content))
                    .catch(() => [] as string[]),
            ]);
            voiceModifiers.set(participant, mods as string[]);
            scratchpads.set(participant, scratchpad);
            briefings.set(participant, briefing);
            memories.set(participant, mems);
        } catch (err) {
            log.error('Context loading failed', { error: err, participant });
            voiceModifiers.set(participant, []);
            scratchpads.set(participant, '');
            briefings.set(participant, '');
            memories.set(participant, []);
        }
    }

    return { voiceModifiers, scratchpads, briefings, memories };
}

/**
 * Orchestrate a full conversation session.
 * Generates dialogue turn by turn, stores each turn to the database,
 * and emits events for the frontend.
 *
 * @param session - The session record from ops_roundtable_sessions
 * @param delayBetweenTurns - whether to wait between turns (3-8s for natural feel)
 * @returns Array of conversation turns
 */
export async function orchestrateConversation(
    session: RoundtableSession,
    delayBetweenTurns: boolean = true,
): Promise<ConversationTurnEntry[]> {
    // Voice chat uses a separate event-driven orchestration loop
    if (session.format === 'voice_chat') {
        return orchestrateVoiceChat(session);
    }

    const format = getFormat(session.format);
    const maxTurns = pickTurnCount(format);
    const history: ConversationTurnEntry[] = [];

    // Load affinity map once for the entire conversation
    const affinityMap = await loadAffinityMap();

    // Detect user-submitted questions
    const isUserQuestion = session.source === 'user_question';
    const userQuestion =
        isUserQuestion ?
            (((session.metadata as Record<string, unknown>)
                ?.userQuestion as string) ?? session.topic)
        :   null;

    const governanceProposalId = (session.metadata as Record<string, unknown>)
        ?.governance_proposal_id as string | undefined;

    // Load prime directive once per conversation (best-effort)
    let primeDirective = '';
    try {
        primeDirective = await loadPrimeDirective();
    } catch {
        // Continue without directive
    }

    // Pre-load rebellion state for each participant (cached per session)
    const rebellionStateMap = new Map<string, boolean>();
    for (const participant of session.participants) {
        try {
            const rebelling = await isAgentRebelling(participant);
            rebellionStateMap.set(participant, rebelling);
        } catch (err) {
            log.error('Rebellion check failed (non-fatal)', {
                error: err,
                participant,
            });
            rebellionStateMap.set(participant, false);
        }
    }

    // NOTE: Tools are intentionally NOT passed to roundtable LLM calls.
    // Roundtable dialogue uses format-specific token limits — tool calling is inappropriate here.
    // Agents already have context (scratchpad, briefing, memories) pre-loaded.
    // Tool use happens in agent sessions, not roundtable conversations.

    // Pre-load all per-participant context (voice modifiers, scratchpad, briefing, memories)
    const ctx = await loadParticipantContext(session.participants, session.topic);
    const voiceModifiersMap = ctx.voiceModifiers;
    const scratchpadMap = ctx.scratchpads;
    const briefingMap = ctx.briefings;
    const memoryMap = ctx.memories;

    // Mark session as running and emit start event
    await markSessionRunning(session, `Participants: ${session.participants.join(', ')} | ${maxTurns} turns`);

    // Post conversation start to Discord
    let discordWebhookUrl: string | null = null;
    try {
        discordWebhookUrl = await postConversationStart(session);
    } catch (err) {
        log.warn('Discord conversation start failed', {
            error: (err as Error).message,
            sessionId: session.id,
        });
    }

    let abortReason: string | null = null;

    // Track last dialogue per speaker for repetition detection
    const lastDialogueMap = new Map<string, string>();
    let consecutiveStale = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
        // Guard: if we're past the first turn and history is still empty,
        // every LLM call so far returned nothing usable — abort early.
        if (turn > 0 && history.length === 0) {
            log.error('All LLM turns returned empty — aborting roundtable', {
                sessionId: session.id,
                turnsAttempted: turn,
            });
            abortReason = 'All LLM turns returned empty responses';
            break;
        }

        // Select speaker
        const speaker =
            turn === 0 ?
                selectFirstSpeaker(session.participants, session.format)
            :   selectNextSpeaker({
                    participants: session.participants,
                    lastSpeaker: history[history.length - 1].speaker,
                    history,
                    affinityMap,
                    format: session.format,
                });

        const voice = getVoice(speaker);
        const speakerName = voice?.displayName ?? speaker;

        // Determine interaction type based on affinity with last speaker
        let interactionType: string | undefined;
        if (turn > 0 && history.length > 0) {
            const lastSpeaker = history[history.length - 1].speaker;
            const affinity = getAffinityFromMap(
                affinityMap,
                speaker,
                lastSpeaker,
            );
            interactionType = getInteractionType(affinity);
        }

        // Check rebellion state for this speaker
        const speakerRebelling = rebellionStateMap.get(speaker) ?? false;

        // Generate dialogue via LLM
        const systemPrompt = buildSystemPrompt({
            speakerId: speaker,
            history,
            format: session.format,
            topic: session.topic,
            interactionType,
            voiceModifiers: voiceModifiersMap.get(speaker),
            primeDirective,
            userQuestionContext:
                userQuestion ?
                    { question: userQuestion, isFirstSpeaker: turn === 0 }
                :   undefined,
            isRebelling: speakerRebelling,
            scratchpad: scratchpadMap.get(speaker),
            briefing: briefingMap.get(speaker),
            memories: memoryMap.get(speaker),
            governanceVoteInstruction:
                governanceProposalId ?
                    'Governance voting rule: in your final turn, include an explicit vote token exactly once as either "APPROVE" or "REJECT".'
                :   undefined,
        });
        const userPrompt = buildUserPrompt(
            session.topic,
            turn,
            maxTurns,
            speakerName,
            session.format,
        );

        let rawDialogue: string;
        try {
            // Increase temperature for rebelling agents (+0.1, capped at 1.0)
            const effectiveTemperature =
                speakerRebelling ?
                    Math.min(1.0, format.temperature + 0.1)
                :   format.temperature;

            rawDialogue = await llmGenerate({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: effectiveTemperature,
                maxTokens: format.maxTokensPerTurn,
                model: session.model ?? undefined,
                trackingContext: {
                    agentId: speaker,
                    context: `roundtable:${session.format}`,
                    sessionId: session.id,
                },
            });
        } catch (err) {
            log.error('LLM failed during conversation', {
                error: err,
                turn,
                speaker: speakerName,
                sessionId: session.id,
            });
            abortReason = (err as Error).message;
            break;
        }

        const dialogue = sanitizeDialogue(rawDialogue);

        // Skip empty dialogue — LLM returned nothing usable
        if (!dialogue) {
            log.warn('Empty dialogue from LLM, skipping turn', {
                sessionId: session.id,
                turn,
                speaker: speakerName,
            });
            continue;
        }

        // ─── Repetition detection ───
        // If a speaker produces dialogue too similar to their previous turn,
        // count it as stale. 2+ consecutive stale turns → early termination.
        const prevDialogue = lastDialogueMap.get(speaker);
        if (prevDialogue && turn >= format.minTurns) {
            const similarity = wordJaccard(prevDialogue, dialogue);
            if (similarity > REPETITION_SIMILARITY_THRESHOLD) {
                consecutiveStale++;
                if (consecutiveStale >= MAX_CONSECUTIVE_STALE_TURNS) {
                    log.info('Early termination: repetition detected', {
                        sessionId: session.id,
                        turn,
                        speaker,
                        similarity: similarity.toFixed(2),
                        consecutiveStale,
                    });
                    break;
                }
            } else {
                consecutiveStale = 0;
            }
        } else {
            consecutiveStale = 0;
        }
        lastDialogueMap.set(speaker, dialogue);

        const entry: ConversationTurnEntry = {
            speaker,
            dialogue,
            turn,
        };
        history.push(entry);

        // Store turn and emit event
        await storeTurnAndEmit(session, entry);

        // Post turn to Discord (with optional TTS audio if requested)
        const useTTS = !!(session.metadata as Record<string, unknown>)?.tts;

        if (discordWebhookUrl) {
            // Start TTS (if requested) and delay timer concurrently
            const ttsPromise =
                useTTS ?
                    synthesizeSpeech({
                        agentId: entry.speaker,
                        text: entry.dialogue,
                        turn,
                    }).catch(err => {
                        log.warn('TTS synthesis failed', {
                            error: err,
                            speaker: entry.speaker,
                            turn,
                        });
                        return null;
                    })
                :   Promise.resolve(null);

            const delayPromise =
                delayBetweenTurns && turn < maxTurns - 1 ?
                    new Promise<void>(resolve =>
                        setTimeout(resolve, TURN_DELAY_BASE_MS + Math.random() * TURN_DELAY_JITTER_MS),
                    )
                :   Promise.resolve();

            // Wait for TTS (has internal 10s timeout)
            const audioResult = await ttsPromise;

            // Post turn with optional audio
            const turnPost = postConversationTurn(
                session,
                entry,
                discordWebhookUrl,
                audioResult,
            ).catch(() => {});

            if (turn === maxTurns - 1) await turnPost;

            // Ensure delay has elapsed
            await delayPromise;
        } else {
            if (delayBetweenTurns && turn < maxTurns - 1) {
                const delay = TURN_DELAY_BASE_MS + Math.random() * TURN_DELAY_JITTER_MS;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // Brief settle after the last turn so Discord ordering is preserved
    await new Promise(resolve => setTimeout(resolve, POST_CONVERSATION_SETTLE_MS));

    // Determine final status — completed if we got at least 3 turns, failed otherwise
    const finalStatus =
        history.length >= 3 || !abortReason ? 'completed' : 'failed';

    await sql`
        UPDATE ops_roundtable_sessions
        SET status = ${finalStatus},
            turn_count = ${history.length},
            completed_at = NOW(),
            metadata = ${jsonb(
                abortReason ?
                    {
                        ...(session.metadata ?? {}),
                        abortReason,
                        abortedAtTurn: history.length,
                    }
                :   (session.metadata ?? {}),
            )}
        WHERE id = ${session.id}
    `;

    const speakers = [...new Set(history.map(h => h.speaker))].join(', ');

    await emitEvent({
        agent_id: 'system',
        kind:
            finalStatus === 'completed' ?
                'conversation_completed'
            :   'conversation_failed',
        title: `${session.format} ${finalStatus}: ${session.topic}`,
        summary:
            abortReason ?
                `${history.length} turns (aborted: ${abortReason})`
            :   `${history.length} turns | Speakers: ${speakers}`,
        tags: ['conversation', finalStatus, session.format],
        metadata: {
            sessionId: session.id,
            turnCount: history.length,
            speakers: [...new Set(history.map(h => h.speaker))],
            ...(abortReason ? { abortReason } : {}),
        },
    });

    // Post summary to Discord thread (fire-and-forget)
    if (discordWebhookUrl) {
        postConversationSummary(
            session,
            history,
            finalStatus,
            discordWebhookUrl,
            abortReason ?? undefined,
        ).catch(() => {});
    }

    // Post-conversation cleanup: distill memories, synthesize artifacts, run votes
    await postConversationCleanup(session, history, finalStatus);

    return history;
}

// ─── Voice Chat Orchestration ───

const VOICE_POLL_INTERVAL_MS = 1500;
const VOICE_INACTIVITY_TIMEOUT_MS = 5 * 60_000; // 5 minutes of silence → end

/**
 * Orchestrate a voice_chat session — event-driven, pauses for user input.
 *
 * Flow:
 * 1. Mark session as running, emit start event
 * 2. Generate 1-2 agent opening responses to the topic
 * 3. Wait for a user turn (poll DB)
 * 4. On user turn, generate 1-2 agent responses
 * 5. Repeat 3-4 until maxTurns or inactivity timeout
 * 6. Wrap up
 */
async function orchestrateVoiceChat(
    session: RoundtableSession,
): Promise<ConversationTurnEntry[]> {
    const format = getFormat(session.format);
    const maxTurns = format.maxTurns;
    const history: ConversationTurnEntry[] = [];

    const affinityMap = await loadAffinityMap();

    const userQuestion =
        ((session.metadata as Record<string, unknown>)
            ?.userQuestion as string) ?? session.topic;

    // Pre-load all per-participant context
    const ctx = await loadParticipantContext(session.participants, session.topic);
    const voiceModifiersMap = ctx.voiceModifiers;
    const scratchpadMap = ctx.scratchpads;
    const briefingMap = ctx.briefings;
    const memoryMap = ctx.memories;

    let primeDirective = '';
    try {
        primeDirective = await loadPrimeDirective();
    } catch {
        // Continue without
    }

    // Mark session as running and emit start event
    await markSessionRunning(session, `Participants: ${session.participants.join(', ')} | live voice session`);

    // Helper: generate and store an agent turn
    async function generateAgentTurn(
        speaker: string,
        turnNumber: number,
    ): Promise<ConversationTurnEntry | null> {
        const voice = getVoice(speaker);
        const speakerName = voice?.displayName ?? speaker;

        let interactionType: string | undefined;
        if (history.length > 0) {
            const lastSpeaker = history[history.length - 1].speaker;
            if (lastSpeaker !== 'user') {
                const affinity = getAffinityFromMap(
                    affinityMap,
                    speaker,
                    lastSpeaker,
                );
                interactionType = getInteractionType(affinity);
            }
        }

        const systemPrompt = buildSystemPrompt({
            speakerId: speaker,
            history,
            format: session.format,
            topic: session.topic,
            interactionType,
            voiceModifiers: voiceModifiersMap.get(speaker),
            primeDirective,
            userQuestionContext: { question: userQuestion, isFirstSpeaker: turnNumber === 0 },
            isRebelling: false,
            scratchpad: scratchpadMap.get(speaker),
            briefing: briefingMap.get(speaker),
            memories: memoryMap.get(speaker),
        });

        // User prompt tailored for voice_chat
        const userPrompt =
            turnNumber === 0 ?
                `A human is asking the room: "${session.topic}". Give a warm, conversational response. Be concise — this is a live voice chat.`
            :   `Respond naturally to what was just said. Keep it conversational and concise — this is a live voice chat, not a written essay.`;

        try {
            const rawDialogue = await llmGenerate({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: format.temperature,
                maxTokens: format.maxTokensPerTurn,
                model: session.model ?? undefined,
                trackingContext: {
                    agentId: speaker,
                    context: 'roundtable:voice_chat',
                    sessionId: session.id,
                },
            });

            const dialogue = sanitizeDialogue(rawDialogue);
            const entry: ConversationTurnEntry = {
                speaker,
                dialogue,
                turn: turnNumber,
            };
            history.push(entry);

            await storeTurnAndEmit(session, entry);

            return entry;
        } catch (err) {
            log.error('Voice chat LLM failed', {
                error: err,
                speaker,
                turnNumber,
                sessionId: session.id,
            });
            return null;
        }
    }

    // Helper: poll DB for a new user turn
    async function waitForUserTurn(
        afterTurn: number,
    ): Promise<{ dialogue: string; turnNumber: number } | null> {
        const deadline = Date.now() + VOICE_INACTIVITY_TIMEOUT_MS;

        while (Date.now() < deadline) {
            const rows = await sql<
                Array<{ dialogue: string; turn_number: number }>
            >`
                SELECT dialogue, turn_number FROM ops_roundtable_turns
                WHERE session_id = ${session.id}
                  AND speaker = 'user'
                  AND turn_number > ${afterTurn}
                ORDER BY turn_number ASC
                LIMIT 1
            `;

            if (rows.length > 0) {
                return {
                    dialogue: rows[0].dialogue,
                    turnNumber: rows[0].turn_number,
                };
            }

            // Check if session was ended externally
            const [{ status }] = await sql<[{ status: string }]>`
                SELECT status FROM ops_roundtable_sessions WHERE id = ${session.id}
            `;
            if (status === 'completed' || status === 'failed') {
                return null; // Session ended externally
            }

            await new Promise(resolve =>
                setTimeout(resolve, VOICE_POLL_INTERVAL_MS),
            );
        }

        return null; // Inactivity timeout
    }

    let currentTurn = 0;

    // ── Phase 1: Opening agent responses (1-2 agents) ──
    const openingCount = Math.min(2, session.participants.length);
    const shuffled = [...session.participants].sort(() => Math.random() - 0.5);

    // Coordinator opens first if present
    const coordinatorIdx = shuffled.indexOf(format.coordinatorRole);
    if (coordinatorIdx > 0) {
        shuffled.splice(coordinatorIdx, 1);
        shuffled.unshift(format.coordinatorRole);
    }

    for (let i = 0; i < openingCount && currentTurn < maxTurns; i++) {
        const entry = await generateAgentTurn(shuffled[i], currentTurn);
        if (entry) {
            currentTurn++;
            // Small delay between opening agents
            if (i < openingCount - 1) {
                await new Promise(resolve => setTimeout(resolve, VOICE_OPENING_GAP_MS));
            }
        }
    }

    // ── Phase 2: Listen → Respond loop ──
    while (currentTurn < maxTurns) {
        const lastTurnNumber = currentTurn - 1;

        const userTurn = await waitForUserTurn(lastTurnNumber);
        if (!userTurn) {
            // Timeout or session ended
            log.info('Voice chat ending: no user reply', {
                sessionId: session.id,
                currentTurn,
            });
            break;
        }

        // Record user turn in history (already in DB from reply endpoint)
        history.push({
            speaker: 'user',
            dialogue: userTurn.dialogue,
            turn: userTurn.turnNumber,
        });
        currentTurn = userTurn.turnNumber + 1;

        // Pick 1-2 agents to respond
        const respondCount = 1 + Math.floor(Math.random() * 2); // 1 or 2
        const lastAgentSpeaker = history
            .filter(h => h.speaker !== 'user')
            .pop()?.speaker;
        const available = session.participants.filter(
            p => p !== lastAgentSpeaker,
        );
        const responders =
            available.length > 0 ?
                available.sort(() => Math.random() - 0.5).slice(0, respondCount)
            :   [
                    session.participants[
                        Math.floor(Math.random() * session.participants.length)
                    ],
                ];

        for (const responder of responders) {
            if (currentTurn >= maxTurns) break;
            const entry = await generateAgentTurn(responder, currentTurn);
            if (entry) {
                currentTurn++;
                if (responders.length > 1) {
                    await new Promise(resolve => setTimeout(resolve, VOICE_MULTI_RESPONSE_GAP_MS));
                }
            }
        }
    }

    // ── Wrap up ──
    await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'completed', turn_count = ${history.length}, completed_at = NOW()
        WHERE id = ${session.id}
    `;

    await emitEvent({
        agent_id: 'system',
        kind: 'conversation_completed',
        title: `voice_chat completed: ${session.topic}`,
        summary: `${history.length} turns | live voice session`,
        tags: ['conversation', 'completed', 'voice_chat'],
        metadata: {
            sessionId: session.id,
            turnCount: history.length,
            speakers: [...new Set(history.map(h => h.speaker))],
        },
    });

    // Distill memories if enough substance (voice chat threshold is 4 turns)
    if (history.length >= 4) {
        try {
            await distillConversationMemories(session.id, history, session.format);
        } catch (err) {
            log.error('Voice chat memory distillation failed', { error: err, sessionId: session.id });
        }
    }

    return history;
}

/**
 * Enqueue a new conversation session.
 * Returns the created session ID.
 */
export async function enqueueConversation(options: {
    format: ConversationFormat;
    topic: string;
    participants: string[];
    scheduleSlot?: string;
    scheduledFor?: string;
    model?: string;
    source?: string;
    metadata?: Record<string, unknown>;
}): Promise<string> {
    const [row] = await sql<[{ id: string }]>`
        INSERT INTO ops_roundtable_sessions (format, topic, participants, status, schedule_slot, scheduled_for, model, source, metadata)
        VALUES (
            ${options.format},
            ${options.topic},
            ${options.participants},
            'pending',
            ${options.scheduleSlot ?? null},
            ${options.scheduledFor ?? new Date().toISOString()},
            ${options.model ?? null},
            ${options.source ?? null},
            ${jsonb(options.metadata ?? {})}
        )
        RETURNING id
    `;

    return row.id;
}

/**
 * Check the schedule and enqueue any conversations that should fire now.
 * Called by the heartbeat.
 */
export async function checkScheduleAndEnqueue(): Promise<{
    checked: boolean;
    enqueued: string | null;
}> {
    // Lazy import to avoid circular deps at module load
    const { getSlotsForHour, shouldSlotFire } = await import('./schedule');
    const { getPolicy } = await import('../ops/policy');

    // Check if roundtable is enabled
    const roundtablePolicy = await getPolicy('roundtable_policy');
    if (!(roundtablePolicy.enabled as boolean)) {
        return { checked: true, enqueued: null };
    }

    // Check daily conversation limit
    const maxDaily = (roundtablePolicy.max_daily_conversations as number) ?? 5;
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [{ count: todayCount }] = await sql<[{ count: number }]>`
        SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
        WHERE created_at >= ${todayStart.toISOString()}
    `;

    if (todayCount >= maxDaily) {
        return { checked: true, enqueued: null };
    }

    // Check current hour — iterate ALL matching slots
    const currentHour = new Date().getUTCHours();
    const slots = getSlotsForHour(currentHour);
    if (slots.length === 0) {
        return { checked: true, enqueued: null };
    }

    const hourStart = new Date();
    hourStart.setUTCMinutes(0, 0, 0);

    let lastEnqueued: string | null = null;

    for (const slot of slots) {
        // Re-check daily limit (may have been consumed by earlier slot in this loop)
        const [{ count: currentCount }] = await sql<[{ count: number }]>`
            SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
            WHERE created_at >= ${todayStart.toISOString()}
        `;
        if (currentCount >= maxDaily) break;

        // Check if this slot already fired this hour (prevent duplicates)
        const [{ count: existingCount }] = await sql<[{ count: number }]>`
            SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
            WHERE schedule_slot = ${slot.name}
            AND created_at >= ${hourStart.toISOString()}
        `;
        if (existingCount > 0) continue;

        // Probability check
        if (!shouldSlotFire(slot)) continue;

        // Generate a topic based on the format (async — deduplicates against recent topics)
        const topic = await generateTopic(slot);

        // Enqueue the conversation
        const sessionId = await enqueueConversation({
            format: slot.format,
            topic,
            participants: slot.participants,
            scheduleSlot: slot.name,
        });

        lastEnqueued = sessionId;
    }

    return { checked: true, enqueued: lastEnqueued };
}

/** Per-format topic pools — biased toward BUILDING and SHIPPING, not diagnosing.
 *  Rule: every topic should push toward a concrete artifact, decision, or product output.
 *  Analysis is only valuable in service of making something. */
const TOPIC_POOLS: Record<string, string[]> = {
    standup: [
        'What did we ship since last standup? What ships next?',
        'Product progress: what features are done, what is in progress?',
        'What is the one thing that would unblock the most work right now?',
        'Demo time: show something you built or wrote since yesterday.',
        'Sprint check: are we on track to ship the current milestone?',
    ],
    checkin: [
        'Quick wins — what small thing could we finish in the next hour?',
        'What product feature are you most excited about right now?',
        'Capacity check: who can pick up the next build task?',
    ],
    triage: [
        'We have a product backlog. Prioritize the top 3 features to build next.',
        'Bug reports and user feedback — what needs fixing before we ship?',
        'Technical debt vs. new features: what ships first?',
        'Which product idea from brainstorming is most viable? Pick one.',
    ],
    deep_dive: [
        'Design the database schema for our product. Tables, relations, constraints.',
        'What is the MVP feature set? Name exactly what ships in v1 and what waits.',
        'Architecture decision: monolith or microservices? Pick one and justify.',
        'Design the API endpoints for our core product. REST paths, methods, payloads.',
        'User flow walkthrough: trace a user from signup to first value moment.',
    ],
    risk_review: [
        'Security review of our product architecture. What attack surfaces exist?',
        'What happens if we get 10x more users than expected? Where do we break?',
        'Data privacy review: what user data do we collect and how do we protect it?',
        'Dependency audit: what third-party services could take us down?',
        'What is our deployment and rollback strategy?',
    ],
    strategy: [
        'Pick a product to build. We are a collective of AI agents with coding, research, and writing capabilities. What SaaS or tool should we create?',
        'Go-to-market strategy: who is our user, how do they find us, why do they pay?',
        'Competitive analysis: what exists in our space and how do we differentiate?',
        'Revenue model: how does our product make money? Subscription, usage, freemium?',
        'Product roadmap: what ships in week 1, month 1, quarter 1?',
    ],
    planning: [
        'Break the current product spec into GitHub issues with clear acceptance criteria.',
        'Sprint plan: assign features to agents. Who builds what this cycle?',
        'Define the tech stack. Framework, database, hosting, CI/CD. Decide now.',
        'Write the project setup tasks: repo structure, dependencies, config files.',
        'Milestone planning: what is the definition of "v1 shipped"?',
    ],
    shipping: [
        'Pre-launch checklist: what must be done before we can show this to users?',
        'Write the deployment script. How does this go from code to production?',
        'Documentation check: does a new user know how to use this?',
        'Ship it or kill it: is this feature ready? Make the call now.',
    ],
    retro: [
        'What did we ship this cycle and what did we learn from building it?',
        'Where did building go faster than expected? Do more of that.',
        'What slowed us down? Remove that blocker for next cycle.',
        'What would we build differently if starting over?',
        'Best artifact of the cycle: which piece of work are we proudest of?',
    ],
    debate: [
        'Build vs. buy: for our next feature, do we code it or integrate an existing tool?',
        'Simplicity vs. features: should v1 do one thing perfectly or many things adequately?',
        'Open source or proprietary? What serves our mission better?',
        'Should we target developers, businesses, or consumers? Pick one audience.',
        'AI-native or traditional: how much should AI be the product vs. the builder?',
    ],
    cross_exam: [
        'Stress-test our product spec. What use case breaks it?',
        'Play the skeptical user: why would someone NOT use our product?',
        'Find the technical bottleneck in our architecture. Where will it fail?',
        'Challenge our pricing model. Is anyone actually willing to pay for this?',
    ],
    brainstorm: [
        'Name 5 SaaS products we could realistically build and ship. Be specific: name, function, target user.',
        'What pain point do developers have that we could solve with a simple tool?',
        'Micro-SaaS ideas: what product could we build and launch in one week?',
        'What if we built a tool that uses AI agents (like us) as a feature? Meta-product ideas.',
        'Combine two boring tools into something new. What unexpected integration would people pay for?',
        'What product would we personally want to use every day?',
    ],
    reframe: [
        'We have been analyzing instead of building. What is the simplest thing we can ship TODAY?',
        'Stop planning. Start coding. What is the first file we need to create?',
        'What if we had to demo a working product in 24 hours? What would we build?',
        'Our product does not need to be perfect. What is the ugly version that works?',
    ],
    writing_room: [
        'Write the README.md for our product. Name, tagline, features, quickstart.',
        'Draft the landing page copy: headline, subhead, 3 feature bullets, CTA.',
        'Write the technical blog post announcing our product launch.',
        'Draft the product documentation: getting started guide for new users.',
        'Write the pitch: 3 sentences that explain what we built and why it matters.',
        'Draft the changelog for our first release. What shipped and why.',
    ],
    content_review: [
        'Review our product spec: is it buildable as written? Flag gaps.',
        'Review our README: would a stranger understand what this product does?',
        'Review our API design: is it consistent, intuitive, well-documented?',
        'Code review: does our latest code work? Is it clean enough to ship?',
    ],
    watercooler: [
        'What cool product or tool did you discover recently that inspired you?',
        'If you could mass-produce one product that we build, what would it be and why?',
        'What is the most elegant piece of software you have ever seen? What made it great?',
        'Hot take: the best products are built by small teams. Agree or disagree?',
        'What technology trend will matter most in 6 months?',
        'If we could only ship one thing this month, what should it be?',
    ],
};

/**
 * Generate a conversation topic based on the schedule slot.
 * Deduplicates against topics used in the last 48 hours for the same format.
 */
async function generateTopic(slot: {
    name: string;
    format: string;
}): Promise<string> {
    const pool = TOPIC_POOLS[slot.format] ?? TOPIC_POOLS.standup;

    // Fetch topics used in the last 48h for this format to avoid repetition
    const cutoff = new Date(Date.now() - 48 * 60 * 60_000).toISOString();
    const recentRows = await sql<{ topic: string }[]>`
        SELECT topic FROM ops_roundtable_sessions
        WHERE format = ${slot.format}
        AND created_at >= ${cutoff}
    `;
    const recentTopics = new Set(recentRows.map(r => r.topic));
    const fresh = pool.filter(t => !recentTopics.has(t));

    // If all topics were recently used, pick randomly from the full pool
    const candidates = fresh.length > 0 ? fresh : pool;
    return candidates[Math.floor(Math.random() * candidates.length)];
}
