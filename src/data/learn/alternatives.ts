import type { AlternativesEntry } from './types';

export const alternatives: AlternativesEntry[] = [
    {
        slug: 'openclaw',
        name: 'OpenClaw',
        shortDesc:
            'Looking for alternatives to OpenClaw? Compare open-source AI agent gateways, tool frameworks, and multi-agent platforms.',
        body: 'OpenClaw is an open-source AI gateway that connects agents to tools via an OpenAI-compatible API. It takes a gateway-first approach where tools (called skills) execute through agent chat rather than direct API calls. While effective for single-agent setups with multi-channel messaging, teams building more complex multi-agent systems or wanting direct tool invocation may need different approaches.\n\nThe alternatives below cover different layers of the agent stack — from tool connectivity protocols to full agent frameworks to multi-agent coordination platforms.',
        alternatives: [
            {
                name: 'Anthropic MCP',
                slug: 'anthropic-mcp',
                reason: 'Open protocol for tool connectivity that works across any AI client — decentralized alternative to OpenClaw\'s centralized gateway model.',
            },
            {
                name: 'LangChain',
                slug: 'langchain',
                reason: 'Full agent framework with built-in tool integrations, memory, and orchestration — handles both agent logic and tool execution.',
            },
            {
                name: 'Vercel AI SDK',
                slug: 'vercel-ai-sdk',
                reason: 'TypeScript-first toolkit with native tool use support — ideal for Next.js and React applications that need agent capabilities.',
            },
            {
                name: 'CrewAI',
                slug: 'crewai',
                reason: 'Role-based multi-agent framework with built-in tool support — focuses on collaborative agent workflows rather than gateway connectivity.',
            },
            {
                name: 'AutoGen',
                slug: 'autogen',
                reason: 'Microsoft\'s multi-agent conversation framework — native tool use without a separate gateway layer.',
            },
        ],
        faqs: [
            {
                question: 'What is the main limitation of OpenClaw?',
                answer: 'OpenClaw\'s skills execute through agent chat rather than direct API calls, which adds latency and complexity. The gateway model also ties you to its ecosystem — skills written for OpenClaw don\'t work with other frameworks.',
            },
            {
                question: 'Can I use OpenClaw with other agent frameworks?',
                answer: 'Yes, since OpenClaw exposes an OpenAI-compatible HTTP API, any framework that speaks the OpenAI protocol can use it as a backend. However, you lose the native tool integrations those frameworks provide.',
            },
            {
                question: 'Is MCP a direct replacement for OpenClaw?',
                answer: 'They solve different problems. MCP standardizes tool discovery and invocation as a protocol. OpenClaw is a runtime gateway that hosts and executes tools. You could use MCP servers as tool providers for your agents without needing a gateway like OpenClaw.',
            },
        ],
        related: ['clawhub', 'langchain', 'anthropic-mcp'],
    },
    {
        slug: 'clawhub',
        name: 'ClawHub',
        shortDesc:
            'Looking for alternatives to ClawHub? Compare AI agent skill marketplaces, tool registries, and package managers.',
        body: 'ClawHub is the official skill marketplace for OpenClaw, hosting over 3,000 community-built agent extensions. It provides CLI-based skill management, vector search for discovery, and semver versioning. However, ClawHub is tightly coupled to the OpenClaw ecosystem, and the ClawHavoc security incident raised concerns about supply chain safety.\n\nIf you are building agents outside the OpenClaw ecosystem or want more portable tool solutions, these alternatives offer different approaches to agent extensibility.',
        alternatives: [
            {
                name: 'Anthropic MCP',
                slug: 'anthropic-mcp',
                reason: 'Open protocol with a growing ecosystem of MCP servers — tools are portable across any MCP-compatible client, not locked to one platform.',
            },
            {
                name: 'LangChain',
                slug: 'langchain',
                reason: '700+ built-in tool integrations that work natively with LangChain agents — no separate registry or installation needed.',
            },
            {
                name: 'OpenRouter',
                slug: 'openrouter',
                reason: 'Unified API for LLM access across providers — solves the model connectivity problem that ClawHub solves for tool connectivity.',
            },
            {
                name: 'Composio',
                slug: 'composio',
                reason: 'Managed tool integration platform with 250+ pre-built connectors, authentication handling, and framework-agnostic design.',
            },
        ],
        faqs: [
            {
                question: 'Why look for ClawHub alternatives?',
                answer: 'ClawHub skills only work with OpenClaw agents. If you use a different agent framework (LangChain, CrewAI, AutoGen) or want tools that work across platforms, you need alternatives. The ClawHavoc incident also raised security concerns about community-maintained skill registries.',
            },
            {
                question: 'Is there a universal skill marketplace for AI agents?',
                answer: 'Not yet. The closest is the MCP ecosystem, which standardizes tool interfaces so the same tool works with any compatible client. ClawHub, LangChain tools, and CrewAI tools each work within their own ecosystems.',
            },
            {
                question: 'How do I migrate from ClawHub to MCP?',
                answer: 'There is no direct migration path. You would need to find or build MCP servers that provide equivalent functionality to your ClawHub skills. Many common capabilities (web search, file operations, database access) already have MCP server implementations.',
            },
        ],
        related: ['openclaw', 'anthropic-mcp', 'langchain'],
    },
    {
        slug: 'langchain',
        name: 'LangChain',
        shortDesc:
            'Looking for alternatives to LangChain? Compare agent frameworks, orchestration tools, and LLM development kits.',
        body: 'LangChain is the most popular framework for building LLM applications. Its breadth is both its strength and weakness — the heavy abstraction layer, frequent breaking changes, and complexity can be overkill for many use cases. Teams looking for simpler, more focused tools have several options.\n\nThe alternatives range from lightweight SDKs to specialized multi-agent frameworks, depending on whether you need general LLM tooling or specific agent capabilities.',
        alternatives: [
            {
                name: 'Vercel AI SDK',
                slug: 'vercel-ai-sdk',
                reason: 'TypeScript-first, minimal abstraction — ideal for web developers who want AI capabilities without LangChain\'s complexity.',
            },
            {
                name: 'AutoGen',
                slug: 'autogen',
                reason: 'Purpose-built for multi-agent conversations — better native primitives for agent-to-agent messaging than LangGraph.',
            },
            {
                name: 'CrewAI',
                slug: 'crewai',
                reason: 'Role-based multi-agent framework with simpler API — lower learning curve for teams that just need agents collaborating.',
            },
            {
                name: 'OpenClaw',
                slug: 'openclaw',
                reason: 'Gateway-first approach to agent tooling — lighter weight than LangChain if you primarily need tool connectivity and multi-channel messaging.',
            },
            {
                name: 'Claude Code',
                slug: 'claude-code',
                reason: 'Anthropic\'s CLI agent with native tool use — zero-framework approach where the model handles orchestration directly.',
            },
        ],
        faqs: [
            {
                question: 'Is LangChain still worth using?',
                answer: 'For complex applications that need many integrations, yes. But if you are building something focused (a chatbot, a single-purpose agent, a tool-using assistant), lighter alternatives like the Vercel AI SDK or direct API calls are often better.',
            },
            {
                question: 'What is the main complaint about LangChain?',
                answer: 'Over-abstraction. LangChain wraps everything in its own classes, making debugging harder and creating unnecessary complexity for simple use cases. The API also changes frequently, breaking existing code.',
            },
            {
                question: 'Can I use LangChain tools without LangChain?',
                answer: 'Some LangChain tools are standalone packages. But most are tightly integrated with the LangChain runtime. For portable tool access, MCP servers are a better bet.',
            },
        ],
        related: ['autogen', 'crewai', 'vercel-ai-sdk'],
    },
    {
        slug: 'crewai',
        name: 'CrewAI',
        shortDesc:
            'Looking for alternatives to CrewAI? Compare multi-agent frameworks, orchestration tools, and autonomous agent platforms.',
        body: 'CrewAI simplifies multi-agent systems with its role-based approach — define agents with roles, goals, and backstories, then let them collaborate. However, it is Python-only, offers limited customization of interaction patterns, and may not scale well for complex orchestration needs.\n\nTeams needing more control over agent interactions, TypeScript support, or different orchestration models have several alternatives.',
        alternatives: [
            {
                name: 'AutoGen',
                slug: 'autogen',
                reason: 'More flexible multi-agent conversation primitives — better for research-oriented systems and complex interaction patterns.',
            },
            {
                name: 'LangChain',
                slug: 'langchain',
                reason: 'LangGraph provides stateful agent workflows as graphs — more control over orchestration than CrewAI\'s sequential/hierarchical model.',
            },
            {
                name: 'Vercel AI SDK',
                slug: 'vercel-ai-sdk',
                reason: 'TypeScript alternative for web-focused agent applications — no Python dependency.',
            },
            {
                name: 'OpenClaw',
                slug: 'openclaw',
                reason: 'Gateway approach to multi-agent tooling — agents connect to tools through a shared gateway rather than framework-managed integrations.',
            },
        ],
        faqs: [
            {
                question: 'Is CrewAI good for production systems?',
                answer: 'CrewAI works well for well-defined workflows with clear roles. For production systems needing custom orchestration, error handling, or dynamic routing, you may outgrow it quickly.',
            },
            {
                question: 'Does CrewAI support TypeScript?',
                answer: 'No, CrewAI is Python-only. For TypeScript multi-agent systems, consider the Vercel AI SDK, Mastra, or building custom orchestration with direct API calls.',
            },
            {
                question: 'How does CrewAI compare to SUBCORP\'s approach?',
                answer: 'CrewAI uses role-based agent definitions with framework-managed orchestration. SUBCORP uses deeply grounded agent personas (3,000+ word identity documents) with a custom roundtable orchestrator supporting 16 conversation formats. CrewAI is simpler to set up; SUBCORP produces richer emergent behavior.',
            },
        ],
        related: ['autogen', 'langchain', 'openclaw'],
    },
    {
        slug: 'autogen',
        name: 'AutoGen',
        shortDesc:
            'Looking for alternatives to AutoGen? Compare multi-agent conversation frameworks and agent orchestration tools.',
        body: 'AutoGen (by Microsoft) is built specifically for multi-agent conversations. Its strength is native support for agent-to-agent messaging, group chat, and human-in-the-loop patterns. However, it is primarily Python-focused, has a smaller ecosystem than LangChain, and the research-oriented design can feel heavy for production deployment.\n\nAlternatives range from simpler multi-agent frameworks to full orchestration platforms.',
        alternatives: [
            {
                name: 'CrewAI',
                slug: 'crewai',
                reason: 'Simpler role-based approach — easier to get started with multi-agent systems without AutoGen\'s research-framework complexity.',
            },
            {
                name: 'LangChain',
                slug: 'langchain',
                reason: 'LangGraph offers stateful agent workflows with a larger ecosystem of tools and integrations.',
            },
            {
                name: 'Vercel AI SDK',
                slug: 'vercel-ai-sdk',
                reason: 'TypeScript-first agent toolkit — better for web applications and teams not using Python.',
            },
            {
                name: 'Mastra',
                slug: 'mastra',
                reason: 'TypeScript agent framework with built-in workflows, RAG, and multi-agent support — modern alternative for TypeScript teams.',
            },
        ],
        faqs: [
            {
                question: 'Is AutoGen still maintained?',
                answer: 'AutoGen has evolved into AG2 (AutoGen v2) with a new architecture. The original AutoGen is still available but Microsoft is focusing development on the newer version.',
            },
            {
                question: 'What is AutoGen best for?',
                answer: 'Research-oriented multi-agent systems where agent dialogue and debate are core to the workflow. It excels at structured conversations with dynamic speaker selection.',
            },
            {
                question: 'Can I use AutoGen in production?',
                answer: 'Yes, but it requires more engineering work than higher-level frameworks. You will need to handle deployment, scaling, error recovery, and monitoring yourself.',
            },
        ],
        related: ['crewai', 'langchain', 'mastra'],
    },
];

export const alternativesLabelMap: Record<string, string> = Object.fromEntries(
    alternatives.map(e => [e.slug, `${e.name} Alternatives`]),
);
