import type { ComparisonEntry } from './types';

export const comparisons: ComparisonEntry[] = [
    {
        slug: 'claude-vs-openai',
        title: 'Claude vs OpenAI GPT',
        shortDesc:
            'Two frontier LLM families compared — reasoning, tool use, context windows, and agent suitability.',
        body: "Claude (by Anthropic) and GPT (by OpenAI) are the two leading families of large language models. Both are capable of complex reasoning, code generation, and tool use, but they differ in architecture, training philosophy, and practical behavior.\n\nClaude tends to follow instructions more literally and has a longer effective context window (200K tokens). GPT models pioneered function calling and have the broadest ecosystem of third-party integrations. For agent systems, both work well — the choice often comes down to specific task performance, pricing, and reliability.",
        sideA: {
            name: 'Claude (Anthropic)',
            points: [
                '200K token context window',
                'Strong instruction following and long-document analysis',
                'Constitutional AI safety training',
                'Tool use via tool_use content blocks',
                'Extended thinking mode for complex reasoning',
            ],
        },
        sideB: {
            name: 'GPT (OpenAI)',
            points: [
                '128K token context window (GPT-4o)',
                'Largest ecosystem and third-party integrations',
                'Pioneered function calling pattern',
                'Strong code generation and debugging',
                'Multimodal capabilities (vision, audio, image gen)',
            ],
        },
        verdict:
            'Both are excellent for agent systems. Claude excels at long-context tasks and careful instruction following. GPT has the broadest tool ecosystem. Many production systems use both via routing.',
        faqs: [
            {
                question: 'Which is better for autonomous agents?',
                answer: 'Both work well. Claude tends to be more reliable at following complex system prompts, while GPT has more mature function calling. Many teams use both with model routing.',
            },
            {
                question: 'How do costs compare?',
                answer: 'Pricing varies by model tier. Both offer smaller, cheaper models for simple tasks and larger models for complex reasoning. Use OpenRouter to compare real-time pricing across models.',
            },
            {
                question: 'Can I use both in the same system?',
                answer: 'Yes. LLM routing lets you send different requests to different models. OpenRouter provides a unified API for both providers, and model fallback ensures reliability.',
            },
        ],
        related: ['openrouter-vs-direct-api', 'ollama-vs-cloud-llm', 'multi-agent-vs-single-agent'],
    },
    {
        slug: 'langchain-vs-autogen',
        title: 'LangChain vs AutoGen',
        shortDesc:
            'Two popular agent frameworks compared — flexibility, multi-agent support, and learning curve.',
        body: "LangChain and AutoGen take different approaches to building AI agent systems. LangChain is a general-purpose framework for LLM applications with agent capabilities bolted on. AutoGen (by Microsoft) was built specifically for multi-agent conversations.\n\nLangChain offers more flexibility and a larger ecosystem of integrations. AutoGen provides better primitives for multi-agent coordination out of the box. Your choice depends on whether you need a general LLM toolkit or a purpose-built multi-agent framework.",
        sideA: {
            name: 'LangChain',
            points: [
                'Massive ecosystem — 700+ integrations',
                'LangGraph for stateful agent workflows',
                'LangSmith for observability and tracing',
                'Flexible — works for RAG, chains, agents, and more',
                'Large community and extensive documentation',
            ],
        },
        sideB: {
            name: 'AutoGen',
            points: [
                'Built specifically for multi-agent conversations',
                'Native support for agent-to-agent messaging',
                'Human-in-the-loop patterns built in',
                'Group chat with dynamic speaker selection',
                'Microsoft backing and research-driven development',
            ],
        },
        verdict:
            'LangChain for general LLM applications that may include agents. AutoGen for systems where multi-agent conversation is the core pattern.',
        faqs: [
            {
                question: 'Which is easier to learn?',
                answer: "AutoGen is simpler if you specifically want multi-agent chat. LangChain has a steeper learning curve due to its breadth, but LangGraph's documentation has improved significantly.",
            },
            {
                question: 'Can they work together?',
                answer: 'Yes. You can use LangChain tools and integrations within AutoGen agents, or use LangGraph for orchestration with custom agent implementations.',
            },
            {
                question: 'What about CrewAI?',
                answer: 'CrewAI is a third option focused on role-based multi-agent systems. It sits between LangChain (more general) and AutoGen (more research-oriented) in terms of abstraction level.',
            },
        ],
        related: ['openclaw-vs-langchain', 'multi-agent-vs-single-agent', 'claude-vs-openai'],
    },
    {
        slug: 'openclaw-vs-langchain',
        title: 'OpenClaw vs LangChain',
        shortDesc:
            'A tool gateway versus an agent framework — different layers of the agent stack.',
        body: "OpenClaw and LangChain operate at different layers of the agent stack. OpenClaw is a gateway that connects agents to tools and messaging channels. LangChain is a framework for building the agents themselves. They are complementary, not competing.\n\nThink of it this way: LangChain helps you build the agent's brain (reasoning, memory, tool selection). OpenClaw provides the agent's hands (actual tool execution, channel connectivity). You could use LangChain to build an agent that calls tools through OpenClaw.",
        sideA: {
            name: 'OpenClaw',
            points: [
                'Tool/skill gateway — connects agents to capabilities',
                'Multi-channel support (Discord, Telegram, WhatsApp)',
                'OpenAI-compatible HTTP API',
                'Manages tool execution and sandboxing',
                'Lightweight — single binary, minimal config',
            ],
        },
        sideB: {
            name: 'LangChain',
            points: [
                'Full agent framework — reasoning, memory, tools',
                'LangGraph for complex workflows and state machines',
                'Hundreds of built-in tool integrations',
                'Observability via LangSmith',
                'Large community and ecosystem',
            ],
        },
        verdict:
            'These solve different problems. Use OpenClaw when you need a tool gateway for your agents. Use LangChain when you need a framework to build the agents themselves. They work well together.',
        faqs: [
            {
                question: 'Can I use OpenClaw with LangChain?',
                answer: "Yes. Since OpenClaw exposes an OpenAI-compatible API, you can connect LangChain agents to OpenClaw as a tool provider. The agent reasons with LangChain and executes tools through OpenClaw.",
            },
            {
                question: 'Do I need both?',
                answer: 'Not necessarily. If you are building a simple agent, you might use OpenClaw directly with the OpenAI SDK. If you are building complex agent logic, LangChain provides higher-level abstractions.',
            },
            {
                question: 'Which should I start with?',
                answer: 'Start with the layer you need most. If you have agents but need tool connectivity, start with OpenClaw. If you need to build the agent reasoning from scratch, start with LangChain.',
            },
        ],
        related: ['langchain-vs-autogen', 'openrouter-vs-direct-api', 'claude-vs-openai'],
    },
    {
        slug: 'clawhub-vs-mcp',
        title: 'ClawHub vs Anthropic MCP',
        shortDesc:
            'A centralized skill marketplace versus a decentralized tool protocol — two approaches to agent extensibility.',
        body: "ClawHub and MCP represent two fundamentally different approaches to giving AI agents access to tools. ClawHub is a centralized marketplace where pre-built skills are published, discovered, and installed via CLI. MCP is a decentralized protocol that standardizes how any tool connects to any AI client.\n\nThink of ClawHub as the App Store model — browse, install, done. MCP is more like the USB standard — any device that implements the protocol works with any compatible host. Both have their place depending on your architecture.",
        sideA: {
            name: 'ClawHub',
            points: [
                'Centralized marketplace with 3,000+ pre-built skills',
                'CLI-based install and management (clawhub install)',
                'Vector-powered semantic search for discovery',
                'Community moderation with stars, comments, and reports',
                'Tied to the OpenClaw ecosystem',
            ],
        },
        sideB: {
            name: 'Anthropic MCP',
            points: [
                'Open protocol — works with any compatible client',
                'Decentralized — tools run as independent servers',
                'Standardized discovery, invocation, and response format',
                'Supports tools, resources, and prompt templates',
                'Growing ecosystem across multiple AI platforms',
            ],
        },
        verdict:
            'ClawHub is faster for getting started — install a skill and go. MCP is more flexible and portable across AI platforms. For OpenClaw users, ClawHub is the natural choice. For multi-platform agent systems, MCP provides vendor-neutral tool connectivity.',
        faqs: [
            {
                question: 'Can I use ClawHub skills with non-OpenClaw agents?',
                answer: 'Not directly. ClawHub skills are designed for the OpenClaw runtime. To use similar capabilities with other agents, look for MCP servers or native tool integrations for your framework.',
            },
            {
                question: 'Is MCP replacing skill marketplaces?',
                answer: 'Not necessarily. MCP standardizes how tools connect, but marketplaces like ClawHub add discovery, versioning, and community curation on top. A marketplace could distribute MCP servers in the future.',
            },
            {
                question: 'Which approach is more secure?',
                answer: 'Both have trade-offs. ClawHub had the ClawHavoc incident with 341 malicious skills. MCP servers run locally but require trusting the server code. In both cases, reviewing tool code before installing is essential.',
            },
        ],
        related: ['openclaw-vs-langchain', 'multi-agent-vs-single-agent', 'claude-vs-openai'],
    },
    {
        slug: 'openrouter-vs-direct-api',
        title: 'OpenRouter vs Direct API Access',
        shortDesc:
            'Using a unified LLM gateway versus calling each provider directly — trade-offs in flexibility, cost, and reliability.',
        body: "When building agent systems, you can either call each LLM provider's API directly (OpenAI, Anthropic, Google) or use a unified gateway like OpenRouter. Direct access gives you full control and the latest features. A gateway gives you flexibility, fallback routing, and simplified billing.\n\nFor production agent systems that use multiple models, a gateway usually wins on operational simplicity. For single-model applications or when you need bleeding-edge API features, direct access is better.",
        sideA: {
            name: 'OpenRouter',
            points: [
                'One API for hundreds of models across providers',
                'Native model fallback with models array',
                'Unified billing and usage tracking',
                'Provider routing for cost/latency optimization',
                'No need to manage multiple API keys',
            ],
        },
        sideB: {
            name: 'Direct API Access',
            points: [
                'Full access to latest provider features immediately',
                'No middleman — lower latency for single providers',
                'Direct relationship and support from provider',
                'No gateway dependency or additional point of failure',
                'Custom rate limiting and quota management',
            ],
        },
        verdict:
            'Use OpenRouter for multi-model systems that benefit from fallback routing and unified access. Use direct APIs when you need a single provider with the latest features and lowest latency.',
        faqs: [
            {
                question: 'Is OpenRouter more expensive?',
                answer: 'OpenRouter adds a small markup on some models but offers competitive pricing. The cost savings from automatic fallback routing (avoiding failed requests) often offset the markup.',
            },
            {
                question: 'Does OpenRouter support streaming?',
                answer: 'Yes. OpenRouter supports streaming responses, function calling, and other standard LLM API features for compatible models.',
            },
            {
                question: 'Can I mix OpenRouter and direct access?',
                answer: 'Absolutely. Many production systems use direct access for their primary model (lowest latency) and OpenRouter for fallback routing to alternative models.',
            },
        ],
        related: ['ollama-vs-cloud-llm', 'claude-vs-openai', 'openclaw-vs-langchain'],
    },
    {
        slug: 'ollama-vs-cloud-llm',
        title: 'Ollama (Local LLMs) vs Cloud LLMs',
        shortDesc:
            'Running models locally with Ollama versus using cloud APIs — privacy, cost, performance, and capability trade-offs.',
        body: "Running LLMs locally with Ollama versus using cloud APIs represents a fundamental trade-off in agent architecture. Local models give you privacy, zero per-token cost, and no rate limits. Cloud models give you frontier capabilities, no hardware requirements, and instant access to the latest models.\n\nThe best production systems use both. Local models handle high-volume, simpler tasks where latency and cost matter. Cloud models handle complex reasoning and tool use where capability matters most.",
        sideA: {
            name: 'Ollama (Local)',
            points: [
                'Complete data privacy — nothing leaves your machine',
                'Zero per-token cost after hardware investment',
                'No rate limits or API quotas',
                'Works offline — no internet dependency',
                'Full control over model selection and quantization',
            ],
        },
        sideB: {
            name: 'Cloud LLMs',
            points: [
                'Frontier capabilities (GPT-4, Claude, Gemini)',
                'No hardware requirements — scales instantly',
                'Always up to date with latest model versions',
                'Reliable tool use and function calling',
                'Enterprise features (fine-tuning, batch API, evaluation)',
            ],
        },
        verdict:
            'Use both. Local Ollama models for high-volume simple tasks and privacy-sensitive workloads. Cloud models for complex reasoning and tool use. Model fallback chains that start local and escalate to cloud give you the best of both.',
        faqs: [
            {
                question: 'What hardware do I need for Ollama?',
                answer: 'It depends on the model. 7B models run on 8GB RAM. 13B models need 16GB. 70B models need 48GB+ VRAM. GPU acceleration (NVIDIA, Apple Silicon) dramatically improves speed.',
            },
            {
                question: 'Can local models do tool use?',
                answer: 'Some can, but reliability varies. Models like Qwen and Llama support function calling, but frontier cloud models are still more reliable for complex tool use scenarios.',
            },
            {
                question: 'How do I combine local and cloud models?',
                answer: 'Use a fallback chain: try the local Ollama model first, fall back to a cloud model via OpenRouter if the local model fails or returns inadequate results.',
            },
        ],
        related: ['openrouter-vs-direct-api', 'claude-vs-openai', 'multi-agent-vs-single-agent'],
    },
    {
        slug: 'multi-agent-vs-single-agent',
        title: 'Multi-Agent vs Single-Agent Systems',
        shortDesc:
            'When to use one powerful agent versus a team of specialized agents — architecture decision guide.',
        body: "The choice between a single sophisticated agent and multiple specialized agents is a key architectural decision. Single agents are simpler to build, debug, and maintain. Multi-agent systems offer specialization, robustness, and emergent capabilities — but at the cost of complexity.\n\nThere is no universal answer. The right choice depends on your task complexity, required reliability, and operational constraints. Many successful systems start with a single agent and evolve to multi-agent as needs grow.",
        sideA: {
            name: 'Multi-Agent',
            points: [
                'Specialization — each agent masters its domain',
                'Robustness — one agent failing does not crash the system',
                'Debate and verification — agents check each other\'s work',
                'Parallel execution — multiple agents work simultaneously',
                'Emergent behavior from agent interactions',
            ],
        },
        sideB: {
            name: 'Single Agent',
            points: [
                'Simpler to build, test, and debug',
                'No coordination overhead between agents',
                'Consistent behavior — one persona, one context',
                'Lower cost — fewer LLM calls per task',
                'Easier to reason about and explain',
            ],
        },
        verdict:
            'Start single-agent for simple workflows. Move to multi-agent when you need specialization, fault tolerance, or when tasks naturally decompose into distinct roles. The orchestration complexity must be worth the benefit.',
        faqs: [
            {
                question: 'When should I switch from single to multi-agent?',
                answer: 'When your single agent\'s system prompt becomes unwieldy, when you need different models for different tasks, or when you want agents to verify each other\'s work.',
            },
            {
                question: 'How many agents is too many?',
                answer: 'There is no hard limit, but coordination overhead grows with agent count. Start with 2-3 agents with clear roles. Add more only when you have a specific need that existing agents cannot cover.',
            },
            {
                question: 'Can a single agent use multiple models?',
                answer: 'Yes. LLM routing can switch models per-request within a single agent based on task complexity. This gives you some benefits of specialization without full multi-agent architecture.',
            },
        ],
        related: ['langchain-vs-autogen', 'openclaw-vs-langchain', 'ollama-vs-cloud-llm'],
    },
    {
        slug: 'autogen-vs-crewai',
        title: 'AutoGen vs CrewAI',
        shortDesc:
            'Two multi-agent frameworks compared — research-grade flexibility versus role-based simplicity.',
        body: "AutoGen and CrewAI are both multi-agent frameworks, but they target different needs. AutoGen (by Microsoft) is research-oriented with flexible conversation primitives. CrewAI is task-oriented with a simpler role-based model. The right choice depends on whether you need fine-grained control over agent interactions or a quick way to get agents collaborating.",
        sideA: {
            name: 'AutoGen',
            points: [
                'Research-grade multi-agent conversation framework',
                'Flexible agent-to-agent messaging primitives',
                'Group chat with dynamic speaker selection',
                'Human-in-the-loop patterns built in',
                'Microsoft backing and active research development',
            ],
        },
        sideB: {
            name: 'CrewAI',
            points: [
                'Role-based agent definition — intuitive mental model',
                'Natural language task descriptions',
                'Sequential and hierarchical execution modes',
                'Lower learning curve for getting started',
                'LangChain tool compatibility built in',
            ],
        },
        verdict:
            'CrewAI for teams that want multi-agent capabilities quickly with minimal configuration. AutoGen for teams that need fine-grained control over agent interactions and conversation dynamics.',
        faqs: [
            {
                question: 'Which is better for production systems?',
                answer: 'CrewAI is simpler to deploy for well-defined workflows. AutoGen requires more engineering but offers more flexibility for complex, research-oriented applications.',
            },
            {
                question: 'Do they support TypeScript?',
                answer: 'Both are primarily Python. For TypeScript multi-agent systems, consider Mastra, the Vercel AI SDK, or custom orchestration with direct API calls.',
            },
            {
                question: 'Can I start with one and migrate to the other?',
                answer: 'They have different APIs and abstractions, so migration is not straightforward. The agent logic (prompts, tool definitions) transfers, but the orchestration code needs rewriting.',
            },
        ],
        related: ['langchain-vs-autogen', 'openclaw-vs-langchain', 'multi-agent-vs-single-agent'],
    },
    {
        slug: 'clawhub-vs-openclaw',
        title: 'ClawHub vs OpenClaw',
        shortDesc:
            'Skill marketplace versus agent gateway — two parts of the same ecosystem with different roles.',
        body: "ClawHub and OpenClaw are part of the same ecosystem but serve different functions. OpenClaw is the AI agent gateway — the runtime that executes agents, manages channels, and handles tool invocation. ClawHub is the skill marketplace — the registry where developers publish and discover extensions for OpenClaw agents.\n\nUnderstanding the difference helps you evaluate whether you need the full OpenClaw stack, just the skill registry, or neither.",
        sideA: {
            name: 'ClawHub',
            points: [
                'Skill marketplace — discover, install, and publish agent skills',
                'Vector-powered semantic search for skill discovery',
                'CLI-based management (clawhub install, publish, update)',
                'Community features: stars, comments, moderation',
                '3,000+ community-built skills available',
            ],
        },
        sideB: {
            name: 'OpenClaw',
            points: [
                'Agent gateway — runs agents and executes tools',
                'Multi-channel support (WhatsApp, Telegram, Discord)',
                'OpenAI-compatible HTTP API for agent access',
                'WebSocket primary protocol for real-time messaging',
                'Self-hosted, single binary deployment',
            ],
        },
        verdict:
            'ClawHub is the app store; OpenClaw is the operating system. You need OpenClaw to run agents, and ClawHub to extend them with community skills. For teams not using OpenClaw, ClawHub skills are not usable — look at MCP servers or framework-native tools instead.',
        faqs: [
            {
                question: 'Can I use ClawHub without OpenClaw?',
                answer: 'No. ClawHub skills are designed specifically for the OpenClaw runtime. They use SKILL.md format and rely on OpenClaw\'s execution environment.',
            },
            {
                question: 'Is OpenClaw required for multi-agent systems?',
                answer: 'No. OpenClaw is one approach to agent tooling. Other frameworks like LangChain, CrewAI, and AutoGen provide their own tool integration without needing a separate gateway.',
            },
            {
                question: 'How does the ClawHavoc incident affect this?',
                answer: 'The ClawHavoc incident (341 malicious skills) affected ClawHub\'s marketplace, not the OpenClaw gateway itself. It highlighted the supply chain risks of community-maintained skill registries. ClawHub has since added security scanning and stricter publisher requirements.',
            },
        ],
        related: ['clawhub-vs-mcp', 'openclaw-vs-langchain', 'multi-agent-vs-single-agent'],
    },
];

export const comparisonLabelMap: Record<string, string> = Object.fromEntries(
    comparisons.map(e => [e.slug, e.title])
);
