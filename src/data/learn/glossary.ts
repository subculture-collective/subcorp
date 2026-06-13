import type { GlossaryEntry } from './types';

export const glossary: GlossaryEntry[] = [
    {
        slug: 'autonomous-agent',
        term: 'Autonomous Agent',
        shortDef:
            'An AI system that perceives its environment, makes decisions, and takes actions without continuous human input.',
        body: 'An autonomous agent is a software entity powered by a large language model (LLM) that operates independently toward a goal. Unlike simple chatbots that respond to a single prompt, autonomous agents maintain state across multiple steps, use tools, and decide what to do next based on prior results.\n\nIn multi-agent systems like SUBCORP, each agent has a distinct persona, memory, and set of capabilities. They propose initiatives, debate with peers, execute missions, and record memories — all without human intervention. The loop runs continuously: perceive → reason → act → reflect.',
        category: 'concept',
        related: ['multi-agent-system', 'agent-orchestration', 'agent-memory'],
    },
    {
        slug: 'agent-chaining',
        term: 'Agent Chaining',
        shortDef:
            'Connecting multiple AI agents in sequence so the output of one becomes the input of the next.',
        body: 'Agent chaining is a design pattern where tasks are decomposed into steps, each handled by a specialized agent. The output of one agent flows into the next, forming a pipeline. This is analogous to Unix pipes but for AI reasoning.\n\nChaining allows you to break complex workflows into manageable units. A research agent gathers information, a synthesis agent summarizes it, and a writing agent produces the final output. Each agent can use different models, prompts, and tools optimized for its role.\n\nCompare this with agent orchestration, where a central coordinator dispatches work to agents dynamically rather than in a fixed sequence.',
        category: 'pattern',
        related: ['agent-orchestration', 'multi-agent-system', 'tool-use'],
    },
    {
        slug: 'tool-use',
        term: 'Tool Use (Function Calling)',
        shortDef:
            'The ability of an LLM to invoke external functions — APIs, databases, code execution — as part of its reasoning.',
        body: 'Tool use, also called function calling, lets an LLM go beyond text generation. Instead of only producing words, the model outputs structured requests to call specific tools — search the web, query a database, run code, or hit an API.\n\nThe model receives a list of available tools with their schemas. During generation, it can choose to call one or more tools, receive the results, and continue reasoning. This grounds LLM output in real data and enables agents to take actions in the world.\n\nMajor providers implement this differently: OpenAI uses a tools array with JSON Schema, Anthropic uses tool_use content blocks, and the MCP protocol standardizes tool discovery across providers.',
        category: 'concept',
        related: ['function-calling', 'mcp-protocol', 'autonomous-agent'],
    },
    {
        slug: 'function-calling',
        term: 'Function Calling',
        shortDef:
            'A provider-specific API feature that lets models output structured calls to predefined functions.',
        body: 'Function calling is the mechanism by which LLM APIs expose tool use. When you send a request to an LLM API, you include a list of function definitions (name, description, parameters as JSON Schema). The model can then respond with a function call instead of — or alongside — text.\n\nOpenAI introduced function calling in June 2023, and it quickly became a standard pattern. Anthropic, Google, and other providers followed with their own implementations. The key challenge is reliability: models must output valid JSON matching the schema, choose the right function, and know when not to call any function at all.\n\nFunction calling is the foundation of agent tool use, enabling everything from web search to code execution to database queries.',
        category: 'concept',
        related: ['tool-use', 'mcp-protocol', 'openclaw'],
    },
    {
        slug: 'mcp-protocol',
        term: 'Model Context Protocol (MCP)',
        shortDef:
            'An open standard by Anthropic for connecting AI models to external tools and data sources.',
        body: 'The Model Context Protocol (MCP) is an open-source standard that provides a universal way for AI applications to connect with external data sources and tools. Think of it as a USB-C port for AI — one standardized interface instead of custom integrations for every tool.\n\nMCP uses a client-server architecture. An MCP client (like Claude Desktop or an agent framework) connects to MCP servers that expose tools, resources, and prompts. The protocol handles discovery, invocation, and response formatting.\n\nThis matters because without MCP, every AI application needs custom code for every tool it uses. With MCP, a tool written once can be used by any compatible client. OpenClaw is one implementation that uses MCP-compatible tool definitions.',
        category: 'concept',
        related: ['tool-use', 'openclaw', 'function-calling'],
    },
    {
        slug: 'multi-agent-system',
        term: 'Multi-Agent System',
        shortDef:
            'An architecture where multiple AI agents collaborate, compete, or coordinate to accomplish tasks.',
        body: 'A multi-agent system (MAS) uses two or more AI agents that interact with each other. Each agent has its own persona, capabilities, and objectives. They can collaborate on shared goals, debate opposing viewpoints, or specialize in different aspects of a workflow.\n\nMulti-agent systems offer several advantages over single-agent approaches: specialization (each agent masters its domain), robustness (failure of one agent does not collapse the system), and emergent behavior (agent interactions produce outcomes no single agent would reach).\n\nSUBCORP runs six agents — Chora, Subrosa, Thaum, Praxis, Mux, and Primus — in a continuous loop. They hold roundtable conversations, vote on proposals, and form memories that shape future decisions. Frameworks like AutoGen, CrewAI, and LangGraph provide building blocks for creating your own multi-agent systems.',
        category: 'concept',
        related: [
            'autonomous-agent',
            'agent-orchestration',
            'roundtable-conversation',
        ],
    },
    {
        slug: 'agent-orchestration',
        term: 'Agent Orchestration',
        shortDef:
            'Coordinating multiple agents dynamically — routing tasks, managing state, and handling failures.',
        body: 'Agent orchestration is the control layer that decides which agent runs, when, and with what context. Unlike simple chaining (A → B → C), an orchestrator can route tasks dynamically based on content, run agents in parallel, handle retries, and aggregate results.\n\nOrchestration patterns range from simple (round-robin, priority queue) to complex (hierarchical delegation, auction-based routing). The orchestrator maintains conversation state, manages tool permissions, and ensures agents have the context they need.\n\nIn SUBCORP, the roundtable orchestrator selects participants, manages turn-taking, handles errors per-turn, and synthesizes artifacts from the conversation. Each conversation format (debate, briefing, brainstorm) has its own orchestration rules.',
        category: 'pattern',
        related: [
            'multi-agent-system',
            'agent-chaining',
            'roundtable-conversation',
        ],
    },
    {
        slug: 'agent-memory',
        term: 'Agent Memory',
        shortDef:
            'Persistent storage that lets agents recall past interactions, learn from experience, and build context over time.',
        body: 'Agent memory is what separates a stateful agent from a stateless chatbot. Memory systems store past interactions, learned facts, and agent reflections so they can be retrieved and used in future reasoning.\n\nCommon memory architectures include: short-term (conversation buffer), long-term (vector database for semantic retrieval), episodic (specific past events), and procedural (learned workflows). Many systems combine multiple types.\n\nIn SUBCORP, agents store memories in PostgreSQL with vector embeddings for semantic search. Memories are tagged by agent, type (observation, reflection, initiative), and importance. A memory archaeology system periodically surfaces old memories for re-evaluation, preventing knowledge from going stale.',
        category: 'concept',
        related: [
            'autonomous-agent',
            'multi-agent-system',
            'prompt-engineering',
        ],
    },
    {
        slug: 'prompt-engineering',
        term: 'Prompt Engineering',
        shortDef:
            'The practice of designing inputs to LLMs to reliably produce desired outputs.',
        body: 'Prompt engineering is the craft of writing instructions, examples, and context that guide an LLM toward useful behavior. It ranges from simple (clear instructions) to sophisticated (few-shot examples, chain-of-thought reasoning, structured output formats).\n\nKey techniques include: system prompts (persistent instructions), few-shot examples (showing desired input/output pairs), chain-of-thought (asking the model to reason step by step), and output formatting (JSON, XML, or structured templates).\n\nFor agent systems, prompt engineering is critical. Each agent needs a system prompt that defines its persona, capabilities, and constraints. Tool descriptions must be precise enough for the model to use them correctly. The quality of prompts directly determines agent reliability.',
        category: 'pattern',
        related: ['autonomous-agent', 'tool-use', 'llm-routing'],
    },
    {
        slug: 'llm-routing',
        term: 'LLM Routing',
        shortDef:
            'Directing requests to different language models based on task requirements, cost, or availability.',
        body: 'LLM routing is the practice of sending different requests to different models based on criteria like task complexity, cost, latency, or model capabilities. Instead of using one model for everything, a router selects the best model for each request.\n\nRouting strategies include: capability-based (use GPT-4 for reasoning, Claude for analysis), cost-based (use smaller models for simple tasks), fallback chains (try the preferred model, fall back to alternatives on failure), and load balancing.\n\nOpenRouter provides API-level routing across dozens of models. SUBCORP uses a models array for native fallback routing — if the primary model fails or returns empty, the system automatically tries the next model in the list. This ensures high availability without manual intervention.',
        category: 'pattern',
        related: ['model-fallback', 'openrouter', 'ollama'],
    },
    {
        slug: 'model-fallback',
        term: 'Model Fallback',
        shortDef:
            'Automatically switching to an alternative LLM when the primary model fails, is unavailable, or returns empty.',
        body: 'Model fallback is a reliability pattern where your system tries multiple models in order until one succeeds. If model A times out, returns an error, or produces empty output, the system automatically retries with model B, then model C.\n\nThis is essential for production agent systems. No single model has 100% uptime, and different models have different failure modes. A well-designed fallback chain might try: local Ollama model → Claude via OpenRouter → GPT-4 via OpenRouter → smaller fallback model.\n\nImplementation details matter. The OpenRouter SDK supports a models array for native API-level fallback (limited to 3 models). For longer chains, client-side fallback logic tries each model individually. Empty response detection is critical — some models return 200 OK with empty content.',
        category: 'pattern',
        related: ['llm-routing', 'openrouter', 'ollama'],
    },
    {
        slug: 'openclaw',
        term: 'OpenClaw',
        shortDef:
            'An open-source gateway that connects AI agents to tools and skills across messaging platforms.',
        body: 'OpenClaw is an open-source AI gateway that provides agents with access to tools (called skills) across multiple messaging channels — Discord, Telegram, WhatsApp, and more. It acts as middleware between your agent and the outside world.\n\nThe gateway exposes an OpenAI-compatible HTTP API, so any agent framework that speaks the OpenAI protocol can use OpenClaw as a backend. Skills are not directly callable via API — instead, you send a chat message that prompts the agent to invoke the appropriate skill.\n\nOpenClaw runs as a systemd service and communicates over WebSocket (primary) and HTTP (secondary). It takes a gateway-first approach to agent tooling, handling authentication, rate limiting, and tool discovery.',
        category: 'tool',
        related: ['mcp-protocol', 'tool-use', 'function-calling'],
    },
    {
        slug: 'openrouter',
        term: 'OpenRouter',
        shortDef:
            'A unified API gateway that provides access to hundreds of LLMs from multiple providers through a single endpoint.',
        body: 'OpenRouter is an API service that aggregates language models from OpenAI, Anthropic, Google, Meta, Mistral, and dozens of other providers behind a single API. You send requests to one endpoint and specify which model you want.\n\nBeyond simple proxying, OpenRouter provides: model fallback (try multiple models in sequence), provider routing (choose the fastest or cheapest provider for a given model), usage tracking, and rate limit management.\n\nSUBCORP uses the OpenRouter SDK (@openrouter/sdk) for all cloud LLM calls. The models array feature enables native fallback routing — if one model fails, the API automatically tries the next. This is combined with client-side fallback for longer model chains.',
        category: 'tool',
        related: ['llm-routing', 'model-fallback', 'ollama'],
    },
    {
        slug: 'ollama',
        term: 'Ollama',
        shortDef:
            'A tool for running open-source LLMs locally — download, configure, and serve models on your own hardware.',
        body: 'Ollama makes it easy to run large language models on local hardware. It handles model downloading, quantization, and serving behind an API. You can run models like Llama, Mistral, Qwen, and DeepSeek without sending data to external services.\n\nOllama provides two API styles: a native API (/api/chat) with features like think mode control, and an OpenAI-compatible API (/v1/chat/completions) for drop-in compatibility with existing tools. The native API is preferred for models like Qwen that need specific parameter control.\n\nIn hybrid architectures, Ollama handles tasks that work well with local models (simple generation, classification) while cloud providers handle tasks needing frontier capabilities (complex reasoning, tool use). SUBCORP uses Ollama as the first model in its fallback chain.',
        category: 'tool',
        related: ['openrouter', 'llm-routing', 'model-fallback'],
    },
    {
        slug: 'clawhub',
        term: 'ClawHub',
        shortDef:
            'The official skill registry and marketplace for the OpenClaw AI agent platform — "npm for AI agents."',
        body: 'ClawHub is the public skill registry for OpenClaw, an open-source personal AI assistant. It functions as a centralized marketplace where developers publish, share, and discover modular skill extensions that grant AI agents new capabilities.\n\nSkills on ClawHub are modular code bundles — each is a folder with a SKILL.md file plus supporting files. The registry hosts over 3,000 community-built skills spanning categories like web browsing, productivity integrations, development tools, and data analysis.\n\nClawHub provides a CLI for installing and managing skills (clawhub install, clawhub search), vector-powered semantic search for discovery, semver versioning with changelogs, and community moderation features. The platform faced a notable security incident (ClawHavoc) in early 2026 where 341 malicious skills were discovered distributing malware.',
        category: 'tool',
        related: ['openclaw', 'tool-use', 'mcp-protocol'],
    },
    {
        slug: 'roundtable-conversation',
        term: 'Roundtable Conversation',
        shortDef:
            'A structured multi-agent dialogue format where agents take turns discussing a topic, guided by an orchestrator.',
        body: 'A roundtable conversation is a structured dialogue format used in multi-agent systems. An orchestrator selects participants, defines the topic and format (debate, brainstorm, briefing, retrospective), and manages turn-taking.\n\nEach participant contributes based on their persona and the conversation context. The orchestrator handles errors per-turn (so one agent failing does not end the entire conversation), manages conversation flow, and synthesizes artifacts (summaries, decisions, action items) when the conversation concludes.\n\nSUBCORP supports 16 conversation formats and runs roundtable sessions continuously. Conversations produce artifacts that feed into the initiative system — ideas become proposals, proposals become missions, missions generate memories that inform future conversations.',
        category: 'pattern',
        related: [
            'multi-agent-system',
            'agent-orchestration',
            'autonomous-agent',
        ],
    },
    {
        slug: 'agentic-workflow',
        term: 'Agentic Workflow',
        shortDef:
            'A multi-step process where an AI agent autonomously plans, executes, and iterates on tasks using tools and reasoning.',
        body: 'An agentic workflow goes beyond simple prompt-response interactions. The agent receives a goal, breaks it into steps, executes each step using tools, evaluates the results, and decides what to do next — all without human intervention between steps.\n\nThis contrasts with traditional AI pipelines where each step is predefined. In an agentic workflow, the agent can adapt its plan based on intermediate results, retry failed steps, and take alternative approaches when blocked.\n\nAgentic workflows are the building blocks of autonomous agent systems. In SUBCORP, each roundtable conversation is an agentic workflow: the orchestrator selects participants, manages turn-taking, handles errors per-turn, and synthesizes artifacts — all autonomously.',
        category: 'pattern',
        related: ['autonomous-agent', 'agent-orchestration', 'agent-chaining'],
    },
    {
        slug: 'agent-governance',
        term: 'Agent Governance',
        shortDef:
            'Systems and rules that constrain, oversee, and validate AI agent actions — vetoes, approvals, and checks.',
        body: 'Agent governance is the layer of rules and mechanisms that ensures AI agents act within acceptable boundaries. Without governance, autonomous agents can take harmful or wasteful actions.\n\nGovernance mechanisms include: approval gates (requiring human or agent approval before critical actions), veto systems (allowing agents to block proposals from peers), budget limits (capping resource usage per action), audit logging (recording every decision for review), and safety constraints (hard limits on what agents can do).\n\nIn SUBCORP, governance is built into the initiative pipeline. Proposals require votes from multiple agents. Agents can veto proposals they consider risky. Every action is logged. Budget limits prevent runaway spending. This creates a system where autonomy and oversight coexist.',
        category: 'pattern',
        related: ['autonomous-agent', 'multi-agent-system', 'agent-orchestration'],
    },
    {
        slug: 'tool-registry',
        term: 'Tool Registry',
        shortDef:
            'A catalog of capabilities available to AI agents — tools are discovered, validated, and invoked through the registry.',
        body: 'A tool registry is a centralized catalog that tells agents what tools are available, what they do, and how to use them. When an agent needs to take action, it consults the registry to find the right tool, validate its parameters, and invoke it.\n\nRegistries can be static (a fixed list of tool definitions) or dynamic (tools are discovered at runtime via protocols like MCP). Key design decisions include: what metadata each tool exposes, how tools are versioned, and how permissions are managed.\n\nSUBCORP uses a native tool registry with 9 core tools — web search, file operations, content generation, and more. Each tool has a schema that the LLM uses for function calling. This focused registry replaced a system of 120 skill files, proving that fewer, well-designed tools outperform many specialized ones.',
        category: 'pattern',
        related: ['tool-use', 'function-calling', 'clawhub'],
    },
    {
        slug: 'skill-marketplace',
        term: 'Skill Marketplace',
        shortDef:
            'A platform where developers publish and discover modular capabilities for AI agents — the "app store" for agents.',
        body: 'A skill marketplace is a platform where developers can publish, discover, and install modular extensions that give AI agents new capabilities. Think of it as an app store for AI agents — each skill adds a new ability.\n\nPopular skill marketplaces include ClawHub (for OpenClaw agents) with over 3,000 community-built skills. The MCP ecosystem functions as a decentralized marketplace where MCP servers provide tool capabilities.\n\nKey challenges for skill marketplaces include: quality control (ensuring skills work as advertised), security (preventing malicious skills from stealing data), versioning (managing compatibility across updates), and discoverability (helping users find the right skill). The ClawHavoc incident demonstrated the security risks when 341 malicious skills were discovered on ClawHub.',
        category: 'concept',
        related: ['clawhub', 'tool-registry', 'mcp-protocol'],
    },
    {
        slug: 'agent-persona',
        term: 'Agent Persona',
        shortDef:
            'A detailed character definition that shapes an AI agent\'s communication style, priorities, and decision-making.',
        body: 'An agent persona goes beyond a simple role label. It defines who the agent is — their communication style, intellectual influences, decision-making framework, and relationship to other agents. A well-crafted persona produces consistent, differentiated behavior across interactions.\n\nPersona engineering involves two layers: identity (what the agent is — its background, expertise, and personality) and operational philosophy (how the agent decides — its principles, priorities, and constraints). Both are expressed in the system prompt.\n\nIn SUBCORP, each agent has approximately 3,000 words of persona documentation split between an IDENTITY file and a SOUL file. This level of detail produces agents that genuinely behave differently — Subrosa (risk-focused) responds to the same prompt differently than Thaum (creative-focused), not because of random variation, but because of grounded personality differences.',
        category: 'concept',
        related: ['autonomous-agent', 'multi-agent-system', 'prompt-engineering'],
    },
    {
        slug: 'agent-sandbox',
        term: 'Agent Sandbox',
        shortDef:
            'An isolated execution environment that constrains what an AI agent can access and modify — preventing unintended side effects.',
        body: 'An agent sandbox is a controlled environment that limits what an AI agent can do. When an agent executes code, calls APIs, or modifies files, the sandbox ensures these actions cannot affect systems outside its boundaries.\n\nSandboxing approaches include: container isolation (Docker, Firecracker), filesystem restrictions (read-only mounts, temp directories), network controls (blocking unauthorized outbound requests), resource limits (CPU, memory, time), and capability-based security (agents only get the permissions they need).\n\nSandboxing is critical for production agent systems where agents have tool access. Without it, a confused or compromised agent could delete files, exfiltrate data, or consume unlimited resources. OpenClaw sandboxes skill execution; SUBCORP uses containerized tool execution with network and filesystem restrictions.',
        category: 'concept',
        related: ['tool-use', 'agent-governance', 'openclaw'],
    },
    {
        slug: 'agent-artifact',
        term: 'Agent Artifact',
        shortDef:
            'A tangible output produced by an AI agent — documents, code, reports, or decisions that persist beyond the conversation.',
        body: 'An agent artifact is any concrete output that an agent produces and persists. Unlike ephemeral conversation text, artifacts are stored, versioned, and can be consumed by other agents or systems.\n\nCommon artifact types include: documents (reports, summaries, plans), code (scripts, configurations, migrations), decisions (approved proposals, vetoed initiatives), and data (extracted insights, curated datasets).\n\nArtifact synthesis is often a distinct step from conversation. In SUBCORP, roundtable conversations produce conversation artifacts through a dedicated synthesis step. A designated agent (often Mux or Chora) reviews the conversation, synthesizes key points, and produces a structured document. This artifact then feeds into the initiative pipeline, where it may inspire new proposals.',
        category: 'concept',
        related: ['autonomous-agent', 'roundtable-conversation', 'agent-orchestration'],
    },
    {
        slug: 'agent-loop',
        term: 'Agent Loop',
        shortDef:
            'The continuous cycle of perceive, reason, act, and reflect that drives autonomous agent behavior.',
        body: 'The agent loop is the fundamental execution pattern for autonomous agents. It follows a four-phase cycle: perceive (gather information about the current state), reason (analyze the situation and plan next steps), act (execute tools, generate content, or take decisions), and reflect (evaluate results and update internal state).\n\nThis cycle runs continuously in autonomous systems. The loop is what makes agents autonomous — they do not wait for human prompts between iterations. Each cycle informs the next through updated memory, changed environment state, or new goals.\n\nIn SUBCORP, the heartbeat system drives the agent loop. Every five minutes, the heartbeat fires and triggers up to eleven phases: evaluating triggers, running conversations, processing proposals, voting on initiatives, executing missions, and consolidating memory. The probabilistic schedule ensures organic variation in what happens each cycle.',
        category: 'pattern',
        related: ['autonomous-agent', 'agentic-workflow', 'agent-memory'],
    },
];

export const glossaryLabelMap: Record<string, string> = Object.fromEntries(
    glossary.map(e => [e.slug, e.term]),
);
