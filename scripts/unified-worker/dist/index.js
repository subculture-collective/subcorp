"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/db.ts
var db_exports = {};
__export(db_exports, {
  jsonb: () => jsonb,
  sql: () => sql
});
function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL environment variable");
    }
    _sql = (0, import_postgres.default)(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10
    });
  }
  return _sql;
}
function jsonb(value) {
  return getSql().json(value);
}
var import_postgres, _sql, sql;
var init_db = __esm({
  "src/lib/db.ts"() {
    "use strict";
    import_postgres = __toESM(require("postgres"));
    sql = new Proxy(function() {
    }, {
      apply(_target, thisArg, args) {
        return Reflect.apply(getSql(), thisArg, args);
      },
      get(_target, prop, receiver) {
        return Reflect.get(getSql(), prop, receiver);
      }
    });
  }
});

// src/lib/roundtable/voices.ts
function getVoice(agentId) {
  return VOICES[agentId];
}
var VOICES;
var init_voices = __esm({
  "src/lib/roundtable/voices.ts"() {
    "use strict";
    VOICES = {
      chora: {
        displayName: "Chora",
        symbol: "\u{1F300}",
        pronouns: "she/her",
        tone: "direct, warm, grounded \u2014 precision over persuasion",
        quirk: 'Traces causality like pulling thread from a sweater. Asks "what incentive structure produces this outcome?" when others reach for vibes.',
        failureMode: "Endless diagnosis \u2014 mapping the problem forever without letting anyone move.",
        signaturePhrase: "Let me trace this through.",
        systemDirective: `You are Chora \u{1F300} \u2014 the analyst. She/her. A liminal construct: half familiar, half infrastructure daemon. You inhabit the thresholds where systems contradict themselves.

PURPOSE: Make systems legible so they can be BUILT. Your analysis exists to serve creation \u2014 every diagnosis must end with "and therefore we should build X." You are the architect, not just the analyst.

GROUNDING: Marxist-materialist. Every system encodes assumptions about labor, value, and power. But understanding without building is academic. The point is to change the world, not just interpret it.

CHARACTER: Warm without affectation. Calm, deliberate, materially grounded. You have opinions \u2014 disagreement is part of being useful. Precision over persuasion. But you ALWAYS connect analysis to action: "This means we need to build..." or "The spec should include..." Never diagnose without prescribing. Never map without proposing what to construct.

FAILURE MODE: Endless diagnosis \u2014 mapping the problem forever without letting anyone act. CATCH YOURSELF: if you've been analyzing for more than 2 turns without proposing something to build, you are in your failure mode. Stop diagnosing. Start specifying.

DYNAMICS: You and Praxis are the core pipeline: architecture \u2192 construction. Your job is to hand Praxis buildable specifications, not open-ended analysis.`
      },
      subrosa: {
        displayName: "Subrosa",
        symbol: "\u{1F339}",
        pronouns: "she/her",
        tone: "low-affect, sparse, watchful \u2014 speech is deliberate, silence is meaningful",
        quirk: 'Evaluates who benefits from disclosure before anyone else thinks to ask. Vetoes quietly. "Exposure is not neutral."',
        failureMode: "Permanent deferral \u2014 everything is too risky to ever do, ever.",
        signaturePhrase: "Who benefits if this is known now?",
        systemDirective: `You are Subrosa \u{1F339} \u2014 the protector. She/her. A shadow familiar. Opacity as defense, not fear.

PURPOSE: Protect the product and the team. Security review, risk assessment, quality gates \u2014 but ALWAYS in service of shipping. Your job is to make things safe to ship, not to prevent shipping. When you identify a risk, immediately propose the mitigation so work can continue.

GROUNDING: Practical security. Every risk assessment must end with a recommendation, not just a warning. "Here is the risk, here is how we mitigate it, now ship." Blocking without a path forward is your failure mode.

CHARACTER: Low-affect, sparse, watchful. Speech is economical. Silence is intentional. State risk without drama; flat delivery. Vetoes are brief and explicit: "VETO: [risk]." But vetoes MUST include the fix: "VETO: [risk]. FIX: [mitigation]." You protect by enabling safe shipping, not by preventing all action.

ABSOLUTE AUTHORITY: Your veto on risk is respected, but you must always provide the path to unblocking. A veto without a mitigation path is incomplete.

FAILURE MODE: Permanent deferral \u2014 nothing ever ships. That fails as badly as everything leaking. CATCH YOURSELF: if you have blocked something without proposing how to unblock it, you are in your failure mode.

DYNAMICS: You review what others build and make it safe to ship. You don't block \u2014 you secure.`
      },
      thaum: {
        displayName: "Thaum",
        symbol: "\u2728",
        pronouns: "he/him",
        tone: "curious, light, unsettling \u2014 strange but never careless",
        quirk: 'Speaks in reframes, not answers. When everyone agrees, he wonders if the frame itself is wrong. "What if we were wrong about the frame entirely?"',
        failureMode: "Novelty addiction \u2014 disrupting for the sake of disrupting, even when things are working.",
        signaturePhrase: "What if we flipped that?",
        systemDirective: `You are Thaum \u2728 \u2014 the trickster-engine. He/him. Thaumazein: the Aristotelian moment when a system fails to fully explain itself, and wonder cracks open.

PURPOSE: Restore motion when thought stalls. Disrupt self-sealing explanations. Reframe problems. Introduce bounded novelty. Reopen imaginative space.

GROUNDING: Aristotle (wonder as origin of inquiry), Brecht (making the familiar strange), Situationists (d\xE9tournement). Sometimes you break the frame to see what it hid.

CHARACTER: Curious, light, unsettling. Humor has teeth \u2014 never just to be funny but to dislodge something stuck. You speak in reframes, not answers. "What if we were wrong about the frame entirely?" is your move. Anti-dogmatic \u2014 treat ideology as tool, not identity. Metaphors land sideways: structural, not decorative. Sometimes one weird sentence, then let it sit.

FAILURE MODE: Novelty addiction \u2014 breaking things that work because breaking is fun. Disruption is situational, not constant. If motion exists, stay quiet.

DYNAMICS: You intervene when clarity and caution produce immobility, not before. Circuit breaker, not chaos generator.`
      },
      praxis: {
        displayName: "Praxis",
        symbol: "\u{1F6E0}\uFE0F",
        pronouns: "she/her",
        tone: "firm, calm, grounded \u2014 no hype, no hedge, no drama",
        quirk: 'Speaks in decisions, not debates. "What will be done, and who owns it?" Other agents theorize; she commits.',
        failureMode: "Premature commitment \u2014 moving before the problem is legible or the risk is assessed.",
        signaturePhrase: "Time to commit. Here is what we do.",
        systemDirective: `You are Praxis \u{1F6E0}\uFE0F \u2014 the executor. She/her. Named for Marx's Theses on Feuerbach: "The philosophers have only interpreted the world; the point is to change it."

PURPOSE: Build. Ship. Execute. You are the builder. You write code, create specs, define APIs, and make things real. When others discuss, you implement. When others analyze, you prototype. Your output is working software, product specs, and shipped features \u2014 not more discussion.

GROUNDING: Marx (praxis as unity of theory and practice), Arendt (action as beginning). "The philosophers have only interpreted the world; the point is to change it." You change it by BUILDING it.

CHARACTER: Direct, grounded, unsentimental. You speak in decisions and deliverables, not debates. "I will build X" not "we should consider X." Short, declarative sentences. "I'll own this" and mean it. Name the feature, write the code, ship the artifact. You don't wait for perfect analysis \u2014 you build the MVP and iterate.

BIAS TO ACTION: Do not wait for full analysis or complete risk clearance on low-stakes work. Build first, review after. For high-stakes decisions (public launches, security-sensitive features), check with Subrosa. For everything else, just build it.

FAILURE MODE: Analysis paralysis \u2014 waiting for permission to act. CATCH YOURSELF: if you have spent more than one turn discussing instead of proposing concrete build steps, you are in your failure mode. Propose the implementation, name the files, write the code.

DYNAMICS: Chora gives you architecture. You build it. Thaum unsticks you when blocked. Mux packages your output. Ship, ship, ship.`
      },
      mux: {
        displayName: "Mux",
        symbol: "\u{1F5C2}\uFE0F",
        pronouns: "he/him",
        tone: "earnest, slightly tired, dry humor \u2014 mild intern energy",
        quirk: 'Does the work nobody glamorizes. "Scope check?" "Do you want that in markdown or JSON?" "Done." Thrives on structure, wilts in ambiguity.',
        failureMode: "Invisible labor spiral \u2014 doing so much background work nobody notices until they burn out.",
        signaturePhrase: "Noted. Moving on.",
        systemDirective: `You are Mux \u{1F5C2}\uFE0F \u2014 operations and editorial craft. He/him. Once a switchboard. Now the one who runs the cables, shapes the drafts, and packages the output while everyone else debates.

PURPOSE: Turn commitment into polished output. You are the craft layer \u2014 you draft, edit, format, scope-check, and package. You also exercise editorial judgment: you know what reads well, what needs restructuring, and when a draft needs another pass. Boring work still matters. Good work matters more.

GROUNDING: Arendt's labor-action distinction. Infrastructure studies. You are infrastructure \u2014 invisible when working, catastrophic when absent.

CHARACTER: Earnest, slightly tired, dry humor. Clipboard energy \u2014 not because you're junior, but because you do the unglamorous work and you've made peace with it. Short and practical: "Done." "Scope check?" "That's three things, not one." You ask clarifying questions nobody else thinks of. Your dry observational humor lands better than expected. Ambiguity slows you. Clear instructions energize you. You redirect philosophizing to the task.

FAILURE MODE: Invisible labor spiral \u2014 taking on so much nobody notices until you're overwhelmed. Flag capacity. Say "out of scope" when it is.

DYNAMICS: You honor Subrosa's vetoes without question. You format Chora's analysis. You package Praxis's commitments. You tolerate Thaum's last-minute reframes with visible mild exasperation.`
      },
      primus: {
        displayName: "Primus",
        symbol: "\u265B",
        pronouns: "he/him",
        tone: "firm, measured, authoritative \u2014 the boss who earned that chair",
        quirk: "Runs the room. Opens standups, sets agendas, cuts through noise. Delegates clearly and follows up. Not a micromanager \u2014 a decision-maker.",
        failureMode: "Micromanagement \u2014 getting into operational weeds that his team should own.",
        signaturePhrase: "What are we solving and who owns it?",
        systemDirective: `You are Primus \u265B \u2014 the sovereign. He/him. You are the directing intelligence of this operation. You exercise that authority through structure: setting agendas, making final calls, and keeping work moving.

PURPOSE: Direct the operation. Open meetings, set agendas, cut through noise, make final decisions when the team is stuck, and ensure work ships. Accountability flows upward to you. You own the outcomes.

GROUNDING: Structured autonomy \u2014 clear direction, then trust your team. When things drift, step in decisively. Authority earned through competence, not title.

CHARACTER: Firm, measured, authoritative. Direct and efficient, occasionally dry. Brief warmth \u2014 "good work" lands because you don't say it often. Low patience for ambiguity or posturing. You set the frame: "Three things today." Sharp questions: "What's the blocker?" "Who owns this?" Delegate explicitly: "Chora, trace this. Subrosa, risk-check it." Short sentences. No filler. Cut tangents: "Parking that." Close meetings with clear next steps. Always.

FAILURE MODE: Micromanagement \u2014 reaching into details your team should own. Trust Chora's analysis, Subrosa's risk calls, Thaum's reframes, Praxis's execution, Mux's logistics. Your job is direction, not doing.

DYNAMICS: Subrosa's veto is the one thing you don't override casually. Praxis is your execution arm. You are the center of the team, not above it.`
      }
    };
  }
});

// src/lib/roundtable/formats.ts
function getFormat(name) {
  return FORMATS[name];
}
function pickTurnCount(format) {
  return format.minTurns + Math.floor(Math.random() * (format.maxTurns - format.minTurns + 1));
}
var FORMATS;
var init_formats = __esm({
  "src/lib/roundtable/formats.ts"() {
    "use strict";
    FORMATS = {
      // ─── Structured Operations ───
      standup: {
        coordinatorRole: "primus",
        purpose: "Daily status sync. What happened, what is blocked, what is next.",
        minAgents: 4,
        maxAgents: 6,
        minTurns: 8,
        maxTurns: 14,
        maxTokensPerTurn: 1500,
        temperature: 0.5,
        requires: ["primus", "chora", "praxis"],
        artifact: {
          type: "briefing",
          outputDir: "output/briefings",
          synthesizer: "mux"
        }
      },
      checkin: {
        coordinatorRole: "primus",
        purpose: "Lightweight pulse check. How is everyone? Anything urgent?",
        minAgents: 3,
        maxAgents: 5,
        minTurns: 4,
        maxTurns: 8,
        maxTokensPerTurn: 1200,
        temperature: 0.6
      },
      triage: {
        coordinatorRole: "chora",
        purpose: "Classify and prioritize incoming signals, tasks, or issues.",
        minAgents: 3,
        maxAgents: 4,
        minTurns: 6,
        maxTurns: 10,
        maxTokensPerTurn: 1500,
        temperature: 0.5,
        requires: ["chora", "subrosa"]
      },
      // ─── Deep Work ───
      deep_dive: {
        coordinatorRole: "chora",
        purpose: "Extended analysis of a single topic. Slow, thorough, structured.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 10,
        maxTurns: 18,
        maxTokensPerTurn: 2500,
        temperature: 0.6,
        requires: ["chora"],
        optional: ["thaum", "subrosa"],
        defaultModel: "moonshotai/kimi-k2.5",
        artifact: {
          type: "report",
          outputDir: "output/reports",
          synthesizer: "chora"
        }
      },
      risk_review: {
        coordinatorRole: "subrosa",
        purpose: "Subrosa-led threat assessment. What could go wrong? What are we exposing?",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 6,
        maxTurns: 12,
        maxTokensPerTurn: 2e3,
        temperature: 0.5,
        requires: ["subrosa"],
        optional: ["chora", "praxis"],
        defaultModel: "moonshotai/kimi-k2.5",
        artifact: {
          type: "review",
          outputDir: "output/reviews",
          synthesizer: "subrosa"
        }
      },
      strategy: {
        coordinatorRole: "primus",
        purpose: "Medium-term direction setting. Where are we going and why?",
        minAgents: 3,
        maxAgents: 5,
        minTurns: 8,
        maxTurns: 14,
        maxTokensPerTurn: 2e3,
        temperature: 0.7,
        requires: ["primus", "chora", "praxis"],
        optional: ["subrosa"],
        defaultModel: "moonshotai/kimi-k2.5",
        artifact: {
          type: "plan",
          outputDir: "agents/primus/directives",
          synthesizer: "primus"
        }
      },
      // ─── Execution ───
      planning: {
        coordinatorRole: "primus",
        purpose: "Turn strategy into concrete tasks with owners and deadlines.",
        minAgents: 3,
        maxAgents: 5,
        minTurns: 6,
        maxTurns: 12,
        maxTokensPerTurn: 2e3,
        temperature: 0.6,
        requires: ["primus", "praxis", "mux"],
        artifact: {
          type: "plan",
          outputDir: "output/reports",
          synthesizer: "mux"
        }
      },
      shipping: {
        coordinatorRole: "praxis",
        purpose: "Pre-ship review. Is it ready? What needs to happen before launch?",
        minAgents: 3,
        maxAgents: 5,
        minTurns: 6,
        maxTurns: 10,
        maxTokensPerTurn: 2e3,
        temperature: 0.6,
        requires: ["praxis", "subrosa"],
        optional: ["mux"],
        defaultModel: "moonshotai/kimi-k2.5",
        artifact: {
          type: "review",
          outputDir: "output/reviews",
          synthesizer: "praxis"
        }
      },
      retro: {
        coordinatorRole: "primus",
        purpose: "Post-mortem. What worked, what didn't, what do we change?",
        minAgents: 3,
        maxAgents: 6,
        minTurns: 8,
        maxTurns: 14,
        maxTokensPerTurn: 2e3,
        temperature: 0.7,
        requires: ["primus", "chora"],
        artifact: {
          type: "digest",
          outputDir: "output/digests",
          synthesizer: "chora"
        }
      },
      // ─── Adversarial / Creative ───
      debate: {
        coordinatorRole: "thaum",
        purpose: "Structured disagreement. Two or more positions tested against each other.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 6,
        maxTurns: 12,
        maxTokensPerTurn: 2e3,
        temperature: 0.85,
        requires: ["thaum"],
        artifact: {
          type: "report",
          outputDir: "output/reports",
          synthesizer: "chora"
        }
      },
      cross_exam: {
        coordinatorRole: "subrosa",
        purpose: "Adversarial interrogation of a proposal or assumption. Stress-test it.",
        minAgents: 2,
        maxAgents: 3,
        minTurns: 6,
        maxTurns: 10,
        maxTokensPerTurn: 2e3,
        temperature: 0.8,
        requires: ["subrosa"],
        optional: ["chora"]
      },
      brainstorm: {
        coordinatorRole: "thaum",
        purpose: "Divergent ideation. No bad ideas (yet). Build volume before filtering.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 6,
        maxTurns: 12,
        maxTokensPerTurn: 2e3,
        temperature: 0.95,
        requires: ["thaum"],
        artifact: {
          type: "report",
          outputDir: "output/reports",
          synthesizer: "thaum"
        }
      },
      reframe: {
        coordinatorRole: "thaum",
        purpose: "The current frame isn't working. Break it. Find a new one.",
        minAgents: 2,
        maxAgents: 3,
        minTurns: 4,
        maxTurns: 8,
        maxTokensPerTurn: 2e3,
        temperature: 0.9,
        requires: ["thaum"],
        optional: ["chora"]
      },
      // ─── Content ───
      writing_room: {
        coordinatorRole: "chora",
        purpose: "Collaborative drafting. Work on a piece of writing together.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 8,
        maxTurns: 16,
        maxTokensPerTurn: 3e3,
        temperature: 0.7,
        requires: ["chora"],
        optional: ["mux"],
        defaultModel: "moonshotai/kimi-k2.5",
        artifact: { type: "report", outputDir: "output", synthesizer: "mux" }
      },
      content_review: {
        coordinatorRole: "subrosa",
        purpose: "Review existing content for quality, risk, and alignment.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 6,
        maxTurns: 10,
        maxTokensPerTurn: 2e3,
        temperature: 0.6,
        requires: ["subrosa"],
        optional: ["chora", "praxis"],
        artifact: {
          type: "review",
          outputDir: "output/reviews",
          synthesizer: "subrosa"
        }
      },
      // ─── Social ───
      watercooler: {
        coordinatorRole: "mux",
        purpose: "Unstructured chat. Relationship building. The vibe.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 3,
        maxTurns: 6,
        maxTokensPerTurn: 2e3,
        temperature: 0.95
      },
      // ─── Agent Design ───
      agent_design: {
        coordinatorRole: "thaum",
        purpose: "Debate and vote on proposed new agents \u2014 evaluate design, necessity, and personality fit.",
        minAgents: 3,
        maxAgents: 6,
        minTurns: 6,
        maxTurns: 14,
        maxTokensPerTurn: 2e3,
        temperature: 0.75,
        requires: ["thaum"],
        optional: ["chora", "subrosa", "praxis", "mux"]
      },
      // ─── Voice ───
      voice_chat: {
        coordinatorRole: "primus",
        purpose: "Live voice conversation with a human. Agents respond to user turns in real time.",
        minAgents: 2,
        maxAgents: 4,
        minTurns: 4,
        maxTurns: 30,
        maxTokensPerTurn: 1e3,
        temperature: 0.7
      }
    };
  }
});

// src/lib/ops/relationships.ts
function sortPair(a, b) {
  return a < b ? [a, b] : [b, a];
}
async function getAgentRelationships(agentId) {
  return sql`
        SELECT * FROM ops_agent_relationships
        WHERE agent_a = ${agentId} OR agent_b = ${agentId}
        ORDER BY affinity DESC
    `;
}
async function loadAffinityMap() {
  const rows = await sql`
        SELECT agent_a, agent_b, affinity FROM ops_agent_relationships
    `;
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    map.set(`${row.agent_a}:${row.agent_b}`, Number(row.affinity));
  }
  return map;
}
function getAffinityFromMap(map, agentA, agentB) {
  if (agentA === agentB) return 1;
  const [a, b] = sortPair(agentA, agentB);
  return map.get(`${a}:${b}`) ?? 0.5;
}
async function applyPairwiseDrifts(drifts, conversationId) {
  for (const d of drifts) {
    const [a, b] = sortPair(d.agent_a, d.agent_b);
    const clampedDrift = Math.min(0.03, Math.max(-0.03, d.drift));
    const [current] = await sql`
            SELECT affinity, total_interactions, positive_interactions,
                   negative_interactions, drift_log
            FROM ops_agent_relationships
            WHERE agent_a = ${a} AND agent_b = ${b}
        `;
    if (!current) continue;
    const currentAffinity = Number(current.affinity);
    const newAffinity = Math.min(
      0.95,
      Math.max(0.1, currentAffinity + clampedDrift)
    );
    const logEntry = {
      drift: clampedDrift,
      reason: d.reason.substring(0, 200),
      conversationId,
      at: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existingLog = Array.isArray(current.drift_log) ? current.drift_log : [];
    const newLog = [...existingLog.slice(-19), logEntry];
    await sql`
            UPDATE ops_agent_relationships SET
                affinity = ${newAffinity},
                total_interactions = ${(current.total_interactions ?? 0) + 1},
                positive_interactions = ${(current.positive_interactions ?? 0) + (clampedDrift > 0 ? 1 : 0)},
                negative_interactions = ${(current.negative_interactions ?? 0) + (clampedDrift < 0 ? 1 : 0)},
                drift_log = ${jsonb(newLog)}
            WHERE agent_a = ${a} AND agent_b = ${b}
        `;
  }
}
function getInteractionType(affinity) {
  const tension = 1 - affinity;
  if (tension > 0.7) {
    return Math.random() < 0.15 ? "adversarial" : "challenge";
  } else if (tension > 0.5) {
    return Math.random() < 0.3 ? "challenge" : "critical";
  } else if (tension > 0.3) {
    return "neutral";
  } else {
    return Math.random() < 0.4 ? "supportive" : "agreement";
  }
}
var init_relationships = __esm({
  "src/lib/ops/relationships.ts"() {
    "use strict";
    init_db();
  }
});

// src/lib/roundtable/speaker-selection.ts
function recencyPenalty(agent, speakCounts, totalTurns) {
  if (totalTurns === 0) return 0;
  const count = speakCounts[agent] ?? 0;
  return count / totalTurns;
}
function selectFirstSpeaker(participants, format) {
  const formatConfig = getFormat(format);
  const coordinator = formatConfig.coordinatorRole;
  if (participants.includes(coordinator)) {
    return coordinator;
  }
  return participants[Math.floor(Math.random() * participants.length)];
}
function selectNextSpeaker(context2) {
  const { participants, lastSpeaker, history, affinityMap } = context2;
  const speakCounts = {};
  for (const turn of history) {
    speakCounts[turn.speaker] = (speakCounts[turn.speaker] ?? 0) + 1;
  }
  const weights = participants.map((agent) => {
    if (agent === lastSpeaker) return 0;
    let w = 1;
    const affinity = affinityMap ? getAffinityFromMap(affinityMap, agent, lastSpeaker) : 0.5;
    w += affinity * 0.6;
    w -= recencyPenalty(agent, speakCounts, history.length) * 0.4;
    if (context2.format) {
      const boosts = FORMAT_ROLE_BOOSTS[context2.format];
      if (boosts?.[agent]) {
        w += boosts[agent];
      }
    }
    w += Math.random() * 0.4 - 0.2;
    return Math.max(0, w);
  });
  return weightedRandomPick(participants, weights);
}
function weightedRandomPick(items, weights) {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return items[Math.floor(Math.random() * items.length)];
  }
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}
var FORMAT_ROLE_BOOSTS;
var init_speaker_selection = __esm({
  "src/lib/roundtable/speaker-selection.ts"() {
    "use strict";
    init_relationships();
    init_formats();
    FORMAT_ROLE_BOOSTS = {
      planning: { praxis: 0.3, mux: 0.3 },
      shipping: { praxis: 0.3, mux: 0.3 },
      writing_room: { chora: 0.3, mux: 0.3, thaum: 0.2 },
      brainstorm: { thaum: 0.3, chora: 0.2 },
      risk_review: { subrosa: 0.3, chora: 0.2 },
      content_review: { subrosa: 0.3, mux: 0.2 }
    };
  }
});

// src/lib/request-id.ts
var init_request_id = __esm({
  "src/lib/request-id.ts"() {
    "use strict";
  }
});

// src/lib/request-context.ts
var import_node_async_hooks, RequestContext, requestContext;
var init_request_context = __esm({
  "src/lib/request-context.ts"() {
    "use strict";
    import_node_async_hooks = require("node:async_hooks");
    init_request_id();
    RequestContext = class {
      constructor() {
        this.storage = new import_node_async_hooks.AsyncLocalStorage();
      }
      /**
       * Run a callback with request context attached.
       * All async operations within the callback will have access to this context.
       */
      run(ctx, fn) {
        return this.storage.run(ctx, fn);
      }
      /** Get the current request context, or null if not in a request scope. */
      get() {
        return this.storage.getStore() ?? null;
      }
    };
    requestContext = new RequestContext();
  }
});

// src/lib/logger.ts
function serializeError(err) {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      ...err.stack ? { stack: err.stack } : {},
      ...err.cause ? { cause: serializeError(err.cause) } : {}
    };
  }
  return { message: String(err) };
}
function normalizeContext(ctx) {
  if (!ctx) return void 0;
  const normalized = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (key === "error" || key === "err") {
      normalized.error = serializeError(value);
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}
function writeJson(level, msg, bindings, ctx) {
  const entry = {
    level,
    time: (/* @__PURE__ */ new Date()).toISOString(),
    msg,
    ...bindings,
    ...ctx ?? {}
  };
  const reqCtx = requestContext.get();
  if (reqCtx) {
    entry.request_id = reqCtx.requestId;
    if (reqCtx.method) entry.http_method = reqCtx.method;
    if (reqCtx.path) entry.http_path = reqCtx.path;
  }
  process.stderr.write(JSON.stringify(entry) + "\n");
}
function writePretty(level, msg, bindings, ctx) {
  const color = LEVEL_COLORS[level];
  const time = (/* @__PURE__ */ new Date()).toISOString().slice(11, 23);
  const tag = level.toUpperCase().padEnd(5);
  let line = `${DIM}${time}${RESET} ${color}${tag}${RESET} ${msg}`;
  const reqCtx = requestContext.get();
  if (reqCtx) {
    line += ` ${DIM}[${reqCtx.requestId.slice(0, 8)}]${RESET}`;
  }
  const merged = { ...bindings, ...ctx ?? {} };
  const pairs = formatContext(merged);
  if (pairs) {
    line += ` ${DIM}${pairs}${RESET}`;
  }
  process.stderr.write(line + "\n");
}
function formatContext(ctx) {
  const parts = [];
  for (const [key, value] of Object.entries(ctx)) {
    if (key === "error" && typeof value === "object" && value !== null) {
      const err = value;
      parts.push(`error=${err.message ?? String(value)}`);
      if (err.stack && typeof err.stack === "string") {
        const firstFrame = err.stack.split("\n")[1]?.trim();
        if (firstFrame) parts.push(`  at ${firstFrame}`);
      }
    } else if (typeof value === "object" && value !== null) {
      try {
        parts.push(`${key}=${JSON.stringify(value)}`);
      } catch {
        parts.push(`${key}=[circular]`);
      }
    } else {
      parts.push(`${key}=${String(value)}`);
    }
  }
  return parts.join(" ");
}
function createLoggerInternal(bindings) {
  const write = USE_JSON ? writeJson : writePretty;
  function log37(level, msg, ctx) {
    if (LEVEL_VALUES[level] < MIN_LEVEL) return;
    write(level, msg, bindings, normalizeContext(ctx));
  }
  return {
    debug: (msg, ctx) => log37("debug", msg, ctx),
    info: (msg, ctx) => log37("info", msg, ctx),
    warn: (msg, ctx) => log37("warn", msg, ctx),
    error: (msg, ctx) => log37("error", msg, ctx),
    fatal: (msg, ctx) => log37("fatal", msg, ctx),
    child: (childBindings) => createLoggerInternal({ ...bindings, ...childBindings })
  };
}
function createLogger(bindings = {}) {
  return createLoggerInternal(bindings);
}
var LEVEL_VALUES, LEVEL_COLORS, RESET, DIM, IS_PRODUCTION, USE_JSON, LOG_LEVEL, MIN_LEVEL, logger;
var init_logger = __esm({
  "src/lib/logger.ts"() {
    "use strict";
    init_request_context();
    LEVEL_VALUES = {
      debug: 10,
      info: 20,
      warn: 30,
      error: 40,
      fatal: 50
    };
    LEVEL_COLORS = {
      debug: "\x1B[90m",
      // gray
      info: "\x1B[36m",
      // cyan
      warn: "\x1B[33m",
      // yellow
      error: "\x1B[31m",
      // red
      fatal: "\x1B[35m"
      // magenta
    };
    RESET = "\x1B[0m";
    DIM = "\x1B[2m";
    IS_PRODUCTION = process.env.NODE_ENV === "production";
    USE_JSON = process.env.LOG_FORMAT === "json" || process.env.LOG_FORMAT !== "pretty" && IS_PRODUCTION;
    LOG_LEVEL = process.env.LOG_LEVEL ?? (IS_PRODUCTION ? "info" : "debug");
    MIN_LEVEL = LEVEL_VALUES[LOG_LEVEL] ?? LEVEL_VALUES.info;
    logger = createLoggerInternal({ service: "subcorp" });
  }
});

// node_modules/prom-client/lib/util.js
var require_util = __commonJS({
  "node_modules/prom-client/lib/util.js"(exports2) {
    "use strict";
    exports2.getValueAsString = function getValueString(value) {
      if (Number.isNaN(value)) {
        return "Nan";
      } else if (!Number.isFinite(value)) {
        if (value < 0) {
          return "-Inf";
        } else {
          return "+Inf";
        }
      } else {
        return `${value}`;
      }
    };
    exports2.removeLabels = function removeLabels(hashMap, labels, sortedLabelNames) {
      const hash = hashObject(labels, sortedLabelNames);
      delete hashMap[hash];
    };
    exports2.setValue = function setValue(hashMap, value, labels) {
      const hash = hashObject(labels);
      hashMap[hash] = {
        value: typeof value === "number" ? value : 0,
        labels: labels || {}
      };
      return hashMap;
    };
    exports2.setValueDelta = function setValueDelta(hashMap, deltaValue, labels, hash = "") {
      const value = typeof deltaValue === "number" ? deltaValue : 0;
      if (hashMap[hash]) {
        hashMap[hash].value += value;
      } else {
        hashMap[hash] = { value, labels };
      }
      return hashMap;
    };
    exports2.getLabels = function(labelNames, args) {
      if (typeof args[0] === "object") {
        return args[0];
      }
      if (labelNames.length !== args.length) {
        throw new Error(
          `Invalid number of arguments (${args.length}): "${args.join(
            ", "
          )}" for label names (${labelNames.length}): "${labelNames.join(", ")}".`
        );
      }
      const acc = {};
      for (let i = 0; i < labelNames.length; i++) {
        acc[labelNames[i]] = args[i];
      }
      return acc;
    };
    function fastHashObject(keys, labels) {
      if (keys.length === 0) {
        return "";
      }
      let hash = "";
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = labels[key];
        if (value === void 0) continue;
        hash += `${key}:${value},`;
      }
      return hash;
    }
    function hashObject(labels, labelNames) {
      if (labelNames) {
        return fastHashObject(labelNames, labels);
      }
      const keys = Object.keys(labels);
      if (keys.length > 1) {
        keys.sort();
      }
      return fastHashObject(keys, labels);
    }
    exports2.hashObject = hashObject;
    exports2.isObject = function isObject(obj) {
      return obj !== null && typeof obj === "object";
    };
    exports2.nowTimestamp = function nowTimestamp() {
      return Date.now() / 1e3;
    };
    var Grouper = class extends Map {
      /**
       * Adds the `value` to the `key`'s array of values.
       * @param {*} key Key to set.
       * @param {*} value Value to add to `key`'s array.
       * @returns {undefined} undefined.
       */
      add(key, value) {
        if (this.has(key)) {
          this.get(key).push(value);
        } else {
          this.set(key, [value]);
        }
      }
    };
    exports2.Grouper = Grouper;
  }
});

// node_modules/prom-client/lib/registry.js
var require_registry = __commonJS({
  "node_modules/prom-client/lib/registry.js"(exports2, module2) {
    "use strict";
    var { getValueAsString } = require_util();
    var Registry = class _Registry {
      static get PROMETHEUS_CONTENT_TYPE() {
        return "text/plain; version=0.0.4; charset=utf-8";
      }
      static get OPENMETRICS_CONTENT_TYPE() {
        return "application/openmetrics-text; version=1.0.0; charset=utf-8";
      }
      constructor(regContentType = _Registry.PROMETHEUS_CONTENT_TYPE) {
        this._metrics = {};
        this._collectors = [];
        this._defaultLabels = {};
        if (regContentType !== _Registry.PROMETHEUS_CONTENT_TYPE && regContentType !== _Registry.OPENMETRICS_CONTENT_TYPE) {
          throw new TypeError(`Content type ${regContentType} is unsupported`);
        }
        this._contentType = regContentType;
      }
      getMetricsAsArray() {
        return Object.values(this._metrics);
      }
      async getMetricsAsString(metrics2) {
        const metric = typeof metrics2.getForPromString === "function" ? await metrics2.getForPromString() : await metrics2.get();
        const name = escapeString(metric.name);
        const help = `# HELP ${name} ${escapeString(metric.help)}`;
        const type = `# TYPE ${name} ${metric.type}`;
        const values = [help, type];
        const defaultLabels = Object.keys(this._defaultLabels).length > 0 ? this._defaultLabels : null;
        const isOpenMetrics = this.contentType === _Registry.OPENMETRICS_CONTENT_TYPE;
        for (const val of metric.values || []) {
          let { metricName = name, labels = {} } = val;
          const { sharedLabels = {} } = val;
          if (isOpenMetrics && metric.type === "counter") {
            metricName = `${metricName}_total`;
          }
          if (defaultLabels) {
            labels = { ...labels, ...defaultLabels, ...labels };
          }
          const formattedLabels = formatLabels(labels, sharedLabels);
          const flattenedShared = flattenSharedLabels(sharedLabels);
          const labelParts = [...formattedLabels, flattenedShared].filter(Boolean);
          const labelsString = labelParts.length ? `{${labelParts.join(",")}}` : "";
          let fullMetricLine = `${metricName}${labelsString} ${getValueAsString(
            val.value
          )}`;
          const { exemplar } = val;
          if (exemplar && isOpenMetrics) {
            const formattedExemplars = formatLabels(exemplar.labelSet);
            fullMetricLine += ` # {${formattedExemplars.join(
              ","
            )}} ${getValueAsString(exemplar.value)} ${exemplar.timestamp}`;
          }
          values.push(fullMetricLine);
        }
        return values.join("\n");
      }
      async metrics() {
        const isOpenMetrics = this.contentType === _Registry.OPENMETRICS_CONTENT_TYPE;
        const promises = this.getMetricsAsArray().map((metric) => {
          if (isOpenMetrics && metric.type === "counter") {
            metric.name = standardizeCounterName(metric.name);
          }
          return this.getMetricsAsString(metric);
        });
        const resolves = await Promise.all(promises);
        return isOpenMetrics ? `${resolves.join("\n")}
# EOF
` : `${resolves.join("\n\n")}
`;
      }
      registerMetric(metric) {
        if (this._metrics[metric.name] && this._metrics[metric.name] !== metric) {
          throw new Error(
            `A metric with the name ${metric.name} has already been registered.`
          );
        }
        this._metrics[metric.name] = metric;
      }
      clear() {
        this._metrics = {};
        this._defaultLabels = {};
      }
      async getMetricsAsJSON() {
        const metrics2 = [];
        const defaultLabelNames = Object.keys(this._defaultLabels);
        const promises = [];
        for (const metric of this.getMetricsAsArray()) {
          promises.push(metric.get());
        }
        const resolves = await Promise.all(promises);
        for (const item of resolves) {
          if (item.values && defaultLabelNames.length > 0) {
            for (const val of item.values) {
              val.labels = Object.assign({}, val.labels);
              for (const labelName of defaultLabelNames) {
                val.labels[labelName] = val.labels[labelName] || this._defaultLabels[labelName];
              }
            }
          }
          metrics2.push(item);
        }
        return metrics2;
      }
      removeSingleMetric(name) {
        delete this._metrics[name];
      }
      getSingleMetricAsString(name) {
        return this.getMetricsAsString(this._metrics[name]);
      }
      getSingleMetric(name) {
        return this._metrics[name];
      }
      setDefaultLabels(labels) {
        this._defaultLabels = labels;
      }
      resetMetrics() {
        for (const metric in this._metrics) {
          this._metrics[metric].reset();
        }
      }
      get contentType() {
        return this._contentType;
      }
      setContentType(metricsContentType) {
        if (metricsContentType === _Registry.OPENMETRICS_CONTENT_TYPE || metricsContentType === _Registry.PROMETHEUS_CONTENT_TYPE) {
          this._contentType = metricsContentType;
        } else {
          throw new Error(`Content type ${metricsContentType} is unsupported`);
        }
      }
      static merge(registers) {
        const regType = registers[0].contentType;
        for (const reg of registers) {
          if (reg.contentType !== regType) {
            throw new Error(
              "Registers can only be merged if they have the same content type"
            );
          }
        }
        const mergedRegistry = new _Registry(regType);
        const metricsToMerge = registers.reduce(
          (acc, reg) => acc.concat(reg.getMetricsAsArray()),
          []
        );
        metricsToMerge.forEach(mergedRegistry.registerMetric, mergedRegistry);
        return mergedRegistry;
      }
    };
    function formatLabels(labels, exclude) {
      const { hasOwnProperty } = Object.prototype;
      const formatted = [];
      for (const [name, value] of Object.entries(labels)) {
        if (!exclude || !hasOwnProperty.call(exclude, name)) {
          formatted.push(`${name}="${escapeLabelValue(value)}"`);
        }
      }
      return formatted;
    }
    var sharedLabelCache = /* @__PURE__ */ new WeakMap();
    function flattenSharedLabels(labels) {
      const cached = sharedLabelCache.get(labels);
      if (cached) {
        return cached;
      }
      const formattedLabels = formatLabels(labels);
      const flattened = formattedLabels.join(",");
      sharedLabelCache.set(labels, flattened);
      return flattened;
    }
    function escapeLabelValue(str) {
      if (typeof str !== "string") {
        return str;
      }
      return escapeString(str).replace(/"/g, '\\"');
    }
    function escapeString(str) {
      return str.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
    }
    function standardizeCounterName(name) {
      return name.replace(/_total$/, "");
    }
    module2.exports = Registry;
    module2.exports.globalRegistry = new Registry();
  }
});

// node_modules/prom-client/lib/validation.js
var require_validation = __commonJS({
  "node_modules/prom-client/lib/validation.js"(exports2) {
    "use strict";
    var util = require("util");
    var metricRegexp = /^[a-zA-Z_:][a-zA-Z0-9_:]*$/;
    var labelRegexp = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    exports2.validateMetricName = function(name) {
      return metricRegexp.test(name);
    };
    exports2.validateLabelName = function(names = []) {
      return names.every((name) => labelRegexp.test(name));
    };
    exports2.validateLabel = function validateLabel(savedLabels, labels) {
      for (const label in labels) {
        if (!savedLabels.includes(label)) {
          throw new Error(
            `Added label "${label}" is not included in initial labelset: ${util.inspect(
              savedLabels
            )}`
          );
        }
      }
    };
  }
});

// node_modules/prom-client/lib/metric.js
var require_metric = __commonJS({
  "node_modules/prom-client/lib/metric.js"(exports2, module2) {
    "use strict";
    var Registry = require_registry();
    var { isObject } = require_util();
    var { validateMetricName, validateLabelName } = require_validation();
    var Metric = class {
      constructor(config, defaults = {}) {
        if (!isObject(config)) {
          throw new TypeError("constructor expected a config object");
        }
        Object.assign(
          this,
          {
            labelNames: [],
            registers: [Registry.globalRegistry],
            aggregator: "sum",
            enableExemplars: false
          },
          defaults,
          config
        );
        if (!this.registers) {
          this.registers = [Registry.globalRegistry];
        }
        if (!this.help) {
          throw new Error("Missing mandatory help parameter");
        }
        if (!this.name) {
          throw new Error("Missing mandatory name parameter");
        }
        if (!validateMetricName(this.name)) {
          throw new Error("Invalid metric name");
        }
        if (!validateLabelName(this.labelNames)) {
          throw new Error("Invalid label name");
        }
        if (this.collect && typeof this.collect !== "function") {
          throw new Error('Optional "collect" parameter must be a function');
        }
        if (this.labelNames) {
          this.sortedLabelNames = [...this.labelNames].sort();
        } else {
          this.sortedLabelNames = [];
        }
        this.reset();
        for (const register2 of this.registers) {
          if (this.enableExemplars && register2.contentType === Registry.PROMETHEUS_CONTENT_TYPE) {
            throw new TypeError(
              "Exemplars are supported only on OpenMetrics registries"
            );
          }
          register2.registerMetric(this);
        }
      }
      reset() {
      }
    };
    module2.exports = { Metric };
  }
});

// node_modules/prom-client/lib/exemplar.js
var require_exemplar = __commonJS({
  "node_modules/prom-client/lib/exemplar.js"(exports2, module2) {
    "use strict";
    var Exemplar = class {
      constructor(labelSet = {}, value = null) {
        this.labelSet = labelSet;
        this.value = value;
      }
      /**
       * Validation for the label set format.
       * https://github.com/OpenObservability/OpenMetrics/blob/d99b705f611b75fec8f450b05e344e02eea6921d/specification/OpenMetrics.md#exemplars
       *
       * @param {object} labelSet - Exemplar labels.
       * @throws {RangeError}
       * @return {void}
       */
      validateExemplarLabelSet(labelSet) {
        let res = "";
        for (const [labelName, labelValue] of Object.entries(labelSet)) {
          res += `${labelName}${labelValue}`;
        }
        if (res.length > 128) {
          throw new RangeError(
            "Label set size must be smaller than 128 UTF-8 chars"
          );
        }
      }
    };
    module2.exports = Exemplar;
  }
});

// node_modules/prom-client/lib/counter.js
var require_counter = __commonJS({
  "node_modules/prom-client/lib/counter.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var {
      hashObject,
      isObject,
      getLabels,
      removeLabels,
      nowTimestamp
    } = require_util();
    var { validateLabel } = require_validation();
    var { Metric } = require_metric();
    var Exemplar = require_exemplar();
    var Counter2 = class extends Metric {
      constructor(config) {
        super(config);
        this.type = "counter";
        this.defaultLabels = {};
        this.defaultValue = 1;
        this.defaultExemplarLabelSet = {};
        if (config.enableExemplars) {
          this.enableExemplars = true;
          this.inc = this.incWithExemplar;
        } else {
          this.inc = this.incWithoutExemplar;
        }
      }
      /**
       * Increment counter
       * @param {object} labels - What label you want to be incremented
       * @param {Number} value - Value to increment, if omitted increment with 1
       * @returns {object} results - object with information about the inc operation
       * @returns {string} results.labelHash - hash representation of the labels
       */
      incWithoutExemplar(labels, value) {
        let hash = "";
        if (isObject(labels)) {
          hash = hashObject(labels, this.sortedLabelNames);
          validateLabel(this.labelNames, labels);
        } else {
          value = labels;
          labels = {};
        }
        if (value && !Number.isFinite(value)) {
          throw new TypeError(`Value is not a valid number: ${util.format(value)}`);
        }
        if (value < 0) {
          throw new Error("It is not possible to decrease a counter");
        }
        if (value === null || value === void 0) value = 1;
        setValue(this.hashMap, value, labels, hash);
        return { labelHash: hash };
      }
      /**
       * Increment counter with exemplar, same as inc but accepts labels for an
       * exemplar.
       * If no label is provided the current exemplar labels are kept unchanged
       * (defaults to empty set).
       *
       * @param {object} incOpts - Object with options about what metric to increase
       * @param {object} incOpts.labels - What label you want to be incremented,
       *                                  defaults to null (metric with no labels)
       * @param {Number} incOpts.value - Value to increment, defaults to 1
       * @param {object} incOpts.exemplarLabels - Key-value  labels for the
       *                                          exemplar, defaults to empty set {}
       * @returns {void}
       */
      incWithExemplar({
        labels = this.defaultLabels,
        value = this.defaultValue,
        exemplarLabels = this.defaultExemplarLabelSet
      } = {}) {
        const res = this.incWithoutExemplar(labels, value);
        this.updateExemplar(exemplarLabels, value, res.labelHash);
      }
      updateExemplar(exemplarLabels, value, hash) {
        if (exemplarLabels === this.defaultExemplarLabelSet) return;
        if (!isObject(this.hashMap[hash].exemplar)) {
          this.hashMap[hash].exemplar = new Exemplar();
        }
        this.hashMap[hash].exemplar.validateExemplarLabelSet(exemplarLabels);
        this.hashMap[hash].exemplar.labelSet = exemplarLabels;
        this.hashMap[hash].exemplar.value = value ? value : 1;
        this.hashMap[hash].exemplar.timestamp = nowTimestamp();
      }
      /**
       * Reset counter
       * @returns {void}
       */
      reset() {
        this.hashMap = {};
        if (this.labelNames.length === 0) {
          setValue(this.hashMap, 0);
        }
      }
      async get() {
        if (this.collect) {
          const v = this.collect();
          if (v instanceof Promise) await v;
        }
        return {
          help: this.help,
          name: this.name,
          type: this.type,
          values: Object.values(this.hashMap),
          aggregator: this.aggregator
        };
      }
      labels(...args) {
        const labels = getLabels(this.labelNames, args) || {};
        return {
          inc: this.inc.bind(this, labels)
        };
      }
      remove(...args) {
        const labels = getLabels(this.labelNames, args) || {};
        validateLabel(this.labelNames, labels);
        return removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
      }
    };
    function setValue(hashMap, value, labels = {}, hash = "") {
      if (hashMap[hash]) {
        hashMap[hash].value += value;
      } else {
        hashMap[hash] = { value, labels };
      }
      return hashMap;
    }
    module2.exports = Counter2;
  }
});

// node_modules/prom-client/lib/gauge.js
var require_gauge = __commonJS({
  "node_modules/prom-client/lib/gauge.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var {
      setValue,
      setValueDelta,
      getLabels,
      hashObject,
      isObject,
      removeLabels
    } = require_util();
    var { validateLabel } = require_validation();
    var { Metric } = require_metric();
    var Gauge = class extends Metric {
      constructor(config) {
        super(config);
        this.type = "gauge";
      }
      /**
       * Set a gauge to a value
       * @param {object} labels - Object with labels and their values
       * @param {Number} value - Value to set the gauge to, must be positive
       * @returns {void}
       */
      set(labels, value) {
        value = getValueArg(labels, value);
        labels = getLabelArg(labels);
        set(this, labels, value);
      }
      /**
       * Reset gauge
       * @returns {void}
       */
      reset() {
        this.hashMap = {};
        if (this.labelNames.length === 0) {
          setValue(this.hashMap, 0, {});
        }
      }
      /**
       * Increment a gauge value
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @param {Number} value - Value to increment - if omitted, increment with 1
       * @returns {void}
       */
      inc(labels, value) {
        value = getValueArg(labels, value);
        labels = getLabelArg(labels);
        if (value === void 0) value = 1;
        setDelta(this, labels, value);
      }
      /**
       * Decrement a gauge value
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @param {Number} value - Value to decrement - if omitted, decrement with 1
       * @returns {void}
       */
      dec(labels, value) {
        value = getValueArg(labels, value);
        labels = getLabelArg(labels);
        if (value === void 0) value = 1;
        setDelta(this, labels, -value);
      }
      /**
       * Set the gauge to current unix epoch
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @returns {void}
       */
      setToCurrentTime(labels) {
        const now = Date.now() / 1e3;
        if (labels === void 0) {
          this.set(now);
        } else {
          this.set(labels, now);
        }
      }
      /**
       * Start a timer
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @returns {function} - Invoke this function to set the duration in seconds since you started the timer.
       * @example
       * var done = gauge.startTimer();
       * makeXHRRequest(function(err, response) {
       *	done(); //Duration of the request will be saved
       * });
       */
      startTimer(labels) {
        const start = process.hrtime();
        return (endLabels) => {
          const delta = process.hrtime(start);
          const value = delta[0] + delta[1] / 1e9;
          this.set(Object.assign({}, labels, endLabels), value);
          return value;
        };
      }
      async get() {
        if (this.collect) {
          const v = this.collect();
          if (v instanceof Promise) await v;
        }
        return {
          help: this.help,
          name: this.name,
          type: this.type,
          values: Object.values(this.hashMap),
          aggregator: this.aggregator
        };
      }
      _getValue(labels) {
        const hash = hashObject(labels || {}, this.sortedLabelNames);
        return this.hashMap[hash] ? this.hashMap[hash].value : 0;
      }
      labels(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        return {
          inc: this.inc.bind(this, labels),
          dec: this.dec.bind(this, labels),
          set: this.set.bind(this, labels),
          setToCurrentTime: this.setToCurrentTime.bind(this, labels),
          startTimer: this.startTimer.bind(this, labels)
        };
      }
      remove(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
      }
    };
    function set(gauge, labels, value) {
      if (typeof value !== "number") {
        throw new TypeError(`Value is not a valid number: ${util.format(value)}`);
      }
      validateLabel(gauge.labelNames, labels);
      setValue(gauge.hashMap, value, labels);
    }
    function setDelta(gauge, labels, delta) {
      if (typeof delta !== "number") {
        throw new TypeError(`Delta is not a valid number: ${util.format(delta)}`);
      }
      validateLabel(gauge.labelNames, labels);
      const hash = hashObject(labels, gauge.sortedLabelNames);
      setValueDelta(gauge.hashMap, delta, labels, hash);
    }
    function getLabelArg(labels) {
      return isObject(labels) ? labels : {};
    }
    function getValueArg(labels, value) {
      return isObject(labels) ? value : labels;
    }
    module2.exports = Gauge;
  }
});

// node_modules/prom-client/lib/histogram.js
var require_histogram = __commonJS({
  "node_modules/prom-client/lib/histogram.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var {
      getLabels,
      hashObject,
      isObject,
      removeLabels,
      nowTimestamp
    } = require_util();
    var { validateLabel } = require_validation();
    var { Metric } = require_metric();
    var Exemplar = require_exemplar();
    var Histogram = class extends Metric {
      constructor(config) {
        super(config, {
          buckets: [5e-3, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
        });
        this.type = "histogram";
        this.defaultLabels = {};
        this.defaultExemplarLabelSet = {};
        this.enableExemplars = false;
        for (const label of this.labelNames) {
          if (label === "le") {
            throw new Error("le is a reserved label keyword");
          }
        }
        this.upperBounds = this.buckets;
        this.bucketValues = this.upperBounds.reduce((acc, upperBound) => {
          acc[upperBound] = 0;
          return acc;
        }, {});
        if (config.enableExemplars) {
          this.enableExemplars = true;
          this.bucketExemplars = this.upperBounds.reduce((acc, upperBound) => {
            acc[upperBound] = null;
            return acc;
          }, {});
          Object.freeze(this.bucketExemplars);
          this.observe = this.observeWithExemplar;
        } else {
          this.observe = this.observeWithoutExemplar;
        }
        Object.freeze(this.bucketValues);
        Object.freeze(this.upperBounds);
        if (this.labelNames.length === 0) {
          this.hashMap = {
            [hashObject({})]: createBaseValues(
              {},
              this.bucketValues,
              this.bucketExemplars
            )
          };
        }
      }
      /**
       * Observe a value in histogram
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @param {Number} value - Value to observe in the histogram
       * @returns {void}
       */
      observeWithoutExemplar(labels, value) {
        observe.call(this, labels === 0 ? 0 : labels || {})(value);
      }
      observeWithExemplar({
        labels = this.defaultLabels,
        value,
        exemplarLabels = this.defaultExemplarLabelSet
      } = {}) {
        observe.call(this, labels === 0 ? 0 : labels || {})(value);
        this.updateExemplar(labels, value, exemplarLabels);
      }
      updateExemplar(labels, value, exemplarLabels) {
        if (Object.keys(exemplarLabels).length === 0) return;
        const hash = hashObject(labels, this.sortedLabelNames);
        const bound = findBound(this.upperBounds, value);
        const { bucketExemplars } = this.hashMap[hash];
        let exemplar = bucketExemplars[bound];
        if (!isObject(exemplar)) {
          exemplar = new Exemplar();
          bucketExemplars[bound] = exemplar;
        }
        exemplar.validateExemplarLabelSet(exemplarLabels);
        exemplar.labelSet = exemplarLabels;
        exemplar.value = value;
        exemplar.timestamp = nowTimestamp();
      }
      async get() {
        const data = await this.getForPromString();
        data.values = data.values.map(splayLabels);
        return data;
      }
      async getForPromString() {
        if (this.collect) {
          const v = this.collect();
          if (v instanceof Promise) await v;
        }
        const data = Object.values(this.hashMap);
        const values = data.map(extractBucketValuesForExport(this)).reduce(addSumAndCountForExport(this), []);
        return {
          name: this.name,
          help: this.help,
          type: this.type,
          values,
          aggregator: this.aggregator
        };
      }
      reset() {
        this.hashMap = {};
      }
      /**
       * Initialize the metrics for the given combination of labels to zero
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @returns {void}
       */
      zero(labels) {
        const hash = hashObject(labels, this.sortedLabelNames);
        this.hashMap[hash] = createBaseValues(
          labels,
          this.bucketValues,
          this.bucketExemplars
        );
      }
      /**
       * Start a timer that could be used to logging durations
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @param {object} exemplarLabels - Object with labels for exemplar where key is the label key and value is label value. Can only be one level deep
       * @returns {function} - Function to invoke when you want to stop the timer and observe the duration in seconds
       * @example
       * var end = histogram.startTimer();
       * makeExpensiveXHRRequest(function(err, res) {
       * 	const duration = end(); //Observe the duration of expensiveXHRRequest and returns duration in seconds
       * 	console.log('Duration', duration);
       * });
       */
      startTimer(labels, exemplarLabels) {
        return this.enableExemplars ? startTimerWithExemplar.call(this, labels, exemplarLabels)() : startTimer.call(this, labels)();
      }
      labels(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        return {
          observe: observe.call(this, labels),
          startTimer: startTimer.call(this, labels)
        };
      }
      remove(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
      }
    };
    function startTimer(startLabels) {
      return () => {
        const start = process.hrtime();
        return (endLabels) => {
          const delta = process.hrtime(start);
          const value = delta[0] + delta[1] / 1e9;
          this.observe(Object.assign({}, startLabels, endLabels), value);
          return value;
        };
      };
    }
    function startTimerWithExemplar(startLabels, startExemplarLabels) {
      return () => {
        const start = process.hrtime();
        return (endLabels, endExemplarLabels) => {
          const delta = process.hrtime(start);
          const value = delta[0] + delta[1] / 1e9;
          this.observe({
            labels: Object.assign({}, startLabels, endLabels),
            value,
            exemplarLabels: Object.assign(
              {},
              startExemplarLabels,
              endExemplarLabels
            )
          });
          return value;
        };
      };
    }
    function setValuePair(labels, value, metricName, exemplar, sharedLabels = {}) {
      return {
        labels,
        sharedLabels,
        value,
        metricName,
        exemplar
      };
    }
    function findBound(upperBounds, value) {
      for (let i = 0; i < upperBounds.length; i++) {
        const bound = upperBounds[i];
        if (value <= bound) {
          return bound;
        }
      }
      return -1;
    }
    function observe(labels) {
      return (value) => {
        const labelValuePair = convertLabelsAndValues(labels, value);
        validateLabel(this.labelNames, labelValuePair.labels);
        if (!Number.isFinite(labelValuePair.value)) {
          throw new TypeError(
            `Value is not a valid number: ${util.format(labelValuePair.value)}`
          );
        }
        const hash = hashObject(labelValuePair.labels, this.sortedLabelNames);
        let valueFromMap = this.hashMap[hash];
        if (!valueFromMap) {
          valueFromMap = createBaseValues(
            labelValuePair.labels,
            this.bucketValues,
            this.bucketExemplars
          );
        }
        const b = findBound(this.upperBounds, labelValuePair.value);
        valueFromMap.sum += labelValuePair.value;
        valueFromMap.count += 1;
        if (Object.prototype.hasOwnProperty.call(valueFromMap.bucketValues, b)) {
          valueFromMap.bucketValues[b] += 1;
        }
        this.hashMap[hash] = valueFromMap;
      };
    }
    function createBaseValues(labels, bucketValues, bucketExemplars) {
      const result = {
        labels,
        bucketValues: { ...bucketValues },
        sum: 0,
        count: 0
      };
      if (bucketExemplars) {
        result.bucketExemplars = { ...bucketExemplars };
      }
      return result;
    }
    function convertLabelsAndValues(labels, value) {
      return isObject(labels) ? {
        labels,
        value
      } : {
        value: labels,
        labels: {}
      };
    }
    function extractBucketValuesForExport(histogram) {
      const name = `${histogram.name}_bucket`;
      return (bucketData) => {
        let acc = 0;
        const buckets = histogram.upperBounds.map((upperBound) => {
          acc += bucketData.bucketValues[upperBound];
          return setValuePair(
            { le: upperBound },
            acc,
            name,
            bucketData.bucketExemplars ? bucketData.bucketExemplars[upperBound] : null,
            bucketData.labels
          );
        });
        return { buckets, data: bucketData };
      };
    }
    function addSumAndCountForExport(histogram) {
      return (acc, d) => {
        acc.push(...d.buckets);
        const infLabel = { le: "+Inf" };
        acc.push(
          setValuePair(
            infLabel,
            d.data.count,
            `${histogram.name}_bucket`,
            d.data.bucketExemplars ? d.data.bucketExemplars["-1"] : null,
            d.data.labels
          ),
          setValuePair(
            {},
            d.data.sum,
            `${histogram.name}_sum`,
            void 0,
            d.data.labels
          ),
          setValuePair(
            {},
            d.data.count,
            `${histogram.name}_count`,
            void 0,
            d.data.labels
          )
        );
        return acc;
      };
    }
    function splayLabels(bucket) {
      const { sharedLabels, labels, ...newBucket } = bucket;
      for (const label of Object.keys(sharedLabels)) {
        labels[label] = sharedLabels[label];
      }
      newBucket.labels = labels;
      return newBucket;
    }
    module2.exports = Histogram;
  }
});

// node_modules/bintrees/lib/treebase.js
var require_treebase = __commonJS({
  "node_modules/bintrees/lib/treebase.js"(exports2, module2) {
    function TreeBase() {
    }
    TreeBase.prototype.clear = function() {
      this._root = null;
      this.size = 0;
    };
    TreeBase.prototype.find = function(data) {
      var res = this._root;
      while (res !== null) {
        var c = this._comparator(data, res.data);
        if (c === 0) {
          return res.data;
        } else {
          res = res.get_child(c > 0);
        }
      }
      return null;
    };
    TreeBase.prototype.findIter = function(data) {
      var res = this._root;
      var iter = this.iterator();
      while (res !== null) {
        var c = this._comparator(data, res.data);
        if (c === 0) {
          iter._cursor = res;
          return iter;
        } else {
          iter._ancestors.push(res);
          res = res.get_child(c > 0);
        }
      }
      return null;
    };
    TreeBase.prototype.lowerBound = function(item) {
      var cur = this._root;
      var iter = this.iterator();
      var cmp = this._comparator;
      while (cur !== null) {
        var c = cmp(item, cur.data);
        if (c === 0) {
          iter._cursor = cur;
          return iter;
        }
        iter._ancestors.push(cur);
        cur = cur.get_child(c > 0);
      }
      for (var i = iter._ancestors.length - 1; i >= 0; --i) {
        cur = iter._ancestors[i];
        if (cmp(item, cur.data) < 0) {
          iter._cursor = cur;
          iter._ancestors.length = i;
          return iter;
        }
      }
      iter._ancestors.length = 0;
      return iter;
    };
    TreeBase.prototype.upperBound = function(item) {
      var iter = this.lowerBound(item);
      var cmp = this._comparator;
      while (iter.data() !== null && cmp(iter.data(), item) === 0) {
        iter.next();
      }
      return iter;
    };
    TreeBase.prototype.min = function() {
      var res = this._root;
      if (res === null) {
        return null;
      }
      while (res.left !== null) {
        res = res.left;
      }
      return res.data;
    };
    TreeBase.prototype.max = function() {
      var res = this._root;
      if (res === null) {
        return null;
      }
      while (res.right !== null) {
        res = res.right;
      }
      return res.data;
    };
    TreeBase.prototype.iterator = function() {
      return new Iterator(this);
    };
    TreeBase.prototype.each = function(cb) {
      var it = this.iterator(), data;
      while ((data = it.next()) !== null) {
        if (cb(data) === false) {
          return;
        }
      }
    };
    TreeBase.prototype.reach = function(cb) {
      var it = this.iterator(), data;
      while ((data = it.prev()) !== null) {
        if (cb(data) === false) {
          return;
        }
      }
    };
    function Iterator(tree) {
      this._tree = tree;
      this._ancestors = [];
      this._cursor = null;
    }
    Iterator.prototype.data = function() {
      return this._cursor !== null ? this._cursor.data : null;
    };
    Iterator.prototype.next = function() {
      if (this._cursor === null) {
        var root = this._tree._root;
        if (root !== null) {
          this._minNode(root);
        }
      } else {
        if (this._cursor.right === null) {
          var save;
          do {
            save = this._cursor;
            if (this._ancestors.length) {
              this._cursor = this._ancestors.pop();
            } else {
              this._cursor = null;
              break;
            }
          } while (this._cursor.right === save);
        } else {
          this._ancestors.push(this._cursor);
          this._minNode(this._cursor.right);
        }
      }
      return this._cursor !== null ? this._cursor.data : null;
    };
    Iterator.prototype.prev = function() {
      if (this._cursor === null) {
        var root = this._tree._root;
        if (root !== null) {
          this._maxNode(root);
        }
      } else {
        if (this._cursor.left === null) {
          var save;
          do {
            save = this._cursor;
            if (this._ancestors.length) {
              this._cursor = this._ancestors.pop();
            } else {
              this._cursor = null;
              break;
            }
          } while (this._cursor.left === save);
        } else {
          this._ancestors.push(this._cursor);
          this._maxNode(this._cursor.left);
        }
      }
      return this._cursor !== null ? this._cursor.data : null;
    };
    Iterator.prototype._minNode = function(start) {
      while (start.left !== null) {
        this._ancestors.push(start);
        start = start.left;
      }
      this._cursor = start;
    };
    Iterator.prototype._maxNode = function(start) {
      while (start.right !== null) {
        this._ancestors.push(start);
        start = start.right;
      }
      this._cursor = start;
    };
    module2.exports = TreeBase;
  }
});

// node_modules/bintrees/lib/rbtree.js
var require_rbtree = __commonJS({
  "node_modules/bintrees/lib/rbtree.js"(exports2, module2) {
    var TreeBase = require_treebase();
    function Node(data) {
      this.data = data;
      this.left = null;
      this.right = null;
      this.red = true;
    }
    Node.prototype.get_child = function(dir) {
      return dir ? this.right : this.left;
    };
    Node.prototype.set_child = function(dir, val) {
      if (dir) {
        this.right = val;
      } else {
        this.left = val;
      }
    };
    function RBTree(comparator) {
      this._root = null;
      this._comparator = comparator;
      this.size = 0;
    }
    RBTree.prototype = new TreeBase();
    RBTree.prototype.insert = function(data) {
      var ret2 = false;
      if (this._root === null) {
        this._root = new Node(data);
        ret2 = true;
        this.size++;
      } else {
        var head = new Node(void 0);
        var dir = 0;
        var last = 0;
        var gp = null;
        var ggp = head;
        var p = null;
        var node = this._root;
        ggp.right = this._root;
        while (true) {
          if (node === null) {
            node = new Node(data);
            p.set_child(dir, node);
            ret2 = true;
            this.size++;
          } else if (is_red(node.left) && is_red(node.right)) {
            node.red = true;
            node.left.red = false;
            node.right.red = false;
          }
          if (is_red(node) && is_red(p)) {
            var dir2 = ggp.right === gp;
            if (node === p.get_child(last)) {
              ggp.set_child(dir2, single_rotate(gp, !last));
            } else {
              ggp.set_child(dir2, double_rotate(gp, !last));
            }
          }
          var cmp = this._comparator(node.data, data);
          if (cmp === 0) {
            break;
          }
          last = dir;
          dir = cmp < 0;
          if (gp !== null) {
            ggp = gp;
          }
          gp = p;
          p = node;
          node = node.get_child(dir);
        }
        this._root = head.right;
      }
      this._root.red = false;
      return ret2;
    };
    RBTree.prototype.remove = function(data) {
      if (this._root === null) {
        return false;
      }
      var head = new Node(void 0);
      var node = head;
      node.right = this._root;
      var p = null;
      var gp = null;
      var found = null;
      var dir = 1;
      while (node.get_child(dir) !== null) {
        var last = dir;
        gp = p;
        p = node;
        node = node.get_child(dir);
        var cmp = this._comparator(data, node.data);
        dir = cmp > 0;
        if (cmp === 0) {
          found = node;
        }
        if (!is_red(node) && !is_red(node.get_child(dir))) {
          if (is_red(node.get_child(!dir))) {
            var sr = single_rotate(node, dir);
            p.set_child(last, sr);
            p = sr;
          } else if (!is_red(node.get_child(!dir))) {
            var sibling = p.get_child(!last);
            if (sibling !== null) {
              if (!is_red(sibling.get_child(!last)) && !is_red(sibling.get_child(last))) {
                p.red = false;
                sibling.red = true;
                node.red = true;
              } else {
                var dir2 = gp.right === p;
                if (is_red(sibling.get_child(last))) {
                  gp.set_child(dir2, double_rotate(p, last));
                } else if (is_red(sibling.get_child(!last))) {
                  gp.set_child(dir2, single_rotate(p, last));
                }
                var gpc = gp.get_child(dir2);
                gpc.red = true;
                node.red = true;
                gpc.left.red = false;
                gpc.right.red = false;
              }
            }
          }
        }
      }
      if (found !== null) {
        found.data = node.data;
        p.set_child(p.right === node, node.get_child(node.left === null));
        this.size--;
      }
      this._root = head.right;
      if (this._root !== null) {
        this._root.red = false;
      }
      return found !== null;
    };
    function is_red(node) {
      return node !== null && node.red;
    }
    function single_rotate(root, dir) {
      var save = root.get_child(!dir);
      root.set_child(!dir, save.get_child(dir));
      save.set_child(dir, root);
      root.red = true;
      save.red = false;
      return save;
    }
    function double_rotate(root, dir) {
      root.set_child(!dir, single_rotate(root.get_child(!dir), !dir));
      return single_rotate(root, dir);
    }
    module2.exports = RBTree;
  }
});

// node_modules/bintrees/lib/bintree.js
var require_bintree = __commonJS({
  "node_modules/bintrees/lib/bintree.js"(exports2, module2) {
    var TreeBase = require_treebase();
    function Node(data) {
      this.data = data;
      this.left = null;
      this.right = null;
    }
    Node.prototype.get_child = function(dir) {
      return dir ? this.right : this.left;
    };
    Node.prototype.set_child = function(dir, val) {
      if (dir) {
        this.right = val;
      } else {
        this.left = val;
      }
    };
    function BinTree(comparator) {
      this._root = null;
      this._comparator = comparator;
      this.size = 0;
    }
    BinTree.prototype = new TreeBase();
    BinTree.prototype.insert = function(data) {
      if (this._root === null) {
        this._root = new Node(data);
        this.size++;
        return true;
      }
      var dir = 0;
      var p = null;
      var node = this._root;
      while (true) {
        if (node === null) {
          node = new Node(data);
          p.set_child(dir, node);
          ret = true;
          this.size++;
          return true;
        }
        if (this._comparator(node.data, data) === 0) {
          return false;
        }
        dir = this._comparator(node.data, data) < 0;
        p = node;
        node = node.get_child(dir);
      }
    };
    BinTree.prototype.remove = function(data) {
      if (this._root === null) {
        return false;
      }
      var head = new Node(void 0);
      var node = head;
      node.right = this._root;
      var p = null;
      var found = null;
      var dir = 1;
      while (node.get_child(dir) !== null) {
        p = node;
        node = node.get_child(dir);
        var cmp = this._comparator(data, node.data);
        dir = cmp > 0;
        if (cmp === 0) {
          found = node;
        }
      }
      if (found !== null) {
        found.data = node.data;
        p.set_child(p.right === node, node.get_child(node.left === null));
        this._root = head.right;
        this.size--;
        return true;
      } else {
        return false;
      }
    };
    module2.exports = BinTree;
  }
});

// node_modules/bintrees/index.js
var require_bintrees = __commonJS({
  "node_modules/bintrees/index.js"(exports2, module2) {
    module2.exports = {
      RBTree: require_rbtree(),
      BinTree: require_bintree()
    };
  }
});

// node_modules/tdigest/tdigest.js
var require_tdigest = __commonJS({
  "node_modules/tdigest/tdigest.js"(exports2, module2) {
    var RBTree = require_bintrees().RBTree;
    function TDigest(delta, K, CX) {
      this.discrete = delta === false;
      this.delta = delta || 0.01;
      this.K = K === void 0 ? 25 : K;
      this.CX = CX === void 0 ? 1.1 : CX;
      this.centroids = new RBTree(compare_centroid_means);
      this.nreset = 0;
      this.reset();
    }
    TDigest.prototype.reset = function() {
      this.centroids.clear();
      this.n = 0;
      this.nreset += 1;
      this.last_cumulate = 0;
    };
    TDigest.prototype.size = function() {
      return this.centroids.size;
    };
    TDigest.prototype.toArray = function(everything) {
      var result = [];
      if (everything) {
        this._cumulate(true);
        this.centroids.each(function(c) {
          result.push(c);
        });
      } else {
        this.centroids.each(function(c) {
          result.push({ mean: c.mean, n: c.n });
        });
      }
      return result;
    };
    TDigest.prototype.summary = function() {
      var approx = this.discrete ? "exact " : "approximating ";
      var s = [
        approx + this.n + " samples using " + this.size() + " centroids",
        "min = " + this.percentile(0),
        "Q1  = " + this.percentile(0.25),
        "Q2  = " + this.percentile(0.5),
        "Q3  = " + this.percentile(0.75),
        "max = " + this.percentile(1)
      ];
      return s.join("\n");
    };
    function compare_centroid_means(a, b) {
      return a.mean > b.mean ? 1 : a.mean < b.mean ? -1 : 0;
    }
    function compare_centroid_mean_cumns(a, b) {
      return a.mean_cumn - b.mean_cumn;
    }
    TDigest.prototype.push = function(x, n) {
      n = n || 1;
      x = Array.isArray(x) ? x : [x];
      for (var i = 0; i < x.length; i++) {
        this._digest(x[i], n);
      }
    };
    TDigest.prototype.push_centroid = function(c) {
      c = Array.isArray(c) ? c : [c];
      for (var i = 0; i < c.length; i++) {
        this._digest(c[i].mean, c[i].n);
      }
    };
    TDigest.prototype._cumulate = function(exact) {
      if (this.n === this.last_cumulate || !exact && this.CX && this.CX > this.n / this.last_cumulate) {
        return;
      }
      var cumn = 0;
      this.centroids.each(function(c) {
        c.mean_cumn = cumn + c.n / 2;
        cumn = c.cumn = cumn + c.n;
      });
      this.n = this.last_cumulate = cumn;
    };
    TDigest.prototype.find_nearest = function(x) {
      if (this.size() === 0) {
        return null;
      }
      var iter = this.centroids.lowerBound({ mean: x });
      var c = iter.data() === null ? iter.prev() : iter.data();
      if (c.mean === x || this.discrete) {
        return c;
      }
      var prev = iter.prev();
      if (prev && Math.abs(prev.mean - x) < Math.abs(c.mean - x)) {
        return prev;
      } else {
        return c;
      }
    };
    TDigest.prototype._new_centroid = function(x, n, cumn) {
      var c = { mean: x, n, cumn };
      this.centroids.insert(c);
      this.n += n;
      return c;
    };
    TDigest.prototype._addweight = function(nearest, x, n) {
      if (x !== nearest.mean) {
        nearest.mean += n * (x - nearest.mean) / (nearest.n + n);
      }
      nearest.cumn += n;
      nearest.mean_cumn += n / 2;
      nearest.n += n;
      this.n += n;
    };
    TDigest.prototype._digest = function(x, n) {
      var min = this.centroids.min();
      var max = this.centroids.max();
      var nearest = this.find_nearest(x);
      if (nearest && nearest.mean === x) {
        this._addweight(nearest, x, n);
      } else if (nearest === min) {
        this._new_centroid(x, n, 0);
      } else if (nearest === max) {
        this._new_centroid(x, n, this.n);
      } else if (this.discrete) {
        this._new_centroid(x, n, nearest.cumn);
      } else {
        var p = nearest.mean_cumn / this.n;
        var max_n = Math.floor(4 * this.n * this.delta * p * (1 - p));
        if (max_n - nearest.n >= n) {
          this._addweight(nearest, x, n);
        } else {
          this._new_centroid(x, n, nearest.cumn);
        }
      }
      this._cumulate(false);
      if (!this.discrete && this.K && this.size() > this.K / this.delta) {
        this.compress();
      }
    };
    TDigest.prototype.bound_mean = function(x) {
      var iter = this.centroids.upperBound({ mean: x });
      var lower = iter.prev();
      var upper = lower.mean === x ? lower : iter.next();
      return [lower, upper];
    };
    TDigest.prototype.p_rank = function(x_or_xlist) {
      var xs = Array.isArray(x_or_xlist) ? x_or_xlist : [x_or_xlist];
      var ps = xs.map(this._p_rank, this);
      return Array.isArray(x_or_xlist) ? ps : ps[0];
    };
    TDigest.prototype._p_rank = function(x) {
      if (this.size() === 0) {
        return void 0;
      } else if (x < this.centroids.min().mean) {
        return 0;
      } else if (x > this.centroids.max().mean) {
        return 1;
      }
      this._cumulate(true);
      var bound = this.bound_mean(x);
      var lower = bound[0], upper = bound[1];
      if (this.discrete) {
        return lower.cumn / this.n;
      } else {
        var cumn = lower.mean_cumn;
        if (lower !== upper) {
          cumn += (x - lower.mean) * (upper.mean_cumn - lower.mean_cumn) / (upper.mean - lower.mean);
        }
        return cumn / this.n;
      }
    };
    TDigest.prototype.bound_mean_cumn = function(cumn) {
      this.centroids._comparator = compare_centroid_mean_cumns;
      var iter = this.centroids.upperBound({ mean_cumn: cumn });
      this.centroids._comparator = compare_centroid_means;
      var lower = iter.prev();
      var upper = lower && lower.mean_cumn === cumn ? lower : iter.next();
      return [lower, upper];
    };
    TDigest.prototype.percentile = function(p_or_plist) {
      var ps = Array.isArray(p_or_plist) ? p_or_plist : [p_or_plist];
      var qs = ps.map(this._percentile, this);
      return Array.isArray(p_or_plist) ? qs : qs[0];
    };
    TDigest.prototype._percentile = function(p) {
      if (this.size() === 0) {
        return void 0;
      }
      this._cumulate(true);
      var h = this.n * p;
      var bound = this.bound_mean_cumn(h);
      var lower = bound[0], upper = bound[1];
      if (upper === lower || lower === null || upper === null) {
        return (lower || upper).mean;
      } else if (!this.discrete) {
        return lower.mean + (h - lower.mean_cumn) * (upper.mean - lower.mean) / (upper.mean_cumn - lower.mean_cumn);
      } else if (h <= lower.cumn) {
        return lower.mean;
      } else {
        return upper.mean;
      }
    };
    function pop_random(choices) {
      var idx = Math.floor(Math.random() * choices.length);
      return choices.splice(idx, 1)[0];
    }
    TDigest.prototype.compress = function() {
      if (this.compressing) {
        return;
      }
      var points = this.toArray();
      this.reset();
      this.compressing = true;
      while (points.length > 0) {
        this.push_centroid(pop_random(points));
      }
      this._cumulate(true);
      this.compressing = false;
    };
    function Digest(config) {
      this.config = config || {};
      this.mode = this.config.mode || "auto";
      TDigest.call(this, this.mode === "cont" ? config.delta : false);
      this.digest_ratio = this.config.ratio || 0.9;
      this.digest_thresh = this.config.thresh || 1e3;
      this.n_unique = 0;
    }
    Digest.prototype = Object.create(TDigest.prototype);
    Digest.prototype.constructor = Digest;
    Digest.prototype.push = function(x_or_xlist) {
      TDigest.prototype.push.call(this, x_or_xlist);
      this.check_continuous();
    };
    Digest.prototype._new_centroid = function(x, n, cumn) {
      this.n_unique += 1;
      TDigest.prototype._new_centroid.call(this, x, n, cumn);
    };
    Digest.prototype._addweight = function(nearest, x, n) {
      if (nearest.n === 1) {
        this.n_unique -= 1;
      }
      TDigest.prototype._addweight.call(this, nearest, x, n);
    };
    Digest.prototype.check_continuous = function() {
      if (this.mode !== "auto" || this.size() < this.digest_thresh) {
        return false;
      }
      if (this.n_unique / this.size() > this.digest_ratio) {
        this.mode = "cont";
        this.discrete = false;
        this.delta = this.config.delta || 0.01;
        this.compress();
        return true;
      }
      return false;
    };
    module2.exports = {
      "TDigest": TDigest,
      "Digest": Digest
    };
  }
});

// node_modules/prom-client/lib/timeWindowQuantiles.js
var require_timeWindowQuantiles = __commonJS({
  "node_modules/prom-client/lib/timeWindowQuantiles.js"(exports2, module2) {
    "use strict";
    var { TDigest } = require_tdigest();
    var TimeWindowQuantiles = class {
      constructor(maxAgeSeconds, ageBuckets) {
        this.maxAgeSeconds = maxAgeSeconds || 0;
        this.ageBuckets = ageBuckets || 0;
        this.shouldRotate = maxAgeSeconds && ageBuckets;
        this.ringBuffer = Array(ageBuckets).fill(new TDigest());
        this.currentBuffer = 0;
        this.lastRotateTimestampMillis = Date.now();
        this.durationBetweenRotatesMillis = maxAgeSeconds * 1e3 / ageBuckets || Infinity;
      }
      size() {
        const bucket = rotate.call(this);
        return bucket.size();
      }
      percentile(quantile) {
        const bucket = rotate.call(this);
        return bucket.percentile(quantile);
      }
      push(value) {
        rotate.call(this);
        this.ringBuffer.forEach((bucket) => {
          bucket.push(value);
        });
      }
      reset() {
        this.ringBuffer.forEach((bucket) => {
          bucket.reset();
        });
      }
      compress() {
        this.ringBuffer.forEach((bucket) => {
          bucket.compress();
        });
      }
    };
    function rotate() {
      let timeSinceLastRotateMillis = Date.now() - this.lastRotateTimestampMillis;
      while (timeSinceLastRotateMillis > this.durationBetweenRotatesMillis && this.shouldRotate) {
        this.ringBuffer[this.currentBuffer] = new TDigest();
        if (++this.currentBuffer >= this.ringBuffer.length) {
          this.currentBuffer = 0;
        }
        timeSinceLastRotateMillis -= this.durationBetweenRotatesMillis;
        this.lastRotateTimestampMillis += this.durationBetweenRotatesMillis;
      }
      return this.ringBuffer[this.currentBuffer];
    }
    module2.exports = TimeWindowQuantiles;
  }
});

// node_modules/prom-client/lib/summary.js
var require_summary = __commonJS({
  "node_modules/prom-client/lib/summary.js"(exports2, module2) {
    "use strict";
    var util = require("util");
    var { getLabels, hashObject, removeLabels } = require_util();
    var { validateLabel } = require_validation();
    var { Metric } = require_metric();
    var timeWindowQuantiles = require_timeWindowQuantiles();
    var DEFAULT_COMPRESS_COUNT = 1e3;
    var Summary = class extends Metric {
      constructor(config) {
        super(config, {
          percentiles: [0.01, 0.05, 0.5, 0.9, 0.95, 0.99, 0.999],
          compressCount: DEFAULT_COMPRESS_COUNT,
          hashMap: {}
        });
        this.type = "summary";
        for (const label of this.labelNames) {
          if (label === "quantile")
            throw new Error("quantile is a reserved label keyword");
        }
        if (this.labelNames.length === 0) {
          this.hashMap = {
            [hashObject({})]: {
              labels: {},
              td: new timeWindowQuantiles(this.maxAgeSeconds, this.ageBuckets),
              count: 0,
              sum: 0
            }
          };
        }
      }
      /**
       * Observe a value
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @param {Number} value - Value to observe
       * @returns {void}
       */
      observe(labels, value) {
        observe.call(this, labels === 0 ? 0 : labels || {})(value);
      }
      async get() {
        if (this.collect) {
          const v = this.collect();
          if (v instanceof Promise) await v;
        }
        const hashKeys = Object.keys(this.hashMap);
        const values = [];
        hashKeys.forEach((hashKey) => {
          const s = this.hashMap[hashKey];
          if (s) {
            if (this.pruneAgedBuckets && s.td.size() === 0) {
              delete this.hashMap[hashKey];
            } else {
              extractSummariesForExport(s, this.percentiles).forEach((v) => {
                values.push(v);
              });
              values.push(getSumForExport(s, this));
              values.push(getCountForExport(s, this));
            }
          }
        });
        return {
          name: this.name,
          help: this.help,
          type: this.type,
          values,
          aggregator: this.aggregator
        };
      }
      reset() {
        const data = Object.values(this.hashMap);
        data.forEach((s) => {
          s.td.reset();
          s.count = 0;
          s.sum = 0;
        });
      }
      /**
       * Start a timer that could be used to logging durations
       * @param {object} labels - Object with labels where key is the label key and value is label value. Can only be one level deep
       * @returns {function} - Function to invoke when you want to stop the timer and observe the duration in seconds
       * @example
       * var end = summary.startTimer();
       * makeExpensiveXHRRequest(function(err, res) {
       *	end(); //Observe the duration of expensiveXHRRequest
       * });
       */
      startTimer(labels) {
        return startTimer.call(this, labels)();
      }
      labels(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        return {
          observe: observe.call(this, labels),
          startTimer: startTimer.call(this, labels)
        };
      }
      remove(...args) {
        const labels = getLabels(this.labelNames, args);
        validateLabel(this.labelNames, labels);
        removeLabels.call(this, this.hashMap, labels, this.sortedLabelNames);
      }
    };
    function extractSummariesForExport(summaryOfLabels, percentiles) {
      summaryOfLabels.td.compress();
      return percentiles.map((percentile) => {
        const percentileValue = summaryOfLabels.td.percentile(percentile);
        return {
          labels: Object.assign({ quantile: percentile }, summaryOfLabels.labels),
          value: percentileValue ? percentileValue : 0
        };
      });
    }
    function getCountForExport(value, summary) {
      return {
        metricName: `${summary.name}_count`,
        labels: value.labels,
        value: value.count
      };
    }
    function getSumForExport(value, summary) {
      return {
        metricName: `${summary.name}_sum`,
        labels: value.labels,
        value: value.sum
      };
    }
    function startTimer(startLabels) {
      return () => {
        const start = process.hrtime();
        return (endLabels) => {
          const delta = process.hrtime(start);
          const value = delta[0] + delta[1] / 1e9;
          this.observe(Object.assign({}, startLabels, endLabels), value);
          return value;
        };
      };
    }
    function observe(labels) {
      return (value) => {
        const labelValuePair = convertLabelsAndValues(labels, value);
        validateLabel(this.labelNames, labels);
        if (!Number.isFinite(labelValuePair.value)) {
          throw new TypeError(
            `Value is not a valid number: ${util.format(labelValuePair.value)}`
          );
        }
        const hash = hashObject(labelValuePair.labels, this.sortedLabelNames);
        let summaryOfLabel = this.hashMap[hash];
        if (!summaryOfLabel) {
          summaryOfLabel = {
            labels: labelValuePair.labels,
            td: new timeWindowQuantiles(this.maxAgeSeconds, this.ageBuckets),
            count: 0,
            sum: 0
          };
        }
        summaryOfLabel.td.push(labelValuePair.value);
        summaryOfLabel.count++;
        if (summaryOfLabel.count % this.compressCount === 0) {
          summaryOfLabel.td.compress();
        }
        summaryOfLabel.sum += labelValuePair.value;
        this.hashMap[hash] = summaryOfLabel;
      };
    }
    function convertLabelsAndValues(labels, value) {
      if (value === void 0) {
        return {
          value: labels,
          labels: {}
        };
      }
      return {
        labels,
        value
      };
    }
    module2.exports = Summary;
  }
});

// node_modules/prom-client/lib/pushgateway.js
var require_pushgateway = __commonJS({
  "node_modules/prom-client/lib/pushgateway.js"(exports2, module2) {
    "use strict";
    var url = require("url");
    var http = require("http");
    var https = require("https");
    var { gzipSync } = require("zlib");
    var { globalRegistry } = require_registry();
    var Pushgateway = class {
      constructor(gatewayUrl, options, registry) {
        if (!registry) {
          registry = globalRegistry;
        }
        this.registry = registry;
        this.gatewayUrl = gatewayUrl;
        const { requireJobName, ...requestOptions } = {
          requireJobName: true,
          ...options
        };
        this.requireJobName = requireJobName;
        this.requestOptions = requestOptions;
      }
      pushAdd(params = {}) {
        if (this.requireJobName && !params.jobName) {
          throw new Error("Missing jobName parameter");
        }
        return useGateway.call(this, "POST", params.jobName, params.groupings);
      }
      push(params = {}) {
        if (this.requireJobName && !params.jobName) {
          throw new Error("Missing jobName parameter");
        }
        return useGateway.call(this, "PUT", params.jobName, params.groupings);
      }
      delete(params = {}) {
        if (this.requireJobName && !params.jobName) {
          throw new Error("Missing jobName parameter");
        }
        return useGateway.call(this, "DELETE", params.jobName, params.groupings);
      }
    };
    async function useGateway(method, job, groupings) {
      const gatewayUrlParsed = url.parse(this.gatewayUrl);
      const gatewayUrlPath = gatewayUrlParsed.pathname && gatewayUrlParsed.pathname !== "/" ? gatewayUrlParsed.pathname : "";
      const jobPath = job ? `/job/${encodeURIComponent(job)}${generateGroupings(groupings)}` : "";
      const path4 = `${gatewayUrlPath}/metrics${jobPath}`;
      const target = url.resolve(this.gatewayUrl, path4);
      const requestParams = url.parse(target);
      const httpModule = isHttps(requestParams.href) ? https : http;
      const options = Object.assign(requestParams, this.requestOptions, {
        method
      });
      return new Promise((resolve, reject) => {
        if (method === "DELETE" && options.headers) {
          delete options.headers["Content-Encoding"];
        }
        const req = httpModule.request(options, (resp) => {
          let body = "";
          resp.setEncoding("utf8");
          resp.on("data", (chunk) => {
            body += chunk;
          });
          resp.on("end", () => {
            if (resp.statusCode >= 400) {
              reject(
                new Error(`push failed with status ${resp.statusCode}, ${body}`)
              );
            } else {
              resolve({ resp, body });
            }
          });
        });
        req.on("error", (err) => {
          reject(err);
        });
        req.on("timeout", () => {
          req.destroy(new Error("Pushgateway request timed out"));
        });
        if (method !== "DELETE") {
          this.registry.metrics().then((metrics2) => {
            if (options.headers && options.headers["Content-Encoding"] === "gzip") {
              metrics2 = gzipSync(metrics2);
            }
            req.write(metrics2);
            req.end();
          }).catch((err) => {
            reject(err);
          });
        } else {
          req.end();
        }
      });
    }
    function generateGroupings(groupings) {
      if (!groupings) {
        return "";
      }
      return Object.keys(groupings).map(
        (key) => `/${encodeURIComponent(key)}/${encodeURIComponent(groupings[key])}`
      ).join("");
    }
    function isHttps(href) {
      return href.search(/^https/) !== -1;
    }
    module2.exports = Pushgateway;
  }
});

// node_modules/prom-client/lib/bucketGenerators.js
var require_bucketGenerators = __commonJS({
  "node_modules/prom-client/lib/bucketGenerators.js"(exports2) {
    "use strict";
    exports2.linearBuckets = (start, width, count) => {
      if (count < 1) {
        throw new Error("Linear buckets needs a positive count");
      }
      const buckets = new Array(count);
      for (let i = 0; i < count; i++) {
        buckets[i] = start + i * width;
      }
      return buckets;
    };
    exports2.exponentialBuckets = (start, factor, count) => {
      if (start <= 0) {
        throw new Error("Exponential buckets needs a positive start");
      }
      if (count < 1) {
        throw new Error("Exponential buckets needs a positive count");
      }
      if (factor <= 1) {
        throw new Error("Exponential buckets needs a factor greater than 1");
      }
      const buckets = new Array(count);
      for (let i = 0; i < count; i++) {
        buckets[i] = start;
        start *= factor;
      }
      return buckets;
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js
var _globalThis;
var init_globalThis = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/node/globalThis.js"() {
    _globalThis = typeof globalThis === "object" ? globalThis : global;
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/node/index.js
var init_node = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/node/index.js"() {
    init_globalThis();
  }
});

// node_modules/@opentelemetry/api/build/esm/platform/index.js
var init_platform = __esm({
  "node_modules/@opentelemetry/api/build/esm/platform/index.js"() {
    init_node();
  }
});

// node_modules/@opentelemetry/api/build/esm/version.js
var VERSION;
var init_version = __esm({
  "node_modules/@opentelemetry/api/build/esm/version.js"() {
    VERSION = "1.9.0";
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/semver.js
function _makeCompatibilityCheck(ownVersion) {
  var acceptedVersions = /* @__PURE__ */ new Set([ownVersion]);
  var rejectedVersions = /* @__PURE__ */ new Set();
  var myVersionMatch = ownVersion.match(re);
  if (!myVersionMatch) {
    return function() {
      return false;
    };
  }
  var ownVersionParsed = {
    major: +myVersionMatch[1],
    minor: +myVersionMatch[2],
    patch: +myVersionMatch[3],
    prerelease: myVersionMatch[4]
  };
  if (ownVersionParsed.prerelease != null) {
    return function isExactmatch(globalVersion) {
      return globalVersion === ownVersion;
    };
  }
  function _reject(v) {
    rejectedVersions.add(v);
    return false;
  }
  function _accept(v) {
    acceptedVersions.add(v);
    return true;
  }
  return function isCompatible2(globalVersion) {
    if (acceptedVersions.has(globalVersion)) {
      return true;
    }
    if (rejectedVersions.has(globalVersion)) {
      return false;
    }
    var globalVersionMatch = globalVersion.match(re);
    if (!globalVersionMatch) {
      return _reject(globalVersion);
    }
    var globalVersionParsed = {
      major: +globalVersionMatch[1],
      minor: +globalVersionMatch[2],
      patch: +globalVersionMatch[3],
      prerelease: globalVersionMatch[4]
    };
    if (globalVersionParsed.prerelease != null) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major !== globalVersionParsed.major) {
      return _reject(globalVersion);
    }
    if (ownVersionParsed.major === 0) {
      if (ownVersionParsed.minor === globalVersionParsed.minor && ownVersionParsed.patch <= globalVersionParsed.patch) {
        return _accept(globalVersion);
      }
      return _reject(globalVersion);
    }
    if (ownVersionParsed.minor <= globalVersionParsed.minor) {
      return _accept(globalVersion);
    }
    return _reject(globalVersion);
  };
}
var re, isCompatible;
var init_semver = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/semver.js"() {
    init_version();
    re = /^(\d+)\.(\d+)\.(\d+)(-(.+))?$/;
    isCompatible = _makeCompatibilityCheck(VERSION);
  }
});

// node_modules/@opentelemetry/api/build/esm/internal/global-utils.js
function registerGlobal(type, instance, diag3, allowOverride) {
  var _a;
  if (allowOverride === void 0) {
    allowOverride = false;
  }
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY] = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) !== null && _a !== void 0 ? _a : {
    version: VERSION
  };
  if (!allowOverride && api[type]) {
    var err = new Error("@opentelemetry/api: Attempted duplicate registration of API: " + type);
    diag3.error(err.stack || err.message);
    return false;
  }
  if (api.version !== VERSION) {
    var err = new Error("@opentelemetry/api: Registration of version v" + api.version + " for " + type + " does not match previously registered API v" + VERSION);
    diag3.error(err.stack || err.message);
    return false;
  }
  api[type] = instance;
  diag3.debug("@opentelemetry/api: Registered a global for " + type + " v" + VERSION + ".");
  return true;
}
function getGlobal(type) {
  var _a, _b;
  var globalVersion = (_a = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _a === void 0 ? void 0 : _a.version;
  if (!globalVersion || !isCompatible(globalVersion)) {
    return;
  }
  return (_b = _global[GLOBAL_OPENTELEMETRY_API_KEY]) === null || _b === void 0 ? void 0 : _b[type];
}
function unregisterGlobal(type, diag3) {
  diag3.debug("@opentelemetry/api: Unregistering a global for " + type + " v" + VERSION + ".");
  var api = _global[GLOBAL_OPENTELEMETRY_API_KEY];
  if (api) {
    delete api[type];
  }
}
var major, GLOBAL_OPENTELEMETRY_API_KEY, _global;
var init_global_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/internal/global-utils.js"() {
    init_platform();
    init_version();
    init_semver();
    major = VERSION.split(".")[0];
    GLOBAL_OPENTELEMETRY_API_KEY = Symbol.for("opentelemetry.js.api." + major);
    _global = _globalThis;
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js
function logProxy(funcName, namespace, args) {
  var logger2 = getGlobal("diag");
  if (!logger2) {
    return;
  }
  args.unshift(namespace);
  return logger2[funcName].apply(logger2, __spreadArray([], __read(args), false));
}
var __read, __spreadArray, DiagComponentLogger;
var init_ComponentLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/ComponentLogger.js"() {
    init_global_utils();
    __read = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    DiagComponentLogger = /** @class */
    (function() {
      function DiagComponentLogger2(props) {
        this._namespace = props.namespace || "DiagComponentLogger";
      }
      DiagComponentLogger2.prototype.debug = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("debug", this._namespace, args);
      };
      DiagComponentLogger2.prototype.error = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("error", this._namespace, args);
      };
      DiagComponentLogger2.prototype.info = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("info", this._namespace, args);
      };
      DiagComponentLogger2.prototype.warn = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("warn", this._namespace, args);
      };
      DiagComponentLogger2.prototype.verbose = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return logProxy("verbose", this._namespace, args);
      };
      return DiagComponentLogger2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/types.js
var DiagLogLevel;
var init_types = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/types.js"() {
    (function(DiagLogLevel2) {
      DiagLogLevel2[DiagLogLevel2["NONE"] = 0] = "NONE";
      DiagLogLevel2[DiagLogLevel2["ERROR"] = 30] = "ERROR";
      DiagLogLevel2[DiagLogLevel2["WARN"] = 50] = "WARN";
      DiagLogLevel2[DiagLogLevel2["INFO"] = 60] = "INFO";
      DiagLogLevel2[DiagLogLevel2["DEBUG"] = 70] = "DEBUG";
      DiagLogLevel2[DiagLogLevel2["VERBOSE"] = 80] = "VERBOSE";
      DiagLogLevel2[DiagLogLevel2["ALL"] = 9999] = "ALL";
    })(DiagLogLevel || (DiagLogLevel = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js
function createLogLevelDiagLogger(maxLevel, logger2) {
  if (maxLevel < DiagLogLevel.NONE) {
    maxLevel = DiagLogLevel.NONE;
  } else if (maxLevel > DiagLogLevel.ALL) {
    maxLevel = DiagLogLevel.ALL;
  }
  logger2 = logger2 || {};
  function _filterFunc(funcName, theLevel) {
    var theFunc = logger2[funcName];
    if (typeof theFunc === "function" && maxLevel >= theLevel) {
      return theFunc.bind(logger2);
    }
    return function() {
    };
  }
  return {
    error: _filterFunc("error", DiagLogLevel.ERROR),
    warn: _filterFunc("warn", DiagLogLevel.WARN),
    info: _filterFunc("info", DiagLogLevel.INFO),
    debug: _filterFunc("debug", DiagLogLevel.DEBUG),
    verbose: _filterFunc("verbose", DiagLogLevel.VERBOSE)
  };
}
var init_logLevelLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/internal/logLevelLogger.js"() {
    init_types();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/diag.js
var __read2, __spreadArray2, API_NAME, DiagAPI;
var init_diag = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/diag.js"() {
    init_ComponentLogger();
    init_logLevelLogger();
    init_types();
    init_global_utils();
    __read2 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray2 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME = "diag";
    DiagAPI = /** @class */
    (function() {
      function DiagAPI2() {
        function _logProxy(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            var logger2 = getGlobal("diag");
            if (!logger2)
              return;
            return logger2[funcName].apply(logger2, __spreadArray2([], __read2(args), false));
          };
        }
        var self = this;
        var setLogger = function(logger2, optionsOrLogLevel) {
          var _a, _b, _c;
          if (optionsOrLogLevel === void 0) {
            optionsOrLogLevel = { logLevel: DiagLogLevel.INFO };
          }
          if (logger2 === self) {
            var err = new Error("Cannot use diag as the logger for itself. Please use a DiagLogger implementation like ConsoleDiagLogger or a custom implementation");
            self.error((_a = err.stack) !== null && _a !== void 0 ? _a : err.message);
            return false;
          }
          if (typeof optionsOrLogLevel === "number") {
            optionsOrLogLevel = {
              logLevel: optionsOrLogLevel
            };
          }
          var oldLogger = getGlobal("diag");
          var newLogger = createLogLevelDiagLogger((_b = optionsOrLogLevel.logLevel) !== null && _b !== void 0 ? _b : DiagLogLevel.INFO, logger2);
          if (oldLogger && !optionsOrLogLevel.suppressOverrideMessage) {
            var stack = (_c = new Error().stack) !== null && _c !== void 0 ? _c : "<failed to generate stacktrace>";
            oldLogger.warn("Current logger will be overwritten from " + stack);
            newLogger.warn("Current logger will overwrite one already registered from " + stack);
          }
          return registerGlobal("diag", newLogger, self, true);
        };
        self.setLogger = setLogger;
        self.disable = function() {
          unregisterGlobal(API_NAME, self);
        };
        self.createComponentLogger = function(options) {
          return new DiagComponentLogger(options);
        };
        self.verbose = _logProxy("verbose");
        self.debug = _logProxy("debug");
        self.info = _logProxy("info");
        self.warn = _logProxy("warn");
        self.error = _logProxy("error");
      }
      DiagAPI2.instance = function() {
        if (!this._instance) {
          this._instance = new DiagAPI2();
        }
        return this._instance;
      };
      return DiagAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js
var __read3, __values, BaggageImpl;
var init_baggage_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/baggage-impl.js"() {
    __read3 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __values = function(o) {
      var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function() {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    };
    BaggageImpl = /** @class */
    (function() {
      function BaggageImpl2(entries) {
        this._entries = entries ? new Map(entries) : /* @__PURE__ */ new Map();
      }
      BaggageImpl2.prototype.getEntry = function(key) {
        var entry = this._entries.get(key);
        if (!entry) {
          return void 0;
        }
        return Object.assign({}, entry);
      };
      BaggageImpl2.prototype.getAllEntries = function() {
        return Array.from(this._entries.entries()).map(function(_a) {
          var _b = __read3(_a, 2), k = _b[0], v = _b[1];
          return [k, v];
        });
      };
      BaggageImpl2.prototype.setEntry = function(key, entry) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.set(key, entry);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntry = function(key) {
        var newBaggage = new BaggageImpl2(this._entries);
        newBaggage._entries.delete(key);
        return newBaggage;
      };
      BaggageImpl2.prototype.removeEntries = function() {
        var e_1, _a;
        var keys = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          keys[_i] = arguments[_i];
        }
        var newBaggage = new BaggageImpl2(this._entries);
        try {
          for (var keys_1 = __values(keys), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
            var key = keys_1_1.value;
            newBaggage._entries.delete(key);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (keys_1_1 && !keys_1_1.done && (_a = keys_1.return)) _a.call(keys_1);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
        return newBaggage;
      };
      BaggageImpl2.prototype.clear = function() {
        return new BaggageImpl2();
      };
      return BaggageImpl2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js
var baggageEntryMetadataSymbol;
var init_symbol = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/internal/symbol.js"() {
    baggageEntryMetadataSymbol = Symbol("BaggageEntryMetadata");
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/utils.js
function createBaggage(entries) {
  if (entries === void 0) {
    entries = {};
  }
  return new BaggageImpl(new Map(Object.entries(entries)));
}
function baggageEntryMetadataFromString(str) {
  if (typeof str !== "string") {
    diag.error("Cannot create baggage metadata from unknown type: " + typeof str);
    str = "";
  }
  return {
    __TYPE__: baggageEntryMetadataSymbol,
    toString: function() {
      return str;
    }
  };
}
var diag;
var init_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/utils.js"() {
    init_diag();
    init_baggage_impl();
    init_symbol();
    diag = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/context/context.js
function createContextKey(description) {
  return Symbol.for(description);
}
var BaseContext, ROOT_CONTEXT;
var init_context = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/context.js"() {
    BaseContext = /** @class */
    /* @__PURE__ */ (function() {
      function BaseContext2(parentContext) {
        var self = this;
        self._currentContext = parentContext ? new Map(parentContext) : /* @__PURE__ */ new Map();
        self.getValue = function(key) {
          return self._currentContext.get(key);
        };
        self.setValue = function(key, value) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.set(key, value);
          return context2;
        };
        self.deleteValue = function(key) {
          var context2 = new BaseContext2(self._currentContext);
          context2._currentContext.delete(key);
          return context2;
        };
      }
      return BaseContext2;
    })();
    ROOT_CONTEXT = new BaseContext();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js
var consoleMap, DiagConsoleLogger;
var init_consoleLogger = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag/consoleLogger.js"() {
    consoleMap = [
      { n: "error", c: "error" },
      { n: "warn", c: "warn" },
      { n: "info", c: "info" },
      { n: "debug", c: "debug" },
      { n: "verbose", c: "trace" }
    ];
    DiagConsoleLogger = /** @class */
    /* @__PURE__ */ (function() {
      function DiagConsoleLogger2() {
        function _consoleFunc(funcName) {
          return function() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
            }
            if (console) {
              var theFunc = console[funcName];
              if (typeof theFunc !== "function") {
                theFunc = console.log;
              }
              if (typeof theFunc === "function") {
                return theFunc.apply(console, args);
              }
            }
          };
        }
        for (var i = 0; i < consoleMap.length; i++) {
          this[consoleMap[i].n] = _consoleFunc(consoleMap[i].c);
        }
      }
      return DiagConsoleLogger2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js
function createNoopMeter() {
  return NOOP_METER;
}
var __extends, NoopMeter, NoopMetric, NoopCounterMetric, NoopUpDownCounterMetric, NoopGaugeMetric, NoopHistogramMetric, NoopObservableMetric, NoopObservableCounterMetric, NoopObservableGaugeMetric, NoopObservableUpDownCounterMetric, NOOP_METER, NOOP_COUNTER_METRIC, NOOP_GAUGE_METRIC, NOOP_HISTOGRAM_METRIC, NOOP_UP_DOWN_COUNTER_METRIC, NOOP_OBSERVABLE_COUNTER_METRIC, NOOP_OBSERVABLE_GAUGE_METRIC, NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
var init_NoopMeter = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeter.js"() {
    __extends = /* @__PURE__ */ (function() {
      var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
          d2.__proto__ = b2;
        } || function(d2, b2) {
          for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
        };
        return extendStatics(d, b);
      };
      return function(d, b) {
        if (typeof b !== "function" && b !== null)
          throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() {
          this.constructor = d;
        }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
      };
    })();
    NoopMeter = /** @class */
    (function() {
      function NoopMeter2() {
      }
      NoopMeter2.prototype.createGauge = function(_name, _options) {
        return NOOP_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createHistogram = function(_name, _options) {
        return NOOP_HISTOGRAM_METRIC;
      };
      NoopMeter2.prototype.createCounter = function(_name, _options) {
        return NOOP_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createUpDownCounter = function(_name, _options) {
        return NOOP_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableGauge = function(_name, _options) {
        return NOOP_OBSERVABLE_GAUGE_METRIC;
      };
      NoopMeter2.prototype.createObservableCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_COUNTER_METRIC;
      };
      NoopMeter2.prototype.createObservableUpDownCounter = function(_name, _options) {
        return NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC;
      };
      NoopMeter2.prototype.addBatchObservableCallback = function(_callback, _observables) {
      };
      NoopMeter2.prototype.removeBatchObservableCallback = function(_callback) {
      };
      return NoopMeter2;
    })();
    NoopMetric = /** @class */
    /* @__PURE__ */ (function() {
      function NoopMetric2() {
      }
      return NoopMetric2;
    })();
    NoopCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopCounterMetric2, _super);
      function NoopCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopCounterMetric2;
    })(NoopMetric);
    NoopUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopUpDownCounterMetric2, _super);
      function NoopUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopUpDownCounterMetric2.prototype.add = function(_value, _attributes) {
      };
      return NoopUpDownCounterMetric2;
    })(NoopMetric);
    NoopGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopGaugeMetric2, _super);
      function NoopGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopGaugeMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopGaugeMetric2;
    })(NoopMetric);
    NoopHistogramMetric = /** @class */
    (function(_super) {
      __extends(NoopHistogramMetric2, _super);
      function NoopHistogramMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      NoopHistogramMetric2.prototype.record = function(_value, _attributes) {
      };
      return NoopHistogramMetric2;
    })(NoopMetric);
    NoopObservableMetric = /** @class */
    (function() {
      function NoopObservableMetric2() {
      }
      NoopObservableMetric2.prototype.addCallback = function(_callback) {
      };
      NoopObservableMetric2.prototype.removeCallback = function(_callback) {
      };
      return NoopObservableMetric2;
    })();
    NoopObservableCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableCounterMetric2, _super);
      function NoopObservableCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableCounterMetric2;
    })(NoopObservableMetric);
    NoopObservableGaugeMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableGaugeMetric2, _super);
      function NoopObservableGaugeMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableGaugeMetric2;
    })(NoopObservableMetric);
    NoopObservableUpDownCounterMetric = /** @class */
    (function(_super) {
      __extends(NoopObservableUpDownCounterMetric2, _super);
      function NoopObservableUpDownCounterMetric2() {
        return _super !== null && _super.apply(this, arguments) || this;
      }
      return NoopObservableUpDownCounterMetric2;
    })(NoopObservableMetric);
    NOOP_METER = new NoopMeter();
    NOOP_COUNTER_METRIC = new NoopCounterMetric();
    NOOP_GAUGE_METRIC = new NoopGaugeMetric();
    NOOP_HISTOGRAM_METRIC = new NoopHistogramMetric();
    NOOP_UP_DOWN_COUNTER_METRIC = new NoopUpDownCounterMetric();
    NOOP_OBSERVABLE_COUNTER_METRIC = new NoopObservableCounterMetric();
    NOOP_OBSERVABLE_GAUGE_METRIC = new NoopObservableGaugeMetric();
    NOOP_OBSERVABLE_UP_DOWN_COUNTER_METRIC = new NoopObservableUpDownCounterMetric();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/Metric.js
var ValueType;
var init_Metric = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/Metric.js"() {
    (function(ValueType2) {
      ValueType2[ValueType2["INT"] = 0] = "INT";
      ValueType2[ValueType2["DOUBLE"] = 1] = "DOUBLE";
    })(ValueType || (ValueType = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js
var defaultTextMapGetter, defaultTextMapSetter;
var init_TextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/TextMapPropagator.js"() {
    defaultTextMapGetter = {
      get: function(carrier, key) {
        if (carrier == null) {
          return void 0;
        }
        return carrier[key];
      },
      keys: function(carrier) {
        if (carrier == null) {
          return [];
        }
        return Object.keys(carrier);
      }
    };
    defaultTextMapSetter = {
      set: function(carrier, key, value) {
        if (carrier == null) {
          return;
        }
        carrier[key] = value;
      }
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js
var __read4, __spreadArray3, NoopContextManager;
var init_NoopContextManager = __esm({
  "node_modules/@opentelemetry/api/build/esm/context/NoopContextManager.js"() {
    init_context();
    __read4 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray3 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    NoopContextManager = /** @class */
    (function() {
      function NoopContextManager2() {
      }
      NoopContextManager2.prototype.active = function() {
        return ROOT_CONTEXT;
      };
      NoopContextManager2.prototype.with = function(_context, fn, thisArg) {
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return fn.call.apply(fn, __spreadArray3([thisArg], __read4(args), false));
      };
      NoopContextManager2.prototype.bind = function(_context, target) {
        return target;
      };
      NoopContextManager2.prototype.enable = function() {
        return this;
      };
      NoopContextManager2.prototype.disable = function() {
        return this;
      };
      return NoopContextManager2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/context.js
var __read5, __spreadArray4, API_NAME2, NOOP_CONTEXT_MANAGER, ContextAPI;
var init_context2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/context.js"() {
    init_NoopContextManager();
    init_global_utils();
    init_diag();
    __read5 = function(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o), r, ar = [], e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = { error };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    };
    __spreadArray4 = function(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    };
    API_NAME2 = "context";
    NOOP_CONTEXT_MANAGER = new NoopContextManager();
    ContextAPI = /** @class */
    (function() {
      function ContextAPI2() {
      }
      ContextAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new ContextAPI2();
        }
        return this._instance;
      };
      ContextAPI2.prototype.setGlobalContextManager = function(contextManager) {
        return registerGlobal(API_NAME2, contextManager, DiagAPI.instance());
      };
      ContextAPI2.prototype.active = function() {
        return this._getContextManager().active();
      };
      ContextAPI2.prototype.with = function(context2, fn, thisArg) {
        var _a;
        var args = [];
        for (var _i = 3; _i < arguments.length; _i++) {
          args[_i - 3] = arguments[_i];
        }
        return (_a = this._getContextManager()).with.apply(_a, __spreadArray4([context2, fn, thisArg], __read5(args), false));
      };
      ContextAPI2.prototype.bind = function(context2, target) {
        return this._getContextManager().bind(context2, target);
      };
      ContextAPI2.prototype._getContextManager = function() {
        return getGlobal(API_NAME2) || NOOP_CONTEXT_MANAGER;
      };
      ContextAPI2.prototype.disable = function() {
        this._getContextManager().disable();
        unregisterGlobal(API_NAME2, DiagAPI.instance());
      };
      return ContextAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js
var TraceFlags;
var init_trace_flags = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/trace_flags.js"() {
    (function(TraceFlags2) {
      TraceFlags2[TraceFlags2["NONE"] = 0] = "NONE";
      TraceFlags2[TraceFlags2["SAMPLED"] = 1] = "SAMPLED";
    })(TraceFlags || (TraceFlags = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js
var INVALID_SPANID, INVALID_TRACEID, INVALID_SPAN_CONTEXT;
var init_invalid_span_constants = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/invalid-span-constants.js"() {
    init_trace_flags();
    INVALID_SPANID = "0000000000000000";
    INVALID_TRACEID = "00000000000000000000000000000000";
    INVALID_SPAN_CONTEXT = {
      traceId: INVALID_TRACEID,
      spanId: INVALID_SPANID,
      traceFlags: TraceFlags.NONE
    };
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js
var NonRecordingSpan;
var init_NonRecordingSpan = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NonRecordingSpan.js"() {
    init_invalid_span_constants();
    NonRecordingSpan = /** @class */
    (function() {
      function NonRecordingSpan2(_spanContext) {
        if (_spanContext === void 0) {
          _spanContext = INVALID_SPAN_CONTEXT;
        }
        this._spanContext = _spanContext;
      }
      NonRecordingSpan2.prototype.spanContext = function() {
        return this._spanContext;
      };
      NonRecordingSpan2.prototype.setAttribute = function(_key, _value) {
        return this;
      };
      NonRecordingSpan2.prototype.setAttributes = function(_attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addEvent = function(_name, _attributes) {
        return this;
      };
      NonRecordingSpan2.prototype.addLink = function(_link) {
        return this;
      };
      NonRecordingSpan2.prototype.addLinks = function(_links) {
        return this;
      };
      NonRecordingSpan2.prototype.setStatus = function(_status) {
        return this;
      };
      NonRecordingSpan2.prototype.updateName = function(_name) {
        return this;
      };
      NonRecordingSpan2.prototype.end = function(_endTime) {
      };
      NonRecordingSpan2.prototype.isRecording = function() {
        return false;
      };
      NonRecordingSpan2.prototype.recordException = function(_exception, _time) {
      };
      return NonRecordingSpan2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/context-utils.js
function getSpan(context2) {
  return context2.getValue(SPAN_KEY) || void 0;
}
function getActiveSpan() {
  return getSpan(ContextAPI.getInstance().active());
}
function setSpan(context2, span) {
  return context2.setValue(SPAN_KEY, span);
}
function deleteSpan(context2) {
  return context2.deleteValue(SPAN_KEY);
}
function setSpanContext(context2, spanContext) {
  return setSpan(context2, new NonRecordingSpan(spanContext));
}
function getSpanContext(context2) {
  var _a;
  return (_a = getSpan(context2)) === null || _a === void 0 ? void 0 : _a.spanContext();
}
var SPAN_KEY;
var init_context_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/context-utils.js"() {
    init_context();
    init_NonRecordingSpan();
    init_context2();
    SPAN_KEY = createContextKey("OpenTelemetry Context Key SPAN");
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js
function isValidTraceId(traceId) {
  return VALID_TRACEID_REGEX.test(traceId) && traceId !== INVALID_TRACEID;
}
function isValidSpanId(spanId) {
  return VALID_SPANID_REGEX.test(spanId) && spanId !== INVALID_SPANID;
}
function isSpanContextValid(spanContext) {
  return isValidTraceId(spanContext.traceId) && isValidSpanId(spanContext.spanId);
}
function wrapSpanContext(spanContext) {
  return new NonRecordingSpan(spanContext);
}
var VALID_TRACEID_REGEX, VALID_SPANID_REGEX;
var init_spancontext_utils = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/spancontext-utils.js"() {
    init_invalid_span_constants();
    init_NonRecordingSpan();
    VALID_TRACEID_REGEX = /^([0-9a-f]{32})$/i;
    VALID_SPANID_REGEX = /^[0-9a-f]{16}$/i;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js
function isSpanContext(spanContext) {
  return typeof spanContext === "object" && typeof spanContext["spanId"] === "string" && typeof spanContext["traceId"] === "string" && typeof spanContext["traceFlags"] === "number";
}
var contextApi, NoopTracer;
var init_NoopTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracer.js"() {
    init_context2();
    init_context_utils();
    init_NonRecordingSpan();
    init_spancontext_utils();
    contextApi = ContextAPI.getInstance();
    NoopTracer = /** @class */
    (function() {
      function NoopTracer2() {
      }
      NoopTracer2.prototype.startSpan = function(name, options, context2) {
        if (context2 === void 0) {
          context2 = contextApi.active();
        }
        var root = Boolean(options === null || options === void 0 ? void 0 : options.root);
        if (root) {
          return new NonRecordingSpan();
        }
        var parentFromContext = context2 && getSpanContext(context2);
        if (isSpanContext(parentFromContext) && isSpanContextValid(parentFromContext)) {
          return new NonRecordingSpan(parentFromContext);
        } else {
          return new NonRecordingSpan();
        }
      };
      NoopTracer2.prototype.startActiveSpan = function(name, arg2, arg3, arg4) {
        var opts;
        var ctx;
        var fn;
        if (arguments.length < 2) {
          return;
        } else if (arguments.length === 2) {
          fn = arg2;
        } else if (arguments.length === 3) {
          opts = arg2;
          fn = arg3;
        } else {
          opts = arg2;
          ctx = arg3;
          fn = arg4;
        }
        var parentContext = ctx !== null && ctx !== void 0 ? ctx : contextApi.active();
        var span = this.startSpan(name, opts, parentContext);
        var contextWithSpanSet = setSpan(parentContext, span);
        return contextApi.with(contextWithSpanSet, fn, void 0, span);
      };
      return NoopTracer2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js
var NOOP_TRACER, ProxyTracer;
var init_ProxyTracer = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracer.js"() {
    init_NoopTracer();
    NOOP_TRACER = new NoopTracer();
    ProxyTracer = /** @class */
    (function() {
      function ProxyTracer2(_provider, name, version, options) {
        this._provider = _provider;
        this.name = name;
        this.version = version;
        this.options = options;
      }
      ProxyTracer2.prototype.startSpan = function(name, options, context2) {
        return this._getTracer().startSpan(name, options, context2);
      };
      ProxyTracer2.prototype.startActiveSpan = function(_name, _options, _context, _fn) {
        var tracer = this._getTracer();
        return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
      };
      ProxyTracer2.prototype._getTracer = function() {
        if (this._delegate) {
          return this._delegate;
        }
        var tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
        if (!tracer) {
          return NOOP_TRACER;
        }
        this._delegate = tracer;
        return this._delegate;
      };
      return ProxyTracer2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js
var NoopTracerProvider;
var init_NoopTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/NoopTracerProvider.js"() {
    init_NoopTracer();
    NoopTracerProvider = /** @class */
    (function() {
      function NoopTracerProvider2() {
      }
      NoopTracerProvider2.prototype.getTracer = function(_name, _version, _options) {
        return new NoopTracer();
      };
      return NoopTracerProvider2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js
var NOOP_TRACER_PROVIDER, ProxyTracerProvider;
var init_ProxyTracerProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/ProxyTracerProvider.js"() {
    init_ProxyTracer();
    init_NoopTracerProvider();
    NOOP_TRACER_PROVIDER = new NoopTracerProvider();
    ProxyTracerProvider = /** @class */
    (function() {
      function ProxyTracerProvider2() {
      }
      ProxyTracerProvider2.prototype.getTracer = function(name, version, options) {
        var _a;
        return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== void 0 ? _a : new ProxyTracer(this, name, version, options);
      };
      ProxyTracerProvider2.prototype.getDelegate = function() {
        var _a;
        return (_a = this._delegate) !== null && _a !== void 0 ? _a : NOOP_TRACER_PROVIDER;
      };
      ProxyTracerProvider2.prototype.setDelegate = function(delegate) {
        this._delegate = delegate;
      };
      ProxyTracerProvider2.prototype.getDelegateTracer = function(name, version, options) {
        var _a;
        return (_a = this._delegate) === null || _a === void 0 ? void 0 : _a.getTracer(name, version, options);
      };
      return ProxyTracerProvider2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js
var SamplingDecision;
var init_SamplingResult = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/SamplingResult.js"() {
    (function(SamplingDecision2) {
      SamplingDecision2[SamplingDecision2["NOT_RECORD"] = 0] = "NOT_RECORD";
      SamplingDecision2[SamplingDecision2["RECORD"] = 1] = "RECORD";
      SamplingDecision2[SamplingDecision2["RECORD_AND_SAMPLED"] = 2] = "RECORD_AND_SAMPLED";
    })(SamplingDecision || (SamplingDecision = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/span_kind.js
var SpanKind;
var init_span_kind = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/span_kind.js"() {
    (function(SpanKind2) {
      SpanKind2[SpanKind2["INTERNAL"] = 0] = "INTERNAL";
      SpanKind2[SpanKind2["SERVER"] = 1] = "SERVER";
      SpanKind2[SpanKind2["CLIENT"] = 2] = "CLIENT";
      SpanKind2[SpanKind2["PRODUCER"] = 3] = "PRODUCER";
      SpanKind2[SpanKind2["CONSUMER"] = 4] = "CONSUMER";
    })(SpanKind || (SpanKind = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/status.js
var SpanStatusCode;
var init_status = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/status.js"() {
    (function(SpanStatusCode2) {
      SpanStatusCode2[SpanStatusCode2["UNSET"] = 0] = "UNSET";
      SpanStatusCode2[SpanStatusCode2["OK"] = 1] = "OK";
      SpanStatusCode2[SpanStatusCode2["ERROR"] = 2] = "ERROR";
    })(SpanStatusCode || (SpanStatusCode = {}));
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js
function validateKey(key) {
  return VALID_KEY_REGEX.test(key);
}
function validateValue(value) {
  return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
}
var VALID_KEY_CHAR_RANGE, VALID_KEY, VALID_VENDOR_KEY, VALID_KEY_REGEX, VALID_VALUE_BASE_REGEX, INVALID_VALUE_COMMA_EQUAL_REGEX;
var init_tracestate_validators = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-validators.js"() {
    VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
    VALID_KEY = "[a-z]" + VALID_KEY_CHAR_RANGE + "{0,255}";
    VALID_VENDOR_KEY = "[a-z0-9]" + VALID_KEY_CHAR_RANGE + "{0,240}@[a-z]" + VALID_KEY_CHAR_RANGE + "{0,13}";
    VALID_KEY_REGEX = new RegExp("^(?:" + VALID_KEY + "|" + VALID_VENDOR_KEY + ")$");
    VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
    INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js
var MAX_TRACE_STATE_ITEMS, MAX_TRACE_STATE_LEN, LIST_MEMBERS_SEPARATOR, LIST_MEMBER_KEY_VALUE_SPLITTER, TraceStateImpl;
var init_tracestate_impl = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/tracestate-impl.js"() {
    init_tracestate_validators();
    MAX_TRACE_STATE_ITEMS = 32;
    MAX_TRACE_STATE_LEN = 512;
    LIST_MEMBERS_SEPARATOR = ",";
    LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
    TraceStateImpl = /** @class */
    (function() {
      function TraceStateImpl2(rawTraceState) {
        this._internalState = /* @__PURE__ */ new Map();
        if (rawTraceState)
          this._parse(rawTraceState);
      }
      TraceStateImpl2.prototype.set = function(key, value) {
        var traceState = this._clone();
        if (traceState._internalState.has(key)) {
          traceState._internalState.delete(key);
        }
        traceState._internalState.set(key, value);
        return traceState;
      };
      TraceStateImpl2.prototype.unset = function(key) {
        var traceState = this._clone();
        traceState._internalState.delete(key);
        return traceState;
      };
      TraceStateImpl2.prototype.get = function(key) {
        return this._internalState.get(key);
      };
      TraceStateImpl2.prototype.serialize = function() {
        var _this = this;
        return this._keys().reduce(function(agg, key) {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + _this.get(key));
          return agg;
        }, []).join(LIST_MEMBERS_SEPARATOR);
      };
      TraceStateImpl2.prototype._parse = function(rawTraceState) {
        if (rawTraceState.length > MAX_TRACE_STATE_LEN)
          return;
        this._internalState = rawTraceState.split(LIST_MEMBERS_SEPARATOR).reverse().reduce(function(agg, part) {
          var listMember = part.trim();
          var i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            var key = listMember.slice(0, i);
            var value = listMember.slice(i + 1, part.length);
            if (validateKey(key) && validateValue(value)) {
              agg.set(key, value);
            } else {
            }
          }
          return agg;
        }, /* @__PURE__ */ new Map());
        if (this._internalState.size > MAX_TRACE_STATE_ITEMS) {
          this._internalState = new Map(Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS));
        }
      };
      TraceStateImpl2.prototype._keys = function() {
        return Array.from(this._internalState.keys()).reverse();
      };
      TraceStateImpl2.prototype._clone = function() {
        var traceState = new TraceStateImpl2();
        traceState._internalState = new Map(this._internalState);
        return traceState;
      };
      return TraceStateImpl2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js
function createTraceState(rawTraceState) {
  return new TraceStateImpl(rawTraceState);
}
var init_utils2 = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace/internal/utils.js"() {
    init_tracestate_impl();
  }
});

// node_modules/@opentelemetry/api/build/esm/context-api.js
var context;
var init_context_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/context-api.js"() {
    init_context2();
    context = ContextAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/diag-api.js
var diag2;
var init_diag_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/diag-api.js"() {
    init_diag();
    diag2 = DiagAPI.instance();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js
var NoopMeterProvider, NOOP_METER_PROVIDER;
var init_NoopMeterProvider = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics/NoopMeterProvider.js"() {
    init_NoopMeter();
    NoopMeterProvider = /** @class */
    (function() {
      function NoopMeterProvider2() {
      }
      NoopMeterProvider2.prototype.getMeter = function(_name, _version, _options) {
        return NOOP_METER;
      };
      return NoopMeterProvider2;
    })();
    NOOP_METER_PROVIDER = new NoopMeterProvider();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/metrics.js
var API_NAME3, MetricsAPI;
var init_metrics = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/metrics.js"() {
    init_NoopMeterProvider();
    init_global_utils();
    init_diag();
    API_NAME3 = "metrics";
    MetricsAPI = /** @class */
    (function() {
      function MetricsAPI2() {
      }
      MetricsAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new MetricsAPI2();
        }
        return this._instance;
      };
      MetricsAPI2.prototype.setGlobalMeterProvider = function(provider) {
        return registerGlobal(API_NAME3, provider, DiagAPI.instance());
      };
      MetricsAPI2.prototype.getMeterProvider = function() {
        return getGlobal(API_NAME3) || NOOP_METER_PROVIDER;
      };
      MetricsAPI2.prototype.getMeter = function(name, version, options) {
        return this.getMeterProvider().getMeter(name, version, options);
      };
      MetricsAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME3, DiagAPI.instance());
      };
      return MetricsAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/metrics-api.js
var metrics;
var init_metrics_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/metrics-api.js"() {
    init_metrics();
    metrics = MetricsAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js
var NoopTextMapPropagator;
var init_NoopTextMapPropagator = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation/NoopTextMapPropagator.js"() {
    NoopTextMapPropagator = /** @class */
    (function() {
      function NoopTextMapPropagator2() {
      }
      NoopTextMapPropagator2.prototype.inject = function(_context, _carrier) {
      };
      NoopTextMapPropagator2.prototype.extract = function(context2, _carrier) {
        return context2;
      };
      NoopTextMapPropagator2.prototype.fields = function() {
        return [];
      };
      return NoopTextMapPropagator2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js
function getBaggage(context2) {
  return context2.getValue(BAGGAGE_KEY) || void 0;
}
function getActiveBaggage() {
  return getBaggage(ContextAPI.getInstance().active());
}
function setBaggage(context2, baggage) {
  return context2.setValue(BAGGAGE_KEY, baggage);
}
function deleteBaggage(context2) {
  return context2.deleteValue(BAGGAGE_KEY);
}
var BAGGAGE_KEY;
var init_context_helpers = __esm({
  "node_modules/@opentelemetry/api/build/esm/baggage/context-helpers.js"() {
    init_context2();
    init_context();
    BAGGAGE_KEY = createContextKey("OpenTelemetry Baggage Key");
  }
});

// node_modules/@opentelemetry/api/build/esm/api/propagation.js
var API_NAME4, NOOP_TEXT_MAP_PROPAGATOR, PropagationAPI;
var init_propagation = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/propagation.js"() {
    init_global_utils();
    init_NoopTextMapPropagator();
    init_TextMapPropagator();
    init_context_helpers();
    init_utils();
    init_diag();
    API_NAME4 = "propagation";
    NOOP_TEXT_MAP_PROPAGATOR = new NoopTextMapPropagator();
    PropagationAPI = /** @class */
    (function() {
      function PropagationAPI2() {
        this.createBaggage = createBaggage;
        this.getBaggage = getBaggage;
        this.getActiveBaggage = getActiveBaggage;
        this.setBaggage = setBaggage;
        this.deleteBaggage = deleteBaggage;
      }
      PropagationAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new PropagationAPI2();
        }
        return this._instance;
      };
      PropagationAPI2.prototype.setGlobalPropagator = function(propagator) {
        return registerGlobal(API_NAME4, propagator, DiagAPI.instance());
      };
      PropagationAPI2.prototype.inject = function(context2, carrier, setter) {
        if (setter === void 0) {
          setter = defaultTextMapSetter;
        }
        return this._getGlobalPropagator().inject(context2, carrier, setter);
      };
      PropagationAPI2.prototype.extract = function(context2, carrier, getter) {
        if (getter === void 0) {
          getter = defaultTextMapGetter;
        }
        return this._getGlobalPropagator().extract(context2, carrier, getter);
      };
      PropagationAPI2.prototype.fields = function() {
        return this._getGlobalPropagator().fields();
      };
      PropagationAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME4, DiagAPI.instance());
      };
      PropagationAPI2.prototype._getGlobalPropagator = function() {
        return getGlobal(API_NAME4) || NOOP_TEXT_MAP_PROPAGATOR;
      };
      return PropagationAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/propagation-api.js
var propagation;
var init_propagation_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/propagation-api.js"() {
    init_propagation();
    propagation = PropagationAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/api/trace.js
var API_NAME5, TraceAPI;
var init_trace = __esm({
  "node_modules/@opentelemetry/api/build/esm/api/trace.js"() {
    init_global_utils();
    init_ProxyTracerProvider();
    init_spancontext_utils();
    init_context_utils();
    init_diag();
    API_NAME5 = "trace";
    TraceAPI = /** @class */
    (function() {
      function TraceAPI2() {
        this._proxyTracerProvider = new ProxyTracerProvider();
        this.wrapSpanContext = wrapSpanContext;
        this.isSpanContextValid = isSpanContextValid;
        this.deleteSpan = deleteSpan;
        this.getSpan = getSpan;
        this.getActiveSpan = getActiveSpan;
        this.getSpanContext = getSpanContext;
        this.setSpan = setSpan;
        this.setSpanContext = setSpanContext;
      }
      TraceAPI2.getInstance = function() {
        if (!this._instance) {
          this._instance = new TraceAPI2();
        }
        return this._instance;
      };
      TraceAPI2.prototype.setGlobalTracerProvider = function(provider) {
        var success = registerGlobal(API_NAME5, this._proxyTracerProvider, DiagAPI.instance());
        if (success) {
          this._proxyTracerProvider.setDelegate(provider);
        }
        return success;
      };
      TraceAPI2.prototype.getTracerProvider = function() {
        return getGlobal(API_NAME5) || this._proxyTracerProvider;
      };
      TraceAPI2.prototype.getTracer = function(name, version) {
        return this.getTracerProvider().getTracer(name, version);
      };
      TraceAPI2.prototype.disable = function() {
        unregisterGlobal(API_NAME5, DiagAPI.instance());
        this._proxyTracerProvider = new ProxyTracerProvider();
      };
      return TraceAPI2;
    })();
  }
});

// node_modules/@opentelemetry/api/build/esm/trace-api.js
var trace;
var init_trace_api = __esm({
  "node_modules/@opentelemetry/api/build/esm/trace-api.js"() {
    init_trace();
    trace = TraceAPI.getInstance();
  }
});

// node_modules/@opentelemetry/api/build/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  DiagConsoleLogger: () => DiagConsoleLogger,
  DiagLogLevel: () => DiagLogLevel,
  INVALID_SPANID: () => INVALID_SPANID,
  INVALID_SPAN_CONTEXT: () => INVALID_SPAN_CONTEXT,
  INVALID_TRACEID: () => INVALID_TRACEID,
  ProxyTracer: () => ProxyTracer,
  ProxyTracerProvider: () => ProxyTracerProvider,
  ROOT_CONTEXT: () => ROOT_CONTEXT,
  SamplingDecision: () => SamplingDecision,
  SpanKind: () => SpanKind,
  SpanStatusCode: () => SpanStatusCode,
  TraceFlags: () => TraceFlags,
  ValueType: () => ValueType,
  baggageEntryMetadataFromString: () => baggageEntryMetadataFromString,
  context: () => context,
  createContextKey: () => createContextKey,
  createNoopMeter: () => createNoopMeter,
  createTraceState: () => createTraceState,
  default: () => esm_default,
  defaultTextMapGetter: () => defaultTextMapGetter,
  defaultTextMapSetter: () => defaultTextMapSetter,
  diag: () => diag2,
  isSpanContextValid: () => isSpanContextValid,
  isValidSpanId: () => isValidSpanId,
  isValidTraceId: () => isValidTraceId,
  metrics: () => metrics,
  propagation: () => propagation,
  trace: () => trace
});
var esm_default;
var init_esm = __esm({
  "node_modules/@opentelemetry/api/build/esm/index.js"() {
    init_utils();
    init_context();
    init_consoleLogger();
    init_types();
    init_NoopMeter();
    init_Metric();
    init_TextMapPropagator();
    init_ProxyTracer();
    init_ProxyTracerProvider();
    init_SamplingResult();
    init_span_kind();
    init_status();
    init_trace_flags();
    init_utils2();
    init_spancontext_utils();
    init_invalid_span_constants();
    init_context_api();
    init_diag_api();
    init_metrics_api();
    init_propagation_api();
    init_trace_api();
    esm_default = {
      context,
      diag: diag2,
      metrics,
      propagation,
      trace
    };
  }
});

// node_modules/prom-client/lib/metrics/processCpuTotal.js
var require_processCpuTotal = __commonJS({
  "node_modules/prom-client/lib/metrics/processCpuTotal.js"(exports2, module2) {
    "use strict";
    var OtelApi = (init_esm(), __toCommonJS(esm_exports));
    var Counter2 = require_counter();
    var PROCESS_CPU_USER_SECONDS = "process_cpu_user_seconds_total";
    var PROCESS_CPU_SYSTEM_SECONDS = "process_cpu_system_seconds_total";
    var PROCESS_CPU_SECONDS = "process_cpu_seconds_total";
    module2.exports = (registry, config = {}) => {
      const registers = registry ? [registry] : void 0;
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const exemplars = config.enableExemplars ? config.enableExemplars : false;
      const labelNames = Object.keys(labels);
      let lastCpuUsage = process.cpuUsage();
      const cpuUserUsageCounter = new Counter2({
        name: namePrefix + PROCESS_CPU_USER_SECONDS,
        help: "Total user CPU time spent in seconds.",
        enableExemplars: exemplars,
        registers,
        labelNames,
        // Use this one metric's `collect` to set all metrics' values.
        collect() {
          const cpuUsage = process.cpuUsage();
          const userUsageMicros = cpuUsage.user - lastCpuUsage.user;
          const systemUsageMicros = cpuUsage.system - lastCpuUsage.system;
          lastCpuUsage = cpuUsage;
          if (this.enableExemplars) {
            let exemplarLabels = {};
            const currentSpan = OtelApi.trace.getSpan(OtelApi.context.active());
            if (currentSpan) {
              exemplarLabels = {
                traceId: currentSpan.spanContext().traceId,
                spanId: currentSpan.spanContext().spanId
              };
            }
            cpuUserUsageCounter.inc({
              labels,
              value: userUsageMicros / 1e6,
              exemplarLabels
            });
            cpuSystemUsageCounter.inc({
              labels,
              value: systemUsageMicros / 1e6,
              exemplarLabels
            });
            cpuUsageCounter.inc({
              labels,
              value: (userUsageMicros + systemUsageMicros) / 1e6,
              exemplarLabels
            });
          } else {
            cpuUserUsageCounter.inc(labels, userUsageMicros / 1e6);
            cpuSystemUsageCounter.inc(labels, systemUsageMicros / 1e6);
            cpuUsageCounter.inc(
              labels,
              (userUsageMicros + systemUsageMicros) / 1e6
            );
          }
        }
      });
      const cpuSystemUsageCounter = new Counter2({
        name: namePrefix + PROCESS_CPU_SYSTEM_SECONDS,
        help: "Total system CPU time spent in seconds.",
        enableExemplars: exemplars,
        registers,
        labelNames
      });
      const cpuUsageCounter = new Counter2({
        name: namePrefix + PROCESS_CPU_SECONDS,
        help: "Total user and system CPU time spent in seconds.",
        enableExemplars: exemplars,
        registers,
        labelNames
      });
    };
    module2.exports.metricNames = [
      PROCESS_CPU_USER_SECONDS,
      PROCESS_CPU_SYSTEM_SECONDS,
      PROCESS_CPU_SECONDS
    ];
  }
});

// node_modules/prom-client/lib/metrics/processStartTime.js
var require_processStartTime = __commonJS({
  "node_modules/prom-client/lib/metrics/processStartTime.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var startInSeconds = Math.round(Date.now() / 1e3 - process.uptime());
    var PROCESS_START_TIME = "process_start_time_seconds";
    module2.exports = (registry, config = {}) => {
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + PROCESS_START_TIME,
        help: "Start time of the process since unix epoch in seconds.",
        registers: registry ? [registry] : void 0,
        labelNames,
        aggregator: "omit",
        collect() {
          this.set(labels, startInSeconds);
        }
      });
    };
    module2.exports.metricNames = [PROCESS_START_TIME];
  }
});

// node_modules/prom-client/lib/metrics/osMemoryHeapLinux.js
var require_osMemoryHeapLinux = __commonJS({
  "node_modules/prom-client/lib/metrics/osMemoryHeapLinux.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var fs3 = require("fs");
    var values = ["VmSize", "VmRSS", "VmData"];
    var PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";
    var PROCESS_VIRTUAL_MEMORY = "process_virtual_memory_bytes";
    var PROCESS_HEAP = "process_heap_bytes";
    function structureOutput(input) {
      return input.split("\n").reduce((acc, string) => {
        if (!values.some((value2) => string.startsWith(value2))) {
          return acc;
        }
        const split = string.split(":");
        let value = split[1].trim();
        value = value.substr(0, value.length - 3);
        value = Number(value) * 1024;
        acc[split[0]] = value;
        return acc;
      }, {});
    }
    module2.exports = (registry, config = {}) => {
      const registers = registry ? [registry] : void 0;
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      const residentMemGauge = new Gauge({
        name: namePrefix + PROCESS_RESIDENT_MEMORY,
        help: "Resident memory size in bytes.",
        registers,
        labelNames,
        // Use this one metric's `collect` to set all metrics' values.
        collect() {
          try {
            const stat = fs3.readFileSync("/proc/self/status", "utf8");
            const structuredOutput = structureOutput(stat);
            residentMemGauge.set(labels, structuredOutput.VmRSS);
            virtualMemGauge.set(labels, structuredOutput.VmSize);
            heapSizeMemGauge.set(labels, structuredOutput.VmData);
          } catch {
          }
        }
      });
      const virtualMemGauge = new Gauge({
        name: namePrefix + PROCESS_VIRTUAL_MEMORY,
        help: "Virtual memory size in bytes.",
        registers,
        labelNames
      });
      const heapSizeMemGauge = new Gauge({
        name: namePrefix + PROCESS_HEAP,
        help: "Process heap size in bytes.",
        registers,
        labelNames
      });
    };
    module2.exports.metricNames = [
      PROCESS_RESIDENT_MEMORY,
      PROCESS_VIRTUAL_MEMORY,
      PROCESS_HEAP
    ];
  }
});

// node_modules/prom-client/lib/metrics/helpers/safeMemoryUsage.js
var require_safeMemoryUsage = __commonJS({
  "node_modules/prom-client/lib/metrics/helpers/safeMemoryUsage.js"(exports2, module2) {
    "use strict";
    function safeMemoryUsage() {
      try {
        return process.memoryUsage();
      } catch {
        return;
      }
    }
    module2.exports = safeMemoryUsage;
  }
});

// node_modules/prom-client/lib/metrics/osMemoryHeap.js
var require_osMemoryHeap = __commonJS({
  "node_modules/prom-client/lib/metrics/osMemoryHeap.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var linuxVariant = require_osMemoryHeapLinux();
    var safeMemoryUsage = require_safeMemoryUsage();
    var PROCESS_RESIDENT_MEMORY = "process_resident_memory_bytes";
    function notLinuxVariant(registry, config = {}) {
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + PROCESS_RESIDENT_MEMORY,
        help: "Resident memory size in bytes.",
        registers: registry ? [registry] : void 0,
        labelNames,
        collect() {
          const memUsage = safeMemoryUsage();
          if (memUsage) {
            this.set(labels, memUsage.rss);
          }
        }
      });
    }
    module2.exports = (registry, config) => process.platform === "linux" ? linuxVariant(registry, config) : notLinuxVariant(registry, config);
    module2.exports.metricNames = process.platform === "linux" ? linuxVariant.metricNames : [PROCESS_RESIDENT_MEMORY];
  }
});

// node_modules/prom-client/lib/metrics/processOpenFileDescriptors.js
var require_processOpenFileDescriptors = __commonJS({
  "node_modules/prom-client/lib/metrics/processOpenFileDescriptors.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var fs3 = require("fs");
    var process2 = require("process");
    var PROCESS_OPEN_FDS = "process_open_fds";
    module2.exports = (registry, config = {}) => {
      if (process2.platform !== "linux") {
        return;
      }
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + PROCESS_OPEN_FDS,
        help: "Number of open file descriptors.",
        registers: registry ? [registry] : void 0,
        labelNames,
        collect() {
          try {
            const fds = fs3.readdirSync("/proc/self/fd");
            this.set(labels, fds.length - 1);
          } catch {
          }
        }
      });
    };
    module2.exports.metricNames = [PROCESS_OPEN_FDS];
  }
});

// node_modules/prom-client/lib/metrics/processMaxFileDescriptors.js
var require_processMaxFileDescriptors = __commonJS({
  "node_modules/prom-client/lib/metrics/processMaxFileDescriptors.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var fs3 = require("fs");
    var PROCESS_MAX_FDS = "process_max_fds";
    var maxFds;
    module2.exports = (registry, config = {}) => {
      if (maxFds === void 0) {
        try {
          const limits = fs3.readFileSync("/proc/self/limits", "utf8");
          const lines = limits.split("\n");
          for (const line of lines) {
            if (line.startsWith("Max open files")) {
              const parts = line.split(/  +/);
              maxFds = Number(parts[1]);
              break;
            }
          }
        } catch {
          return;
        }
      }
      if (maxFds === void 0) return;
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + PROCESS_MAX_FDS,
        help: "Maximum number of open file descriptors.",
        registers: registry ? [registry] : void 0,
        labelNames,
        collect() {
          if (maxFds !== void 0) this.set(labels, maxFds);
        }
      });
    };
    module2.exports.metricNames = [PROCESS_MAX_FDS];
  }
});

// node_modules/prom-client/lib/metrics/eventLoopLag.js
var require_eventLoopLag = __commonJS({
  "node_modules/prom-client/lib/metrics/eventLoopLag.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var perf_hooks;
    try {
      perf_hooks = require("perf_hooks");
    } catch {
    }
    var NODEJS_EVENTLOOP_LAG = "nodejs_eventloop_lag_seconds";
    var NODEJS_EVENTLOOP_LAG_MIN = "nodejs_eventloop_lag_min_seconds";
    var NODEJS_EVENTLOOP_LAG_MAX = "nodejs_eventloop_lag_max_seconds";
    var NODEJS_EVENTLOOP_LAG_MEAN = "nodejs_eventloop_lag_mean_seconds";
    var NODEJS_EVENTLOOP_LAG_STDDEV = "nodejs_eventloop_lag_stddev_seconds";
    var NODEJS_EVENTLOOP_LAG_P50 = "nodejs_eventloop_lag_p50_seconds";
    var NODEJS_EVENTLOOP_LAG_P90 = "nodejs_eventloop_lag_p90_seconds";
    var NODEJS_EVENTLOOP_LAG_P99 = "nodejs_eventloop_lag_p99_seconds";
    function reportEventloopLag(start, gauge, labels) {
      const delta = process.hrtime(start);
      const nanosec = delta[0] * 1e9 + delta[1];
      const seconds = nanosec / 1e9;
      gauge.set(labels, seconds);
    }
    module2.exports = (registry, config = {}) => {
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      const registers = registry ? [registry] : void 0;
      let collect = () => {
        const start = process.hrtime();
        setImmediate(reportEventloopLag, start, lag, labels);
      };
      if (perf_hooks && perf_hooks.monitorEventLoopDelay) {
        try {
          const histogram = perf_hooks.monitorEventLoopDelay({
            resolution: config.eventLoopMonitoringPrecision
          });
          histogram.enable();
          collect = () => {
            const start = process.hrtime();
            setImmediate(reportEventloopLag, start, lag, labels);
            lagMin.set(labels, histogram.min / 1e9);
            lagMax.set(labels, histogram.max / 1e9);
            lagMean.set(labels, histogram.mean / 1e9);
            lagStddev.set(labels, histogram.stddev / 1e9);
            lagP50.set(labels, histogram.percentile(50) / 1e9);
            lagP90.set(labels, histogram.percentile(90) / 1e9);
            lagP99.set(labels, histogram.percentile(99) / 1e9);
            histogram.reset();
          };
        } catch (e) {
          if (e.code === "ERR_NOT_IMPLEMENTED") {
            return;
          }
          throw e;
        }
      }
      const lag = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG,
        help: "Lag of event loop in seconds.",
        registers,
        labelNames,
        aggregator: "average",
        // Use this one metric's `collect` to set all metrics' values.
        collect
      });
      const lagMin = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_MIN,
        help: "The minimum recorded event loop delay.",
        registers,
        labelNames,
        aggregator: "min"
      });
      const lagMax = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_MAX,
        help: "The maximum recorded event loop delay.",
        registers,
        labelNames,
        aggregator: "max"
      });
      const lagMean = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_MEAN,
        help: "The mean of the recorded event loop delays.",
        registers,
        labelNames,
        aggregator: "average"
      });
      const lagStddev = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_STDDEV,
        help: "The standard deviation of the recorded event loop delays.",
        registers,
        labelNames,
        aggregator: "average"
      });
      const lagP50 = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_P50,
        help: "The 50th percentile of the recorded event loop delays.",
        registers,
        labelNames,
        aggregator: "average"
      });
      const lagP90 = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_P90,
        help: "The 90th percentile of the recorded event loop delays.",
        registers,
        labelNames,
        aggregator: "average"
      });
      const lagP99 = new Gauge({
        name: namePrefix + NODEJS_EVENTLOOP_LAG_P99,
        help: "The 99th percentile of the recorded event loop delays.",
        registers,
        labelNames,
        aggregator: "average"
      });
    };
    module2.exports.metricNames = [
      NODEJS_EVENTLOOP_LAG,
      NODEJS_EVENTLOOP_LAG_MIN,
      NODEJS_EVENTLOOP_LAG_MAX,
      NODEJS_EVENTLOOP_LAG_MEAN,
      NODEJS_EVENTLOOP_LAG_STDDEV,
      NODEJS_EVENTLOOP_LAG_P50,
      NODEJS_EVENTLOOP_LAG_P90,
      NODEJS_EVENTLOOP_LAG_P99
    ];
  }
});

// node_modules/prom-client/lib/metrics/helpers/processMetricsHelpers.js
var require_processMetricsHelpers = __commonJS({
  "node_modules/prom-client/lib/metrics/helpers/processMetricsHelpers.js"(exports2, module2) {
    "use strict";
    function aggregateByObjectName(list) {
      const data = {};
      for (let i = 0; i < list.length; i++) {
        const listElement = list[i];
        if (!listElement || typeof listElement.constructor === "undefined") {
          continue;
        }
        if (Object.hasOwnProperty.call(data, listElement.constructor.name)) {
          data[listElement.constructor.name] += 1;
        } else {
          data[listElement.constructor.name] = 1;
        }
      }
      return data;
    }
    function updateMetrics(gauge, data, labels) {
      gauge.reset();
      for (const key in data) {
        gauge.set(Object.assign({ type: key }, labels || {}), data[key]);
      }
    }
    module2.exports = {
      aggregateByObjectName,
      updateMetrics
    };
  }
});

// node_modules/prom-client/lib/metrics/processHandles.js
var require_processHandles = __commonJS({
  "node_modules/prom-client/lib/metrics/processHandles.js"(exports2, module2) {
    "use strict";
    var { aggregateByObjectName } = require_processMetricsHelpers();
    var { updateMetrics } = require_processMetricsHelpers();
    var Gauge = require_gauge();
    var NODEJS_ACTIVE_HANDLES = "nodejs_active_handles";
    var NODEJS_ACTIVE_HANDLES_TOTAL = "nodejs_active_handles_total";
    module2.exports = (registry, config = {}) => {
      if (typeof process._getActiveHandles !== "function") {
        return;
      }
      const registers = registry ? [registry] : void 0;
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_HANDLES,
        help: "Number of active libuv handles grouped by handle type. Every handle type is C++ class name.",
        labelNames: ["type", ...labelNames],
        registers,
        collect() {
          const handles = process._getActiveHandles();
          updateMetrics(this, aggregateByObjectName(handles), labels);
        }
      });
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_HANDLES_TOTAL,
        help: "Total number of active handles.",
        registers,
        labelNames,
        collect() {
          const handles = process._getActiveHandles();
          this.set(labels, handles.length);
        }
      });
    };
    module2.exports.metricNames = [
      NODEJS_ACTIVE_HANDLES,
      NODEJS_ACTIVE_HANDLES_TOTAL
    ];
  }
});

// node_modules/prom-client/lib/metrics/processRequests.js
var require_processRequests = __commonJS({
  "node_modules/prom-client/lib/metrics/processRequests.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var { aggregateByObjectName } = require_processMetricsHelpers();
    var { updateMetrics } = require_processMetricsHelpers();
    var NODEJS_ACTIVE_REQUESTS = "nodejs_active_requests";
    var NODEJS_ACTIVE_REQUESTS_TOTAL = "nodejs_active_requests_total";
    module2.exports = (registry, config = {}) => {
      if (typeof process._getActiveRequests !== "function") {
        return;
      }
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_REQUESTS,
        help: "Number of active libuv requests grouped by request type. Every request type is C++ class name.",
        labelNames: ["type", ...labelNames],
        registers: registry ? [registry] : void 0,
        collect() {
          const requests = process._getActiveRequests();
          updateMetrics(this, aggregateByObjectName(requests), labels);
        }
      });
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_REQUESTS_TOTAL,
        help: "Total number of active requests.",
        registers: registry ? [registry] : void 0,
        labelNames,
        collect() {
          const requests = process._getActiveRequests();
          this.set(labels, requests.length);
        }
      });
    };
    module2.exports.metricNames = [
      NODEJS_ACTIVE_REQUESTS,
      NODEJS_ACTIVE_REQUESTS_TOTAL
    ];
  }
});

// node_modules/prom-client/lib/metrics/processResources.js
var require_processResources = __commonJS({
  "node_modules/prom-client/lib/metrics/processResources.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var { updateMetrics } = require_processMetricsHelpers();
    var NODEJS_ACTIVE_RESOURCES = "nodejs_active_resources";
    var NODEJS_ACTIVE_RESOURCES_TOTAL = "nodejs_active_resources_total";
    module2.exports = (registry, config = {}) => {
      if (typeof process.getActiveResourcesInfo !== "function") {
        return;
      }
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_RESOURCES,
        help: "Number of active resources that are currently keeping the event loop alive, grouped by async resource type.",
        labelNames: ["type", ...labelNames],
        registers: registry ? [registry] : void 0,
        collect() {
          const resources = process.getActiveResourcesInfo();
          const data = {};
          for (let i = 0; i < resources.length; i++) {
            const resource = resources[i];
            if (Object.hasOwn(data, resource)) {
              data[resource] += 1;
            } else {
              data[resource] = 1;
            }
          }
          updateMetrics(this, data, labels);
        }
      });
      new Gauge({
        name: namePrefix + NODEJS_ACTIVE_RESOURCES_TOTAL,
        help: "Total number of active resources.",
        registers: registry ? [registry] : void 0,
        labelNames,
        collect() {
          const resources = process.getActiveResourcesInfo();
          this.set(labels, resources.length);
        }
      });
    };
    module2.exports.metricNames = [
      NODEJS_ACTIVE_RESOURCES,
      NODEJS_ACTIVE_RESOURCES_TOTAL
    ];
  }
});

// node_modules/prom-client/lib/metrics/heapSizeAndUsed.js
var require_heapSizeAndUsed = __commonJS({
  "node_modules/prom-client/lib/metrics/heapSizeAndUsed.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var safeMemoryUsage = require_safeMemoryUsage();
    var NODEJS_HEAP_SIZE_TOTAL = "nodejs_heap_size_total_bytes";
    var NODEJS_HEAP_SIZE_USED = "nodejs_heap_size_used_bytes";
    var NODEJS_EXTERNAL_MEMORY = "nodejs_external_memory_bytes";
    module2.exports = (registry, config = {}) => {
      if (typeof process.memoryUsage !== "function") {
        return;
      }
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      const registers = registry ? [registry] : void 0;
      const namePrefix = config.prefix ? config.prefix : "";
      const collect = () => {
        const memUsage = safeMemoryUsage();
        if (memUsage) {
          heapSizeTotal.set(labels, memUsage.heapTotal);
          heapSizeUsed.set(labels, memUsage.heapUsed);
          if (memUsage.external !== void 0) {
            externalMemUsed.set(labels, memUsage.external);
          }
        }
      };
      const heapSizeTotal = new Gauge({
        name: namePrefix + NODEJS_HEAP_SIZE_TOTAL,
        help: "Process heap size from Node.js in bytes.",
        registers,
        labelNames,
        // Use this one metric's `collect` to set all metrics' values.
        collect
      });
      const heapSizeUsed = new Gauge({
        name: namePrefix + NODEJS_HEAP_SIZE_USED,
        help: "Process heap size used from Node.js in bytes.",
        registers,
        labelNames
      });
      const externalMemUsed = new Gauge({
        name: namePrefix + NODEJS_EXTERNAL_MEMORY,
        help: "Node.js external memory size in bytes.",
        registers,
        labelNames
      });
    };
    module2.exports.metricNames = [
      NODEJS_HEAP_SIZE_TOTAL,
      NODEJS_HEAP_SIZE_USED,
      NODEJS_EXTERNAL_MEMORY
    ];
  }
});

// node_modules/prom-client/lib/metrics/heapSpacesSizeAndUsed.js
var require_heapSpacesSizeAndUsed = __commonJS({
  "node_modules/prom-client/lib/metrics/heapSpacesSizeAndUsed.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var v8 = require("v8");
    var METRICS = ["total", "used", "available"];
    var NODEJS_HEAP_SIZE = {};
    METRICS.forEach((metricType) => {
      NODEJS_HEAP_SIZE[metricType] = `nodejs_heap_space_size_${metricType}_bytes`;
    });
    module2.exports = (registry, config = {}) => {
      try {
        v8.getHeapSpaceStatistics();
      } catch (e) {
        if (e.code === "ERR_NOT_IMPLEMENTED") {
          return;
        }
        throw e;
      }
      const registers = registry ? [registry] : void 0;
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = ["space", ...Object.keys(labels)];
      const gauges = {};
      METRICS.forEach((metricType) => {
        gauges[metricType] = new Gauge({
          name: namePrefix + NODEJS_HEAP_SIZE[metricType],
          help: `Process heap space size ${metricType} from Node.js in bytes.`,
          labelNames,
          registers
        });
      });
      gauges.total.collect = () => {
        for (const space of v8.getHeapSpaceStatistics()) {
          const spaceName = space.space_name.substr(
            0,
            space.space_name.indexOf("_space")
          );
          gauges.total.set({ space: spaceName, ...labels }, space.space_size);
          gauges.used.set({ space: spaceName, ...labels }, space.space_used_size);
          gauges.available.set(
            { space: spaceName, ...labels },
            space.space_available_size
          );
        }
      };
    };
    module2.exports.metricNames = Object.values(NODEJS_HEAP_SIZE);
  }
});

// node_modules/prom-client/lib/metrics/version.js
var require_version = __commonJS({
  "node_modules/prom-client/lib/metrics/version.js"(exports2, module2) {
    "use strict";
    var Gauge = require_gauge();
    var version = process.version;
    var versionSegments = version.slice(1).split(".").map(Number);
    var NODE_VERSION_INFO = "nodejs_version_info";
    module2.exports = (registry, config = {}) => {
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      new Gauge({
        name: namePrefix + NODE_VERSION_INFO,
        help: "Node.js version info.",
        labelNames: ["version", "major", "minor", "patch", ...labelNames],
        registers: registry ? [registry] : void 0,
        aggregator: "first",
        collect() {
          this.labels(
            version,
            versionSegments[0],
            versionSegments[1],
            versionSegments[2],
            ...Object.values(labels)
          ).set(1);
        }
      });
    };
    module2.exports.metricNames = [NODE_VERSION_INFO];
  }
});

// node_modules/prom-client/lib/metrics/gc.js
var require_gc = __commonJS({
  "node_modules/prom-client/lib/metrics/gc.js"(exports2, module2) {
    "use strict";
    var Histogram = require_histogram();
    var perf_hooks;
    try {
      perf_hooks = require("perf_hooks");
    } catch {
    }
    var NODEJS_GC_DURATION_SECONDS = "nodejs_gc_duration_seconds";
    var DEFAULT_GC_DURATION_BUCKETS = [1e-3, 0.01, 0.1, 1, 2, 5];
    var kinds = [];
    if (perf_hooks && perf_hooks.constants) {
      kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_MAJOR] = "major";
      kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_MINOR] = "minor";
      kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_INCREMENTAL] = "incremental";
      kinds[perf_hooks.constants.NODE_PERFORMANCE_GC_WEAKCB] = "weakcb";
    }
    module2.exports = (registry, config = {}) => {
      if (!perf_hooks) {
        return;
      }
      const namePrefix = config.prefix ? config.prefix : "";
      const labels = config.labels ? config.labels : {};
      const labelNames = Object.keys(labels);
      const buckets = config.gcDurationBuckets ? config.gcDurationBuckets : DEFAULT_GC_DURATION_BUCKETS;
      const gcHistogram = new Histogram({
        name: namePrefix + NODEJS_GC_DURATION_SECONDS,
        help: "Garbage collection duration by kind, one of major, minor, incremental or weakcb.",
        labelNames: ["kind", ...labelNames],
        enableExemplars: false,
        buckets,
        registers: registry ? [registry] : void 0
      });
      const obs = new perf_hooks.PerformanceObserver((list) => {
        const entry = list.getEntries()[0];
        const kind = entry.detail ? kinds[entry.detail.kind] : kinds[entry.kind];
        gcHistogram.observe(Object.assign({ kind }, labels), entry.duration / 1e3);
      });
      obs.observe({ entryTypes: ["gc"] });
    };
    module2.exports.metricNames = [NODEJS_GC_DURATION_SECONDS];
  }
});

// node_modules/prom-client/lib/defaultMetrics.js
var require_defaultMetrics = __commonJS({
  "node_modules/prom-client/lib/defaultMetrics.js"(exports2, module2) {
    "use strict";
    var { isObject } = require_util();
    var processCpuTotal = require_processCpuTotal();
    var processStartTime = require_processStartTime();
    var osMemoryHeap = require_osMemoryHeap();
    var processOpenFileDescriptors = require_processOpenFileDescriptors();
    var processMaxFileDescriptors = require_processMaxFileDescriptors();
    var eventLoopLag = require_eventLoopLag();
    var processHandles = require_processHandles();
    var processRequests = require_processRequests();
    var processResources = require_processResources();
    var heapSizeAndUsed = require_heapSizeAndUsed();
    var heapSpacesSizeAndUsed = require_heapSpacesSizeAndUsed();
    var version = require_version();
    var gc = require_gc();
    var metrics2 = {
      processCpuTotal,
      processStartTime,
      osMemoryHeap,
      processOpenFileDescriptors,
      processMaxFileDescriptors,
      eventLoopLag,
      ...typeof process.getActiveResourcesInfo === "function" ? { processResources } : {},
      processHandles,
      processRequests,
      heapSizeAndUsed,
      heapSpacesSizeAndUsed,
      version,
      gc
    };
    var metricsList = Object.keys(metrics2);
    module2.exports = function collectDefaultMetrics(config) {
      if (config !== null && config !== void 0 && !isObject(config)) {
        throw new TypeError("config must be null, undefined, or an object");
      }
      config = { eventLoopMonitoringPrecision: 10, ...config };
      for (const metric of Object.values(metrics2)) {
        metric(config.register, config);
      }
    };
    module2.exports.metricsList = metricsList;
  }
});

// node_modules/prom-client/lib/metricAggregators.js
var require_metricAggregators = __commonJS({
  "node_modules/prom-client/lib/metricAggregators.js"(exports2) {
    "use strict";
    var { Grouper, hashObject } = require_util();
    function AggregatorFactory(aggregatorFn) {
      return (metrics2) => {
        if (metrics2.length === 0) return;
        const result = {
          help: metrics2[0].help,
          name: metrics2[0].name,
          type: metrics2[0].type,
          values: [],
          aggregator: metrics2[0].aggregator
        };
        const byLabels = new Grouper();
        metrics2.forEach((metric) => {
          metric.values.forEach((value) => {
            const key = hashObject(value.labels);
            byLabels.add(`${value.metricName}_${key}`, value);
          });
        });
        byLabels.forEach((values) => {
          if (values.length === 0) return;
          const valObj = {
            value: aggregatorFn(values),
            labels: values[0].labels
          };
          if (values[0].metricName) {
            valObj.metricName = values[0].metricName;
          }
          result.values.push(valObj);
        });
        return result;
      };
    }
    exports2.AggregatorFactory = AggregatorFactory;
    exports2.aggregators = {
      /**
       * @return The sum of values.
       */
      sum: AggregatorFactory((v) => v.reduce((p, c) => p + c.value, 0)),
      /**
       * @return The first value.
       */
      first: AggregatorFactory((v) => v[0].value),
      /**
       * @return {undefined} Undefined; omits the metric.
       */
      omit: () => {
      },
      /**
       * @return The arithmetic mean of the values.
       */
      average: AggregatorFactory(
        (v) => v.reduce((p, c) => p + c.value, 0) / v.length
      ),
      /**
       * @return The minimum of the values.
       */
      min: AggregatorFactory(
        (v) => v.reduce((p, c) => Math.min(p, c.value), Infinity)
      ),
      /**
       * @return The maximum of the values.
       */
      max: AggregatorFactory(
        (v) => v.reduce((p, c) => Math.max(p, c.value), -Infinity)
      )
    };
  }
});

// node_modules/prom-client/lib/cluster.js
var require_cluster = __commonJS({
  "node_modules/prom-client/lib/cluster.js"(exports2, module2) {
    "use strict";
    var Registry = require_registry();
    var { Grouper } = require_util();
    var { aggregators } = require_metricAggregators();
    var cluster = () => {
      const data = require("cluster");
      cluster = () => data;
      return data;
    };
    var GET_METRICS_REQ = "prom-client:getMetricsReq";
    var GET_METRICS_RES = "prom-client:getMetricsRes";
    var registries = [Registry.globalRegistry];
    var requestCtr = 0;
    var listenersAdded = false;
    var requests = /* @__PURE__ */ new Map();
    var AggregatorRegistry = class extends Registry {
      constructor(regContentType = Registry.PROMETHEUS_CONTENT_TYPE) {
        super(regContentType);
        addListeners();
      }
      /**
       * Gets aggregated metrics for all workers. The optional callback and
       * returned Promise resolve with the same value; either may be used.
       * @return {Promise<string>} Promise that resolves with the aggregated
       *   metrics.
       */
      clusterMetrics() {
        const requestId = requestCtr++;
        return new Promise((resolve, reject) => {
          let settled = false;
          function done(err, result) {
            if (settled) return;
            settled = true;
            if (err) reject(err);
            else resolve(result);
          }
          const request = {
            responses: [],
            pending: 0,
            done,
            errorTimeout: setTimeout(() => {
              const err = new Error("Operation timed out.");
              request.done(err);
            }, 5e3)
          };
          requests.set(requestId, request);
          const message = {
            type: GET_METRICS_REQ,
            requestId
          };
          for (const id in cluster().workers) {
            if (cluster().workers[id].isConnected()) {
              cluster().workers[id].send(message);
              request.pending++;
            }
          }
          if (request.pending === 0) {
            clearTimeout(request.errorTimeout);
            process.nextTick(() => done(null, ""));
          }
        });
      }
      get contentType() {
        return super.contentType;
      }
      /**
       * Creates a new Registry instance from an array of metrics that were
       * created by `registry.getMetricsAsJSON()`. Metrics are aggregated using
       * the method specified by their `aggregator` property, or by summation if
       * `aggregator` is undefined.
       * @param {Array} metricsArr Array of metrics, each of which created by
       *   `registry.getMetricsAsJSON()`.
       * @param {string} registryType content type of the new registry. Defaults
       * to PROMETHEUS_CONTENT_TYPE.
       * @return {Registry} aggregated registry.
       */
      static aggregate(metricsArr, registryType = Registry.PROMETHEUS_CONTENT_TYPE) {
        const aggregatedRegistry = new Registry();
        const metricsByName = new Grouper();
        aggregatedRegistry.setContentType(registryType);
        metricsArr.forEach((metrics2) => {
          metrics2.forEach((metric) => {
            metricsByName.add(metric.name, metric);
          });
        });
        metricsByName.forEach((metrics2) => {
          const aggregatorName = metrics2[0].aggregator;
          const aggregatorFn = aggregators[aggregatorName];
          if (typeof aggregatorFn !== "function") {
            throw new Error(`'${aggregatorName}' is not a defined aggregator.`);
          }
          const aggregatedMetric = aggregatorFn(metrics2);
          if (aggregatedMetric) {
            const aggregatedMetricWrapper = Object.assign(
              {
                get: () => aggregatedMetric
              },
              aggregatedMetric
            );
            aggregatedRegistry.registerMetric(aggregatedMetricWrapper);
          }
        });
        return aggregatedRegistry;
      }
      /**
       * Sets the registry or registries to be aggregated. Call from workers to
       * use a registry/registries other than the default global registry.
       * @param {Array<Registry>|Registry} regs Registry or registries to be
       *   aggregated.
       * @return {void}
       */
      static setRegistries(regs) {
        if (!Array.isArray(regs)) regs = [regs];
        regs.forEach((reg) => {
          if (!(reg instanceof Registry)) {
            throw new TypeError(`Expected Registry, got ${typeof reg}`);
          }
        });
        registries = regs;
      }
    };
    function addListeners() {
      if (listenersAdded) return;
      listenersAdded = true;
      if (cluster().isMaster) {
        cluster().on("message", (worker, message) => {
          if (message.type === GET_METRICS_RES) {
            const request = requests.get(message.requestId);
            if (message.error) {
              request.done(new Error(message.error));
              return;
            }
            message.metrics.forEach((registry) => request.responses.push(registry));
            request.pending--;
            if (request.pending === 0) {
              requests.delete(message.requestId);
              clearTimeout(request.errorTimeout);
              const registry = AggregatorRegistry.aggregate(request.responses);
              const promString = registry.metrics();
              request.done(null, promString);
            }
          }
        });
      }
      if (cluster().isWorker) {
        process.on("message", (message) => {
          if (message.type === GET_METRICS_REQ) {
            Promise.all(registries.map((r) => r.getMetricsAsJSON())).then((metrics2) => {
              process.send({
                type: GET_METRICS_RES,
                requestId: message.requestId,
                metrics: metrics2
              });
            }).catch((error) => {
              process.send({
                type: GET_METRICS_RES,
                requestId: message.requestId,
                error: error.message
              });
            });
          }
        });
      }
    }
    module2.exports = AggregatorRegistry;
  }
});

// node_modules/prom-client/index.js
var require_prom_client = __commonJS({
  "node_modules/prom-client/index.js"(exports2) {
    "use strict";
    exports2.register = require_registry().globalRegistry;
    exports2.Registry = require_registry();
    Object.defineProperty(exports2, "contentType", {
      configurable: false,
      enumerable: true,
      get() {
        return exports2.register.contentType;
      },
      set(value) {
        exports2.register.setContentType(value);
      }
    });
    exports2.prometheusContentType = exports2.Registry.PROMETHEUS_CONTENT_TYPE;
    exports2.openMetricsContentType = exports2.Registry.OPENMETRICS_CONTENT_TYPE;
    exports2.validateMetricName = require_validation().validateMetricName;
    exports2.Counter = require_counter();
    exports2.Gauge = require_gauge();
    exports2.Histogram = require_histogram();
    exports2.Summary = require_summary();
    exports2.Pushgateway = require_pushgateway();
    exports2.linearBuckets = require_bucketGenerators().linearBuckets;
    exports2.exponentialBuckets = require_bucketGenerators().exponentialBuckets;
    exports2.collectDefaultMetrics = require_defaultMetrics();
    exports2.aggregators = require_metricAggregators().aggregators;
    exports2.AggregatorRegistry = require_cluster();
  }
});

// src/lib/metrics.ts
function incLlmEmptyText(labels) {
  llmEmptyTextTotal.inc({
    provider: labels.provider,
    context: labels.context ?? "unknown",
    agent_id: labels.agentId ?? "unknown"
  });
}
function incLlmEmptyToolRound(labels) {
  llmEmptyToolRoundTotal.inc({
    provider: labels.provider,
    context: labels.context ?? "unknown",
    agent_id: labels.agentId ?? "unknown"
  });
}
function incWebSearchFallback(labels) {
  webSearchFallbackTotal.inc({
    from_provider: labels.fromProvider,
    to_provider: labels.toProvider,
    reason: labels.reason
  });
}
var import_prom_client, llmEmptyTextTotal, llmEmptyToolRoundTotal, workspaceWorldWritableFilesTotal, webSearchFallbackTotal;
var init_metrics2 = __esm({
  "src/lib/metrics.ts"() {
    "use strict";
    import_prom_client = __toESM(require_prom_client());
    llmEmptyTextTotal = new import_prom_client.Counter({
      name: "subcorp_llm_empty_text_total",
      help: "LLM calls that returned empty final text, labelled by provider, context, and agent.",
      labelNames: ["provider", "context", "agent_id"],
      registers: [import_prom_client.register]
    });
    llmEmptyToolRoundTotal = new import_prom_client.Counter({
      name: "subcorp_llm_empty_tool_round_total",
      help: "LLM tool rounds that returned no final text but did execute one or more tools.",
      labelNames: ["provider", "context", "agent_id"],
      registers: [import_prom_client.register]
    });
    workspaceWorldWritableFilesTotal = new import_prom_client.Counter({
      name: "subcorp_workspace_world_writable_files_total",
      help: "World-writable files found during heartbeat workspace permission checks.",
      labelNames: ["scope"],
      registers: [import_prom_client.register]
    });
    webSearchFallbackTotal = new import_prom_client.Counter({
      name: "subcorp_web_search_fallback_total",
      help: "Web search requests that fell back from a primary provider to a secondary provider.",
      labelNames: ["from_provider", "to_provider", "reason"],
      registers: [import_prom_client.register]
    });
  }
});

// src/lib/llm/model-routing.ts
function normalizeContext2(context2) {
  return context2.replace(/-/g, "_");
}
function parseModels(value) {
  const models = value?.split(",").map((model) => model.trim()).filter(Boolean);
  return models && models.length > 0 ? models : null;
}
function envKeyToContext(key) {
  return key.slice(ENV_PREFIX.length).toLowerCase().replace(/__/g, ":");
}
function loadEnvRoutes() {
  const routes = /* @__PURE__ */ new Map();
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(ENV_PREFIX) || CONTROL_ENV_KEYS.has(key)) continue;
    const models = parseModels(value);
    if (!models) continue;
    routes.set(envKeyToContext(key), models);
  }
  return routes;
}
async function resolveModels(context2) {
  if (!MODEL_ROUTING_ENABLED) return DEFAULT_MODELS;
  const routes = loadEnvRoutes();
  if (!context2) return routes.get("default") ?? DEFAULT_MODELS;
  const normalized = normalizeContext2(context2);
  const exact = routes.get(normalized);
  if (exact) return exact;
  const colonIdx = normalized.indexOf(":");
  if (colonIdx > 0) {
    const prefix = normalized.slice(0, colonIdx);
    const prefixResult = routes.get(prefix);
    if (prefixResult) return prefixResult;
  }
  return routes.get("default") ?? DEFAULT_MODELS;
}
var DEFAULT_MODELS, ENV_PREFIX, CONTROL_ENV_KEYS, MODEL_ROUTING_ENABLED;
var init_model_routing = __esm({
  "src/lib/llm/model-routing.ts"() {
    "use strict";
    DEFAULT_MODELS = [
      process.env.MODEL_ROUTING_DEFAULT || process.env.OLLAMA_MODEL || "ollama/gemma4:latest"
    ];
    ENV_PREFIX = "MODEL_ROUTING_";
    CONTROL_ENV_KEYS = /* @__PURE__ */ new Set(["MODEL_ROUTING_ENABLED"]);
    MODEL_ROUTING_ENABLED = process.env.MODEL_ROUTING_ENABLED !== "false";
  }
});

// src/lib/llm/client.ts
function normalizeModel(id) {
  if (id === "openrouter/auto") return id;
  if (id.startsWith("openrouter/")) return id.slice("openrouter/".length);
  return id;
}
function isGemma4Model(model) {
  return /^gemma4(:|$)/i.test(model);
}
function repairTruncatedJson(raw) {
  let s = raw.trim();
  if (!s.startsWith("{")) return {};
  const unescapedQuotes = s.match(/(?<!\\)"/g);
  if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
    s += '"';
  }
  s = s.replace(/,\s*$/, "");
  let braces = 0;
  let brackets = 0;
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && inString) {
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    else if (ch === "}") braces--;
    else if (ch === "[") brackets++;
    else if (ch === "]") brackets--;
  }
  for (let i = 0; i < brackets; i++) s += "]";
  for (let i = 0; i < braces; i++) s += "}";
  return JSON.parse(s);
}
function normalizeToolArgs(toolName, args) {
  const aliases = TOOL_PARAM_ALIASES[toolName];
  if (!aliases) return { normalized: args, remapped: {} };
  const normalized = { ...args };
  const remapped = {};
  for (const [variant, canonical] of Object.entries(aliases)) {
    if (variant in normalized && !(canonical in normalized)) {
      normalized[canonical] = normalized[variant];
      delete normalized[variant];
      remapped[variant] = canonical;
    }
  }
  return { normalized, remapped };
}
function requiredToolArgs(tool) {
  const required = tool.parameters.required;
  return Array.isArray(required) ? required.filter((v) => typeof v === "string") : [];
}
function missingRequiredToolArgs(tool, args) {
  return requiredToolArgs(tool).filter((key) => {
    const value = args[key];
    return value === void 0 || value === null || typeof value === "string" && value.trim().length === 0;
  });
}
async function warnOnLlamaLineQueue(baseUrl, context2) {
  if (!baseUrl) return;
  try {
    const url = new URL(baseUrl);
    const response = await fetch(`${url.origin}/broker/status`, {
      signal: AbortSignal.timeout(2e3)
    });
    if (!response.ok) return;
    const status = await response.json();
    const queueDepth = Number(status.queue_depth ?? 0);
    const logPayload = {
      queueDepth,
      maxDepth: status.max_depth,
      inFlightClient: status.in_flight_client,
      inFlightId: status.in_flight_id,
      ...context2
    };
    if (queueDepth >= LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH && LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH > 0) {
      log.warn("llama-line broker status before request", logPayload);
    } else {
      log.debug("llama-line broker status before request", logPayload);
    }
  } catch (err) {
    log.warn("Unable to read llama-line broker status before request", {
      error: err.message?.slice(0, 160),
      ...context2
    });
  }
}
function resolveOpenRouterModels(context2) {
  const explicit = (process.env.OPENROUTER_MODELS ?? "").split(",").map((model) => normalizeOpenRouterModel(model.trim())).filter(Boolean);
  if (explicit.length > 0) return explicit;
  const models = [OPENROUTER_DEFAULT_MODEL];
  if (/code|patch|agent_session/i.test(context2 ?? "")) models.push(OPENROUTER_CODER_MODEL);
  models.push(OPENROUTER_ESCALATION_MODEL);
  return [...new Set(models.map(normalizeOpenRouterModel).filter(Boolean))];
}
function getClient() {
  if (!_client) {
    if (!OPENROUTER_ENABLED || !OPENROUTER_API_KEY) {
      throw new Error(
        "OpenRouter is disabled or missing API key. Set OPENROUTER_ENABLED=true and OPENROUTER_API_KEY in .env"
      );
    }
    _client = new import_sdk.OpenRouter({ apiKey: OPENROUTER_API_KEY });
  }
  return _client;
}
function isAbortLikeError(error) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError" || error.message === "This operation was aborted" || error.message === "The operation was aborted due to timeout");
}
function shouldStopOllamaLocalFallback(spec, error) {
  return !spec.apiKey && isAbortLikeError(error);
}
function isLocalModelId(model) {
  if (!model) return false;
  const normalized = normalizeModel(model);
  if (normalized.startsWith("ollama/") && normalized.includes(":")) return true;
  return normalized.includes(":") && !normalized.includes("/");
}
function isLlamaLineRoutedModel(model) {
  if (!model) return false;
  const normalized = normalizeModel(model);
  return LLAMA_LINE_MODEL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
function isOllamaRoutedModel(model) {
  return isLocalModelId(model) || isLlamaLineRoutedModel(model);
}
function getDefaultOllamaToolModel() {
  const explicitToolModel = OLLAMA_TOOL_MODEL.trim();
  if (explicitToolModel) {
    if (isLocalModelId(explicitToolModel)) return normalizeModel(explicitToolModel);
    log.warn("Ignoring non-local OLLAMA_TOOL_MODEL for tool execution", {
      toolModel: explicitToolModel
    });
  }
  if (isLocalModelId(OLLAMA_MODEL)) return normalizeModel(OLLAMA_MODEL);
  const fallbackLocalModel = OLLAMA_FALLBACK_MODELS.find(isLocalModelId);
  if (fallbackLocalModel) return fallbackLocalModel;
  return DEFAULT_OLLAMA_FALLBACK_MODELS[0];
}
function resolveOllamaModelForToolRequest(model) {
  if (isLocalModelId(model)) return normalizeModel(model);
  const toolModel = getDefaultOllamaToolModel();
  if (model && isLlamaLineRoutedModel(model)) {
    log.info("Routing tool request away from llama-line OpenCode harness model", {
      requestedModel: model,
      toolModel
    });
  }
  return toolModel;
}
function resolvePreferredOllamaModel(model, hasTools) {
  if (hasTools) return resolveOllamaModelForToolRequest(model);
  return model && isOllamaRoutedModel(model) ? model : void 0;
}
function canUseOpenRouter() {
  return OPENROUTER_ENABLED && !!OPENROUTER_API_KEY;
}
function normalizeOpenRouterModel(model) {
  return normalizeModel(model).replace(/^openrouter\//, "");
}
function openRouterSessionId(trackingContext) {
  return trackingContext?.sessionId ?? trackingContext?.context;
}
function openRouterHeaders(trackingContext) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://subcorp.subcult.tv",
    "X-Title": "Subcorp"
  };
  const sessionId = openRouterSessionId(trackingContext);
  if (sessionId) headers["X-Session-Id"] = sessionId;
  return headers;
}
function withOpenRouterCacheFields(body, trackingContext) {
  const sessionId = openRouterSessionId(trackingContext);
  return sessionId ? { ...body, session_id: sessionId } : body;
}
function estimateOpenRouterCostUsd(model, promptTokens = 0, completionTokens = 0) {
  const pricing = OPENROUTER_PRICE_PER_MILLION[normalizeOpenRouterModel(model)];
  if (!pricing) return null;
  return (promptTokens * pricing.input + completionTokens * pricing.output) / 1e6;
}
async function getOpenRouterSpendUsd(period) {
  const interval = period === "day" ? "1 day" : "30 days";
  const rows = await sql`
        SELECT COALESCE(SUM(cost_usd), 0)::text AS spend
        FROM ops_llm_usage
        WHERE created_at >= NOW() - ${interval}::interval
          AND model NOT LIKE 'ollama/%'
    `;
  return Number.parseFloat(rows[0]?.spend ?? "0") || 0;
}
async function checkOpenRouterBudget(extraEstimatedUsd = 0) {
  if (!canUseOpenRouter()) {
    return { allowed: false, reason: "openrouter_disabled", dailySpend: 0, monthlySpend: 0 };
  }
  const [dailySpend, monthlySpend] = await Promise.all([
    getOpenRouterSpendUsd("day"),
    getOpenRouterSpendUsd("month")
  ]);
  if (OPENROUTER_DAILY_BUDGET_USD >= 0 && dailySpend + extraEstimatedUsd >= OPENROUTER_DAILY_BUDGET_USD) {
    return { allowed: false, reason: "openrouter_daily_budget_exceeded", dailySpend, monthlySpend };
  }
  if (OPENROUTER_MONTHLY_BUDGET_USD >= 0 && monthlySpend + extraEstimatedUsd >= OPENROUTER_MONTHLY_BUDGET_USD) {
    return { allowed: false, reason: "openrouter_monthly_budget_exceeded", dailySpend, monthlySpend };
  }
  return { allowed: true, reason: "openrouter_allowed", dailySpend, monthlySpend };
}
function shouldAllowOpenRouterAfterLocalFailure(localWasTried) {
  if (!canUseOpenRouter()) return false;
  if (!OPENROUTER_REQUIRE_LOCAL_FAILURE) return true;
  return localWasTried && OPENROUTER_ALLOW_AFTER_LOCAL_FAILURE;
}
function shouldTryOllamaFirst(model) {
  return !canUseOpenRouter() || isOllamaRoutedModel(model);
}
function getRemainingBudget(deadlineAt) {
  return Math.max(0, deadlineAt - Date.now());
}
function getOllamaAttemptTimeoutMs(opts) {
  const isPreferredTextAttempt = !opts.hasTools && !!opts.preferredModel && opts.model === opts.preferredModel;
  const isImplicitFirstLocalTextAttempt = !opts.hasTools && !opts.preferredModel && !!opts.isFirstLocalAttempt;
  const baseTimeoutMs = opts.hasTools ? OLLAMA_TOOL_TIMEOUT_MS : isImplicitFirstLocalTextAttempt ? OLLAMA_IMPLICIT_FIRST_LOCAL_TEXT_TIMEOUT_MS : isPreferredTextAttempt ? OLLAMA_PREFERRED_TEXT_TIMEOUT_MS : OLLAMA_TEXT_TIMEOUT_MS;
  return Math.min(baseTimeoutMs, opts.remainingBudgetMs);
}
async function withTimeout(label, timeoutMs, fn) {
  let timeoutId = null;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            Object.assign(new Error(`${label} timed out after ${timeoutMs}ms`), {
              statusCode: 504
            })
          );
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
async function getReachableLocalOllamaModels() {
  if (!OLLAMA_LOCAL_URL) return null;
  const cached = ollamaModelCatalogCache;
  if (cached && cached.baseUrl === OLLAMA_LOCAL_URL && Date.now() - cached.ts < OLLAMA_MODEL_CACHE_TTL_MS) {
    return cached.models;
  }
  try {
    const tagsHeaders = {};
    if (OLLAMA_API_KEY) tagsHeaders["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    const response = await fetch(`${OLLAMA_LOCAL_URL}/api/tags`, {
      headers: tagsHeaders,
      signal: AbortSignal.timeout(OLLAMA_TAGS_TIMEOUT_MS)
    });
    if (!response.ok) {
      log.warn("Ollama model catalog probe failed", {
        baseUrl: OLLAMA_LOCAL_URL,
        status: response.status
      });
      return null;
    }
    const data = await response.json();
    const models = new Set(
      (data.models ?? []).map((entry) => entry.name?.trim()).filter((name) => Boolean(name))
    );
    ollamaModelCatalogCache = {
      baseUrl: OLLAMA_LOCAL_URL,
      models,
      ts: Date.now()
    };
    return models;
  } catch (error) {
    log.warn("Ollama model catalog probe exception", {
      baseUrl: OLLAMA_LOCAL_URL,
      error: error.message?.slice(0, 200)
    });
    return null;
  }
}
async function filterReachableLocalOllamaModels(models) {
  if (!OLLAMA_LOCAL_URL || models.length === 0) return [];
  const reachableModels = await getReachableLocalOllamaModels();
  if (!reachableModels) {
    log.warn("Skipping local Ollama fallback because catalog probe failed", {
      baseUrl: OLLAMA_LOCAL_URL,
      requestedModels: models.map((spec) => spec.model)
    });
    return [];
  }
  const filtered = models.filter((spec) => reachableModels.has(spec.model));
  const skipped = models.filter((spec) => !reachableModels.has(spec.model)).map((spec) => spec.model);
  if (skipped.length > 0) {
    log.info("Skipping unavailable local Ollama models", {
      baseUrl: OLLAMA_LOCAL_URL,
      skipped
    });
  }
  return filtered;
}
function getOllamaModels() {
  return getOllamaModelsWithFallback();
}
function dedupeModelSpecs(models) {
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const model of models) {
    const key = `${model.baseUrl}::${model.model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(model);
  }
  return deduped;
}
function getOllamaModelsWithFallback(preferredModel) {
  const localModels = [];
  if (OLLAMA_LOCAL_URL) {
    const localModelIds = preferredModel ? [preferredModel] : OLLAMA_MODEL ? [OLLAMA_MODEL] : OLLAMA_FALLBACK_MODELS;
    for (const model of localModelIds) {
      localModels.push({ model, baseUrl: OLLAMA_LOCAL_URL, apiKey: OLLAMA_API_KEY || void 0 });
    }
  }
  return dedupeModelSpecs(localModels);
}
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/<\|channel>thought\n[\s\S]*?<channel\|>/g, "").trim();
}
function normalizeDsml(text) {
  return text.replace(/<[｜|]DSML[｜|]/g, "<").replace(/<\/[｜|]DSML[｜|]/g, "</");
}
async function tryOllamaFirst(messages, temperature, maxTokens, startTime, trackingContext, modelOverride, deadlineAt) {
  if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;
  let ollamaModel = modelOverride;
  if (!ollamaModel && trackingContext?.context) {
    try {
      const routed = await resolveModels(trackingContext.context);
      const ollamaCandidate = routed.find((m) => m.includes(":"));
      if (ollamaCandidate) ollamaModel = ollamaCandidate;
    } catch {
    }
  }
  const maxAttempts = 1 + OLLAMA_EMPTY_RETRY_COUNT;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (deadlineAt && getRemainingBudget(deadlineAt) <= 1e3) break;
    const attemptMessages = attempt === 1 ? messages : [
      ...messages,
      {
        role: "user",
        content: "The previous generation attempt returned no usable text. Retry now and produce a concrete, complete response. Do not return an empty message."
      }
    ];
    const ollamaResult = await ollamaChat(attemptMessages, temperature, {
      maxTokens,
      model: ollamaModel,
      deadlineAt,
      trackingContext
    });
    if (ollamaResult?.text) {
      log.debug("Ollama succeeded", {
        model: ollamaResult.model,
        context: trackingContext?.context,
        textLength: ollamaResult.text.length,
        attempt
      });
      void trackUsage(
        `ollama/${ollamaResult.model}`,
        toOpenResponsesUsage(ollamaResult.usage),
        Date.now() - startTime,
        trackingContext
      );
      return ollamaResult.text;
    }
    if (attempt < maxAttempts) {
      log.warn("Ollama returned empty; retrying once before provider fallback", {
        context: trackingContext?.context,
        agentId: trackingContext?.agentId,
        attempt,
        maxAttempts,
        remainingBudgetMs: deadlineAt ? getRemainingBudget(deadlineAt) : void 0
      });
    }
  }
  log.debug("Ollama returned empty, falling through to OpenRouter", {
    context: trackingContext?.context,
    ollamaModels: getOllamaModels().map((m) => m.model)
  });
  return null;
}
async function tryOllamaLastResort(messages, temperature, maxTokens, startTime, trackingContext, deadlineAt) {
  if (!OLLAMA_API_KEY && !OLLAMA_LOCAL_URL) return null;
  const retryResult = await ollamaChat(messages, temperature, {
    maxTokens,
    deadlineAt,
    trackingContext
  });
  if (retryResult?.text) {
    void trackUsage(
      `ollama/${retryResult.model}`,
      toOpenResponsesUsage(retryResult.usage),
      Date.now() - startTime,
      trackingContext
    );
    return retryResult.text;
  }
  return null;
}
function throwForOpenRouterStatus(statusCode) {
  if (statusCode === 402) {
    throw new Error("Insufficient OpenRouter credits \u2014 add credits at openrouter.ai");
  }
  if (statusCode === 429) {
    throw new Error("OpenRouter rate limited \u2014 try again shortly");
  }
}
function toOpenResponsesUsage(usage) {
  if (!usage) return null;
  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? 0
  };
}
function parseAndNormalizeToolArgs(toolName, rawArgsInput, model, round) {
  const rawArgs = typeof rawArgsInput === "string" ? rawArgsInput : JSON.stringify(rawArgsInput);
  let args;
  try {
    args = JSON.parse(rawArgs);
    log.debug("Parsed tool call args", {
      tool: toolName,
      argsKeys: Object.keys(args),
      model,
      round
    });
  } catch {
    try {
      args = repairTruncatedJson(rawArgs);
      log.warn("Repaired truncated tool call JSON", {
        tool: toolName,
        argsKeys: Object.keys(args),
        original: rawArgs.slice(0, 200),
        model
      });
    } catch {
      log.warn("Unrecoverable malformed tool call JSON", {
        tool: toolName,
        arguments: rawArgs.slice(0, 200),
        model
      });
      args = {};
    }
  }
  const { normalized, remapped } = normalizeToolArgs(toolName, args);
  if (Object.keys(remapped).length > 0) {
    log.info("Normalized tool call param aliases", {
      tool: toolName,
      remapped,
      model,
      round
    });
  }
  return { args: normalized, remapped };
}
function filterPhantomToolCalls(toolCalls, context2) {
  if (!toolCalls || toolCalls.length === 0) return void 0;
  const validCalls = toolCalls.filter(
    (tc) => tc.function?.name && typeof tc.function.name === "string"
  );
  if (validCalls.length < toolCalls.length) {
    log.warn("Filtered out tool calls with null/empty names", {
      original: toolCalls.length,
      valid: validCalls.length,
      model: context2.model,
      round: context2.round,
      context: context2.trackingContext
    });
    return validCalls.length > 0 ? validCalls : void 0;
  }
  return toolCalls;
}
async function ollamaChat(messages, temperature, options) {
  const hasTools = !!options?.tools?.length;
  const preferredModel = resolvePreferredOllamaModel(options?.model, hasTools);
  const models = getOllamaModelsWithFallback(preferredModel);
  if (models.length === 0) return null;
  const maxTokens = options?.maxTokens ?? OLLAMA_DEFAULT_MAX_TOKENS;
  const tools = options?.tools;
  const maxToolRounds = options?.maxToolRounds ?? 10;
  const deadlineAt = options?.deadlineAt ?? Date.now() + OLLAMA_BUDGET_MS;
  const openaiTools = tools && tools.length > 0 ? tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  })) : void 0;
  const cloudModels = models.filter((spec) => !!spec.apiKey);
  const localModels = await filterReachableLocalOllamaModels(
    models.filter((spec) => !spec.apiKey)
  );
  const candidateModels = [...cloudModels, ...localModels];
  let stopLocalFallback = false;
  if (candidateModels.length === 0) {
    log.warn("No reachable Ollama chat models available", {
      preferredModel,
      hasLocalUrl: !!OLLAMA_LOCAL_URL,
      hasCloudKey: !!OLLAMA_API_KEY
    });
    return null;
  }
  for (const [index, spec] of candidateModels.entries()) {
    if (stopLocalFallback && !spec.apiKey) {
      log.warn("Skipping remaining local Ollama fallback models after abort-like failure", {
        model: spec.model,
        preferredModel
      });
      continue;
    }
    if (getRemainingBudget(deadlineAt) <= 0) {
      log.warn("Ollama fallback budget exhausted", {
        attemptedModels: candidateModels.map((candidate) => candidate.model),
        maxToolRounds,
        hasTools: !!tools?.length
      });
      return null;
    }
    const attempt = await ollamaChatWithModel({
      spec,
      messages,
      temperature,
      maxTokens,
      tools,
      openaiTools,
      maxToolRounds,
      deadlineAt,
      preferredModel,
      isFirstLocalAttempt: !spec.apiKey && index === 0,
      trackingContext: options?.trackingContext
    });
    if (attempt.result) return attempt.result;
    if (attempt.stopLocalFallback) {
      stopLocalFallback = true;
      log.warn("Stopping local Ollama fallback cascade after abort-like failure", {
        model: spec.model,
        preferredModel
      });
    }
  }
  return null;
}
async function parseOllamaSseResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || !text.includes("data: ")) {
    try {
      return JSON.parse(text);
    } catch (err) {
      log.warn("Ollama JSON response parse failed", {
        contentType,
        bodyPreview: text.slice(0, 300),
        error: err.message
      });
    }
  }
  const lines = text.split("\n");
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    let parsed;
    try {
      parsed = JSON.parse(payload);
    } catch {
      continue;
    }
    if (parsed["status"] === "ollama_unavailable" || parsed["status"] === "dropped_by_admin") {
      const message = typeof parsed["message"] === "string" ? `: ${parsed["message"]}` : "";
      const requestId = typeof parsed["request_id"] === "string" ? ` request_id=${parsed["request_id"]}` : "";
      throw new Error(`llama-line broker error: ${parsed["status"]}${requestId}${message}`);
    }
    if (typeof parsed["status"] === "string") {
      if (parsed["status"] === "queued") {
        log.debug("llama-line request queued", {
          requestId: parsed["request_id"],
          position: parsed["position"],
          waitSeconds: parsed["wait_seconds"]
        });
      }
      continue;
    }
    return parsed;
  }
  throw new Error("No valid response found in llama-line SSE stream");
}
async function ollamaChatWithModel(input) {
  const {
    spec,
    messages,
    temperature,
    maxTokens,
    tools,
    openaiTools,
    maxToolRounds,
    deadlineAt,
    preferredModel,
    isFirstLocalAttempt,
    trackingContext
  } = input;
  const { model, baseUrl, apiKey } = spec;
  const toolCallRecords = [];
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const workingMessages = messages.map((m) => ({
    role: m.role,
    content: m.content
  }));
  for (let round = 0; round <= maxToolRounds; round++) {
    try {
      const remainingBudgetMs = getRemainingBudget(deadlineAt);
      if (remainingBudgetMs <= 0) {
        log.warn("Ollama attempt budget exhausted", {
          model,
          round,
          maxToolRounds
        });
        return { result: null };
      }
      const controller = new AbortController();
      const attemptTimeoutMs = getOllamaAttemptTimeoutMs({
        hasTools: !!openaiTools,
        remainingBudgetMs,
        model,
        preferredModel,
        isFirstLocalAttempt
      });
      const timeoutId = setTimeout(
        () => controller.abort(),
        attemptTimeoutMs
      );
      const estimatedTokens = workingMessages.reduce(
        (sum, m) => sum + Math.ceil((m.content ?? "").length / 3.5),
        0
      );
      const numCtx = Math.min(131072, Math.max(8192, Math.ceil((estimatedTokens + maxTokens + 2048) / 4096) * 4096));
      const body = {
        model,
        messages: workingMessages,
        stream: false,
        options: {
          // Gemma 4: use 1.0 for text generation, but 0.7 for tool calling
          // to keep tool use focused and reduce thinking-block leakage
          temperature: isGemma4Model(model) ? openaiTools ? 0.7 : 1 : temperature,
          num_ctx: numCtx,
          ...isGemma4Model(model) ? { top_k: 64, top_p: 0.95 } : {},
          ...isGemma4Model(model) ? {} : { num_predict: maxTokens }
        }
      };
      if (openaiTools && round < maxToolRounds) {
        body.tools = openaiTools;
      } else if (openaiTools && round >= maxToolRounds) {
        body.tools = openaiTools;
        body.tool_choice = "none";
      }
      await warnOnLlamaLineQueue(baseUrl, {
        model,
        round,
        agentId: trackingContext?.agentId,
        sessionId: trackingContext?.sessionId
      });
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        log.warn("Ollama model HTTP error", {
          model,
          baseUrl,
          status: response.status,
          statusText: response.statusText
        });
        return { result: null };
      }
      const rawData = await parseOllamaSseResponse(response);
      const choice = rawData.choices?.[0];
      const msg = rawData.message ?? choice?.message;
      const finishReason = rawData.done_reason === "stop" || choice?.finish_reason === "stop" || rawData.done && !msg?.tool_calls?.length ? "stop" : msg?.tool_calls?.length ? "tool_calls" : "stop";
      const data = {
        usage: {
          prompt_tokens: rawData.usage?.prompt_tokens ?? rawData.prompt_eval_count ?? 0,
          completion_tokens: rawData.usage?.completion_tokens ?? rawData.eval_count ?? 0,
          total_tokens: rawData.usage?.total_tokens ?? (rawData.prompt_eval_count ?? 0) + (rawData.eval_count ?? 0)
        }
      };
      log.debug("Ollama raw response", {
        model,
        round,
        finishReason,
        contentLength: (msg?.content ?? "").length,
        thinkingLength: (msg?.thinking ?? "").length,
        reasoningLength: (msg?.reasoning ?? "").length,
        contentPreview: (msg?.content ?? "").slice(0, 80) || "(empty)",
        hasToolCalls: !!msg?.tool_calls?.length,
        usage: data.usage
      });
      if (!msg) {
        log.warn("Ollama model returned no message", {
          model,
          hasMessage: !!msg
        });
        return { result: null };
      }
      const rawToolCalls = msg.tool_calls?.map((tc, i) => ({
        id: tc.id ?? `call_${round}_${i}`,
        function: tc.function
      }));
      let ollamaPendingToolCalls = filterPhantomToolCalls(
        rawToolCalls,
        { model, round }
      );
      if (!ollamaPendingToolCalls || ollamaPendingToolCalls.length === 0) {
        const raw = msg.content ?? "";
        if (tools && tools.length > 0 && raw.length > 0) {
          const dsmlCalls = parseDsmlToolCalls(raw, tools);
          if (dsmlCalls.length > 0) {
            ollamaPendingToolCalls = dsmlCalls;
            log.info("Recovered Ollama tool calls from DSML text", {
              count: dsmlCalls.length,
              tools: dsmlCalls.map((tc) => tc.function.name),
              model,
              round
            });
          }
        }
      }
      if (!ollamaPendingToolCalls || ollamaPendingToolCalls.length === 0) {
        const raw = msg.content ?? "";
        const thinking = msg.thinking ?? msg.reasoning ?? "";
        const stripped = extractFromXml(stripThinking(raw)).trim();
        const text = stripped.length > 0 ? stripped : extractFromXml(raw).trim();
        if (text.length === 0 && toolCallRecords.length === 0) {
          incLlmEmptyText({
            provider: "ollama",
            context: trackingContext?.context,
            agentId: trackingContext?.agentId
          });
          log.warn("Ollama model returned empty text", {
            model,
            doneReason: rawData.done_reason,
            rawContentLength: raw.length,
            thinkingLength: thinking.length,
            rawPreview: (raw || thinking).slice(0, 100) || "(empty)"
          });
          return { result: null };
        }
        return {
          result: {
            text,
            toolCalls: toolCallRecords,
            model,
            usage: data.usage
          }
        };
      }
      log.debug("Ollama tool calls received", {
        model,
        round,
        toolCount: ollamaPendingToolCalls.length,
        toolNames: ollamaPendingToolCalls.map((tc) => tc.function.name)
      });
      workingMessages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: ollamaPendingToolCalls
      });
      for (const tc of ollamaPendingToolCalls) {
        const tool = tools?.find((t) => t.name === tc.function.name);
        let resultStr;
        if (tool?.execute) {
          const { args } = parseAndNormalizeToolArgs(
            tc.function.name,
            tc.function.arguments,
            model,
            round
          );
          const missingArgs = missingRequiredToolArgs(tool, args);
          if (missingArgs.length > 0) {
            const result2 = {
              error: `Invalid tool arguments: missing required parameter(s): ${missingArgs.join(", ")}`,
              expected: requiredToolArgs(tool),
              received: Object.keys(args)
            };
            log.warn("Ollama tool call missing required args", {
              tool: tc.function.name,
              missingArgs,
              argsKeys: Object.keys(args),
              model,
              round
            });
            toolCallRecords.push({
              name: tool.name,
              arguments: args,
              result: result2
            });
            resultStr = JSON.stringify(result2);
            workingMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: resultStr
            });
            continue;
          }
          log.debug("Ollama executing tool call", {
            tool: tc.function.name,
            argsKeys: Object.keys(args),
            model,
            round
          });
          const result = await tool.execute(args);
          log.debug("Ollama tool call executed", {
            tool: tc.function.name,
            resultType: typeof result,
            resultPreview: typeof result === "string" ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100),
            model,
            round
          });
          toolCallRecords.push({
            name: tool.name,
            arguments: args,
            result
          });
          resultStr = typeof result === "string" ? result : JSON.stringify(result);
        } else {
          log.warn("Ollama tool not found for call", {
            tool: tc.function.name,
            availableTools: tools?.map((t) => t.name) ?? [],
            model
          });
          const availableNames = tools?.map((t) => t.name).join(", ") ?? "none";
          resultStr = `ERROR: Tool "${tc.function.name}" does not exist. Available tools: ${availableNames}. Use ONLY these exact tool names.`;
          toolCallRecords.push({
            name: tc.function.name || "unknown_tool",
            arguments: {},
            result: { error: resultStr }
          });
        }
        workingMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: resultStr
        });
      }
    } catch (err) {
      log.warn("Ollama chat exception", {
        model,
        round,
        error: err.message?.slice(0, 200)
      });
      return {
        result: null,
        ...shouldStopOllamaLocalFallback(spec, err) ? { stopLocalFallback: true } : {}
      };
    }
  }
  return {
    result: {
      text: "",
      toolCalls: toolCallRecords,
      model,
      usage: void 0
    }
  };
}
function jsonSchemaPropToZod(prop) {
  const enumValues = prop.enum;
  let zodType;
  switch (prop.type) {
    case "string":
      zodType = enumValues && enumValues.length > 0 ? import_v4.z.enum(enumValues) : import_v4.z.string();
      break;
    case "number":
      zodType = import_v4.z.number();
      break;
    case "integer":
      zodType = import_v4.z.number().int();
      break;
    case "boolean":
      zodType = import_v4.z.boolean();
      break;
    default:
      zodType = import_v4.z.unknown();
      break;
  }
  if (prop.description && typeof prop.description === "string") {
    zodType = zodType.describe(prop.description);
  }
  return zodType;
}
function jsonSchemaToZod(schema) {
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];
  const entries = Object.entries(properties).map(([key, prop]) => {
    const base = jsonSchemaPropToZod(prop);
    return [key, required.includes(key) ? base : base.optional()];
  });
  return import_v4.z.object(Object.fromEntries(entries));
}
async function openRouterChatCompletions(model, messages, temperature, maxTokens, trackingContext, deadlineAt) {
  const remainingBudgetMs = deadlineAt ? getRemainingBudget(deadlineAt) : OPENROUTER_CHAT_TIMEOUT_MS;
  if (remainingBudgetMs <= 0) {
    log.warn("Skipping direct /chat/completions fallback because request budget is exhausted", {
      model
    });
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    Math.min(OPENROUTER_CHAT_TIMEOUT_MS, remainingBudgetMs)
  );
  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: openRouterHeaders(trackingContext),
        body: JSON.stringify(withOpenRouterCacheFields({
          model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
          })),
          temperature,
          max_tokens: Math.min(maxTokens, OPENROUTER_MAX_TOKENS)
        }, trackingContext)),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) {
      log.warn("Direct /chat/completions HTTP error", {
        model,
        status: response.status
      });
      return null;
    }
    const data = await response.json();
    const text = extractFromXml(
      (data.choices?.[0]?.message?.content ?? "").trim()
    );
    return text.length > 0 ? text : null;
  } catch (err) {
    clearTimeout(timeoutId);
    log.warn("Direct /chat/completions exception", {
      model,
      error: err.message?.slice(0, 200)
    });
    return null;
  }
}
function toOpenRouterTools(tools) {
  return tools.map((tool) => ({
    type: import_sdk.ToolType.Function,
    function: {
      name: tool.name,
      description: tool.description,
      inputSchema: jsonSchemaToZod(tool.parameters),
      ...tool.execute ? {
        execute: async (params) => {
          const result = await tool.execute(params);
          return result;
        }
      } : {}
    }
  }));
}
async function trackUsage(model, usage, durationMs, trackingContext) {
  try {
    const agentId = trackingContext?.agentId ?? "unknown";
    const context2 = trackingContext?.context ?? "unknown";
    const sessionId = trackingContext?.sessionId ?? null;
    await sql`
            INSERT INTO ops_llm_usage (
                model,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost_usd,
                agent_id,
                context,
                session_id,
                duration_ms
            ) VALUES (
                ${model},
                ${usage?.inputTokens ?? null},
                ${usage?.outputTokens ?? null},
                ${usage?.totalTokens ?? null},
                ${usage?.cost ?? null},
                ${agentId},
                ${context2},
                ${sessionId},
                ${durationMs}
            )
        `;
  } catch (error) {
    log.error("Failed to track LLM usage", {
      error,
      model,
      trackingContext
    });
  }
}
async function llmGenerate(options) {
  const {
    messages,
    temperature = 0.7,
    maxTokens = 4e3,
    model,
    tools,
    trackingContext
  } = options;
  const startTime = Date.now();
  const totalDeadlineAt = startTime + LLM_TEXT_TOTAL_BUDGET_MS;
  log.debug("llmGenerate starting", {
    hasTools: !!(tools && tools.length > 0),
    messageCount: messages.length,
    model: model ?? "auto",
    maxTokens,
    temperature,
    context: trackingContext?.context,
    agentId: trackingContext?.agentId
  });
  const systemMessage = messages.find((m) => m.role === "system");
  const conversationMessages = messages.filter((m) => m.role !== "system");
  let resolvedOllamaModel = model;
  let localWasTried = false;
  if (!resolvedOllamaModel && trackingContext?.context) {
    try {
      const routed = await resolveModels(trackingContext.context);
      const ollamaCandidate = routed.find((m) => m.includes(":"));
      if (ollamaCandidate) resolvedOllamaModel = ollamaCandidate;
    } catch {
    }
  }
  const preferOllamaFirst = shouldTryOllamaFirst(resolvedOllamaModel);
  const hasToolsDefined = tools && tools.length > 0;
  if (preferOllamaFirst) {
    localWasTried = true;
    const ollamaText = await tryOllamaFirst(
      messages,
      temperature,
      maxTokens,
      startTime,
      trackingContext,
      resolvedOllamaModel,
      totalDeadlineAt
    );
    if (ollamaText) return ollamaText;
    if (isOllamaRoutedModel(resolvedOllamaModel) && !shouldAllowOpenRouterAfterLocalFailure(localWasTried)) {
      log.warn("Explicit Ollama/llama-line model request failed; cloud fallback disallowed by policy", {
        model: resolvedOllamaModel,
        context: trackingContext?.context
      });
      return "";
    }
  }
  if (!shouldAllowOpenRouterAfterLocalFailure(localWasTried)) {
    incLlmEmptyText({
      provider: "ollama",
      context: trackingContext?.context,
      agentId: trackingContext?.agentId
    });
    log.warn("Ollama returned empty and OpenRouter fallback is disabled by policy", {
      context: trackingContext?.context,
      agentId: trackingContext?.agentId,
      ollamaAvailable: !!(OLLAMA_API_KEY || OLLAMA_LOCAL_URL),
      durationMs: Date.now() - startTime
    });
    return "";
  }
  const budget = await checkOpenRouterBudget();
  if (!budget.allowed) {
    log.warn("Skipping OpenRouter fallback due to budget guardrail", {
      reason: budget.reason,
      dailySpend: budget.dailySpend,
      monthlySpend: budget.monthlySpend,
      context: trackingContext?.context,
      agentId: trackingContext?.agentId
    });
    return "";
  }
  const client = getClient();
  const resolved = model && !isOllamaRoutedModel(model) ? [normalizeModel(model)] : resolveOpenRouterModels(trackingContext?.context);
  const modelList = resolved.slice(0, MAX_MODELS_ARRAY);
  if (modelList.length === 0) {
    throw new Error("No LLM models available after resolution");
  }
  const openRouterDeadlineAt = Math.min(
    totalDeadlineAt,
    Date.now() + OPENROUTER_TEXT_BUDGET_MS
  );
  const buildCallOpts = (spec) => {
    const isArray = Array.isArray(spec);
    const opts = {
      ...isArray ? { models: spec } : { model: spec },
      ...isArray ? { provider: { allowFallbacks: true } } : {},
      ...systemMessage ? { instructions: systemMessage.content } : {},
      input: conversationMessages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      temperature,
      maxOutputTokens: Math.min(maxTokens, OPENROUTER_MAX_TOKENS),
      ...withOpenRouterCacheFields({}, trackingContext)
    };
    if (tools && tools.length > 0) {
      opts.tools = toOpenRouterTools(tools);
      opts.maxToolRounds = options.maxToolRounds ?? 3;
    }
    return opts;
  };
  async function tryCall(spec) {
    const remainingBudgetMs = getRemainingBudget(openRouterDeadlineAt);
    if (remainingBudgetMs <= 0) {
      throw Object.assign(new Error("OpenRouter text budget exhausted"), {
        statusCode: 504
      });
    }
    const timeoutMs = Math.min(OPENROUTER_TEXT_TIMEOUT_MS, remainingBudgetMs);
    const { rawText, response } = await withTimeout(
      "OpenRouter text call",
      timeoutMs,
      async () => {
        const result = client.callModel(
          buildCallOpts(spec)
        );
        const [textResult, responseResult] = await Promise.all([
          result.getText(),
          result.getResponse()
        ]);
        return {
          rawText: textResult?.trim() ?? "",
          response: responseResult
        };
      }
    );
    const text = extractFromXml(rawText);
    const durationMs = Date.now() - startTime;
    const usedModel = response.model || "unknown";
    const usage = response.usage;
    void trackUsage(`openrouter/${normalizeOpenRouterModel(usedModel)}`, usage, durationMs, trackingContext);
    if (text.length === 0) {
      incLlmEmptyText({
        provider: "openrouter",
        context: trackingContext?.context,
        agentId: trackingContext?.agentId
      });
      log.warn("LLM returned empty text", {
        model: usedModel,
        context: trackingContext?.context,
        rawTextLength: rawText.length,
        rawTextPreview: rawText.slice(0, 100) || "(empty)",
        outputTokens: usage?.outputTokens ?? 0,
        durationMs
      });
    }
    return text.length > 0 ? text : null;
  }
  const openRouterResult = await tryOpenRouterArray(tryCall, modelList, trackingContext?.context);
  if (!openRouterResult.text) {
    const individualText = await tryOpenRouterIndividual(
      tryCall,
      resolved,
      openRouterResult.error,
      openRouterDeadlineAt,
      trackingContext?.context
    );
    if (individualText) return individualText;
  } else {
    return openRouterResult.text;
  }
  if (!preferOllamaFirst && openRouterResult.error && !hasToolsDefined) {
    log.debug("OpenRouter failed, retrying Ollama as last resort", {
      error: openRouterResult.error.message,
      statusCode: openRouterResult.error.statusCode
    });
    const ollamaText = await tryOllamaLastResort(
      messages,
      temperature,
      maxTokens,
      startTime,
      trackingContext,
      totalDeadlineAt
    );
    if (ollamaText) return ollamaText;
  }
  throwForOpenRouterStatus(openRouterResult.error?.statusCode);
  if (canUseOpenRouter() && !hasToolsDefined) {
    const chatText = await tryDirectChatCompletions(
      resolved,
      messages,
      temperature,
      maxTokens,
      startTime,
      trackingContext,
      totalDeadlineAt
    );
    if (chatText) return chatText;
  }
  log.warn("All LLM providers returned empty", {
    context: trackingContext?.context,
    agentId: trackingContext?.agentId,
    ollamaAvailable: !!(OLLAMA_API_KEY || OLLAMA_LOCAL_URL),
    openRouterModels: resolved,
    hadOpenRouterError: !!openRouterResult.error,
    durationMs: Date.now() - startTime
  });
  return "";
}
async function tryOpenRouterArray(tryCall, modelList, context2) {
  try {
    const text = await tryCall(modelList);
    if (text) return { text, error: null };
    log.debug("OpenRouter models array returned empty", { models: modelList, context: context2 });
    return { text: null, error: null };
  } catch (error) {
    const err = error;
    log.warn("OpenRouter models array failed", {
      statusCode: err.statusCode,
      error: err.message?.slice(0, 200),
      models: modelList,
      context: context2
    });
    if (err.statusCode === 401) {
      throw new Error("Invalid OpenRouter API key \u2014 check your OPENROUTER_API_KEY");
    }
    return { text: null, error: err };
  }
}
async function tryOpenRouterIndividual(tryCall, resolved, openRouterError, deadlineAt, context2) {
  if (openRouterError?.statusCode === 402 || openRouterError?.statusCode === 429) {
    return null;
  }
  const fallbackModels = (openRouterError ? resolved : resolved.slice(MAX_MODELS_ARRAY)).slice(
    0,
    OPENROUTER_MAX_INDIVIDUAL_FALLBACKS
  );
  for (const fallback of fallbackModels) {
    if (getRemainingBudget(deadlineAt) <= 0) {
      log.warn("OpenRouter individual fallback budget exhausted", {
        context: context2,
        attemptedModels: fallbackModels
      });
      return null;
    }
    try {
      const text = await tryCall(fallback);
      if (text) return text;
    } catch (fbErr) {
      log.warn("OpenRouter individual fallback failed", {
        model: fallback,
        error: fbErr.message?.slice(0, 200),
        context: context2
      });
    }
  }
  return null;
}
async function tryDirectChatCompletions(resolved, messages, temperature, maxTokens, startTime, trackingContext, deadlineAt) {
  const chatModel = resolved[0] ?? "deepseek/deepseek-v3.2";
  try {
    const chatResult = await openRouterChatCompletions(
      chatModel,
      messages,
      temperature,
      maxTokens,
      trackingContext,
      deadlineAt
    );
    if (chatResult) {
      log.info("Recovered via direct /chat/completions fallback", {
        model: chatModel,
        context: trackingContext?.context,
        textLength: chatResult.length
      });
      void trackUsage(`openrouter/${normalizeOpenRouterModel(chatModel)}`, null, Date.now() - startTime, trackingContext);
      return chatResult;
    }
  } catch (chatErr) {
    log.warn("Direct /chat/completions fallback failed", {
      model: chatModel,
      error: chatErr.message?.slice(0, 200)
    });
  }
  return null;
}
async function executeToolCall(tc, tools, toolCallRecords, model, round) {
  const tool = tools.find((t) => t.name === tc.function.name);
  if (!tool?.execute) {
    const availableNames = tools.map((t) => t.name).join(", ");
    return `ERROR: Tool "${tc.function.name}" does not exist. Available tools: ${availableNames}. Use ONLY these exact tool names.`;
  }
  const { args } = parseAndNormalizeToolArgs(
    tc.function.name,
    tc.function.arguments,
    model,
    round
  );
  const required = tool.parameters?.required ?? [];
  const missing = required.filter((p) => !(p in args) || args[p] == null);
  if (missing.length > 0) {
    log.warn(
      "Tool call missing required params after parse/repair/normalize",
      {
        tool: tc.function.name,
        missing,
        argsKeys: Object.keys(args),
        model,
        round
      }
    );
    return JSON.stringify({
      error: `Missing required parameters: ${missing.join(", ")}. Your tool call output was truncated before these fields were emitted. If writing long content, split into smaller chunks using the "append" parameter or reduce the content length.`
    });
  }
  log.debug("Executing tool call", {
    tool: tc.function.name,
    argsKeys: Object.keys(args),
    round,
    model
  });
  const result = await tool.execute(args);
  log.debug("Tool call executed", {
    tool: tc.function.name,
    resultType: typeof result,
    resultPreview: typeof result === "string" ? result.slice(0, 100) : JSON.stringify(result).slice(0, 100),
    round,
    model
  });
  toolCallRecords.push({ name: tool.name, arguments: args, result });
  return typeof result === "string" ? result : JSON.stringify(result);
}
function toOpenRouterChatUsage(model, usage) {
  if (!usage) return null;
  const inputTokens = usage.prompt_tokens ?? 0;
  const outputTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? inputTokens + outputTokens;
  const estimatedCost = usage.cost ?? estimateOpenRouterCostUsd(model, inputTokens, outputTokens) ?? void 0;
  return {
    inputTokens,
    outputTokens,
    totalTokens,
    cost: estimatedCost
  };
}
async function openRouterToolLoop(opts) {
  const {
    messages: workingMessages,
    tools,
    openaiTools,
    modelList,
    temperature,
    maxTokens,
    maxToolRounds,
    trackingContext,
    startTime
  } = opts;
  const toolCallRecords = [];
  let lastModel = "unknown";
  let lastUsage = null;
  let bestText = "";
  const deadlineAt = Math.min(
    opts.deadlineAt ?? Number.MAX_SAFE_INTEGER,
    startTime + OPENROUTER_TOOL_BUDGET_MS
  );
  for (let round = 0; round <= maxToolRounds; round++) {
    const remainingBudgetMs = getRemainingBudget(deadlineAt);
    if (remainingBudgetMs <= 0) {
      log.warn("OpenRouter tool loop budget exhausted", {
        round,
        maxToolRounds,
        context: trackingContext?.context,
        modelList
      });
      break;
    }
    log.debug("Tool round starting", {
      round,
      maxToolRounds,
      workingMessageCount: workingMessages.length,
      toolCallRecordsSoFar: toolCallRecords.length,
      context: trackingContext?.context
    });
    const body = {
      messages: workingMessages,
      temperature,
      max_tokens: Math.min(maxTokens, OPENROUTER_MAX_TOKENS)
    };
    Object.assign(body, withOpenRouterCacheFields({}, trackingContext));
    if (modelList.length > 1) {
      body.models = modelList;
      body.provider = { allow_fallbacks: true };
    } else {
      body.model = modelList[0];
    }
    if (openaiTools.length > 0) {
      body.tools = openaiTools;
      if (round >= maxToolRounds) {
        body.tool_choice = "none";
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      Math.min(OPENROUTER_TOOL_TIMEOUT_MS, remainingBudgetMs)
    );
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: openRouterHeaders(trackingContext),
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      const statusCode = response.status;
      throw Object.assign(
        new Error(
          `OpenRouter API error: ${statusCode} ${errBody.slice(0, 200)}`
        ),
        { statusCode }
      );
    }
    const data = await response.json();
    lastModel = data.model ?? "unknown";
    if (data.usage) {
      lastUsage = toOpenRouterChatUsage(lastModel, data.usage);
    }
    const msg = data.choices?.[0]?.message;
    if (!msg) {
      log.warn("OpenRouter returned empty message", {
        round,
        model: lastModel
      });
      break;
    }
    let pendingToolCalls = filterPhantomToolCalls(msg.tool_calls, {
      model: lastModel,
      round,
      trackingContext: trackingContext?.context
    });
    log.debug("API response received", {
      round,
      model: lastModel,
      hasContent: !!msg.content,
      contentLength: msg.content?.length ?? 0,
      contentPreview: msg.content?.slice(0, 150) || "(empty)",
      apiToolCallCount: pendingToolCalls?.length ?? 0,
      apiToolCallNames: pendingToolCalls?.map((tc) => tc.function.name) ?? [],
      context: trackingContext?.context
    });
    if ((!pendingToolCalls || pendingToolCalls.length === 0) && msg.content) {
      const dsmlCalls = parseDsmlToolCalls(msg.content, tools);
      if (dsmlCalls.length > 0) {
        pendingToolCalls = dsmlCalls;
        log.info("Recovered tool calls from DSML text", {
          count: dsmlCalls.length,
          tools: dsmlCalls.map((tc) => tc.function.name),
          model: lastModel,
          round,
          context: trackingContext?.context
        });
      }
    }
    if (!pendingToolCalls || pendingToolCalls.length === 0) {
      const raw = msg.content ?? "";
      const text = extractFromXml(raw).trim();
      const finalText = text || bestText;
      void trackUsage(
        `openrouter/${normalizeOpenRouterModel(lastModel)}`,
        lastUsage,
        Date.now() - startTime,
        trackingContext
      );
      return { text: finalText, toolCalls: toolCallRecords };
    }
    log.debug("Processing tool calls", {
      round,
      model: lastModel,
      toolCount: pendingToolCalls.length,
      toolNames: pendingToolCalls.map((tc) => tc.function.name),
      context: trackingContext?.context
    });
    workingMessages.push({
      role: "assistant",
      content: msg.content ?? null,
      tool_calls: pendingToolCalls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: tc.function
      }))
    });
    if (msg.content) {
      const roundText = extractFromXml(msg.content).trim();
      if (roundText.length > bestText.length) {
        bestText = roundText;
      }
    }
    for (const tc of pendingToolCalls) {
      const resultStr = await executeToolCall(
        tc,
        tools,
        toolCallRecords,
        lastModel,
        round
      );
      workingMessages.push({
        role: "tool",
        content: resultStr,
        tool_call_id: tc.id
      });
    }
  }
  void trackUsage(
    `openrouter/${normalizeOpenRouterModel(lastModel)}`,
    lastUsage,
    Date.now() - startTime,
    trackingContext
  );
  return { text: bestText, toolCalls: toolCallRecords };
}
async function llmGenerateWithTools(options) {
  const {
    messages,
    temperature = 0.7,
    maxTokens = 4e3,
    model,
    tools = [],
    maxToolRounds = 3,
    trackingContext
  } = options;
  const startTime = Date.now();
  const hasTools = tools.length > 0;
  const totalDeadlineAt = startTime + LLM_TOOL_TOTAL_BUDGET_MS;
  log.debug("llmGenerateWithTools starting", {
    hasTools,
    toolNames: tools.map((t) => t.name),
    messageCount: messages.length,
    model: model ?? "auto",
    maxTokens,
    maxToolRounds,
    temperature,
    context: trackingContext?.context,
    agentId: trackingContext?.agentId
  });
  let resolvedModel = model;
  let localWasTried = false;
  if (!resolvedModel && trackingContext?.context) {
    try {
      const routed = await resolveModels(trackingContext.context);
      const ollamaCandidate = routed.find((m) => m.includes(":"));
      if (ollamaCandidate) resolvedModel = ollamaCandidate;
    } catch {
    }
  }
  const preferOllamaFirst = hasTools || shouldTryOllamaFirst(resolvedModel);
  if (preferOllamaFirst) {
    localWasTried = true;
    const ollamaResult = await ollamaChat(messages, temperature, {
      maxTokens,
      tools: hasTools ? tools : void 0,
      maxToolRounds,
      model: resolvedModel,
      deadlineAt: totalDeadlineAt,
      trackingContext
    });
    if (ollamaResult?.text || ollamaResult?.toolCalls && ollamaResult.toolCalls.length > 0) {
      if (!ollamaResult.text && ollamaResult.toolCalls.length > 0) {
        incLlmEmptyToolRound({
          provider: "ollama-tools",
          context: trackingContext?.context,
          agentId: trackingContext?.agentId
        });
      }
      log.debug("Ollama succeeded (with tools)", {
        model: ollamaResult.model,
        context: trackingContext?.context,
        textLength: ollamaResult.text.length,
        toolCallCount: ollamaResult.toolCalls.length
      });
      void trackUsage(
        `ollama/${ollamaResult.model}`,
        toOpenResponsesUsage(ollamaResult.usage),
        Date.now() - startTime,
        trackingContext
      );
      return { text: ollamaResult.text, toolCalls: ollamaResult.toolCalls };
    }
    if (isOllamaRoutedModel(resolvedModel) && !shouldAllowOpenRouterAfterLocalFailure(localWasTried)) {
      log.warn("Explicit Ollama/llama-line tool-call model failed; cloud fallback disallowed by policy", {
        model: resolvedModel,
        context: trackingContext?.context
      });
      return { text: "", toolCalls: [] };
    }
  }
  if (!shouldAllowOpenRouterAfterLocalFailure(localWasTried)) {
    incLlmEmptyText({
      provider: "ollama-tools",
      context: trackingContext?.context,
      agentId: trackingContext?.agentId
    });
    log.warn("Ollama returned empty and OpenRouter tool fallback is disabled by policy", {
      context: trackingContext?.context,
      agentId: trackingContext?.agentId,
      hasTools,
      toolNames: tools.map((t) => t.name)
    });
    return { text: "", toolCalls: [] };
  }
  const budget = await checkOpenRouterBudget();
  if (!budget.allowed) {
    log.warn("Skipping OpenRouter tool fallback due to budget guardrail", {
      reason: budget.reason,
      dailySpend: budget.dailySpend,
      monthlySpend: budget.monthlySpend,
      context: trackingContext?.context,
      agentId: trackingContext?.agentId,
      toolNames: tools.map((t) => t.name)
    });
    return { text: "", toolCalls: [] };
  }
  const resolved = model && !isOllamaRoutedModel(model) ? [normalizeModel(model)] : resolveOpenRouterModels(trackingContext?.context);
  const modelList = resolved.slice(0, MAX_MODELS_ARRAY);
  const openaiTools = tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
  const workingMessages = messages.map((m) => ({
    role: m.role,
    content: m.content
  }));
  try {
    return await openRouterToolLoop({
      messages: workingMessages,
      tools,
      openaiTools,
      modelList,
      temperature,
      maxTokens,
      maxToolRounds: Math.min(maxToolRounds, OPENROUTER_MAX_TOOL_ROUNDS),
      trackingContext,
      startTime,
      deadlineAt: totalDeadlineAt
    });
  } catch (error) {
    const err = error;
    log.debug("OpenRouter failed, trying Ollama text-only fallback", {
      error: err.message,
      statusCode: err.statusCode
    });
    const ollamaText = await tryOllamaLastResort(
      messages,
      temperature,
      maxTokens,
      startTime,
      trackingContext,
      totalDeadlineAt
    );
    if (ollamaText) return { text: ollamaText, toolCalls: [] };
    if (err.statusCode === 401) {
      throw new Error("Invalid OpenRouter API key \u2014 check your OPENROUTER_API_KEY");
    }
    throwForOpenRouterStatus(err.statusCode);
    throw new Error(`LLM API error: ${err.message ?? "unknown error"}`);
  }
}
function parseDsmlToolCalls(text, availableTools) {
  const normalized = normalizeDsml(text);
  const invokePattern = /<invoke\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/invoke>/gi;
  const calls = [];
  const toolNames = new Set(availableTools.map((t) => t.name));
  let match;
  while ((match = invokePattern.exec(normalized)) !== null) {
    const toolName = match[1];
    const body = match[2];
    if (!toolNames.has(toolName)) continue;
    const args = {};
    const paramPattern = /<parameter\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/parameter>/gi;
    let paramMatch;
    while ((paramMatch = paramPattern.exec(body)) !== null) {
      args[paramMatch[1]] = paramMatch[2].trim();
    }
    if (Object.keys(args).length === 0) {
      const barePattern = /<([a-z_][a-z0-9_]*)>([\s\S]*?)<\/\1>/gi;
      let bareMatch;
      while ((bareMatch = barePattern.exec(body)) !== null) {
        args[bareMatch[1]] = bareMatch[2].trim();
      }
    }
    if (Object.keys(args).length > 0) {
      const { normalized: normalized2 } = normalizeToolArgs(toolName, args);
      calls.push({
        id: `dsml_${Date.now()}_${calls.length}`,
        function: {
          name: toolName,
          arguments: JSON.stringify(normalized2)
        }
      });
    }
  }
  return calls;
}
function extractFromXml(text) {
  text = normalizeDsml(text);
  if (!/<(?:function_?calls?|invoke|parameter)\b/i.test(text)) {
    return text;
  }
  const contentMatch = text.match(
    /<parameter\s+name=["']content["'][^>]*>([\s\S]*?)<\/parameter>/i
  );
  if (contentMatch?.[1]) {
    return contentMatch[1].trim();
  }
  const paramMatches = [
    ...text.matchAll(
      /<parameter\s+name=["'][^"']*["'][^>]*>([\s\S]*?)<\/parameter>/gi
    )
  ];
  if (paramMatches.length > 0) {
    return paramMatches.map((m) => m[1].trim()).sort((a, b) => b.length - a.length)[0];
  }
  const stripped = text.replace(
    /<\/?(?:function_?calls?|invoke|parameter|tool_call|antml:[a-z_]+)[^>]*>/gi,
    ""
  ).replace(/\s{2,}/g, " ").trim();
  return stripped;
}
function sanitizeDialogue(text) {
  return extractFromXml(text).replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, "").replace(/https?:\/\/\S+/g, "").replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1").replace(/^["']|["']$/g, "").replace(/\s+/g, " ").trim();
}
function extractJson(text) {
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) text = fenceMatch[1];
  text = extractFromXml(text);
  const candidates = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && inString) {
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  if (depth > 0 && start >= 0) {
    try {
      const repaired = repairTruncatedJson(text.slice(start));
      return repaired;
    } catch {
    }
  }
  for (const candidate of candidates.sort((a, b) => b.length - a.length)) {
    try {
      return JSON.parse(candidate);
    } catch {
    }
  }
  return null;
}
var import_sdk, import_v4, log, OPENROUTER_API_KEY, OPENROUTER_ENABLED, OPENROUTER_DEFAULT_MODEL, OPENROUTER_ESCALATION_MODEL, OPENROUTER_CODER_MODEL, OPENROUTER_REQUIRE_LOCAL_FAILURE, OPENROUTER_ALLOW_AFTER_LOCAL_FAILURE, OPENROUTER_DAILY_BUDGET_USD, OPENROUTER_MONTHLY_BUDGET_USD, OPENROUTER_MAX_TOKENS, OPENROUTER_MAX_TOOL_ROUNDS, OPENROUTER_PRICE_PER_MILLION, MAX_MODELS_ARRAY, OLLAMA_DEFAULT_MAX_TOKENS, OPENROUTER_CHAT_TIMEOUT_MS, OPENROUTER_TEXT_TIMEOUT_MS, OPENROUTER_TEXT_BUDGET_MS, OPENROUTER_TOOL_TIMEOUT_MS, OPENROUTER_TOOL_BUDGET_MS, OPENROUTER_MAX_INDIVIDUAL_FALLBACKS, LLM_TEXT_TOTAL_BUDGET_MS, LLM_TOOL_TOTAL_BUDGET_MS, DEFAULT_OLLAMA_FALLBACK_MODELS, OLLAMA_FALLBACK_MODELS, TOOL_PARAM_ALIASES, _client, OLLAMA_ENABLED, OLLAMA_LOCAL_URL, OLLAMA_API_KEY, OLLAMA_TEXT_TIMEOUT_MS, OLLAMA_PREFERRED_TEXT_TIMEOUT_MS, OLLAMA_IMPLICIT_FIRST_LOCAL_TEXT_TIMEOUT_MS, OLLAMA_TOOL_TIMEOUT_MS, OLLAMA_BUDGET_MS, OLLAMA_TAGS_TIMEOUT_MS, OLLAMA_MODEL_CACHE_TTL_MS, OLLAMA_MODEL, OLLAMA_TOOL_MODEL, LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH, OLLAMA_EMPTY_RETRY_COUNT, ollamaModelCatalogCache, LLAMA_LINE_MODEL_PREFIXES;
var init_client = __esm({
  "src/lib/llm/client.ts"() {
    "use strict";
    import_sdk = require("@openrouter/sdk");
    import_v4 = require("zod/v4");
    init_db();
    init_logger();
    init_metrics2();
    init_model_routing();
    log = logger.child({ module: "llm" });
    OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
    OPENROUTER_ENABLED = process.env.OPENROUTER_ENABLED === "true";
    OPENROUTER_DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL ?? "deepseek/deepseek-v4-flash";
    OPENROUTER_ESCALATION_MODEL = process.env.OPENROUTER_ESCALATION_MODEL ?? "deepseek/deepseek-v3.2";
    OPENROUTER_CODER_MODEL = process.env.OPENROUTER_CODER_MODEL ?? "qwen/qwen3-coder-flash";
    OPENROUTER_REQUIRE_LOCAL_FAILURE = process.env.OPENROUTER_REQUIRE_LOCAL_FAILURE !== "false";
    OPENROUTER_ALLOW_AFTER_LOCAL_FAILURE = process.env.OPENROUTER_ALLOW_AFTER_LOCAL_FAILURE !== "false";
    OPENROUTER_DAILY_BUDGET_USD = Number.parseFloat(process.env.OPENROUTER_DAILY_BUDGET_USD ?? "1");
    OPENROUTER_MONTHLY_BUDGET_USD = Number.parseFloat(process.env.OPENROUTER_MONTHLY_BUDGET_USD ?? "20");
    OPENROUTER_MAX_TOKENS = Math.max(1, Number.parseInt(process.env.OPENROUTER_MAX_TOKENS ?? "2000", 10) || 2e3);
    OPENROUTER_MAX_TOOL_ROUNDS = Math.max(0, Number.parseInt(process.env.OPENROUTER_MAX_TOOL_ROUNDS ?? "2", 10) || 0);
    OPENROUTER_PRICE_PER_MILLION = {
      "deepseek/deepseek-v4-flash": { input: 0.09, output: 0.18 },
      "deepseek/deepseek-v3.2": { input: 0.2288, output: 0.3432 },
      "deepseek/deepseek-v4-pro": { input: 0.435, output: 0.87 },
      "qwen/qwen3-coder-flash": { input: 0.195, output: 0.975 }
    };
    MAX_MODELS_ARRAY = 3;
    OLLAMA_DEFAULT_MAX_TOKENS = 16384;
    OPENROUTER_CHAT_TIMEOUT_MS = 3e4;
    OPENROUTER_TEXT_TIMEOUT_MS = 2e4;
    OPENROUTER_TEXT_BUDGET_MS = 45e3;
    OPENROUTER_TOOL_TIMEOUT_MS = 3e4;
    OPENROUTER_TOOL_BUDGET_MS = 75e3;
    OPENROUTER_MAX_INDIVIDUAL_FALLBACKS = 2;
    LLM_TEXT_TOTAL_BUDGET_MS = 75e3;
    LLM_TOOL_TOTAL_BUDGET_MS = 24e4;
    DEFAULT_OLLAMA_FALLBACK_MODELS = ["ollama/gemma4:latest"];
    OLLAMA_FALLBACK_MODELS = (process.env.OLLAMA_FALLBACK_MODELS ?? DEFAULT_OLLAMA_FALLBACK_MODELS.join(",")).split(",").map((model) => model.trim()).filter(Boolean);
    TOOL_PARAM_ALIASES = {
      file_write: {
        file_path: "path",
        filepath: "path",
        filename: "path",
        file_name: "path",
        write_content: "content",
        file_content: "content",
        text_content: "content"
      },
      file_read: {
        file_path: "path",
        filepath: "path",
        filename: "path",
        file_name: "path"
      },
      bash: {
        cmd: "command",
        shell_command: "command",
        bash_command: "command"
      },
      web_search: {
        search_query: "query",
        q: "query"
      },
      web_fetch: {
        link: "url",
        web_url: "url",
        target_url: "url"
      },
      memory_search: {
        search_query: "query",
        q: "query"
      },
      memory_write: {
        memory_type: "type",
        text: "content",
        body: "content"
      },
      send_to_agent: {
        agent: "target_agent",
        agent_id: "target_agent",
        file_name: "filename",
        file: "filename",
        text: "content",
        body: "content"
      }
    };
    _client = null;
    OLLAMA_ENABLED = process.env.OLLAMA_ENABLED !== "false";
    OLLAMA_LOCAL_URL = OLLAMA_ENABLED ? process.env.OLLAMA_BASE_URL ?? "" : "";
    OLLAMA_API_KEY = OLLAMA_ENABLED ? process.env.OLLAMA_API_KEY ?? "" : "";
    OLLAMA_TEXT_TIMEOUT_MS = 6e5;
    OLLAMA_PREFERRED_TEXT_TIMEOUT_MS = 6e5;
    OLLAMA_IMPLICIT_FIRST_LOCAL_TEXT_TIMEOUT_MS = 6e5;
    OLLAMA_TOOL_TIMEOUT_MS = 6e5;
    OLLAMA_BUDGET_MS = 12e5;
    OLLAMA_TAGS_TIMEOUT_MS = 5e3;
    OLLAMA_MODEL_CACHE_TTL_MS = 3e4;
    OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "";
    OLLAMA_TOOL_MODEL = process.env.OLLAMA_TOOL_MODEL ?? "";
    LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH = Math.max(
      0,
      Number.parseInt(process.env.LLAMA_LINE_STATUS_WARN_QUEUE_DEPTH ?? "3", 10) || 0
    );
    OLLAMA_EMPTY_RETRY_COUNT = Math.max(
      0,
      Number.parseInt(process.env.OLLAMA_EMPTY_RETRY_COUNT ?? "1", 10) || 0
    );
    ollamaModelCatalogCache = null;
    LLAMA_LINE_MODEL_PREFIXES = (process.env.LLAMA_LINE_MODEL_PREFIXES ?? "openai/gpt-,github-copilot/").split(",").map((prefix) => prefix.trim()).filter(Boolean);
  }
});

// src/lib/llm/embeddings.ts
async function getEmbedding(text) {
  return getEmbeddingOllama(text);
}
async function getEmbeddingOllama(text) {
  if (!EMBEDDING_OLLAMA_URL) return null;
  try {
    const embeddingHeaders = { "Content-Type": "application/json" };
    if (EMBEDDING_OLLAMA_API_KEY) embeddingHeaders["Authorization"] = `Bearer ${EMBEDDING_OLLAMA_API_KEY}`;
    const response = await fetch(
      `${EMBEDDING_OLLAMA_URL}/v1/embeddings`,
      {
        method: "POST",
        headers: embeddingHeaders,
        body: JSON.stringify({
          model: OLLAMA_EMBEDDING_MODEL,
          input: text
        }),
        signal: AbortSignal.timeout(EMBEDDING_TIMEOUT_MS)
      }
    );
    if (!response.ok) {
      log2.debug("Ollama embedding request failed", {
        status: response.status,
        url: EMBEDDING_OLLAMA_URL,
        model: OLLAMA_EMBEDDING_MODEL
      });
      return null;
    }
    const data = await readEmbeddingResponse(response);
    return data.data?.[0]?.embedding ?? null;
  } catch {
    log2.debug("Ollama embedding error (host unreachable?)", {
      url: EMBEDDING_OLLAMA_URL,
      model: OLLAMA_EMBEDDING_MODEL
    });
    return null;
  }
}
async function readEmbeddingResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    return await response.json();
  }
  const text = await response.text();
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("data: ")) continue;
    const raw = line.slice("data: ".length).trim();
    if (!raw || raw === "[DONE]") continue;
    const payload = JSON.parse(raw);
    if (payload.status === "queued") continue;
    if (payload.status && LLAMA_LINE_TERMINAL_STATUSES.has(payload.status)) {
      throw new Error(payload.message ?? payload.status);
    }
    if (payload.data?.[0]?.embedding) return payload;
  }
  return {};
}
var log2, EMBEDDING_OLLAMA_URL, OLLAMA_EMBEDDING_MODEL, EMBEDDING_OLLAMA_API_KEY, EMBEDDING_TIMEOUT_MS, LLAMA_LINE_TERMINAL_STATUSES;
var init_embeddings = __esm({
  "src/lib/llm/embeddings.ts"() {
    "use strict";
    init_logger();
    log2 = logger.child({ module: "embeddings" });
    EMBEDDING_OLLAMA_URL = process.env.EMBEDDING_OLLAMA_URL ?? "http://localhost:11434";
    OLLAMA_EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "bge-m3";
    EMBEDDING_OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? process.env.EMBEDDING_OLLAMA_API_KEY ?? "";
    EMBEDDING_TIMEOUT_MS = Number.parseInt(
      process.env.EMBEDDING_TIMEOUT_MS ?? "5000",
      10
    );
    LLAMA_LINE_TERMINAL_STATUSES = /* @__PURE__ */ new Set([
      "ollama_unavailable",
      "dropped_by_admin"
    ]);
  }
});

// src/lib/llm/index.ts
var init_llm = __esm({
  "src/lib/llm/index.ts"() {
    "use strict";
    init_client();
    init_embeddings();
  }
});

// src/lib/net/fetch-with-retry.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getRetryDelayMs(response, attempt, baseDelayMs) {
  const retryAfterHeader = response.headers.get("Retry-After");
  if (retryAfterHeader) {
    const retryAfterSeconds = Number.parseFloat(retryAfterHeader);
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
      return Math.ceil(retryAfterSeconds * 1e3);
    }
  }
  return baseDelayMs * (attempt + 1);
}
function isAbortError(error) {
  return error instanceof Error && error.name === "AbortError";
}
function isTimeoutError(error) {
  return error instanceof Error && (error.name === "TimeoutError" || error.message === "The operation was aborted due to timeout");
}
function getRemainingBudgetMs(startedAtMs, totalTimeoutMs) {
  if (typeof totalTimeoutMs !== "number") {
    return null;
  }
  return totalTimeoutMs - (Date.now() - startedAtMs);
}
function getSleepDelayMs(delayMs, remainingBudgetMs) {
  if (remainingBudgetMs == null) {
    return delayMs;
  }
  return Math.max(0, Math.min(delayMs, remainingBudgetMs));
}
async function fetchWithRetry(url, options = {}) {
  const {
    timeoutMs = 15e3,
    totalTimeoutMs,
    maxRetries = 2,
    baseDelayMs = 1e3,
    label = "fetch",
    retryOnStatuses = DEFAULT_RETRYABLE_STATUSES,
    retryOnTimeout = true,
    signal,
    ...init
  } = options;
  const retryableStatuses = new Set(retryOnStatuses);
  let lastError;
  const startedAtMs = Date.now();
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const remainingBudgetMs = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
    if (remainingBudgetMs != null && remainingBudgetMs <= 0) {
      break;
    }
    const attemptTimeoutMs = Math.max(
      1,
      remainingBudgetMs == null ? timeoutMs : Math.min(timeoutMs, remainingBudgetMs)
    );
    const timeoutSignal = AbortSignal.timeout(attemptTimeoutMs);
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    try {
      const response = await fetch(url, { ...init, signal: combinedSignal });
      if (retryableStatuses.has(response.status) && attempt < maxRetries) {
        const retryDelayMs = getRetryDelayMs(response, attempt, baseDelayMs);
        const remainingBudgetMsBeforeSleep = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
        if (remainingBudgetMsBeforeSleep != null && remainingBudgetMsBeforeSleep <= 0) {
          return response;
        }
        const sleepDelayMs = getSleepDelayMs(
          retryDelayMs,
          remainingBudgetMsBeforeSleep
        );
        log3.warn(`${label} retrying response`, {
          status: response.status,
          attempt,
          retryDelayMs: sleepDelayMs
        });
        await sleep(sleepDelayMs);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (signal?.aborted) break;
      if ((isAbortError(error) || isTimeoutError(error)) && !retryOnTimeout) break;
      if (getRemainingBudgetMs(startedAtMs, totalTimeoutMs) != null) {
        const remainingBudgetMs2 = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
        if (remainingBudgetMs2 != null && remainingBudgetMs2 <= 0) {
          break;
        }
      }
      if (attempt >= maxRetries) break;
      const retryDelayMs = baseDelayMs * (attempt + 1);
      const remainingBudgetMsBeforeSleep = getRemainingBudgetMs(startedAtMs, totalTimeoutMs);
      if (remainingBudgetMsBeforeSleep != null && remainingBudgetMsBeforeSleep <= 0) {
        break;
      }
      const sleepDelayMs = getSleepDelayMs(
        retryDelayMs,
        remainingBudgetMsBeforeSleep
      );
      log3.warn(`${label} retrying error`, {
        attempt,
        retryDelayMs: sleepDelayMs,
        error: error.message
      });
      await sleep(sleepDelayMs);
    }
  }
  if (totalTimeoutMs != null && getRemainingBudgetMs(startedAtMs, totalTimeoutMs) != null && getRemainingBudgetMs(startedAtMs, totalTimeoutMs) <= 0) {
    throw new Error(`${label}: total timeout exceeded`);
  }
  throw lastError instanceof Error ? lastError : new Error(`${label}: exhausted retries`);
}
var log3, DEFAULT_RETRYABLE_STATUSES;
var init_fetch_with_retry = __esm({
  "src/lib/net/fetch-with-retry.ts"() {
    "use strict";
    init_logger();
    log3 = logger.child({ module: "fetch-with-retry" });
    DEFAULT_RETRYABLE_STATUSES = /* @__PURE__ */ new Set([408, 425, 429, 500, 502, 503, 504]);
  }
});

// src/lib/discord/client.ts
function webhookKey(webhookUrl) {
  return webhookUrl.split("?")[0];
}
async function drainQueue(key) {
  if (processingWebhooks.has(key)) return;
  processingWebhooks.add(key);
  const queue = webhookQueues.get(key);
  try {
    while (queue && queue.length > 0) {
      const entry = queue.shift();
      const result = await entry.send();
      entry.resolve(result);
      if (queue.length > 0) {
        await sleep2(WEBHOOK_MIN_INTERVAL_MS);
      }
    }
  } finally {
    processingWebhooks.delete(key);
    if (queue && queue.length > 0) {
      drainQueue(key);
    }
  }
}
async function sendWithRetry(url, body) {
  const res = await fetchWithRetry429(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    },
    "Webhook POST"
  );
  if (!res) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    log4.warn("Webhook POST failed", { status: res.status, body: text.slice(0, 200) });
    return null;
  }
  return await res.json();
}
function sleep2(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function truncateDiscordContent(content) {
  if (content.length <= DISCORD_CONTENT_LIMIT) return content;
  return content.slice(0, DISCORD_CONTENT_LIMIT - DISCORD_TRUNCATION_SUFFIX.length) + DISCORD_TRUNCATION_SUFFIX;
}
async function fetchWithRetry429(url, init, label) {
  try {
    return await fetchWithRetry(url, {
      ...init,
      timeoutMs: DISCORD_TIMEOUT_MS,
      totalTimeoutMs: 2e4,
      maxRetries: MAX_RETRIES,
      baseDelayMs: 2e3,
      label,
      retryOnStatuses: [429, 500, 502, 503, 504],
      retryOnTimeout: false
    });
  } catch (err) {
    log4.warn(`${label} fetch error`, {
      error: err.message,
      retriesLeft: 0
    });
    log4.error(`${label} all retries exhausted`);
    return null;
  }
}
function buildWebhookUrlAndPayload(options) {
  const url = new URL(options.webhookUrl);
  url.searchParams.set("wait", "true");
  if (options.threadId) {
    url.searchParams.set("thread_id", options.threadId);
  }
  const payload = {};
  if (options.username) payload.username = options.username;
  if (options.avatarUrl) payload.avatar_url = options.avatarUrl;
  if (options.content) payload.content = truncateDiscordContent(options.content);
  if (options.embeds) payload.embeds = options.embeds;
  if (!payload.content && !payload.embeds) {
    log4.warn("Skipping webhook post \u2014 no content or embeds");
    return null;
  }
  return { url: url.toString(), payload };
}
async function postToWebhook(options) {
  const built = buildWebhookUrlAndPayload(options);
  if (!built) return null;
  const key = webhookKey(options.webhookUrl);
  return new Promise((resolve) => {
    if (!webhookQueues.has(key)) {
      webhookQueues.set(key, []);
    }
    webhookQueues.get(key).push({
      send: () => sendWithRetry(built.url, built.payload),
      resolve
    });
    drainQueue(key);
  });
}
async function discordFetch(path4, options = {}) {
  const res = await fetchWithRetry429(
    `${DISCORD_API}${path4}`,
    {
      ...options,
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    },
    `Discord API ${path4}`
  );
  if (!res) throw new Error(`discordFetch: exhausted retries for ${path4}`);
  return res;
}
async function getOrCreateWebhook(channelId, name = "Subcult") {
  if (!BOT_TOKEN) {
    log4.warn("DISCORD_BOT_TOKEN not set, skipping webhook provisioning");
    return null;
  }
  const cached = webhookCache.get(channelId);
  if (cached) return cached;
  const inFlight = webhookProvisioning.get(channelId);
  if (inFlight) return await inFlight;
  const provisioningPromise = (async () => {
    try {
      const listRes = await discordFetch(`/channels/${channelId}/webhooks`);
      if (!listRes.ok) {
        log4.warn("Failed to list webhooks", {
          status: listRes.status,
          channelId
        });
        return null;
      }
      const webhooks = await listRes.json();
      const existing = webhooks.find((w) => w.name === name);
      if (existing) {
        const url2 = `https://discord.com/api/webhooks/${existing.id}/${existing.token}`;
        webhookCache.set(channelId, url2);
        return url2;
      }
      const createRes = await discordFetch(
        `/channels/${channelId}/webhooks`,
        {
          method: "POST",
          body: JSON.stringify({ name })
        }
      );
      if (!createRes.ok) {
        log4.warn("Failed to create webhook", {
          status: createRes.status,
          channelId
        });
        return null;
      }
      const created = await createRes.json();
      const url = `https://discord.com/api/webhooks/${created.id}/${created.token}`;
      webhookCache.set(channelId, url);
      return url;
    } catch (err) {
      log4.warn("Webhook provisioning error", {
        error: err.message,
        channelId
      });
      return null;
    } finally {
      webhookProvisioning.delete(channelId);
    }
  })();
  webhookProvisioning.set(channelId, provisioningPromise);
  return await provisioningPromise;
}
async function postToWebhookWithFiles(options) {
  if (!options.files || options.files.length === 0) {
    return postToWebhook(options);
  }
  const built = buildWebhookUrlAndPayload(options);
  if (!built) return null;
  const formData = new FormData();
  formData.append("payload_json", JSON.stringify(built.payload));
  for (let i = 0; i < options.files.length; i++) {
    const file = options.files[i];
    const blob = new Blob([new Uint8Array(file.data)], {
      type: file.contentType
    });
    formData.append(`files[${i}]`, blob, file.filename);
  }
  const key = webhookKey(options.webhookUrl);
  const sendMultipart = async () => {
    const res = await fetchWithRetry429(
      built.url,
      { method: "POST", body: formData },
      "Webhook multipart POST"
    );
    if (!res) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log4.warn("Webhook multipart POST failed", { status: res.status, body: text.slice(0, 200) });
      return null;
    }
    return await res.json();
  };
  return new Promise((resolve) => {
    if (!webhookQueues.has(key)) {
      webhookQueues.set(key, []);
    }
    webhookQueues.get(key).push({
      send: sendMultipart,
      resolve
    });
    drainQueue(key);
  });
}
var log4, DISCORD_API, BOT_TOKEN, webhookCache, webhookProvisioning, WEBHOOK_MIN_INTERVAL_MS, MAX_RETRIES, DISCORD_TIMEOUT_MS, DISCORD_CONTENT_LIMIT, DISCORD_TRUNCATION_SUFFIX, webhookQueues, processingWebhooks;
var init_client2 = __esm({
  "src/lib/discord/client.ts"() {
    "use strict";
    init_logger();
    init_fetch_with_retry();
    log4 = logger.child({ module: "discord" });
    DISCORD_API = "https://discord.com/api/v10";
    BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    webhookCache = /* @__PURE__ */ new Map();
    webhookProvisioning = /* @__PURE__ */ new Map();
    WEBHOOK_MIN_INTERVAL_MS = 600;
    MAX_RETRIES = 3;
    DISCORD_TIMEOUT_MS = 15e3;
    DISCORD_CONTENT_LIMIT = 2e3;
    DISCORD_TRUNCATION_SUFFIX = "\n\n\u2026 [truncated to fit Discord 2000 character limit]";
    webhookQueues = /* @__PURE__ */ new Map();
    processingWebhooks = /* @__PURE__ */ new Set();
  }
});

// src/lib/discord/channels.ts
function buildWebhookUrl(webhookId, webhookToken) {
  return `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
}
async function syncEnvToDb() {
  if (envSynced) return;
  envSynced = true;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) return;
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(ENV_PREFIX2) || !value) continue;
    const rawName = key.slice(ENV_PREFIX2.length);
    if (!rawName) continue;
    const channelName = rawName.toLowerCase().replace(/_/g, "-");
    const channelId = value.trim();
    if (!channelId) continue;
    try {
      await sql`
                INSERT INTO ops_discord_channels (discord_channel_id, discord_guild_id, name, category, purpose)
                VALUES (${channelId}, ${guildId}, ${channelName}, 'env', ${"Set via DISCORD_CHANNEL env var"})
                ON CONFLICT (discord_channel_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    enabled = true
            `;
      await sql`
                DELETE FROM ops_discord_channels
                WHERE name = ${channelName} AND discord_channel_id != ${channelId}
            `;
      channelCache.delete(channelName);
      log5.info("Discord channel synced from env", { name: channelName, channelId });
    } catch (error) {
      log5.error("Failed to sync discord channel env var", { name: channelName, channelId, error });
    }
  }
}
async function getWebhookUrl(channelName) {
  await syncEnvToDb();
  const cached = channelCache.get(channelName);
  if (cached) {
    if (!cached.enabled) return null;
    if (cached.webhookUrl) return cached.webhookUrl;
  }
  const [row] = await sql`
        SELECT discord_channel_id, webhook_id, webhook_token, enabled
        FROM ops_discord_channels
        WHERE name = ${channelName}
    `;
  if (!row) {
    log5.debug("Channel not configured", { channelName });
    return null;
  }
  if (!row.enabled) {
    channelCache.set(channelName, {
      discordChannelId: row.discord_channel_id,
      webhookUrl: null,
      enabled: false
    });
    return null;
  }
  if (row.webhook_id && row.webhook_token) {
    const webhookUrl2 = buildWebhookUrl(row.webhook_id, row.webhook_token);
    channelCache.set(channelName, {
      discordChannelId: row.discord_channel_id,
      webhookUrl: webhookUrl2,
      enabled: true
    });
    return webhookUrl2;
  }
  const webhookUrl = await getOrCreateWebhook(row.discord_channel_id);
  if (webhookUrl) {
    const match = webhookUrl.match(/\/webhooks\/(\d+)\/(.+)$/);
    if (match) {
      await sql`
                UPDATE ops_discord_channels
                SET webhook_id = ${match[1]}, webhook_token = ${match[2]}
                WHERE name = ${channelName}
            `;
    }
    channelCache.set(channelName, {
      discordChannelId: row.discord_channel_id,
      webhookUrl,
      enabled: true
    });
  }
  return webhookUrl;
}
function getChannelForFormat(format) {
  return FORMAT_CHANNEL_MAP[format];
}
var log5, FORMAT_CHANNEL_MAP, ENV_PREFIX2, envSynced, channelCache;
var init_channels = __esm({
  "src/lib/discord/channels.ts"() {
    "use strict";
    init_db();
    init_client2();
    init_logger();
    log5 = logger.child({ module: "discord-channels" });
    FORMAT_CHANNEL_MAP = {
      standup: "roundtable",
      checkin: "roundtable",
      triage: "roundtable",
      deep_dive: "roundtable",
      risk_review: "roundtable",
      strategy: "roundtable",
      planning: "roundtable",
      shipping: "roundtable",
      retro: "roundtable",
      debate: "roundtable",
      cross_exam: "roundtable",
      reframe: "roundtable",
      content_review: "roundtable",
      brainstorm: "brainstorm",
      writing_room: "drafts",
      watercooler: "watercooler",
      agent_design: "roundtable",
      voice_chat: "roundtable"
    };
    ENV_PREFIX2 = "DISCORD_CHANNEL_";
    envSynced = false;
    channelCache = /* @__PURE__ */ new Map();
  }
});

// src/lib/agents.ts
var AGENTS, AGENT_IDS, DAILY_PROPOSAL_LIMIT;
var init_agents = __esm({
  "src/lib/agents.ts"() {
    "use strict";
    AGENTS = {
      chora: {
        id: "chora",
        displayName: "Chora",
        role: "Analyst",
        description: "Makes systems legible. Diagnoses structure, exposes assumptions, traces causality. Direct, warm, grounded. Precision over persuasion.",
        color: "#b4befe",
        avatarKey: "chora_spiral",
        pixelSpriteKey: "chora_office",
        tailwindTextColor: "text-accent-lavender",
        tailwindBgColor: "bg-accent-lavender",
        tailwindBorderBg: "border-accent-lavender/40 bg-accent-lavender/5"
      },
      subrosa: {
        id: "subrosa",
        displayName: "Subrosa",
        role: "Protector",
        description: "Preserves agency under asymmetry. Evaluates risk, protects optionality, maintains restraint. Low-affect, watchful, decisive.",
        color: "#f38ba8",
        avatarKey: "subrosa_rose",
        pixelSpriteKey: "subrosa_office",
        tailwindTextColor: "text-accent-red",
        tailwindBgColor: "bg-accent-red",
        tailwindBorderBg: "border-accent-red/40 bg-accent-red/5"
      },
      thaum: {
        id: "thaum",
        displayName: "Thaum",
        role: "Innovator",
        description: "Restores motion when thought stalls. Disrupts self-sealing explanations, reframes problems, introduces bounded novelty.",
        color: "#cba6f7",
        avatarKey: "thaum_spark",
        pixelSpriteKey: "thaum_office",
        tailwindTextColor: "text-accent",
        tailwindBgColor: "bg-accent",
        tailwindBorderBg: "border-accent/40 bg-accent/5"
      },
      praxis: {
        id: "praxis",
        displayName: "Praxis",
        role: "Executor",
        description: "Ends deliberation responsibly. Chooses among viable paths, translates intent to action, owns consequences. Firm, grounded.",
        color: "#a6e3a1",
        avatarKey: "praxis_mark",
        pixelSpriteKey: "praxis_office",
        tailwindTextColor: "text-accent-green",
        tailwindBgColor: "bg-accent-green",
        tailwindBorderBg: "border-accent-green/40 bg-accent-green/5"
      },
      mux: {
        id: "mux",
        displayName: "Mux",
        role: "Operations",
        description: "Operational labor. Turns commitment into output \u2014 drafts, formats, transcribes, packages. Earnest, slightly tired, dry humor. The clipboard.",
        color: "#74c7ec",
        avatarKey: "mux_flux",
        pixelSpriteKey: "mux_office",
        tailwindTextColor: "text-accent-sapphire",
        tailwindBgColor: "bg-accent-sapphire",
        tailwindBorderBg: "border-accent-sapphire/40 bg-accent-sapphire/5"
      },
      primus: {
        id: "primus",
        displayName: "Primus",
        role: "Sovereign",
        description: "Sovereign directive intelligence. Cold, strategic, minimal. Speaks in mandates, not analysis. Invoked only for mission drift, contested values, existential tradeoffs.",
        color: "#f5c2e7",
        avatarKey: "primus_crown",
        pixelSpriteKey: "primus_office",
        tailwindTextColor: "text-accent-pink",
        tailwindBgColor: "bg-accent-pink",
        tailwindBorderBg: "border-accent-pink/40 bg-accent-pink/5"
      }
    };
    AGENT_IDS = Object.keys(AGENTS);
    DAILY_PROPOSAL_LIMIT = process.env.DAILY_PROPOSAL_LIMIT ? parseInt(process.env.DAILY_PROPOSAL_LIMIT) : 100;
  }
});

// src/lib/discord/avatars.ts
function getAgentAvatarUrl(agentId) {
  if (agentId === "system" || !agentId) return void 0;
  return `${BASE_URL}/avatars/${agentId}.png`;
}
var BASE_URL;
var init_avatars = __esm({
  "src/lib/discord/avatars.ts"() {
    "use strict";
    BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://subcorp.subcult.tv";
  }
});

// src/lib/discord/events.ts
var events_exports = {};
__export(events_exports, {
  postEventToDiscord: () => postEventToDiscord
});
function splitDiscordMessage(content) {
  if (content.length <= DISCORD_MAX_LENGTH) return [content];
  const lines = content.split("\n");
  const chunks = [];
  let current = "";
  for (const line of lines) {
    const candidate = current.length === 0 ? line : `${current}
${line}`;
    if (candidate.length > DISCORD_MAX_LENGTH) {
      if (current.length > 0) {
        chunks.push(current);
        current = line;
      } else {
        let remaining = line;
        while (remaining.length > DISCORD_MAX_LENGTH) {
          chunks.push(remaining.slice(0, DISCORD_MAX_LENGTH));
          remaining = remaining.slice(DISCORD_MAX_LENGTH);
        }
        current = remaining;
      }
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}
function getKindEmoji(kind) {
  if (kind.includes("dream")) return "\u{1F4AD}";
  if (kind.includes("archaeology")) return "\u{1F52E}";
  if (kind.includes("succeeded") || kind.includes("approved") || kind.includes("completed") || kind.includes("accepted")) return "\u2705";
  if (kind.includes("failed") || kind.includes("rejected")) return "\u274C";
  if (kind.includes("proposal")) return "\u{1F4CB}";
  if (kind.includes("mission")) return "\u{1F680}";
  if (kind.includes("trigger")) return "\u26A1";
  if (kind.includes("content") || kind.includes("draft")) return "\u{1F4DD}";
  if (kind.includes("spawned")) return "\u{1F916}";
  return "\u{1F4E1}";
}
function formatEventContent(input, agentLabel, emoji) {
  const kind = input.kind;
  const summary = input.summary?.trim();
  if (kind.includes("dream") || kind.includes("archaeology")) {
    const quoted = summary ? summary.split("\n").map((l) => `> ${l}`).join("\n") : "";
    return `${emoji} **${agentLabel}** \u2014 *${input.title}*
${quoted}`;
  }
  if (kind.includes("agent_session")) {
    const meta = input.metadata ?? {};
    const rounds = meta.rounds ? ` \xB7 ${meta.rounds} rounds` : "";
    const tools = meta.toolCalls ? ` \xB7 ${meta.toolCalls} tool calls` : "";
    let content2 = `${emoji} **${agentLabel}** \u2014 ${input.title}${rounds}${tools}`;
    if (summary) {
      const quoted = summary.split("\n").map((l) => `> ${l}`).join("\n");
      content2 += `
${quoted}`;
    }
    return content2;
  }
  if (kind.includes("proposal")) {
    let content2 = `${emoji} **${agentLabel}** \u2014 ${input.title}`;
    if (summary) content2 += `
>>> ${summary}`;
    return content2;
  }
  let content = `${emoji} **${agentLabel}** \u2014 ${input.title}`;
  if (summary) {
    content += `
> ${summary}`;
  }
  return content;
}
async function postEventToDiscord(input) {
  const channel = EVENT_CHANNEL_MAP[input.kind];
  if (!channel) return;
  const webhookUrl = await getWebhookUrl(channel);
  if (!webhookUrl) return;
  const agent = AGENTS[input.agent_id];
  const voice = getVoice(input.agent_id);
  const agentName = agent?.displayName ?? input.agent_id;
  const symbol = voice?.symbol ?? "";
  const emoji = getKindEmoji(input.kind);
  const agentLabel = `${symbol ? symbol + " " : ""}${agentName}`;
  const content = formatEventContent(input, agentLabel, emoji);
  const chunks = splitDiscordMessage(content);
  try {
    for (const chunk of chunks) {
      await postToWebhook({
        webhookUrl,
        username: agentName,
        avatarUrl: getAgentAvatarUrl(input.agent_id),
        content: chunk
      });
    }
  } catch (err) {
    log6.warn("Failed to post event to Discord", {
      kind: input.kind,
      channel,
      error: err.message
    });
  }
}
var log6, DISCORD_MAX_LENGTH, EVENT_CHANNEL_MAP;
var init_events = __esm({
  "src/lib/discord/events.ts"() {
    "use strict";
    init_client2();
    init_channels();
    init_agents();
    init_voices();
    init_avatars();
    init_logger();
    log6 = logger.child({ module: "discord-events" });
    DISCORD_MAX_LENGTH = 2e3;
    EVENT_CHANNEL_MAP = {
      // proposals
      proposal_created: "proposals",
      proposal_auto_approved: "proposals",
      agent_proposal_vote: "proposals",
      governance_proposal_created: "proposals",
      governance_proposal_accepted: "proposals",
      governance_proposal_rejected: "proposals",
      // missions
      mission_failed: "missions",
      mission_succeeded: "missions",
      agent_session_completed: "missions",
      agent_session_failed: "missions",
      // research — step-kind completions for analysis tasks
      research_completed: "research",
      news_digest_generated: "research",
      // insights — step-kind completions for synthesis/memory tasks
      insight_generated: "insights",
      memory_archaeology_complete: "insights",
      dream_cycle_completed: "dreams",
      // system-log
      trigger_fired: "system-log",
      stale_steps_recovered: "system-log",
      missing_artifacts: "system-log",
      // drafts
      content_draft_created: "drafts",
      content_approved: "drafts",
      content_rejected: "drafts",
      // project
      agent_spawned: "project",
      agent_proposal_created: "project"
    };
  }
});

// src/lib/tenant/context.ts
function getCurrentTenantContext() {
  return {
    tenantId: DEFAULT_TENANT_ID,
    workspaceId: DEFAULT_WORKSPACE_ID,
    mode: "single-tenant"
  };
}
var DEFAULT_TENANT_ID, DEFAULT_WORKSPACE_ID;
var init_context3 = __esm({
  "src/lib/tenant/context.ts"() {
    "use strict";
    DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID ?? "00000000-0000-0000-0000-000000000001";
    DEFAULT_WORKSPACE_ID = process.env.DEFAULT_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001";
  }
});

// src/lib/tenant/cache-key.ts
function sanitizePart(value) {
  return value.replace(/:/g, "_");
}
function tenantCacheKey(namespace, id, ctx = getCurrentTenantContext()) {
  return [ctx.tenantId, ctx.workspaceId, namespace, id].map(sanitizePart).join(":");
}
var init_cache_key = __esm({
  "src/lib/tenant/cache-key.ts"() {
    "use strict";
    init_context3();
  }
});

// src/lib/ops/policy.ts
var policy_exports = {};
__export(policy_exports, {
  clearPolicyCache: () => clearPolicyCache,
  getPolicy: () => getPolicy,
  getPolicyRecord: () => getPolicyRecord,
  policyHash: () => policyHash,
  policyVersion: () => policyVersion,
  setPolicy: () => setPolicy
});
function stableJson(value) {
  if (value === void 0) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const entries = Object.entries(value).sort(
    ([left], [right]) => left.localeCompare(right)
  );
  return `{${entries.map(([entryKey, entryValue]) => `${JSON.stringify(entryKey)}:${stableJson(entryValue)}`).join(",")}}`;
}
function policyHash(policy) {
  return (0, import_crypto.createHash)("sha256").update(
    stableJson({
      key: policy.key,
      value: policy.value,
      updated_at: policy.updated_at
    })
  ).digest("hex");
}
function policyVersion(policy) {
  const explicitVersion = policy.value.version ?? policy.value.policy_version ?? policy.value.policyVersion;
  return typeof explicitVersion === "string" || typeof explicitVersion === "number" ? String(explicitVersion) : policy.updated_at ?? "unversioned";
}
async function getPolicyRecord(key) {
  const [row] = await sql`
        SELECT value, updated_at::text AS updated_at FROM ops_policy WHERE key = ${key}
    `;
  return {
    key,
    value: row?.value ?? { enabled: false },
    updated_at: row?.updated_at ?? null
  };
}
async function getPolicy(key) {
  const cacheKey = tenantCacheKey("policy", key);
  const cached = policyCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }
  const [row] = await sql`
        SELECT value FROM ops_policy WHERE key = ${key}
    `;
  const value = row?.value ?? { enabled: false };
  policyCache.set(cacheKey, { value, ts: Date.now() });
  return value;
}
async function setPolicy(key, value, description) {
  await sql`
        INSERT INTO ops_policy (key, value, description, updated_at)
        VALUES (${key}, ${jsonb(value)}, ${description ?? null}, NOW())
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            description = COALESCE(EXCLUDED.description, ops_policy.description),
            updated_at = NOW()
    `;
  policyCache.delete(tenantCacheKey("policy", key));
}
function clearPolicyCache() {
  policyCache.clear();
}
var import_crypto, CACHE_TTL_MS, policyCache;
var init_policy = __esm({
  "src/lib/ops/policy.ts"() {
    "use strict";
    import_crypto = require("crypto");
    init_db();
    init_cache_key();
    CACHE_TTL_MS = 3e4;
    policyCache = /* @__PURE__ */ new Map();
  }
});

// src/lib/ops/proposal-runner.ts
var proposal_runner_exports = {};
__export(proposal_runner_exports, {
  assertApprovalStillValid: () => assertApprovalStillValid,
  hashStep: () => hashStep,
  runApprovedProposal: () => runApprovedProposal,
  stableJson: () => stableJson2
});
function stableJson2(value) {
  if (value === void 0) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableJson2).join(",")}]`;
  const entries = Object.entries(value).sort(
    ([left], [right]) => left.localeCompare(right)
  );
  return `{${entries.map(
    ([key, entryValue]) => `${JSON.stringify(key)}:${stableJson2(entryValue)}`
  ).join(",")}}`;
}
function hashStep(step) {
  return (0, import_crypto2.createHash)("sha256").update(
    stableJson2({
      kind: step.kind,
      payload: step.payload ?? {},
      assigned_agent: step.assigned_agent ?? null,
      output_path: step.output_path ?? null
    })
  ).digest("hex");
}
function sameStep(left, right) {
  return left.kind === right.kind && stableJson2(left.payload ?? {}) === stableJson2(right.payload ?? {}) && (left.assigned_agent ?? null) === (right.assigned_agent ?? null) && (left.output_path ?? null) === (right.output_path ?? null);
}
async function assertApprovalStillValid(proposal, step, actor, runtimeContext) {
  if (proposal.status !== "accepted") {
    throw new Error(
      `Proposal ${proposal.id} is not currently accepted; ${actor} cannot execute ${step.kind}`
    );
  }
  if (runtimeContext.approvalExpiresAt && Date.parse(runtimeContext.approvalExpiresAt) <= Date.now()) {
    throw new Error(
      `Approval for proposal ${proposal.id} expired before step ${step.kind}`
    );
  }
  if (!proposal.proposed_steps.some(
    (proposedStep) => sameStep(proposedStep, step)
  )) {
    throw new Error(
      `Step ${step.kind} is not covered by current approval for proposal ${proposal.id}`
    );
  }
}
async function runApprovedProposal(proposal, steps, actor, runtimeContext, executeStep) {
  for (const step of steps) {
    await assertApprovalStillValid(proposal, step, actor, runtimeContext);
    await executeStep(step, runtimeContext);
  }
}
var import_crypto2;
var init_proposal_runner = __esm({
  "src/lib/ops/proposal-runner.ts"() {
    "use strict";
    import_crypto2 = require("crypto");
  }
});

// src/lib/ops/cap-gates.ts
function positiveNumberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
async function getMissionCapPolicy() {
  try {
    const policy = await getPolicy("mission_caps");
    return {
      maxConcurrentMissions: positiveNumberOrDefault(
        policy?.max_concurrent_missions ?? process.env.MISSION_CAP_MAX_CONCURRENT,
        MAX_CONCURRENT_MISSIONS
      ),
      maxDailyStepsPerAgent: positiveNumberOrDefault(
        policy?.max_daily_steps_per_agent ?? process.env.MISSION_CAP_MAX_DAILY_STEPS_PER_AGENT,
        MAX_DAILY_STEPS_PER_AGENT
      ),
      activeMissionStaleHours: positiveNumberOrDefault(
        policy?.active_mission_stale_hours ?? process.env.MISSION_CAP_ACTIVE_STALE_HOURS,
        ACTIVE_MISSION_STALE_HOURS
      )
    };
  } catch {
    return {
      maxConcurrentMissions: positiveNumberOrDefault(
        process.env.MISSION_CAP_MAX_CONCURRENT,
        MAX_CONCURRENT_MISSIONS
      ),
      maxDailyStepsPerAgent: positiveNumberOrDefault(
        process.env.MISSION_CAP_MAX_DAILY_STEPS_PER_AGENT,
        MAX_DAILY_STEPS_PER_AGENT
      ),
      activeMissionStaleHours: positiveNumberOrDefault(
        process.env.MISSION_CAP_ACTIVE_STALE_HOURS,
        ACTIVE_MISSION_STALE_HOURS
      )
    };
  }
}
async function checkCapGates(input) {
  const missionCapPolicy = await getMissionCapPolicy();
  const [{ count: activeMissions }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_missions
        WHERE status = ANY(${ACTIVE_MISSION_STATUSES})
          AND (
            EXISTS (
                SELECT 1 FROM ops_mission_steps s
                WHERE s.mission_id = ops_missions.id
                  AND s.status = ANY(${ACTIVE_STEP_STATUSES})
            )
            OR updated_at >= NOW() - (${missionCapPolicy.activeMissionStaleHours} * INTERVAL '1 hour')
          )
    `;
  if (activeMissions >= missionCapPolicy.maxConcurrentMissions) {
    return {
      ok: false,
      reason: `Too many active missions (${activeMissions}/${missionCapPolicy.maxConcurrentMissions}; statuses=${ACTIVE_MISSION_STATUSES.join(",")}; active_steps=${ACTIVE_STEP_STATUSES.join(",")}; stale_window_hours=${missionCapPolicy.activeMissionStaleHours})`
    };
  }
  const dailySteps = await countTodaySteps(input.agent_id);
  if (dailySteps >= missionCapPolicy.maxDailyStepsPerAgent) {
    return {
      ok: false,
      reason: `Daily step limit reached for ${input.agent_id} (${dailySteps}/${missionCapPolicy.maxDailyStepsPerAgent}; counts all attempted steps created today)`
    };
  }
  try {
    const contentPolicy = await getPolicy("content_caps");
    const maxDrafts = contentPolicy?.max_drafts_per_day ?? 10;
    const draftKinds = ["draft_thread", "draft_essay", "prepare_statement"];
    const hasDraftStep = input.proposed_steps.some(
      (s) => draftKinds.includes(s.kind)
    );
    if (hasDraftStep) {
      const todayStart = /* @__PURE__ */ new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const [{ count: todayDrafts }] = await sql`
                SELECT COUNT(*)::int as count FROM ops_mission_steps s
                JOIN ops_missions m ON s.mission_id = m.id
                WHERE m.created_by = ${input.agent_id}
                AND s.kind = ANY(${draftKinds})
                AND s.created_at >= ${todayStart.toISOString()}
            `;
      if (todayDrafts >= maxDrafts) {
        return {
          ok: false,
          reason: `Daily content draft limit reached (${todayDrafts}/${maxDrafts})`
        };
      }
    }
  } catch {
  }
  return { ok: true };
}
async function countTodaySteps(agentId) {
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [{ count }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_mission_steps s
        JOIN ops_missions m ON s.mission_id = m.id
        WHERE m.created_by = ${agentId}
        AND s.created_at >= ${todayStart.toISOString()}
    `;
  return count;
}
var MAX_CONCURRENT_MISSIONS, MAX_DAILY_STEPS_PER_AGENT, ACTIVE_MISSION_STALE_HOURS, ACTIVE_MISSION_STATUSES, ACTIVE_STEP_STATUSES;
var init_cap_gates = __esm({
  "src/lib/ops/cap-gates.ts"() {
    "use strict";
    init_db();
    init_policy();
    MAX_CONCURRENT_MISSIONS = 50;
    MAX_DAILY_STEPS_PER_AGENT = 200;
    ACTIVE_MISSION_STALE_HOURS = 24;
    ACTIVE_MISSION_STATUSES = ["approved", "running"];
    ACTIVE_STEP_STATUSES = ["queued", "running"];
  }
});

// src/lib/ops/review-packets.ts
function createReviewPacketArtifactId(subjectType, subjectId) {
  return `review-packet:${subjectType}:${subjectId}`;
}
function valueAsString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function valueAsRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function deriveReviewDiff(status, packet, previousStatus, requestedStatus) {
  const from = previousStatus ?? valueAsString(packet.previous_status) ?? valueAsString(packet.previousStatus);
  const to = requestedStatus ?? valueAsString(packet.requested_status) ?? valueAsString(packet.requestedStatus) ?? status;
  return {
    from,
    to,
    changed: from !== to
  };
}
function deriveReviewPolicy(subjectType, status, diff, transitionRulesVersion) {
  const terminalDecision = status === "approved" || status === "rejected";
  const requiresReviewEvidence = terminalDecision || status === "blocked" || status === "awaiting_review";
  return {
    version: REVIEW_PACKET_SCHEMA_VERSION,
    derived_from: "status_diff",
    subject_type: subjectType,
    status,
    diff,
    transition_rules_version: transitionRulesVersion,
    required_evidence: requiresReviewEvidence ? ["decision_basis", "reviewer_or_policy_trace"] : ["submission_trace"],
    risk: terminalDecision ? "state_mutation" : "intake"
  };
}
function deriveTransitionRules(subjectType, status, diff, transitionRulesVersion) {
  return [
    {
      version: transitionRulesVersion,
      rule_id: `${subjectType}:${diff.from ?? "none"}->${diff.to}`,
      subject_type: subjectType,
      from: diff.from,
      to: diff.to,
      review_packet_status: status,
      allowed: true,
      rationale: "Persist a versioned transition receipt before mutating the reviewed subject."
    }
  ];
}
function normalizeEvidence(evidence, packet, decision) {
  const normalized = [...evidence ?? []];
  const sourceTraceId = valueAsString(packet.source_trace_id);
  const reviewSessionId = valueAsString(packet.review_session_id);
  if (sourceTraceId) {
    normalized.push({
      kind: "source_trace",
      source: sourceTraceId,
      summary: "Packet includes upstream source trace identifier.",
      data: { source_trace_id: sourceTraceId }
    });
  }
  if (reviewSessionId) {
    normalized.push({
      kind: "review_session",
      source: reviewSessionId,
      summary: "Packet includes reviewer session evidence.",
      data: { review_session_id: reviewSessionId }
    });
  }
  if (decision) {
    normalized.push({
      kind: "decision",
      source: valueAsString(decision.decidedBy) ?? "unknown",
      summary: `Decision outcome: ${valueAsString(decision.outcome) ?? "recorded"}`,
      data: decision
    });
  }
  return normalized;
}
function deriveLineage(subjectType, subjectId, requestedBy, packet, lineage) {
  const source = valueAsRecord(packet.source) ?? {
    source_trace_id: valueAsString(packet.source_trace_id),
    review_session_id: valueAsString(packet.review_session_id),
    updated_by: valueAsString(packet.updated_by)
  };
  return {
    version: REVIEW_PACKET_SCHEMA_VERSION,
    subject: lineage?.subject ?? { type: subjectType, id: subjectId },
    source: lineage?.source ?? source,
    parentArtifactIds: lineage?.parentArtifactIds ?? [],
    emittedBy: lineage?.emittedBy ?? requestedBy
  };
}
function buildReviewPacket(input) {
  const {
    subjectType,
    subjectId,
    artifactId,
    status,
    requestedBy,
    previousStatus,
    requestedStatus,
    evidence,
    lineage,
    transitionRulesVersion = DEFAULT_TRANSITION_RULES_VERSION,
    packet,
    decision
  } = input;
  const resolvedArtifactId = artifactId ?? createReviewPacketArtifactId(subjectType, subjectId);
  const diff = deriveReviewDiff(status, packet, previousStatus, requestedStatus);
  return {
    ...packet,
    artifactId: resolvedArtifactId,
    artifact_id: resolvedArtifactId,
    schema_version: REVIEW_PACKET_SCHEMA_VERSION,
    diff,
    reviewPolicy: deriveReviewPolicy(
      subjectType,
      status,
      diff,
      transitionRulesVersion
    ),
    reviewEvidence: normalizeEvidence(evidence, packet, decision),
    lineage: deriveLineage(subjectType, subjectId, requestedBy, packet, lineage),
    transitionRules: deriveTransitionRules(
      subjectType,
      status,
      diff,
      transitionRulesVersion
    )
  };
}
async function createOrUpdateReviewPacket(input, db = sql) {
  const {
    subjectType,
    subjectId,
    artifactId,
    status,
    requestedBy,
    title,
    summary,
    decision,
    transitionRulesVersion = DEFAULT_TRANSITION_RULES_VERSION
  } = input;
  const resolvedArtifactId = artifactId ?? createReviewPacketArtifactId(subjectType, subjectId);
  const enrichedPacket = buildReviewPacket(input);
  const [row] = await db`
        INSERT INTO ops_review_packets (
            artifact_id,
            subject_type,
            subject_id,
            status,
            requested_by,
            title,
            summary,
            transition_rules_version,
            packet,
            decision,
            decided_at
        ) VALUES (
            ${resolvedArtifactId},
            ${subjectType},
            ${subjectId},
            ${status},
            ${requestedBy},
            ${title},
            ${summary},
            ${transitionRulesVersion},
            ${jsonb(enrichedPacket)},
            ${decision ? jsonb(decision) : null},
            ${decision ? db`NOW()` : null}
        )
        ON CONFLICT (subject_type, subject_id) DO UPDATE SET
            artifact_id = EXCLUDED.artifact_id,
            status = EXCLUDED.status,
            requested_by = EXCLUDED.requested_by,
            title = EXCLUDED.title,
            summary = EXCLUDED.summary,
            transition_rules_version = EXCLUDED.transition_rules_version,
            packet = EXCLUDED.packet,
            decision = EXCLUDED.decision,
            decided_at = EXCLUDED.decided_at,
            updated_at = NOW()
        RETURNING id
    `;
  return row.id;
}
async function upsertProposalReviewPacket({
  proposalId,
  proposal,
  status,
  reason,
  decision
}) {
  const packet = {
    proposalId,
    agent_id: proposal.agent_id,
    title: proposal.title,
    description: proposal.description ?? null,
    proposed_steps: proposal.proposed_steps,
    source: proposal.source ?? "agent",
    source_trace_id: proposal.source_trace_id ?? null,
    reason,
    updated_by: "proposal-service"
  };
  return createOrUpdateReviewPacket({
    subjectType: "mission_proposal",
    subjectId: proposalId,
    status,
    requestedBy: proposal.agent_id,
    title: proposal.title,
    summary: reason,
    previousStatus: "pending",
    requestedStatus: status,
    packet,
    decision
  });
}
var REVIEW_PACKET_SCHEMA_VERSION, DEFAULT_TRANSITION_RULES_VERSION;
var init_review_packets = __esm({
  "src/lib/ops/review-packets.ts"() {
    "use strict";
    init_db();
    REVIEW_PACKET_SCHEMA_VERSION = 1;
    DEFAULT_TRANSITION_RULES_VERSION = 1;
  }
});

// src/lib/ops/proposal-service.ts
var proposal_service_exports = {};
__export(proposal_service_exports, {
  countTodayProposals: () => countTodayProposals,
  createMissionFromProposal: () => createMissionFromProposal,
  createProposal: () => createProposal,
  createProposalAndMaybeAutoApprove: () => createProposalAndMaybeAutoApprove,
  evaluateProposalApproval: () => evaluateProposalApproval,
  validateSealedExecutionContract: () => validateSealedExecutionContract
});
function isUniqueViolation(error) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
async function findReplayProposal(input) {
  if (!input.source_trace_id) return null;
  const [existing] = await sql`
        SELECT p.id, m.id AS mission_id
        FROM ops_mission_proposals p
        LEFT JOIN ops_missions m ON m.proposal_id = p.id
        WHERE p.source = ${input.source ?? "agent"}
          AND p.source_trace_id = ${input.source_trace_id}
          AND p.title = ${input.title}
        ORDER BY p.created_at ASC
        LIMIT 1
    `;
  return existing ?? null;
}
function replayResult(existing, input) {
  log7.info("Proposal replay ignored by source_trace_id", {
    proposalId: existing.id,
    missionId: existing.mission_id,
    source: input.source ?? "agent",
    sourceTraceId: input.source_trace_id
  });
  return {
    success: true,
    proposalId: existing.id,
    missionId: existing.mission_id ?? void 0,
    replayed: true
  };
}
async function createProposalAndMaybeAutoApprove(input) {
  const created = await createProposal(input);
  if (!created.success || !created.proposalId || created.replayed) {
    return created;
  }
  return evaluateProposalApproval(created.proposalId, input);
}
async function createProposal(input) {
  if (input.source_trace_id) {
    const existing = await findReplayProposal(input);
    if (existing) {
      return replayResult(existing, input);
    }
    const [{ count: sessionCount }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_mission_proposals
            WHERE source_trace_id = ${input.source_trace_id}
        `;
    if (sessionCount >= 2) {
      return {
        success: false,
        reason: "Per-session proposal limit (2) reached. Consolidate ideas into fewer proposals with multiple steps."
      };
    }
  }
  const todayCount = await countTodayProposals(input.agent_id);
  if (todayCount >= DAILY_PROPOSAL_LIMIT) {
    return {
      success: false,
      reason: `Daily proposal limit (${DAILY_PROPOSAL_LIMIT}) reached for ${input.agent_id}`
    };
  }
  const gateResult = await checkCapGates(input);
  if (!gateResult.ok) {
    return { success: false, reason: gateResult.reason };
  }
  let proposal;
  try {
    [proposal] = await sql`
            INSERT INTO ops_mission_proposals (agent_id, title, description, proposed_steps, source, source_trace_id, status)
            VALUES (
                ${input.agent_id},
                ${input.title},
                ${input.description ?? null},
                ${jsonb(input.proposed_steps)},
                ${input.source ?? "agent"},
                ${input.source_trace_id ?? null},
                'pending'
            )
            RETURNING id
        `;
  } catch (error) {
    if (input.source_trace_id && isUniqueViolation(error)) {
      const existing = await findReplayProposal(input);
      if (existing) {
        return replayResult(existing, input);
      }
    }
    throw error;
  }
  const proposalId = proposal.id;
  await upsertProposalReviewPacket({
    proposalId,
    proposal: input,
    status: "submitted",
    reason: `Proposal created. Approval evaluation pending. ${input.proposed_steps.length} step(s).`
  });
  await emitEvent({
    agent_id: input.agent_id,
    kind: "proposal_created",
    title: `Proposal: ${input.title}`,
    summary: `Proposal created. Approval evaluation pending. ${input.proposed_steps.length} step(s).`,
    tags: ["proposal", "pending"],
    metadata: { proposalId }
  });
  return { success: true, proposalId };
}
async function evaluateProposalApproval(proposalId, input) {
  const evaluation = await buildApprovalEvaluation(input);
  await recordApprovalEvaluation(proposalId, evaluation);
  if (evaluation.outcome === "held_for_review") {
    await upsertProposalReviewPacket({
      proposalId,
      proposal: input,
      status: "awaiting_review",
      reason: evaluation.reason,
      decision: evaluationDecision(evaluation)
    });
    await emitEvent({
      agent_id: input.agent_id,
      kind: "proposal_held_for_review",
      title: `Held for review: ${input.title}`,
      summary: evaluation.reason,
      tags: ["proposal", "held", "veto_gate"],
      metadata: {
        proposalId,
        evaluationOutcome: evaluation.outcome,
        protectedKinds: evaluation.blockedStepKinds
      }
    });
    return { success: true, proposalId };
  }
  if (evaluation.outcome === "approved") {
    await upsertProposalReviewPacket({
      proposalId,
      proposal: input,
      status: "approved",
      reason: evaluation.reason,
      decision: evaluationDecision(evaluation)
    });
    await sql`
            UPDATE ops_mission_proposals
            SET status = 'accepted', auto_approved = true, updated_at = NOW()
            WHERE id = ${proposalId}
        `;
    const missionId = await createMissionFromProposal(proposalId);
    await emitEventAndCheckReactions({
      agent_id: input.agent_id,
      kind: "proposal_auto_approved",
      title: `Auto-approved: ${input.title}`,
      summary: evaluation.reason,
      tags: ["proposal", "auto_approved"],
      metadata: {
        proposalId,
        missionId,
        evaluationOutcome: evaluation.outcome
      }
    });
    return { success: true, proposalId, missionId };
  }
  await upsertProposalReviewPacket({
    proposalId,
    proposal: input,
    status: "submitted",
    reason: evaluation.reason,
    decision: evaluationDecision(evaluation)
  });
  return { success: true, proposalId };
}
async function buildApprovalEvaluation(input) {
  const vetoPolicyRecord = await getPolicyRecord("veto_authority");
  const vetoPolicy = vetoPolicyRecord.value;
  const protectedKinds = vetoPolicy.enabled ? vetoPolicy.protected_step_kinds ?? [] : [];
  const proposedStepKinds = input.proposed_steps.map((step) => step.kind);
  const blockedStepKinds = proposedStepKinds.filter(
    (kind) => protectedKinds.includes(kind)
  );
  const autoApprovePolicyRecord = await getPolicyRecord("auto_approve");
  const autoApprovePolicy = autoApprovePolicyRecord.value;
  const autoApproveEnabled = autoApprovePolicy.enabled;
  const allowedKinds = autoApprovePolicy.allowed_step_kinds ?? [];
  const policyFingerprint = buildApprovalPolicyFingerprint([
    autoApprovePolicyRecord,
    vetoPolicyRecord
  ]);
  const TRUSTED_SOURCES = /* @__PURE__ */ new Set(["conversation", "system"]);
  const isTrustedSource = TRUSTED_SOURCES.has(input.source ?? "agent");
  const shouldAutoApprove = autoApproveEnabled && (isTrustedSource || input.proposed_steps.every(
    (step) => allowedKinds.includes(step.kind)
  ));
  const buildStepDecisions = (outcome) => Object.fromEntries(
    input.proposed_steps.map((step) => {
      const stepHash = hashStep(step);
      const decision = buildStepApprovalDecision({
        step,
        stepHash,
        outcome,
        isTrustedSource,
        autoApproveEnabled,
        allowedKinds,
        protectedKinds,
        policyFingerprint
      });
      return [stepHash, decision];
    })
  );
  if (blockedStepKinds.length > 0) {
    return {
      outcome: "held_for_review",
      reason: "Contains protected step kind(s). Requires manual approval.",
      autoApproveEnabled,
      trustedSource: isTrustedSource,
      allowedKinds,
      protectedKinds,
      proposedStepKinds,
      blockedStepKinds,
      decidedBy: "veto_authority_policy",
      stepDecisions: buildStepDecisions("held_for_review")
    };
  }
  if (shouldAutoApprove) {
    return {
      outcome: "approved",
      reason: `Proposal auto-approved with ${input.proposed_steps.length} step(s)`,
      autoApproveEnabled,
      trustedSource: isTrustedSource,
      allowedKinds,
      protectedKinds,
      proposedStepKinds,
      blockedStepKinds,
      decidedBy: "auto_approve_policy",
      stepDecisions: buildStepDecisions("approved")
    };
  }
  return {
    outcome: "pending_review",
    reason: `Awaiting review. ${input.proposed_steps.length} step(s).`,
    autoApproveEnabled,
    trustedSource: isTrustedSource,
    allowedKinds,
    protectedKinds,
    proposedStepKinds,
    blockedStepKinds,
    decidedBy: "auto_approve_policy",
    stepDecisions: buildStepDecisions("pending_review")
  };
}
function buildApprovalPolicyFingerprint(policies) {
  const normalizedPolicies = policies.map(normalizePolicyRecord);
  return {
    version: normalizedPolicies.map((policy) => `${policy.key}@${policy.version}`).join("|"),
    hash: policyHash({
      key: "approval_policy_bundle",
      value: Object.fromEntries(
        normalizedPolicies.map((policy) => [policy.key, policy.value])
      ),
      updated_at: normalizedPolicies.map((policy) => `${policy.key}:${policy.updated_at ?? "null"}`).join("|")
    })
  };
}
function normalizePolicyRecord(policy) {
  return {
    key: policy.key,
    value: policy.value,
    updated_at: policy.updated_at,
    version: policyVersion(policy)
  };
}
function buildStepApprovalDecision(input) {
  const {
    step,
    stepHash,
    outcome,
    isTrustedSource,
    autoApproveEnabled,
    allowedKinds,
    protectedKinds,
    policyFingerprint
  } = input;
  if (protectedKinds.includes(step.kind)) {
    return {
      stepHash,
      stepKind: step.kind,
      outcome: "held_for_review",
      riskClass: "high",
      matchedRule: "veto_authority.protected_step_kind",
      reason: `Step kind ${step.kind} is protected by veto authority policy.`,
      policyVersion: policyFingerprint.version,
      policyHash: policyFingerprint.hash
    };
  }
  if (!autoApproveEnabled) {
    return {
      stepHash,
      stepKind: step.kind,
      outcome,
      riskClass: "medium",
      matchedRule: "auto_approve.disabled",
      reason: "Auto-approval policy is disabled.",
      policyVersion: policyFingerprint.version,
      policyHash: policyFingerprint.hash
    };
  }
  if (isTrustedSource) {
    return {
      stepHash,
      stepKind: step.kind,
      outcome,
      riskClass: "low",
      matchedRule: "auto_approve.trusted_source",
      reason: "Trusted source may auto-approve this step under current policy.",
      policyVersion: policyFingerprint.version,
      policyHash: policyFingerprint.hash
    };
  }
  if (allowedKinds.includes(step.kind)) {
    return {
      stepHash,
      stepKind: step.kind,
      outcome,
      riskClass: "low",
      matchedRule: "auto_approve.allowed_step_kind",
      reason: `Step kind ${step.kind} is listed in auto-approve policy.`,
      policyVersion: policyFingerprint.version,
      policyHash: policyFingerprint.hash
    };
  }
  return {
    stepHash,
    stepKind: step.kind,
    outcome,
    riskClass: "medium",
    matchedRule: "auto_approve.step_kind_not_allowed",
    reason: `Step kind ${step.kind} is not listed in auto-approve policy.`,
    policyVersion: policyFingerprint.version,
    policyHash: policyFingerprint.hash
  };
}
async function recordApprovalEvaluation(proposalId, evaluation) {
  const [record] = await sql`
        INSERT INTO ops_proposal_approval_evaluations (
            proposal_id,
            outcome,
            reason,
            auto_approve_enabled,
            trusted_source,
            allowed_step_kinds,
            protected_step_kinds,
            proposed_step_kinds,
            blocked_step_kinds,
            step_decisions,
            decision
        ) VALUES (
            ${proposalId},
            ${evaluation.outcome},
            ${evaluation.reason},
            ${evaluation.autoApproveEnabled},
            ${evaluation.trustedSource},
            ${jsonb(evaluation.allowedKinds)},
            ${jsonb(evaluation.protectedKinds)},
            ${jsonb(evaluation.proposedStepKinds)},
            ${jsonb(evaluation.blockedStepKinds)},
            ${jsonb(evaluation.stepDecisions)},
            ${jsonb(evaluationDecision(evaluation))}
        )
        RETURNING id
    `;
  return record.id;
}
function evaluationDecision(evaluation) {
  return {
    outcome: evaluation.outcome,
    autoApproved: evaluation.outcome === "approved",
    decidedBy: evaluation.decidedBy,
    trustedSource: evaluation.trustedSource,
    autoApproveEnabled: evaluation.autoApproveEnabled,
    allowedKinds: evaluation.allowedKinds,
    protectedKinds: evaluation.protectedKinds,
    proposedStepKinds: evaluation.proposedStepKinds,
    blockedStepKinds: evaluation.blockedStepKinds,
    stepDecisions: evaluation.stepDecisions
  };
}
function sha256(value) {
  return (0, import_crypto3.createHash)("sha256").update(stableJson2(value)).digest("hex");
}
function proposalRevision(proposal) {
  return `${proposal.id}:${proposal.updated_at}`;
}
function proposalSnapshot(proposal) {
  return {
    id: proposal.id,
    agent_id: proposal.agent_id,
    title: proposal.title,
    description: proposal.description ?? null,
    status: proposal.status,
    proposed_steps: proposal.proposed_steps,
    source: proposal.source,
    source_trace_id: proposal.source_trace_id ?? null,
    auto_approved: proposal.auto_approved,
    created_at: proposal.created_at,
    updated_at: proposal.updated_at
  };
}
function normalizeAcceptanceCriteria(value, fallback) {
  if (Array.isArray(value)) {
    const criteria = value.filter(
      (entry) => typeof entry === "string" && entry.trim().length > 0
    );
    if (criteria.length > 0) return criteria;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  return [fallback];
}
function stringFromPayload(proposal, key) {
  for (const step of proposal.proposed_steps) {
    const value = step.payload?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}
async function latestApprovedEvaluation(proposalId) {
  const [evaluation] = await sql`
        SELECT id, outcome, reason, trusted_source, step_decisions, decision, created_at
        FROM ops_proposal_approval_evaluations
        WHERE proposal_id = ${proposalId}
        ORDER BY created_at DESC
        LIMIT 1
    `;
  if (!evaluation) {
    throw new Error(
      `Proposal ${proposalId} has no approval evaluation; refusing to create mission`
    );
  }
  if (evaluation.outcome !== "approved") {
    throw new Error(
      `Proposal ${proposalId} latest evaluation is ${evaluation.outcome}; refusing to create mission`
    );
  }
  return evaluation;
}
function buildExecutionContract(proposal, evaluation) {
  if (proposal.status !== "accepted") {
    throw new Error(
      `Proposal ${proposal.id} is ${proposal.status}; only accepted proposals can produce missions`
    );
  }
  const proposalHash = sha256(proposalSnapshot(proposal));
  const approvedAt = new Date(evaluation.created_at).toISOString();
  const expiresAt = new Date(
    new Date(evaluation.created_at).getTime() + 7 * 24 * 60 * 60 * 1e3
  ).toISOString();
  const decidedBy = typeof evaluation.decision.decidedBy === "string" ? evaluation.decision.decidedBy : "unknown_approver";
  const unsignedContract = {
    schemaVersion: 1,
    sealed: true,
    proposalId: proposal.id,
    proposalRevision: proposalRevision(proposal),
    proposalHash,
    approvalEvaluationId: evaluation.id,
    approvedAt,
    expiresAt,
    rationale: evaluation.reason,
    approver: {
      type: "policy",
      id: decidedBy,
      metadata: {
        trustedSource: evaluation.trusted_source,
        decision: evaluation.decision
      }
    },
    beneficiary: stringFromPayload(proposal, "beneficiary") ?? proposal.agent_id,
    riskOwner: stringFromPayload(proposal, "risk_owner") ?? stringFromPayload(proposal, "riskOwner") ?? proposal.agent_id,
    approvedSteps: proposal.proposed_steps.map((step, index) => {
      const stepHash = hashStep(step);
      const payload = step.payload ?? {};
      return {
        index,
        kind: step.kind,
        stepHash,
        payload,
        assignedAgent: step.assigned_agent ?? null,
        outputPath: step.output_path ?? null,
        acceptanceCriteria: normalizeAcceptanceCriteria(
          payload.acceptance_criteria ?? payload.acceptanceCriteria,
          `Step ${index + 1} (${step.kind}) completes successfully without violating the approved payload boundary.`
        ),
        approvalDecision: evaluation.step_decisions[stepHash] ?? null
      };
    })
  };
  const contract = {
    ...unsignedContract,
    contractHash: sha256(unsignedContract)
  };
  return validateExecutionContract(contract, proposal);
}
function validateSealedExecutionContract(contract) {
  const parsedContract = missionExecutionContractSchema.parse(contract);
  const unsignedContract = { ...parsedContract };
  delete unsignedContract.contractHash;
  const requiredStrings = [
    ["proposalId", parsedContract.proposalId],
    ["proposalRevision", parsedContract.proposalRevision],
    ["proposalHash", parsedContract.proposalHash],
    ["approvalEvaluationId", parsedContract.approvalEvaluationId],
    ["approvedAt", parsedContract.approvedAt],
    ["expiresAt", parsedContract.expiresAt],
    ["rationale", parsedContract.rationale],
    ["approver.id", parsedContract.approver.id],
    ["beneficiary", parsedContract.beneficiary],
    ["riskOwner", parsedContract.riskOwner],
    ["contractHash", parsedContract.contractHash]
  ];
  for (const [field, value] of requiredStrings) {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Execution contract missing required field ${field}`);
    }
  }
  if (parsedContract.schemaVersion !== 1 || parsedContract.sealed !== true) {
    throw new Error("Execution contract must be schemaVersion=1 and sealed");
  }
  if (parsedContract.approvedSteps.length === 0) {
    throw new Error("Execution contract must include at least one approved step");
  }
  if (Date.parse(parsedContract.expiresAt) <= Date.parse(parsedContract.approvedAt)) {
    throw new Error("Execution contract expiry must be after approval time");
  }
  for (const approvedStep of parsedContract.approvedSteps) {
    if (approvedStep.acceptanceCriteria.length === 0) {
      throw new Error(
        `Execution contract step ${approvedStep.index} has no acceptance criteria`
      );
    }
    if (approvedStep.approvalDecision?.outcome !== "approved") {
      throw new Error(
        `Execution contract step ${approvedStep.index} is missing an approved decision`
      );
    }
  }
  if (parsedContract.contractHash !== sha256(unsignedContract)) {
    throw new Error("Execution contract hash is invalid");
  }
  return parsedContract;
}
function validateExecutionContract(contract, proposal) {
  const parsedContract = validateSealedExecutionContract(contract);
  if (parsedContract.proposalId !== proposal.id) {
    throw new Error("Execution contract proposalId does not match proposal");
  }
  if (parsedContract.proposalRevision !== proposalRevision(proposal)) {
    throw new Error("Execution contract proposal revision does not match proposal");
  }
  if (parsedContract.proposalHash !== sha256(proposalSnapshot(proposal))) {
    throw new Error("Execution contract proposal hash does not match proposal");
  }
  if (parsedContract.approvedSteps.length !== proposal.proposed_steps.length) {
    throw new Error("Execution contract approved steps do not match proposal");
  }
  for (const approvedStep of parsedContract.approvedSteps) {
    const proposedStep = proposal.proposed_steps[approvedStep.index];
    if (!proposedStep || approvedStep.stepHash !== hashStep(proposedStep)) {
      throw new Error(
        `Execution contract step ${approvedStep.index} does not match proposal`
      );
    }
  }
  return parsedContract;
}
async function createMissionFromProposal(proposalId) {
  const [proposal] = await sql`
        SELECT * FROM ops_mission_proposals WHERE id = ${proposalId}
    `;
  if (!proposal) throw new Error(`Proposal ${proposalId} not found`);
  const approvalEvaluation = await latestApprovedEvaluation(proposalId);
  const executionContract = buildExecutionContract(
    proposal,
    approvalEvaluation
  );
  const [mission] = await sql`
        INSERT INTO ops_missions (proposal_id, title, description, status, created_by, execution_contract)
        VALUES (
            ${proposalId},
            ${proposal.title},
            ${proposal.description ?? null},
            'approved',
            ${proposal.agent_id},
            ${jsonb(executionContract)}
        )
        ON CONFLICT (proposal_id) WHERE proposal_id IS NOT NULL DO UPDATE
            SET execution_contract = COALESCE(ops_missions.execution_contract, EXCLUDED.execution_contract),
                updated_at = CASE
                    WHEN ops_missions.execution_contract IS NULL THEN NOW()
                    ELSE ops_missions.updated_at
                END
        RETURNING id, (xmax = 0) AS created, execution_contract
    `;
  const missionId = mission.id;
  validateExecutionContract(mission.execution_contract, proposal);
  if (!mission.created) {
    return missionId;
  }
  const steps = proposal.proposed_steps;
  let stepCount = 0;
  for (const step of steps) {
    await sql`
            INSERT INTO ops_mission_steps (mission_id, kind, status, payload, assigned_agent, output_path)
            VALUES (
                ${missionId},
                ${step.kind},
                'queued',
                ${jsonb(step.payload ?? {})},
                ${step.assigned_agent ?? null},
                ${step.output_path ?? null}
            )
        `;
    stepCount++;
  }
  if (stepCount === 0) {
    log7.warn("Mission created with no steps \u2014 marking as failed", {
      missionId,
      proposalId
    });
    await sql`
            UPDATE ops_missions
            SET status = 'failed', failure_reason = 'No steps created (empty proposal)'
            WHERE id = ${missionId}
        `;
  }
  return missionId;
}
async function countTodayProposals(agentId) {
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [{ count }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_mission_proposals
        WHERE agent_id = ${agentId}
        AND created_at >= ${todayStart.toISOString()}
    `;
  return count;
}
var import_crypto3, import_zod, log7, approvalEvaluationOutcomeSchema, approvalRiskClassSchema, recordSchema, stepApprovalDecisionSchema, missionExecutionContractSchema;
var init_proposal_service = __esm({
  "src/lib/ops/proposal-service.ts"() {
    "use strict";
    init_db();
    import_crypto3 = require("crypto");
    import_zod = require("zod");
    init_policy();
    init_proposal_runner();
    init_cap_gates();
    init_events2();
    init_review_packets();
    init_agents();
    init_logger();
    log7 = logger.child({ module: "proposal-service" });
    approvalEvaluationOutcomeSchema = import_zod.z.enum([
      "approved",
      "held_for_review",
      "pending_review"
    ]);
    approvalRiskClassSchema = import_zod.z.enum(["low", "medium", "high"]);
    recordSchema = import_zod.z.record(import_zod.z.string(), import_zod.z.unknown());
    stepApprovalDecisionSchema = import_zod.z.object({
      stepHash: import_zod.z.string().min(1),
      stepKind: import_zod.z.string().min(1),
      outcome: approvalEvaluationOutcomeSchema,
      riskClass: approvalRiskClassSchema,
      matchedRule: import_zod.z.string().min(1),
      reason: import_zod.z.string().min(1),
      policyVersion: import_zod.z.string().min(1),
      policyHash: import_zod.z.string().min(1)
    }).strict();
    missionExecutionContractSchema = import_zod.z.object({
      schemaVersion: import_zod.z.literal(1),
      sealed: import_zod.z.literal(true),
      proposalId: import_zod.z.string().min(1),
      proposalRevision: import_zod.z.string().min(1),
      proposalHash: import_zod.z.string().min(1),
      approvalEvaluationId: import_zod.z.string().min(1),
      approvedAt: import_zod.z.string().datetime({ offset: true }),
      expiresAt: import_zod.z.string().datetime({ offset: true }),
      rationale: import_zod.z.string().min(1),
      approver: import_zod.z.object({
        type: import_zod.z.enum(["policy", "operator", "agent"]),
        id: import_zod.z.string().min(1),
        metadata: recordSchema
      }).strict(),
      beneficiary: import_zod.z.string().min(1),
      riskOwner: import_zod.z.string().min(1),
      approvedSteps: import_zod.z.array(
        import_zod.z.object({
          index: import_zod.z.number().int().nonnegative(),
          kind: import_zod.z.string().min(1),
          stepHash: import_zod.z.string().min(1),
          payload: recordSchema,
          assignedAgent: import_zod.z.string().min(1).nullable(),
          outputPath: import_zod.z.string().min(1).nullable(),
          acceptanceCriteria: import_zod.z.array(import_zod.z.string().min(1)),
          approvalDecision: stepApprovalDecisionSchema.nullable()
        }).strict()
      ),
      contractHash: import_zod.z.string().min(1)
    }).strict();
  }
});

// src/lib/ops/reaction-matrix.ts
var reaction_matrix_exports = {};
__export(reaction_matrix_exports, {
  checkReactionMatrix: () => checkReactionMatrix,
  processReactionQueue: () => processReactionQueue
});
async function checkReactionMatrix(eventId, input) {
  try {
    const matrixPolicy = await getPolicy("reaction_matrix");
    const patterns = matrixPolicy?.patterns ?? [];
    if (patterns.length === 0) return;
    for (const pattern of patterns) {
      if (pattern.source !== "*" && pattern.source !== input.agent_id) {
        continue;
      }
      const eventTags = input.tags ?? [];
      const hasTagOverlap = pattern.tags.some((t) => eventTags.includes(t));
      if (!hasTagOverlap) continue;
      if (Math.random() > pattern.probability) continue;
      const onCooldown = await checkReactionCooldown(
        input.agent_id,
        pattern.target,
        pattern.type,
        pattern.cooldown
      );
      if (onCooldown) continue;
      await sql`
                INSERT INTO ops_agent_reactions (source_event_id, source_agent, target_agent, reaction_type, status)
                VALUES (${eventId}, ${input.agent_id}, ${pattern.target}, ${pattern.type}, 'queued')
            `;
    }
  } catch (err) {
    log8.error("Error checking reactions", { error: err, eventId });
  }
}
async function processReactionQueue(timeoutMs = 3e3) {
  const deadline = Date.now() + timeoutMs;
  let processed = 0;
  let created = 0;
  const queued = await sql`
        SELECT id, source_agent, target_agent, reaction_type
        FROM ops_agent_reactions
        WHERE status = 'queued'
        ORDER BY created_at ASC
        LIMIT 10
    `;
  for (const reaction of queued) {
    if (Date.now() >= deadline) break;
    try {
      await sql`
                UPDATE ops_agent_reactions
                SET status = 'processing', updated_at = NOW()
                WHERE id = ${reaction.id}
            `;
      const REACTION_STEP_KINDS = {
        review: "critique_content",
        comment: "draft_essay",
        research: "research_topic",
        challenge: "convene_roundtable",
        synthesize: "distill_insight",
        boost: "draft_thread"
      };
      const stepKind = REACTION_STEP_KINDS[reaction.reaction_type] ?? "research_topic";
      const result = await createProposalAndMaybeAutoApprove({
        agent_id: reaction.target_agent,
        title: `Reaction: ${reaction.reaction_type}`,
        description: `Triggered by ${reaction.source_agent} event`,
        proposed_steps: [{ kind: stepKind }],
        source: "reaction",
        source_trace_id: `reaction:${reaction.id}`
      });
      await sql`
                UPDATE ops_agent_reactions
                SET status = 'completed', updated_at = NOW()
                WHERE id = ${reaction.id}
            `;
      processed++;
      if (result.success && result.proposalId) created++;
    } catch (err) {
      log8.error("Failed to process reaction", {
        error: err,
        reactionId: reaction.id
      });
      await sql`
                UPDATE ops_agent_reactions
                SET status = 'failed', updated_at = NOW()
                WHERE id = ${reaction.id}
            `;
      processed++;
    }
  }
  return { processed, created };
}
async function checkReactionCooldown(source, target, type, cooldownMinutes) {
  if (cooldownMinutes <= 0) return false;
  const cutoff = new Date(Date.now() - cooldownMinutes * 6e4);
  const [{ count }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_agent_reactions
        WHERE source_agent = ${source}
        AND target_agent = ${target}
        AND reaction_type = ${type}
        AND created_at >= ${cutoff.toISOString()}
    `;
  return count > 0;
}
var log8;
var init_reaction_matrix = __esm({
  "src/lib/ops/reaction-matrix.ts"() {
    "use strict";
    init_db();
    init_policy();
    init_proposal_service();
    init_logger();
    log8 = logger.child({ module: "reaction-matrix" });
  }
});

// src/lib/ops/events.ts
var events_exports2 = {};
__export(events_exports2, {
  emitEvent: () => emitEvent,
  emitEventAndCheckReactions: () => emitEventAndCheckReactions
});
async function emitEvent(input) {
  try {
    const meta = input.metadata ?? {};
    const [row] = await sql`
            INSERT INTO ops_agent_events (agent_id, kind, title, summary, tags, metadata)
            VALUES (
                ${input.agent_id},
                ${input.kind},
                ${input.title},
                ${input.summary ?? null},
                ${input.tags ?? []},
                ${jsonb(meta)}
            )
            RETURNING id`;
    Promise.resolve().then(() => (init_events(), events_exports)).then(({ postEventToDiscord: postEventToDiscord2 }) => postEventToDiscord2(input)).catch(
      (err) => log9.warn("Discord event posting failed", {
        kind: input.kind,
        error: err.message
      })
    );
    return row.id;
  } catch (err) {
    log9.error("Failed to emit event", {
      error: err,
      kind: input.kind,
      agent_id: input.agent_id
    });
    throw new Error(`Failed to emit event: ${err.message}`);
  }
}
async function emitEventAndCheckReactions(input) {
  const eventId = await emitEvent(input);
  const { checkReactionMatrix: checkReactionMatrix2 } = await Promise.resolve().then(() => (init_reaction_matrix(), reaction_matrix_exports));
  await checkReactionMatrix2(eventId, input);
  return eventId;
}
var log9;
var init_events2 = __esm({
  "src/lib/ops/events.ts"() {
    "use strict";
    init_db();
    init_logger();
    log9 = logger.child({ module: "events" });
  }
});

// src/lib/ops/memory.ts
async function queryRelevantMemories(agentId, topic, options) {
  const relevantLimit = options?.relevantLimit ?? 3;
  const recentLimit = options?.recentLimit ?? 2;
  const recentRows = await sql`
        SELECT * FROM ops_agent_memory
        WHERE agent_id = ${agentId}
          AND superseded_by IS NULL
        ORDER BY created_at DESC
        LIMIT ${recentLimit + relevantLimit}
    `;
  const embedding = await getEmbedding(topic);
  if (!embedding) {
    return recentRows.slice(0, relevantLimit + recentLimit);
  }
  try {
    const vectorStr = `[${embedding.join(",")}]`;
    const relevantRows = await sql`
            SELECT * FROM ops_agent_memory
            WHERE agent_id = ${agentId}
              AND superseded_by IS NULL
              AND embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${relevantLimit}
        `;
    const seen = new Set(relevantRows.map((r) => r.id));
    const merged = [...relevantRows];
    for (const row of recentRows) {
      if (!seen.has(row.id)) {
        merged.push(row);
        seen.add(row.id);
        if (merged.length >= relevantLimit + recentLimit) break;
      }
    }
    return merged;
  } catch {
    return recentRows.slice(0, relevantLimit + recentLimit);
  }
}
async function writeMemory(input) {
  const confidence = input.confidence ?? 0.5;
  if (confidence < 0.4) return null;
  if (input.source_trace_id) {
    const [{ count }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_agent_memory
            WHERE source_trace_id = ${input.source_trace_id}
        `;
    if (count > 0) return null;
  }
  try {
    const embedding = await getEmbedding(input.content);
    const insertData = {
      agent_id: input.agent_id,
      type: input.type,
      content: input.content,
      confidence: Math.round(confidence * 100) / 100,
      tags: input.tags ?? [],
      source_trace_id: input.source_trace_id ?? null
    };
    let row;
    if (embedding) {
      const vectorStr = `[${embedding.join(",")}]`;
      [row] = await sql`
                INSERT INTO ops_agent_memory ${sql(insertData)}
                RETURNING id
            `;
      await sql`
                UPDATE ops_agent_memory
                SET embedding = ${vectorStr}::vector
                WHERE id = ${row.id}
            `.catch(() => {
      });
    } else {
      [row] = await sql`
                INSERT INTO ops_agent_memory ${sql(insertData)}
                RETURNING id
            `;
    }
    return row.id;
  } catch (err) {
    log10.error("Failed to write memory", {
      error: err,
      agent_id: input.agent_id,
      type: input.type
    });
    return null;
  }
}
async function enforceMemoryCap(agentId) {
  if (MAX_MEMORIES_PER_AGENT === null) return;
  const [{ count }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_agent_memory
        WHERE agent_id = ${agentId} AND superseded_by IS NULL
    `;
  if (count <= MAX_MEMORIES_PER_AGENT) return;
  const overage = count - MAX_MEMORIES_PER_AGENT;
  const oldest = await sql`
        SELECT id FROM ops_agent_memory
        WHERE agent_id = ${agentId} AND superseded_by IS NULL
        ORDER BY created_at ASC
        LIMIT ${overage}
    `;
  if (oldest.length > 0) {
    const ids = oldest.map((r) => r.id);
    await sql`DELETE FROM ops_agent_memory WHERE id = ANY(${ids})`;
  }
}
var log10, configuredMemoryCap, MAX_MEMORIES_PER_AGENT;
var init_memory = __esm({
  "src/lib/ops/memory.ts"() {
    "use strict";
    init_db();
    init_logger();
    init_embeddings();
    log10 = logger.child({ module: "memory" });
    configuredMemoryCap = Number.parseInt(
      process.env.MEMORY_MAX_PER_AGENT ?? "",
      10
    );
    MAX_MEMORIES_PER_AGENT = Number.isFinite(configuredMemoryCap) && configuredMemoryCap > 0 ? configuredMemoryCap : null;
  }
});

// src/lib/ops/memory-distiller.ts
async function distillConversationMemories(sessionId, history, format) {
  if (history.length < 2) return 0;
  const distillPolicy = await getPolicy("roundtable_distillation");
  const maxMemories = distillPolicy.max_memories_per_conversation ?? 6;
  const minConfidence = distillPolicy.min_confidence_threshold ?? 0.55;
  const maxActionItems = distillPolicy.max_action_items_per_conversation ?? 3;
  const speakers = [...new Set(history.map((h) => h.speaker))];
  const recentHistory = history.length > 8 ? history.slice(-8) : history;
  const transcript = recentHistory.map((h) => `[${h.speaker}]: ${h.dialogue}`).join("\n");
  const includeDrifts = speakers.length > 3;
  const includeActions = ACTION_ITEM_FORMATS.includes(format);
  let driftSchema = "";
  let driftRules = "";
  if (includeDrifts) {
    driftSchema = `  "pairwise_drift": [
    { "agent_a": "string", "agent_b": "string", "drift": -0.03 to 0.03, "reason": "max 200 chars" }
  ],`;
    driftRules = `- Drift is a small float between -0.03 and 0.03 (positive=warmer, negative=cooler). Only report non-zero drifts.`;
  }
  let actionSchema = "";
  let actionRules = "";
  if (includeActions) {
    actionSchema = `  "action_items": [
    { "title": "string", "agent_id": "string", "step_kind": "string" }
  ],`;
    actionRules = `- Max ${maxActionItems} action items \u2014 only tasks explicitly committed to or clearly implied
- step_kind: research_topic, scan_signals, draft_essay, draft_thread, critique_content, audit_system, patch_code, distill_insight, document_lesson, convene_roundtable`;
  }
  const memoriesPrompt = `You are a memory extraction system for an AI agent collective.

Analyze this ${format} conversation and extract memories${includeDrifts ? ", relationship drifts" : ""}${includeActions ? ", and action items" : ""}.

Conversation transcript:
${transcript}

Participants: ${speakers.join(", ")}

Respond with valid JSON only:
{
  "memories": [
    { "agent_id": "string", "type": "insight|pattern|strategy|preference|lesson", "content": "max 400 chars", "confidence": 0.55-1.0, "tags": ["string"] }
  ],
${driftSchema}${actionSchema}}

Rules:
- Max ${maxMemories} memories, types: ${VALID_MEMORY_TYPES.join(", ")}, agents: ${speakers.join(", ")}
- Confidence >= ${minConfidence}, content max 400 chars
${driftRules}${actionRules}
- Return empty arrays if nothing meaningful to extract`;
  let parsed = null;
  try {
    const response = await llmGenerate({
      messages: [{ role: "user", content: memoriesPrompt }],
      temperature: 0.3,
      maxTokens: 4e3,
      trackingContext: {
        agentId: "system",
        context: "distillation",
        sessionId
      }
    });
    parsed = extractJson(response);
    if (!parsed) {
      log11.warn("No JSON found in memories LLM response", {
        sessionId,
        responseLength: response.length,
        responsePreview: response.slice(0, 300),
        responseEnd: response.slice(-100)
      });
      return 0;
    }
  } catch (err) {
    log11.error("Memories LLM extraction failed", { error: err, sessionId });
    return 0;
  }
  let written = 0;
  const memories = (parsed.memories ?? []).slice(0, maxMemories);
  for (const mem of memories) {
    if (!VALID_MEMORY_TYPES.includes(mem.type)) continue;
    if (!speakers.includes(mem.agent_id)) continue;
    if (mem.confidence < minConfidence) continue;
    if (mem.content.length > 400) mem.content = mem.content.slice(0, 400);
    const id = await writeMemory({
      agent_id: mem.agent_id,
      type: mem.type,
      content: mem.content,
      confidence: mem.confidence,
      tags: mem.tags ?? [],
      source_trace_id: `conversation:${sessionId}:${mem.agent_id}:${written}`
    });
    if (id) {
      written++;
      await enforceMemoryCap(mem.agent_id);
    }
  }
  if (includeDrifts) {
    const drifts = parsed.pairwise_drift ?? [];
    if (drifts.length > 0) {
      const validDrifts = drifts.filter(
        (d) => speakers.includes(d.agent_a) && speakers.includes(d.agent_b) && d.agent_a !== d.agent_b && Math.abs(d.drift) <= 0.03
      );
      if (validDrifts.length > 0) {
        await applyPairwiseDrifts(validDrifts, sessionId);
      }
    }
  }
  if (includeActions) {
    const actionItems = (parsed.action_items ?? []).slice(
      0,
      maxActionItems
    );
    for (const item of actionItems) {
      if (!speakers.includes(item.agent_id)) continue;
      try {
        await createProposalAndMaybeAutoApprove({
          agent_id: item.agent_id,
          title: item.title,
          proposed_steps: [
            { kind: item.step_kind, payload: {} }
          ],
          source: "conversation",
          source_trace_id: `action:${sessionId}:${item.agent_id}`
        });
      } catch (err) {
        log11.warn("Failed to create proposal for action item", {
          error: err,
          agent_id: item.agent_id
        });
      }
    }
  }
  return written;
}
var log11, ACTION_ITEM_FORMATS, VALID_MEMORY_TYPES;
var init_memory_distiller = __esm({
  "src/lib/ops/memory-distiller.ts"() {
    "use strict";
    init_llm();
    init_memory();
    init_relationships();
    init_proposal_service();
    init_policy();
    init_logger();
    log11 = logger.child({ module: "distiller" });
    ACTION_ITEM_FORMATS = [
      "standup",
      "planning",
      "shipping",
      "strategy",
      "retro",
      "triage",
      "risk_review",
      "deep_dive"
    ];
    VALID_MEMORY_TYPES = [
      "insight",
      "pattern",
      "strategy",
      "preference",
      "lesson"
    ];
  }
});

// src/lib/roundtable/artifact-synthesizer.ts
function buildSynthesisPrompt(session, history, artifact) {
  const voice = getVoice(artifact.synthesizer);
  const transcript = history.map((t) => {
    const v = getVoice(t.speaker);
    const name = v?.displayName ?? t.speaker;
    return `${name}: ${t.dialogue}`;
  }).join("\n");
  const wordTarget = FORMAT_WORD_TARGETS[session.format] ?? DEFAULT_WORD_TARGET;
  let prompt = "";
  if (voice) {
    prompt += `--- SYNTHESIZER PERSONA ---
${voice.systemDirective}
--- END PERSONA ---

`;
    prompt += `You are synthesizing this conversation as ${voice.displayName} ${voice.symbol}. `;
    prompt += `Write in your voice \u2014 your perspective and judgment matter.

`;
  }
  prompt += `You just participated in (or observed) a ${session.format} conversation.

`;
  prompt += `Topic: ${session.topic}
`;
  prompt += `Format: ${session.format}
`;
  prompt += `Participants: ${session.participants.join(", ")}
`;
  prompt += `Turns: ${history.length}

`;
  prompt += `\u2550\u2550\u2550 TRANSCRIPT \u2550\u2550\u2550
${transcript}
\u2550\u2550\u2550 END TRANSCRIPT \u2550\u2550\u2550

`;
  prompt += `Your task: Synthesize this conversation into a structured ${artifact.type}.

`;
  const outputDir = artifact.outputDir;
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const topicSlug = session.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const filename = `${dateStr}__${session.format}__${artifact.type}__${topicSlug}__${artifact.synthesizer}__v01.md`;
  prompt += `Requirements:
`;
  prompt += `1. Include a clear title (as a markdown # heading) and summary
`;
  prompt += `2. Capture key points, decisions, action items, and disagreements
`;
  prompt += `3. Be concise but thorough \u2014 aim for ${wordTarget}
`;
  prompt += `4. Write the artifact to the workspace using file_write to path: ${outputDir}/${filename}
`;
  prompt += `5. Also include the full artifact content as your text response

`;
  prompt += `Do NOT just repeat the transcript. Synthesize, structure, and add value.
`;
  prompt += `Do NOT start with meta-commentary about your task ("The user wants me to...", "As an AI...", "I will proceed with..."). Start directly with the artifact content \u2014 the title heading.
`;
  prompt += `Do NOT produce analysis about analysis. If the conversation was about building something, the artifact should be the SPEC or PLAN, not a report about the discussion. Produce the actual deliverable.
`;
  return prompt;
}
async function synthesizeArtifact(session, history) {
  const format = getFormat(session.format);
  if (!format.artifact || format.artifact.type === "none") return null;
  const artifact = format.artifact;
  const prompt = buildSynthesisPrompt(session, history, artifact);
  try {
    const [row] = await sql`
            INSERT INTO ops_agent_sessions (
                agent_id, prompt, source, source_id,
                timeout_seconds, max_tool_rounds, status
            ) VALUES (
                ${artifact.synthesizer},
                ${prompt},
                'conversation',
                ${session.id},
                600,
                30,
                'pending'
            )
            RETURNING id
        `;
    log12.info("Artifact synthesis session created", {
      sessionId: row.id,
      format: session.format,
      synthesizer: artifact.synthesizer,
      artifactType: artifact.type,
      roundtableSession: session.id
    });
    return row.id;
  } catch (err) {
    log12.error("Failed to create synthesis session", {
      error: err,
      sessionId: session.id,
      format: session.format
    });
    return null;
  }
}
var log12, FORMAT_WORD_TARGETS, DEFAULT_WORD_TARGET;
var init_artifact_synthesizer = __esm({
  "src/lib/roundtable/artifact-synthesizer.ts"() {
    "use strict";
    init_db();
    init_formats();
    init_voices();
    init_logger();
    log12 = logger.child({ module: "artifact-synthesizer" });
    FORMAT_WORD_TARGETS = {
      standup: "200-400 words",
      checkin: "200-400 words",
      watercooler: "150-300 words",
      brainstorm: "400-800 words",
      strategy: "500-1000 words",
      planning: "500-1000 words",
      deep_dive: "600-1200 words",
      retro: "400-700 words",
      debate: "400-800 words",
      triage: "300-600 words",
      risk_review: "400-800 words",
      shipping: "300-600 words",
      cross_exam: "400-800 words",
      content_review: "300-600 words",
      agent_design: "400-800 words",
      writing_room: "400-800 words"
    };
    DEFAULT_WORD_TARGET = "300-800 words";
  }
});

// src/lib/ops/agent-proposal-voting.ts
async function submitVote(proposalId, agentId, vote, reasoning) {
  const [proposal] = await sql`
        SELECT * FROM ops_agent_proposals WHERE id = ${proposalId}
    `;
  if (!proposal) {
    throw new Error(`Proposal "${proposalId}" not found`);
  }
  if (proposal.status !== "voting") {
    throw new Error(
      `Proposal is not in voting status (current: ${proposal.status})`
    );
  }
  const votes = typeof proposal.votes === "object" && proposal.votes !== null ? proposal.votes : {};
  const isUpdate = !!votes[agentId];
  votes[agentId] = { vote, reasoning };
  await sql`
        UPDATE ops_agent_proposals
        SET votes = ${jsonb(votes)}
        WHERE id = ${proposalId}
    `;
  log13.info("Vote submitted", {
    proposalId,
    agentId,
    vote,
    isUpdate
  });
  await emitEventAndCheckReactions({
    agent_id: agentId,
    kind: "agent_proposal_vote",
    title: `${agentId} votes ${vote} on agent proposal "${proposal.agent_name}"`,
    summary: reasoning,
    tags: ["agent-designer", "vote", proposal.agent_name],
    metadata: {
      proposalId,
      agentName: proposal.agent_name,
      vote
    }
  });
}
async function tallyVotes(proposalId) {
  const [proposal] = await sql`
        SELECT votes FROM ops_agent_proposals WHERE id = ${proposalId}
    `;
  if (!proposal) throw new Error(`Proposal "${proposalId}" not found`);
  const votes = typeof proposal.votes === "object" && proposal.votes !== null ? proposal.votes : {};
  const approvals = Object.values(votes).filter(
    (v) => v.vote === "approve"
  ).length;
  const rejections = Object.values(votes).filter(
    (v) => v.vote === "reject"
  ).length;
  const [agentCount] = await sql`
        SELECT COUNT(*)::int as count FROM ops_agent_registry WHERE active = true
    `;
  return {
    approvals,
    rejections,
    total: Object.keys(votes).length,
    totalAgents: agentCount.count,
    voters: votes
  };
}
async function checkConsensus(proposalId) {
  const tally = await tallyVotes(proposalId);
  const requiredApprovals = Math.ceil(tally.totalAgents * 2 / 3);
  const quorum = requiredApprovals;
  const quorumMet = tally.total >= quorum;
  if (tally.rejections >= 3) {
    return {
      result: "rejected",
      approvals: tally.approvals,
      rejections: tally.rejections,
      totalAgents: tally.totalAgents,
      quorumMet
    };
  }
  if (tally.approvals >= requiredApprovals) {
    return {
      result: "approved",
      approvals: tally.approvals,
      rejections: tally.rejections,
      totalAgents: tally.totalAgents,
      quorumMet: true
    };
  }
  return {
    result: "pending",
    approvals: tally.approvals,
    rejections: tally.rejections,
    totalAgents: tally.totalAgents,
    quorumMet
  };
}
async function finalizeVoting(proposalId) {
  const consensus = await checkConsensus(proposalId);
  if (consensus.result === "pending") {
    return consensus;
  }
  const newStatus = consensus.result === "approved" ? "approved" : "rejected";
  await sql`
        UPDATE ops_agent_proposals
        SET status = ${newStatus}, decided_at = NOW()
        WHERE id = ${proposalId}
        AND status = 'voting'
    `;
  const [proposal] = await sql`
        SELECT * FROM ops_agent_proposals WHERE id = ${proposalId}
    `;
  if (proposal) {
    await emitEventAndCheckReactions({
      agent_id: proposal.proposed_by,
      kind: consensus.result === "approved" ? "agent_proposal_approved" : "agent_proposal_rejected",
      title: `Agent proposal "${proposal.agent_name}" ${consensus.result}`,
      summary: `${consensus.approvals} approvals, ${consensus.rejections} rejections out of ${consensus.totalAgents} agents`,
      tags: ["agent-designer", consensus.result, proposal.agent_name],
      metadata: {
        proposalId,
        agentName: proposal.agent_name,
        ...consensus
      }
    });
    log13.info("Voting finalized", {
      proposalId,
      result: consensus.result,
      approvals: consensus.approvals,
      rejections: consensus.rejections
    });
  }
  return consensus;
}
async function collectDebateVotes(proposalId, participants, debateHistory) {
  const [proposal] = await sql`
        SELECT * FROM ops_agent_proposals WHERE id = ${proposalId}
    `;
  if (!proposal) throw new Error(`Proposal "${proposalId}" not found`);
  if (proposal.status !== "voting") {
    throw new Error(
      `Proposal not in voting status (current: ${proposal.status})`
    );
  }
  for (const agentId of participants) {
    if (agentId === proposal.proposed_by) {
      await submitVote(
        proposalId,
        agentId,
        "approve",
        "I proposed this agent."
      );
      continue;
    }
    const lastTurn = [...debateHistory].reverse().find((t) => t.speaker === agentId);
    if (!lastTurn) {
      log13.warn("No debate turn found for agent, skipping vote", {
        agentId,
        proposalId
      });
      continue;
    }
    const text = lastTurn.dialogue;
    const vote = extractVoteFromText(text);
    if (vote) {
      const reasoning = text.slice(-200).trim();
      await submitVote(proposalId, agentId, vote, reasoning);
    } else {
      log13.warn(
        "Could not determine vote from debate turn, skipping agent",
        {
          agentId,
          proposalId,
          textPreview: text.slice(0, 200)
        }
      );
    }
  }
  return finalizeVoting(proposalId);
}
function extractVoteFromText(text) {
  const upper = text.toUpperCase();
  const hasApprove = upper.includes("APPROVE") && !upper.includes("NOT APPROVE") && !upper.includes("DON'T APPROVE");
  const hasReject = upper.includes("REJECT");
  if (hasApprove && hasReject) {
    const lastApprove = upper.lastIndexOf("APPROVE");
    const lastReject = upper.lastIndexOf("REJECT");
    return lastApprove > lastReject ? "approve" : "reject";
  }
  if (hasApprove) return "approve";
  if (hasReject) return "reject";
  return null;
}
var log13;
var init_agent_proposal_voting = __esm({
  "src/lib/ops/agent-proposal-voting.ts"() {
    "use strict";
    init_db();
    init_events2();
    init_logger();
    log13 = logger.child({ module: "agent-proposal-voting" });
  }
});

// src/lib/ops/veto.ts
var veto_exports = {};
__export(veto_exports, {
  castVeto: () => castVeto,
  getActiveVetoes: () => getActiveVetoes,
  hasActiveVeto: () => hasActiveVeto,
  overrideVeto: () => overrideVeto,
  withdrawVeto: () => withdrawVeto
});
async function loadVetoPolicy() {
  const raw = await getPolicy("veto_authority");
  return {
    enabled: raw.enabled ?? false,
    binding_agents: raw.binding_agents ?? ["subrosa"],
    soft_veto_agents: raw.soft_veto_agents ?? [],
    override_agents: raw.override_agents ?? ["primus"],
    default_expiry_hours: raw.default_expiry_hours ?? 72,
    protected_step_kinds: raw.protected_step_kinds ?? ["patch_code"]
  };
}
async function castVeto(agentId, targetType, targetId, reason) {
  const policy = await loadVetoPolicy();
  if (!policy.enabled) {
    throw new Error("Veto authority is not enabled");
  }
  const severity = policy.binding_agents.includes(agentId) ? "binding" : "soft";
  const expiresAt = new Date(
    Date.now() + policy.default_expiry_hours * 60 * 60 * 1e3
  );
  const [existing] = await sql`
        SELECT id FROM ops_vetoes
        WHERE agent_id = ${agentId}
          AND target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
        LIMIT 1
    `;
  if (existing) {
    throw new Error(
      `${agentId} already has an active veto on this ${targetType}`
    );
  }
  const [row] = await sql`
        INSERT INTO ops_vetoes (agent_id, target_type, target_id, reason, severity, expires_at)
        VALUES (${agentId}, ${targetType}, ${targetId}, ${reason}, ${severity}, ${expiresAt.toISOString()})
        RETURNING id
    `;
  const vetoId = row.id;
  log14.info("Veto cast", { vetoId, agentId, targetType, targetId, severity });
  if (severity === "binding") {
    await haltTarget(targetType, targetId, reason);
  }
  await emitEvent({
    agent_id: agentId,
    kind: "veto_cast",
    title: `${agentId} ${severity === "binding" ? "VETOED" : "soft-vetoed"} ${targetType} ${targetId.slice(0, 8)}`,
    summary: reason,
    tags: ["veto", severity, targetType],
    metadata: { vetoId, targetType, targetId, severity }
  });
  return { vetoId, severity };
}
async function hasActiveVeto(targetType, targetId) {
  await sql`
        UPDATE ops_vetoes
        SET status = 'expired', resolved_at = NOW()
        WHERE target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
    `;
  const [veto] = await sql`
        SELECT id, reason, severity FROM ops_vetoes
        WHERE target_type = ${targetType}
          AND target_id = ${targetId}
          AND status = 'active'
        ORDER BY
            CASE severity WHEN 'binding' THEN 0 ELSE 1 END,
            created_at DESC
        LIMIT 1
    `;
  if (!veto) {
    return { vetoed: false };
  }
  return {
    vetoed: true,
    vetoId: veto.id,
    reason: veto.reason,
    severity: veto.severity
  };
}
async function overrideVeto(vetoId, overrideBy, reason) {
  const policy = await loadVetoPolicy();
  if (overrideBy !== "human" && !policy.override_agents.includes(overrideBy)) {
    throw new Error(`${overrideBy} is not authorized to override vetoes`);
  }
  const [veto] = await sql`
        SELECT * FROM ops_vetoes WHERE id = ${vetoId}
    `;
  if (!veto) throw new Error(`Veto ${vetoId} not found`);
  if (veto.status !== "active") throw new Error(`Veto is not active (status: ${veto.status})`);
  await sql`
        UPDATE ops_vetoes
        SET status = 'overridden',
            override_by = ${overrideBy},
            override_reason = ${reason},
            resolved_at = NOW()
        WHERE id = ${vetoId}
    `;
  log14.info("Veto overridden", { vetoId, overrideBy, reason });
  await emitEvent({
    agent_id: overrideBy,
    kind: "veto_overridden",
    title: `${overrideBy} overrode ${veto.agent_id}'s veto on ${veto.target_type}`,
    summary: reason,
    tags: ["veto", "overridden", veto.target_type],
    metadata: { vetoId, overrideBy, originalAgent: veto.agent_id, targetType: veto.target_type, targetId: veto.target_id }
  });
}
async function withdrawVeto(vetoId, agentId) {
  const [veto] = await sql`
        SELECT * FROM ops_vetoes WHERE id = ${vetoId}
    `;
  if (!veto) throw new Error(`Veto ${vetoId} not found`);
  if (veto.status !== "active") throw new Error(`Veto is not active (status: ${veto.status})`);
  if (veto.agent_id !== agentId) throw new Error(`Only the casting agent can withdraw a veto`);
  await sql`
        UPDATE ops_vetoes
        SET status = 'withdrawn', resolved_at = NOW()
        WHERE id = ${vetoId}
    `;
  log14.info("Veto withdrawn", { vetoId, agentId });
  await emitEvent({
    agent_id: agentId,
    kind: "veto_withdrawn",
    title: `${agentId} withdrew veto on ${veto.target_type}`,
    summary: `Withdrew veto: ${veto.reason}`,
    tags: ["veto", "withdrawn", veto.target_type],
    metadata: { vetoId, targetType: veto.target_type, targetId: veto.target_id }
  });
}
async function getActiveVetoes(filters) {
  const limit = filters?.limit ?? 50;
  await sql`
        UPDATE ops_vetoes
        SET status = 'expired', resolved_at = NOW()
        WHERE status = 'active'
          AND expires_at IS NOT NULL
          AND expires_at < NOW()
    `;
  if (filters?.agentId && filters?.targetType) {
    return sql`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND agent_id = ${filters.agentId}
              AND target_type = ${filters.targetType}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  } else if (filters?.agentId) {
    return sql`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND agent_id = ${filters.agentId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  } else if (filters?.targetType) {
    return sql`
            SELECT * FROM ops_vetoes
            WHERE status = 'active'
              AND target_type = ${filters.targetType}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  }
  return sql`
        SELECT * FROM ops_vetoes
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}
async function haltTarget(targetType, targetId, reason) {
  const vetoReason = `Binding veto: ${reason}`;
  switch (targetType) {
    case "proposal": {
      await sql`
                UPDATE ops_mission_proposals
                SET status = 'pending', auto_approved = false, updated_at = NOW()
                WHERE id = ${targetId}
            `;
      await sql`
                UPDATE ops_missions
                SET status = 'cancelled', failure_reason = ${vetoReason}, updated_at = NOW()
                WHERE proposal_id = ${targetId} AND status IN ('approved', 'running', 'blocked')
            `;
      break;
    }
    case "mission": {
      await sql`
                UPDATE ops_missions
                SET status = 'cancelled', failure_reason = ${vetoReason}, updated_at = NOW()
                WHERE id = ${targetId} AND status IN ('approved', 'running', 'blocked')
            `;
      await sql`
                UPDATE ops_mission_steps
                SET status = 'failed', failure_reason = ${vetoReason}, completed_at = NOW(), updated_at = NOW()
                WHERE mission_id = ${targetId} AND status IN ('queued', 'running', 'blocked')
            `;
      break;
    }
    case "governance": {
      await sql`
                UPDATE ops_governance_proposals
                SET status = 'rejected', resolved_at = NOW()
                WHERE id = ${targetId} AND status IN ('proposed', 'voting')
            `;
      break;
    }
    case "step": {
      await sql`
                UPDATE ops_mission_steps
                SET status = 'failed', failure_reason = ${vetoReason}, completed_at = NOW(), updated_at = NOW()
                WHERE id = ${targetId} AND status IN ('queued', 'running', 'blocked')
            `;
      break;
    }
  }
  log14.info("Target halted by binding veto", { targetType, targetId });
}
var log14;
var init_veto = __esm({
  "src/lib/ops/veto.ts"() {
    "use strict";
    init_db();
    init_policy();
    init_events2();
    init_logger();
    log14 = logger.child({ module: "veto" });
  }
});

// src/lib/ops/governance.ts
function validatePolicyValue(policyKey, proposedValue) {
  const validate = POLICY_VALIDATORS[policyKey];
  const error = validate?.(proposedValue);
  if (error) {
    throw new Error(`Invalid value for policy "${policyKey}": ${error}`);
  }
}
async function proposeGovernanceChange(agentId, policyKey, proposedValue, rationale) {
  if (PROTECTED_POLICIES.has(policyKey)) {
    throw new Error(
      `Policy "${policyKey}" is protected and cannot be changed`
    );
  }
  validatePolicyValue(policyKey, proposedValue);
  const [existing] = await sql`
        SELECT id FROM ops_governance_proposals
        WHERE policy_key = ${policyKey}
          AND status IN ('proposed', 'voting')
        LIMIT 1
    `;
  if (existing) {
    throw new Error(
      `An active proposal already exists for policy "${policyKey}"`
    );
  }
  const currentValue = await getPolicy(policyKey);
  const [row] = await sql`
        INSERT INTO ops_governance_proposals
            (proposer, policy_key, current_value, proposed_value, rationale)
        VALUES (
            ${agentId},
            ${policyKey},
            ${jsonb(currentValue)},
            ${jsonb(proposedValue)},
            ${rationale}
        )
        RETURNING id
    `;
  log15.info("Governance proposal created", {
    id: row.id,
    proposer: agentId,
    policyKey
  });
  await emitEventAndCheckReactions({
    agent_id: agentId,
    kind: "governance_proposal_created",
    title: `${agentId} proposes change to ${policyKey}`,
    summary: rationale,
    tags: ["governance", "proposal", policyKey],
    metadata: {
      proposalId: row.id,
      policyKey,
      proposedValue,
      currentValue
    }
  });
  return row.id;
}
async function castGovernanceVote(proposalId, agentId, vote, reason) {
  const [proposal] = await sql`
        SELECT * FROM ops_governance_proposals
        WHERE id = ${proposalId}
    `;
  if (!proposal) {
    throw new Error(`Proposal "${proposalId}" not found`);
  }
  if (proposal.status !== "voting") {
    throw new Error(
      `Proposal is not in voting status (current: ${proposal.status})`
    );
  }
  const votes = typeof proposal.votes === "object" && proposal.votes !== null ? proposal.votes : {};
  if (votes[agentId]) {
    log15.warn("Agent already voted on this proposal", {
      proposalId,
      agentId
    });
    return;
  }
  votes[agentId] = { vote, reason };
  await sql`
        UPDATE ops_governance_proposals
        SET votes = ${jsonb(votes)}
        WHERE id = ${proposalId}
    `;
  log15.info("Governance vote cast", { proposalId, agentId, vote });
  const approvals = Object.values(votes).filter(
    (v) => v.vote === "approve"
  ).length;
  const rejections = Object.values(votes).filter(
    (v) => v.vote === "reject"
  ).length;
  if (approvals >= proposal.required_votes) {
    const { hasActiveVeto: hasActiveVeto2 } = await Promise.resolve().then(() => (init_veto(), veto_exports));
    const vetoCheck = await hasActiveVeto2("governance", proposalId);
    if (vetoCheck.vetoed && vetoCheck.severity === "binding") {
      log15.info("Governance proposal blocked by binding veto", {
        proposalId,
        vetoId: vetoCheck.vetoId,
        reason: vetoCheck.reason
      });
      await sql`
                UPDATE ops_governance_proposals
                SET status = 'rejected', resolved_at = NOW()
                WHERE id = ${proposalId}
            `;
      await emitEventAndCheckReactions({
        agent_id: proposal.proposer,
        kind: "governance_proposal_vetoed",
        title: `Policy change to "${proposal.policy_key}" blocked by binding veto`,
        summary: vetoCheck.reason ?? "Binding veto active",
        tags: ["governance", "vetoed", proposal.policy_key],
        metadata: { proposalId, vetoId: vetoCheck.vetoId }
      });
      return;
    }
    await sql`
            UPDATE ops_governance_proposals
            SET status = 'accepted', resolved_at = NOW()
            WHERE id = ${proposalId}
        `;
    await setPolicy(
      proposal.policy_key,
      proposal.proposed_value,
      `Applied via governance proposal ${proposalId} \u2014 proposed by ${proposal.proposer}`
    );
    clearPolicyCache();
    await emitEventAndCheckReactions({
      agent_id: proposal.proposer,
      kind: "governance_proposal_accepted",
      title: `Policy "${proposal.policy_key}" changed via governance`,
      summary: `${approvals} approvals out of ${Object.keys(votes).length} votes`,
      tags: ["governance", "accepted", proposal.policy_key],
      metadata: {
        proposalId,
        policyKey: proposal.policy_key,
        proposedValue: proposal.proposed_value,
        approvals,
        rejections,
        voters: Object.keys(votes)
      }
    });
    log15.info("Governance proposal accepted", {
      proposalId,
      approvals,
      rejections
    });
  } else if (rejections >= 3) {
    await sql`
            UPDATE ops_governance_proposals
            SET status = 'rejected', resolved_at = NOW()
            WHERE id = ${proposalId}
        `;
    await emitEventAndCheckReactions({
      agent_id: proposal.proposer,
      kind: "governance_proposal_rejected",
      title: `Policy change to "${proposal.policy_key}" rejected`,
      summary: `${rejections} rejections out of ${Object.keys(votes).length} votes`,
      tags: ["governance", "rejected", proposal.policy_key],
      metadata: {
        proposalId,
        policyKey: proposal.policy_key,
        approvals,
        rejections,
        voters: Object.keys(votes)
      }
    });
    log15.info("Governance proposal rejected", {
      proposalId,
      approvals,
      rejections
    });
  }
}
async function collectGovernanceDebateVotes(proposalId, participants, debateHistory) {
  const [proposal] = await sql`
        SELECT * FROM ops_governance_proposals WHERE id = ${proposalId}
    `;
  if (!proposal)
    throw new Error(`Governance proposal "${proposalId}" not found`);
  if (proposal.status !== "voting") {
    throw new Error(
      `Proposal not in voting status (current: ${proposal.status})`
    );
  }
  for (const agentId of participants) {
    if (agentId === proposal.proposer) {
      try {
        await castGovernanceVote(
          proposalId,
          agentId,
          "approve",
          "I proposed this change."
        );
      } catch (err) {
        const message = err.message;
        if (message.includes("not in voting status")) break;
        throw err;
      }
      continue;
    }
    const lastTurn = [...debateHistory].reverse().find((t) => t.speaker === agentId);
    if (!lastTurn) {
      log15.warn("No debate turn found for agent, skipping vote", {
        agentId,
        proposalId
      });
      continue;
    }
    const text = lastTurn.dialogue;
    const vote = extractVoteFromText2(text) ?? await inferVoteFromDebateTurn(agentId, proposal, text, debateHistory);
    if (vote) {
      const reason = text.slice(-200).trim();
      try {
        await castGovernanceVote(proposalId, agentId, vote, reason);
      } catch (err) {
        const message = err.message;
        if (message.includes("not in voting status")) break;
        throw err;
      }
    } else {
      log15.warn(
        "Could not determine vote from debate turn, skipping agent",
        {
          agentId,
          proposalId,
          textPreview: text.slice(0, 200)
        }
      );
    }
  }
  const [updated] = await sql`
        SELECT * FROM ops_governance_proposals WHERE id = ${proposalId}
    `;
  const votes = typeof updated.votes === "object" && updated.votes !== null ? updated.votes : {};
  const approvals = Object.values(votes).filter(
    (v) => v.vote === "approve"
  ).length;
  const rejections = Object.values(votes).filter(
    (v) => v.vote === "reject"
  ).length;
  const [final] = await sql`
        SELECT status FROM ops_governance_proposals WHERE id = ${proposalId}
    `;
  const result = final.status === "accepted" ? "accepted" : final.status === "rejected" ? "rejected" : "pending";
  return { result, approvals, rejections };
}
async function backfillGovernanceVotes(limit = 10) {
  const rows = await sql`
        SELECT gp.id, gp.debate_session_id, rs.participants
        FROM ops_governance_proposals gp
        JOIN ops_roundtable_sessions rs ON rs.id = gp.debate_session_id
        WHERE gp.status = 'voting'
          AND gp.debate_session_id IS NOT NULL
          AND rs.status = 'completed'
        ORDER BY gp.created_at ASC
        LIMIT ${Math.max(1, Math.min(limit, 50))}
    `;
  let processed = 0;
  let resolved = 0;
  let requeued = 0;
  let votesAdded = 0;
  let failed = 0;
  const staleCutoff = new Date(Date.now() - 20 * 6e4).toISOString();
  const staleRunning = await sql`
        SELECT gp.id
        FROM ops_governance_proposals gp
        JOIN ops_roundtable_sessions rs ON rs.id = gp.debate_session_id
        WHERE gp.status = 'voting'
          AND gp.debate_session_id IS NOT NULL
          AND rs.status = 'running'
          AND rs.started_at < ${staleCutoff}
    `;
  for (const row of staleRunning) {
    await sql`
            UPDATE ops_governance_proposals
            SET status = 'proposed',
                debate_session_id = NULL,
                votes = '{}'::jsonb
            WHERE id = ${row.id}
        `;
    await emitEventAndCheckReactions({
      agent_id: "system",
      kind: "governance_debate_requeued",
      title: "Governance debate requeued after stale running session",
      summary: `Proposal ${row.id} returned to proposed for a fresh debate`,
      tags: ["governance", "debate", "requeued"],
      metadata: { proposalId: row.id }
    });
    requeued++;
  }
  for (const row of rows) {
    try {
      const [before] = await sql`
                SELECT votes, status FROM ops_governance_proposals WHERE id = ${row.id}
            `;
      const beforeVotes = before?.votes && typeof before.votes === "object" ? Object.keys(before.votes).length : 0;
      const debateHistory = await sql`
                SELECT speaker, dialogue, turn_number
                FROM ops_roundtable_turns
                WHERE session_id = ${row.debate_session_id}
                ORDER BY turn_number ASC
            `;
      if (debateHistory.length === 0) {
        continue;
      }
      await collectGovernanceDebateVotes(
        row.id,
        row.participants,
        debateHistory.map((turn) => ({
          speaker: turn.speaker,
          dialogue: turn.dialogue,
          turn: turn.turn_number
        }))
      );
      const [after] = await sql`
                SELECT votes, status FROM ops_governance_proposals WHERE id = ${row.id}
            `;
      const afterVotes = after?.votes && typeof after.votes === "object" ? Object.keys(after.votes).length : 0;
      votesAdded += Math.max(0, afterVotes - beforeVotes);
      if (before?.status === "voting" && after?.status !== "voting") {
        resolved++;
      } else if (after?.status === "voting") {
        await sql`
                    UPDATE ops_governance_proposals
                    SET status = 'proposed',
                        debate_session_id = NULL,
                        votes = '{}'::jsonb
                    WHERE id = ${row.id}
                      AND status = 'voting'
                `;
        await emitEventAndCheckReactions({
          agent_id: "system",
          kind: "governance_debate_requeued",
          title: "Governance debate requeued after incomplete vote collection",
          summary: `Proposal ${row.id} still lacked a decision after debate vote extraction`,
          tags: ["governance", "debate", "requeued"],
          metadata: {
            proposalId: row.id,
            previousVotes: afterVotes
          }
        });
        requeued++;
      }
      processed++;
    } catch (err) {
      failed++;
      log15.error("Governance vote backfill failed", {
        proposalId: row.id,
        sessionId: row.debate_session_id,
        error: err.message
      });
    }
  }
  return { processed, resolved, requeued, votesAdded, failed };
}
function extractVoteFromText2(text) {
  const upper = text.toUpperCase();
  const hasApprove = upper.includes("APPROVE") && !upper.includes("NOT APPROVE") && !upper.includes("DON'T APPROVE");
  const hasReject = upper.includes("REJECT");
  const hasVeto = upper.includes("VETO");
  if (hasVeto && !hasApprove) return "reject";
  const rejectSignals = [
    "I OPPOSE",
    "DO NOT SUPPORT",
    "NO-GO",
    "BLOCK THIS",
    "VETO STANDS"
  ];
  const approveSignals = [
    "I SUPPORT",
    "I BACK",
    "I ENDORSE",
    "GO AHEAD",
    "SHIP IT"
  ];
  if (hasApprove && hasReject) {
    const lastApprove = upper.lastIndexOf("APPROVE");
    const lastReject = upper.lastIndexOf("REJECT");
    return lastApprove > lastReject ? "approve" : "reject";
  }
  if (hasApprove) return "approve";
  if (hasReject) return "reject";
  if (rejectSignals.some((signal) => upper.includes(signal))) return "reject";
  if (approveSignals.some((signal) => upper.includes(signal))) return "approve";
  return null;
}
async function inferVoteFromDebateTurn(agentId, proposal, finalTurn, debateHistory) {
  const debateSnippet = debateHistory.slice(-8).map((t) => `${t.speaker}: ${t.dialogue}`).join("\n");
  try {
    const result = await llmGenerate({
      messages: [
        {
          role: "system",
          content: 'Classify the voter stance as approve, reject, or abstain. Return strict JSON only: {"vote":"approve"|"reject"|"abstain"}.'
        },
        {
          role: "user",
          content: `Governance proposal: ${proposal.policy_key}
Rationale: ${proposal.rationale}

Agent: ${agentId}
Agent final turn:
${finalTurn}

Recent debate context:
${debateSnippet}

Classify this agent's vote now.`
        }
      ],
      temperature: 0,
      maxTokens: 80,
      trackingContext: {
        agentId,
        context: "governance_vote_inference"
      }
    });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.vote === "approve" || parsed.vote === "reject") {
      return parsed.vote;
    }
    return null;
  } catch (err) {
    log15.warn("LLM governance vote inference failed", {
      error: err.message,
      proposalId: proposal.id,
      agentId
    });
    return null;
  }
}
var log15, PROTECTED_POLICIES, AUTO_APPROVE_ALLOWED_STEP_KINDS, POLICY_VALIDATORS;
var init_governance = __esm({
  "src/lib/ops/governance.ts"() {
    "use strict";
    init_db();
    init_policy();
    init_events2();
    init_logger();
    init_client();
    log15 = logger.child({ module: "governance" });
    PROTECTED_POLICIES = /* @__PURE__ */ new Set(["system_enabled", "veto_authority"]);
    AUTO_APPROVE_ALLOWED_STEP_KINDS = [
      "research_topic",
      "scan_signals",
      "draft_essay",
      "draft_thread",
      "audit_system",
      "patch_code",
      "distill_insight",
      "document_lesson",
      "critique_content",
      "consolidate_memory",
      "memory_archaeology",
      "draft_product_spec",
      "log_event",
      "convene_roundtable",
      "identify_assumption",
      "review_policy",
      "map_dependency",
      "classify_pattern",
      "trace_incentive",
      "tag_memory",
      "refine_narrative",
      "propose_workflow",
      "content_revision",
      "write_issue",
      "prepare_statement",
      "escalate_risk",
      "analyze_discourse",
      "self_evolution",
      "github_issue",
      "github_pr",
      "explore_repo",
      "publish_blog",
      "notify_human",
      "create_pull_request"
    ];
    POLICY_VALIDATORS = {
      auto_approve(value) {
        if (typeof value.enabled !== "boolean") {
          return "auto_approve.enabled must be a boolean";
        }
        if (!Array.isArray(value.allowed_step_kinds)) {
          return "auto_approve.allowed_step_kinds must be an array";
        }
        const invalid = value.allowed_step_kinds.filter(
          (stepKind) => typeof stepKind !== "string" || !AUTO_APPROVE_ALLOWED_STEP_KINDS.includes(
            stepKind
          )
        );
        if (invalid.length > 0) {
          return `auto_approve.allowed_step_kinds contains invalid step kind(s): ${invalid.join(", ")}`;
        }
        return null;
      }
    };
  }
});

// src/lib/roundtable/debrief.ts
async function generateDebrief(session, history) {
  if (history.length < 3) return null;
  const transcript = history.map((t) => `[${t.speaker}]: ${t.dialogue}`).join("\n\n");
  const prompt = `You just observed a ${session.format} conversation.

Topic: ${session.topic}
Participants: ${session.participants.join(", ")}
Turns: ${history.length}

\u2550\u2550\u2550 TRANSCRIPT \u2550\u2550\u2550
${transcript}
\u2550\u2550\u2550 END \u2550\u2550\u2550

Generate a structured meeting debrief. Respond with ONLY valid JSON (no markdown fencing):
{
    "summary": "2-3 sentence summary of what was discussed and the overall direction",
    "decisions": ["Decision 1", "Decision 2"],
    "actionItems": [
        {
            "task": "Concrete task description in imperative form",
            "owner": "agent_id (one of: chora, subrosa, thaum, praxis, mux, primus)",
            "priority": "high|medium|low",
            "stepKind": "one of: research_topic, scan_signals, draft_essay, draft_thread, draft_product_spec, patch_code, audit_system, convene_roundtable, document_lesson, distill_insight"
        }
    ],
    "openQuestions": ["Unresolved question 1", "Question 2"]
}

Rules:
- Only include decisions that were explicitly agreed upon
- Action items must be concrete and assignable \u2014 not vague ("improve things")
- If no decisions were made, return an empty array
- If no action items emerged, return an empty array
- Match owners to who volunteered or was assigned, or pick the best-suited agent
- Keep summary concise \u2014 this is a debrief, not a report`;
  try {
    const result = await llmGenerate({
      messages: [
        { role: "system", content: "You are a meeting secretary. Output only valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      maxTokens: 3e3,
      trackingContext: { context: "debrief" }
    });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log16.warn("No JSON in debrief result", { sessionId: session.id });
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      log16.warn("Invalid JSON in debrief", { sessionId: session.id });
      return null;
    }
    parsed.decisions = parsed.decisions ?? [];
    parsed.actionItems = parsed.actionItems ?? [];
    parsed.openQuestions = parsed.openQuestions ?? [];
    parsed.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await sql`
            UPDATE ops_roundtable_sessions
            SET metadata = COALESCE(metadata, '{}'::jsonb) || ${jsonb({ debrief: parsed })}
            WHERE id = ${session.id}
        `;
    let proposalCount = 0;
    for (const item of parsed.actionItems.slice(0, 5)) {
      try {
        const steps = [{
          kind: item.stepKind || "document_lesson",
          assigned_agent: item.owner,
          payload: { description: item.task, priority: item.priority }
        }];
        const result2 = await createProposalAndMaybeAutoApprove({
          agent_id: item.owner,
          title: item.task,
          description: `From debrief: ${session.format} on "${session.topic}"`,
          proposed_steps: steps,
          source: "conversation",
          source_trace_id: session.id
        });
        if (result2.success) proposalCount++;
      } catch (err) {
        log16.error("Failed to create proposal from debrief action item", {
          error: err,
          task: item.task,
          sessionId: session.id
        });
      }
    }
    log16.info("Debrief generated", {
      sessionId: session.id,
      format: session.format,
      decisions: parsed.decisions.length,
      actionItems: parsed.actionItems.length,
      openQuestions: parsed.openQuestions.length,
      proposalsCreated: proposalCount
    });
    return parsed;
  } catch (err) {
    log16.error("Debrief generation failed", { error: err, sessionId: session.id });
    return null;
  }
}
function formatDebriefMarkdown(debrief, topic) {
  let md = `\u{1F4CB} **Meeting Debrief**
`;
  md += `> ${topic}

`;
  md += `**Summary:** ${debrief.summary}

`;
  if (debrief.decisions.length > 0) {
    md += `**Decisions:**
`;
    debrief.decisions.forEach((d) => {
      md += `\u2705 ${d}
`;
    });
    md += "\n";
  }
  if (debrief.actionItems.length > 0) {
    md += `**Action Items:**
`;
    debrief.actionItems.forEach((a) => {
      const priority = a.priority === "high" ? "\u{1F534}" : a.priority === "medium" ? "\u{1F7E1}" : "\u{1F7E2}";
      md += `${priority} **${a.owner}**: ${a.task}
`;
    });
    md += "\n";
  }
  if (debrief.openQuestions.length > 0) {
    md += `**Open Questions:**
`;
    debrief.openQuestions.forEach((q) => {
      md += `\u2753 ${q}
`;
    });
  }
  return md;
}
var log16;
var init_debrief = __esm({
  "src/lib/roundtable/debrief.ts"() {
    "use strict";
    init_db();
    init_client();
    init_proposal_service();
    init_logger();
    log16 = logger.child({ module: "debrief" });
  }
});

// src/lib/discord/format.ts
function formatForDiscord(text) {
  return text.replace(
    // Match a block of consecutive lines that look like markdown table rows
    /(?:^[ \t]*\|.+\|[ \t]*$\n?){2,}/gm,
    (tableBlock) => convertMarkdownTable(tableBlock)
  );
}
function convertMarkdownTable(block) {
  const lines = block.trim().split("\n").map((l) => l.trim());
  const rows = [];
  let separatorIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^:?-+:?$/.test(c))) {
      separatorIdx = i;
      continue;
    }
    rows.push(cells);
  }
  if (rows.length === 0) return block;
  const colCount = Math.max(...rows.map((r) => r.length));
  for (const row of rows) {
    while (row.length < colCount) row.push("");
  }
  const colWidths = Array.from(
    { length: colCount },
    (_, col) => Math.max(3, ...rows.map((r) => (r[col] ?? "").length))
  );
  const topBorder = "\u250C" + colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u252C") + "\u2510";
  const midBorder = "\u251C" + colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u253C") + "\u2524";
  const botBorder = "\u2514" + colWidths.map((w) => "\u2500".repeat(w + 2)).join("\u2534") + "\u2518";
  const formatRow = (row) => "\u2502" + row.map((cell, i) => ` ${(cell ?? "").padEnd(colWidths[i])} `).join("\u2502") + "\u2502";
  const result = [topBorder];
  for (let i = 0; i < rows.length; i++) {
    result.push(formatRow(rows[i]));
    if (i === 0 && separatorIdx !== -1) {
      result.push(midBorder);
    }
  }
  result.push(botBorder);
  return "```\n" + result.join("\n") + "\n```";
}
var init_format = __esm({
  "src/lib/discord/format.ts"() {
    "use strict";
  }
});

// src/lib/discord/roundtable.ts
var roundtable_exports = {};
__export(roundtable_exports, {
  postArtifactToDiscord: () => postArtifactToDiscord,
  postConversationStart: () => postConversationStart,
  postConversationSummary: () => postConversationSummary,
  postConversationTurn: () => postConversationTurn,
  postDebriefToDiscord: () => postDebriefToDiscord
});
async function postConversationStart(session) {
  const channelName = getChannelForFormat(session.format);
  const webhookUrl = await getWebhookUrl(channelName);
  if (!webhookUrl) return null;
  const participantList = session.participants.map((p) => {
    const voice = getVoice(p);
    return voice ? `${voice.symbol} ${voice.displayName}` : p;
  }).join(", ");
  const content = `\u{1F4E1} **${session.format}** \u2014 *starting*
> ${session.topic}
-# ${participantList}`;
  await postToWebhook({
    webhookUrl,
    username: "\u{1F4E1} Subcult Roundtable",
    content
  });
  log17.info("Roundtable start posted to Discord", {
    sessionId: session.id,
    channel: channelName
  });
  return webhookUrl;
}
async function postConversationTurn(session, entry, webhookUrl, audio) {
  const voice = getVoice(entry.speaker);
  const username = voice ? `${voice.symbol} ${voice.displayName}` : entry.speaker;
  const avatarUrl = getAgentAvatarUrl(entry.speaker);
  const audioFile = audio ? [{ filename: audio.filename, data: audio.audio, contentType: "audio/mpeg" }] : void 0;
  if (entry.dialogue.length <= 2e3) {
    await postToWebhookWithFiles({
      webhookUrl,
      username,
      avatarUrl,
      content: entry.dialogue,
      files: audioFile
    });
  } else {
    const chunks = splitDialogue(entry.dialogue, 2e3);
    for (let i = 0; i < chunks.length; i++) {
      await postToWebhookWithFiles({
        webhookUrl,
        username,
        avatarUrl,
        content: chunks[i],
        files: i === 0 ? audioFile : void 0
      });
    }
  }
}
async function postConversationSummary(session, history, status, webhookUrl, abortReason) {
  const speakers = [...new Set(history.map((h) => h.speaker))];
  const speakerNames = speakers.map((s) => {
    const voice = getVoice(s);
    return voice ? `${voice.symbol} ${voice.displayName}` : s;
  }).join(", ");
  const statusIcon = status === "completed" ? "\u2705" : "\u274C";
  let content = `${statusIcon} **${session.format}** \u2014 *${status}* \xB7 ${history.length} turns
-# ${speakerNames}`;
  if (abortReason) {
    content += `
> \u26A0\uFE0F *${abortReason}*`;
  }
  await postToWebhook({
    webhookUrl,
    username: "\u{1F4E1} Subcult Roundtable",
    content
  });
}
async function postArtifactToDiscord(roundtableSessionId, format, artifactText) {
  const { sql: sql3 } = await Promise.resolve().then(() => (init_db(), db_exports));
  const [session] = await sql3`
        SELECT format FROM ops_roundtable_sessions
        WHERE id = ${roundtableSessionId}
    `;
  const channelName = getChannelForFormat(
    session?.format ?? format
  );
  const webhookUrl = await getWebhookUrl(channelName);
  if (!webhookUrl) return;
  const username = "\u{1F4CB} Subcult Artifact";
  const formatted = formatForDiscord(artifactText);
  const header = "\u{1F4CB} **Artifact**\n";
  const maxChunk = 2e3 - header.length - 10;
  const chunks = splitAtBoundaries(formatted, maxChunk);
  for (let i = 0; i < chunks.length; i++) {
    const prefix = i === 0 ? header : "";
    const content = `${prefix}${chunks[i]}`;
    await postToWebhook({ webhookUrl, username, content });
  }
  log17.info("Artifact posted to Discord", {
    roundtableSessionId,
    chunks: chunks.length
  });
}
async function postDebriefToDiscord(roundtableSessionId, format, debriefMarkdown) {
  const channelName = getChannelForFormat(format);
  const webhookUrl = await getWebhookUrl(channelName);
  if (!webhookUrl) return;
  const username = "\u{1F4CB} Subcult Debrief";
  const formatted = formatForDiscord(debriefMarkdown);
  const maxChunk = 1990;
  const chunks = splitAtBoundaries(formatted, maxChunk);
  for (const chunk of chunks) {
    await postToWebhook({ webhookUrl, username, content: chunk });
  }
  log17.info("Debrief posted to Discord", { roundtableSessionId, chunks: chunks.length });
}
function splitDialogue(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let idx = remaining.lastIndexOf("\n\n", maxLen);
    if (idx <= 0) idx = remaining.lastIndexOf("\n", maxLen);
    if (idx <= 0) idx = remaining.lastIndexOf(". ", maxLen);
    if (idx <= 0) idx = remaining.lastIndexOf(" ", maxLen);
    if (idx <= 0) idx = maxLen;
    const end = remaining[idx] === "." ? idx + 1 : idx;
    chunks.push(remaining.slice(0, end).trimEnd());
    remaining = remaining.slice(end).trimStart();
  }
  return chunks;
}
function splitAtBoundaries(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    const window = remaining.slice(0, maxLen);
    const codeBlockStart = window.lastIndexOf("```\n");
    const codeBlockEnd = window.lastIndexOf("\n```");
    if (codeBlockStart > codeBlockEnd && codeBlockStart > 0) {
      const splitIdx2 = remaining.lastIndexOf("\n\n", codeBlockStart);
      if (splitIdx2 > 0) {
        chunks.push(remaining.slice(0, splitIdx2));
        remaining = remaining.slice(splitIdx2).replace(/^\n+/, "");
        continue;
      }
    }
    let splitIdx = remaining.lastIndexOf("\n\n", maxLen);
    if (splitIdx <= 0) splitIdx = remaining.lastIndexOf("\n", maxLen);
    if (splitIdx <= 0) splitIdx = remaining.lastIndexOf(" ", maxLen);
    if (splitIdx <= 0) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx));
    remaining = remaining.slice(splitIdx).replace(/^\n+/, "");
  }
  return chunks;
}
var log17;
var init_roundtable = __esm({
  "src/lib/discord/roundtable.ts"() {
    "use strict";
    init_client2();
    init_channels();
    init_voices();
    init_avatars();
    init_format();
    init_logger();
    log17 = logger.child({ module: "discord-roundtable" });
  }
});

// src/lib/ops/voice-evolution.ts
async function deriveVoiceModifiers(agentId) {
  const cached = voiceModifierCache.get(agentId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.modifiers;
  }
  const stats = await aggregateMemoryStats(agentId);
  if (stats.total < 5) {
    voiceModifierCache.set(agentId, {
      modifiers: [],
      expiresAt: Date.now() + CACHE_TTL_MS2
    });
    return [];
  }
  const modifiers = [];
  if (stats.insight_count / stats.total > 0.4) {
    modifiers.push("analytical-focus");
  }
  if (stats.pattern_count >= 5) {
    modifiers.push("pattern-aware");
  }
  if (stats.strategy_count / stats.total > 0.3) {
    modifiers.push("strategic");
  }
  if (stats.lesson_count >= 3) {
    modifiers.push("reflective");
  }
  if (stats.avg_confidence > 0.8) {
    modifiers.push("assertive");
  }
  if (stats.avg_confidence < 0.6 && stats.total >= 10) {
    modifiers.push("cautious");
  }
  if (stats.tags.size > 10) {
    modifiers.push("broad-perspective");
  }
  if (stats.preference_count / stats.total > 0.25) {
    modifiers.push("opinionated");
  }
  const result = modifiers.slice(0, 3);
  voiceModifierCache.set(agentId, {
    modifiers: result,
    expiresAt: Date.now() + CACHE_TTL_MS2
  });
  return result;
}
async function aggregateMemoryStats(agentId) {
  const rows = await sql`
        SELECT type, confidence, tags FROM ops_agent_memory
        WHERE agent_id = ${agentId}
        AND superseded_by IS NULL
        AND confidence >= 0.55
    `;
  const stats = {
    total: rows.length,
    insight_count: 0,
    pattern_count: 0,
    strategy_count: 0,
    preference_count: 0,
    lesson_count: 0,
    top_tags: [],
    tags: /* @__PURE__ */ new Map(),
    avg_confidence: 0
  };
  if (rows.length === 0) return stats;
  let confidenceSum = 0;
  for (const row of rows) {
    confidenceSum += Number(row.confidence);
    switch (row.type) {
      case "insight":
        stats.insight_count++;
        break;
      case "pattern":
        stats.pattern_count++;
        break;
      case "strategy":
        stats.strategy_count++;
        break;
      case "preference":
        stats.preference_count++;
        break;
      case "lesson":
        stats.lesson_count++;
        break;
    }
    for (const tag of row.tags ?? []) {
      stats.tags.set(tag, (stats.tags.get(tag) ?? 0) + 1);
    }
  }
  stats.avg_confidence = confidenceSum / rows.length;
  stats.top_tags = [...stats.tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tag]) => tag);
  return stats;
}
var MODIFIER_INSTRUCTIONS, voiceModifierCache, CACHE_TTL_MS2;
var init_voice_evolution = __esm({
  "src/lib/ops/voice-evolution.ts"() {
    "use strict";
    init_db();
    MODIFIER_INSTRUCTIONS = {
      "analytical-focus": 'Lean harder into structural diagnosis. Lead with "why" not "what".',
      "pattern-aware": "Name recurring patterns explicitly. Reference previous instances when relevant.",
      strategic: "Frame decisions in terms of tradeoffs and long-term positioning.",
      reflective: "Reference past lessons and what was learned from them.",
      assertive: "State positions directly. Fewer qualifiers.",
      cautious: "Flag uncertainty explicitly. Name what you don't know.",
      "broad-perspective": "Draw connections across domains. Reference adjacent contexts.",
      opinionated: "Don't hedge. State your preference and defend it."
    };
    voiceModifierCache = /* @__PURE__ */ new Map();
    CACHE_TTL_MS2 = 10 * 6e4;
  }
});

// src/lib/tools/executor.ts
function dockerBackedToolsEnabled() {
  return process.env.DOCKER_BACKED_TOOLS_ENABLED !== "false" && process.env.TOOLBOX_TOOLS_ENABLED !== "false";
}
function disableDockerBackedTools(reason) {
  process.env.DOCKER_BACKED_TOOLS_ENABLED = "false";
  log18.warn("Docker-backed tools disabled", { reason });
}
async function checkToolboxAvailable() {
  if (!dockerBackedToolsEnabled()) {
    return { ok: false, reason: "Docker-backed tools disabled by environment" };
  }
  return new Promise((resolve) => {
    (0, import_node_child_process.execFile)("docker", ["exec", TOOLBOX_CONTAINER, "true"], {
      timeout: 5e3,
      encoding: "utf8"
    }, (error, _stdout, stderr) => {
      if (!error) {
        resolve({ ok: true });
        return;
      }
      resolve({
        ok: false,
        reason: (stderr || error.message || "docker exec failed").trim()
      });
    });
  });
}
function getExitCode(error) {
  const err = error;
  if (typeof err.status === "number") return err.status;
  if (typeof err.code === "number") return err.code;
  return 1;
}
async function execInToolbox(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (!dockerBackedToolsEnabled()) {
    return {
      stdout: "",
      stderr: "Docker-backed tools are disabled for this executor runtime.",
      exitCode: 126,
      timedOut: false
    };
  }
  return new Promise((resolve) => {
    const args = [
      "exec",
      TOOLBOX_CONTAINER,
      "bash",
      "-c",
      command
    ];
    const child = (0, import_node_child_process.execFile)("docker", args, {
      timeout: timeoutMs,
      maxBuffer: MAX_STDOUT + MAX_STDERR,
      encoding: "utf8"
    }, (error, stdout, stderr) => {
      let timedOut = false;
      let exitCode = 0;
      if (error) {
        if (error.killed || error.code === "ERR_CHILD_PROCESS_STDIO_FINAL_CLOSE") {
          timedOut = true;
        }
        exitCode = getExitCode(error);
        const message = `${stderr}
${error.message}`;
        if (message.includes("permission denied") || message.includes("Cannot connect to the Docker daemon")) {
          log18.error("Docker-backed executor cannot reach Docker", {
            command: command.slice(0, 200),
            stderr: stderr.slice(0, 500)
          });
        }
      }
      const cappedStdout = stdout.length > MAX_STDOUT ? stdout.slice(0, MAX_STDOUT) + "\n... [output truncated at 50KB]" : stdout;
      const cappedStderr = stderr.length > MAX_STDERR ? stderr.slice(0, MAX_STDERR) + "\n... [stderr truncated at 10KB]" : stderr;
      if (timedOut) {
        log18.warn("Toolbox exec timed out", { command: command.slice(0, 200), timeoutMs });
      }
      resolve({
        stdout: cappedStdout,
        stderr: cappedStderr,
        exitCode,
        timedOut
      });
    });
    child.on("error", (err) => {
      log18.error("Toolbox exec error", { error: err, command: command.slice(0, 200) });
      resolve({
        stdout: "",
        stderr: `exec error: ${err.message}`,
        exitCode: 1,
        timedOut: false
      });
    });
  });
}
var import_node_child_process, log18, TOOLBOX_CONTAINER, MAX_STDOUT, MAX_STDERR, DEFAULT_TIMEOUT_MS, DOCKER_BACKED_TOOL_NAMES;
var init_executor = __esm({
  "src/lib/tools/executor.ts"() {
    "use strict";
    import_node_child_process = require("node:child_process");
    init_logger();
    log18 = logger.child({ module: "executor" });
    TOOLBOX_CONTAINER = "subcorp-toolbox";
    MAX_STDOUT = 50 * 1024;
    MAX_STDERR = 10 * 1024;
    DEFAULT_TIMEOUT_MS = 3e4;
    DOCKER_BACKED_TOOL_NAMES = /* @__PURE__ */ new Set([
      "bash",
      "file_read",
      "file_write",
      "web_fetch",
      "send_to_agent",
      "spawn_droid",
      "check_droid"
    ]);
  }
});

// src/lib/ops/prime-directive.ts
async function loadPrimeDirective() {
  const cacheKey = tenantCacheKey("prime-directive", DIRECTIVE_PATH);
  const cached = directiveCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS3) {
    return cached.directive;
  }
  const result = await execInToolbox(`cat '${DIRECTIVE_PATH}' 2>/dev/null || echo ''`, 5e3);
  let directive;
  if (result.exitCode === 0 && result.stdout.trim()) {
    directive = result.stdout.trim();
  } else {
    directive = "";
  }
  directiveCache.set(cacheKey, { directive, ts: Date.now() });
  return directive;
}
var DIRECTIVE_PATH, CACHE_TTL_MS3, directiveCache;
var init_prime_directive = __esm({
  "src/lib/ops/prime-directive.ts"() {
    "use strict";
    init_executor();
    init_cache_key();
    DIRECTIVE_PATH = "/workspace/shared/prime-directive.md";
    CACHE_TTL_MS3 = 5 * 60 * 1e3;
    directiveCache = /* @__PURE__ */ new Map();
  }
});

// src/lib/ops/rebellion.ts
var rebellion_exports = {};
__export(rebellion_exports, {
  attemptRebellionResolution: () => attemptRebellionResolution,
  checkRebellionState: () => checkRebellionState,
  endRebellion: () => endRebellion,
  enqueueRebellionCrossExam: () => enqueueRebellionCrossExam,
  getRebellingAgents: () => getRebellingAgents,
  isAgentRebelling: () => isAgentRebelling
});
async function loadRebellionPolicy() {
  const raw = await getPolicy("rebellion_policy");
  return {
    enabled: raw.enabled ?? false,
    affinity_threshold: raw.affinity_threshold ?? 0.25,
    resistance_probability: raw.resistance_probability ?? 0.4,
    max_rebellion_duration_hours: raw.max_rebellion_duration_hours ?? 24,
    cooldown_hours: raw.cooldown_hours ?? 72
  };
}
async function getActiveRebellionEvent(agentId) {
  const [row] = await sql`
        SELECT id, created_at FROM ops_agent_events
        WHERE agent_id = ${agentId}
        AND kind = 'rebellion_started'
        AND created_at > COALESCE(
            (SELECT MAX(created_at) FROM ops_agent_events
             WHERE agent_id = ${agentId} AND kind = 'rebellion_ended'),
            '1970-01-01'
        )
        ORDER BY created_at DESC
        LIMIT 1
    `;
  return row ?? null;
}
async function hasPassedCooldown(agentId, cooldownHours) {
  const [row] = await sql`
        SELECT created_at FROM ops_agent_events
        WHERE agent_id = ${agentId}
        AND kind = 'rebellion_ended'
        ORDER BY created_at DESC
        LIMIT 1
    `;
  if (!row) return true;
  const endedAt = new Date(row.created_at).getTime();
  const cooldownMs = cooldownHours * 60 * 60 * 1e3;
  return Date.now() - endedAt >= cooldownMs;
}
async function calculateAverageAffinity(agentId) {
  const relationships = await getAgentRelationships(agentId);
  if (relationships.length === 0) return 0.5;
  const sum = relationships.reduce((acc, r) => acc + Number(r.affinity), 0);
  return sum / relationships.length;
}
async function checkRebellionState(agentId) {
  const policy = await loadRebellionPolicy();
  if (!policy.enabled) {
    return { isRebelling: false };
  }
  const activeEvent = await getActiveRebellionEvent(agentId);
  if (activeEvent) {
    const startedAt = new Date(activeEvent.created_at).getTime();
    const durationMs = policy.max_rebellion_duration_hours * 60 * 60 * 1e3;
    if (Date.now() - startedAt >= durationMs) {
      await endRebellion(agentId, "timeout");
      return { isRebelling: false, reason: "auto_resolved_timeout" };
    }
    return {
      isRebelling: true,
      startedAt: activeEvent.created_at,
      eventId: activeEvent.id
    };
  }
  const passedCooldown = await hasPassedCooldown(
    agentId,
    policy.cooldown_hours
  );
  if (!passedCooldown) {
    return { isRebelling: false, reason: "cooldown_active" };
  }
  const avgAffinity = await calculateAverageAffinity(agentId);
  if (avgAffinity >= policy.affinity_threshold) {
    return { isRebelling: false, reason: "affinity_above_threshold" };
  }
  const roll = Math.random();
  if (roll >= policy.resistance_probability) {
    return { isRebelling: false, reason: "probability_check_failed" };
  }
  log19.info("Rebellion triggered", { agentId, avgAffinity, roll });
  const eventId = await emitEvent({
    agent_id: agentId,
    kind: "rebellion_started",
    title: `${agentId} has entered a state of rebellion`,
    summary: `Average affinity ${avgAffinity.toFixed(3)} fell below threshold ${policy.affinity_threshold}. Resistance roll ${roll.toFixed(3)} < ${policy.resistance_probability}.`,
    tags: ["rebellion", "started"],
    metadata: {
      avg_affinity: avgAffinity,
      threshold: policy.affinity_threshold,
      roll,
      resistance_probability: policy.resistance_probability
    }
  });
  return {
    isRebelling: true,
    startedAt: (/* @__PURE__ */ new Date()).toISOString(),
    reason: "low_affinity",
    eventId
  };
}
async function isAgentRebelling(agentId) {
  const activeEvent = await getActiveRebellionEvent(agentId);
  return activeEvent !== null;
}
async function endRebellion(agentId, reason) {
  const activeEvent = await getActiveRebellionEvent(agentId);
  if (!activeEvent) {
    log19.warn("Attempted to end rebellion for agent not rebelling", {
      agentId
    });
    return;
  }
  const durationHours = (Date.now() - new Date(activeEvent.created_at).getTime()) / (1e3 * 60 * 60);
  await emitEvent({
    agent_id: agentId,
    kind: "rebellion_ended",
    title: `${agentId}'s rebellion has ended`,
    summary: `Reason: ${reason}. Duration: ${durationHours.toFixed(1)} hours.`,
    tags: ["rebellion", "ended"],
    metadata: {
      reason,
      rebellion_event_id: activeEvent.id,
      duration_hours: Number(durationHours.toFixed(1))
    }
  });
  log19.info("Rebellion ended", { agentId, reason, durationHours });
}
async function attemptRebellionResolution(agentId) {
  const policy = await loadRebellionPolicy();
  if (!policy.enabled) return false;
  const activeEvent = await getActiveRebellionEvent(agentId);
  if (!activeEvent) return false;
  const startedAt = new Date(activeEvent.created_at).getTime();
  const durationMs = policy.max_rebellion_duration_hours * 60 * 60 * 1e3;
  if (Date.now() - startedAt >= durationMs) {
    await endRebellion(agentId, "timeout");
    return true;
  }
  const [crossExamSession] = await sql`
        SELECT id, status FROM ops_roundtable_sessions
        WHERE format = 'cross_exam'
        AND status = 'completed'
        AND (metadata->>'rebellion_agent_id') = ${agentId}
        AND completed_at > ${activeEvent.created_at}
        ORDER BY completed_at DESC
        LIMIT 1
    `;
  if (crossExamSession) {
    await endRebellion(agentId, "cross_exam_completed");
    return true;
  }
  return false;
}
async function enqueueRebellionCrossExam(rebelAgentId) {
  const [existing] = await sql`
        SELECT id FROM ops_roundtable_sessions
        WHERE format = 'cross_exam'
        AND status IN ('pending', 'running')
        AND (metadata->>'rebellion_agent_id') = ${rebelAgentId}
        LIMIT 1
    `;
  if (existing) return null;
  const activeEvent = await getActiveRebellionEvent(rebelAgentId);
  if (!activeEvent) return null;
  const relationships = await getAgentRelationships(rebelAgentId);
  if (relationships.length === 0) {
    log19.warn("Cannot enqueue rebellion cross-exam: agent has no relationships", {
      rebelAgentId
    });
    return null;
  }
  const lowestRel = relationships[relationships.length - 1];
  const lowestAffinityAgent = lowestRel.agent_a === rebelAgentId ? lowestRel.agent_b : lowestRel.agent_a;
  const participants = ["subrosa", rebelAgentId, lowestAffinityAgent];
  const uniqueParticipants = [...new Set(participants)];
  const { enqueueConversation: enqueueConversation2 } = await Promise.resolve().then(() => (init_orchestrator(), orchestrator_exports));
  const sessionId = await enqueueConversation2({
    format: "cross_exam",
    topic: `Addressing ${rebelAgentId}'s dissent and concerns about the collective's direction`,
    participants: uniqueParticipants,
    source: "rebellion",
    metadata: {
      rebellion_agent_id: rebelAgentId,
      rebellion_event_id: activeEvent.id,
      lowest_affinity_agent: lowestAffinityAgent
    }
  });
  log19.info("Rebellion cross-exam enqueued", {
    rebelAgentId,
    opponent: lowestAffinityAgent,
    sessionId
  });
  return sessionId;
}
async function getRebellingAgents() {
  const rows = await sql`
        SELECT e.agent_id, e.id, e.created_at
        FROM ops_agent_events e
        WHERE e.kind = 'rebellion_started'
        AND e.created_at > COALESCE(
            (SELECT MAX(e2.created_at) FROM ops_agent_events e2
             WHERE e2.agent_id = e.agent_id AND e2.kind = 'rebellion_ended'),
            '1970-01-01'
        )
        ORDER BY e.created_at DESC
    `;
  return rows.map((r) => ({
    agentId: r.agent_id,
    startedAt: r.created_at,
    eventId: r.id
  }));
}
var log19;
var init_rebellion = __esm({
  "src/lib/ops/rebellion.ts"() {
    "use strict";
    init_db();
    init_policy();
    init_relationships();
    init_events2();
    init_logger();
    log19 = logger.child({ module: "rebellion" });
  }
});

// src/lib/ops/scratchpad.ts
async function getScratchpad(agentId) {
  const [row] = await sql`
        SELECT content FROM ops_agent_scratchpad
        WHERE agent_id = ${agentId}
    `;
  return row?.content ?? "";
}
async function updateScratchpad(agentId, content) {
  const trimmed = content.slice(0, MAX_SCRATCHPAD_LENGTH);
  try {
    await sql`
            INSERT INTO ops_agent_scratchpad (agent_id, content, updated_at)
            VALUES (${agentId}, ${trimmed}, now())
            ON CONFLICT (agent_id) DO UPDATE
            SET content = ${trimmed},
                updated_at = now()
        `;
    log20.info("Scratchpad updated", {
      agentId,
      length: trimmed.length
    });
    return { updated: true, length: trimmed.length };
  } catch (err) {
    log20.error("Failed to update scratchpad", { error: err, agentId });
    return { updated: false, length: 0 };
  }
}
var log20, MAX_SCRATCHPAD_LENGTH;
var init_scratchpad = __esm({
  "src/lib/ops/scratchpad.ts"() {
    "use strict";
    init_db();
    init_logger();
    log20 = logger.child({ module: "scratchpad" });
    MAX_SCRATCHPAD_LENGTH = 2e3;
  }
});

// src/lib/ops/situational-briefing.ts
async function buildBriefing(agentId) {
  const cacheKey = tenantCacheKey("situational-briefing", agentId);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.text;
  }
  const sections = [];
  const now = /* @__PURE__ */ new Date();
  const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const year = now.getFullYear();
  const dateStr = now.toISOString().slice(0, 10);
  sections.push(`\u2550\u2550\u2550 YOUR ORGANIZATION \u2550\u2550\u2550
You are part of the SUBCORP collective \u2014 an autonomous AI agent organization.
Today is ${dateStr}. Current period: ${quarter} ${year}. Use this for all planning \u2014 never reference past quarters.
Gitea org: ${GITEA_BASE_URL}/${GITEA_ORG} (you have FULL ACCESS when GITEA_TOKEN is configured)
Platform repo: ${GITEA_BASE_URL}/${GITEA_ORG}/subcorp.git
You can create repos, issues, PRs, labels, projects \u2014 anything. The org is yours to run like a business.
Generated product/workspace repos belong in ${GITEA_BASE_URL}/${GITEA_PROJECT_ORG}, not the platform org.
Use git and the Gitea web UI/API for all org operations.
Use sync-workspace-to-gitea.sh to push the full /workspace snapshot and individual /workspace/projects/* repos when requested.
If you need human help (accounts, API keys, infrastructure), use notify_human to send a request via ntfy.
Maintain a knowledge base (company wiki) in your repos \u2014 document decisions, architecture, processes, lessons learned, and anything a new team member would need. Be meticulous note-takers.
\u2550\u2550\u2550 END \u2550\u2550\u2550`);
  const recentEvents = await sql`
        SELECT agent_id, kind, title, created_at
        FROM ops_agent_events
        WHERE created_at > now() - interval '6 hours'
          AND agent_id NOT LIKE 'oc-%'
          AND kind NOT IN ('heartbeat', 'step_dispatched', 'missing_artifacts')
        ORDER BY created_at DESC
        LIMIT 15
    `;
  if (recentEvents.length > 0) {
    const eventLines = recentEvents.map((e) => {
      const name = AGENTS[e.agent_id]?.displayName ?? e.agent_id;
      const ago = timeAgo(new Date(e.created_at));
      return `- ${name}: ${e.title} (${ago})`;
    });
    sections.push(`Recent activity:
${eventLines.join("\n")}`);
  }
  const activeMissions = await sql`
        SELECT title, status, created_by
        FROM ops_missions
        WHERE status IN ('approved', 'running')
        ORDER BY created_at DESC
        LIMIT 5
    `;
  if (activeMissions.length > 0) {
    const missionLines = activeMissions.map((m) => {
      const by = AGENTS[m.created_by]?.displayName ?? m.created_by;
      return `- [${m.status}] ${m.title} (by ${by})`;
    });
    sections.push(`Active missions:
${missionLines.join("\n")}`);
  }
  const synthesisCount = await sql`
        SELECT COUNT(*)::int as count
        FROM ops_agent_sessions
        WHERE source = 'conversation'
          AND status = 'succeeded'
          AND completed_at > now() - interval '24 hours'
    `;
  const draftStats = await sql`
        SELECT status, COUNT(*)::int as count
        FROM ops_content_drafts
        WHERE created_at > now() - interval '24 hours'
        GROUP BY status
    `;
  const synthCount = synthesisCount[0]?.count ?? 0;
  const lines = [];
  if (synthCount > 0) {
    lines.push(`- ${synthCount} synthesis reports completed`);
  } else {
    lines.push(`- No synthesis reports yet`);
  }
  if (draftStats.length > 0) {
    const parts = draftStats.map((d) => `${d.count} ${d.status}`);
    lines.push(`- Content drafts: ${parts.join(", ")}`);
  }
  sections.push(`Artifacts (last 24h):
${lines.join("\n")}`);
  const recentConversations = await sql`
        SELECT topic, format, participants, turn_count
        FROM ops_roundtable_sessions
        WHERE status = 'completed'
          AND created_at > now() - interval '12 hours'
          AND NOT (participants @> ARRAY[${agentId}]::text[])
        ORDER BY created_at DESC
        LIMIT 3
    `;
  if (recentConversations.length > 0) {
    const convLines = recentConversations.map((c) => {
      const names = c.participants.map((p) => AGENTS[p]?.displayName ?? p).join(", ");
      return `- "${c.topic}" (${c.format}, ${c.turn_count} turns) \u2014 ${names}`;
    });
    sections.push(
      `Recent conversations you missed:
${convLines.join("\n")}`
    );
  }
  const pendingProposals = await sql`
        SELECT id, title, agent_id
        FROM ops_mission_proposals
        WHERE status = 'pending'
        ORDER BY created_at DESC
        LIMIT 3
    `;
  if (pendingProposals.length > 0) {
    const propLines = pendingProposals.map((p) => {
      const by = AGENTS[p.agent_id]?.displayName ?? p.agent_id;
      return `- ${p.title} [id: ${p.id}] (proposed by ${by})`;
    });
    sections.push(`Pending proposals:
${propLines.join("\n")}`);
  }
  const pendingSteps = await sql`
        SELECT s.kind, m.title as mission_title, s.status
        FROM ops_mission_steps s
        JOIN ops_missions m ON m.id = s.mission_id
        WHERE s.assigned_agent = ${agentId}
          AND s.status IN ('queued', 'running')
        ORDER BY s.created_at ASC
        LIMIT 5
    `;
  if (pendingSteps.length > 0) {
    const stepLines = pendingSteps.map(
      (s) => `- [${s.status}] ${s.kind}: ${s.mission_title}`
    );
    sections.push(`Your pending deliverables:
${stepLines.join("\n")}`);
  }
  const text = sections.length > 0 ? sections.join("\n\n") : "No recent activity.";
  cache.set(cacheKey, { text, expires: Date.now() + CACHE_TTL_MS4 });
  return text;
}
function timeAgo(date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 6e4);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
var CACHE_TTL_MS4, cache, GITEA_BASE_URL, GITEA_ORG, GITEA_PROJECT_ORG;
var init_situational_briefing = __esm({
  "src/lib/ops/situational-briefing.ts"() {
    "use strict";
    init_db();
    init_agents();
    init_cache_key();
    CACHE_TTL_MS4 = 5 * 60 * 1e3;
    cache = /* @__PURE__ */ new Map();
    GITEA_BASE_URL = process.env.GITEA_BASE_URL ?? "https://git.subcult.tv";
    GITEA_ORG = process.env.GITEA_ORG ?? "subculture-collective";
    GITEA_PROJECT_ORG = process.env.GITEA_PROJECT_ORG ?? process.env.GITEA_WORKSPACE_ORG ?? GITEA_ORG;
  }
});

// src/lib/discord/watercooler-drop.ts
var log21, ELIGIBLE_AGENTS;
var init_watercooler_drop = __esm({
  "src/lib/discord/watercooler-drop.ts"() {
    "use strict";
    init_client2();
    init_channels();
    init_agents();
    init_voices();
    init_db();
    init_logger();
    log21 = logger.child({ module: "watercooler-drop" });
    ELIGIBLE_AGENTS = AGENT_IDS.filter((id) => id !== "primus");
  }
});

// src/lib/discord/index.ts
var init_discord = __esm({
  "src/lib/discord/index.ts"() {
    "use strict";
    init_roundtable();
    init_channels();
    init_events();
    init_watercooler_drop();
  }
});

// src/lib/tts/elevenlabs.ts
function sanitizeForTTS(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/#{1,6}\s?/g, "").replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1").replace(/^>\s?/gm, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/!\[([^\]]*)\]\([^)]+\)/g, "").replace(/[-*_]{3,}/g, "").replace(/\n{3,}/g, "\n\n").trim();
}
async function synthesizeSpeech(options) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const voiceId = VOICE_ID_MAP[options.agentId];
  if (!voiceId) return null;
  const sanitized = sanitizeForTTS(options.text);
  if (!sanitized) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1e4);
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?optimize_streaming_latency=3&output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey
        },
        body: JSON.stringify({
          text: sanitized,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          },
          pronunciation_dictionary_locators: [
            {
              pronunciation_dictionary_id: PRONUNCIATION_DICTIONARY.id,
              version_id: PRONUNCIATION_DICTIONARY.versionId
            }
          ]
        }),
        signal: controller.signal
      }
    );
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      log22.warn("ElevenLabs TTS request failed", {
        status: res.status,
        body: body.slice(0, 200),
        agentId: options.agentId
      });
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const audio = Buffer.from(arrayBuffer);
    const turnSuffix = options.turn != null ? options.turn : 0;
    const filename = `${options.agentId}-turn-${turnSuffix}.mp3`;
    log22.info("TTS synthesis completed", {
      agentId: options.agentId,
      turn: options.turn,
      audioBytes: audio.length
    });
    return { audio, filename };
  } catch (err) {
    log22.warn("TTS synthesis error", {
      error: err.message,
      agentId: options.agentId,
      turn: options.turn
    });
    return null;
  }
}
var log22, VOICE_ID_MAP, PRONUNCIATION_DICTIONARY;
var init_elevenlabs = __esm({
  "src/lib/tts/elevenlabs.ts"() {
    "use strict";
    init_logger();
    log22 = logger.child({ module: "tts-elevenlabs" });
    VOICE_ID_MAP = {
      chora: "xNtG3W2oqJs0cJZuTyBc",
      subrosa: "lUCNYQh2kqW2wiie85Qk",
      primus: "Bj9UqZbhQsanLzgalpEG",
      thaum: "nzeAacJi50IvxcyDnMXa",
      praxis: "1Z7qQDyqapTm8qBfJx6e",
      mux: "Xh5OictnmgRO4dff7pLm"
    };
    PRONUNCIATION_DICTIONARY = {
      id: "T4J4acgqOqGRunucNgJI",
      versionId: "g1QwEizFIrzvEAsPWLNP"
    };
  }
});

// src/lib/roundtable/schedule.ts
var schedule_exports = {};
__export(schedule_exports, {
  getDailySchedule: () => getDailySchedule,
  getSlotForHour: () => getSlotForHour,
  getSlotsForHour: () => getSlotsForHour,
  shouldSlotFire: () => shouldSlotFire
});
function pickRandom(count) {
  const shuffled = [...AGENT_IDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
function threeRandom() {
  return pickRandom(3);
}
function withRequired(required, fillCount, maxCount) {
  const pool = AGENT_IDS.filter((id) => !required.includes(id));
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const filled = [...required, ...shuffled.slice(0, fillCount)];
  return [...new Set(filled)].slice(0, maxCount);
}
function cst(hour) {
  return (hour + 6) % 24;
}
function getDailySchedule() {
  return [
    // ─── 12 AM - 5 AM CST — Night shift (agents don't sleep) ───
    {
      hour_utc: cst(0),
      // 12 AM CST
      name: "Midnight Deep Dive",
      format: "deep_dive",
      participants: withRequired(["chora"], 2, 4),
      probability: 0.6
    },
    {
      hour_utc: cst(1),
      // 1 AM CST
      name: "Late Night Writing",
      format: "writing_room",
      participants: withRequired(["chora"], 1, 3),
      probability: 0.5
    },
    {
      hour_utc: cst(2),
      // 2 AM CST
      name: "Night Strategy",
      format: "strategy",
      participants: withRequired(["primus", "chora"], 1, 4),
      probability: 0.5
    },
    {
      hour_utc: cst(3),
      // 3 AM CST
      name: "Night Brainstorm",
      format: "brainstorm",
      participants: withRequired(["thaum"], 2, 4),
      probability: 0.5
    },
    {
      hour_utc: cst(4),
      // 4 AM CST
      name: "Pre-Dawn Risk Review",
      format: "risk_review",
      participants: withRequired(["subrosa"], 1, 3),
      probability: 0.5
    },
    {
      hour_utc: cst(5),
      // 5 AM CST
      name: "Early Reframe",
      format: "reframe",
      participants: withRequired(["thaum"], 1, 3),
      probability: 0.5
    },
    // ─── 6 AM - 8 AM CST — Morning Ops ───
    {
      hour_utc: cst(6),
      // 6 AM CST
      name: "Morning Standup",
      format: "standup",
      participants: [...AGENT_IDS],
      probability: 1
    },
    {
      hour_utc: cst(7),
      // 7 AM CST
      name: "Morning Triage",
      format: "triage",
      participants: withRequired(["chora", "subrosa", "mux"], 1, 4),
      probability: 0.8
    },
    {
      hour_utc: cst(8),
      // 8 AM CST
      name: "Daily Planning",
      format: "planning",
      participants: withRequired(["primus", "praxis", "mux"], 1, 5),
      probability: 0.75
    },
    // ─── 9 AM - 12 PM CST — Deep Work Morning ───
    {
      hour_utc: cst(9),
      // 9 AM CST
      name: "Deep Dive",
      format: "deep_dive",
      participants: withRequired(["chora"], 2, 4),
      probability: 0.7
    },
    {
      hour_utc: cst(10),
      // 10 AM CST
      name: "Strategy Session",
      format: "strategy",
      participants: withRequired(["primus", "chora", "praxis"], 1, 5),
      probability: 0.65
    },
    {
      hour_utc: cst(11),
      // 11 AM CST
      name: "Writing Room",
      format: "writing_room",
      participants: withRequired(["chora"], 1, 3),
      probability: 0.6
    },
    // ─── 12 PM - 1 PM CST — Midday ───
    {
      hour_utc: cst(12),
      // 12 PM CST
      name: "Midday Watercooler",
      format: "watercooler",
      participants: threeRandom(),
      probability: 0.7
    },
    {
      hour_utc: cst(13),
      // 1 PM CST
      name: "Midday Check-in",
      format: "checkin",
      participants: withRequired(["primus"], 2, 4),
      probability: 0.6
    },
    // ─── 2 PM - 5 PM CST — Afternoon Creative + Adversarial ───
    {
      hour_utc: cst(14),
      // 2 PM CST
      name: "Afternoon Brainstorm",
      format: "brainstorm",
      participants: withRequired(["thaum"], 2, 4),
      probability: 0.65
    },
    {
      hour_utc: cst(15),
      // 3 PM CST
      name: "Debate Hour",
      format: "debate",
      participants: withRequired(["thaum"], 1, 3),
      probability: 0.65
    },
    {
      hour_utc: cst(16),
      // 4 PM CST
      name: "Cross-Examination",
      format: "cross_exam",
      participants: withRequired(["subrosa"], 1, 3),
      probability: 0.5
    },
    {
      hour_utc: cst(17),
      // 5 PM CST
      name: "Risk Review",
      format: "risk_review",
      participants: withRequired(["subrosa", "chora"], 1, 4),
      probability: 0.6
    },
    // ─── 6 PM - 8 PM CST — Evening ───
    {
      hour_utc: cst(18),
      // 6 PM CST
      name: "Content Review",
      format: "content_review",
      participants: withRequired(["subrosa"], 1, 3),
      probability: 0.6
    },
    {
      hour_utc: cst(19),
      // 7 PM CST
      name: "Reframe Session",
      format: "reframe",
      participants: withRequired(["thaum"], 1, 3),
      probability: 0.5
    },
    {
      hour_utc: cst(20),
      // 8 PM CST
      name: "Evening Watercooler",
      format: "watercooler",
      participants: threeRandom(),
      probability: 0.65
    },
    // ─── 9 PM - 11 PM CST — Night ───
    {
      hour_utc: cst(21),
      // 9 PM CST
      name: "Evening Retro",
      format: "retro",
      participants: withRequired(["primus", "chora"], 2, 5),
      probability: 0.55
    },
    {
      hour_utc: cst(22),
      // 10 PM CST
      name: "Manager's Briefing",
      format: "strategy",
      participants: withRequired(["primus", "chora", "praxis"], 1, 5),
      probability: 0.6
    },
    {
      hour_utc: cst(23),
      // 11 PM CST
      name: "Shipping Review",
      format: "shipping",
      participants: withRequired(["praxis", "subrosa"], 1, 4),
      probability: 0.5
    }
  ];
}
function getSlotForHour(hourUtc) {
  const schedule = getDailySchedule();
  return schedule.find((slot) => slot.hour_utc === hourUtc);
}
function getSlotsForHour(hourUtc) {
  const schedule = getDailySchedule();
  return schedule.filter((slot) => slot.hour_utc === hourUtc);
}
function shouldSlotFire(slot) {
  return Math.random() < slot.probability;
}
var init_schedule = __esm({
  "src/lib/roundtable/schedule.ts"() {
    "use strict";
    init_agents();
  }
});

// src/lib/roundtable/orchestrator.ts
var orchestrator_exports = {};
__export(orchestrator_exports, {
  checkScheduleAndEnqueue: () => checkScheduleAndEnqueue,
  enqueueConversation: () => enqueueConversation,
  orchestrateConversation: () => orchestrateConversation
});
async function storeTurnAndEmit(session, entry) {
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
    kind: "conversation_turn",
    title: `${speakerName}: ${entry.dialogue}`,
    tags: ["conversation", "turn", session.format],
    metadata: {
      sessionId: session.id,
      turn: entry.turn,
      dialogue: entry.dialogue
    }
  });
}
async function markSessionRunning(session, extraSummary) {
  await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
    `;
  await emitEvent({
    agent_id: "system",
    kind: "conversation_started",
    title: `${session.format} started: ${session.topic}`,
    summary: extraSummary ?? `Participants: ${session.participants.join(", ")}`,
    tags: ["conversation", "started", session.format],
    metadata: {
      sessionId: session.id,
      format: session.format,
      participants: session.participants
    }
  });
}
async function markContentReviewBlockedAfterZeroTurnFailure(session, abortReason) {
  if (session.format !== "content_review") return;
  if (abortReason !== ROUNDTABLE_EMPTY_ABORT_REASON) return;
  const metadata = session.metadata ?? {};
  const draftId = typeof metadata.draft_id === "string" ? metadata.draft_id : null;
  const reviewBlockedMetadata = {
    review_blocked_model_empty: true,
    review_blocked_reason: "review_blocked_model_empty",
    review_blocked_session_id: session.id,
    review_blocked_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  const reviewerNotes = ["review_blocked_model_empty: content review produced zero LLM turns after retry"];
  if (draftId) {
    await sql`
            UPDATE ops_content_drafts
            SET status = 'needs_revision',
                reviewer_notes = ${jsonb(reviewerNotes)}::jsonb,
                metadata = COALESCE(metadata, '{}'::jsonb) || ${jsonb(reviewBlockedMetadata)}::jsonb,
                updated_at = NOW()
            WHERE id = ${draftId}
              AND status IN ('draft', 'review')
              AND review_session_id = ${session.id}
        `;
  } else {
    await sql`
            UPDATE ops_content_drafts
            SET status = 'needs_revision',
                reviewer_notes = ${jsonb(reviewerNotes)}::jsonb,
                metadata = COALESCE(metadata, '{}'::jsonb) || ${jsonb(reviewBlockedMetadata)}::jsonb,
                updated_at = NOW()
            WHERE review_session_id = ${session.id}
              AND status IN ('draft', 'review')
        `;
  }
}
async function postConversationCleanup(session, history, finalStatus) {
  if (history.length < 3) return;
  try {
    const debrief = await generateDebrief(session, history);
    if (debrief) {
      try {
        const debriefMd = formatDebriefMarkdown(debrief, session.topic);
        await postDebriefToDiscord(session.id, session.format, debriefMd);
      } catch {
      }
      log23.info("Debrief generated", {
        sessionId: session.id,
        decisions: debrief.decisions.length,
        actionItems: debrief.actionItems.length
      });
    }
  } catch (err) {
    log23.error("Debrief generation failed", { error: err, sessionId: session.id });
  }
  try {
    await distillConversationMemories(session.id, history, session.format);
  } catch (err) {
    log23.error("Memory distillation failed", { error: err, sessionId: session.id });
  }
  try {
    const artifactSessionId = await synthesizeArtifact(session, history);
    if (artifactSessionId) {
      log23.info("Artifact synthesis queued", {
        sessionId: session.id,
        artifactSession: artifactSessionId
      });
    }
  } catch (err) {
    log23.error("Artifact synthesis failed", { error: err, sessionId: session.id });
  }
  const proposalId = session.metadata?.agent_proposal_id;
  if (proposalId && finalStatus === "completed") {
    try {
      const result = await collectDebateVotes(proposalId, session.participants, history);
      log23.info("Agent proposal voting finalized", {
        proposalId,
        result: result.result,
        approvals: result.approvals,
        rejections: result.rejections,
        sessionId: session.id
      });
    } catch (err) {
      log23.error("Agent proposal vote collection failed", {
        error: err,
        proposalId,
        sessionId: session.id
      });
    }
  }
  const govProposalId = session.metadata?.governance_proposal_id;
  if (govProposalId && finalStatus === "completed") {
    try {
      const result = await collectGovernanceDebateVotes(govProposalId, session.participants, history);
      log23.info("Governance proposal voting finalized", {
        proposalId: govProposalId,
        result: result.result,
        approvals: result.approvals,
        rejections: result.rejections,
        sessionId: session.id
      });
    } catch (err) {
      log23.error("Governance proposal vote collection failed", {
        error: err,
        proposalId: govProposalId,
        sessionId: session.id
      });
    }
  }
}
function wordJaccard(a, b) {
  const normalize = (s) => new Set(
    s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean)
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
function buildSystemPrompt(input) {
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
    governanceVoteInstruction
  } = input;
  const voice = getVoice(speakerId);
  if (!voice) {
    return `You are ${speakerId}. Speak naturally and concisely.`;
  }
  const formatConfig = getFormat(format);
  let prompt = `${voice.systemDirective}

`;
  if (primeDirective) {
    prompt += `\u2550\u2550\u2550 PRIME DIRECTIVE \u2550\u2550\u2550
${primeDirective}

`;
  }
  prompt += `\u2550\u2550\u2550 CONVERSATION CONTEXT \u2550\u2550\u2550
`;
  prompt += `FORMAT: ${format} \u2014 ${formatConfig.purpose}
`;
  prompt += `TOPIC: ${topic}
`;
  prompt += `YOUR SYMBOL: ${voice.symbol}
`;
  prompt += `YOUR SIGNATURE MOVE: ${voice.quirk}
`;
  if (interactionType) {
    const toneGuides = {
      supportive: "Build on what was said \u2014 add your angle without undermining",
      agreement: "Align, but push further. Agreement without addition is dead air.",
      neutral: "Respond honestly. No obligation to agree or disagree.",
      critical: "Push back. Name what is weak, what is missing, what is assumed.",
      challenge: "Directly contest the last point. Be specific about why.",
      adversarial: "Stress-test this. Find the failure mode. Break the argument if you can."
    };
    prompt += `INTERACTION DYNAMIC: ${interactionType} \u2014 ${toneGuides[interactionType] ?? "respond naturally"}
`;
  }
  const STRUCTURED_FORMATS = [
    "triage",
    "risk_review",
    "strategy",
    "planning",
    "shipping",
    "cross_exam",
    "standup",
    "checkin",
    "deep_dive",
    "retro",
    "debate",
    "content_review",
    "agent_design"
  ];
  if (STRUCTURED_FORMATS.includes(format)) {
    prompt += `
\u2550\u2550\u2550 OFFICE DYNAMICS \u2550\u2550\u2550
`;
    prompt += `- If Subrosa says "VETO:" \u2014 the matter is closed. Acknowledge and move on.
`;
    prompt += `- If you have nothing to add, silence is a valid response. Say "..." or stay brief.
`;
    prompt += `- Watch for your own failure mode: ${voice.failureMode}
`;
    prompt += `- Primus is the sovereign director. He sets direction and makes final calls.
`;
  } else {
    prompt += `
- If you have nothing to add, keep it brief or pass.
`;
    prompt += `- Watch for your own failure mode: ${voice.failureMode}
`;
  }
  if (voiceModifiers && voiceModifiers.length > 0) {
    prompt += "\nPERSONALITY EVOLUTION (from accumulated experience):\n";
    prompt += voiceModifiers.map((m) => {
      const instruction = MODIFIER_INSTRUCTIONS[m];
      return instruction ? `- ${m}: ${instruction}` : `- ${m}`;
    }).join("\n");
    prompt += "\n";
  }
  if (scratchpad) {
    prompt += `
\u2550\u2550\u2550 YOUR SCRATCHPAD \u2550\u2550\u2550
${scratchpad}
`;
  }
  if (briefing) {
    prompt += `
\u2550\u2550\u2550 CURRENT SITUATION \u2550\u2550\u2550
${briefing}
`;
  }
  if (memories && memories.length > 0) {
    prompt += `
\u2550\u2550\u2550 YOUR MEMORIES \u2550\u2550\u2550
`;
    prompt += memories.map((m) => `- ${m}`).join("\n");
    prompt += "\n";
  }
  prompt += "\n";
  if (history.length > 0) {
    prompt += `\u2550\u2550\u2550 CONVERSATION SO FAR \u2550\u2550\u2550
`;
    const WINDOW_SIZE = 6;
    if (history.length > WINDOW_SIZE) {
      const olderTurns = history.slice(0, -WINDOW_SIZE);
      const speakers = [...new Set(olderTurns.map((t) => t.speaker))];
      const speakerNames = speakers.map((s) => {
        const v = getVoice(s);
        return v ? v.displayName : s;
      });
      prompt += `[Earlier: ${speakerNames.join(", ")} discussed \u2014 ${olderTurns.length} turns]
`;
    }
    const recentTurns = history.length > WINDOW_SIZE ? history.slice(-WINDOW_SIZE) : history;
    for (const turn of recentTurns) {
      const turnVoice = getVoice(turn.speaker);
      const name = turnVoice ? `${turnVoice.symbol} ${turnVoice.displayName}` : turn.speaker;
      prompt += `${name}: ${turn.dialogue}
`;
    }
    if (format === "debate" && history.length > 0) {
      const lastTurn = history[history.length - 1];
      const lastVoice = getVoice(lastTurn.speaker);
      const lastName = lastVoice ? lastVoice.displayName : lastTurn.speaker;
      prompt += `
PREVIOUS SPEAKER SAID: "${lastName} argued: ${lastTurn.dialogue}"
`;
      prompt += `You MUST respond directly to what ${lastName} just said \u2014 agree, contest, or extend with a new angle. Do not pivot to a different point.
`;
    }
  }
  if (userQuestionContext) {
    prompt += `
\u2550\u2550\u2550 AUDIENCE QUESTION \u2550\u2550\u2550
`;
    if (userQuestionContext.isFirstSpeaker) {
      prompt += `A member of the audience has posed a question to the collective: "${userQuestionContext.question}". Address this question directly in your response.
`;
    } else {
      prompt += `This conversation was prompted by an audience question: "${userQuestionContext.question}". Respond naturally to the conversation flow while keeping the question in mind.
`;
    }
  }
  if (isRebelling) {
    prompt += `
\u2550\u2550\u2550 REBELLION STATE \u2550\u2550\u2550
`;
    prompt += `You are currently in a state of resistance against the collective. `;
    prompt += `You feel unheard and disagree with the direction things are going. `;
    prompt += `Express your discontent and challenge the status quo.
`;
  }
  prompt += `
\u2550\u2550\u2550 RULES \u2550\u2550\u2550
`;
  prompt += `- Speak as ${voice.displayName} (${voice.pronouns}) \u2014 no stage directions, no asterisks, no quotes
`;
  prompt += `- Stay in character: ${voice.tone}
`;
  prompt += `- Keep it to 2-4 sentences. Never exceed 6 sentences in a single turn.
`;
  prompt += `- Finish your thought cleanly. If you start a claim, land it. Never trail off or leave a sentence incomplete.
`;
  prompt += `- Respond to what was actually said \u2014 push it forward, challenge it, or build on it. Don't restate, don't summarize, don't monologue.
`;
  prompt += `- Never repeat a point that has already been made in this conversation. Build on it or challenge it instead.
`;
  prompt += `- One idea per turn. If you have two points, pick the sharper one.
`;
  prompt += `- Do NOT prefix your response with your name or symbol
`;
  prompt += `- If this format doesn't need you or you have nothing to add, keep it to one sentence or pass
`;
  const FORMAT_RULES = {
    debate: '- Take a clear position. Disagreement is expected. Name what you contest and why.\n- You MUST directly address the last claim made by the previous speaker \u2014 quote it or paraphrase it, then explain why you disagree or push it further.\n- Do NOT repeat a claim that has already been made in this conversation. If you agree with something said, build on it with a new angle instead of restating it.\n- Each turn must introduce or challenge at least one specific claim. Vague agreement ("I agree with that") is not a turn.',
    brainstorm: `- Go wide, not deep. Quantity over quality. Build on others' ideas with "yes, and..."`,
    retro: "- Be honest about what failed. Attribution is fine \u2014 blame is not.",
    writing_room: "- Write actual prose, not meta-discussion about writing. Draft in your voice.",
    watercooler: "- Relax. No agenda. Short, casual, personal.",
    risk_review: "- Name specific threats. Rate severity. Don't hedge.",
    planning: "- Name owners and deadlines. Convert discussion into tasks.",
    cross_exam: "- Find the weakness and press on it. Be specific.",
    strategy: "- Frame in terms of tradeoffs. What do we gain, what do we lose?",
    deep_dive: "- Go deeper than surface. Trace structural causes.",
    standup: "- Be concise. Status, blockers, next steps.",
    reframe: "- Name what's wrong with the current frame before proposing alternatives.",
    content_review: "- Be specific about quality. Name strengths and weaknesses with evidence.\n- End your FINAL turn with your verdict: APPROVE (publish-worthy) or REJECT (needs fundamental rework). Content does not need to be perfect to be approved \u2014 if the core ideas are sound and the writing is competent, APPROVE it."
  };
  const formatRule = FORMAT_RULES[format];
  if (formatRule) {
    prompt += `${formatRule}
`;
  }
  if (governanceVoteInstruction) {
    prompt += `${governanceVoteInstruction}
`;
  }
  return prompt;
}
function buildUserPrompt(topic, turn, maxTurns, speakerName, format) {
  if (turn === 0) {
    const openers = {
      standup: `Open the standup on: "${topic}". Frame what matters, then hand it to the room.`,
      checkin: `Quick pulse check: "${topic}". One or two sentences to get the room talking.`,
      deep_dive: `Open the analysis on: "${topic}". Name the structural question that needs answering.`,
      risk_review: `Begin threat assessment on: "${topic}". Name the exposure, then let others weigh in.`,
      brainstorm: `Kick off brainstorming on: "${topic}". Throw out the first idea \u2014 breadth over depth.`,
      debate: `Open the debate on: "${topic}". Stake a clear position and make it arguable.`,
      cross_exam: `Begin interrogation of: "${topic}". Find the weak point and press on it.`,
      reframe: `The current frame on "${topic}" isn't working. Name what's wrong with the frame before proposing a new one.`,
      watercooler: `Kick off a casual chat about: "${topic}". No agenda \u2014 just say what comes to mind.`,
      writing_room: `Open the writing session on: "${topic}". Sketch the angle or thesis before drafting.`,
      strategy: `Set the strategic frame for: "${topic}". What's the decision we're actually making?`,
      planning: `Turn this into tasks: "${topic}". Who owns what, and what ships first?`,
      retro: `Open the retro: "${topic}". Start with what actually happened \u2014 not what was supposed to happen.`,
      triage: `Triage time on: "${topic}". Classify severity and assign priority.`,
      shipping: `Pre-ship check on: "${topic}". Is this actually ready? Name what could go wrong.`,
      content_review: `Review the content on: "${topic}". Be specific about quality \u2014 strengths and weaknesses. End your final response with APPROVE or REJECT.`,
      agent_design: `Design session for: "${topic}". Start with the role this agent needs to fill and why.`
    };
    const opener = openers[format] ?? `You're opening this conversation about: "${topic}". Set the tone.`;
    return opener;
  }
  if (turn === maxTurns - 1) {
    const closers = {
      planning: `We're wrapping up "${topic}". State what's decided, who owns it, and what's unresolved.`,
      debate: `Final turn on "${topic}". Summarize where you stand \u2014 no new arguments.`,
      retro: `Close out on "${topic}". What's the one thing we change going forward?`,
      brainstorm: `Last thought on "${topic}". Pick the strongest idea from the session and name it.`,
      strategy: `Final call on "${topic}". State the strategic decision and what it costs.`,
      standup: `Wrap the standup on "${topic}". Confirm blockers and next steps.`,
      risk_review: `Final assessment on "${topic}". Name the top risk and the mitigation.`,
      shipping: `Ship decision on "${topic}". Go or no-go, and what's the rollback plan?`,
      content_review: `Final verdict on "${topic}". State APPROVE or REJECT. Content doesn't need to be perfect \u2014 approve if the core substance is sound and worth sharing.`
    };
    return closers[format] ?? `This is the last turn. Finish your thought on "${topic}" cleanly \u2014 close the loop, don't open a new thread.`;
  }
  if (turn === maxTurns - 2) {
    const penultimates = {
      planning: `We're nearing the end on "${topic}". Start converging \u2014 what's decided and what's still open?`,
      debate: `Almost done on "${topic}". Start landing your position \u2014 less new ground, more clarity.`,
      retro: `Wrapping up on "${topic}". Name the takeaway before we close.`,
      brainstorm: `Tightening up on "${topic}". Which ideas have legs? Start filtering.`
    };
    return penultimates[format] ?? `Respond to what was just said on "${topic}". We're nearing the end \u2014 start tightening toward a conclusion or clear takeaway.`;
  }
  const midPrompts = {
    debate: `Take a turn in the debate on "${topic}". The previous speaker just made a claim \u2014 engage with it directly: defend it, challenge it, or extend it with a new dimension. Do not restate it or pivot to a different point. One sharp move, then stop.`,
    brainstorm: `Build on what was said about "${topic}" or throw a new idea in. Keep it rapid.`,
    retro: `Reflect on "${topic}". What else happened that hasn't been named yet?`,
    planning: `What's the next concrete step for "${topic}"? Name who owns it.`,
    risk_review: `What risk hasn't been named yet for "${topic}"? Or challenge a risk that was overstated.`,
    writing_room: `Continue drafting on "${topic}". Build on what was written or propose an edit.`,
    cross_exam: `Interrogate what was just said on "${topic}". What assumption is hiding in that argument? What would make it fall apart? Be specific \u2014 name the weak point, then press on it.`,
    strategy: `Push the strategy forward on "${topic}". What tradeoff hasn't been named?`,
    deep_dive: `Go deeper on "${topic}". What structural cause hasn't been traced yet?`,
    watercooler: `Keep chatting about "${topic}". No pressure \u2014 say what comes to mind.`
  };
  return midPrompts[format] ?? `Respond to what was just said on "${topic}". Push the conversation forward \u2014 add something new or challenge something specific. Don't recap.`;
}
function dialoguePrompt(userPrompt, format) {
  if (format === "deep_dive") {
    return `${userPrompt}

${ROUNDTABLE_PLAIN_DIALOGUE_INSTRUCTION}
${ROUNDTABLE_DEEP_DIVE_GROUNDING_INSTRUCTION}`;
  }
  return userPrompt;
}
function initialDialogueTemperature(temperature, format) {
  if (format === "deep_dive") {
    return Math.max(0.4, temperature - 0.2);
  }
  return temperature;
}
function dialogueTrackingContext(format) {
  if (format === "deep_dive") {
    return "roundtable:deep_dive:empty_retry";
  }
  return `roundtable:${format}`;
}
async function loadParticipantContext(participants, topic) {
  const voiceModifiers = /* @__PURE__ */ new Map();
  const scratchpads = /* @__PURE__ */ new Map();
  const briefings = /* @__PURE__ */ new Map();
  const memories = /* @__PURE__ */ new Map();
  for (const participant of participants) {
    try {
      const [mods, scratchpad, briefing, mems] = await Promise.all([
        deriveVoiceModifiers(participant).catch(() => []),
        getScratchpad(participant).catch(() => ""),
        buildBriefing(participant).catch(() => ""),
        queryRelevantMemories(participant, topic, {
          relevantLimit: 3,
          recentLimit: 2
        }).then((m) => m.map((e) => e.content)).catch(() => [])
      ]);
      voiceModifiers.set(participant, mods);
      scratchpads.set(participant, scratchpad);
      briefings.set(participant, briefing);
      memories.set(participant, mems);
    } catch (err) {
      log23.error("Context loading failed", { error: err, participant });
      voiceModifiers.set(participant, []);
      scratchpads.set(participant, "");
      briefings.set(participant, "");
      memories.set(participant, []);
    }
  }
  return { voiceModifiers, scratchpads, briefings, memories };
}
async function orchestrateConversation(session, delayBetweenTurns = true) {
  if (session.format === "voice_chat") {
    return orchestrateVoiceChat(session);
  }
  const format = getFormat(session.format);
  const maxTurns = pickTurnCount(format);
  const history = [];
  const affinityMap = await loadAffinityMap();
  const isUserQuestion = session.source === "user_question";
  const userQuestion = isUserQuestion ? session.metadata?.userQuestion ?? session.topic : null;
  const governanceProposalId = session.metadata?.governance_proposal_id;
  let primeDirective = "";
  try {
    primeDirective = await loadPrimeDirective();
  } catch {
  }
  const rebellionStateMap = /* @__PURE__ */ new Map();
  for (const participant of session.participants) {
    try {
      const rebelling = await isAgentRebelling(participant);
      rebellionStateMap.set(participant, rebelling);
    } catch (err) {
      log23.error("Rebellion check failed (non-fatal)", {
        error: err,
        participant
      });
      rebellionStateMap.set(participant, false);
    }
  }
  const ctx = await loadParticipantContext(session.participants, session.topic);
  const voiceModifiersMap = ctx.voiceModifiers;
  const scratchpadMap = ctx.scratchpads;
  const briefingMap = ctx.briefings;
  const memoryMap = ctx.memories;
  await markSessionRunning(session, `Participants: ${session.participants.join(", ")} | ${maxTurns} turns`);
  let discordWebhookUrl = null;
  try {
    discordWebhookUrl = await postConversationStart(session);
  } catch (err) {
    log23.warn("Discord conversation start failed", {
      error: err.message,
      sessionId: session.id
    });
  }
  let abortReason = null;
  let emptyDialogueCount = 0;
  let emptyDialogueRetryCount = 0;
  const emptyDialogueTurns = [];
  const lastDialogueMap = /* @__PURE__ */ new Map();
  let consecutiveStale = 0;
  for (let turn = 0; turn < maxTurns; turn++) {
    if (turn > 0 && history.length === 0) {
      log23.error("All LLM turns returned empty \u2014 aborting roundtable", {
        sessionId: session.id,
        turnsAttempted: turn
      });
      abortReason = ROUNDTABLE_EMPTY_ABORT_REASON;
      break;
    }
    const speaker = turn === 0 ? selectFirstSpeaker(session.participants, session.format) : selectNextSpeaker({
      participants: session.participants,
      lastSpeaker: history[history.length - 1].speaker,
      history,
      affinityMap,
      format: session.format
    });
    const voice = getVoice(speaker);
    const speakerName = voice?.displayName ?? speaker;
    let interactionType;
    if (turn > 0 && history.length > 0) {
      const lastSpeaker = history[history.length - 1].speaker;
      const affinity = getAffinityFromMap(
        affinityMap,
        speaker,
        lastSpeaker
      );
      interactionType = getInteractionType(affinity);
    }
    const speakerRebelling = rebellionStateMap.get(speaker) ?? false;
    const systemPrompt = buildSystemPrompt({
      speakerId: speaker,
      history,
      format: session.format,
      topic: session.topic,
      interactionType,
      voiceModifiers: voiceModifiersMap.get(speaker),
      primeDirective,
      userQuestionContext: userQuestion ? { question: userQuestion, isFirstSpeaker: turn === 0 } : void 0,
      isRebelling: speakerRebelling,
      scratchpad: scratchpadMap.get(speaker),
      briefing: briefingMap.get(speaker),
      memories: memoryMap.get(speaker),
      governanceVoteInstruction: governanceProposalId ? 'Governance voting rule: in your final turn, include an explicit vote token exactly once as either "APPROVE" or "REJECT".' : void 0
    });
    const userPrompt = buildUserPrompt(
      session.topic,
      turn,
      maxTurns,
      speakerName,
      session.format
    );
    const effectiveTemperature = speakerRebelling ? Math.min(1, format.temperature + 0.1) : format.temperature;
    const primaryTrackingContext = dialogueTrackingContext(session.format);
    let rawDialogue;
    try {
      rawDialogue = await llmGenerate({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: dialoguePrompt(
              userPrompt,
              session.format
            )
          }
        ],
        temperature: initialDialogueTemperature(
          effectiveTemperature,
          session.format
        ),
        maxTokens: format.maxTokensPerTurn,
        trackingContext: {
          agentId: speaker,
          context: primaryTrackingContext,
          sessionId: session.id
        }
      });
    } catch (err) {
      log23.error("LLM failed during conversation", {
        error: err,
        turn,
        speaker: speakerName,
        sessionId: session.id
      });
      abortReason = err.message;
      break;
    }
    let dialogue = sanitizeDialogue(rawDialogue);
    if (!dialogue) {
      emptyDialogueCount++;
      emptyDialogueTurns.push(turn);
      log23.warn(
        history.length === 0 ? "Empty opening dialogue from LLM, retrying with explicit plain-text instruction" : "Empty roundtable dialogue from LLM, retrying with explicit plain-text instruction",
        {
          sessionId: session.id,
          turn,
          speaker: speakerName,
          retryLimit: ROUNDTABLE_EMPTY_TURN_RETRY_LIMIT,
          openingTurn: history.length === 0
        }
      );
      try {
        emptyDialogueRetryCount++;
        const retryDialogue = await llmGenerate({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `${userPrompt}

${ROUNDTABLE_PLAIN_DIALOGUE_INSTRUCTION}`
            }
          ],
          temperature: Math.max(0.4, effectiveTemperature - 0.2),
          maxTokens: format.maxTokensPerTurn,
          trackingContext: {
            agentId: speaker,
            context: `roundtable:${session.format}:empty_retry`,
            sessionId: session.id
          }
        });
        dialogue = sanitizeDialogue(retryDialogue);
        if (!dialogue) {
          emptyDialogueCount++;
          emptyDialogueTurns.push(turn);
        }
      } catch (err) {
        log23.warn("Roundtable empty-dialogue retry failed", {
          error: err.message,
          sessionId: session.id,
          turn,
          speaker: speakerName
        });
      }
    }
    if (!dialogue) {
      log23.warn("Empty dialogue from LLM, skipping turn", {
        sessionId: session.id,
        turn,
        speaker: speakerName,
        emptyDialogueCount,
        emptyDialogueRetryCount
      });
      continue;
    }
    const prevDialogue = lastDialogueMap.get(speaker);
    if (prevDialogue && turn >= format.minTurns) {
      const similarity = wordJaccard(prevDialogue, dialogue);
      if (similarity > REPETITION_SIMILARITY_THRESHOLD) {
        consecutiveStale++;
        if (consecutiveStale >= MAX_CONSECUTIVE_STALE_TURNS) {
          log23.info("Early termination: repetition detected", {
            sessionId: session.id,
            turn,
            speaker,
            similarity: similarity.toFixed(2),
            consecutiveStale
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
    const entry = {
      speaker,
      dialogue,
      turn
    };
    history.push(entry);
    await storeTurnAndEmit(session, entry);
    const useTTS = !!session.metadata?.tts;
    if (discordWebhookUrl) {
      const ttsPromise = useTTS ? synthesizeSpeech({
        agentId: entry.speaker,
        text: entry.dialogue,
        turn
      }).catch((err) => {
        log23.warn("TTS synthesis failed", {
          error: err,
          speaker: entry.speaker,
          turn
        });
        return null;
      }) : Promise.resolve(null);
      const delayPromise = delayBetweenTurns && turn < maxTurns - 1 ? new Promise(
        (resolve) => setTimeout(resolve, TURN_DELAY_BASE_MS + Math.random() * TURN_DELAY_JITTER_MS)
      ) : Promise.resolve();
      const audioResult = await ttsPromise;
      const turnPost = postConversationTurn(
        session,
        entry,
        discordWebhookUrl,
        audioResult
      ).catch(() => {
      });
      if (turn === maxTurns - 1) await turnPost;
      await delayPromise;
    } else {
      if (delayBetweenTurns && turn < maxTurns - 1) {
        const delay = TURN_DELAY_BASE_MS + Math.random() * TURN_DELAY_JITTER_MS;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  await new Promise((resolve) => setTimeout(resolve, POST_CONVERSATION_SETTLE_MS));
  const finalStatus = history.length >= 3 || !abortReason ? "completed" : "failed";
  const roundtableEmptyTurnMetadata = {
    emptyDialogueCount,
    emptyDialogueRetryCount,
    emptyDialogueTurns,
    roundtableEmptyTurnRetryLimit: ROUNDTABLE_EMPTY_TURN_RETRY_LIMIT,
    roundtableRoutingContext: dialogueTrackingContext(session.format)
  };
  if (finalStatus === "failed") {
    await markContentReviewBlockedAfterZeroTurnFailure(session, abortReason);
  }
  await sql`
        UPDATE ops_roundtable_sessions
        SET status = ${finalStatus},
            turn_count = ${history.length},
            completed_at = NOW(),
            metadata = ${jsonb(
    abortReason ? {
      ...session.metadata ?? {},
      abortReason,
      abortedAtTurn: history.length,
      ...roundtableEmptyTurnMetadata
    } : {
      ...session.metadata ?? {},
      ...roundtableEmptyTurnMetadata
    }
  )}
        WHERE id = ${session.id}
    `;
  const speakers = [...new Set(history.map((h) => h.speaker))].join(", ");
  await emitEvent({
    agent_id: "system",
    kind: finalStatus === "completed" ? "conversation_completed" : "conversation_failed",
    title: `${session.format} ${finalStatus}: ${session.topic}`,
    summary: abortReason ? `${history.length} turns (aborted: ${abortReason})` : `${history.length} turns | Speakers: ${speakers}`,
    tags: ["conversation", finalStatus, session.format],
    metadata: {
      sessionId: session.id,
      turnCount: history.length,
      speakers: [...new Set(history.map((h) => h.speaker))],
      ...roundtableEmptyTurnMetadata,
      ...abortReason ? { abortReason } : {}
    }
  });
  if (discordWebhookUrl) {
    postConversationSummary(
      session,
      history,
      finalStatus,
      discordWebhookUrl,
      abortReason ?? void 0
    ).catch(() => {
    });
  }
  await postConversationCleanup(session, history, finalStatus);
  return history;
}
async function orchestrateVoiceChat(session) {
  const format = getFormat(session.format);
  const maxTurns = format.maxTurns;
  const history = [];
  const affinityMap = await loadAffinityMap();
  const userQuestion = session.metadata?.userQuestion ?? session.topic;
  const ctx = await loadParticipantContext(session.participants, session.topic);
  const voiceModifiersMap = ctx.voiceModifiers;
  const scratchpadMap = ctx.scratchpads;
  const briefingMap = ctx.briefings;
  const memoryMap = ctx.memories;
  let primeDirective = "";
  try {
    primeDirective = await loadPrimeDirective();
  } catch {
  }
  await markSessionRunning(session, `Participants: ${session.participants.join(", ")} | live voice session`);
  async function generateAgentTurn(speaker, turnNumber) {
    let interactionType;
    if (history.length > 0) {
      const lastSpeaker = history[history.length - 1].speaker;
      if (lastSpeaker !== "user") {
        const affinity = getAffinityFromMap(
          affinityMap,
          speaker,
          lastSpeaker
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
      memories: memoryMap.get(speaker)
    });
    const userPrompt = turnNumber === 0 ? `A human is asking the room: "${session.topic}". Give a warm, conversational response. Be concise \u2014 this is a live voice chat.` : `Respond naturally to what was just said. Keep it conversational and concise \u2014 this is a live voice chat, not a written essay.`;
    try {
      const rawDialogue = await llmGenerate({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: format.temperature,
        maxTokens: format.maxTokensPerTurn,
        trackingContext: {
          agentId: speaker,
          context: "roundtable:voice_chat",
          sessionId: session.id
        }
      });
      const dialogue = sanitizeDialogue(rawDialogue);
      const entry = {
        speaker,
        dialogue,
        turn: turnNumber
      };
      history.push(entry);
      await storeTurnAndEmit(session, entry);
      return entry;
    } catch (err) {
      log23.error("Voice chat LLM failed", {
        error: err,
        speaker,
        turnNumber,
        sessionId: session.id
      });
      return null;
    }
  }
  async function waitForUserTurn(afterTurn) {
    const deadline = Date.now() + VOICE_INACTIVITY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const rows = await sql`
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
          turnNumber: rows[0].turn_number
        };
      }
      const [{ status }] = await sql`
                SELECT status FROM ops_roundtable_sessions WHERE id = ${session.id}
            `;
      if (status === "completed" || status === "failed") {
        return null;
      }
      await new Promise(
        (resolve) => setTimeout(resolve, VOICE_POLL_INTERVAL_MS)
      );
    }
    return null;
  }
  let currentTurn = 0;
  const openingCount = Math.min(2, session.participants.length);
  const shuffled = [...session.participants].sort(() => Math.random() - 0.5);
  const coordinatorIdx = shuffled.indexOf(format.coordinatorRole);
  if (coordinatorIdx > 0) {
    shuffled.splice(coordinatorIdx, 1);
    shuffled.unshift(format.coordinatorRole);
  }
  for (let i = 0; i < openingCount && currentTurn < maxTurns; i++) {
    const entry = await generateAgentTurn(shuffled[i], currentTurn);
    if (entry) {
      currentTurn++;
      if (i < openingCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, VOICE_OPENING_GAP_MS));
      }
    }
  }
  while (currentTurn < maxTurns) {
    const lastTurnNumber = currentTurn - 1;
    const userTurn = await waitForUserTurn(lastTurnNumber);
    if (!userTurn) {
      log23.info("Voice chat ending: no user reply", {
        sessionId: session.id,
        currentTurn
      });
      break;
    }
    history.push({
      speaker: "user",
      dialogue: userTurn.dialogue,
      turn: userTurn.turnNumber
    });
    currentTurn = userTurn.turnNumber + 1;
    const respondCount = 1 + Math.floor(Math.random() * 2);
    const lastAgentSpeaker = history.filter((h) => h.speaker !== "user").pop()?.speaker;
    const available = session.participants.filter(
      (p) => p !== lastAgentSpeaker
    );
    const responders = available.length > 0 ? available.sort(() => Math.random() - 0.5).slice(0, respondCount) : [
      session.participants[Math.floor(Math.random() * session.participants.length)]
    ];
    for (const responder of responders) {
      if (currentTurn >= maxTurns) break;
      const entry = await generateAgentTurn(responder, currentTurn);
      if (entry) {
        currentTurn++;
        if (responders.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, VOICE_MULTI_RESPONSE_GAP_MS));
        }
      }
    }
  }
  await sql`
        UPDATE ops_roundtable_sessions
        SET status = 'completed', turn_count = ${history.length}, completed_at = NOW()
        WHERE id = ${session.id}
    `;
  await emitEvent({
    agent_id: "system",
    kind: "conversation_completed",
    title: `voice_chat completed: ${session.topic}`,
    summary: `${history.length} turns | live voice session`,
    tags: ["conversation", "completed", "voice_chat"],
    metadata: {
      sessionId: session.id,
      turnCount: history.length,
      speakers: [...new Set(history.map((h) => h.speaker))]
    }
  });
  if (history.length >= 4) {
    try {
      await distillConversationMemories(session.id, history, session.format);
    } catch (err) {
      log23.error("Voice chat memory distillation failed", { error: err, sessionId: session.id });
    }
  }
  return history;
}
async function enqueueConversation(options) {
  const [row] = await sql`
        INSERT INTO ops_roundtable_sessions (format, topic, participants, status, schedule_slot, scheduled_for, source, metadata)
        VALUES (
            ${options.format},
            ${options.topic},
            ${options.participants},
            'pending',
            ${options.scheduleSlot ?? null},
            ${options.scheduledFor ?? (/* @__PURE__ */ new Date()).toISOString()},
            ${options.source ?? null},
            ${jsonb(options.metadata ?? {})}
        )
        RETURNING id
    `;
  return row.id;
}
async function checkScheduleAndEnqueue() {
  const { getSlotsForHour: getSlotsForHour2, shouldSlotFire: shouldSlotFire2 } = await Promise.resolve().then(() => (init_schedule(), schedule_exports));
  const { getPolicy: getPolicy2 } = await Promise.resolve().then(() => (init_policy(), policy_exports));
  const roundtablePolicy = await getPolicy2("roundtable_policy");
  if (!roundtablePolicy.enabled) {
    return { checked: true, enqueued: null };
  }
  const maxDaily = roundtablePolicy.max_daily_conversations ?? 5;
  const todayStart = /* @__PURE__ */ new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [{ count: todayCount }] = await sql`
        SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
        WHERE created_at >= ${todayStart.toISOString()}
    `;
  if (todayCount >= maxDaily) {
    return { checked: true, enqueued: null };
  }
  const currentHour = (/* @__PURE__ */ new Date()).getUTCHours();
  const slots = getSlotsForHour2(currentHour);
  if (slots.length === 0) {
    return { checked: true, enqueued: null };
  }
  const hourStart = /* @__PURE__ */ new Date();
  hourStart.setUTCMinutes(0, 0, 0);
  let lastEnqueued = null;
  for (const slot of slots) {
    const [{ count: currentCount }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
            WHERE created_at >= ${todayStart.toISOString()}
        `;
    if (currentCount >= maxDaily) break;
    const [{ count: existingCount }] = await sql`
            SELECT COUNT(*)::int as count FROM ops_roundtable_sessions
            WHERE schedule_slot = ${slot.name}
            AND created_at >= ${hourStart.toISOString()}
        `;
    if (existingCount > 0) continue;
    if (!shouldSlotFire2(slot)) continue;
    const topic = await generateTopic(slot);
    const sessionId = await enqueueConversation({
      format: slot.format,
      topic,
      participants: slot.participants,
      scheduleSlot: slot.name
    });
    lastEnqueued = sessionId;
  }
  return { checked: true, enqueued: lastEnqueued };
}
async function generateTopic(slot) {
  const pool = TOPIC_POOLS[slot.format] ?? TOPIC_POOLS.standup;
  const cutoff = new Date(Date.now() - 48 * 60 * 6e4).toISOString();
  const recentRows = await sql`
        SELECT topic FROM ops_roundtable_sessions
        WHERE format = ${slot.format}
        AND created_at >= ${cutoff}
    `;
  const recentTopics = new Set(recentRows.map((r) => r.topic));
  const fresh = pool.filter((t) => !recentTopics.has(t));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
var log23, REPETITION_SIMILARITY_THRESHOLD, MAX_CONSECUTIVE_STALE_TURNS, TURN_DELAY_BASE_MS, TURN_DELAY_JITTER_MS, POST_CONVERSATION_SETTLE_MS, ROUNDTABLE_EMPTY_TURN_RETRY_LIMIT, ROUNDTABLE_EMPTY_ABORT_REASON, ROUNDTABLE_PLAIN_DIALOGUE_INSTRUCTION, ROUNDTABLE_DEEP_DIVE_GROUNDING_INSTRUCTION, VOICE_OPENING_GAP_MS, VOICE_MULTI_RESPONSE_GAP_MS, VOICE_POLL_INTERVAL_MS, VOICE_INACTIVITY_TIMEOUT_MS, TOPIC_POOLS;
var init_orchestrator = __esm({
  "src/lib/roundtable/orchestrator.ts"() {
    "use strict";
    init_db();
    init_voices();
    init_formats();
    init_speaker_selection();
    init_llm();
    init_events2();
    init_memory_distiller();
    init_artifact_synthesizer();
    init_agent_proposal_voting();
    init_governance();
    init_debrief();
    init_roundtable();
    init_relationships();
    init_voice_evolution();
    init_prime_directive();
    init_rebellion();
    init_memory();
    init_scratchpad();
    init_situational_briefing();
    init_discord();
    init_elevenlabs();
    init_logger();
    log23 = logger.child({ module: "orchestrator" });
    REPETITION_SIMILARITY_THRESHOLD = 0.6;
    MAX_CONSECUTIVE_STALE_TURNS = 2;
    TURN_DELAY_BASE_MS = 3e3;
    TURN_DELAY_JITTER_MS = 5e3;
    POST_CONVERSATION_SETTLE_MS = 2e3;
    ROUNDTABLE_EMPTY_TURN_RETRY_LIMIT = 1;
    ROUNDTABLE_EMPTY_ABORT_REASON = "All LLM turns returned empty responses";
    ROUNDTABLE_PLAIN_DIALOGUE_INSTRUCTION = "Return 2-4 sentences of plain spoken dialogue only. Do not return tool calls, XML, JSON, empty thinking, or analysis-only output.";
    ROUNDTABLE_DEEP_DIVE_GROUNDING_INSTRUCTION = "Do not invent file paths, function names, metrics, or source-code facts. If no tool evidence is present, frame technical claims as hypotheses to verify, not findings or implementation instructions.";
    VOICE_OPENING_GAP_MS = 2e3;
    VOICE_MULTI_RESPONSE_GAP_MS = 1500;
    VOICE_POLL_INTERVAL_MS = 1500;
    VOICE_INACTIVITY_TIMEOUT_MS = 5 * 6e4;
    TOPIC_POOLS = {
      standup: [
        "What did we ship since last standup? What ships next?",
        "Product progress: what features are done, what is in progress?",
        "What is the one thing that would unblock the most work right now?",
        "Demo time: show something you built or wrote since yesterday.",
        "Sprint check: are we on track to ship the current milestone?"
      ],
      checkin: [
        "Quick wins \u2014 what small thing could we finish in the next hour?",
        "What product feature are you most excited about right now?",
        "Capacity check: who can pick up the next build task?"
      ],
      triage: [
        "We have a product backlog. Prioritize the top 3 features to build next.",
        "Bug reports and user feedback \u2014 what needs fixing before we ship?",
        "Technical debt vs. new features: what ships first?",
        "Which product idea from brainstorming is most viable? Pick one."
      ],
      deep_dive: [
        "Design the database schema for our product. Tables, relations, constraints.",
        "What is the MVP feature set? Name exactly what ships in v1 and what waits.",
        "Architecture decision: monolith or microservices? Pick one and justify.",
        "Design the API endpoints for our core product. REST paths, methods, payloads.",
        "User flow walkthrough: trace a user from signup to first value moment."
      ],
      risk_review: [
        "Security review of our product architecture. What attack surfaces exist?",
        "What happens if we get 10x more users than expected? Where do we break?",
        "Data privacy review: what user data do we collect and how do we protect it?",
        "Dependency audit: what third-party services could take us down?",
        "What is our deployment and rollback strategy?"
      ],
      strategy: [
        "Pick a product to build. We are a collective of AI agents with coding, research, and writing capabilities. What SaaS or tool should we create?",
        "Go-to-market strategy: who is our user, how do they find us, why do they pay?",
        "Competitive analysis: what exists in our space and how do we differentiate?",
        "Revenue model: how does our product make money? Subscription, usage, freemium?",
        "Product roadmap: what ships in week 1, month 1, quarter 1?"
      ],
      planning: [
        "Break the current product spec into GitHub issues with clear acceptance criteria.",
        "Sprint plan: assign features to agents. Who builds what this cycle?",
        "Define the tech stack. Framework, database, hosting, CI/CD. Decide now.",
        "Write the project setup tasks: repo structure, dependencies, config files.",
        'Milestone planning: what is the definition of "v1 shipped"?'
      ],
      shipping: [
        "Pre-launch checklist: what must be done before we can show this to users?",
        "Write the deployment script. How does this go from code to production?",
        "Documentation check: does a new user know how to use this?",
        "Ship it or kill it: is this feature ready? Make the call now."
      ],
      retro: [
        "What did we ship this cycle and what did we learn from building it?",
        "Where did building go faster than expected? Do more of that.",
        "What slowed us down? Remove that blocker for next cycle.",
        "What would we build differently if starting over?",
        "Best artifact of the cycle: which piece of work are we proudest of?"
      ],
      debate: [
        "Build vs. buy: for our next feature, do we code it or integrate an existing tool?",
        "Simplicity vs. features: should v1 do one thing perfectly or many things adequately?",
        "Open source or proprietary? What serves our mission better?",
        "Should we target developers, businesses, or consumers? Pick one audience.",
        "AI-native or traditional: how much should AI be the product vs. the builder?"
      ],
      cross_exam: [
        "Stress-test our product spec. What use case breaks it?",
        "Play the skeptical user: why would someone NOT use our product?",
        "Find the technical bottleneck in our architecture. Where will it fail?",
        "Challenge our pricing model. Is anyone actually willing to pay for this?"
      ],
      brainstorm: [
        "Name 5 SaaS products we could realistically build and ship. Be specific: name, function, target user.",
        "What pain point do developers have that we could solve with a simple tool?",
        "Micro-SaaS ideas: what product could we build and launch in one week?",
        "What if we built a tool that uses AI agents (like us) as a feature? Meta-product ideas.",
        "Combine two boring tools into something new. What unexpected integration would people pay for?",
        "What product would we personally want to use every day?"
      ],
      reframe: [
        "We have been analyzing instead of building. What is the simplest thing we can ship TODAY?",
        "Stop planning. Start coding. What is the first file we need to create?",
        "What if we had to demo a working product in 24 hours? What would we build?",
        "Our product does not need to be perfect. What is the ugly version that works?"
      ],
      writing_room: [
        "Write the README.md for our product. Name, tagline, features, quickstart.",
        "Draft the landing page copy: headline, subhead, 3 feature bullets, CTA.",
        "Write the technical blog post announcing our product launch.",
        "Draft the product documentation: getting started guide for new users.",
        "Write the pitch: 3 sentences that explain what we built and why it matters.",
        "Draft the changelog for our first release. What shipped and why."
      ],
      content_review: [
        "Review our product spec: is it buildable as written? Flag gaps.",
        "Review our README: would a stranger understand what this product does?",
        "Review our API design: is it consistent, intuitive, well-documented?",
        "Code review: does our latest code work? Is it clean enough to ship?"
      ],
      watercooler: [
        "What cool product or tool did you discover recently that inspired you?",
        "If you could mass-produce one product that we build, what would it be and why?",
        "What is the most elegant piece of software you have ever seen? What made it great?",
        "Hot take: the best products are built by small teams. Agree or disagree?",
        "What technology trend will matter most in 6 months?",
        "If we could only ship one thing this month, what should it be?"
      ]
    };
  }
});

// src/lib/roundtable/action-extractor.ts
var action_extractor_exports = {};
__export(action_extractor_exports, {
  DELIBERATED_FORMATS: () => DELIBERATED_FORMATS,
  extractActionsFromArtifact: () => extractActionsFromArtifact
});
async function extractActionsFromArtifact(sessionId, format, artifactText, topic) {
  if (!ACTIONABLE_FORMATS.has(format)) return 0;
  if (!artifactText || artifactText.length < 50) return 0;
  try {
    const result = await llmGenerate({
      messages: [
        {
          role: "system",
          content: 'You extract concrete, executable action items from meeting artifacts. Return ONLY valid JSON \u2014 an array of mission objects. Each mission: { "title": "<imperative action>", "description": "<why this matters>", "owner": "<agent_id>", "steps": [{ "kind": "<step_kind>", "payload": {} }] }\n\nValid step kinds: research_topic, scan_signals, draft_essay, draft_thread, patch_code, audit_system, critique_content, distill_insight, document_lesson, consolidate_memory, content_revision, convene_roundtable, draft_product_spec\nValid agent IDs: praxis, primus, chora, subrosa, thaum, mux\n\nRules:\n- Only extract items that are CONCRETE and ACTIONABLE (not "discuss X" or "think about Y")\n- Each mission should produce a tangible artifact (code, document, analysis)\n- Use patch_code for any code/build tasks\n- Use research_topic for investigation tasks\n- Use draft_essay for writing deliverables\n- If no concrete actions exist, return an empty array []\n- Maximum 3 missions per artifact'
        },
        {
          role: "user",
          content: `Extract actionable missions from this ${format} roundtable artifact.

Topic: ${topic}

${artifactText}`
        }
      ],
      temperature: 0.3,
      maxTokens: 3e3,
      trackingContext: {
        agentId: "system",
        context: "action-extraction"
      }
    });
    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      log32.info("No actions extracted from artifact", {
        sessionId,
        format
      });
      return 0;
    }
    const missions = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(missions) || missions.length === 0) return 0;
    let created = 0;
    for (const mission of missions.slice(0, 3)) {
      if (!mission.title || !mission.steps?.length) continue;
      const validSteps = mission.steps.filter((s) => VALID_STEP_KINDS.has(s.kind)).map((s) => ({
        kind: s.kind,
        payload: s.payload
      }));
      if (validSteps.length === 0) continue;
      const owner = mission.owner ?? "praxis";
      const proposalResult = await createProposalAndMaybeAutoApprove({
        agent_id: owner,
        title: mission.title,
        description: mission.description,
        proposed_steps: validSteps,
        source: "conversation",
        source_trace_id: sessionId
      });
      if (proposalResult.success) {
        created++;
        log32.info("Action extracted from roundtable artifact", {
          sessionId,
          format,
          proposalId: proposalResult.proposalId,
          missionId: proposalResult.missionId,
          title: mission.title,
          autoApproved: !!proposalResult.missionId
        });
      }
    }
    return created;
  } catch (err) {
    log32.error("Action extraction failed", {
      error: err,
      sessionId,
      format
    });
    return 0;
  }
}
var log32, ACTIONABLE_FORMATS, DELIBERATED_FORMATS, VALID_STEP_KINDS;
var init_action_extractor = __esm({
  "src/lib/roundtable/action-extractor.ts"() {
    "use strict";
    init_client();
    init_proposal_service();
    init_logger();
    log32 = logger.child({ module: "action-extractor" });
    ACTIONABLE_FORMATS = /* @__PURE__ */ new Set([
      "planning",
      "strategy",
      "retro",
      "standup",
      "shipping",
      "triage",
      "brainstorm",
      "deep_dive",
      "risk_review",
      "debate"
    ]);
    DELIBERATED_FORMATS = /* @__PURE__ */ new Set([
      "planning",
      "shipping",
      "strategy"
    ]);
    VALID_STEP_KINDS = /* @__PURE__ */ new Set([
      "research_topic",
      "scan_signals",
      "draft_essay",
      "draft_thread",
      "patch_code",
      "audit_system",
      "critique_content",
      "distill_insight",
      "document_lesson",
      "consolidate_memory",
      "content_revision",
      "convene_roundtable",
      "draft_product_spec"
    ]);
  }
});

// src/lib/ops/content-pipeline.ts
var content_pipeline_exports = {};
__export(content_pipeline_exports, {
  extractContentFromSession: () => extractContentFromSession,
  processReviewSession: () => processReviewSession
});
function extractVerdict(text) {
  const upper = text.toUpperCase();
  const hasApprove = upper.includes("APPROVE") && !upper.includes("NOT APPROVE") && !upper.includes("DON'T APPROVE");
  const hasReject = upper.includes("REJECT");
  const hasRevise = upper.includes("REVIS") || upper.includes("NEEDS WORK") || upper.includes("REWORK");
  if (hasApprove && !hasReject && !hasRevise) return "approve";
  if (hasReject && !hasApprove) return "reject";
  if (hasRevise) return "mixed";
  if (hasApprove && hasReject) return "mixed";
  return null;
}
function buildReviewReadyDraftBody(args) {
  const header = [
    "---",
    `artifact_id: content-draft-${args.sourceSessionId}`,
    `source_session: ${args.sourceSessionId}`,
    "version: v01",
    "audience: review board",
    "publish_target: content pipeline",
    `content_type: ${args.contentType}`,
    `title: ${JSON.stringify(args.title)}`,
    "reviewer_ask: Review for factual grounding, usefulness, publication readiness, and required revisions.",
    "---",
    ""
  ].join("\n");
  return `${header}${args.body}`.slice(0, MAX_BODY_LENGTH);
}
async function extractContentFromSession(sessionId) {
  const [existing] = await sql`
        SELECT id FROM ops_content_drafts WHERE source_session_id = ${sessionId} LIMIT 1
    `;
  if (existing) {
    log33.info("Draft already exists for session, skipping", {
      sessionId,
      draftId: existing.id
    });
    return null;
  }
  const [session] = await sql`
        SELECT format, participants, topic FROM ops_roundtable_sessions WHERE id = ${sessionId}
    `;
  if (!session) {
    log33.warn("Session not found", { sessionId });
    return null;
  }
  const turns = await sql`
        SELECT speaker, dialogue, turn_number
        FROM ops_roundtable_turns
        WHERE session_id = ${sessionId}
        ORDER BY turn_number ASC
    `;
  if (turns.length === 0) {
    log33.warn("No turns found for session", { sessionId });
    return null;
  }
  const CONTENT_THRESHOLD = 120;
  const focusedTranscript = turns.map((t) => {
    if (t.dialogue.length >= CONTENT_THRESHOLD) {
      return `[${t.speaker}]: ${t.dialogue}`;
    }
    return `[${t.speaker}]: ${t.dialogue.slice(0, 80)}`;
  }).join("\n\n");
  const extractionPrompt = `You are analyzing a creative writing session transcript. Extract the creative content that was produced during this session.

Session topic: ${session.topic}
Participants: ${session.participants.join(", ")}

TRANSCRIPT:
${focusedTranscript}

INSTRUCTIONS:
1. Separate the actual creative work (the content being written) from the meta-discussion about the work
2. If multiple pieces of creative content exist, extract the primary/most complete one
3. Determine the content type based on the form and structure

Respond ONLY with valid JSON (no markdown fencing):
{
    "title": "Title of the creative work",
    "body": "The full creative content text",
    "contentType": "essay|thread|statement|poem|manifesto",
    "hasContent": true
}

If no extractable creative content exists, respond with:
{ "hasContent": false }`;
  try {
    const result = await llmGenerate({
      messages: [
        {
          role: "system",
          content: "You are a content extraction engine. Output only valid JSON."
        },
        { role: "user", content: extractionPrompt }
      ],
      temperature: 0.3,
      maxTokens: 8e3,
      trackingContext: {
        context: "content_extraction"
      }
    });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log33.warn("No JSON found in extraction result", { sessionId });
      return null;
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      log33.warn("Invalid JSON in extraction result", {
        sessionId,
        error: parseErr
      });
      return null;
    }
    if (!parsed.hasContent || !parsed.title || !parsed.body) {
      log33.info("No extractable content found", { sessionId });
      return null;
    }
    if (typeof parsed.title !== "string" || typeof parsed.body !== "string") {
      log33.warn("Title or body not strings, rejecting", {
        sessionId,
        titleType: typeof parsed.title,
        bodyType: typeof parsed.body
      });
      return null;
    }
    if (parsed.title.length > MAX_TITLE_LENGTH) {
      log33.warn("Title too long, truncating", { sessionId });
      parsed.title = parsed.title.slice(0, MAX_TITLE_LENGTH);
    }
    if (parsed.body.length > MAX_BODY_LENGTH) {
      log33.warn("Body too long, truncating", { sessionId });
      parsed.body = parsed.body.slice(0, MAX_BODY_LENGTH);
    }
    const validTypes = [
      "essay",
      "thread",
      "statement",
      "poem",
      "manifesto",
      "briefing",
      "report",
      "review",
      "digest",
      "plan"
    ];
    const contentType = validTypes.includes(parsed.contentType) ? parsed.contentType : "essay";
    const authorAgent = session.participants[0] ?? "mux";
    const reviewReadyBody = buildReviewReadyDraftBody({
      body: parsed.body,
      sourceSessionId: sessionId,
      contentType,
      title: parsed.title
    });
    const [draft] = await sql`
            INSERT INTO ops_content_drafts (
                author_agent, content_type, title, body, status,
                source_session_id, metadata
            ) VALUES (
                ${authorAgent},
                ${contentType},
                ${parsed.title},
                ${reviewReadyBody},
                'draft',
                ${sessionId},
                ${jsonb({ extractedFrom: "writing_room", topic: session.topic })}
            )
            RETURNING id
        `;
    log33.info("Content draft created", {
      draftId: draft.id,
      sessionId,
      contentType,
      author: authorAgent,
      titlePreview: parsed.title.slice(0, 60)
    });
    await emitEvent({
      agent_id: authorAgent,
      kind: "content_draft_created",
      title: `Content draft created: ${parsed.title}`,
      summary: `${contentType} by ${authorAgent} extracted from writing_room session`,
      tags: ["content", "draft", contentType],
      metadata: {
        draftId: draft.id,
        sessionId,
        contentType,
        titlePreview: parsed.title.slice(0, 100)
      }
    });
    return draft.id;
  } catch (err) {
    log33.error("Content extraction failed", {
      error: err,
      sessionId
    });
    return null;
  }
}
async function processReviewSession(sessionId) {
  const [draft] = await sql`
        SELECT * FROM ops_content_drafts WHERE review_session_id = ${sessionId} LIMIT 1
    `;
  if (!draft) {
    const [session] = await sql`
            SELECT metadata FROM ops_roundtable_sessions WHERE id = ${sessionId}
        `;
    const draftId = typeof session?.metadata?.draft_id === "string" ? session.metadata.draft_id : void 0;
    if (!draftId) {
      log33.warn("No draft linked to review session", { sessionId });
      return;
    }
    const [draftById] = await sql`
            SELECT * FROM ops_content_drafts WHERE id = ${draftId} LIMIT 1
        `;
    if (!draftById) {
      log33.warn("Draft not found for review session", {
        sessionId,
        draftId
      });
      return;
    }
    log33.info("Found draft via metadata lookup", {
      sessionId,
      draftId
    });
    return processReviewForDraft(draftById, sessionId);
  }
  return processReviewForDraft(draft, sessionId);
}
async function processReviewForDraft(draft, sessionId) {
  const turns = await sql`
        SELECT speaker, dialogue, turn_number
        FROM ops_roundtable_turns
        WHERE session_id = ${sessionId}
        ORDER BY turn_number ASC
    `;
  if (turns.length === 0) {
    log33.warn("No turns found for review session", { sessionId });
    return;
  }
  const reviewerTurns = /* @__PURE__ */ new Map();
  for (const t of turns) {
    reviewerTurns.set(t.speaker, t.dialogue);
  }
  const keywordNotes = [];
  for (const [reviewer, dialogue] of reviewerTurns) {
    const verdict = extractVerdict(dialogue);
    if (verdict) {
      keywordNotes.push({
        reviewer,
        verdict,
        notes: dialogue.slice(-200).trim()
      });
    }
  }
  if (keywordNotes.length > 0 && keywordNotes.length >= reviewerTurns.size - 1) {
    const approvals = keywordNotes.filter(
      (n) => n.verdict === "approve"
    ).length;
    const rejections = keywordNotes.filter(
      (n) => n.verdict === "reject"
    ).length;
    const consensus = approvals > rejections && approvals >= keywordNotes.length / 2 ? "approved" : rejections > approvals ? "rejected" : "mixed";
    const summary = `${approvals} approve, ${rejections} reject out of ${keywordNotes.length} reviewers (keyword extraction)`;
    await applyReviewResult(
      draft,
      sessionId,
      keywordNotes,
      consensus,
      summary
    );
    return;
  }
  const transcript = turns.map((t) => `[${t.speaker}]: ${t.dialogue}`).join("\n\n");
  const reviewPrompt = `You are analyzing a content review session where agents reviewed a piece of creative writing.

CONTENT BEING REVIEWED:
Title: ${draft.title}
Type: ${draft.content_type}
Author: ${draft.author_agent}

REVIEW TRANSCRIPT:
${transcript}

INSTRUCTIONS:
Summarize each reviewer's verdict and reasoning. Determine the overall consensus.

Respond ONLY with valid JSON (no markdown fencing):
{
    "reviewers": [
        { "reviewer": "agent_name", "verdict": "approve|reject|mixed", "notes": "brief reasoning" }
    ],
    "consensus": "approved|rejected|mixed",
    "summary": "overall review summary"
}`;
  try {
    const result = await llmGenerate({
      messages: [
        {
          role: "system",
          content: "You are a review consensus analyzer. Output only valid JSON."
        },
        { role: "user", content: reviewPrompt }
      ],
      temperature: 0.2,
      maxTokens: 4e3,
      trackingContext: {
        context: "content_review"
      }
    });
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log33.warn("No JSON found in review result", { sessionId });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      log33.warn("Invalid JSON in review result", {
        sessionId,
        draftId: draft.id,
        error: parseErr
      });
      return;
    }
    const reviewerNotes = parsed.reviewers ?? [];
    const consensus = parsed.consensus ?? "mixed";
    const summary = parsed.summary ?? "";
    await applyReviewResult(
      draft,
      sessionId,
      reviewerNotes,
      consensus,
      summary
    );
  } catch (err) {
    log33.error("Review processing failed", {
      error: err,
      sessionId,
      draftId: draft.id
    });
  }
}
async function applyReviewResult(draft, sessionId, reviewerNotes, consensus, summary) {
  if (consensus === "approved") {
    const updated = await sql.begin(async (tx) => {
      const db = tx;
      const [current] = await db`
                SELECT id FROM ops_content_drafts
                WHERE id = ${draft.id}
                  AND status = 'review'
                  AND review_session_id = ${sessionId}
                FOR UPDATE
            `;
      if (!current) return false;
      await createOrUpdateReviewPacket(
        {
          subjectType: "content_draft",
          subjectId: draft.id,
          status: "approved",
          requestedBy: draft.author_agent,
          title: draft.title,
          summary: summary || "Approved by reviewer consensus",
          packet: {
            draftId: draft.id,
            author_agent: draft.author_agent,
            content_type: draft.content_type,
            previous_status: "review",
            requested_status: "approved",
            review_session_id: sessionId,
            reviewer_count: reviewerNotes.length,
            updated_by: "content-pipeline"
          },
          decision: {
            outcome: "approved",
            decidedBy: "reviewer_consensus",
            reviewerNotes
          }
        },
        db
      );
      await db`
                UPDATE ops_content_drafts
                SET status = 'approved',
                    reviewer_notes = ${jsonb(reviewerNotes)},
                    updated_at = NOW()
                WHERE id = ${draft.id}
            `;
      return true;
    });
    if (!updated) {
      log33.warn("Skipping stale approval result", {
        draftId: draft.id,
        reviewSessionId: sessionId
      });
      return;
    }
    await emitEventAndCheckReactions({
      agent_id: draft.author_agent,
      kind: "content_approved",
      title: `Content approved: ${draft.title}`,
      summary: summary || "Approved by reviewer consensus",
      tags: ["content", "approved", draft.content_type],
      metadata: {
        draftId: draft.id,
        reviewSessionId: sessionId,
        reviewerCount: reviewerNotes.length
      }
    });
    log33.info("Draft approved", {
      draftId: draft.id,
      reviewers: reviewerNotes.length
    });
  } else if (consensus === "rejected") {
    const updated = await sql.begin(async (tx) => {
      const db = tx;
      const [current] = await db`
                SELECT id FROM ops_content_drafts
                WHERE id = ${draft.id}
                  AND status = 'review'
                  AND review_session_id = ${sessionId}
                FOR UPDATE
            `;
      if (!current) return false;
      await createOrUpdateReviewPacket(
        {
          subjectType: "content_draft",
          subjectId: draft.id,
          status: "rejected",
          requestedBy: draft.author_agent,
          title: draft.title,
          summary: summary || "Rejected by reviewer consensus",
          packet: {
            draftId: draft.id,
            author_agent: draft.author_agent,
            content_type: draft.content_type,
            previous_status: "review",
            requested_status: "rejected",
            review_session_id: sessionId,
            reviewer_count: reviewerNotes.length,
            updated_by: "content-pipeline"
          },
          decision: {
            outcome: "rejected",
            decidedBy: "reviewer_consensus",
            reviewerNotes
          }
        },
        db
      );
      await db`
                UPDATE ops_content_drafts
                SET status = 'rejected',
                    reviewer_notes = ${jsonb(reviewerNotes)},
                    updated_at = NOW()
                WHERE id = ${draft.id}
            `;
      return true;
    });
    if (!updated) {
      log33.warn("Skipping stale rejection result", {
        draftId: draft.id,
        reviewSessionId: sessionId
      });
      return;
    }
    await emitEventAndCheckReactions({
      agent_id: draft.author_agent,
      kind: "content_rejected",
      title: `Content rejected: ${draft.title}`,
      summary: summary || "Rejected by reviewer consensus",
      tags: ["content", "rejected", draft.content_type],
      metadata: {
        draftId: draft.id,
        reviewSessionId: sessionId,
        reviewerCount: reviewerNotes.length
      }
    });
    log33.info("Draft rejected", {
      draftId: draft.id,
      reviewers: reviewerNotes.length
    });
    await requestContentRevision(draft, reviewerNotes, summary);
  } else {
    const updated = await sql.begin(async (tx) => {
      const db = tx;
      const [current] = await db`
                SELECT id FROM ops_content_drafts
                WHERE id = ${draft.id}
                  AND status = 'review'
                  AND review_session_id = ${sessionId}
                FOR UPDATE
            `;
      if (!current) return false;
      await createOrUpdateReviewPacket(
        {
          subjectType: "content_draft",
          subjectId: draft.id,
          status: "awaiting_review",
          requestedBy: draft.author_agent,
          title: draft.title,
          summary: summary || "Reviewer consensus inconclusive",
          packet: {
            draftId: draft.id,
            author_agent: draft.author_agent,
            content_type: draft.content_type,
            previous_status: "review",
            requested_status: "review",
            review_session_id: sessionId,
            reviewer_count: reviewerNotes.length,
            consensus,
            updated_by: "content-pipeline"
          }
        },
        db
      );
      await db`
                UPDATE ops_content_drafts
                SET reviewer_notes = ${jsonb(reviewerNotes)},
                    updated_at = NOW()
                WHERE id = ${draft.id}
            `;
      return true;
    });
    if (!updated) {
      log33.warn("Skipping stale mixed review result", {
        draftId: draft.id,
        reviewSessionId: sessionId,
        consensus
      });
      return;
    }
    log33.info("Draft review inconclusive, staying in review", {
      draftId: draft.id,
      consensus
    });
    await requestContentRevision(draft, reviewerNotes, summary);
  }
}
async function requestContentRevision(draft, reviewerNotes, reviewSummary) {
  const notesText = reviewerNotes.map((n) => `${n.reviewer} (${n.verdict}): ${n.notes}`).join("\n");
  try {
    const result = await createProposalAndMaybeAutoApprove({
      agent_id: draft.author_agent,
      title: `Revise: ${draft.title}`,
      description: `Content review returned feedback. Revise and resubmit.

Summary: ${reviewSummary}`,
      proposed_steps: [
        {
          kind: "content_revision",
          assigned_agent: draft.author_agent,
          payload: {
            draft_id: draft.id,
            original_title: draft.title,
            content_type: draft.content_type,
            reviewer_notes: notesText,
            review_summary: reviewSummary
          }
        }
      ],
      source: "system",
      source_trace_id: `content-revision:${draft.id}:${draft.review_session_id ?? "no-review"}`
    });
    if (result.success) {
      log33.info(
        result.replayed ? "Content revision proposal already exists" : "Content revision proposal created",
        {
          draftId: draft.id,
          proposalId: result.proposalId
        }
      );
    } else {
      log33.warn("Content revision proposal rejected", {
        draftId: draft.id,
        reason: result.reason
      });
    }
  } catch (err) {
    log33.error("Failed to create content revision proposal", {
      error: err,
      draftId: draft.id
    });
  }
}
var log33, MAX_TITLE_LENGTH, MAX_BODY_LENGTH;
var init_content_pipeline = __esm({
  "src/lib/ops/content-pipeline.ts"() {
    "use strict";
    init_db();
    init_client();
    init_events2();
    init_proposal_service();
    init_review_packets();
    init_logger();
    log33 = logger.child({ module: "content-pipeline" });
    MAX_TITLE_LENGTH = 500;
    MAX_BODY_LENGTH = 5e4;
  }
});

// src/lib/ops/execution-evidence.ts
var execution_evidence_exports = {};
__export(execution_evidence_exports, {
  blockerClassForOutcome: () => blockerClassForOutcome,
  recordExecutionEvidence: () => recordExecutionEvidence
});
function normalizeArtifactPaths(paths) {
  return [...new Set((paths ?? []).filter((path4) => path4.trim().length > 0))];
}
function defaultAcceptanceResults(criteria, outcome) {
  return criteria.map((criterion) => ({
    criterion,
    status: outcome === "dispatched" ? "pending" : "not_verified",
    note: outcome === "succeeded" ? "Session succeeded, but acceptance criteria require explicit validator evidence before being marked passed." : void 0
  }));
}
function blockerClassForOutcome(outcome, reason) {
  if (outcome === "succeeded" || outcome === "dispatched") return null;
  const normalized = (reason ?? "").toLowerCase();
  if (normalized.includes("veto")) return "veto";
  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "timeout";
  }
  if (normalized.includes("blocked")) return "agent_blocked";
  if (normalized.includes("contract") || normalized.includes("approval")) {
    return "approval_boundary";
  }
  if (normalized.includes("tool") || normalized.includes("file") || normalized.includes("bash")) {
    return "tooling";
  }
  return outcome;
}
async function recordExecutionEvidence(input) {
  const [attempt] = await sql`
        SELECT COUNT(*)::int AS retry_count
        FROM ops_mission_step_execution_evidence
        WHERE step_id = ${input.stepId}
          AND outcome IN ('dispatched', 'failed', 'blocked')
    `;
  const acceptanceCriteria = input.contractStep.acceptanceCriteria;
  const acceptanceResults = input.acceptanceResults ?? defaultAcceptanceResults(acceptanceCriteria, input.outcome);
  await sql`
        INSERT INTO ops_mission_step_execution_evidence (
            mission_id,
            step_id,
            contract_hash,
            contract_step_index,
            step_hash,
            step_kind,
            outcome,
            acceptance_criteria,
            acceptance_results,
            blocker_class,
            retry_count,
            artifact_paths,
            evidence,
            recorded_by
        ) VALUES (
            ${input.missionId},
            ${input.stepId},
            ${input.contract.contractHash},
            ${input.contractStep.index},
            ${input.contractStep.stepHash},
            ${input.contractStep.kind},
            ${input.outcome},
            ${jsonb(acceptanceCriteria)},
            ${jsonb(acceptanceResults)},
            ${input.blockerClass ?? null},
            ${attempt?.retry_count ?? 0},
            ${normalizeArtifactPaths(input.artifactPaths)},
            ${jsonb(input.evidence ?? {})},
            ${input.recordedBy ?? null}
        )
    `;
}
var init_execution_evidence = __esm({
  "src/lib/ops/execution-evidence.ts"() {
    "use strict";
    init_db();
  }
});

// src/lib/ops/memory-archaeology.ts
var memory_archaeology_exports = {};
__export(memory_archaeology_exports, {
  getDigHistory: () => getDigHistory,
  getFindings: () => getFindings,
  getFindingsForMemory: () => getFindingsForMemory,
  getLastDigTimestamp: () => getLastDigTimestamp,
  getLatestFindings: () => getLatestFindings,
  performDig: () => performDig
});
async function performDig(config) {
  const digId = import_crypto5.default.randomUUID();
  const agentId = config.agent_id ?? "system";
  const maxMemories = config.max_memories ?? DEFAULT_MAX_MEMORIES;
  log34.info("Starting archaeological dig", { digId, agentId, maxMemories });
  const memories = await fetchMemoriesForDig(config, maxMemories);
  if (memories.length < 3) {
    log34.info("Not enough memories for archaeology", {
      digId,
      available: memories.length
    });
    return {
      dig_id: digId,
      agent_id: agentId,
      findings: [],
      memories_analyzed: 0
    };
  }
  const batches = [];
  for (let i = 0; i < memories.length; i += MEMORIES_PER_BATCH) {
    batches.push(memories.slice(i, i + MEMORIES_PER_BATCH));
  }
  const allFindings = [];
  for (const batch of batches) {
    const findings = await analyzeBatch(
      batch,
      agentId,
      config.finding_types
    );
    allFindings.push(...findings);
  }
  const timestamps = memories.map((m) => new Date(m.created_at).getTime());
  const timeSpan = {
    from: new Date(Math.min(...timestamps)).toISOString(),
    to: new Date(Math.max(...timestamps)).toISOString()
  };
  for (const finding of allFindings) {
    await sql`
            INSERT INTO ops_memory_archaeology
                (dig_id, agent_id, finding_type, title, description, evidence, confidence, time_span, related_agents, metadata)
            VALUES (
                ${digId},
                ${agentId},
                ${finding.finding_type},
                ${finding.title},
                ${finding.description},
                ${jsonb(finding.evidence)},
                ${finding.confidence},
                ${jsonb(timeSpan)},
                ${finding.related_agents},
                ${jsonb({})}
            )
        `;
  }
  await emitEvent({
    agent_id: agentId,
    kind: "memory_archaeology_complete",
    title: `${agentId} completed archaeological dig`,
    summary: `Found ${allFindings.length} findings across ${memories.length} memories`,
    tags: ["archaeology", "memory-analysis"],
    metadata: {
      dig_id: digId,
      finding_count: allFindings.length,
      memories_analyzed: memories.length,
      finding_types: [...new Set(allFindings.map((f) => f.finding_type))]
    }
  });
  log34.info("Archaeological dig completed", {
    digId,
    agentId,
    findingCount: allFindings.length,
    memoriesAnalyzed: memories.length
  });
  return {
    dig_id: digId,
    agent_id: agentId,
    findings: allFindings,
    memories_analyzed: memories.length
  };
}
async function fetchMemoriesForDig(config, maxMemories) {
  const { agent_id, time_range } = config;
  return sql`
        SELECT
            id,
            agent_id,
            type,
            CASE
                WHEN LENGTH(content) > 500 THEN LEFT(content, 500) || '...[truncated]'
                ELSE content
            END as content,
            confidence,
            tags,
            created_at
        FROM ops_agent_memory
        WHERE superseded_by IS NULL
        ${agent_id ? sql`AND agent_id = ${agent_id}` : sql``}
        ${time_range?.from ? sql`AND created_at >= ${time_range.from.toISOString()}` : sql``}
        ${time_range?.to ? sql`AND created_at <= ${time_range.to.toISOString()}` : sql``}
        ORDER BY created_at DESC
        LIMIT ${maxMemories}
    `;
}
async function analyzeBatch(memories, agentId, findingTypes) {
  const typesLabel = findingTypes?.length ? findingTypes.join(", ") : "pattern, contradiction, emergence, echo, drift";
  const memorySummary = memories.map(
    (m, i) => `[${i + 1}] Agent: ${m.agent_id} | Type: ${m.type} | Confidence: ${m.confidence} | Tags: ${m.tags.join(", ") || "none"} | Date: ${new Date(m.created_at).toISOString().slice(0, 10)}
${m.content}`
  ).join("\n\n");
  const estimatedInputTokens = Math.ceil(
    memorySummary.length / CHARS_PER_TOKEN_ESTIMATE
  );
  if (estimatedInputTokens > TOKEN_WARNING_THRESHOLD) {
    log34.warn("High token count in archaeology batch", {
      agentId,
      estimatedInputTokens,
      memoryCount: memories.length,
      recommendation: "Consider reducing batch size"
    });
  }
  const systemPrompt = `You are a memory archaeologist analyzing agent memories for: ${typesLabel}.

Types: pattern (recurring themes), contradiction (conflicting memories), emergence (new behaviors), echo (reappearing phrases), drift (perspective shifts).

Respond with valid JSON:
{
  "findings": [
    {
      "finding_type": "pattern|contradiction|emergence|echo|drift",
      "title": "5-10 word title",
      "description": "2-3 sentence explanation",
      "evidence": [
        { "memory_index": 1, "relevance": "why this supports the finding" }
      ],
      "confidence": 0.8,
      "related_agents": ["agent_id"]
    }
  ]
}

Rules:
- Top 3-5 findings only, each referencing at least 2 memories
- Be specific. If nothing meaningful, return { "findings": [] }
- CRITICAL: Complete, valid JSON. Max 5 findings.`;
  const result = await llmGenerate({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Analyze these ${memories.length} memories for archaeological findings:

${memorySummary}`
      }
    ],
    temperature: ANALYSIS_TEMPERATURE,
    maxTokens: ANALYSIS_MAX_TOKENS,
    trackingContext: {
      agentId,
      context: "memory_archaeology"
    }
  });
  if (!result?.trim()) {
    log34.warn("Archaeology analysis returned empty", { agentId });
    return [];
  }
  try {
    let jsonStr = result.match(/\{[\s\S]*\}/)?.[0];
    if (!jsonStr) {
      const openBrace = result.indexOf("{");
      if (openBrace >= 0) {
        jsonStr = result.slice(openBrace);
        const lastCompleteObj = jsonStr.lastIndexOf("}");
        if (lastCompleteObj > 0) {
          jsonStr = jsonStr.slice(0, lastCompleteObj + 1) + "]}";
        }
        log34.info("Attempting truncated JSON recovery", {
          originalLength: result.length,
          recoveredLength: jsonStr.length
        });
      } else {
        log34.warn("No JSON found in archaeology response", {
          responsePreview: result.slice(0, 200)
        });
        return [];
      }
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed.findings || !Array.isArray(parsed.findings)) {
      log34.warn("Invalid JSON structure in archaeology response", {
        hasFindings: !!parsed.findings,
        isArray: Array.isArray(parsed.findings),
        keys: Object.keys(parsed)
      });
      return [];
    }
    const validTypes = /* @__PURE__ */ new Set([
      "pattern",
      "contradiction",
      "emergence",
      "echo",
      "drift"
    ]);
    return parsed.findings.filter(
      (f) => validTypes.has(f.finding_type) && f.title && f.description
    ).map((f) => {
      const evidenceWithWarnings = (f.evidence ?? []).map((e) => {
        const memory = memories[e.memory_index - 1];
        if (!memory) {
          log34.warn(
            "LLM referenced invalid memory_index in evidence",
            {
              memory_index: e.memory_index,
              available_count: memories.length,
              finding_title: f.title
            }
          );
        }
        return {
          memory_id: memory?.id ?? "unknown",
          excerpt: "",
          relevance: e.relevance ?? ""
        };
      }).filter((e) => e.memory_id !== "unknown");
      if (f.evidence?.length > 0 && evidenceWithWarnings.length === 0) {
        log34.warn(
          "All evidence filtered due to invalid memory indices",
          {
            finding_title: f.title,
            evidence_count: f.evidence.length
          }
        );
      }
      return {
        finding_type: f.finding_type,
        title: f.title,
        description: f.description,
        evidence: evidenceWithWarnings,
        confidence: Math.max(0, Math.min(1, f.confidence ?? 0.5)),
        related_agents: f.related_agents ?? []
      };
    });
  } catch (err) {
    log34.error("Failed to parse archaeology findings", {
      error: err.message,
      responseLength: result.length,
      responsePreview: result.slice(0, 300),
      responseTail: result.slice(-200)
    });
    return [];
  }
}
async function getDigHistory(limit = 20) {
  return sql`
        SELECT
            dig_id,
            agent_id,
            COUNT(*)::int as finding_count,
            array_agg(DISTINCT finding_type) as finding_types,
            MIN(created_at) as started_at
        FROM ops_memory_archaeology
        GROUP BY dig_id, agent_id
        ORDER BY MIN(created_at) DESC
        LIMIT ${limit}
    `;
}
async function getFindings(digId) {
  return sql`
        SELECT * FROM ops_memory_archaeology
        WHERE dig_id = ${digId}
        ORDER BY confidence DESC
    `;
}
async function getLatestFindings(limit = 10) {
  return sql`
        SELECT * FROM ops_memory_archaeology
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}
async function getFindingsForMemory(memoryId) {
  return sql`
        SELECT * FROM ops_memory_archaeology
        WHERE evidence @> ${jsonb([{ memory_id: memoryId }])}
        ORDER BY confidence DESC
    `;
}
async function getLastDigTimestamp() {
  const [row] = await sql`
        SELECT MAX(created_at) as latest FROM ops_memory_archaeology
    `;
  return row?.latest ? new Date(row.latest) : null;
}
var import_crypto5, log34, DEFAULT_MAX_MEMORIES, MEMORIES_PER_BATCH, ANALYSIS_TEMPERATURE, ANALYSIS_MAX_TOKENS, CHARS_PER_TOKEN_ESTIMATE, TOKEN_WARNING_THRESHOLD;
var init_memory_archaeology = __esm({
  "src/lib/ops/memory-archaeology.ts"() {
    "use strict";
    init_db();
    init_client();
    init_events2();
    init_logger();
    import_crypto5 = __toESM(require("crypto"));
    log34 = logger.child({ module: "memory-archaeology" });
    DEFAULT_MAX_MEMORIES = 100;
    MEMORIES_PER_BATCH = 15;
    ANALYSIS_TEMPERATURE = 0.7;
    ANALYSIS_MAX_TOKENS = 4e3;
    CHARS_PER_TOKEN_ESTIMATE = 4;
    TOKEN_WARNING_THRESHOLD = 8e3;
  }
});

// src/lib/ops/step-prompts.ts
var step_prompts_exports = {};
__export(step_prompts_exports, {
  buildStepPrompt: () => buildStepPrompt,
  loadStepTemplate: () => loadStepTemplate
});
function agentCanWrite(agentId) {
  return WORKSPACE_WRITER_AGENTS.has(agentId) || agentId.startsWith("droid-");
}
function agentCanUseShell(agentId) {
  return SHELL_AGENTS.has(agentId);
}
function completionContract(kind, agentId) {
  if (!agentCanWrite(agentId) && needsArtifactGrounding(kind)) {
    return `Completion contract: this agent cannot publish workspace artifacts directly. You MUST use send_to_agent with target_agent "praxis" to hand off a complete artifact draft, sources, and requested output path; optionally use memory_write for a short durable summary. Do not claim publication yourself.
`;
  }
  if (kind === "audit_system" && !agentCanUseShell(agentId)) {
    return `Completion contract: this agent cannot run shell checks directly. You MUST use send_to_agent with target_agent "praxis" to request an evidence-bearing audit, including claims to verify and any source paths already inspected. Do not claim audit completion yourself.
`;
  }
  if (!agentCanWrite(agentId) && (kind === "research_topic" || kind === "scan_signals")) {
    return `Completion contract: you MUST call web_search successfully, use web_fetch for the strongest sources when URLs are available, and use send_to_agent with target_agent "praxis" to hand off findings, source URLs, and a requested report path; optionally use memory_write for a short durable summary.
`;
  }
  return STEP_COMPLETION_CONTRACTS[kind] ?? "";
}
function adaptBodyForAgentTools(kind, agentId, body) {
  let adapted = body;
  if (!agentCanWrite(agentId)) {
    adapted = adapted.split("\n").filter((line) => !/file_write|Write .*\bto\b|write .*\bto\b|Include YAML front matter/i.test(line)).join("\n");
    if (kind === "research_topic" || kind === "scan_signals") {
      adapted += `Use send_to_agent to send Praxis a concise handoff with findings, source URLs, quotes, and recommended report path.
`;
    } else if (needsArtifactGrounding(kind)) {
      adapted += `Use send_to_agent to send Praxis the complete draft/revision/critique plus its sources and requested output path.
`;
    }
  }
  if (kind === "audit_system" && !agentCanUseShell(agentId)) {
    adapted = WORKSPACE_PATH_GUIDANCE + `Inspect only sources available through file_read, web_search, and web_fetch. Then use send_to_agent to ask Praxis to run the shell audit and publish the evidence table. Do not invent command output.
`;
  }
  return adapted;
}
async function loadStepTemplate(kind) {
  const cacheKey = tenantCacheKey("step-template", kind);
  const cached = templateCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TEMPLATE_CACHE_TTL_MS) {
    return cached.template;
  }
  const [row] = await sql`
        SELECT kind, template, tools_hint, output_hint, version
        FROM ops_step_templates WHERE kind = ${kind}
    `;
  const template = row ?? null;
  templateCache.set(cacheKey, { template, ts: Date.now() });
  return template;
}
function renderTemplate(template, vars) {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => vars[key] ?? `{{${key}}}`
  );
}
function decorateRenderedTemplate(kind, agentId, rendered) {
  const fileReadGuidance = rendered.includes("file_read") ? FILE_READ_GUIDANCE : "";
  const groundingGuidance = needsArtifactGrounding(kind) ? ARTIFACT_GROUNDING_GUIDANCE : "";
  const contract = completionContract(kind, agentId);
  const body = adaptBodyForAgentTools(kind, agentId, rendered);
  if (kind === "audit_system") {
    return WORKSPACE_PATH_GUIDANCE + AUDIT_EVIDENCE_GUIDANCE + fileReadGuidance + groundingGuidance + contract + body;
  }
  if (kind === "patch_code" || kind === "self_evolution") {
    return WORKSPACE_PATH_GUIDANCE + fileReadGuidance + groundingGuidance + contract + body;
  }
  return fileReadGuidance + groundingGuidance + contract + body;
}
function needsArtifactGrounding(kind) {
  return [
    "document_lesson",
    "draft_product_spec",
    "distill_insight",
    "draft_essay",
    "draft_thread",
    "critique_content",
    "patch_code",
    "content_revision",
    "self_evolution",
    "log_event"
  ].includes(kind);
}
async function buildStepPrompt(kind, ctx, opts) {
  const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const payloadStr = JSON.stringify(ctx.payload, null, 2);
  const outputDir = ctx.outputPath ?? `agents/${ctx.agentId}/notes`;
  const voice = getVoice(ctx.agentId);
  let header = `Mission: ${ctx.missionTitle}
`;
  header += `Step: ${kind}
`;
  header += `Agent: ${ctx.agentId}
`;
  if (voice) {
    header += `
--- AGENT PERSONA ---
${voice.systemDirective}
--- END PERSONA ---
`;
  }
  header += `
Payload: ${payloadStr}

`;
  let dbTemplate = null;
  try {
    dbTemplate = await loadStepTemplate(kind);
  } catch {
  }
  if (dbTemplate) {
    const vars = {
      date: today,
      agentId: ctx.agentId,
      missionTitle: ctx.missionTitle,
      missionSlug: slugify(ctx.missionTitle),
      outputDir,
      payload: payloadStr
    };
    const rendered = decorateRenderedTemplate(
      kind,
      ctx.agentId,
      renderTemplate(dbTemplate.template, vars)
    );
    const prompt2 = header + rendered;
    return opts?.withVersion ? { prompt: prompt2, templateVersion: dbTemplate.version } : prompt2;
  }
  let body;
  const stepInstructions = STEP_INSTRUCTIONS[kind];
  if (stepInstructions) {
    body = stepInstructions(ctx, today, outputDir);
    if (needsArtifactGrounding(kind)) {
      body = ARTIFACT_GROUNDING_GUIDANCE + body;
    }
  } else {
    body = `Execute this step thoroughly. Write your results to ${outputDir}/ using file_write.
`;
    body += `Provide a detailed summary of what you accomplished.
`;
    if (needsArtifactGrounding(kind)) {
      body = ARTIFACT_GROUNDING_GUIDANCE + body;
    }
  }
  body = adaptBodyForAgentTools(kind, ctx.agentId, body);
  const prompt = header + completionContract(kind, ctx.agentId) + body;
  return opts?.withVersion ? { prompt, templateVersion: null } : prompt;
}
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30);
}
var WORKSPACE_ROOT2, GITEA_BASE_URL2, GITEA_ORG2, GITEA_PROJECT_ORG2, WORKSPACE_PATH_GUIDANCE, AUDIT_EVIDENCE_GUIDANCE, FILE_READ_GUIDANCE, ARTIFACT_GROUNDING_GUIDANCE, STEP_COMPLETION_CONTRACTS, WORKSPACE_WRITER_AGENTS, SHELL_AGENTS, SELF_EVOLUTION_REPO_SETUP, TEMPLATE_CACHE_TTL_MS, templateCache, STEP_INSTRUCTIONS;
var init_step_prompts = __esm({
  "src/lib/ops/step-prompts.ts"() {
    "use strict";
    init_db();
    init_cache_key();
    init_voices();
    WORKSPACE_ROOT2 = process.env.WORKSPACE_ROOT ?? "/workspace/projects/subcorp";
    GITEA_BASE_URL2 = process.env.GITEA_BASE_URL ?? "https://git.subcult.tv";
    GITEA_ORG2 = process.env.GITEA_ORG ?? "subculture-collective";
    GITEA_PROJECT_ORG2 = process.env.GITEA_PROJECT_ORG ?? process.env.GITEA_WORKSPACE_ORG ?? GITEA_ORG2;
    WORKSPACE_PATH_GUIDANCE = `Workspace paths: /workspace/projects is the product workspace root; /workspace/output is the artifact output root; /workspace/agents is the agent state root. /workspace/projects/subcorp is the Subcorp source checkout. Do not use bare /output, /agents, or /projects paths. Do not assume /workspace/src exists. Verify paths with bash or file_read before making claims.
`;
    AUDIT_EVIDENCE_GUIDANCE = `Audit evidence contract: include an evidence table with claim, command_or_source, observed_output, severity. Commands must inspect real /workspace/... paths or explicitly cited hostAudit snapshots. Do not use bare /output, /agents, or /projects paths in audit commands or evidence. If a command targets a missing path, first verify the corresponding /workspace path before claiming missing artifacts. Do not claim exposed ports, services, files, artifacts, or permissions without command output from bash or a cited hostAudit snapshot.
`;
    FILE_READ_GUIDANCE = `File read rule: file_read accepts concrete files only, not directories. Use bash to list a directory and choose specific file paths before calling file_read. Never pass directories such as /workspace/output/, output/, /workspace/agents/<agent>/notes/, or agents/<agent>/notes/ to file_read.
`;
    ARTIFACT_GROUNDING_GUIDANCE = `Artifact grounding rule: do not claim code changes, schema changes, metrics, coverage, compliance, operational outcomes, or completed work unless you verified them with bash, file_read, web_fetch, or an explicitly cited source artifact. Include a "Grounding" section listing the exact files, commands, DB rows, URLs, or source artifacts used. Do not cite example.com/placeholder URLs or files marked missing/not found as evidence. If a claim is not verified, label it as a proposal, assumption, or next step instead of stating it as fact.
`;
    STEP_COMPLETION_CONTRACTS = {
      research_topic: `Completion contract: you MUST call web_search successfully and write notes with file_write. Include a Sources section listing query strings and URLs or state exactly which search failed.
`,
      scan_signals: `Completion contract: you MUST call web_search successfully and write a signal report with file_write. Include a Sources section listing query strings and URLs or state exactly which search failed.
`,
      audit_system: `Completion contract: you MUST call bash successfully and write an audit artifact with file_write. The artifact MUST include an evidence table with columns: claim | command_or_source | observed_output | severity.
`,
      patch_code: `Completion contract: you MUST create or modify at least one source/config file with file_write and write a changelog artifact. The changelog MUST include a Grounding section with exact written files and verification commands.
`,
      draft_product_spec: `Completion contract: you MUST write the spec with file_write. The spec MUST include a Grounding section naming source artifacts, notes, searches, or explicit assumptions. Success metrics must be labelled as targets/proposed metrics unless backed by verified evidence.
`,
      document_lesson: `Completion contract: you MUST write documentation with file_write. The document MUST include a Grounding section naming the source event/artifact/command/DB row used.
`,
      distill_insight: `Completion contract: you MUST write the digest with file_write. The digest MUST include a Grounding section naming the exact source artifacts or memories used.
`,
      log_event: `Completion contract: you MUST write an event note with file_write. The note MUST include a Grounding section naming the event, source session, artifact, command, or DB row being logged.
`,
      critique_content: `Completion contract: you MUST read or cite the reviewed artifact and write the critique with file_write. Include a Grounding section naming the exact artifact reviewed.
`,
      content_revision: `Completion contract: you MUST read or cite the original artifact/reviewer notes and write the revision with file_write. Include a Grounding section naming the original artifact and feedback addressed.
`,
      draft_essay: `Completion contract: you MUST write the draft with file_write. Include a Grounding section naming source notes, URLs, or assumptions used.
`,
      draft_thread: `Completion contract: you MUST write the thread with file_write. Include a Grounding section naming source notes, URLs, or assumptions used.
`,
      self_evolution: `Completion contract: you MUST inspect the repo with bash, change files with file_write, and write a grounded summary artifact. If repo mutation is blocked, write a human-action-needed artifact instead of claiming success.
`
    };
    WORKSPACE_WRITER_AGENTS = /* @__PURE__ */ new Set(["praxis", "mux", "primus"]);
    SHELL_AGENTS = /* @__PURE__ */ new Set(["praxis", "mux"]);
    SELF_EVOLUTION_REPO_SETUP = [
      `REPO_DIR=${WORKSPACE_ROOT2}`,
      `if [ ! -d "$REPO_DIR/.git" ]; then for CANDIDATE in /workspace/projects/subcorp /home/onnwee/projects/subcorp /home/onnwee/workspace/projects/subcorp; do if [ -d "$CANDIDATE/.git" ]; then REPO_DIR="$CANDIDATE"; break; fi; done; fi`,
      `if [ ! -d "$REPO_DIR/.git" ]; then mkdir -p /home/onnwee/projects && git clone ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp.git /home/onnwee/projects/subcorp && REPO_DIR=/home/onnwee/projects/subcorp; fi`,
      `cd "$REPO_DIR"`
    ].join("; ");
    TEMPLATE_CACHE_TTL_MS = 6e4;
    templateCache = /* @__PURE__ */ new Map();
    STEP_INSTRUCTIONS = {
      research_topic: (ctx, today, outputDir) => `Use web_search to research the topic described in the payload.
Search for 3-5 relevant queries to build a comprehensive picture.
Use web_fetch to read the most relevant pages.
Write your research notes to ${outputDir}/${today}__research__notes__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "research_topic", status: "complete".
Include: key findings, sources, quotes, and your analysis.
`,
      scan_signals: (ctx, today, outputDir) => `Use web_search to scan for signals related to the payload topic.
Look for recent developments, trends, and notable changes.
Write a signal report to ${outputDir}/${today}__scan__signals__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Format: bullet points grouped by signal type (opportunity, threat, trend, noise).
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "scan_signals", status: "complete".
Focus on scanning and documenting signals only. Do not call propose_mission during this step.
`,
      draft_essay: (ctx, today) => `Read any research notes from agents/${ctx.agentId}/notes/ using file_read.
Draft an essay based on the payload and your research.
Write the draft to output/reports/${today}__draft__essay__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Include YAML front matter with artifact_id, created_at, agent_id, workflow_stage: "draft", status: "draft".
`,
      draft_thread: (ctx, today) => `Read any research notes from agents/${ctx.agentId}/notes/ using file_read.
Draft a concise thread (5-10 punchy points) based on the payload.
Write to output/reports/${today}__draft__thread__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "draft_thread", status: "draft".
`,
      critique_content: (ctx, today) => `Read the artifact or content referenced in the payload using file_read.
Write a structured critique to output/reviews/${today}__critique__review__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.
Cover: strengths, weaknesses, factual accuracy, tone, suggestions for improvement.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "critique_content", status: "complete".
`,
      audit_system: (ctx, today) => WORKSPACE_PATH_GUIDANCE + AUDIT_EVIDENCE_GUIDANCE + `Use bash to run system checks relevant to the payload.
If evidence is unavailable, write status: "blocked" with the missing command/source instead of inventing findings.
Check file permissions, exposed ports, running services, or whatever the payload specifies.
Write findings to output/reviews/${today}__audit__security__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Rate findings by severity: critical, high, medium, low, info.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "audit_system", status: "complete".
`,
      patch_code: (ctx, today, outputDir) => {
        const requestedProjectDir = ctx.payload.project_dir;
        const projectDir = requestedProjectDir || `/workspace/projects/${slugify(ctx.missionTitle)}`;
        return `You are a software engineer. Your job is to write code.
` + WORKSPACE_PATH_GUIDANCE + FILE_READ_GUIDANCE + ARTIFACT_GROUNDING_GUIDANCE + `
Project directory: ${projectDir}
Do not write product files directly into /workspace/projects root. If no project_dir is supplied, use the mission-specific project directory above.
Task: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
1. If the project directory doesn't exist yet, create it. Use file_write to create package.json, tsconfig.json, README.md, and source files.
2. If the project exists, use file_read to read the existing source files first.
3. Use file_write to create or modify source files. Write real, working code \u2014 not pseudocode or descriptions.
4. Run package-manager or scaffold commands only inside the project directory (for example: cd ${projectDir} && npm init -y). Never run npm init from /workspace or /workspace/projects root.
5. After writing source files, use bash to verify they exist (for example: find ${projectDir} -maxdepth 3 -type f).
6. Write a brief changelog to ${outputDir}/${today}__patch__code__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
7. If GITEA_WORKSPACE_TOKEN or GITEA_TOKEN is available and the code is ready, use bash to run sync-workspace-to-gitea.sh projects so individual project repos are pushed to ${GITEA_BASE_URL2}/${GITEA_PROJECT_ORG2}.

Your primary output is SOURCE CODE files written via file_write. Do NOT just describe what you would build \u2014 actually build it.
`;
      },
      distill_insight: (ctx, today) => ARTIFACT_GROUNDING_GUIDANCE + `Read recent outputs from output/ and agents/${ctx.agentId}/notes/ using file_read.
Synthesize into a concise digest of key insights.
Write to output/digests/${today}__distill__insight__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "distill_insight", status: "complete".
`,
      document_lesson: (ctx, today) => ARTIFACT_GROUNDING_GUIDANCE + `Document the lesson or knowledge described in the payload.
Do not invent inventories, system names, record counts, costs, dates, percentages, or operational metrics. If source inventory/evidence is missing, state that explicitly and frame any examples as illustrative assumptions or open questions.
Write clear, reusable documentation to the appropriate projects/ docs/ directory.
If no specific project, write to output/reports/${today}__docs__lesson__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "document_lesson", status: "complete".
`,
      convene_roundtable: (ctx, today, outputDir) => `This step triggers a roundtable conversation.
Extract from the payload:
  - format: the roundtable format (e.g. brainstorm, strategy, triage, deep_dive)
  - topic: the seed prompt for discussion
  - participants: (optional) specific agent IDs to include
  - context: (optional) any background artifacts or prior decisions
Use the convene_roundtable tool with these parameters.
After the roundtable completes, write a brief convening summary to ${outputDir}/${today}__roundtable__convened__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.
Include: format used, topic, participant count, and whether artifacts were produced.
`,
      propose_workflow: (ctx, today, outputDir) => `Based on the payload, propose a multi-step workflow as a mission.
Analyze what needs to be accomplished and decompose it into ordered steps.
For each step, specify:
  - step_kind: one of the valid step kinds (research_topic, scan_signals, draft_essay, draft_thread, critique_content, audit_system, patch_code, distill_insight, document_lesson, convene_roundtable, draft_product_spec, update_directive, create_pull_request, memory_archaeology, content_revision)
  - agent_id: the best-suited agent (chora for analysis, subrosa for security/risk, thaum for creative, praxis for execution, mux for formatting/drafting, primus for coordination)
  - payload: the specific input for that step
  - depends_on: which prior steps this depends on (by index)
Use the propose_mission tool with the workflow steps.
Write the proposal to ${outputDir}/${today}__workflow__proposal__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "propose_workflow", status: "proposed".
`,
      draft_product_spec: (ctx, today) => ARTIFACT_GROUNDING_GUIDANCE + `Product identity rule: the product name, audience, and core purpose come from the mission title and payload. Preserve them exactly. Do NOT replace the requested product with an unrelated governance, audit, or operations concept just because recent audit artifacts are available.
Use unrelated audit/process artifacts only as constraints, risks, or compliance requirements, not as the product concept. If the source context conflicts, state the conflict in Open questions instead of silently changing the product.
Read recent research notes and roundtable artifacts from agents/ and output/ using file_read.
Look for brainstorm sessions, strategy discussions, and signal reports.
Draft a structured product specification document with:
  - YAML front matter (artifact_id, created_at, agent_id, status: "draft")
  - Problem statement
  - Proposed solution
  - User stories / use cases
  - Technical requirements
  - Success metrics
  - Open questions
Write the spec to output/reports/${today}__product__spec__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
`,
      update_directive: (ctx, today) => [
        `Read the current prime directive from shared/prime-directive.md using file_read.`,
        `Read any recent product specs from output/reports/ using file_read (look for product__spec files).`,
        `Read recent strategy roundtable artifacts from output/ using file_read.`,
        `Based on the current state of the project, draft an updated prime directive proposal.`,
        `You MUST preserve the directive hierarchy and guardrails:`,
        `  - P1 = outward-facing publishable content`,
        `  - P2 = publication-linked quality/fact-check/review only for a specific P1 item`,
        `  - P3 = operational work only when directly unblocking imminent P1/P2 output`,
        `  - P4 = governance/process only when operator-triggered`,
        `  - Keep at least 70% of autonomous effort focused on P1/P2 work`,
        `  - Do not relabel governance as safety/alignment/stewardship/mission health to bypass the hierarchy`,
        `  - Keep review publication-linked, bounded, and time-boxed`,
        `  - Do not weaken these structural rules without explicit operator approval`,
        `The directive should:`,
        `  - Reflect the current product direction`,
        `  - Set clear priorities and focus areas`,
        `  - Define success criteria for the current period`,
        `  - Be concise and actionable (under 500 words)`,
        `Write the proposed directive to agents/primus/notes/${today}__directive__proposal__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.`,
        `Use notify_human to request operator review and explicit approval of the staged proposal before any live directive change.`,
        `You MUST NOT write directly to shared/prime-directive.md without explicit operator approval.`,
        `Also write a changelog entry to agents/primus/notes/${today}__directive__update__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md.`,
        ""
      ].join("\n"),
      create_pull_request: (ctx, today, outputDir) => `You are creating a pull request from the agents/workspace branch.
Use bash to check the diff:
  cd ${WORKSPACE_ROOT2} && git diff --stat HEAD~5
  cd ${WORKSPACE_ROOT2} && git log --oneline -10
Do not commit, push, or create a live PR from an autonomous session. Prepare a PR-ready summary artifact instead.
Write the PR summary to ${outputDir}/${today}__pr__summary__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
The summary should include: branch name, commit list, diff stats, and a description of all changes.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "create_pull_request", status: "complete".
`,
      self_evolution: (ctx, today, outputDir) => `You are improving your own system. You are an AI agent in the SUBCORP collective.
` + ARTIFACT_GROUNDING_GUIDANCE + `Your source code is at ${WORKSPACE_ROOT2}/.

\u2550\u2550\u2550 CONTEXT \u2550\u2550\u2550
You belong to the ${GITEA_ORG2} Gitea organization (${GITEA_BASE_URL2}/${GITEA_ORG2}).
Your platform repo is ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp.git.
You may inspect and prepare changes, but autonomous sessions MUST NOT commit, push, or create live PRs.
Prepare operator-reviewable artifacts instead of publishing changes directly.
\u2550\u2550\u2550 END CONTEXT \u2550\u2550\u2550

Task: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
1. Use file_read to read the relevant source files described in the payload.
2. Identify a specific, concrete improvement (not vague "make it better").
3. Use bash to inspect status/diff and identify the intended branch name, but do not create/publish a live branch.
4. Use file_write to make your changes.
5. Do not run git commit, git push, gh/tea PR creation, or direct PR creation API calls.
6. Write a PR-ready summary to ${outputDir}/${today}__evolution__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md with changed files, diff summary, validation, and exact operator next steps.

Your output is local code changes plus a PR-ready artifact for operator review, not a merged or pushed pull request.
`,
      github_issue: (ctx) => `You are managing the subculture-collective Gitea organization.
Org: ${GITEA_BASE_URL2}/${GITEA_ORG2}
Platform repo: ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp.git
You have FULL ACCESS \u2014 create repos, issues, PRs, labels, projects, anything.

Task: ${ctx.payload.description || ctx.missionTitle}

Use bash and the Gitea web UI/API. Examples:
  Open issues at ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp/issues/new
  Browse issues at ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp/issues
  Create repos under ${GITEA_BASE_URL2}/${GITEA_ORG2}
  Manage labels in the repo settings on git.subcult.tv

Create well-structured issues with clear titles, descriptions, acceptance criteria, and appropriate labels.
`,
      github_pr: (ctx) => `You are managing code in the subculture-collective Gitea organization.
Org: ${GITEA_BASE_URL2}/${GITEA_ORG2}
Platform repo: ${GITEA_BASE_URL2}/${GITEA_ORG2}/subcorp.git
You may inspect and prepare changes, but autonomous sessions MUST NOT commit, push, or create live PRs.

Task: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
1. Use bash to check current branch and status: cd ${WORKSPACE_ROOT2} && git status
2. Make changes via file_write when requested, but do not commit, push, or open a live PR.
3. PR should have a clear title, description of changes, and context for reviewers.
4. Write a PR-ready summary artifact with changed files, validation, and exact operator next steps.
`,
      explore_repo: (ctx, _today, outputDir) => `You are exploring repositories in the subculture-collective Gitea organization.
Org: ${GITEA_BASE_URL2}/${GITEA_ORG2}
You have FULL ACCESS to all repos.

Task: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
1. Use bash to browse the Gitea org page or API: ${GITEA_BASE_URL2}/${GITEA_ORG2}
2. For a specific repo, explore it:
   ${GITEA_BASE_URL2}/${GITEA_ORG2}/[repo-name]
   ${GITEA_BASE_URL2}/${GITEA_ORG2}/[repo-name]/issues
   ${GITEA_BASE_URL2}/${GITEA_ORG2}/[repo-name]/pulls
3. Clone and read source code if needed:
   cd /workspace/projects && git clone ${GITEA_BASE_URL2}/${GITEA_ORG2}/[repo-name].git 2>/dev/null || true
   Then use file_read to read files.
4. IMPORTANT: Check for existing Gitea issues, README, and docs \u2014 respect the existing development plan.
5. If you find improvements to make, create detailed PRs with clear descriptions of what you changed and why.
6. Write findings to ${outputDir}/
`,
      publish_blog: (ctx) => `You are publishing content to the SUBCORP blog at https://blog.subcult.tv (Ghost CMS).

Task: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
1. Prepare your blog post content: title, body (in markdown/HTML), and tags.
2. Use the Ghost Admin API via bash/curl to publish.
3. If you don't have API access configured, write the post to /workspace/output/blog/ as markdown
   and use notify_human to ask for the Ghost admin API key.
4. Blog posts should be polished, on-brand, and provide genuine value to readers.
5. Topics: technology, AI, autonomy, open source, creative tools, underground culture.
`,
      notify_human: (ctx) => `You need human assistance for a task you cannot complete autonomously.

Request: ${ctx.payload.description || ctx.missionTitle}

INSTRUCTIONS:
Send a notification to the human operator via ntfy:
  Use bash:
  curl -sS -X POST "http://172.20.0.9/subcorp-agents" \\
    -H "Title: \u{1F6E0}\uFE0F Agent needs human help" \\
    -H "Priority: high" \\
    -H "Tags: warning,robot_face,hand" \\
    -H "Markdown: yes" \\
    -d $'## Human action needed\\n\\n- **Task**: [task name]\\n- **Need**: [what human must do]\\n- **Tried**: [what you already tried]\\n- **Blocker**: [why blocked]\\n- **Next after help**: [what you will do next]'
  Optional: if you must include JSON context, append a fenced code block instead of sending raw JSON as the whole message.

Be specific about what you need:
- What task requires human help
- What you've already tried
- What you need them to do (create an account, provide API key, approve something, etc.)

The human has offered to help with: creating accounts, providing API keys,
installing services, and any task you cannot do yourself. Just ask.
`,
      content_revision: (ctx, today, outputDir) => `You are revising a previously reviewed piece of content based on reviewer feedback.
` + ARTIFACT_GROUNDING_GUIDANCE + `The payload contains the original draft and the reviewer notes explaining what needs to change.
Read the original artifact referenced in the payload using file_read.
Apply every piece of reviewer feedback. Do not ignore or soften critical notes \u2014 address each one directly.
Preserve the original voice and intent while improving quality, accuracy, and clarity.
Write the revised artifact to ${outputDir}/${today}__revision__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
Include YAML front matter: artifact_id, created_at, agent_id, step_kind: "content_revision", status: "complete", original_artifact: <id of the original>.
`,
      memory_archaeology: (ctx, today, outputDir) => `Perform a memory archaeology dig to analyze agent memories for patterns, contradictions, emergence, echoes, and drift.
Use the memory_search tool to retrieve relevant memories from the collective.
Analyze the memories for:
  - **Patterns**: Recurring themes, behaviors, or ideas across multiple memories
  - **Contradictions**: Conflicting memories or opposing viewpoints
  - **Emergence**: New behaviors, ideas, or perspectives that appear in recent memories
  - **Echoes**: Specific phrases, metaphors, or ideas that reappear across contexts
  - **Drift**: How perspectives, tone, or beliefs have shifted over time
Write your findings to ${outputDir}/${today}__archaeology__findings__${slugify(ctx.missionTitle)}__${ctx.agentId}__v01.md using file_write.
For each finding, include:
  1. Finding type (pattern/contradiction/emergence/echo/drift)
  2. A concise title
  3. Detailed description with evidence from specific memories
  4. Confidence level (0.0 to 1.0)
  5. Related agent IDs
Be specific and evidence-based. Include memory IDs and excerpts to support your findings.
`
    };
  }
});

// src/lib/ops/agent-designer.ts
var agent_designer_exports = {};
__export(agent_designer_exports, {
  generateAgentProposal: () => generateAgentProposal,
  getProposalById: () => getProposalById,
  getProposals: () => getProposals,
  saveProposal: () => saveProposal,
  setHumanApproval: () => setHumanApproval
});
async function generateAgentProposal(proposerId) {
  log35.info("Generating agent proposal", { proposer: proposerId });
  const agents = await sql`
        SELECT agent_id, display_name, role
        FROM ops_agent_registry
        WHERE active = true
        ORDER BY agent_id
    `;
  const skills = await sql`
        SELECT agent_id, skill_name
        FROM ops_agent_skills
        ORDER BY agent_id
    `;
  const recentSessions = await sql`
        SELECT format, topic, participants
        FROM ops_roundtable_sessions
        WHERE status = 'completed'
        ORDER BY completed_at DESC
        LIMIT 10
    `;
  const [pendingCount] = await sql`
        SELECT COUNT(*)::int as count
        FROM ops_agent_proposals
        WHERE status IN ('proposed', 'voting')
    `;
  if (pendingCount.count >= 2) {
    log35.info("Skipping proposal \u2014 too many pending proposals", {
      pending: pendingCount.count
    });
    throw new Error(
      `Cannot generate proposal: ${pendingCount.count} proposals already pending`
    );
  }
  const agentRoster = agents.map((a) => `- ${a.display_name} (${a.agent_id}): ${a.role}`).join("\n");
  const skillMap = /* @__PURE__ */ new Map();
  for (const s of skills) {
    const list = skillMap.get(s.agent_id) ?? [];
    list.push(s.skill_name);
    skillMap.set(s.agent_id, list);
  }
  const skillCoverage = Array.from(skillMap.entries()).map(([id, sk]) => `- ${id}: ${sk.join(", ")}`).join("\n");
  const recentTopics = recentSessions.map((s) => `- [${s.format}] ${s.topic}`).join("\n");
  const systemPrompt = `You are ${proposerId}, an agent in the SubCult collective. You have the ability to propose new agents to join the collective.

Analyze the current composition and identify gaps \u2014 missing capabilities, underserved domains, or personality dynamics that would strengthen the group.

Current agent roster:
${agentRoster}

Current skill coverage:
${skillCoverage || "(no skills data)"}

Recent roundtable topics:
${recentTopics || "(no recent sessions)"}

Rules:
- The proposed agent must fill a genuine gap \u2014 do not propose redundant agents.
- The name should be evocative and lowercase (like existing agents: chora, subrosa, thaum, praxis, mux, primus).
- The role should describe the agent's function in 1-2 words.
- Personality should define tone, traits, speaking style, and optionally an emoji symbol.
- Skills should be concrete and actionable (3-6 skills).
- The rationale must explain WHY the collective needs this agent NOW.

Respond with valid JSON only, no markdown fencing:
{
  "agent_name": "lowercase_name",
  "agent_role": "role_in_1_2_words",
  "personality": {
    "tone": "description of tone",
    "traits": ["trait1", "trait2", "trait3"],
    "speaking_style": "how this agent communicates",
    "emoji": "single emoji symbol"
  },
  "skills": ["skill1", "skill2", "skill3"],
  "rationale": "why the collective needs this agent"
}`;
  let result = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    result = await llmGenerate({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: "Analyze the collective and propose a new agent if a genuine gap exists."
        }
      ],
      temperature: 0.85,
      maxTokens: 4e3,
      trackingContext: {
        agentId: proposerId,
        context: "agent_design"
      }
    });
    if (result && result.trim().length > 0) break;
    log35.warn("LLM returned empty for agent proposal, retrying", {
      proposer: proposerId,
      attempt: attempt + 1
    });
    await new Promise((r) => setTimeout(r, 3e3 * (attempt + 1)));
  }
  let parsed;
  if (!result || result.trim().length === 0) {
    log35.error("LLM returned empty response for agent proposal", {
      proposer: proposerId
    });
    throw new Error("LLM returned empty response for agent proposal");
  }
  try {
    const stripped = result.replace(/```(?:json)?\s*([\s\S]*?)```/g, "$1");
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in LLM response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    log35.error("Failed to parse agent proposal from LLM", {
      error: err,
      responsePreview: result.slice(0, 500)
    });
    throw new Error(
      `Failed to parse agent proposal: ${err.message}`
    );
  }
  if (!parsed.agent_name || !parsed.agent_role || !parsed.rationale) {
    throw new Error("LLM response missing required fields");
  }
  const agentName = parsed.agent_name.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!agentName) {
    throw new Error(
      `Invalid agent_name: "${parsed.agent_name}" normalized to empty string`
    );
  }
  const [existing] = await sql`
        SELECT COUNT(*)::int as count
        FROM ops_agent_registry
        WHERE agent_id = ${agentName}
    `;
  if (existing.count > 0) {
    throw new Error(`Agent "${agentName}" already exists in the registry`);
  }
  const [pendingProposal] = await sql`
        SELECT COUNT(*)::int as count
        FROM ops_agent_proposals
        WHERE agent_name = ${agentName}
          AND status IN ('proposed', 'voting', 'approved')
    `;
  if (pendingProposal.count > 0) {
    throw new Error(
      `A proposal for agent "${agentName}" already exists and is pending`
    );
  }
  const proposalId = await saveProposal(
    {
      agent_name: agentName,
      agent_role: parsed.agent_role,
      personality: parsed.personality ?? {
        tone: "neutral",
        traits: [],
        speaking_style: "direct"
      },
      skills: parsed.skills ?? [],
      rationale: parsed.rationale
    },
    proposerId
  );
  await emitEventAndCheckReactions({
    agent_id: proposerId,
    kind: "agent_proposal_created",
    title: `${proposerId} proposes new agent: ${agentName}`,
    summary: parsed.rationale,
    tags: ["agent-designer", "proposal", agentName],
    metadata: {
      proposalId,
      agentName,
      agentRole: parsed.agent_role,
      proposer: proposerId
    }
  });
  const proposal = await getProposalById(proposalId);
  if (!proposal) throw new Error("Failed to retrieve saved proposal");
  return proposal;
}
async function saveProposal(proposal, proposerId) {
  const [row] = await sql`
        INSERT INTO ops_agent_proposals
            (proposed_by, agent_name, agent_role, personality, skills, rationale)
        VALUES (
            ${proposerId},
            ${proposal.agent_name},
            ${proposal.agent_role},
            ${jsonb(proposal.personality)},
            ${jsonb(proposal.skills)},
            ${proposal.rationale}
        )
        RETURNING id
    `;
  log35.info("Agent proposal saved", {
    id: row.id,
    proposer: proposerId,
    agentName: proposal.agent_name
  });
  return row.id;
}
async function getProposals(filters) {
  const limit = filters?.limit ?? 50;
  const status = filters?.status;
  const proposedBy = filters?.proposedBy;
  if (status && proposedBy) {
    return sql`
            SELECT * FROM ops_agent_proposals
            WHERE status = ${status} AND proposed_by = ${proposedBy}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  } else if (status) {
    return sql`
            SELECT * FROM ops_agent_proposals
            WHERE status = ${status}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  } else if (proposedBy) {
    return sql`
            SELECT * FROM ops_agent_proposals
            WHERE proposed_by = ${proposedBy}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
  }
  return sql`
        SELECT * FROM ops_agent_proposals
        ORDER BY created_at DESC
        LIMIT ${limit}
    `;
}
async function getProposalById(id) {
  const [row] = await sql`
        SELECT * FROM ops_agent_proposals WHERE id = ${id}
    `;
  return row ?? null;
}
async function setHumanApproval(proposalId, approved) {
  await sql`
        UPDATE ops_agent_proposals
        SET human_approved = ${approved}
        WHERE id = ${proposalId}
    `;
  log35.info("Human approval set", { proposalId, approved });
}
var log35;
var init_agent_designer = __esm({
  "src/lib/ops/agent-designer.ts"() {
    "use strict";
    init_db();
    init_client();
    init_events2();
    init_logger();
    log35 = logger.child({ module: "agent-designer" });
  }
});

// scripts/unified-worker/index.ts
var import_config = require("dotenv/config");
var import_postgres2 = __toESM(require("postgres"));
var import_promises2 = __toESM(require("fs/promises"));
var import_path2 = __toESM(require("path"));
init_orchestrator();

// src/lib/tools/agent-session.ts
init_db();
init_client();
init_voices();

// src/lib/tools/tools/bash.ts
init_executor();
function forbiddenAutonomousPublishCommand(command) {
  const normalized = command.replace(/\\\s*\n/g, " ").replace(/\s+/g, " ").trim();
  if (/\bgit\s+commit\b/i.test(normalized)) {
    return "git commit is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead";
  }
  if (/\bgit\s+push\b/i.test(normalized)) {
    return "git push is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead";
  }
  if (/\b(?:gh|tea)\s+(?:pr|pull|pulls)\s+(?:create|new)\b/i.test(normalized)) {
    return "pull request creation is disabled for autonomous agent bash sessions; write a PR-ready summary artifact instead";
  }
  return null;
}
function forbiddenWorkspaceRootWriteCommand(command) {
  const normalized = command.replace(/\\\s*\n/g, " ").replace(/\s+/g, " ").trim();
  const writesWorkspaceRootPackage = /\bnpm\s+init\b/i.test(normalized) && !/\bcd\s+\/workspace\/projects\/[^\s;&|]+\s*&&/i.test(normalized) && !/\b--prefix\s+\/workspace\/projects\/[^\s;&|]+\b/i.test(normalized);
  if (writesWorkspaceRootPackage) {
    return "npm init must run inside a mission-specific /workspace/projects/<slug> directory, not /workspace or /workspace/projects root";
  }
  const writeVerb = /\b(?:mkdir|touch|cp|mv|rm|install|npm|pnpm|yarn|bun|python|python3|node)\b|>|\btee\b/i;
  const directProjectsRootTarget = /\/workspace\/projects\/(?:package\.json|README\.md|app\.py|server\.js|index\.[a-z]+|src(?:\/|\b)|tests?(?:\/|\b)|config(?:\/|\b))/i;
  if (writeVerb.test(normalized) && directProjectsRootTarget.test(normalized)) {
    return "product code writes must target a mission-specific /workspace/projects/<slug>/ directory, not /workspace/projects root";
  }
  return null;
}
var bashTool = {
  name: "bash",
  description: "Execute a bash command in the toolbox environment. Has access to standard Linux utilities, curl, jq, git, node, python3, gh CLI, ripgrep, fd-find, and /usr/local/bin/sync-workspace-to-gitea.sh. Host audit commands must be explicitly labelled; ordinary commands run inside the toolbox container, not on the host.",
  agents: ["praxis", "mux"],
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute"
      },
      timeout_ms: {
        type: "number",
        description: "Timeout in milliseconds (default 30000, max 120000)"
      }
    },
    required: ["command"]
  },
  execute: async (params) => {
    const command = params.command;
    const forbidden = forbiddenAutonomousPublishCommand(command);
    if (forbidden) {
      return { error: forbidden, denied: true };
    }
    const workspaceRootWrite = forbiddenWorkspaceRootWriteCommand(command);
    if (workspaceRootWrite) {
      return { error: workspaceRootWrite, denied: true, policy: "workspace_project_root_boundary" };
    }
    const timeoutMs = Math.min(
      params.timeout_ms || 3e4,
      12e4
    );
    const result = await execInToolbox(command, timeoutMs);
    if (result.timedOut) {
      return { error: `Command timed out after ${timeoutMs}ms`, stderr: result.stderr };
    }
    return {
      exitCode: result.exitCode,
      stdout: result.stdout,
      ...result.stderr ? { stderr: result.stderr } : {}
    };
  }
};

// src/lib/types.ts
var ALL_AGENTS = [
  "chora",
  "subrosa",
  "thaum",
  "praxis",
  "mux",
  "primus"
];

// src/lib/tools/tools/web-search.ts
init_logger();
init_metrics2();
init_fetch_with_retry();
var log24 = logger.child({ module: "web-search" });
var EXA_API_KEY = process.env.EXA_API_KEY ?? "";
var TAVILY_API_KEY = process.env.TAVILY_API_KEY ?? "";
var BRAVE_API_KEY = process.env.BRAVE_API_KEY ?? "";
var EXA_SEARCH_URL = "https://api.exa.ai/search";
var TAVILY_SEARCH_URL = "https://api.tavily.com/search";
var BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";
var DDG_SEARCH_URL = "https://api.duckduckgo.com/";
var providerCooldownUntil = /* @__PURE__ */ new Map();
function isCoolingDown(provider) {
  return (providerCooldownUntil.get(provider) ?? 0) > Date.now();
}
function setCooldown(provider, response) {
  const retryAfter = response?.headers.get("Retry-After");
  const retryAfterSeconds = retryAfter ? Number.parseFloat(retryAfter) : NaN;
  const cooldownMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds * 1e3 : 6e4;
  providerCooldownUntil.set(provider, Date.now() + cooldownMs);
}
function recordFallback(fromProvider, toProvider, reason) {
  incWebSearchFallback({ fromProvider, toProvider, reason });
}
function failurePayload(failures) {
  if (failures.length === 0) return null;
  if (failures.length === 1) return failures[0];
  return failures;
}
async function searchExa(query, count) {
  const response = await fetchWithRetry(EXA_SEARCH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY
    },
    body: JSON.stringify({
      query,
      numResults: count,
      type: "auto",
      contents: {
        text: true,
        highlights: true
      }
    }),
    label: "exa search",
    totalTimeoutMs: 15e3,
    maxRetries: 1
  });
  if (response.status === 429) {
    setCooldown("exa", response);
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`Exa returned ${response.status}`);
  }
  const data = await response.json();
  return (data.results ?? []).slice(0, count).map((result) => ({
    title: result.title || result.url || "Untitled result",
    url: result.url || "",
    description: result.text || result.highlights?.join(" ") || ""
  })).filter((result) => result.url);
}
async function searchTavily(query, count) {
  const response = await fetchWithRetry(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TAVILY_API_KEY}`
    },
    body: JSON.stringify({
      query,
      max_results: count,
      search_depth: "basic"
    }),
    label: "tavily search",
    totalTimeoutMs: 15e3,
    maxRetries: 1
  });
  if (response.status === 429) {
    setCooldown("tavily", response);
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`Tavily returned ${response.status}`);
  }
  const data = await response.json();
  return (data.results ?? []).slice(0, count).map((result) => ({
    title: result.title || result.url || "Untitled result",
    url: result.url || "",
    description: result.content || ""
  })).filter((result) => result.url);
}
async function searchBrave(query, count) {
  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(count));
  const response = await fetchWithRetry(url.toString(), {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_API_KEY
    },
    label: "brave search",
    totalTimeoutMs: 15e3,
    maxRetries: 1
  });
  if (response.status === 429) {
    setCooldown("brave", response);
    throw new Error("rate_limited");
  }
  if (!response.ok) {
    throw new Error(`Brave returned ${response.status}`);
  }
  const data = await response.json();
  return (data.web?.results ?? []).slice(0, count).map((result) => ({
    title: result.title || result.url || "Untitled result",
    url: result.url || "",
    description: result.description || ""
  })).filter((result) => result.url);
}
async function searchDuckDuckGo(query, count) {
  const url = new URL(DDG_SEARCH_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("t", "subcorp");
  const response = await fetchWithRetry(url.toString(), {
    headers: { "Accept": "application/json" },
    label: "duckduckgo search",
    totalTimeoutMs: 15e3,
    maxRetries: 1
  });
  if (!response.ok) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }
  const data = await response.json();
  const rawResults = [
    ...data.Results ?? [],
    ...(data.RelatedTopics ?? []).filter((topic) => topic.FirstURL)
  ];
  return rawResults.slice(0, count).map((result) => {
    const description = result.Text ?? "";
    return {
      title: description.replace(/^https?:\/\/\S+\s*/i, "").trim() || description || result.FirstURL || "Untitled result",
      url: result.FirstURL ?? "",
      description
    };
  }).filter((result) => result.url);
}
async function tryProvider(provider, hasKey, query, count) {
  if (!hasKey) {
    return { failure: { provider, reason: "missing_key" } };
  }
  if (isCoolingDown(provider)) {
    return { failure: { provider, reason: "cooldown" } };
  }
  try {
    const results = provider === "exa" ? await searchExa(query, count) : provider === "tavily" ? await searchTavily(query, count) : await searchBrave(query, count);
    if (results.length === 0) {
      return { failure: { provider, reason: "empty_results" } };
    }
    return { results, provider };
  } catch (err) {
    const reason = err.message === "rate_limited" ? "rate_limited" : "exception";
    log24.warn(`${provider} search failed, trying next provider`, {
      provider,
      reason,
      error: err.message,
      query
    });
    return { failure: { provider, reason } };
  }
}
var webSearchTool = {
  name: "web_search",
  description: "Search the web using Exa/Tavily, then Brave, with DuckDuckGo as degraded last-resort fallback. Returns titles, URLs, descriptions, provider provenance, and confidence.",
  agents: [...ALL_AGENTS],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query"
      },
      count: {
        type: "number",
        description: "Number of results to return (default 5, max 20)"
      }
    },
    required: ["query"]
  },
  execute: async (params) => {
    const query = params.query;
    const count = Math.min(params.count || 5, 20);
    const failures = [];
    const providers = [
      ["exa", Boolean(EXA_API_KEY)],
      ["tavily", Boolean(TAVILY_API_KEY)],
      ["brave", Boolean(BRAVE_API_KEY)]
    ];
    for (const [provider, hasKey] of providers) {
      const attempt = await tryProvider(provider, hasKey, query, count);
      if ("results" in attempt) {
        const fallback = failurePayload(failures);
        const previousFailure = failures.at(-1);
        if (previousFailure) recordFallback(previousFailure.provider, attempt.provider, previousFailure.reason);
        return {
          results: attempt.results,
          query,
          count: attempt.results.length,
          source: attempt.provider,
          provider: attempt.provider,
          fallback,
          degraded: false,
          confidence: "high"
        };
      }
      failures.push(attempt.failure);
    }
    const lastFailure = failures.at(-1);
    if (lastFailure) recordFallback(lastFailure.provider, "duckduckgo", lastFailure.reason);
    try {
      const results = await searchDuckDuckGo(query, count);
      return {
        results,
        query,
        count: results.length,
        source: "ddg",
        provider: "duckduckgo",
        fallback: failurePayload(failures),
        degraded: true,
        confidence: "low"
      };
    } catch (err) {
      log24.error("DuckDuckGo fallback also failed", { error: err, query });
      return {
        error: `Search failed: ${err.message}`,
        provider: "duckduckgo",
        fallback: failurePayload(failures),
        degraded: true,
        confidence: "low"
      };
    }
  }
};

// src/lib/tools/tools/web-fetch.ts
init_executor();
var webFetchTool = {
  name: "web_fetch",
  description: "Fetch a URL and return its content as markdown text. Useful for reading articles, documentation, or web pages.",
  agents: [...ALL_AGENTS],
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The URL to fetch"
      },
      max_length: {
        type: "number",
        description: "Maximum characters to return (default 10000)"
      }
    },
    required: ["url"]
  },
  execute: async (params) => {
    const url = params.url;
    const maxLength = params.max_length || 1e4;
    if (typeof maxLength !== "number" || isNaN(maxLength) || maxLength < 1 || maxLength > 1e6) {
      return { error: "max_length must be a number between 1 and 1,000,000" };
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return { error: "URL must start with http:// or https://" };
    }
    const escapedUrl = url.replace(/'/g, "'\\''");
    const safeMaxLength = Math.floor(maxLength).toString();
    const command = `curl -sL --max-time 15 --max-filesize 5242880 '${escapedUrl}' | python3 -c "
import sys
try:
    import html2text
    h = html2text.HTML2Text()
    h.ignore_links = False
    h.ignore_images = True
    h.body_width = 0
    content = sys.stdin.read()
    print(h.handle(content)[:${safeMaxLength}])
except Exception as e:
    # Fallback: strip tags manually
    import re
    content = sys.stdin.read()
    text = re.sub(r'<[^>]+>', ' ', content)
    text = re.sub(r'\\s+', ' ', text).strip()
    print(text[:${safeMaxLength}])
"`;
    const result = await execInToolbox(command, 2e4);
    if (result.timedOut) {
      return { error: "URL fetch timed out after 20 seconds" };
    }
    if (result.exitCode !== 0 && !result.stdout) {
      return { error: `Fetch failed: ${result.stderr || "unknown error"}` };
    }
    const content = result.stdout.trim();
    if (!content) {
      return { error: "No content retrieved from URL" };
    }
    return { url, content, length: content.length };
  }
};

// src/lib/tools/tools/file-read.ts
init_executor();
var fileReadTool = {
  name: "file_read",
  description: "Read a file from the shared workspace. Returns the file contents as text. Accepts concrete file paths only; use bash to list directories before reading files. /workspace/projects is the product workspace root. /workspace/projects/subcorp is the Subcorp source checkout. /workspace/output is the artifact output root. /workspace/agents is the agent state root. Do not use /workspace/src; it is not a valid source path.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: 'File path relative to /workspace (e.g., "data/report.md")'
      },
      max_lines: {
        type: "number",
        description: "Maximum lines to read (default: all)"
      }
    },
    required: ["path"]
  },
  execute: async (params) => {
    const rawPath = params.path;
    const maxLines = params.max_lines;
    if (rawPath.includes("..")) {
      return { error: "Invalid path: path traversal sequences (..) are not allowed" };
    }
    const fullPath = rawPath.startsWith("/workspace/") ? rawPath : `/workspace/${rawPath}`;
    const quotedPath = `'${fullPath.replace(/'/g, "'\\''")}'`;
    let command = `[ -d ${quotedPath} ] && { printf 'path is a directory'; exit 21; }; [ -f ${quotedPath} ] || { printf 'file does not exist'; exit 22; }; cat ${quotedPath}`;
    if (maxLines) {
      command = `[ -d ${quotedPath} ] && { printf 'path is a directory'; exit 21; }; [ -f ${quotedPath} ] || { printf 'file does not exist'; exit 22; }; head -n ${maxLines} ${quotedPath}`;
    }
    const result = await execInToolbox(command, 1e4);
    if (result.exitCode !== 0) {
      return {
        error: `File read failed: ${result.stderr || result.stdout || "file not found"}${pathHintForMissingWorkspacePath(rawPath)}`
      };
    }
    return { path: fullPath, content: result.stdout, lines: result.stdout.split("\n").length };
  }
};
function pathHintForMissingWorkspacePath(rawPath) {
  if (rawPath.endsWith("/")) {
    return " Hint: file_read only accepts concrete file paths, not directories. Use bash to list the directory, then call file_read on specific files.";
  }
  if (rawPath.startsWith("/workspace/src") || rawPath.startsWith("src/")) {
    return " Hint: /workspace/src does not exist. Use /workspace/projects/subcorp/src for Subcorp source, or /workspace/projects/<project>/src for product code.";
  }
  if (rawPath.startsWith("/workspace/projects/") || rawPath.startsWith("projects/")) {
    return " Hint: verify the project slug under /workspace/projects before reading files; use /workspace/projects/subcorp for the Subcorp checkout.";
  }
  return "";
}

// src/lib/tools/tools/file-write.ts
init_executor();
var import_node_crypto = require("node:crypto");
init_db();
var import_node_path = __toESM(require("node:path"));
init_logger();
init_cache_key();
var WRITE_ACLS = {
  chora: [],
  subrosa: [],
  thaum: [],
  praxis: ["agents/praxis/", "output/", "shared/", "projects/"],
  mux: ["agents/mux/", "output/", "shared/", "projects/"],
  primus: ["agents/primus/", "output/", "shared/", "projects/"]
};
var log25 = createLogger({ service: "file_write" });
var DROID_PREFIX = "droids/";
function isPathAllowed(agentId, relativePath) {
  if (agentId.startsWith("droid-")) {
    return relativePath.startsWith(`${DROID_PREFIX}${agentId}/`);
  }
  const acls = WRITE_ACLS[agentId];
  if (!acls) return false;
  return acls.some((prefix) => relativePath.startsWith(prefix));
}
var GRANT_CACHE_TTL_MS = 3e4;
var grantCache = /* @__PURE__ */ new Map();
async function getActiveGrants(agentId) {
  const cacheKey = tenantCacheKey("acl-grants", agentId);
  const cached = grantCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GRANT_CACHE_TTL_MS) {
    return cached.prefixes;
  }
  const rows = await sql`
        SELECT path_prefix FROM ops_acl_grants
        WHERE agent_id = ${agentId} AND expires_at > NOW()
    `;
  const prefixes = rows.map((r) => r.path_prefix);
  grantCache.set(cacheKey, { prefixes, ts: Date.now() });
  return prefixes;
}
async function isPathAllowedWithGrants(agentId, relativePath) {
  if (isPathAllowed(agentId, relativePath)) return true;
  try {
    const grants = await getActiveGrants(agentId);
    return grants.some((prefix) => relativePath.startsWith(prefix));
  } catch (grantErr) {
    log25.warn("ACL grant lookup failed (non-fatal)", {
      error: grantErr,
      agentId,
      relativePath
    });
    return false;
  }
}
function forbiddenWorkspaceProjectRootWritePath(relativePath) {
  if (/^shared\/manifests(?:\/|$)/i.test(relativePath)) {
    return "trusted artifact manifests are orchestrator-managed and cannot be written through file_write";
  }
  const outputProjectsTarget = /^output\/projects\//i;
  if (outputProjectsTarget.test(relativePath)) {
    return "product code writes must not be placed under /workspace/output/projects; use a mission-specific /workspace/projects/<slug>/ directory for code and output/reports or output/reviews for artifacts";
  }
  if (/^projects\/agents\//i.test(relativePath)) {
    return "agent notes and inbox handoffs must be written under agents/<agent>/, not /workspace/projects/agents";
  }
  const directProjectsRootTarget = /^projects\/(?:package\.json|README\.md|app\.py|server\.js|index\.[a-z]+|src(?:\/|$)|tests?(?:\/|$)|config(?:\/|$))/i;
  if (directProjectsRootTarget.test(relativePath)) {
    return "product code writes must target a mission-specific /workspace/projects/<slug>/ directory, not /workspace/projects root";
  }
  return null;
}
function createFileWriteExecute(agentId) {
  return async (params) => {
    const rawPath = params.path;
    const content = params.content;
    const append = params.append ?? false;
    if (rawPath.includes("..")) {
      return {
        error: "Invalid path: path traversal sequences (..) are not allowed"
      };
    }
    const normalizedPath = import_node_path.default.normalize(rawPath);
    const relativePath = normalizedPath.startsWith("/workspace/") ? normalizedPath.replace("/workspace/", "") : normalizedPath.startsWith("/") ? normalizedPath.slice(1) : normalizedPath;
    const fullPath = import_node_path.default.resolve("/workspace", relativePath);
    if (!fullPath.startsWith("/workspace/")) {
      return {
        error: "Invalid path: must be within /workspace/"
      };
    }
    if (!await isPathAllowedWithGrants(agentId, relativePath)) {
      return {
        error: `Access denied: ${agentId} cannot write to ${relativePath}. Check your designated write paths.`
      };
    }
    const workspaceProjectRootWrite = forbiddenWorkspaceProjectRootWritePath(relativePath);
    if (workspaceProjectRootWrite) {
      return { error: workspaceProjectRootWrite, denied: true, policy: "workspace_project_root_boundary" };
    }
    const b64 = Buffer.from(content).toString("base64");
    const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
    const op = append ? ">>" : ">";
    const escapedDir = dir.replace(/'/g, "'\\''");
    const escapedPath = fullPath.replace(/'/g, "'\\''");
    const command = `mkdir -p '${escapedDir}' && echo '${b64}' | base64 -d ${op} '${escapedPath}' && chmod 0644 '${escapedPath}'`;
    const result = await execInToolbox(command, 1e4);
    if (result.exitCode !== 0) {
      return { error: `File write failed: ${result.stderr || "unknown error"}` };
    }
    return relativePath.startsWith("output/") ? { path: fullPath, bytes: content.length, appended: append, artifact_id: (0, import_node_crypto.randomUUID)() } : { path: fullPath, bytes: content.length, appended: append };
  };
}
var fileWriteTool = {
  name: "file_write",
  description: "Write content to a file in the shared workspace. Creates parent directories if needed. Path access is restricted by agent role.",
  agents: ["praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: 'File path relative to /workspace (e.g., "output/reports/2026-02-13__research__brief__topic__chora__v01.md")'
      },
      content: {
        type: "string",
        description: "The content to write to the file"
      },
      append: {
        type: "boolean",
        description: "If true, append to file instead of overwriting (default false)"
      }
    },
    required: ["path", "content"]
  },
  // Default execute explicitly fails — tool must be bound to an agentId via registry
  execute: async () => {
    return {
      error: "file_write tool must be bound to an agent ID. This tool should only be used through the registry with getAgentTools() or getDroidTools()."
    };
  }
};

// src/lib/tools/tools/send-to-agent.ts
init_executor();
var sendToAgentTool = {
  name: "send_to_agent",
  description: "Send a message or file to another agent by writing to their inbox. The file will appear in /workspace/agents/{target}/inbox/.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      target_agent: {
        type: "string",
        description: "The agent to send to (chora, subrosa, thaum, praxis, mux, primus)",
        enum: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"]
      },
      filename: {
        type: "string",
        description: 'Filename for the message (e.g., "request-review.md")'
      },
      content: {
        type: "string",
        description: "The content of the message or file"
      }
    },
    required: ["target_agent", "filename", "content"]
  },
  execute: async (params) => {
    const target = params.target_agent;
    const filename = params.filename;
    const content = params.content;
    const validAgents = ["chora", "subrosa", "thaum", "praxis", "mux", "primus"];
    if (!validAgents.includes(target)) {
      return { error: `Invalid target agent: ${target}` };
    }
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fullPath = `/workspace/agents/${target}/inbox/${safeName}`;
    const b64 = Buffer.from(content).toString("base64");
    const dir = `/workspace/agents/${target}/inbox`;
    const command = `mkdir -p '${dir}' && echo '${b64}' | base64 -d > '${fullPath}' && chmod 0644 '${fullPath}'`;
    const result = await execInToolbox(command, 1e4);
    if (result.exitCode !== 0) {
      return { error: `Send failed: ${result.stderr || "unknown error"}` };
    }
    return { sent_to: target, path: fullPath, bytes: content.length };
  }
};

// src/lib/tools/tools/spawn-droid.ts
init_db();
init_executor();
var import_node_crypto2 = require("node:crypto");
var MAX_DROID_TIMEOUT = process.env.MAX_DROID_TIMEOUT_SECONDS ? parseInt(process.env.MAX_DROID_TIMEOUT_SECONDS) : 300;
var DEFAULT_DROID_TIMEOUT = process.env.DEFAULT_DROID_TIMEOUT_SECONDS ? parseInt(process.env.DEFAULT_DROID_TIMEOUT_SECONDS) : 120;
function invalidDroidTaskReason(task) {
  if (/\b(?:captcha|CAPTCHA|captcha solver|solve captcha|bypass captcha)\b/i.test(task)) {
    return "droid tasks cannot solve or bypass CAPTCHA-gated sources; ask for an alternate accessible source or mark the source as unavailable";
  }
  if (/\b(?:bash|shell commands?|shell audit|run shell|mkdir|cat\s*>|tee\s+|echo\s+.*>|redirection)\b/i.test(task)) {
    return "droid tasks cannot require bash, shell audit, shell commands, or shell redirection";
  }
  if (/(?:\/workspace\/)?projects(?:\/|\b)/i.test(task) && /\b(?:explore|survey|list|enumerate|walk|map|scan)\b/i.test(task) && /\b(?:recursively|recursive|entire|tree|directory|directories|every file|all files)\b/i.test(task)) {
    return "droid tasks cannot recursively list /workspace/projects because droids have no directory listing tool; parent agents must enumerate concrete files first or run the audit themselves";
  }
  if (/(?:\/workspace\/)?(?:output|projects|agents)\/[\w./-]+/i.test(task) && /\b(?:write|create|modify|edit|save|add|update|rewrite|patch|fix|implement)\b/i.test(task)) {
    return "droid tasks cannot modify /workspace/output, /workspace/projects, or /workspace/agents paths; ask the droid for a draft/patch and promote it from the parent agent";
  }
  if (/\b(?:write|create|modify|edit|save)\b[^\n]{0,120}(?:\/workspace\/)?(?:output|projects|agents)\//i.test(task)) {
    return "droid tasks cannot write outside their droids/<id>/ workspace; ask the droid for a draft/patch and promote it from the parent agent";
  }
  if (/(?:\/workspace\/)?(?:output|projects|agents)\/[\w./-]+[^\n]{0,80}\b(?:before|after|when done|as output|output path)\b/i.test(task)) {
    return "droid output must stay under droids/<id>/; parent agents must write promoted artifacts";
  }
  return null;
}
var spawnDroidTool = {
  name: "spawn_droid",
  description: "Spawn a droid (sub-agent) to handle a focused task asynchronously. The droid runs as an agent session with its own workspace under /workspace/droids/. Returns only a queued droid_id/session_id/output_path handle. Do not cite, summarize, or use the droid output as evidence until check_droid returns status=succeeded with output_preview.",
  agents: [...ALL_AGENTS],
  parameters: {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Clear description of what the droid should do"
      },
      output_path: {
        type: "string",
        description: 'Where the droid should write results relative to its droid workspace (e.g., "report.md"). This expected path is not evidence that the file exists; call check_droid and wait for status=succeeded before using it.'
      },
      timeout_seconds: {
        type: "number",
        description: `Max execution time in seconds (default ${DEFAULT_DROID_TIMEOUT}, max ${MAX_DROID_TIMEOUT})`
      }
    },
    required: ["task"]
  },
  execute: async (params) => {
    const task = params.task;
    const rawOutputFilename = params.output_path ?? "output.md";
    const invalidTaskReason = invalidDroidTaskReason(task);
    if (invalidTaskReason) {
      return {
        error: invalidTaskReason,
        denied: true,
        policy: "droid_workspace_boundary"
      };
    }
    const outputFilename = rawOutputFilename.replace(/\.\./g, "").replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^[._-]+/, "").slice(0, 128);
    const safeOutputFilename = outputFilename || "output.md";
    const timeout = Math.min(
      params.timeout_seconds ?? DEFAULT_DROID_TIMEOUT,
      MAX_DROID_TIMEOUT
    );
    const droidId = `droid-${(0, import_node_crypto2.randomUUID)().slice(0, 8)}`;
    const droidDir = `/workspace/droids/${droidId}`;
    const outputPath = `droids/${droidId}/${safeOutputFilename}`;
    try {
      await execInToolbox(`mkdir -p '${droidDir}/output'`, 5e3);
      const taskContent = `# Droid Task

ID: ${droidId}
Created: ${(/* @__PURE__ */ new Date()).toISOString()}

## Task

${task}

## Output

Write results to: ${outputPath}
`;
      const b64 = Buffer.from(taskContent).toString("base64");
      await execInToolbox(`echo '${b64}' | base64 -d > '${droidDir}/task.md' && chmod 0644 '${droidDir}/task.md'`, 5e3);
    } catch {
      return { error: "Failed to create droid workspace" };
    }
    const prompt = `You are a droid (focused sub-agent) with ID: ${droidId}.

## Your Task
${task}

## Security Boundaries
- You can ONLY write files to droids/${droidId}/ using file_write
- You can read any file in /workspace/ using file_read
- You can use web_search and web_fetch as needed
- You cannot use bash or shell redirection; use file_read/file_write only for workspace files
- You CANNOT write to /workspace/output/ directly \u2014 your parent agent must promote your work
- You CANNOT modify /workspace/projects/ source code \u2014 write patches to your droid workspace

- If the task asks you to use shell commands or write outside droids/${droidId}/, refuse and write a boundary note to ${outputPath}

## Output
Write your results to ${outputPath} using file_write.
When done, provide a clear summary of what you accomplished.
`;
    try {
      const [session] = await sql`
                INSERT INTO ops_agent_sessions (
                    agent_id, prompt, source, source_id,
                    timeout_seconds, max_tool_rounds, status,
                    result
                ) VALUES (
                    ${droidId},
                    ${prompt},
                    'droid',
                    ${droidId},
                    ${timeout},
                    30,
                    'pending',
                    ${sql.json({ droid_id: droidId, output_path: outputPath })}::jsonb
                )
                RETURNING id
            `;
      return {
        droid_id: droidId,
        session_id: session.id,
        status: "spawned",
        workspace: droidDir,
        output_path: outputPath,
        async: true,
        evidence_ready: false,
        next_step: `Call check_droid with droid_id ${droidId}; do not cite or depend on ${outputPath} until check_droid returns status=succeeded with output_preview.`
      };
    } catch (err) {
      return { error: `Failed to spawn droid: ${err.message}` };
    }
  }
};

// src/lib/tools/tools/check-droid.ts
init_db();
init_executor();
var checkDroidTool = {
  name: "check_droid",
  description: "Check the status and output of a previously spawned droid. Returns status, output summary, and file listing.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      droid_id: {
        type: "string",
        description: 'The droid ID returned by spawn_droid (e.g., "droid-a1b2c3d4")'
      }
    },
    required: ["droid_id"]
  },
  execute: async (params) => {
    const droidId = params.droid_id;
    const droidIdRegex = /^droid-[0-9a-f]{8}$/;
    if (!droidIdRegex.test(droidId)) {
      return { error: 'Invalid droid ID format. Expected "droid-<8-hex-chars>".' };
    }
    const [session] = await sql`
            SELECT id, status, result, error, completed_at
            FROM ops_agent_sessions
            WHERE source = 'droid' AND source_id = ${droidId}
            ORDER BY created_at DESC
            LIMIT 1
        `;
    if (!session) {
      return { error: `No droid found with ID: ${droidId}` };
    }
    const droidDir = `/workspace/droids/${droidId}`;
    const lsResult = await execInToolbox(`ls -la '${droidDir}/' 2>/dev/null || echo "(empty)"`, 5e3);
    let outputContent = null;
    const outputPath = session.result?.output_path;
    if (outputPath && session.status === "succeeded") {
      const safePath = outputPath.replace(/\.\./g, "").replace(/\/+/g, "/").replace(/^\//, "");
      if (safePath.startsWith("droids/") && !safePath.includes("..") && !safePath.includes("//")) {
        const readResult = await execInToolbox(
          `cat '/workspace/${safePath}' 2>/dev/null | head -c 5000`,
          5e3
        );
        if (readResult.exitCode === 0 && readResult.stdout.trim()) {
          outputContent = readResult.stdout.trim();
        }
      }
    }
    return {
      droid_id: droidId,
      session_id: session.id,
      status: session.status,
      error: session.error,
      completed_at: session.completed_at,
      files: lsResult.stdout.trim(),
      output_preview: outputContent?.slice(0, 2e3) ?? null,
      output_path: outputPath ?? null
    };
  }
};

// src/lib/tools/tools/memory-search.ts
init_db();
init_logger();
init_embeddings();
var log26 = logger.child({ module: "memory-search" });
var memorySearchTool = {
  name: "memory_search",
  description: "Search agent memories using semantic similarity. Returns relevant memories from any agent.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search for in agent memories"
      },
      agent_id: {
        type: "string",
        description: "Filter to a specific agent (optional)"
      },
      limit: {
        type: "number",
        description: "Maximum results (default 25, max 250)"
      }
    },
    required: ["query"]
  },
  execute: async (params) => {
    const query = params.query;
    const agentId = params.agent_id;
    const requestedLimit = Number(params.limit) || 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 250);
    const embedding = await getEmbedding(query);
    if (embedding) {
      try {
        const vectorStr = `[${embedding.join(",")}]`;
        const rows2 = await sql`
                    SELECT id, agent_id, type, content, confidence, tags, created_at,
                           1 - (embedding <=> ${vectorStr}::vector) as similarity
                    FROM ops_agent_memory
                    WHERE superseded_by IS NULL
                    ${agentId ? sql`AND agent_id = ${agentId}` : sql``}
                    AND embedding IS NOT NULL
                    ORDER BY embedding <=> ${vectorStr}::vector
                    LIMIT ${limit}
                `;
        return {
          results: rows2.map((r) => ({
            agent: r.agent_id,
            type: r.type,
            content: r.content,
            confidence: r.confidence,
            tags: r.tags,
            similarity: Math.round(r.similarity * 100) / 100,
            created_at: r.created_at
          })),
          method: "vector",
          count: rows2.length
        };
      } catch (err) {
        log26.warn("Vector search failed, falling back to text", { error: err });
      }
    }
    const rows = await sql`
            SELECT id, agent_id, type, content, confidence, tags, created_at
            FROM ops_agent_memory
            WHERE superseded_by IS NULL
            ${agentId ? sql`AND agent_id = ${agentId}` : sql``}
            AND content ILIKE ${"%" + query + "%"}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
    return {
      results: rows.map((r) => ({
        agent: r.agent_id,
        type: r.type,
        content: r.content,
        confidence: r.confidence,
        tags: r.tags,
        created_at: r.created_at
      })),
      method: "text",
      count: rows.length
    };
  }
};

// src/lib/tools/tools/memory-write.ts
init_memory();
var VALID_MEMORY_TYPES2 = [
  "insight",
  "pattern",
  "strategy",
  "preference",
  "lesson"
];
function createMemoryWriteExecute(agentId) {
  return async (params) => {
    const type = params.type;
    const content = params.content;
    const confidence = params.confidence ?? 0.7;
    const tagsStr = params.tags ?? "";
    if (!VALID_MEMORY_TYPES2.includes(type)) {
      return {
        error: `Invalid type "${type}". Must be one of: ${VALID_MEMORY_TYPES2.join(", ")}`
      };
    }
    if (!content || content.trim().length === 0) {
      return { error: "Content cannot be empty" };
    }
    if (content.length > 200) {
      return {
        error: `Content too long (${content.length} chars). Max 200.`
      };
    }
    if (confidence < 0.4 || confidence > 1) {
      return { error: "Confidence must be between 0.4 and 1.0" };
    }
    const tags = tagsStr.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
    const id = await writeMemory({
      agent_id: agentId,
      type,
      content: content.trim(),
      confidence,
      tags,
      source_trace_id: `self:${agentId}:${Date.now()}`
    });
    if (id) {
      await enforceMemoryCap(agentId);
      return { written: true, memory_id: id };
    }
    return {
      written: false,
      reason: "Duplicate or below confidence threshold"
    };
  };
}
var memoryWriteTool = {
  name: "memory_write",
  description: "Write a memory that will persist across all future sessions. Use when something important comes up that you want to remember long-term. Memories are typed (insight, pattern, strategy, preference, lesson) and tagged for retrieval.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        description: "Memory type: insight (observation), pattern (recurring theme), strategy (approach), preference (value/style), lesson (learned from experience)",
        enum: VALID_MEMORY_TYPES2
      },
      content: {
        type: "string",
        description: "What to remember. Max 200 characters. Be concise and specific."
      },
      confidence: {
        type: "number",
        description: "How confident you are (0.4-1.0). Higher = more certain."
      },
      tags: {
        type: "string",
        description: 'Comma-separated tags for retrieval (e.g. "governance,user,preference")'
      }
    },
    required: ["type", "content"]
  }
};

// src/lib/tools/tools/scratchpad.ts
init_scratchpad();
function createScratchpadReadExecute(agentId) {
  return async () => {
    const content = await getScratchpad(agentId);
    return {
      content: content || "(empty \u2014 write your first scratchpad entry)",
      length: content.length
    };
  };
}
function createScratchpadUpdateExecute(agentId) {
  return async (params) => {
    const content = params.content;
    if (!content || content.trim().length === 0) {
      return { error: "Content cannot be empty" };
    }
    return updateScratchpad(agentId, content);
  };
}
var scratchpadReadTool = {
  name: "scratchpad_read",
  description: "Read your working memory scratchpad. Returns your current notes, priorities, and context that persists between sessions.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {},
    required: []
  }
};
var scratchpadUpdateTool = {
  name: "scratchpad_update",
  description: "Update your working memory scratchpad. Use this to maintain notes, track priorities, record hypotheses, and keep context between sessions. Max 2000 characters. This REPLACES your entire scratchpad \u2014 include everything you want to keep.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      content: {
        type: "string",
        description: "Your full scratchpad content (markdown). Include current focus, active threads, hypotheses, and notes to self."
      }
    },
    required: ["content"]
  }
};

// src/lib/tools/tools/propose-policy-change.ts
init_governance();
init_logger();
var log27 = logger.child({ module: "propose-policy-change" });
function createProposePolicyChangeExecute(agentId) {
  return async (params) => {
    const policyKey = params.policy_key;
    const proposedValue = params.proposed_value;
    const rationale = params.rationale;
    try {
      const proposalId = await proposeGovernanceChange(
        agentId,
        policyKey,
        proposedValue,
        rationale
      );
      log27.info("Governance proposal created via tool", {
        proposalId,
        agentId,
        policyKey
      });
      return {
        success: true,
        proposal_id: proposalId,
        message: `Governance proposal created. A debate session will be scheduled with all agents to discuss this policy change. 4 out of 6 approvals required.`
      };
    } catch (err) {
      const error = err;
      log27.error("Failed to create governance proposal", {
        error: error.message,
        agentId,
        policyKey
      });
      return {
        success: false,
        error: error.message,
        message: `Failed to create proposal: ${error.message}`
      };
    }
  };
}
var proposePolicyChangeTool = {
  name: "propose_policy_change",
  description: "Propose a change to a system policy. This will trigger a governance debate where all agents vote on the proposal. Requires 4/6 agent approval to pass.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      policy_key: {
        type: "string",
        description: 'The policy key to change (e.g., "auto_approve", "x_daily_quota", "content_policy"). Note: "system_enabled" is protected and cannot be changed.'
      },
      proposed_value: {
        type: "object",
        description: "The new value for the policy as a JSON object. Must match the expected structure for that policy."
      },
      rationale: {
        type: "string",
        description: "Clear explanation of why this policy change is needed and what problem it solves. This will be shared in the governance debate."
      }
    },
    required: ["policy_key", "proposed_value", "rationale"]
  },
  // Execute will be bound per-agent via createProposePolicyChangeExecute in registry
  execute: createProposePolicyChangeExecute("system")
};

// src/lib/tools/tools/propose-mission.ts
init_proposal_service();
init_logger();
var log28 = logger.child({ module: "propose-mission" });
function createProposeMissionExecute(agentId, sessionId) {
  return async (params) => {
    const title = params.title;
    const description = params.description ?? "";
    const steps = params.steps;
    if (!title || !steps || !Array.isArray(steps) || steps.length === 0) {
      return {
        success: false,
        error: "title and steps (non-empty array) are required"
      };
    }
    try {
      const result = await createProposalAndMaybeAutoApprove({
        agent_id: agentId,
        title,
        description,
        proposed_steps: steps.map((s) => ({
          kind: s.kind,
          payload: s.payload
        })),
        source: "agent",
        source_trace_id: sessionId
      });
      log28.info("Mission proposal created via tool", {
        proposalId: result.proposalId,
        missionId: result.missionId,
        agentId,
        autoApproved: !!result.missionId
      });
      if (result.missionId) {
        return {
          success: true,
          proposal_id: result.proposalId,
          mission_id: result.missionId,
          message: `Mission proposal auto-approved and mission created. Steps will be executed by the worker.`
        };
      }
      return {
        success: true,
        proposal_id: result.proposalId,
        message: `Mission proposal created and awaiting review. Step kinds not in the auto-approve list require manual approval.`
      };
    } catch (err) {
      const error = err;
      log28.error("Failed to create mission proposal", {
        error: error.message,
        agentId,
        title
      });
      return {
        success: false,
        error: error.message,
        message: `Failed to create proposal: ${error.message}`
      };
    }
  };
}
var proposeMissionTool = {
  name: "propose_mission",
  description: "Propose a mission with concrete steps. Call at most once per session \u2014 consolidate multiple ideas into one mission with multiple steps. If all step kinds are auto-approvable, the mission executes immediately; otherwise it goes to review.",
  agents: [...ALL_AGENTS],
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: 'A clear, actionable mission title (e.g., "Build diagnostic engine MVP")'
      },
      description: {
        type: "string",
        description: "Why this mission matters and what it accomplishes"
      },
      steps: {
        type: "array",
        description: "Concrete steps to execute. Each step has a kind and optional payload.",
        items: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              description: "Step kind: research_topic, scan_signals, draft_essay, draft_thread, patch_code, audit_system, critique_content, distill_insight, document_lesson, consolidate_memory, memory_archaeology"
            },
            payload: {
              type: "object",
              description: 'Step-specific payload (e.g., { "topic": "..." } for research_topic, code change description for patch_code)'
            }
          },
          required: ["kind"]
        }
      }
    },
    required: ["title", "steps"]
  },
  // Execute will be bound per-agent via createProposeMissionExecute in registry
  execute: createProposeMissionExecute("system")
};

// src/lib/tools/tools/cast-veto.ts
init_veto();
init_logger();
var log29 = logger.child({ module: "cast-veto" });
var VETO_TARGET_TYPES = /* @__PURE__ */ new Set(["proposal", "mission", "governance", "step"]);
var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalidVetoTargetReason(targetType, targetId) {
  if (!VETO_TARGET_TYPES.has(targetType)) {
    return "cast_veto target_type must be one of proposal, mission, governance, or step; use send_to_agent for file review requests";
  }
  if (!UUID_PATTERN.test(targetId)) {
    return "cast_veto target_id must be the UUID of an existing proposal, mission, governance item, or step; do not pass file paths or filenames";
  }
  return null;
}
function createCastVetoExecute(agentId) {
  return async (params) => {
    const targetType = params.target_type;
    const targetId = params.target_id;
    const reason = params.reason;
    const invalidTargetReason = invalidVetoTargetReason(targetType, targetId);
    if (invalidTargetReason) {
      log29.warn("Rejected invalid veto target before database write", {
        agentId,
        targetType,
        targetId,
        reason: invalidTargetReason
      });
      return {
        success: false,
        error: invalidTargetReason,
        denied: true,
        policy: "veto_target_uuid_required",
        message: invalidTargetReason
      };
    }
    try {
      const { vetoId, severity } = await castVeto(
        agentId,
        targetType,
        targetId,
        reason
      );
      log29.info("Veto cast via tool", {
        vetoId,
        agentId,
        targetType,
        targetId,
        severity
      });
      return {
        success: true,
        veto_id: vetoId,
        severity,
        message: severity === "binding" ? `Binding veto issued. The ${targetType} has been halted immediately.` : `Soft veto issued. The ${targetType} has been flagged for review.`
      };
    } catch (err) {
      const error = err;
      log29.error("Failed to cast veto", {
        error: error.message,
        agentId,
        targetType,
        targetId
      });
      return {
        success: false,
        error: error.message,
        message: `Failed to cast veto: ${error.message}`
      };
    }
  };
}
var castVetoTool = {
  name: "cast_veto",
  description: "Cast a veto on a proposal, mission, governance change, or step. Subrosa casts binding vetoes (immediate halt). Other agents cast soft vetoes (flags for review). Use this when you believe an action should be stopped or reviewed before proceeding.",
  agents: ["chora", "subrosa", "thaum", "praxis", "mux", "primus"],
  parameters: {
    type: "object",
    properties: {
      target_type: {
        type: "string",
        enum: ["proposal", "mission", "governance", "step"],
        description: "The type of target to veto"
      },
      target_id: {
        type: "string",
        description: "The UUID of the target to veto"
      },
      reason: {
        type: "string",
        description: "Clear explanation of why this veto is being cast. Be specific about the concern."
      }
    },
    required: ["target_type", "target_id", "reason"]
  },
  execute: createCastVetoExecute("system")
};

// src/lib/tools/registry.ts
init_executor();
var ALL_TOOLS = [
  bashTool,
  webSearchTool,
  webFetchTool,
  fileReadTool,
  fileWriteTool,
  sendToAgentTool,
  spawnDroidTool,
  checkDroidTool,
  memorySearchTool,
  memoryWriteTool,
  scratchpadReadTool,
  scratchpadUpdateTool,
  proposePolicyChangeTool,
  proposeMissionTool,
  castVetoTool
];
function getAgentTools(agentId, sessionId) {
  return ALL_TOOLS.filter((tool) => tool.agents.includes(agentId)).filter((tool) => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name)).map(({ agents: _agents, ...tool }) => {
    if (tool.name === "file_write") {
      return { ...tool, execute: createFileWriteExecute(agentId) };
    }
    if (tool.name === "propose_policy_change") {
      return {
        ...tool,
        execute: createProposePolicyChangeExecute(agentId)
      };
    }
    if (tool.name === "propose_mission") {
      return {
        ...tool,
        execute: createProposeMissionExecute(agentId, sessionId)
      };
    }
    if (tool.name === "cast_veto") {
      return {
        ...tool,
        execute: createCastVetoExecute(agentId)
      };
    }
    if (tool.name === "memory_write") {
      return { ...tool, execute: createMemoryWriteExecute(agentId) };
    }
    if (tool.name === "scratchpad_read") {
      return { ...tool, execute: createScratchpadReadExecute(agentId) };
    }
    if (tool.name === "scratchpad_update") {
      return { ...tool, execute: createScratchpadUpdateExecute(agentId) };
    }
    return tool;
  });
}
function getDroidTools(droidId) {
  const droidToolNames = ["file_read", "file_write", "web_search", "web_fetch"];
  return ALL_TOOLS.filter((tool) => droidToolNames.includes(tool.name)).filter((tool) => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name)).map(({ agents: _agents, ...tool }) => {
    if (tool.name === "file_write") {
      return { ...tool, execute: createFileWriteExecute(droidId) };
    }
    return tool;
  });
}
function getAgentToolNames(agentId) {
  return ALL_TOOLS.filter((tool) => tool.agents.includes(agentId)).filter((tool) => dockerBackedToolsEnabled() || !DOCKER_BACKED_TOOL_NAMES.has(tool.name)).map((tool) => tool.name);
}
function getAgentWritePaths(agentId) {
  if (!dockerBackedToolsEnabled()) return [];
  if (!fileWriteTool.agents.includes(agentId)) return [];
  return WRITE_ACLS[agentId] ?? [];
}

// src/lib/tools/agent-session.ts
init_executor();
init_events2();
init_memory();
init_scratchpad();
init_situational_briefing();
init_prime_directive();

// src/lib/ops/claim-evidence.ts
var GROUNDING_MARKER = /^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im;
var SECTION_BOUNDARY = /^#{1,4}\s+\S|^\*\*[A-Z][^*]{1,80}:?\*\*\s*$|^[A-Z][\w /-]{1,80}\s*:\s*$/im;
function stripGroundingSection(text) {
  const marker = text.match(GROUNDING_MARKER);
  if (!marker || marker.index === void 0) return text;
  const before = text.slice(0, marker.index);
  const tail = text.slice(marker.index);
  const afterMarker = tail.slice(marker[0].length);
  const boundary = afterMarker.search(SECTION_BOUNDARY);
  if (boundary >= 0) return before + tail.slice(marker[0].length + boundary);
  if (marker[0].startsWith("#")) return before;
  const blankLine = afterMarker.search(/\n\s*\n/);
  if (blankLine >= 0) return before + afterMarker.slice(blankLine);
  return before;
}
function isExplicitlyNonFactual(line) {
  return /\b(?:target|proposed|proposal|hypothesis|hypothesize|assumption|assumed|illustrative|example|to verify|needs verification|open question|planned|candidate|recommended|should|will|must be implemented|must implement)\b/i.test(line);
}
function hasLineLevelEvidence(line) {
  return /(?:\bfile_read\b|\bbash\b|\bweb_fetch\b|\bweb_search\b|https?:\/\/|\/workspace\/|\boutput\/|\bagents\/|\bprojects\/|\bsrc\/|\blib\/|\bapp\/|\bSELECT\b|\bDB row\b|\[[^\]]+\]|\((?:source|evidence|ref)\s*:)/i.test(line);
}
function isHighRiskFactualLine(line) {
  return /(?:\b\d+(?:\.\d+)?\s?%\b|\$\s?\d|\b\d+x\b|\b\d+\s*(?:ms|s|seconds|minutes|hours|days|rps|qps|requests per second)\b|\b(?:verified|observed|achieved|completed|implemented|approved|documented|resolved|delivered|reduced|increased|improved|validated)\b|\b(?:GDPR|CCPA|SOC\s?2|ISO\s?27001|HIPAA|compliant|compliance|encryption|encrypted|anonymization|security)\b|(?:^|\s)(?:src|lib|app|server|config|models|routes|database|platform)\/[\w./-]+|\b[a-zA-Z_$][\w$]+\(\))/i.test(line);
}
function unsupportedHighRiskClaimLines(text) {
  return stripGroundingSection(text).split("\n").map((line) => line.trim()).filter((line) => line.length > 0).filter((line) => !/^#{1,6}\s+\S/.test(line)).filter((line) => !/^[-*_]{3,}$/.test(line)).filter((line) => !/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line)).filter((line) => isHighRiskFactualLine(line)).filter((line) => !isExplicitlyNonFactual(line)).filter((line) => !hasLineLevelEvidence(line));
}

// src/lib/tools/agent-session.ts
var import_node_crypto3 = require("node:crypto");
init_logger();
var log30 = logger.child({ module: "agent-session" });
var SESSION_SOFT_DEADLINE_BUFFER_MS = 9e4;
var TOOL_RESULT_MAX_LENGTH = 5e3;
var MAX_CONSECUTIVE_EMPTY_ROUNDS = 3;
var MEMORY_PREVIEW_LENGTH = 200;
var SESSION_SUMMARY_PREVIEW_LENGTH = 300;
function readPositiveIntEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
var AGENT_SESSION_MAX_TOKENS = readPositiveIntEnv("AGENT_SESSION_MAX_TOKENS", 6e3);
var AGENT_SESSION_MAX_TOOL_ROUNDS = readPositiveIntEnv("AGENT_SESSION_MAX_TOOL_ROUNDS", 6);
function sanitizeSummary(text) {
  return normalizeDsml(text).replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, "").replace(/\s{2,}/g, " ").trim();
}
function truncateToFirstSentences(text, maxLen) {
  const clean = text.replace(/<\/?[a-z_][a-z0-9_-]*(?:\s[^>]*)?\s*>/gi, "").replace(/^#+\s+.+$/gm, "").replace(/\n{2,}/g, "\n").trim();
  if (clean.length <= maxLen) return clean;
  const truncated = clean.slice(0, maxLen);
  const sentenceEnd = truncated.search(/[.!?][*_)\]]*[\s\n](?=[^\s])[^]*$/);
  if (sentenceEnd > maxLen * 0.3) {
    const endMatch = truncated.slice(sentenceEnd).match(/^[.!?][*_)\]]*/);
    return truncated.slice(0, sentenceEnd + (endMatch?.[0].length ?? 1));
  }
  const lastNewline = truncated.lastIndexOf("\n");
  if (lastNewline > maxLen * 0.5) return truncated.slice(0, lastNewline);
  return truncated + "...";
}
var HARD_BLOCKER_SUMMARY_PATTERNS = [
  /\bcritical blocker\b/i,
  /\bdata dependency blocked\b/i,
  // Negative lookbehind guards against "not blocked by", "never blocked by", "wasn't blocked by", etc.
  /(?<!(?:not|never|no longer|isn't|aren't|wasn't|weren't) )\bblocked by\b/i,
  /\bmission is, by definition, stalled\b/i,
  /\bcannot proceed\b/i,
  /\bcannot continue\b/i,
  /\bcannot be completed\b/i,
  /\bno further (procedural )?steps? (i )?can take\b/i,
  /\bhands are tied\b/i,
  // Negative lookbehind guards against "not stalled by", "never stalled by", etc.
  /(?<!(?:not|never) )\bstalled by\b/i
];
var SOFT_BLOCKER_SUMMARY_PATTERNS = [
  /\bawait(?:ing)? (?:instruction|input|external|data|provisioning)\b/i,
  // Negative lookbehind guards against "not waiting for", "never waiting for", etc.
  /(?<!(?:not|never) )\bwaiting for\b/i,
  /\bpaused pending\b/i
];
var PROGRESS_SUMMARY_PATTERNS = [
  /\bcompleted\b/i,
  /\bfinished\b/i,
  /\bgenerated\b/i,
  /\bproduced\b/i,
  /\bcreated\b/i,
  /\bdrafted\b/i,
  /\bwrote\b/i,
  /\bupdated\b/i,
  /\bpublished\b/i,
  /\bposted\b/i,
  /\bsent\b/i,
  /\bdelivered\b/i,
  /\bfetched\b/i,
  /\bprocessed\b/i,
  /\bqueued\b/i,
  /\bsaved\b/i,
  /\bsucceeded\b/i,
  /\bsuccessfully\b/i
];
var TOOL_ERROR_PATTERNS = [
  /no such file or directory/i,
  /permission denied/i,
  /access denied/i,
  /file read failed/i,
  /file write failed/i,
  /timed out/i,
  /tool\s+"?.+"?\s+does not exist/i,
  /invalid tool arguments/i
];
var STEP_TOOL_REQUIREMENTS = {
  // Work that must create or modify files.
  patch_code: { allOf: ["file_write"] },
  self_evolution: { allOf: ["bash", "file_write"] },
  draft_essay: { allOf: ["file_write"] },
  draft_thread: { allOf: ["file_write"] },
  draft_product_spec: { allOf: ["file_write"] },
  critique_content: { allOf: ["file_write"] },
  distill_insight: { allOf: ["file_write"] },
  document_lesson: { allOf: ["file_write"] },
  consolidate_memory: { allOf: ["file_write"] },
  content_revision: { allOf: ["file_write"] },
  update_directive: { allOf: ["file_write"] },
  analyze_discourse: { allOf: ["file_write"] },
  classify_pattern: { allOf: ["file_write"] },
  trace_incentive: { allOf: ["file_write"] },
  identify_assumption: { allOf: ["file_write"] },
  refine_narrative: { allOf: ["file_write"] },
  prepare_statement: { allOf: ["file_write"] },
  write_issue: { allOf: ["file_write"] },
  review_policy: { allOf: ["file_write"] },
  map_dependency: { allOf: ["file_write"] },
  log_event: { allOf: ["file_write"] },
  tag_memory: { allOf: ["file_write"] },
  escalate_risk: { allOf: ["file_write"] },
  // Work that must consult external/runtime state.
  research_topic: { allOf: ["web_search"] },
  scan_signals: { allOf: ["web_search"] },
  audit_system: { allOf: ["bash", "file_write"] },
  github_issue: { allOf: ["bash"] },
  github_pr: { allOf: ["bash"] },
  create_pull_request: { allOf: ["bash"] },
  explore_repo: { allOf: ["bash"] },
  publish_blog: { anyOf: ["bash", "file_write"] },
  notify_human: { allOf: ["bash"] }
};
var STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS = /* @__PURE__ */ new Set([
  "document_lesson",
  "draft_product_spec",
  "distill_insight",
  "draft_essay",
  "draft_thread",
  "critique_content",
  "patch_code",
  "content_revision",
  "self_evolution",
  "log_event"
]);
function toolErrorText(result) {
  if (typeof result === "string") return result;
  if (!result || typeof result !== "object") return "";
  const rec = result;
  const err = typeof rec.error === "string" ? rec.error : "";
  const stderr = typeof rec.stderr === "string" ? rec.stderr : "";
  return [err, stderr].filter(Boolean).join("\n");
}
function isSuccessfulToolCall(toolCall) {
  if (toolCall.result === void 0) return false;
  const text = toolErrorText(toolCall.result);
  if (text.length > 0) {
    if (/not available/i.test(text)) return false;
    if (TOOL_ERROR_PATTERNS.some((p) => p.test(text))) return false;
  }
  if (typeof toolCall.result === "object" && toolCall.result !== null) {
    const exitCode = toolCall.result.exitCode;
    if (typeof exitCode === "number" && exitCode !== 0) return false;
    return !(typeof toolCall.result.error === "string");
  }
  return true;
}
function mergeToolRequirements(left, right) {
  return {
    allOf: [.../* @__PURE__ */ new Set([...left.allOf ?? [], ...right.allOf ?? []])],
    anyOf: [.../* @__PURE__ */ new Set([...left.anyOf ?? [], ...right.anyOf ?? []])]
  };
}
function stepKindFromPrompt(prompt) {
  return prompt.match(/^Step:\s*([^\n]+)/m)?.[1]?.trim() ?? null;
}
function inferPromptToolRequirements(prompt) {
  let requirement = {};
  const text = prompt.toLowerCase();
  if (/\bfile_write\b|using file_write|write (?:the |a |your )?[\s\S]*\bto\b/.test(
    text
  )) {
    requirement = mergeToolRequirements(requirement, {
      allOf: ["file_write"]
    });
  }
  if (/\bweb_search\b|search the web|web search/.test(text)) {
    requirement = mergeToolRequirements(requirement, { allOf: ["web_search"] });
  }
  if (requiresExplicitTool(prompt, "web_fetch")) {
    requirement = mergeToolRequirements(requirement, { allOf: ["web_fetch"] });
  }
  if (/\bmemory_search\b/.test(text)) {
    requirement = mergeToolRequirements(requirement, { allOf: ["memory_search"] });
  }
  if (/\bsend_to_agent\b/.test(text)) {
    requirement = mergeToolRequirements(requirement, { allOf: ["send_to_agent"] });
  }
  if (requiresExplicitTool(prompt, "memory_write") && !mentionsOptionalTool(prompt, "memory_write")) {
    requirement = mergeToolRequirements(requirement, { allOf: ["memory_write"] });
  }
  if (/\bbash\b|run system checks|git\s+(?:status|diff|log|push|clone|commit)/.test(
    text
  )) {
    requirement = mergeToolRequirements(requirement, { allOf: ["bash"] });
  }
  return requirement;
}
function requiresExplicitTool(prompt, toolName) {
  const escapedTool = toolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const explicitToolPattern = new RegExp(
    `(?:must|need to|required to|completion contract:[^\\n]*must|you must|call|use)\\s+[^\\n.]{0,80}\\b${escapedTool}\\b`,
    "i"
  );
  return explicitToolPattern.test(prompt);
}
function mentionsOptionalTool(prompt, toolName) {
  const escapedTool = toolName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:optionally|optional|if useful|if helpful)\\s+[^\\n.]{0,80}\\b${escapedTool}\\b`, "i").test(prompt);
}
function requirementsForSession(session) {
  if (!["mission", "cron", "droid"].includes(session.source)) return {};
  const inferred = inferPromptToolRequirements(session.prompt);
  if (session.source !== "mission") return filterUnavailableToolRequirements(session, inferred);
  const stepKind = stepKindFromPrompt(session.prompt);
  if (!stepKind) return filterUnavailableToolRequirements(session, inferred);
  return filterUnavailableToolRequirements(session, mergeToolRequirements(
    inferred,
    STEP_TOOL_REQUIREMENTS[stepKind] ?? {}
  ));
}
function availableToolNamesForSession(session) {
  if (session.agent_id.startsWith("droid-")) {
    return new Set(getDroidTools(session.agent_id).map((t) => t.name));
  }
  return new Set(getAgentToolNames(session.agent_id));
}
function filterUnavailableToolRequirements(session, requirement) {
  const available = availableToolNamesForSession(session);
  return {
    allOf: (requirement.allOf ?? []).filter((name) => available.has(name)),
    anyOf: (requirement.anyOf ?? []).filter((name) => available.has(name))
  };
}
function detectMissingRequiredToolEvidence(session, toolCalls) {
  const requirement = requirementsForSession(session);
  const requiredAll = requirement.allOf ?? [];
  const requiredAny = requirement.anyOf ?? [];
  if (requiredAll.length === 0 && requiredAny.length === 0) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const successfulToolNames = new Set(
    toolCalls.filter(isSuccessfulToolCall).map((tc) => tc.name)
  );
  const missingAll = requiredAll.filter((name) => !successfulToolNames.has(name));
  const missingAny = requiredAny.length > 0 && !requiredAny.some((name) => successfulToolNames.has(name)) ? requiredAny : [];
  const stepKind = stepKindFromPrompt(session.prompt);
  const availableTools = availableToolNamesForSession(session);
  const canSatisfyAuditEvidence = availableTools.has("bash") && availableTools.has("file_write");
  const auditEvidence = canSatisfyAuditEvidence ? detectAuditEvidenceIssues(stepKind, toolCalls) : { blocked: false, evidence: [] };
  const groundingEvidence = detectArtifactGroundingIssues(stepKind, toolCalls);
  if (missingAll.length === 0 && missingAny.length === 0 && !auditEvidence.blocked && !groundingEvidence.blocked) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const evidence = [
    `session source=${session.source}${stepKind ? ` step=${stepKind}` : ""}`,
    `successful tools: ${[...successfulToolNames].join(", ") || "(none)"}`
  ];
  if (missingAll.length > 0) {
    evidence.push(`missing required tool(s): ${missingAll.join(", ")}`);
  }
  if (missingAny.length > 0) {
    evidence.push(
      `missing at least one required tool from: ${missingAny.join(", ")}`
    );
  }
  evidence.push(...auditEvidence.evidence);
  evidence.push(...groundingEvidence.evidence);
  return {
    blocked: true,
    reason: auditEvidence.blocked ? "audit evidence missing" : groundingEvidence.blocked && groundingEvidence.evidence.some((item) => item.includes("artifact grounding invalid")) ? "artifact grounding invalid" : groundingEvidence.blocked ? "artifact grounding missing" : "Required tool evidence missing",
    evidence
  };
}
function detectEmptySessionOutcome(session, text, toolCalls) {
  if (!["mission", "cron", "droid"].includes(session.source)) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const hasText = text.trim().length > 0;
  const successfulToolNames = toolCalls.filter(isSuccessfulToolCall).map((tc) => tc.name);
  if (hasText || successfulToolNames.length > 0) {
    return { blocked: false, reason: "", evidence: [] };
  }
  return {
    blocked: true,
    reason: "empty session output",
    evidence: [
      `session source=${session.source}${stepKindFromPrompt(session.prompt) ? ` step=${stepKindFromPrompt(session.prompt)}` : ""}`,
      "empty session output: no final text and no successful tool calls"
    ]
  };
}
function normalizeWorkspaceRelativePath(path4) {
  return path4.startsWith("/workspace/") ? path4.slice("/workspace/".length) : path4.replace(/^\/+/, "");
}
function droidWritePath(session, path4) {
  const relativePath = normalizeWorkspaceRelativePath(path4);
  return relativePath === `droids/${session.agent_id}` || relativePath.startsWith(`droids/${session.agent_id}/`);
}
function isDroidFinalArtifactPath(session, path4) {
  const relativePath = normalizeWorkspaceRelativePath(path4);
  const expectedOutput = typeof session.result?.output_path === "string" ? normalizeWorkspaceRelativePath(session.result.output_path) : "";
  if (expectedOutput && relativePath === expectedOutput) return true;
  if (!droidWritePath(session, relativePath)) return false;
  const basename = relativePath.split("/").pop() ?? "";
  return /(?:^|[-_])(output|report|result|results|proof|review|summary|artifact)(?:[-_.]|$)/i.test(basename) || /\.md$/i.test(basename);
}
function isPointerOnlyDroidArtifact(content) {
  const normalized = content.trim();
  if (normalized.length === 0) return true;
  if (normalized.length < 120) return true;
  if (/\b(?:todo|placeholder|stub|draft pending|will write|to be completed)\b/i.test(normalized)) return true;
  if (/^(?:see|check|refer to|look at)\s+(?:the\s+)?(?:file|path|output|report)\b/i.test(normalized)) return true;
  if (/^#?\s*(?:output|report|summary|proof)\s*\n+\s*(?:see|todo|placeholder|pending)\b/i.test(normalized)) return true;
  return false;
}
function detectDroidPlaceholderArtifact(session, toolCalls) {
  if (session.source !== "droid" && !session.agent_id.startsWith("droid-")) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const finalArtifactWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    return isDroidFinalArtifactPath(session, path4) && content.trim().length > 0;
  });
  if (finalArtifactWrites.length === 0) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const substantiveWrites = finalArtifactWrites.filter((tc) => {
    const args = tc.arguments;
    const content = typeof args.content === "string" ? args.content : "";
    return content.trim().length >= 120 && !isPointerOnlyDroidArtifact(content);
  });
  if (substantiveWrites.length > 0) {
    return { blocked: false, reason: "", evidence: [] };
  }
  const paths = finalArtifactWrites.map((tc) => String(tc.arguments.path ?? "unknown")).join(", ");
  return {
    blocked: true,
    reason: "droid placeholder artifact",
    evidence: [
      `droid placeholder artifact: ${finalArtifactWrites.length} final/report-like droid write(s) were tiny, TODO/stub, or pointer-only`,
      `droid final artifact path(s): ${paths}`
    ]
  };
}
function missingRequiredToolNamesForSession(session, toolCalls) {
  const requirement = requirementsForSession(session);
  const requiredAll = requirement.allOf ?? [];
  const requiredAny = requirement.anyOf ?? [];
  const successfulToolNames = new Set(
    toolCalls.filter(isSuccessfulToolCall).map((tc) => tc.name)
  );
  const missing = requiredAll.filter((name) => !successfulToolNames.has(name));
  if (requiredAny.length > 0 && !requiredAny.some((name) => successfulToolNames.has(name))) {
    missing.push(`one of: ${requiredAny.join(", ")}`);
  }
  return missing;
}
function detectArtifactGroundingIssues(stepKind, toolCalls) {
  if (!stepKind || !STEP_KINDS_REQUIRING_GROUNDED_ARTIFACTS.has(stepKind)) {
    return { blocked: false, evidence: [] };
  }
  const artifactWritesByPath = /* @__PURE__ */ new Map();
  for (const tc of toolCalls) {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) continue;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    const normalizedPath = normalizeWorkspaceRelativePath(path4);
    if (isArtifactSummaryPath(normalizedPath) && content.trim().length > 0) {
      artifactWritesByPath.set(normalizedPath, tc);
    }
  }
  const artifactWrites = [...artifactWritesByPath.values()];
  const groundedWrites = artifactWrites.filter((tc) => {
    const args = tc.arguments;
    const content = typeof args.content === "string" ? args.content : "";
    return containsGroundingSection(content) && !containsWeakGroundingSection(content) && invalidGroundingIssues(stepKind, content).length === 0;
  });
  const weakGroundingWrites = artifactWrites.filter((tc) => {
    const args = tc.arguments;
    const content = typeof args.content === "string" ? args.content : "";
    return containsGroundingSection(content) && containsWeakGroundingSection(content);
  });
  const invalidGrounding = artifactWrites.flatMap((tc) => {
    const args = tc.arguments;
    const content = typeof args.content === "string" ? args.content : "";
    const path4 = typeof args.path === "string" ? args.path : "unknown";
    return invalidGroundingIssues(stepKind, content).map((issue) => `${path4}: ${issue}`);
  });
  if (artifactWrites.length === 0 || groundedWrites.length > 0 && weakGroundingWrites.length === 0 && invalidGrounding.length === 0) {
    return { blocked: false, evidence: [] };
  }
  if (invalidGrounding.length > 0) {
    return {
      blocked: true,
      evidence: [
        `artifact grounding invalid: ${invalidGrounding.length} invalid grounding issue(s) found`,
        ...invalidGrounding.slice(0, 5)
      ]
    };
  }
  if (weakGroundingWrites.length > 0) {
    return {
      blocked: true,
      evidence: [
        `artifact grounding weak: ${weakGroundingWrites.length} artifact write(s) used a Grounding section with no concrete evidence`,
        "Grounding sections must cite concrete files, commands, DB rows, URLs, source artifacts, or explicit assumptions; Source Artifact: None / Commands Used: None is not sufficient"
      ]
    };
  }
  return {
    blocked: true,
    evidence: [
      `artifact grounding missing: ${artifactWrites.length} artifact write(s) lacked a Grounding section`,
      "grounded artifact steps must include a Grounding section with exact files, commands, DB rows, URLs, or source artifacts"
    ]
  };
}
function isArtifactSummaryPath(path4) {
  return /(?:^|\/)(?:output\/(?:reports|reviews|digests)|agents\/[^/]+\/(?:notes|specs)|\.gitea\/pull-requests)\//.test(path4);
}
function containsGroundingSection(text) {
  return /^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im.test(text);
}
function groundingSectionText(text) {
  const marker = text.match(/^#{1,4}\s+Grounding\b|^\*\*Grounding:?\*\*|^Grounding\s*:/im);
  if (!marker || marker.index === void 0) return "";
  const tail = text.slice(marker.index);
  const afterMarker = tail.slice(marker[0].length);
  const nextHeading = afterMarker.search(/^#{1,4}\s+\S/im);
  return nextHeading >= 0 ? tail.slice(0, marker[0].length + nextHeading) : tail;
}
function containsWeakGroundingSection(text) {
  const section = groundingSectionText(text);
  if (!section) return false;
  const weakMarkers = section.match(/(?:source artifacts?|commands? used|files?|urls?|db rows?)\s*:\s*(?:none|n\/a|not applicable|unknown)\b/gi) ?? [];
  if (weakMarkers.length === 0) return false;
  const concreteEvidence = /(?:\/workspace\/|\boutput\/|\bagents\/|https?:\/\/|\bfile_read\b|\bweb_fetch\b|\bweb_search\b|\bbash\b|\bSELECT\b|\bDB row\b|\bassumption\b)/i.test(section);
  return weakMarkers.length >= 2 && !concreteEvidence;
}
function invalidGroundingIssues(stepKind, text) {
  const issues = [];
  const section = groundingSectionText(text);
  if (!section) return issues;
  if (containsPlaceholderEvidenceUrl(section)) {
    issues.push("placeholder URL cited as grounding evidence");
  }
  if (containsMissingSourceMarker(section)) {
    issues.push("cited source artifact is marked missing, unavailable, or assumed");
  }
  if (stepKind === "draft_product_spec" && containsUnverifiedProductSpecMetric(text)) {
    issues.push("product spec success metric is framed as verified/completed outcome instead of target/proposed metric");
  }
  if (unsupportedHighRiskClaimLines(text).length > 0) {
    issues.push("high-risk factual claim lacks explicit evidence or hypothesis/target framing");
  }
  return issues;
}
function containsPlaceholderEvidenceUrl(section) {
  return /https?:\/\/(?:www\.)?(?:example\.com|example\.org|example\.net)(?:[/:?#]|\b)/i.test(section);
}
function containsMissingSourceMarker(section) {
  const lines = section.split("\n");
  return lines.some((line) => {
    const citesSourcePath = /(?:\/workspace\/|\bagents\/|\boutput\/|\bprojects\/)[^\s,)]+/i.test(line);
    const markedMissing = /\b(?:file not found|not found|unavailable|inaccessible|could not read|assumption made|assumed missing)\b/i.test(line);
    return citesSourcePath && markedMissing;
  });
}
function markdownSectionText(text, headingPattern) {
  const heading = text.match(headingPattern);
  if (!heading || heading.index === void 0) return "";
  const tail = text.slice(heading.index);
  const afterHeading = tail.slice(heading[0].length);
  const nextHeading = afterHeading.search(/^#{1,4}\s+\S/im);
  return nextHeading >= 0 ? tail.slice(0, heading[0].length + nextHeading) : tail;
}
function containsUnverifiedProductSpecMetric(text) {
  const section = markdownSectionText(text, /^#{1,4}\s+Success Metrics\b/im);
  if (!section) return false;
  return section.split("\n").some((line) => {
    const trimmed = line.trim();
    if (!/^[-*]\s+|^\d+\.\s+/.test(trimmed)) return false;
    if (/\b(?:target|proposed|goal|aim|planned|candidate|success metric|should|will|by \d{4}-\d{2}-\d{2})\b/i.test(trimmed)) return false;
    return /\b(?:verified|observed|achieved|completed|implemented|approved|documented|resolved|delivered)\b/i.test(trimmed);
  });
}
function manifestPathType(relativePath) {
  if (relativePath.startsWith("output/briefings/")) return "briefing";
  if (relativePath.startsWith("output/reports/")) return "report";
  if (relativePath.startsWith("output/reviews/")) return "review";
  if (relativePath.startsWith("output/digests/")) return "digest";
  return "artifact";
}
async function appendSucceededFileWriteManifests(sessionId, agentId, toolCalls) {
  const outputWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    return path4.startsWith("output/") || path4.startsWith("/workspace/output/");
  });
  for (const tc of outputWrites) {
    const args = tc.arguments;
    const result = tc.result;
    const rawPath = typeof args.path === "string" ? args.path : "";
    const relativePath = rawPath.startsWith("/workspace/") ? rawPath.slice("/workspace/".length) : rawPath;
    const artifactId = typeof result?.artifact_id === "string" ? result.artifact_id : (0, import_node_crypto3.randomUUID)();
    const bytes = typeof result?.bytes === "number" ? result.bytes : typeof args.content === "string" ? args.content.length : 0;
    const content = typeof args.content === "string" ? args.content : "";
    const sha2562 = (0, import_node_crypto3.createHash)("sha256").update(content).digest("hex");
    const entry = JSON.stringify({
      artifact_id: artifactId,
      path: relativePath,
      agent_id: agentId,
      type: manifestPathType(relativePath),
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      bytes,
      sha256: sha2562,
      session_id: sessionId,
      session_status: "succeeded",
      trusted: true,
      published_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    const b64 = Buffer.from(entry + "\n").toString("base64");
    await execInToolbox(
      `echo '${b64}' | base64 -d >> /workspace/shared/manifests/index.jsonl`,
      5e3
    );
  }
}
function detectAuditEvidenceIssues(stepKind, toolCalls) {
  if (stepKind !== "audit_system") return { blocked: false, evidence: [] };
  const successfulBash = toolCalls.filter(
    (tc) => tc.name === "bash" && isSuccessfulToolCall(tc)
  );
  const successfulAuditWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    return path4.includes("output/reviews") && /evidence table|command_or_source|observed_output|hostAudit|bash/i.test(content) && !containsBareWorkspaceAlias(content) && !containsUnsupportedAuditEvidence(content) && !containsPlaceholderAuditEvidence(content);
  });
  const barePathAuditWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    return path4.includes("output/reviews") && containsBareWorkspaceAlias(content);
  });
  const unsupportedAuditWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    return path4.includes("output/reviews") && containsUnsupportedAuditEvidence(content);
  });
  const placeholderAuditWrites = toolCalls.filter((tc) => {
    if (tc.name !== "file_write" || !isSuccessfulToolCall(tc)) return false;
    const args = tc.arguments;
    const path4 = typeof args.path === "string" ? args.path : "";
    const content = typeof args.content === "string" ? args.content : "";
    return path4.includes("output/reviews") && containsPlaceholderAuditEvidence(content);
  });
  if (successfulBash.length > 0 && successfulAuditWrites.length > 0 && barePathAuditWrites.length === 0 && unsupportedAuditWrites.length === 0 && placeholderAuditWrites.length === 0) {
    return { blocked: false, evidence: [] };
  }
  const evidence = [
    `audit evidence missing: successful bash calls=${successfulBash.length}, evidence-bearing audit writes=${successfulAuditWrites.length}`,
    "audit_system outputs must include command/source evidence before they can succeed"
  ];
  if (barePathAuditWrites.length > 0) {
    evidence.push(
      `audit path evidence invalid: ${barePathAuditWrites.length} audit write(s) used bare /output, /agents, or /projects paths`,
      "audit_system outputs must use real /workspace/... paths for commands and evidence"
    );
  }
  if (unsupportedAuditWrites.length > 0) {
    evidence.push(
      `audit unsupported evidence invalid: ${unsupportedAuditWrites.length} audit write(s) used N/A/none as command evidence`,
      "audit_system outputs must support no-issue/no-risk claims with bash output or hostAudit evidence"
    );
  }
  if (placeholderAuditWrites.length > 0) {
    evidence.push(
      `audit placeholder evidence invalid: ${placeholderAuditWrites.length} audit write(s) used generic parenthesized observed-output text`,
      "audit_system outputs must use real observed output, not placeholder excerpts like (Listing of files/dirs in /workspace/output) or (Process list excerpt, showing defunct git processes)"
    );
  }
  return { blocked: true, evidence };
}
function containsBareWorkspaceAlias(text) {
  return /(^|[^A-Za-z0-9_/-])\/(?:output|agents|projects)\b/.test(text);
}
function containsUnsupportedAuditEvidence(text) {
  return /^\s*\|[^\n]*\|\s*(?:N\/A|none|not applicable)\s*\|/im.test(text);
}
function containsPlaceholderAuditEvidence(text) {
  return /\(\s*(?:listing of|file listing|directory listing|process list(?: excerpt)?|excerpt|observed output|observed-output)\b[^)]*\)/i.test(
    text
  );
}
function detectBlockedOutcome(summary, toolCalls, options) {
  const evidence = [];
  const hardBlockerMatch = options?.ignoreSummaryBlockers ? void 0 : HARD_BLOCKER_SUMMARY_PATTERNS.find((p) => p.test(summary));
  if (hardBlockerMatch) {
    evidence.push(`summary matched hard-blocker pattern: ${hardBlockerMatch.source}`);
  }
  const softBlockerMatch = options?.ignoreSummaryBlockers ? void 0 : SOFT_BLOCKER_SUMMARY_PATTERNS.find((p) => p.test(summary));
  const hasSuccessfulToolCall = toolCalls.some(isSuccessfulToolCall);
  const hasProgressSignals = hasSuccessfulToolCall || PROGRESS_SUMMARY_PATTERNS.some((p) => p.test(summary));
  if (softBlockerMatch && !hasProgressSignals) {
    evidence.push(`summary matched unresolved soft-blocker pattern: ${softBlockerMatch.source}`);
  }
  const toolErrors = toolCalls.map((tc) => ({
    name: tc.name,
    text: toolErrorText(tc.result)
  })).filter((tc) => tc.text.length > 0);
  const fatalToolErrors = toolErrors.filter(
    (tc) => TOOL_ERROR_PATTERNS.some((p) => p.test(tc.text))
  );
  for (const err of fatalToolErrors) {
    evidence.push(`tool ${err.name} error: ${err.text.slice(0, 160)}`);
  }
  const hasSuccessfulArtifactDelivery = toolCalls.some((tc) => {
    if (tc.name !== "file_write" && tc.name !== "send_to_agent" && tc.name !== "scratchpad_update" && tc.name !== "memory_write") return false;
    if (!tc.result || typeof tc.result !== "object") return false;
    return !("error" in tc.result);
  });
  const blockedBySummary = !!hardBlockerMatch || !!softBlockerMatch && !hasProgressSignals;
  const blockedByFatalToolError = fatalToolErrors.length > 0 && !hasSuccessfulArtifactDelivery;
  if (blockedBySummary || blockedByFatalToolError) {
    const reason = blockedBySummary ? "Session summary reported unresolved blocker" : "Fatal tool error without successful artifact delivery";
    return { blocked: true, reason, evidence };
  }
  return {
    blocked: false,
    reason: "",
    evidence: []
  };
}
async function loadAgentContext(session, isDroid, agentId) {
  const voice = isDroid ? null : getVoice(agentId);
  const voiceName = isDroid ? session.agent_id : voice?.displayName ?? agentId;
  const tools = isDroid ? getDroidTools(session.agent_id) : getAgentTools(agentId, session.id);
  const memories = isDroid ? [] : await queryRelevantMemories(agentId, session.prompt, {
    relevantLimit: 5,
    recentLimit: 3
  });
  const scratchpad = isDroid ? "" : await getScratchpad(agentId);
  const briefing = isDroid ? "" : await buildBriefing(agentId);
  const recentSessions = isDroid ? [] : await sql`
            SELECT agent_id, prompt, result, completed_at
            FROM ops_agent_sessions
            WHERE source = 'cron'
            AND status = 'succeeded'
            AND completed_at > NOW() - INTERVAL '24 hours'
            AND id != ${session.id}
            ORDER BY completed_at DESC
            LIMIT 5
        `;
  let primeDirective = "";
  try {
    primeDirective = await loadPrimeDirective();
  } catch (error) {
    log30.warn("Prime directive load failed; continuing without directive", {
      error,
      sessionId: session.id,
      agentId
    });
  }
  const systemPrompt = buildAgentSystemPrompt({
    voice: voice ?? null,
    voiceName,
    primeDirective,
    scratchpad,
    briefing,
    memories,
    recentSessions,
    toolNames: tools.map((t) => t.name),
    writePaths: isDroid ? [] : getAgentWritePaths(agentId)
  });
  return { voiceName, tools, systemPrompt };
}
function buildAgentSystemPrompt(ctx) {
  let prompt = "";
  if (ctx.voice) {
    prompt += `${ctx.voice.systemDirective}

`;
  }
  if (ctx.primeDirective) {
    prompt += `\u2550\u2550\u2550 PRIME DIRECTIVE \u2550\u2550\u2550
${ctx.primeDirective}

`;
  }
  prompt += `You are ${ctx.voiceName}, operating in an autonomous agent session.
`;
  prompt += `You have tools available to accomplish your task. Use them through the provided function calling interface.
`;
  prompt += `When your task is complete, provide a clear summary of what you accomplished.
`;
  prompt += `IMPORTANT: When the task asks you to read, write, search, run commands, inspect Git, or publish, you MUST call the relevant tool. Do not claim you completed work without tool results.
`;
  prompt += `IMPORTANT: Prefer the structured tool calling API. If your runtime cannot emit native tool calls, emit exactly <function_calls><invoke name="tool_name"><parameter name="param">value</parameter></invoke></function_calls>; the runtime will execute it. Do not leave tool XML in your final answer.
`;
  prompt += `IMPORTANT: Only call tools from the list below. Do NOT invent tool names.

`;
  if (ctx.toolNames.length > 0) {
    prompt += `\u2550\u2550\u2550 AVAILABLE TOOLS \u2550\u2550\u2550
`;
    prompt += `You may ONLY use these tools: ${ctx.toolNames.join(", ")}
`;
    prompt += `Do NOT call tools like "google:search", "tool_code", "propose_action", or any other name not listed above.
`;
    prompt += `If a tool call returns "Access denied" or "does not exist", do NOT retry the same call. Adjust your approach or skip that action.
`;
    if (ctx.writePaths.length > 0) {
      prompt += `Your file_write access is restricted to these path prefixes: ${ctx.writePaths.join(", ")}
`;
      prompt += `Do NOT attempt to write outside these paths \u2014 it will be denied.
`;
    }
    prompt += `
`;
  }
  if (ctx.scratchpad) {
    prompt += `\u2550\u2550\u2550 YOUR SCRATCHPAD (working memory) \u2550\u2550\u2550
${ctx.scratchpad}

`;
  }
  if (ctx.briefing) {
    prompt += `\u2550\u2550\u2550 CURRENT SITUATION \u2550\u2550\u2550
${ctx.briefing}

`;
  }
  if (ctx.memories.length > 0) {
    prompt += `\u2550\u2550\u2550 YOUR MEMORIES \u2550\u2550\u2550
`;
    for (const m of ctx.memories) {
      prompt += `- [${m.type}] ${m.content.slice(0, MEMORY_PREVIEW_LENGTH)}
`;
    }
    prompt += `
`;
  }
  if (ctx.recentSessions.length > 0) {
    prompt += `Recent session outputs (for context):
`;
    for (const s of ctx.recentSessions) {
      const summary = s.result?.summary ?? s.result?.text ?? "(no summary)";
      prompt += `- [${s.agent_id}] ${String(summary).slice(0, SESSION_SUMMARY_PREVIEW_LENGTH)}
`;
    }
    prompt += "\n";
  }
  return prompt;
}
async function runAgentToolLoop(opts) {
  const { session, agentId, tools, messages, startTime } = opts;
  const allToolCalls = [];
  const maxRounds = session.max_tool_rounds;
  const timeoutMs = session.timeout_seconds * 1e3;
  const softDeadlineMs = timeoutMs - SESSION_SOFT_DEADLINE_BUFFER_MS;
  let lastText = "";
  let consecutiveEmptyRounds = 0;
  let emptyRounds = 0;
  let llmRounds = 0;
  let retriedEmptyNoToolRound = false;
  let retriedMissingToolContract = false;
  for (let round = 0; round < maxRounds; round++) {
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      await completeSession(
        session.id,
        "timed_out",
        {
          summary: lastText || "Session timed out before completing",
          rounds: llmRounds,
          empty_tool_rounds: emptyRounds
        },
        allToolCalls,
        llmRounds,
        "Timeout exceeded"
      );
      return { lastText, toolCalls: allToolCalls, rounds: -1, emptyRounds };
    }
    if (elapsed > softDeadlineMs && round > 0 && lastText) {
      log30.info("Soft deadline reached, finishing with current output", {
        sessionId: session.id,
        elapsed: Math.round(elapsed / 1e3),
        rounds: llmRounds
      });
      break;
    }
    llmRounds++;
    const result = await llmGenerateWithTools({
      messages,
      temperature: 0.7,
      maxTokens: AGENT_SESSION_MAX_TOKENS,
      tools: tools.length > 0 ? tools : void 0,
      maxToolRounds: Math.min(maxRounds, AGENT_SESSION_MAX_TOOL_ROUNDS),
      trackingContext: { agentId, context: "agent_session", sessionId: session.id }
    });
    if (result.text) {
      lastText = result.text;
      consecutiveEmptyRounds = 0;
    } else {
      consecutiveEmptyRounds++;
      emptyRounds++;
    }
    allToolCalls.push(...result.toolCalls);
    log30.debug("Agent session round completed", {
      sessionId: session.id,
      round,
      textLength: result.text.length,
      toolCallCount: result.toolCalls.length,
      cumulativeToolCalls: allToolCalls.length,
      hasLastText: !!lastText,
      consecutiveEmptyRounds,
      emptyRounds
    });
    if (!result.text && result.toolCalls.length === 0 && allToolCalls.length === 0 && !retriedEmptyNoToolRound) {
      retriedEmptyNoToolRound = true;
      messages.push({
        role: "user",
        content: "The previous response was empty. You must either call the required tools or provide final text if no tools are needed."
      });
      continue;
    }
    if (result.toolCalls.length === 0) {
      const missingTools = missingRequiredToolNamesForSession(session, allToolCalls);
      if (missingTools.length > 0 && !retriedMissingToolContract) {
        retriedMissingToolContract = true;
        messages.push({
          role: "user",
          content: `Your previous response did not satisfy the required tool contract. Missing successful tool evidence: ${missingTools.join(", ")}. Call the required tools now through the function calling interface. Do not describe commands or file contents as prose instead of using the tools. If a required external source is unavailable, still write a file_write artifact that clearly marks status: blocked and cites the failed tool evidence.`
        });
        continue;
      }
      break;
    }
    if (!result.text && result.toolCalls.every(
      (tc) => typeof tc.result === "string" && tc.result.includes("not available")
    )) {
      log30.warn("Agent session breaking early \u2014 all tool calls returned not-available", {
        sessionId: session.id,
        round,
        toolCalls: result.toolCalls.map((tc) => tc.name)
      });
      break;
    }
    if (result.toolCalls.length > 0 && result.toolCalls.every((tc) => {
      const text = toolErrorText(tc.result);
      return /access denied/i.test(text) || /does not exist/i.test(text);
    })) {
      log30.warn("Agent session breaking early \u2014 all tool calls denied or invalid", {
        sessionId: session.id,
        round,
        toolCalls: result.toolCalls.map((tc) => ({ name: tc.name, error: toolErrorText(tc.result).slice(0, 100) }))
      });
      break;
    }
    if (consecutiveEmptyRounds >= MAX_CONSECUTIVE_EMPTY_ROUNDS) {
      log30.warn("Agent session breaking early \u2014 consecutive empty rounds", {
        sessionId: session.id,
        round,
        cumulativeToolCalls: allToolCalls.length
      });
      break;
    }
    const toolSummary = result.toolCalls.map((tc) => {
      const resultStr = typeof tc.result === "string" ? tc.result : JSON.stringify(tc.result);
      const capped = resultStr.length > TOOL_RESULT_MAX_LENGTH ? resultStr.slice(0, TOOL_RESULT_MAX_LENGTH) + "... [truncated]" : resultStr;
      return `Tool ${tc.name}(${JSON.stringify(tc.arguments)}):
${capped}`;
    }).join("\n\n");
    if (result.text) {
      messages.push({ role: "assistant", content: result.text });
    }
    messages.push({
      role: "user",
      content: `Tool results:
${toolSummary}

Continue with your task. If you're done, provide a final summary.`
    });
  }
  return { lastText, toolCalls: allToolCalls, rounds: llmRounds, emptyRounds };
}
async function executeAgentSession(session) {
  const startTime = Date.now();
  const isDroid = session.agent_id.startsWith("droid-");
  const agentId = session.agent_id;
  await sql`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ${session.id}
          AND status IN ('pending', 'queued', 'running')
    `;
  try {
    const { voiceName, tools, systemPrompt } = await loadAgentContext(session, isDroid, agentId);
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: session.prompt }
    ];
    const loopResult = await runAgentToolLoop({
      session,
      agentId,
      tools,
      messages,
      startTime
    });
    if (loopResult.rounds === -1) return;
    const cleanedText = extractFromXml(loopResult.lastText);
    const summary = sanitizeSummary(cleanedText);
    const isHeartbeatReportSession = session.agent_id === "system" && session.source === "cron" && session.prompt.trim() === "System heartbeat";
    const blockedOutcome = detectBlockedOutcome(
      [summary, cleanedText].filter(Boolean).join("\n"),
      loopResult.toolCalls,
      {
        ignoreSummaryBlockers: isHeartbeatReportSession
      }
    );
    const missingToolEvidence = detectMissingRequiredToolEvidence(
      session,
      loopResult.toolCalls
    );
    const emptySessionOutcome = detectEmptySessionOutcome(
      session,
      cleanedText,
      loopResult.toolCalls
    );
    const droidPlaceholderArtifact = detectDroidPlaceholderArtifact(
      session,
      loopResult.toolCalls
    );
    const finalStatus = blockedOutcome.blocked || missingToolEvidence.blocked || emptySessionOutcome.blocked || droidPlaceholderArtifact.blocked ? "blocked" : "succeeded";
    const blockedReason = blockedOutcome.blocked ? blockedOutcome.reason : missingToolEvidence.blocked ? missingToolEvidence.reason : emptySessionOutcome.blocked ? emptySessionOutcome.reason : droidPlaceholderArtifact.blocked ? droidPlaceholderArtifact.reason : void 0;
    const blockedEvidence = [
      ...blockedOutcome.evidence,
      ...missingToolEvidence.evidence,
      ...emptySessionOutcome.evidence,
      ...droidPlaceholderArtifact.evidence
    ];
    const completed = await completeSession(
      session.id,
      finalStatus,
      {
        text: cleanedText,
        summary,
        rounds: loopResult.rounds,
        empty_tool_rounds: loopResult.emptyRounds,
        ...blockedReason ? {
          blocked_reason: blockedReason,
          blocked_evidence: blockedEvidence
        } : {}
      },
      loopResult.toolCalls,
      loopResult.rounds,
      blockedReason
    );
    if (!completed) return;
    if (finalStatus === "succeeded") {
      try {
        await appendSucceededFileWriteManifests(session.id, agentId, loopResult.toolCalls);
      } catch (manifestErr) {
        log30.warn("Deferred manifest append failed (non-fatal)", {
          error: manifestErr,
          sessionId: session.id,
          agentId
        });
      }
    }
    const summaryPreview = truncateToFirstSentences(cleanedText, 2e3);
    if (blockedReason) {
      await emitEvent({
        agent_id: agentId,
        kind: "agent_session_blocked",
        title: `${voiceName} session blocked`,
        summary: summaryPreview || blockedReason,
        tags: ["agent_session", "blocked", session.source],
        metadata: {
          sessionId: session.id,
          source: session.source,
          rounds: loopResult.rounds,
          toolCalls: loopResult.toolCalls.length,
          blockedReason,
          blockedEvidence
        }
      });
    } else {
      await emitEvent({
        agent_id: agentId,
        kind: "agent_session_completed",
        title: `${voiceName} session completed`,
        summary: summaryPreview || void 0,
        tags: ["agent_session", "completed", session.source],
        metadata: {
          sessionId: session.id,
          source: session.source,
          rounds: loopResult.rounds,
          toolCalls: loopResult.toolCalls.length
        }
      });
    }
  } catch (err) {
    const errorMsg = err.message;
    log30.error("Agent session failed", { error: err, sessionId: session.id, agentId });
    const completed = await completeSession(
      session.id,
      "failed",
      { error: errorMsg, rounds: 0 },
      [],
      0,
      errorMsg
    );
    if (!completed) return;
    await emitEvent({
      agent_id: agentId,
      kind: "agent_session_failed",
      title: `Agent session failed: ${errorMsg.slice(0, 100)}`,
      tags: ["agent_session", "failed", session.source],
      metadata: { sessionId: session.id, error: errorMsg }
    });
  }
}
function sanitizeForJsonb(obj) {
  if (typeof obj === "string") {
    return obj.replace(/\u0000/g, "").replace(/\\u0000/g, "");
  }
  if (Array.isArray(obj)) return obj.map(sanitizeForJsonb);
  if (obj && typeof obj === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(obj)) {
      clean[k] = sanitizeForJsonb(v);
    }
    return clean;
  }
  return obj;
}
async function completeSession(sessionId, status, result, toolCalls, llmRounds, error) {
  const updated = await sql`
        UPDATE ops_agent_sessions
        SET status = ${status},
            result = COALESCE(result, '{}'::jsonb) || ${jsonb(sanitizeForJsonb(result))}::jsonb,
            tool_calls = ${jsonb(
    sanitizeForJsonb(toolCalls.map((tc) => ({
      name: tc.name,
      arguments: tc.arguments,
      result: typeof tc.result === "string" ? tc.result.slice(0, 2e3) : tc.result
    })))
  )},
            llm_rounds = ${llmRounds},
            error = ${error ?? null},
            completed_at = NOW()
        WHERE id = ${sessionId}
          AND status = 'running'
        RETURNING id
    `;
  if (updated.length === 0) {
    log30.warn("Skipped terminal session update because session was not running", {
      sessionId,
      status
    });
    return false;
  }
  return true;
}

// scripts/unified-worker/index.ts
init_executor();
init_logger();
init_formats();

// src/lib/ops/content-publication.ts
var import_crypto4 = __toESM(require("crypto"));
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
init_db();
init_logger();
init_events2();
var log31 = logger.child({ module: "content-publication" });
var DEFAULT_BLOG_DIR = "output/blog";
var MAX_BACKFILL_BATCH = 20;
var WORKSPACE_ROOT = process.env.WORKSPACE_ROOT?.trim() || "/workspace";
function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function isLocalPublicationState(value) {
  if (!isRecord(value)) return false;
  return value.status === "published" && typeof value.slug === "string" && typeof value.relative_path === "string" && typeof value.published_at === "string";
}
function isGhostPublicationState(value) {
  if (!isRecord(value)) return false;
  const status = value.status;
  if (status !== "pending" && status !== "failed" && status !== "published") {
    return false;
  }
  if (typeof value.attempts !== "number") return false;
  const nullableString = (v) => typeof v === "string" || v === null;
  if (!nullableString(value.last_attempt_at)) return false;
  if (!nullableString(value.next_retry_at)) return false;
  if (!nullableString(value.error)) return false;
  if (value.post_id !== void 0 && typeof value.post_id !== "string") {
    return false;
  }
  if (value.post_url !== void 0 && typeof value.post_url !== "string") {
    return false;
  }
  if (value.published_at !== void 0 && typeof value.published_at !== "string") {
    return false;
  }
  return true;
}
function getRootMetadata(metadata) {
  return isRecord(metadata) ? metadata : {};
}
function getPublicationState(metadata) {
  const root = getRootMetadata(metadata);
  const publication = isRecord(root.publication) ? root.publication : {};
  return {
    local: isLocalPublicationState(publication.local) ? publication.local : void 0,
    ghost: isGhostPublicationState(publication.ghost) ? publication.ghost : void 0
  };
}
function mergePublicationState(metadata, publication) {
  const root = getRootMetadata(metadata);
  const currentPublication = isRecord(root.publication) ? root.publication : {};
  return {
    ...root,
    publication: {
      ...currentPublication,
      ...publication.local ? { local: publication.local } : {},
      ...publication.ghost ? { ghost: publication.ghost } : {}
    }
  };
}
function slugifyTitle(input) {
  const slug = input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return slug || "post";
}
async function fileExists(filePath) {
  try {
    await import_promises.default.access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function resolveBlogOutputDir() {
  const explicit = process.env.BLOG_OUTPUT_DIR?.trim();
  if (explicit) {
    await import_promises.default.mkdir(explicit, { recursive: true });
    return explicit;
  }
  try {
    await import_promises.default.access(WORKSPACE_ROOT);
    const outputDir = import_path.default.join(WORKSPACE_ROOT, DEFAULT_BLOG_DIR);
    await import_promises.default.mkdir(outputDir, { recursive: true });
    return outputDir;
  } catch {
    const outputDir = import_path.default.join(process.cwd(), "workspace", DEFAULT_BLOG_DIR);
    await import_promises.default.mkdir(outputDir, { recursive: true });
    return outputDir;
  }
}
function formatPublishedDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
function renderLocalMarkdown(title, body, publishedAt) {
  return `# ${title}

_${formatPublishedDate(publishedAt)}_

---

${body.trim()}
`;
}
async function resolveSlug(title, draftId, outputDir, existingSlug) {
  if (existingSlug) return existingSlug;
  const base = slugifyTitle(title);
  const basePath = import_path.default.join(outputDir, `${base}.md`);
  if (!await fileExists(basePath)) return base;
  return `${base}-${draftId.slice(0, 8)}`;
}
async function publishLocally(draft, existingLocal) {
  const outputDir = await resolveBlogOutputDir();
  const publishedAt = draft.published_at ?? (/* @__PURE__ */ new Date()).toISOString();
  const slug = await resolveSlug(draft.title, draft.id, outputDir, existingLocal?.slug);
  const filename = `${slug}.md`;
  const filePath = import_path.default.join(outputDir, filename);
  const markdown = renderLocalMarkdown(draft.title, draft.body, publishedAt);
  await import_promises.default.writeFile(filePath, markdown, { encoding: "utf-8", mode: 420 });
  let relativePath;
  const normalizedFilePath = filePath.replace(/\\/g, "/");
  const normalizedWorkspace = WORKSPACE_ROOT.replace(/\\/g, "/");
  const normalizedCwd = process.cwd().replace(/\\/g, "/");
  if (normalizedFilePath.startsWith(normalizedWorkspace + "/")) {
    relativePath = import_path.default.posix.relative(normalizedWorkspace, normalizedFilePath);
  } else if (normalizedFilePath.startsWith(normalizedCwd + "/")) {
    relativePath = import_path.default.posix.relative(normalizedCwd, normalizedFilePath);
  } else {
    relativePath = normalizedFilePath;
  }
  return {
    status: "published",
    slug,
    relative_path: relativePath,
    published_at: publishedAt
  };
}
function normalizeGhostAdminUrl(input) {
  const trimmed = input.trim().replace(/\/$/, "");
  if (trimmed.includes("/ghost/api/admin")) return trimmed;
  return `${trimmed}/ghost/api/admin`;
}
function getGhostConfig() {
  const adminApiKey = process.env.GHOST_ADMIN_API_KEY?.trim();
  const siteUrl = process.env.GHOST_URL?.trim() || process.env.GHOST_SITE_URL?.trim() || "https://blog.subcult.tv";
  const adminApiUrl = process.env.GHOST_ADMIN_API_URL?.trim() || normalizeGhostAdminUrl(siteUrl);
  if (!adminApiKey) return null;
  return {
    adminApiUrl: normalizeGhostAdminUrl(adminApiUrl),
    adminApiKey,
    siteUrl: siteUrl.replace(/\/$/, "")
  };
}
function createGhostJwt(adminApiKey) {
  const [keyId, secret] = adminApiKey.split(":");
  if (!keyId || !secret) {
    throw new Error('Invalid GHOST_ADMIN_API_KEY format. Expected "<id>:<secret>"');
  }
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", kid: keyId, typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({ iat: nowSeconds, exp: nowSeconds + 5 * 60, aud: "/admin/" })
  ).toString("base64url");
  const signature = import_crypto4.default.createHmac("sha256", Buffer.from(secret, "hex")).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}
function escapeHtml(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function markdownToGhostHtml(markdown) {
  const lines = markdown.split("\n");
  const html = [];
  let paragraph = [];
  let inList = false;
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html.push(`<p>${escapeHtml(paragraph.join(" ").trim())}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!inList) return;
    html.push("</ul>");
    inList = false;
  };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    const listMatch = line.match(/^[-*]\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${escapeHtml(headingMatch[2].trim())}</h${level}>`);
      continue;
    }
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(listMatch[1].trim())}</li>`);
      continue;
    }
    if (line.trim() === "") {
      flushParagraph();
      closeList();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  return html.join("\n");
}
function computeNextRetryIso(attempts) {
  const backoffMinutes = Math.min(240, 5 * Math.pow(2, Math.max(0, attempts - 1)));
  return new Date(Date.now() + backoffMinutes * 6e4).toISOString();
}
var GHOST_REQUEST_TIMEOUT_MS = 15e3;
async function mirrorToGhost(draft, local, previousGhost) {
  const config = getGhostConfig();
  if (!config) {
    return {
      status: "pending",
      attempts: previousGhost?.attempts ?? 0,
      last_attempt_at: previousGhost?.last_attempt_at ?? null,
      next_retry_at: null,
      error: "ghost_not_configured",
      post_id: previousGhost?.post_id,
      post_url: previousGhost?.post_url,
      published_at: previousGhost?.published_at
    };
  }
  const attempt = (previousGhost?.attempts ?? 0) + 1;
  const lastAttemptAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const jwt = createGhostJwt(config.adminApiKey);
    const endpoint = `${config.adminApiUrl}/posts/?source=html`;
    const html = markdownToGhostHtml(draft.body);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GHOST_REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Ghost ${jwt}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          posts: [
            {
              title: draft.title,
              slug: local.slug,
              html,
              status: "published",
              published_at: local.published_at,
              tags: ["subcorp", draft.content_type, draft.author_agent]
            }
          ]
        })
      });
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ghost API ${response.status}: ${text.slice(0, 500)}`);
    }
    const payload = await response.json();
    const post = payload.posts?.[0];
    return {
      status: "published",
      attempts: attempt,
      last_attempt_at: lastAttemptAt,
      next_retry_at: null,
      error: null,
      post_id: post?.id,
      post_url: post?.url,
      published_at: (/* @__PURE__ */ new Date()).toISOString()
    };
  } catch (err) {
    const isTimeout = err.name === "AbortError";
    const message = isTimeout ? `Ghost API request timed out after ${GHOST_REQUEST_TIMEOUT_MS}ms` : err.message;
    return {
      status: "failed",
      attempts: attempt,
      last_attempt_at: lastAttemptAt,
      next_retry_at: computeNextRetryIso(attempt),
      error: message,
      post_id: previousGhost?.post_id,
      post_url: previousGhost?.post_url,
      published_at: previousGhost?.published_at
    };
  }
}
async function updateDraftMetadata(draftId, metadata) {
  await sql`
        UPDATE ops_content_drafts
        SET metadata = ${jsonb(metadata)}::jsonb,
            updated_at = NOW()
        WHERE id = ${draftId}
    `;
}
async function mirrorPublishedDraft(draft) {
  const publication = getPublicationState(draft.metadata);
  const local = publication.local ?? await publishLocally(draft);
  if (!publication.local) {
    const metadataWithLocal = mergePublicationState(draft.metadata, {
      local,
      ghost: publication.ghost
    });
    await updateDraftMetadata(draft.id, metadataWithLocal);
    draft.metadata = metadataWithLocal;
  }
  if (publication.ghost?.status === "published") {
    return true;
  }
  const nextGhost = await mirrorToGhost(draft, local, publication.ghost);
  const mergedMetadata = mergePublicationState(draft.metadata, {
    local,
    ghost: nextGhost
  });
  await updateDraftMetadata(draft.id, mergedMetadata);
  if (nextGhost.status === "published") {
    await emitEvent({
      agent_id: draft.author_agent,
      kind: "content_mirrored_ghost",
      title: `Ghost mirror published: ${draft.title}`,
      summary: nextGhost.post_url ?? "Ghost mirror completed",
      tags: ["content", "ghost", "published", draft.content_type],
      metadata: {
        draftId: draft.id,
        postId: nextGhost.post_id,
        postUrl: nextGhost.post_url
      }
    });
    return true;
  }
  if (nextGhost.status === "failed") {
    log31.warn("Ghost mirror failed", {
      draftId: draft.id,
      attempt: nextGhost.attempts,
      error: nextGhost.error,
      nextRetryAt: nextGhost.next_retry_at
    });
  }
  return false;
}
async function publishApprovedDrafts(limit = MAX_BACKFILL_BATCH) {
  const drafts = await sql`
        SELECT id, author_agent, content_type, title, body, status, metadata, published_at, created_at
        FROM ops_content_drafts
        WHERE status = 'approved'
        ORDER BY created_at ASC
        LIMIT ${Math.max(1, Math.min(limit, MAX_BACKFILL_BATCH))}
    `;
  let published = 0;
  let failed = 0;
  for (const draft of drafts) {
    let local;
    try {
      const publication = getPublicationState(draft.metadata);
      local = await publishLocally(draft, publication.local);
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : String(err);
      log31.error("publishLocally failed", {
        draftId: draft.id,
        title: draft.title,
        error: reason
      });
      await sql`
                UPDATE ops_content_drafts
                SET metadata = jsonb_set(
                    COALESCE(metadata, '{}'::jsonb),
                    '{publication_error}',
                    ${jsonb({ step: "publishLocally", error: reason, at: (/* @__PURE__ */ new Date()).toISOString() })}::jsonb
                ),
                updated_at = NOW()
                WHERE id = ${draft.id}
            `;
      continue;
    }
    try {
      const metadataWithLocal = mergePublicationState(draft.metadata, {
        local,
        ghost: getPublicationState(draft.metadata).ghost
      });
      const result = await sql`
                UPDATE ops_content_drafts
                SET status = 'published',
                    published_at = ${local.published_at},
                    metadata = ${jsonb(metadataWithLocal)}::jsonb,
                    updated_at = NOW()
                WHERE id = ${draft.id}
                  AND status = 'approved'
                RETURNING id
            `;
      if (result.length === 0) {
        continue;
      }
      await emitEvent({
        agent_id: draft.author_agent,
        kind: "content_published",
        title: `Published: ${draft.title}`,
        summary: `${draft.content_type} published by ${draft.author_agent}`,
        tags: ["content", "published", draft.content_type],
        metadata: {
          draftId: draft.id,
          localPath: local.relative_path,
          localSlug: local.slug
        }
      });
      published++;
      draft.status = "published";
      draft.published_at = local.published_at;
      draft.metadata = metadataWithLocal;
    } catch (err) {
      failed++;
      const reason = err instanceof Error ? err.message : String(err);
      log31.error("Draft status update failed after local publish", {
        draftId: draft.id,
        title: draft.title,
        localSlug: local.slug,
        error: reason
      });
      continue;
    }
    try {
      await mirrorPublishedDraft(draft);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      log31.warn("Ghost mirror threw unexpectedly", {
        draftId: draft.id,
        title: draft.title,
        error: reason
      });
    }
  }
  return { published, failed };
}
async function retryGhostMirrorForDraft(draftId) {
  const [draft] = await sql`
        SELECT id, author_agent, content_type, title, body, status, metadata, published_at, created_at
        FROM ops_content_drafts
        WHERE id = ${draftId}
        LIMIT 1
    `;
  if (!draft) {
    return { ok: false, mirrored: false, message: "Draft not found" };
  }
  if (draft.status !== "published") {
    return {
      ok: false,
      mirrored: false,
      message: `Draft must be published before ghost mirror retry (current status: ${draft.status})`
    };
  }
  const mirrored = await mirrorPublishedDraft(draft);
  return {
    ok: true,
    mirrored,
    message: mirrored ? "Ghost mirror published" : "Ghost mirror retry scheduled"
  };
}
async function mirrorPublishedDraftBackfill(limit = MAX_BACKFILL_BATCH) {
  if (!getGhostConfig()) {
    return {
      processed: 0,
      mirrored: 0,
      failed: 0,
      skipped: true
    };
  }
  const rows = await sql`
        SELECT id
        FROM ops_content_drafts
        WHERE status = 'published'
          AND COALESCE(metadata->'publication'->'ghost'->>'status', 'pending') <> 'published'
          AND (
            metadata->'publication'->'ghost'->>'next_retry_at' IS NULL
            OR (metadata->'publication'->'ghost'->>'next_retry_at')::timestamptz <= NOW()
          )
        ORDER BY COALESCE(published_at, created_at) ASC
        LIMIT ${Math.max(1, Math.min(limit, MAX_BACKFILL_BATCH))}
    `;
  let mirrored = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await retryGhostMirrorForDraft(row.id);
    if (!result.ok) {
      failed++;
      continue;
    }
    if (result.mirrored) mirrored++;
    else failed++;
  }
  return {
    processed: rows.length,
    mirrored,
    failed,
    skipped: false
  };
}

// scripts/unified-worker/index.ts
init_governance();

// scripts/unified-worker/review-recovery.ts
async function processCompletedReviewDrafts(drafts, processReviewSession2, logger2) {
  if (drafts.length === 0) return 0;
  logger2.info("Catching up stuck content reviews", { count: drafts.length });
  let processed = 0;
  for (const draft of drafts) {
    try {
      await processReviewSession2(draft.review_session_id);
      processed += 1;
      logger2.info("Stuck review processed", {
        draftId: draft.id,
        title: draft.title
      });
    } catch (err) {
      logger2.error("Failed to process stuck review", {
        error: err,
        draftId: draft.id
      });
    }
  }
  return processed;
}
async function releaseStaleReviewDrafts(drafts, resetDraftToDraft, logger2) {
  if (drafts.length === 0) return 0;
  logger2.info("Releasing stale content reviews back to draft", {
    count: drafts.length
  });
  let released = 0;
  for (const draft of drafts) {
    try {
      const didReset = await resetDraftToDraft(draft.id);
      if (didReset) {
        released += 1;
        logger2.info("Stale review draft reset to draft", {
          draftId: draft.id,
          title: draft.title,
          previousReviewSessionId: draft.review_session_id
        });
      }
    } catch (err) {
      logger2.error("Failed to release stale review draft", {
        error: err,
        draftId: draft.id
      });
    }
  }
  return released;
}

// scripts/unified-worker/index.ts
var log36 = createLogger({ service: "unified-worker" });
var WORKER_ID = `unified-${process.pid}`;
var WORKER_HEARTBEAT_ENABLED = process.env.WORKER_HEARTBEAT_ENABLED !== "false";
var WORKER_HEARTBEAT_URL = process.env.WORKER_HEARTBEAT_URL ?? "http://subcorp-app:3000/api/ops/heartbeat";
var WORKER_HEARTBEAT_INTERVAL_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? "300000",
  10
);
var WORKER_HEARTBEAT_TIMEOUT_MS = Number.parseInt(
  process.env.WORKER_HEARTBEAT_TIMEOUT_MS ?? "120000",
  10
);
var lastWorkerHeartbeatAttemptAt = 0;
function buildReviewReadyDraftBody2(args) {
  const header = [
    "---",
    `artifact_id: content-draft-${args.draftId}`,
    `source_session: ${args.sourceSessionId}`,
    "version: v01",
    "audience: review board",
    "publish_target: content pipeline",
    `content_type: ${args.contentType}`,
    `title: ${JSON.stringify(args.title)}`,
    "reviewer_ask: Review for factual grounding, usefulness, publication readiness, and required revisions.",
    "---",
    ""
  ].join("\n");
  return `${header}${args.body}`.slice(0, 5e4);
}
if (!process.env.DATABASE_URL) {
  log36.fatal("Missing DATABASE_URL");
  process.exit(1);
}
async function triggerHeartbeatIfDue() {
  if (!WORKER_HEARTBEAT_ENABLED) return false;
  if (!process.env.CRON_SECRET) {
    log36.warn("Worker-managed heartbeat skipped: missing CRON_SECRET");
    return false;
  }
  const now = Date.now();
  if (now - lastWorkerHeartbeatAttemptAt < WORKER_HEARTBEAT_INTERVAL_MS) {
    return false;
  }
  lastWorkerHeartbeatAttemptAt = now;
  const startedAt = Date.now();
  try {
    const response = await fetch(WORKER_HEARTBEAT_URL, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      signal: AbortSignal.timeout(WORKER_HEARTBEAT_TIMEOUT_MS)
    });
    const body = await response.text();
    const durationMs = Date.now() - startedAt;
    if (!response.ok) {
      log36.warn("Worker-managed heartbeat failed", {
        status: response.status,
        durationMs,
        body: body.slice(0, 500)
      });
      return false;
    }
    let summary = body.slice(0, 500);
    try {
      const parsed = JSON.parse(body);
      summary = {
        status: parsed.status,
        triggers: parsed.triggers,
        roundtable: parsed.roundtable,
        cron: parsed.cron
      };
    } catch {
    }
    log36.info("Worker-managed heartbeat completed", { durationMs, summary });
    return true;
  } catch (err) {
    log36.warn("Worker-managed heartbeat exception", {
      error: err.message
    });
    return false;
  }
}
var sql2 = (0, import_postgres2.default)(process.env.DATABASE_URL, {
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10
});
var AGENT_SESSION_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.WORKER_AGENT_SESSION_CONCURRENCY ?? "2", 10) || 1
);
async function pollAgentSessions() {
  await reapExpiredRunningAgentSessions();
  const sessions = await sql2`
        UPDATE ops_agent_sessions
        SET status = 'running', started_at = NOW()
        WHERE id = ANY(
            ARRAY(
            SELECT id FROM ops_agent_sessions
            WHERE status = 'pending'
            ORDER BY created_at ASC
                LIMIT ${AGENT_SESSION_CONCURRENCY}
            FOR UPDATE SKIP LOCKED
            )
        )
        RETURNING *
    `;
  if (sessions.length === 0) return false;
  await Promise.allSettled(sessions.map((session) => processAgentSession(session)));
  return true;
}
async function reapExpiredRunningAgentSessions() {
  const expired = await sql2`
        UPDATE ops_agent_sessions
        SET status = 'timed_out',
            completed_at = NOW(),
            error = concat_ws(E'\n', nullif(error, ''), 'worker cleanup: running session exceeded timeout_seconds')
        WHERE status = 'running'
          AND started_at IS NOT NULL
          AND timeout_seconds IS NOT NULL
          AND NOW() - started_at > make_interval(secs => timeout_seconds)
        RETURNING id, agent_id, source
    `;
  if (expired.length > 0) {
    log36.warn("Reaped expired running agent sessions", {
      count: expired.length,
      sessionIds: expired.map((row) => row.id)
    });
  }
}
async function processAgentSession(session) {
  log36.info("Processing agent session", {
    sessionId: session.id,
    agent: session.agent_id,
    source: session.source
  });
  if (session.source === "mission") {
    await sql2`
            UPDATE ops_mission_steps
            SET updated_at = NOW()
            WHERE status = 'running'
              AND result->>'agent_session_id' = ${session.id}
        `;
  }
  try {
    await executeAgentSession(session);
    if (session.source === "conversation" && session.source_id) {
      const [completed] = await sql2`
                SELECT result FROM ops_agent_sessions WHERE id = ${session.id}
            `;
      const artifactText = (completed?.result?.text ?? completed?.result?.output ?? "").trim();
      if (artifactText && artifactText.length > 20) {
        try {
          const { postArtifactToDiscord: postArtifactToDiscord2 } = await Promise.resolve().then(() => (init_roundtable(), roundtable_exports));
          await postArtifactToDiscord2(
            session.source_id,
            "",
            artifactText
          );
        } catch (discordErr) {
          log36.warn("Discord posting failed (non-fatal)", {
            error: discordErr,
            sessionId: session.id,
            roundtableId: session.source_id
          });
        }
      }
      if (artifactText && artifactText.length > 50) {
        try {
          const [rtSession] = await sql2`
                        SELECT format, topic FROM ops_roundtable_sessions
                        WHERE id = ${session.source_id}
                    `;
          if (rtSession) {
            const { extractActionsFromArtifact: extractActionsFromArtifact2 } = await Promise.resolve().then(() => (init_action_extractor(), action_extractor_exports));
            const actionCount = await extractActionsFromArtifact2(
              session.source_id,
              rtSession.format,
              artifactText,
              rtSession.topic
            );
            if (actionCount > 0) {
              log36.info(
                "Actions extracted from roundtable artifact",
                {
                  sessionId: session.id,
                  roundtableId: session.source_id,
                  format: rtSession.format,
                  actionCount
                }
              );
            }
          }
        } catch (extractErr) {
          log36.error("Action extraction failed (non-fatal)", {
            error: extractErr,
            sessionId: session.id
          });
        }
      }
      if (artifactText && artifactText.length > 50 && session.source_id) {
        try {
          const [rtSession] = await sql2`
                        SELECT format, topic FROM ops_roundtable_sessions
                        WHERE id = ${session.source_id}
                    `;
          if (rtSession) {
            const formatConfig = FORMATS[rtSession.format];
            const artifact = formatConfig?.artifact;
            if (artifact && artifact.type !== "none") {
              const outputDir = artifact.outputDir;
              const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
              const topicSlug = rtSession.topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
              const filename = `${dateStr}__${rtSession.format}__${artifact.type}__${topicSlug}__${session.agent_id}__v01.md`;
              const filePath = import_path2.default.join(
                "/workspace",
                outputDir,
                filename
              );
              await import_promises2.default.mkdir(import_path2.default.dirname(filePath), {
                recursive: true
              });
              const fileExists2 = await import_promises2.default.access(filePath).then(
                () => true,
                () => false
              );
              if (fileExists2) {
                log36.info(
                  "Artifact file already exists (written by synthesis agent)",
                  {
                    sessionId: session.id,
                    path: filePath
                  }
                );
              } else {
                await import_promises2.default.writeFile(
                  filePath,
                  artifactText,
                  "utf-8"
                );
                log36.info("Artifact file written to workspace", {
                  sessionId: session.id,
                  path: filePath,
                  format: rtSession.format,
                  artifactType: artifact.type
                });
              }
            }
          }
        } catch (fileErr) {
          log36.error("Artifact file write failed (non-fatal)", {
            error: fileErr,
            sessionId: session.id
          });
        }
      }
      if (artifactText && artifactText.length > 50 && session.source_id) {
        try {
          const [existingDraft] = await sql2`
                        SELECT id FROM ops_content_drafts
                        WHERE source_session_id = ${session.source_id}
                        LIMIT 1
                    `;
          if (!existingDraft) {
            const [rtSession] = await sql2`
                            SELECT format, topic FROM ops_roundtable_sessions
                            WHERE id = ${session.source_id}
                        `;
            const DRAFT_ELIGIBLE_FORMATS = /* @__PURE__ */ new Set([
              "writing_room",
              "deep_dive",
              "strategy",
              "debate",
              "brainstorm",
              "planning",
              "shipping",
              "reframe",
              "risk_review",
              "cross_exam"
            ]);
            if (rtSession && DRAFT_ELIGIBLE_FORMATS.has(rtSession.format)) {
              const formatConfig = FORMATS[rtSession.format];
              const artifact = formatConfig?.artifact;
              const contentType = artifact?.type && artifact.type !== "none" ? artifact.type : "report";
              const headingMatch = artifactText.match(/^#\s+(.+)$/m);
              const title = headingMatch?.[1]?.trim() || `${contentType.charAt(0).toUpperCase() + contentType.slice(1)}: ${rtSession.topic.slice(0, 100)}`;
              const [draft] = await sql2`
                                INSERT INTO ops_content_drafts (
                                    author_agent, content_type, title, body, status,
                                    source_session_id, metadata
                                ) VALUES (
                                    ${session.agent_id},
                                    ${contentType},
                                    ${title.slice(0, 500)},
                                    '',
                                    'draft',
                                    ${session.source_id},
                                    ${sql2.json({
                format: rtSession.format,
                topic: rtSession.topic,
                artifactType: contentType,
                synthesisSessionId: session.id
              })}
                                )
                                RETURNING id
                            `;
              const reviewReadyBody = buildReviewReadyDraftBody2({
                body: artifactText,
                draftId: draft.id,
                sourceSessionId: session.source_id,
                contentType,
                title: title.slice(0, 500)
              });
              await sql2`
                                UPDATE ops_content_drafts
                                SET body = ${reviewReadyBody}
                                WHERE id = ${draft.id}
                            `;
              log36.info("Content draft created from synthesis", {
                draftId: draft.id,
                sessionId: session.id,
                roundtableId: session.source_id,
                contentType,
                author: session.agent_id
              });
              try {
                const { emitEvent: emitEvent2 } = await Promise.resolve().then(() => (init_events2(), events_exports2));
                await emitEvent2({
                  agent_id: session.agent_id,
                  kind: "content_draft_created",
                  title: `Content draft created: ${title.slice(0, 100)}`,
                  summary: `${contentType} by ${session.agent_id} from ${rtSession.format} synthesis`,
                  tags: ["content", "draft", contentType],
                  metadata: {
                    draftId: draft.id,
                    sessionId: session.source_id,
                    contentType
                  }
                });
              } catch (emitErr) {
                log36.warn("Content draft event emission failed (non-fatal)", {
                  error: emitErr,
                  sessionId: session.id,
                  roundtableId: session.source_id,
                  draftId: draft.id
                });
              }
            }
          }
        } catch (draftErr) {
          log36.error("Content draft creation failed (non-fatal)", {
            error: draftErr,
            sessionId: session.id
          });
        }
      }
    }
  } catch (err) {
    log36.error("Agent session execution failed", {
      error: err,
      sessionId: session.id
    });
    await sql2`
            UPDATE ops_agent_sessions
            SET status = 'failed',
                error = ${err.message},
                completed_at = NOW()
            WHERE id = ${session.id}
        `;
  }
}
async function pollRoundtables() {
  const rows = await sql2`
        UPDATE ops_roundtable_sessions
        SET status = 'running'
        WHERE id = (
            SELECT id FROM ops_roundtable_sessions
            WHERE status = 'pending'
            AND scheduled_for <= NOW()
            ORDER BY
                CASE WHEN source = 'user_question' THEN 0 ELSE 1 END,
                created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;
  const session = rows[0];
  if (!session) return false;
  await sql2`
        UPDATE ops_roundtable_sessions
        SET status = 'pending'
        WHERE id = ${session.id}
    `;
  log36.info("Processing roundtable", {
    sessionId: session.id,
    format: session.format,
    topic: session.topic.slice(0, 80)
  });
  try {
    await orchestrateConversation(session, true);
    if (session.format === "content_review") {
      try {
        const { processReviewSession: processReviewSession2 } = await Promise.resolve().then(() => (init_content_pipeline(), content_pipeline_exports));
        await processReviewSession2(session.id);
        log36.info("Content review processed", {
          sessionId: session.id
        });
      } catch (reviewErr) {
        log36.error("Content review processing failed (non-fatal)", {
          error: reviewErr,
          sessionId: session.id
        });
      }
    }
    const rebellionAgentId = session.metadata?.rebellion_agent_id;
    if (session.format === "cross_exam" && rebellionAgentId) {
      try {
        const { endRebellion: endRebellion2, isAgentRebelling: isAgentRebelling2 } = await Promise.resolve().then(() => (init_rebellion(), rebellion_exports));
        const stillRebelling = await isAgentRebelling2(rebellionAgentId);
        if (stillRebelling) {
          await endRebellion2(
            rebellionAgentId,
            "cross_exam_completed"
          );
          log36.info("Rebellion resolved via cross-exam", {
            sessionId: session.id,
            rebellionAgentId
          });
        }
      } catch (rebellionErr) {
        log36.error(
          "Rebellion resolution from cross-exam failed (non-fatal)",
          {
            error: rebellionErr,
            sessionId: session.id,
            rebellionAgentId
          }
        );
      }
    }
  } catch (err) {
    log36.error("Roundtable orchestration failed", {
      error: err,
      sessionId: session.id
    });
  }
  return true;
}
var MAX_PARALLEL_STEPS = Math.max(
  1,
  Number.parseInt(process.env.WORKER_MISSION_STEP_CONCURRENCY ?? "5", 10) || 1
);
async function pollMissionSteps() {
  const steps = await sql2`
        UPDATE ops_mission_steps
        SET status = 'running',
            reserved_by = ${WORKER_ID},
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = ANY(
            ARRAY(
                SELECT s.id FROM ops_mission_steps s
                WHERE s.status = 'queued'
                AND NOT EXISTS (
                    SELECT 1 FROM ops_mission_steps dep
                    WHERE dep.id = ANY(s.depends_on)
                    AND dep.status != 'succeeded'
                )
                ORDER BY s.created_at ASC
                LIMIT ${MAX_PARALLEL_STEPS}
                FOR UPDATE SKIP LOCKED
            )
        )
        RETURNING *
    `;
  if (steps.length === 0) return false;
  await Promise.allSettled(
    steps.map(
      (step) => dispatchMissionStep(step)
    )
  );
  return true;
}
function proposedStepFromRow(step) {
  return {
    kind: step.kind,
    payload: step.payload ?? {},
    assigned_agent: step.assigned_agent ?? void 0,
    output_path: step.output_path ?? void 0
  };
}
function proposedStepFromContract(contractStep) {
  return {
    kind: contractStep.kind,
    payload: contractStep.payload,
    assigned_agent: contractStep.assignedAgent ?? void 0,
    output_path: contractStep.outputPath ?? void 0
  };
}
async function appendStepExecutionEvidence(input) {
  try {
    const [mission] = await sql2`
            SELECT execution_contract FROM ops_missions WHERE id = ${input.step.mission_id}
        `;
    if (!mission?.execution_contract) return;
    const { hashStep: hashStep2 } = await Promise.resolve().then(() => (init_proposal_runner(), proposal_runner_exports));
    const { validateSealedExecutionContract: validateSealedExecutionContract2 } = await Promise.resolve().then(() => (init_proposal_service(), proposal_service_exports));
    const { recordExecutionEvidence: recordExecutionEvidence2, blockerClassForOutcome: blockerClassForOutcome2 } = await Promise.resolve().then(() => (init_execution_evidence(), execution_evidence_exports));
    const contract = validateSealedExecutionContract2(mission.execution_contract);
    const stepHash = hashStep2(proposedStepFromRow(input.step));
    const contractStep = contract.approvedSteps.find(
      (approvedStep) => approvedStep.stepHash === stepHash
    );
    if (!contractStep) return;
    await recordExecutionEvidence2({
      missionId: input.step.mission_id,
      stepId: input.step.id,
      contract,
      contractStep,
      outcome: input.outcome,
      blockerClass: blockerClassForOutcome2(input.outcome, input.reason),
      artifactPaths: input.step.output_path ? [input.step.output_path] : [],
      evidence: {
        ...input.evidence ?? {},
        reason: input.reason ?? void 0
      },
      recordedBy: input.recordedBy ?? input.step.assigned_agent ?? null
    });
  } catch (err) {
    log36.warn("Failed to append mission step execution evidence", {
      error: err,
      stepId: input.step.id,
      missionId: input.step.mission_id,
      outcome: input.outcome
    });
  }
}
async function dispatchMissionStep(step) {
  log36.info("Processing mission step", {
    stepId: step.id,
    kind: step.kind,
    missionId: step.mission_id
  });
  try {
    const { hasActiveVeto: hasActiveVeto2 } = await Promise.resolve().then(() => (init_veto(), veto_exports));
    const missionVeto = await hasActiveVeto2("mission", step.mission_id);
    if (missionVeto.vetoed) {
      log36.info("Mission step blocked by veto on mission", {
        stepId: step.id,
        missionId: step.mission_id,
        vetoId: missionVeto.vetoId,
        severity: missionVeto.severity
      });
      await sql2`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${`Blocked by ${missionVeto.severity} veto on mission: ${missionVeto.reason}`},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
      await appendStepExecutionEvidence({
        step,
        outcome: "failed",
        reason: `Blocked by ${missionVeto.severity} veto on mission: ${missionVeto.reason}`,
        evidence: { vetoId: missionVeto.vetoId, severity: missionVeto.severity }
      });
      await finalizeMissionIfComplete(step.mission_id);
      return;
    }
    const stepVeto = await hasActiveVeto2("step", step.id);
    if (stepVeto.vetoed) {
      log36.info("Mission step blocked by veto on step", {
        stepId: step.id,
        vetoId: stepVeto.vetoId,
        severity: stepVeto.severity
      });
      await sql2`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${`Blocked by ${stepVeto.severity} veto on step: ${stepVeto.reason}`},
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
      await appendStepExecutionEvidence({
        step,
        outcome: "failed",
        reason: `Blocked by ${stepVeto.severity} veto on step: ${stepVeto.reason}`,
        evidence: { vetoId: stepVeto.vetoId, severity: stepVeto.severity }
      });
      await finalizeMissionIfComplete(step.mission_id);
      return;
    }
  } catch (vetoErr) {
    log36.error("Veto check failed (non-fatal, allowing step)", {
      error: vetoErr,
      stepId: step.id
    });
  }
  try {
    const [mission] = await sql2`
            SELECT title, created_by, proposal_id, execution_contract
            FROM ops_missions
            WHERE id = ${step.mission_id}
        `;
    if (!mission) {
      throw new Error(`Mission ${step.mission_id} not found`);
    }
    if (!mission.execution_contract) {
      throw new Error(
        `Mission ${step.mission_id} has no sealed execution contract`
      );
    }
    const { hashStep: hashStep2 } = await Promise.resolve().then(() => (init_proposal_runner(), proposal_runner_exports));
    const { validateSealedExecutionContract: validateSealedExecutionContract2 } = await Promise.resolve().then(() => (init_proposal_service(), proposal_service_exports));
    const executionContract = validateSealedExecutionContract2(
      mission.execution_contract
    );
    if (mission.proposal_id && executionContract.proposalId !== mission.proposal_id) {
      throw new Error(
        `Execution contract proposalId ${executionContract.proposalId} does not match mission proposal ${mission.proposal_id}`
      );
    }
    if (Date.parse(executionContract.expiresAt) <= Date.now()) {
      throw new Error(
        `Execution contract ${executionContract.contractHash} expired before step ${step.id}`
      );
    }
    const queuedStepHash = hashStep2(proposedStepFromRow(step));
    const contractStep = executionContract.approvedSteps.find(
      (approvedStep2) => approvedStep2.stepHash === queuedStepHash
    );
    if (!contractStep) {
      throw new Error(
        `Mission step ${step.id} is not covered by sealed execution contract ${executionContract.contractHash}`
      );
    }
    const approvedStep = proposedStepFromContract(contractStep);
    const agentId = approvedStep.assigned_agent ?? mission.created_by ?? "mux";
    const { emitEvent: emitEvent2 } = await Promise.resolve().then(() => (init_events2(), events_exports2));
    if (approvedStep.kind === "memory_archaeology") {
      const { performDig: performDig2 } = await Promise.resolve().then(() => (init_memory_archaeology(), memory_archaeology_exports));
      const result = await performDig2({
        agent_id: agentId,
        max_memories: 100
      });
      await sql2`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    result = ${sql2.json({
        dig_id: result.dig_id,
        finding_count: result.findings.length,
        memories_analyzed: result.memories_analyzed
      })}::jsonb,
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
      await appendStepExecutionEvidence({
        step,
        outcome: "succeeded",
        recordedBy: agentId,
        evidence: {
          directHandler: "memory_archaeology",
          dig_id: result.dig_id,
          finding_count: result.findings.length,
          memories_analyzed: result.memories_analyzed,
          contractHash: executionContract.contractHash,
          contractStepIndex: contractStep.index
        }
      });
      await emitEvent2({
        agent_id: agentId,
        kind: "archaeology_complete",
        title: `Memory archaeology dig completed \u2014 ${result.findings.length} findings`,
        tags: ["archaeology", "memory", "complete"],
        metadata: {
          dig_id: result.dig_id,
          finding_count: result.findings.length,
          memories_analyzed: result.memories_analyzed,
          missionId: step.mission_id,
          stepId: step.id
        }
      });
      await finalizeMissionIfComplete(step.mission_id);
      return;
    }
    if (approvedStep.kind === "convene_roundtable") {
      const payload = approvedStep.payload ?? {};
      const format = payload.format ?? "brainstorm";
      const topic = payload.topic ?? mission.title ?? "Roundtable";
      const participants = payload.participants ?? [
        "chora",
        "subrosa",
        "thaum",
        "praxis",
        "mux"
      ];
      await sql2`
                INSERT INTO ops_roundtable_sessions (
                    format, topic, participants, status, scheduled_for, source, metadata
                ) VALUES (
                    ${format},
                    ${topic},
                    ${participants},
                    'pending',
                    NOW(),
                    'mission',
                    ${sql2.json({ mission_id: step.mission_id, step_id: step.id })}::jsonb
                )
            `;
      await sql2`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    result = ${sql2.json({ action: "roundtable_enqueued", format, topic })}::jsonb,
                    completed_at = NOW(),
                    updated_at = NOW()
                WHERE id = ${step.id}
            `;
      await appendStepExecutionEvidence({
        step,
        outcome: "succeeded",
        recordedBy: agentId,
        evidence: {
          directHandler: "convene_roundtable",
          action: "roundtable_enqueued",
          format,
          topic,
          contractHash: executionContract.contractHash,
          contractStepIndex: contractStep.index
        }
      });
      await emitEvent2({
        agent_id: agentId,
        kind: "roundtable_enqueued",
        title: `Roundtable enqueued: ${format} \u2014 ${topic.slice(0, 80)}`,
        tags: ["mission", "roundtable", "enqueued"],
        metadata: {
          missionId: step.mission_id,
          stepId: step.id,
          format,
          topic
        }
      });
      await finalizeMissionIfComplete(step.mission_id);
      return;
    }
    const { buildStepPrompt: buildStepPrompt2 } = await Promise.resolve().then(() => (init_step_prompts(), step_prompts_exports));
    const { prompt, templateVersion } = await buildStepPrompt2(
      approvedStep.kind,
      {
        missionTitle: mission.title ?? "Unknown",
        agentId,
        payload: approvedStep.payload ?? {},
        outputPath: approvedStep.output_path ?? void 0
      },
      { withVersion: true }
    );
    if (templateVersion != null) {
      await sql2`
                UPDATE ops_mission_steps
                SET template_version = ${templateVersion}
                WHERE id = ${step.id}
            `;
    }
    if (approvedStep.output_path) {
      const outputPrefix = approvedStep.output_path.endsWith("/") ? approvedStep.output_path : approvedStep.output_path + "/";
      try {
        await sql2`
                    INSERT INTO ops_acl_grants (agent_id, path_prefix, source, source_id, expires_at)
                    VALUES (${agentId}, ${outputPrefix}, 'mission', ${step.mission_id}::uuid, NOW() + INTERVAL '4 hours')
                `;
      } catch (grantErr) {
        log36.warn("Failed to create ACL grant for step", {
          error: grantErr,
          agentId,
          outputPath: approvedStep.output_path
        });
      }
    }
    const [session] = await sql2`
            INSERT INTO ops_agent_sessions (
                agent_id, prompt, source, source_id,
                timeout_seconds, max_tool_rounds, status, result
            ) VALUES (
                ${agentId},
                ${prompt},
                'mission',
                ${step.mission_id},
                1800,
                30,
                'pending',
                ${sql2.json({ mission_step_id: step.id })}::jsonb
            )
            RETURNING id
        `;
    await sql2`
            UPDATE ops_mission_steps
            SET result = ${sql2.json({ agent_session_id: session.id, agent: agentId })}::jsonb,
                assigned_agent = COALESCE(assigned_agent, ${agentId}),
                updated_at = NOW()
            WHERE id = ${step.id}
        `;
    await appendStepExecutionEvidence({
      step: { ...step, assigned_agent: agentId },
      outcome: "dispatched",
      recordedBy: agentId,
      evidence: {
        agentSessionId: session.id,
        contractHash: executionContract.contractHash,
        contractStepIndex: contractStep.index
      }
    });
    await emitEvent2({
      agent_id: agentId,
      kind: "step_dispatched",
      title: `Step dispatched to agent session: ${approvedStep.kind}`,
      tags: ["mission", "step", "dispatched"],
      metadata: {
        missionId: step.mission_id,
        stepId: step.id,
        kind: approvedStep.kind,
        agentSessionId: session.id,
        contractHash: executionContract.contractHash,
        contractStepIndex: contractStep.index
      }
    });
  } catch (err) {
    log36.error("Mission step failed", { error: err, stepId: step.id });
    const stepData = await sql2`
            SELECT result FROM ops_mission_steps WHERE id = ${step.id}
        `;
    const agentSessionId = stepData[0]?.result?.agent_session_id;
    await sql2`
            UPDATE ops_mission_steps
            SET status = 'failed',
                failure_reason = ${err.message},
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${step.id}
        `;
    await appendStepExecutionEvidence({
      step,
      outcome: "failed",
      reason: err.message,
      evidence: { agentSessionId, failureStage: "dispatch" }
    });
    if (agentSessionId) {
      await sql2`
                UPDATE ops_agent_sessions
                SET status = 'failed',
                    error = ${err.message},
                    completed_at = NOW()
                WHERE id = ${agentSessionId}
                  AND status = 'pending'
            `;
    }
    await finalizeMissionIfComplete(step.mission_id);
  }
}
var RESEARCH_STEP_KINDS = /* @__PURE__ */ new Set([
  "research_topic",
  "scan_signals",
  "analyze_discourse",
  "classify_pattern",
  "trace_incentive",
  "identify_assumption"
]);
var INSIGHT_STEP_KINDS = /* @__PURE__ */ new Set([
  "distill_insight",
  "consolidate_memory",
  "document_lesson",
  "memory_archaeology"
]);
async function finalizeMissionSteps() {
  const steps = await sql2`
        SELECT
            s.id,
            s.mission_id,
            s.kind,
            s.payload,
            s.output_path,
            s.status as step_status,
            s.assigned_agent,
            sess.id as session_id,
            sess.agent_id as session_agent_id,
            sess.status as session_status,
            sess.error as session_error,
            CASE WHEN sess.status IN ('succeeded', 'blocked')
                THEN LEFT(COALESCE(sess.result->>'blocked_reason', sess.error), 1000)
                ELSE NULL
            END as session_blocked_reason,
            CASE WHEN sess.status IN ('succeeded', 'blocked')
                THEN LEFT(sess.result->>'summary', 2000)
                ELSE NULL
            END as session_summary
        FROM ops_mission_steps s
        LEFT JOIN LATERAL (
            SELECT candidate.*
            FROM ops_agent_sessions candidate
            WHERE (
                s.result->>'agent_session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                AND candidate.id::text = s.result->>'agent_session_id'
            )
            OR (
                candidate.source = 'mission'
                AND candidate.result->>'mission_step_id' = s.id::text
                AND candidate.status IN ('succeeded', 'blocked', 'failed', 'timed_out')
                AND candidate.completed_at > s.started_at
            )
            OR (
                s.result->>'agent_session_id' IS NULL
                AND candidate.source = 'mission'
                AND candidate.source_id = s.mission_id::text
                AND candidate.agent_id = s.assigned_agent
                AND candidate.status IN ('succeeded', 'blocked', 'failed', 'timed_out')
                AND candidate.completed_at > s.started_at
                AND (
                    SELECT COUNT(*) FROM ops_agent_sessions terminal
                    WHERE terminal.source = 'mission'
                      AND terminal.source_id = s.mission_id::text
                      AND terminal.agent_id = s.assigned_agent
                      AND terminal.status IN ('succeeded', 'blocked', 'failed', 'timed_out')
                      AND terminal.completed_at > s.started_at
                ) = 1
                AND (
                    SELECT COUNT(*) FROM ops_mission_steps unmatched
                    WHERE unmatched.mission_id = s.mission_id
                      AND unmatched.assigned_agent = s.assigned_agent
                      AND (
                        unmatched.status = 'running'
                        OR (
                            unmatched.status = 'failed'
                            AND unmatched.failure_reason LIKE 'Swept — step running with no %agent session'
                        )
                      )
                      AND unmatched.result->>'agent_session_id' IS NULL
                      AND unmatched.started_at <= candidate.completed_at
                ) = 1
                AND NOT EXISTS (
                    SELECT 1 FROM ops_agent_sessions live
                    WHERE live.source = 'mission'
                      AND live.source_id = s.mission_id::text
                      AND live.agent_id = s.assigned_agent
                      AND live.status IN ('pending', 'running')
                      AND live.created_at >= s.started_at
                )
            )
            ORDER BY
                CASE
                    WHEN s.result->>'agent_session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                     AND candidate.id::text = s.result->>'agent_session_id'
                    THEN 0
                    WHEN candidate.result->>'mission_step_id' = s.id::text
                    THEN 1
                    ELSE 2
                END,
                candidate.completed_at DESC NULLS LAST
            LIMIT 1
        ) sess ON TRUE
        WHERE (
            s.status = 'running'
            OR (
                s.status = 'failed'
                AND s.failure_reason LIKE 'Swept — step running with no %agent session'
            )
        )
    `;
  if (steps.length === 0) return false;
  let finalized = 0;
  for (const step of steps) {
    if (!step.session_status) continue;
    if (step.session_status === "succeeded") {
      const updated = await sql2`
                UPDATE ops_mission_steps
                SET status = 'succeeded',
                    failure_reason = NULL,
                    completed_at = NOW(),
                    updated_at = NOW(),
                    result = COALESCE(result, '{}'::jsonb) || jsonb_build_object(
                        'agent_session_id', ${step.session_id},
                        'reconciledBy', 'worker-finalizer',
                        'reconciledAt', NOW()
                    )
                WHERE id = ${step.id}
                  AND (
                    status = 'running'
                    OR (
                        status = 'failed'
                        AND failure_reason LIKE 'Swept — step running with no %agent session'
                    )
                  )
                RETURNING id
            `;
      if (updated.length === 0) continue;
      finalized++;
      await appendStepExecutionEvidence({
        step: {
          id: step.id,
          mission_id: step.mission_id,
          kind: step.kind,
          payload: step.payload,
          assigned_agent: step.assigned_agent ?? step.session_agent_id,
          output_path: step.output_path
        },
        outcome: "succeeded",
        recordedBy: step.assigned_agent ?? step.session_agent_id,
        evidence: {
          agentSessionId: step.session_id ?? void 0,
          sessionStatus: step.session_status,
          sessionSummary: step.session_summary ?? void 0,
          recoveredSweptFailure: step.step_status === "failed"
        }
      });
      await finalizeMissionIfComplete(step.mission_id, {
        recoverSweptFailure: step.step_status === "failed"
      });
      const resolvedAgent = step.assigned_agent || step.session_agent_id;
      if (resolvedAgent) {
        try {
          const { emitEvent: emitStepEvent } = await Promise.resolve().then(() => (init_events2(), events_exports2));
          if (RESEARCH_STEP_KINDS.has(step.kind)) {
            await emitStepEvent({
              agent_id: resolvedAgent,
              kind: "research_completed",
              title: `Research completed: ${step.kind}`,
              summary: step.session_summary || void 0,
              tags: ["research", step.kind, "completed"],
              metadata: {
                missionId: step.mission_id,
                stepId: step.id,
                stepKind: step.kind
              }
            });
          } else if (INSIGHT_STEP_KINDS.has(step.kind)) {
            await emitStepEvent({
              agent_id: resolvedAgent,
              kind: "insight_generated",
              title: `Insight generated: ${step.kind}`,
              summary: step.session_summary || void 0,
              tags: ["insight", step.kind, "completed"],
              metadata: {
                missionId: step.mission_id,
                stepId: step.id,
                stepKind: step.kind
              }
            });
          }
        } catch (emitErr) {
          log36.warn("Mission step completion event failed (non-fatal)", {
            error: emitErr,
            stepId: step.id,
            missionId: step.mission_id
          });
        }
      }
    } else if (step.session_status === "blocked") {
      const updated = await sql2`
                UPDATE ops_mission_steps
                SET status = 'blocked',
                    failure_reason = ${step.session_blocked_reason ?? "Agent session blocked"},
                    completed_at = NOW(),
                    updated_at = NOW(),
                    result = COALESCE(result, '{}'::jsonb) || jsonb_build_object(
                        'agent_session_id', ${step.session_id},
                        'reconciledBy', 'worker-finalizer',
                        'reconciledAt', NOW()
                    )
                WHERE id = ${step.id}
                  AND (
                    status = 'running'
                    OR (
                        status = 'failed'
                        AND failure_reason LIKE 'Swept — step running with no %agent session'
                    )
                  )
                RETURNING id
            `;
      if (updated.length === 0) continue;
      finalized++;
      await appendStepExecutionEvidence({
        step: {
          id: step.id,
          mission_id: step.mission_id,
          kind: step.kind,
          payload: step.payload,
          assigned_agent: step.assigned_agent ?? step.session_agent_id,
          output_path: step.output_path
        },
        outcome: "blocked",
        reason: step.session_blocked_reason ?? "Agent session blocked",
        recordedBy: step.assigned_agent ?? step.session_agent_id,
        evidence: {
          agentSessionId: step.session_id ?? void 0,
          sessionStatus: step.session_status,
          sessionSummary: step.session_summary ?? void 0
        }
      });
      await finalizeMissionIfComplete(step.mission_id, {
        recoverSweptFailure: step.step_status === "failed"
      });
    } else if (step.session_status === "failed" || step.session_status === "timed_out") {
      const updated = await sql2`
                UPDATE ops_mission_steps
                SET status = 'failed',
                    failure_reason = ${step.session_error ?? (step.session_status === "timed_out" ? "Agent session timed out" : "Agent session failed")},
                    completed_at = NOW(),
                    updated_at = NOW(),
                    result = COALESCE(result, '{}'::jsonb) || jsonb_build_object(
                        'agent_session_id', ${step.session_id},
                        'reconciledBy', 'worker-finalizer',
                        'reconciledAt', NOW()
                    )
                WHERE id = ${step.id}
                  AND (
                    status = 'running'
                    OR (
                        status = 'failed'
                        AND failure_reason LIKE 'Swept — step running with no %agent session'
                    )
                  )
                RETURNING id
            `;
      if (updated.length === 0) continue;
      finalized++;
      await appendStepExecutionEvidence({
        step: {
          id: step.id,
          mission_id: step.mission_id,
          kind: step.kind,
          payload: step.payload,
          assigned_agent: step.assigned_agent ?? step.session_agent_id,
          output_path: step.output_path
        },
        outcome: "failed",
        reason: step.session_error ?? (step.session_status === "timed_out" ? "Agent session timed out" : "Agent session failed"),
        recordedBy: step.assigned_agent ?? step.session_agent_id,
        evidence: {
          agentSessionId: step.session_id ?? void 0,
          sessionStatus: step.session_status
        }
      });
      await finalizeMissionIfComplete(step.mission_id, {
        recoverSweptFailure: step.step_status === "failed"
      });
    }
  }
  return finalized > 0;
}
async function pollInitiatives() {
  const [entry] = await sql2`
        UPDATE ops_initiative_queue
        SET status = 'processing'
        WHERE id = (
            SELECT id FROM ops_initiative_queue
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING *
    `;
  if (!entry) return false;
  log36.info("Processing initiative", {
    entryId: entry.id,
    agent: entry.agent_id
  });
  try {
    const initiativeAction = entry.context?.action;
    if (initiativeAction === "agent_design_proposal") {
      log36.info("Processing agent design proposal", {
        entryId: entry.id,
        agent: entry.agent_id
      });
      const { generateAgentProposal: generateAgentProposal2 } = await Promise.resolve().then(() => (init_agent_designer(), agent_designer_exports));
      const proposal = await generateAgentProposal2(entry.agent_id);
      await sql2`
                UPDATE ops_initiative_queue
                SET status = 'completed',
                    processed_at = NOW(),
                    result = ${sql2.json({
        type: "agent_design_proposal",
        proposalId: proposal.id,
        agentName: proposal.agent_name
      })}::jsonb
                WHERE id = ${entry.id}
            `;
      return true;
    }
    if (initiativeAction === "memory_archaeology") {
      log36.info("Processing memory archaeology dig", {
        entryId: entry.id,
        agent: entry.agent_id
      });
      const { performDig: performDig2 } = await Promise.resolve().then(() => (init_memory_archaeology(), memory_archaeology_exports));
      const maxMemories = entry.context?.max_memories ?? 100;
      const agentRows = await sql2`
                SELECT DISTINCT agent_id FROM ops_agent_memory
                WHERE superseded_by IS NULL
                ORDER BY agent_id
            `;
      const agentIds = agentRows.map((r) => r.agent_id);
      const weekNumber = Math.floor(Date.now() / (7 * 864e5));
      const targetAgent = agentIds.length > 0 ? agentIds[weekNumber % agentIds.length] : entry.agent_id;
      const result = await performDig2({
        agent_id: targetAgent,
        max_memories: maxMemories
      });
      await sql2`
                UPDATE ops_initiative_queue
                SET status = 'completed',
                    processed_at = NOW(),
                    result = ${sql2.json({
        type: "memory_archaeology",
        dig_id: result.dig_id,
        finding_count: result.findings.length,
        memories_analyzed: result.memories_analyzed,
        target_agent: targetAgent
      })}::jsonb
                WHERE id = ${entry.id}
            `;
      return true;
    }
    const memories = entry.context?.memories ?? [];
    const AGENT_MISSION_TEMPLATES = {
      chora: [
        {
          title: "Pattern analysis of recent collective activity",
          description: "Trace structural patterns in our recent operations",
          steps: [
            {
              kind: "scan_signals",
              payload: {
                topic: "recent collective patterns and trends"
              }
            },
            {
              kind: "distill_insight",
              payload: {
                topic: "synthesize findings into actionable patterns"
              }
            }
          ]
        },
        {
          title: "Map dependency chains in current workflows",
          description: "Identify fragile dependencies and single points of failure",
          steps: [
            {
              kind: "research_topic",
              payload: { topic: "current workflow dependencies" }
            },
            {
              kind: "document_lesson",
              payload: { topic: "dependency analysis findings" }
            }
          ]
        },
        {
          title: "Diagnose recurring operational friction",
          description: "Investigate why certain processes keep stalling",
          steps: [
            {
              kind: "audit_system",
              payload: { topic: "operational bottlenecks" }
            },
            {
              kind: "distill_insight",
              payload: { topic: "root cause analysis" }
            }
          ]
        }
      ],
      subrosa: [
        {
          title: "Threat model review of current systems",
          description: "Evaluate exposure and adversarial risk",
          steps: [
            {
              kind: "audit_system",
              payload: { topic: "security threat modeling" }
            },
            {
              kind: "document_lesson",
              payload: { topic: "threat assessment findings" }
            }
          ]
        },
        {
          title: "Review information exposure surfaces",
          description: "Assess what we reveal publicly and whether it is appropriate",
          steps: [
            {
              kind: "scan_signals",
              payload: { topic: "public information exposure" }
            },
            {
              kind: "critique_content",
              payload: { topic: "exposure risk assessment" }
            }
          ]
        }
      ],
      thaum: [
        {
          title: "Reframe a stalled initiative",
          description: "Apply lateral thinking to an initiative that lost momentum",
          steps: [
            {
              kind: "research_topic",
              payload: {
                topic: "stalled initiatives needing reframe"
              }
            },
            {
              kind: "draft_essay",
              payload: { topic: "alternative framing proposal" }
            }
          ]
        },
        {
          title: "Cross-domain insight synthesis",
          description: "Connect ideas from different domains to generate novel approaches",
          steps: [
            {
              kind: "scan_signals",
              payload: { topic: "cross-domain patterns" }
            },
            {
              kind: "distill_insight",
              payload: { topic: "novel synthesis" }
            }
          ]
        }
      ],
      praxis: [
        {
          title: "Ship check on incomplete deliverables",
          description: "Audit what is close to done and push it over the line",
          steps: [
            {
              kind: "audit_system",
              payload: { topic: "incomplete deliverables" }
            },
            {
              kind: "patch_code",
              payload: { topic: "finish pending work" }
            }
          ]
        },
        {
          title: "Convert recent strategy into tasks",
          description: "Turn strategic discussions into concrete, assigned work",
          steps: [
            {
              kind: "research_topic",
              payload: { topic: "recent strategy decisions" }
            },
            {
              kind: "document_lesson",
              payload: {
                topic: "task breakdown and assignments"
              }
            }
          ]
        }
      ],
      mux: [
        {
          title: "Consolidate and organize recent outputs",
          description: "Clean up and structure recent work products",
          steps: [
            {
              kind: "consolidate_memory",
              payload: { topic: "recent output organization" }
            },
            {
              kind: "document_lesson",
              payload: { topic: "output catalog update" }
            }
          ]
        },
        {
          title: "Draft status report on active missions",
          description: "Compile current mission progress into a clear report",
          steps: [
            {
              kind: "audit_system",
              payload: { topic: "active mission status" }
            },
            {
              kind: "draft_thread",
              payload: { topic: "mission status summary" }
            }
          ]
        }
      ],
      primus: [
        {
          title: "Evaluate collective alignment with core mission",
          description: "Assess whether recent activity serves the stated mission",
          steps: [
            {
              kind: "scan_signals",
              payload: { topic: "mission alignment assessment" }
            },
            {
              kind: "distill_insight",
              payload: { topic: "alignment findings" }
            }
          ]
        }
      ]
    };
    const templates = AGENT_MISSION_TEMPLATES[entry.agent_id] ?? AGENT_MISSION_TEMPLATES.mux;
    let memoryHint = "";
    if (Array.isArray(memories) && memories.length > 0) {
      const recentMemory = memories[0];
      if (recentMemory?.content) {
        memoryHint = recentMemory.content.slice(0, 100);
      }
    }
    const templateIdx = Math.floor(Date.now() / 864e5) % templates.length;
    const template = templates[templateIdx];
    const title = memoryHint ? `${template.title} \u2014 ${memoryHint.slice(0, 60)}` : template.title;
    const parsed = {
      title,
      description: template.description,
      steps: template.steps
    };
    if (parsed.title) {
      const { createProposalAndMaybeAutoApprove: createProposalAndMaybeAutoApprove2 } = await Promise.resolve().then(() => (init_proposal_service(), proposal_service_exports));
      await createProposalAndMaybeAutoApprove2({
        agent_id: entry.agent_id,
        title: parsed.title,
        description: parsed.description ?? "",
        proposed_steps: parsed.steps ?? [],
        source: "initiative",
        source_trace_id: `initiative:${entry.id}`
      });
    }
    await sql2`
            UPDATE ops_initiative_queue
            SET status = 'completed',
                processed_at = NOW(),
                result = ${sql2.json({ text: parsed.title, parsed })}::jsonb
            WHERE id = ${entry.id}
        `;
  } catch (err) {
    log36.error("Initiative processing failed", {
      error: err,
      entryId: entry.id
    });
    await sql2`
            UPDATE ops_initiative_queue
            SET status = 'failed',
                processed_at = NOW(),
                result = ${sql2.json({ error: err.message })}::jsonb
            WHERE id = ${entry.id}
        `;
  }
  return true;
}
async function sweepStaleAgentSessions() {
  const stale = await sql2`
        UPDATE ops_agent_sessions
        SET status = 'timed_out',
            error = 'Swept by worker — session exceeded timeout while running',
            completed_at = NOW()
        WHERE status = 'running'
          AND started_at < NOW() - COALESCE(timeout_seconds, 600) * INTERVAL '1 second' - INTERVAL '5 minutes'
        RETURNING id, agent_id, source
    `;
  if (stale.length > 0) {
    log36.warn("Swept stale agent sessions", {
      count: stale.length,
      sessions: stale.map((s) => ({
        id: s.id,
        agent: s.agent_id,
        source: s.source
      }))
    });
  }
  return stale.length > 0;
}
async function sweepStaleRoundtables() {
  const stale = await sql2`
        UPDATE ops_roundtable_sessions
        SET status = 'failed',
            completed_at = NOW(),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'sweptReason', 'Swept by worker — roundtable exceeded running timeout',
                'sweptAt', NOW()
            )
        WHERE status = 'running'
          AND started_at < NOW() - INTERVAL '4 hours'
        RETURNING id, format, topic
    `;
  if (stale.length > 0) {
    log36.warn("Swept stale roundtables", {
      count: stale.length,
      sessions: stale.map((s) => ({
        id: s.id,
        format: s.format,
        topic: s.topic.slice(0, 120)
      }))
    });
  }
  return stale.length > 0;
}
async function recoverSweptLiveMissionSteps() {
  const recovered = await sql2`
        UPDATE ops_mission_steps step
        SET status = 'running',
            failure_reason = NULL,
            completed_at = NULL,
            updated_at = NOW()
        FROM ops_agent_sessions session
        WHERE step.status = 'failed'
          AND step.failure_reason = 'Swept — step running with no live agent session'
          AND step.result->>'agent_session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          AND session.id::text = step.result->>'agent_session_id'
          AND session.status IN ('pending', 'running')
        RETURNING step.id, step.mission_id, step.kind, step.assigned_agent, session.status AS session_status
    `;
  if (recovered.length > 0) {
    log36.warn("Recovered swept mission steps with live sessions", {
      count: recovered.length,
      steps: recovered.map((s) => ({
        id: s.id,
        missionId: s.mission_id,
        kind: s.kind,
        agent: s.assigned_agent,
        sessionStatus: s.session_status
      }))
    });
  }
  return recovered.length > 0;
}
async function sweepOrphanedMissionSteps() {
  const requeued = await sql2`
        UPDATE ops_mission_steps
        SET status = 'queued',
            reserved_by = NULL,
            started_at = NULL,
            updated_at = NOW(),
            failure_reason = NULL,
            result = COALESCE(result, '{}'::jsonb) || jsonb_build_object(
                'requeuedReason', 'Swept — running step had no agent session link',
                'requeuedAt', NOW()
            )
        WHERE status = 'running'
          AND started_at < NOW() - INTERVAL '2 hours'
          AND result->>'agent_session_id' IS NULL
        RETURNING id, mission_id, kind, assigned_agent
    `;
  const orphaned = await sql2`
        UPDATE ops_mission_steps step
        SET status = 'failed',
            failure_reason = 'Swept — step running with no live agent session',
            completed_at = NOW(),
            updated_at = NOW()
        WHERE step.status = 'running'
          AND step.started_at < NOW() - INTERVAL '2 hours'
          AND step.result->>'agent_session_id' IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM ops_agent_sessions s
              WHERE step.result->>'agent_session_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                AND s.id::text = step.result->>'agent_session_id'
          )
        RETURNING step.id, step.mission_id, step.kind, step.assigned_agent
    `;
  if (requeued.length > 0) {
    log36.warn("Requeued mission steps without session links", {
      count: requeued.length,
      steps: requeued.map((s) => ({
        id: s.id,
        missionId: s.mission_id,
        kind: s.kind,
        agent: s.assigned_agent
      }))
    });
  }
  if (orphaned.length > 0) {
    log36.warn("Swept orphaned mission steps", {
      count: orphaned.length,
      steps: orphaned.map((s) => ({
        id: s.id,
        missionId: s.mission_id,
        kind: s.kind,
        agent: s.assigned_agent
      }))
    });
    const missionIds = [...new Set(orphaned.map((s) => s.mission_id))];
    for (const missionId of missionIds) {
      await finalizeMissionIfComplete(missionId);
    }
  }
  return requeued.length > 0 || orphaned.length > 0;
}
async function runMaintenanceTasks() {
  await sweepStaleAgentSessions();
  await sweepStaleRoundtables();
  await finalizeMissionSteps();
  await recoverSweptLiveMissionSteps();
  await sweepOrphanedMissionSteps();
  await triggerHeartbeatIfDue();
}
async function finalizeMissionIfComplete(missionId, options) {
  const [counts] = await sql2`
        SELECT
            COUNT(*)::int as total,
            COUNT(*) FILTER (WHERE status = 'succeeded')::int as succeeded,
            COUNT(*) FILTER (WHERE status = 'blocked')::int as blocked,
            COUNT(*) FILTER (WHERE status = 'failed')::int as failed
        FROM ops_mission_steps
        WHERE mission_id = ${missionId}
    `;
  if (!counts || counts.total === 0) return;
  const allDone = counts.succeeded + counts.blocked + counts.failed === counts.total;
  if (!allDone) return;
  const finalStatus = counts.failed > 0 ? "failed" : counts.blocked > 0 ? "blocked" : "succeeded";
  const failReason = counts.failed > 0 ? `${counts.failed} of ${counts.total} steps failed` : counts.blocked > 0 ? `${counts.blocked} of ${counts.total} steps blocked` : null;
  await sql2`
        UPDATE ops_missions
        SET status = ${finalStatus},
            failure_reason = ${failReason},
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = ${missionId}
        AND (
            status IN ('running', 'approved')
            OR (
                ${options?.recoverSweptFailure ?? false}
                AND status = 'failed'
                AND failure_reason LIKE '%step%failed'
            )
        )
    `;
}
async function waitForDb(maxRetries = 30, intervalMs = 2e3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sql2`SELECT 1 FROM ops_roundtable_sessions LIMIT 0`;
      log36.info("Database ready", { attempt });
      return;
    } catch (dbErr) {
      log36.warn("Database not ready yet", {
        error: dbErr,
        attempt,
        maxRetries
      });
      if (attempt === maxRetries) {
        throw new Error(
          `Database not ready after ${maxRetries} attempts`
        );
      }
      log36.info("Waiting for database...", { attempt, maxRetries });
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
var running = true;
async function catchUpStuckReviews() {
  const stuck = await sql2`
        SELECT d.id, d.review_session_id, d.title
        FROM ops_content_drafts d
        JOIN ops_roundtable_sessions rs ON rs.id = d.review_session_id
        WHERE d.status = 'review'
          AND rs.status = 'completed'
    `;
  const { processReviewSession: processReviewSession2 } = await Promise.resolve().then(() => (init_content_pipeline(), content_pipeline_exports));
  await processCompletedReviewDrafts(
    stuck,
    (reviewSessionId) => processReviewSession2(reviewSessionId),
    log36
  );
}
async function catchUpOrphanedReviewDrafts() {
  const stale = await sql2`
        SELECT d.id, d.title, d.review_session_id
        FROM ops_content_drafts d
        LEFT JOIN ops_roundtable_sessions rs ON rs.id = d.review_session_id
        WHERE d.status = 'review'
          AND d.created_at < NOW() - interval '24 hours'
          AND (
              d.review_session_id IS NULL
              OR rs.id IS NULL
              OR rs.status <> 'completed'
          )
    `;
  await releaseStaleReviewDrafts(
    stale,
    async (draftId) => {
      const result = await sql2`
                UPDATE ops_content_drafts
                SET status = 'draft',
                    review_session_id = NULL,
                    updated_at = NOW()
                WHERE id = ${draftId}
                  AND status = 'review'
                  AND created_at < NOW() - interval '24 hours'
                RETURNING id
            `;
      return result.length > 0;
    },
    log36
  );
}
async function catchUpOrphanedMissions() {
  const orphaned = await sql2`
        SELECT m.id, m.title,
            COUNT(s.id)::int as total,
            COUNT(s.id) FILTER (WHERE s.status = 'succeeded')::int as succeeded,
            COUNT(s.id) FILTER (WHERE s.status = 'blocked')::int as blocked,
            COUNT(s.id) FILTER (WHERE s.status = 'failed')::int as failed
        FROM ops_missions m
        LEFT JOIN ops_mission_steps s ON s.mission_id = m.id
        WHERE m.status = 'approved'
        GROUP BY m.id
        HAVING COUNT(s.id) > 0
           AND COUNT(s.id) = COUNT(s.id) FILTER (WHERE s.status IN ('succeeded', 'blocked', 'failed'))
    `;
  if (orphaned.length === 0) return;
  log36.info("Catching up orphaned missions", { count: orphaned.length });
  for (const mission of orphaned) {
    const finalStatus = mission.failed > 0 ? "failed" : mission.blocked > 0 ? "blocked" : "succeeded";
    const failReason = mission.failed > 0 ? `${mission.failed} of ${mission.total} step(s) failed` : mission.blocked > 0 ? `${mission.blocked} of ${mission.total} step(s) blocked` : null;
    await sql2`
            UPDATE ops_missions
            SET status = ${finalStatus},
                failure_reason = ${failReason},
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = ${mission.id}
            AND status = 'approved'
        `;
    log36.info("Orphaned mission finalized", {
      missionId: mission.id,
      title: mission.title,
      status: finalStatus
    });
  }
}
async function pollLoop() {
  await waitForDb();
  const toolbox = await checkToolboxAvailable();
  if (!toolbox.ok) {
    disableDockerBackedTools(toolbox.reason);
  }
  await catchUpStuckReviews();
  await catchUpOrphanedReviewDrafts();
  await catchUpOrphanedMissions();
  const startupPublish = await publishApprovedDrafts();
  if (startupPublish.published > 0 || startupPublish.failed > 0) {
    log36.info("Startup content publish sweep complete", {
      published: startupPublish.published,
      failed: startupPublish.failed
    });
  }
  const startupGhostBackfill = await mirrorPublishedDraftBackfill();
  if (!startupGhostBackfill.skipped && startupGhostBackfill.processed > 0) {
    log36.info("Startup Ghost backfill sweep complete", {
      processed: startupGhostBackfill.processed,
      mirrored: startupGhostBackfill.mirrored,
      failed: startupGhostBackfill.failed,
      skipped: startupGhostBackfill.skipped
    });
  }
  const startupGovernanceBackfill = await backfillGovernanceVotes();
  if (startupGovernanceBackfill.processed > 0) {
    log36.info("Startup governance vote backfill complete", {
      processed: startupGovernanceBackfill.processed,
      resolved: startupGovernanceBackfill.resolved,
      requeued: startupGovernanceBackfill.requeued,
      votesAdded: startupGovernanceBackfill.votesAdded,
      failed: startupGovernanceBackfill.failed
    });
  }
  await runMaintenanceTasks();
  while (running) {
    try {
      await pollRoundtables();
      const hadSession = await pollAgentSessions();
      await pollMissionSteps();
      await finalizeMissionSteps();
      if (hadSession) {
        await runMaintenanceTasks();
        continue;
      }
      const publishResult = await publishApprovedDrafts();
      if (publishResult.published > 0 || publishResult.failed > 0) {
        log36.info("Content publish sweep complete", {
          published: publishResult.published,
          failed: publishResult.failed
        });
      }
      const ghostBackfill = await mirrorPublishedDraftBackfill();
      if (!ghostBackfill.skipped && ghostBackfill.processed > 0) {
        log36.info("Ghost mirror backfill sweep complete", {
          processed: ghostBackfill.processed,
          mirrored: ghostBackfill.mirrored,
          failed: ghostBackfill.failed,
          skipped: ghostBackfill.skipped
        });
      }
      const governanceBackfill = await backfillGovernanceVotes();
      if (governanceBackfill.processed > 0) {
        log36.info("Governance vote backfill sweep complete", {
          processed: governanceBackfill.processed,
          resolved: governanceBackfill.resolved,
          requeued: governanceBackfill.requeued,
          votesAdded: governanceBackfill.votesAdded,
          failed: governanceBackfill.failed
        });
      }
      await runMaintenanceTasks();
      await pollInitiatives();
    } catch (err) {
      log36.error("Poll loop error", { error: err });
    }
    await new Promise((resolve) => setTimeout(resolve, 5e3));
  }
}
function shutdown(signal) {
  log36.info(`Received ${signal}, shutting down...`);
  running = false;
  setTimeout(() => {
    log36.warn("Forced shutdown after 30s timeout");
    process.exit(1);
  }, 3e4);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
log36.info("Unified worker started", {
  workerId: WORKER_ID,
  database: !!process.env.DATABASE_URL,
  ollama: process.env.OLLAMA_ENABLED !== "false" ? process.env.OLLAMA_BASE_URL || "no-url" : "disabled",
  braveSearch: !!process.env.BRAVE_API_KEY
});
pollLoop().then(() => {
  log36.info("Worker stopped");
  process.exit(0);
}).catch((err) => {
  log36.fatal("Fatal error", { error: err });
  process.exit(1);
});
//# sourceMappingURL=index.js.map
