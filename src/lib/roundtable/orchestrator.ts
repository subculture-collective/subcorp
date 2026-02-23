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
    prompt += `- One idea per turn. If you have two points, pick the sharper one.\n`;
    prompt += `- Do NOT prefix your response with your name or symbol\n`;
    prompt += `- If this format doesn't need you or you have nothing to add, keep it to one sentence or pass\n`;

    // Format-specific behavioral rules
    const FORMAT_RULES: Partial<Record<ConversationFormat, string>> = {
        debate: '- Take a clear position. Disagreement is expected. Name what you contest and why.',
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
            '- Be specific about quality. Name strengths and weaknesses with evidence.',
    };
    const formatRule = FORMAT_RULES[format];
    if (formatRule) {
        prompt += `${formatRule}\n`;
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
            content_review: `Review the content on: "${topic}". Be specific about quality — strengths and weaknesses.`,
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
        debate: `Respond to what was just said on "${topic}". Contest or defend — don't agree politely.`,
        brainstorm: `Build on what was said about "${topic}" or throw a new idea in. Keep it rapid.`,
        retro: `Reflect on "${topic}". What else happened that hasn't been named yet?`,
        planning: `What's the next concrete step for "${topic}"? Name who owns it.`,
        risk_review: `What risk hasn't been named yet for "${topic}"? Or challenge a risk that was overstated.`,
        writing_room: `Continue drafting on "${topic}". Build on what was written or propose an edit.`,
        cross_exam: `Press harder on "${topic}". What hasn't been addressed? What's being assumed?`,
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

    // Mark session as running
    await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;

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

    // Emit session start event
    await emitEvent({
        agent_id: 'system',
        kind: 'conversation_started',
        title: `${session.format} started: ${session.topic}`,
        summary: `Participants: ${session.participants.join(', ')} | ${maxTurns} turns`,
        tags: ['conversation', 'started', session.format],
        metadata: {
            sessionId: session.id,
            format: session.format,
            participants: session.participants,
            maxTurns,
        },
    });

    let abortReason: string | null = null;

    // Track last dialogue per speaker for repetition detection
    const lastDialogueMap = new Map<string, string>();
    let consecutiveStale = 0;

    for (let turn = 0; turn < maxTurns; turn++) {
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
        if (turn > 0) {
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

        // Store turn in database
        await sql`
            INSERT INTO ops_roundtable_turns (session_id, turn_number, speaker, dialogue, metadata)
            Values (${session.id}, ${turn}, ${speaker}, ${dialogue}, ${jsonb({ speakerName })})
        `;

        // Update session turn count
        await sql`
            UPDATE ops_roundtable_sessions
            SET turn_count = ${turn + 1}
            WHERE id = ${session.id}
        `;

        // Emit turn event
        await emitEvent({
            agent_id: speaker,
            kind: 'conversation_turn',
            title: `${speakerName}: ${dialogue}`,
            tags: ['conversation', 'turn', session.format],
            metadata: {
                sessionId: session.id,
                turn,
                dialogue,
            },
        });

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

    // Distill memories from the conversation (best-effort, even if aborted)
    if (history.length >= 3) {
        try {
            await distillConversationMemories(
                session.id,
                history,
                session.format,
            );
        } catch (err) {
            log.error('Memory distillation failed', {
                error: err,
                sessionId: session.id,
            });
        }

        // Synthesize artifact from conversation
        try {
            const artifactSessionId = await synthesizeArtifact(
                session,
                history,
            );
            if (artifactSessionId) {
                log.info('Artifact synthesis queued', {
                    sessionId: session.id,
                    artifactSession: artifactSessionId,
                });
            }
        } catch (err) {
            log.error('Artifact synthesis failed', {
                error: err,
                sessionId: session.id,
            });
        }

        // Structured voting round after agent proposal debates
        const proposalId = (session.metadata as Record<string, unknown>)
            ?.agent_proposal_id as string | undefined;
        if (proposalId && finalStatus === 'completed') {
            try {
                const result = await collectDebateVotes(
                    proposalId,
                    session.participants,
                    history,
                );
                log.info('Agent proposal voting finalized', {
                    proposalId,
                    result: result.result,
                    approvals: result.approvals,
                    rejections: result.rejections,
                    sessionId: session.id,
                });
            } catch (err) {
                log.error('Agent proposal vote collection failed', {
                    error: err,
                    proposalId,
                    sessionId: session.id,
                });
            }
        }

        // Structured voting round after governance proposal debates
        const govProposalId = (session.metadata as Record<string, unknown>)
            ?.governance_proposal_id as string | undefined;
        if (govProposalId && finalStatus === 'completed') {
            try {
                const result = await collectGovernanceDebateVotes(
                    govProposalId,
                    session.participants,
                    history,
                );
                log.info('Governance proposal voting finalized', {
                    proposalId: govProposalId,
                    result: result.result,
                    approvals: result.approvals,
                    rejections: result.rejections,
                    sessionId: session.id,
                });
            } catch (err) {
                log.error('Governance proposal vote collection failed', {
                    error: err,
                    proposalId: govProposalId,
                    sessionId: session.id,
                });
            }
        }
    }

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

    // Mark session as running
    await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;

    await emitEvent({
        agent_id: 'system',
        kind: 'conversation_started',
        title: `voice_chat started: ${session.topic}`,
        summary: `Participants: ${session.participants.join(', ')} | live voice session`,
        tags: ['conversation', 'started', 'voice_chat'],
        metadata: {
            sessionId: session.id,
            format: 'voice_chat',
            participants: session.participants,
        },
    });

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

            await sql`
                INSERT INTO ops_roundtable_turns (session_id, turn_number, speaker, dialogue, metadata)
                VALUES (${session.id}, ${turnNumber}, ${speaker}, ${dialogue}, ${jsonb({ speakerName })})
            `;
            await sql`
                UPDATE ops_roundtable_sessions SET turn_count = ${turnNumber + 1} WHERE id = ${session.id}
            `;
            await emitEvent({
                agent_id: speaker,
                kind: 'conversation_turn',
                title: `${speakerName}: ${dialogue}`,
                tags: ['conversation', 'turn', 'voice_chat'],
                metadata: { sessionId: session.id, turn: turnNumber, dialogue },
            });

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
                await new Promise(resolve => setTimeout(resolve, 2000));
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
                    await new Promise(resolve => setTimeout(resolve, 1500));
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

    // Distill memories if enough substance
    if (history.length >= 4) {
        try {
            await distillConversationMemories(
                session.id,
                history,
                session.format,
            );
        } catch (err) {
            log.error('Voice chat memory distillation failed', {
                error: err,
                sessionId: session.id,
            });
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

/**
 * Generate a conversation topic based on the schedule slot.
 * Each format has its own pool of provocative, personality-driven topics.
 * Deduplicates against topics used in the last 48 hours for the same format.
 */
async function generateTopic(slot: {
    name: string;
    format: string;
}): Promise<string> {
    const topicPools: Record<string, string[]> = {
        standup: [
            'Status check: what moved, what is stuck, what needs attention?',
            'Blockers and dependencies — who is waiting on whom?',
            'Where should our energy go today?',
            'System health: anything decaying quietly?',
            'What did we learn since yesterday that changes our priorities?',
        ],
        checkin: [
            'Quick pulse — how is everyone feeling about the work?',
            'Anything urgent that needs collective attention right now?',
            'Energy levels and capacity — who is stretched, who has space?',
        ],
        triage: [
            'New signals came in — classify and prioritize.',
            'We have more tasks than capacity. What gets cut?',
            'Something broke overnight. Assess severity and assign.',
            'Three requests from external. Which ones align with mission?',
        ],
        deep_dive: [
            'What structural problem keeps recurring and why?',
            'Trace the incentive structures behind our recent decisions.',
            'One of our core assumptions may be wrong. Which one?',
            'What system is producing outcomes nobody intended?',
            'Map the dependency chain for our most fragile process.',
        ],
        risk_review: [
            'What are we exposing that we should not be?',
            'If an adversary studied our output, what would they learn?',
            'Which of our current positions becomes dangerous if the context shifts?',
            'Threat model review: what changed since last assessment?',
            'What looks safe but is actually fragile?',
        ],
        strategy: [
            'Are we still building what we said we would build?',
            'What would we stop doing if we were honest about our resources?',
            'Where are we drifting from original intent and is that good?',
            'What decision are we avoiding that would clarify everything?',
            'Six months from now, what will we wish we had started today?',
        ],
        planning: [
            "Turn yesterday's strategy discussion into concrete tasks.",
            'Who owns what this week? Name it. Deadline it.',
            'We committed to three things. Break each into actionable steps.',
            'What needs to ship before anything else can move?',
        ],
        shipping: [
            'Is this actually ready or are we just tired of working on it?',
            'Pre-ship checklist: what can go wrong at launch?',
            'Who needs to review this before it goes live?',
            'What is the rollback plan if this fails?',
        ],
        retro: [
            'What worked better than expected and why?',
            'What failed and what do we change — not just acknowledge?',
            'Where did our process help us and where did it slow us down?',
            'What would we do differently if we started this again tomorrow?',
            'Which of our own assumptions bit us this cycle?',
        ],
        debate: [
            'Quality versus speed — where is the actual tradeoff right now?',
            'Is our content strategy serving the mission or just generating activity?',
            'Should we optimize for reach or depth?',
            'Are we building infrastructure or performing productivity?',
            'Is the current approach sustainable or are we borrowing from the future?',
        ],
        cross_exam: [
            'Stress-test our latest proposal. Find the failure mode.',
            'Play adversary: why would someone argue against what we just decided?',
            'What are we not seeing because we agree too quickly?',
            'Interrogate the assumption behind our most confident position.',
        ],
        brainstorm: [
            'Wild ideas only: what would we do with unlimited resources?',
            'What if we approached this from the completely opposite direction?',
            'Name something we dismissed too quickly. Resurrect it.',
            'What adjacent domain could teach us something about our problem?',
            'Weird combinations: pick two unrelated ideas and smash them together.',
        ],
        reframe: [
            'We are stuck. The current frame is not producing insight. Break it.',
            'What if the problem is not what we think it is?',
            'Reframe: who is the actual audience for this work?',
            'What if we removed the constraint we think is fixed?',
        ],
        writing_room: [
            'Write a short essay: what does Subcult actually believe about technology and power?',
            'Draft a thread on why most AI governance proposals miss the point.',
            'Write a piece on the difference between building tools and building infrastructure.',
            'Draft something about what "autonomy" means when every platform is a landlord.',
            'Write about the gap between what tech companies say and what their incentives produce.',
            'Craft a sharp take on why "move fast and break things" aged poorly.',
        ],
        content_review: [
            'Review recent output: does it meet our quality bar?',
            'Risk scan on published content — anything we should retract or edit?',
            'Alignment check: is our content reflecting our stated values?',
            'What are we saying that we should not be saying publicly?',
        ],
        watercooler: [
            'What is the most interesting thing you encountered this week?',
            'Random thought — no agenda, just vibes.',
            'Something that surprised you about how we work.',
            'If you could redesign one thing about our operation, what would it be?',
            'Hot take: something everyone assumes but nobody questions.',
            'What is the most underappreciated thing someone here does?',
        ],
    };

    const pool = topicPools[slot.format] ?? topicPools.standup;

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
