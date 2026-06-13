export interface GlossaryEntry {
    slug: string;
    term: string;
    shortDef: string;
    body: string;
    category: 'concept' | 'tool' | 'pattern';
    related: string[];
}

export interface ComparisonEntry {
    slug: string;
    title: string;
    shortDesc: string;
    body: string;
    sideA: { name: string; points: string[] };
    sideB: { name: string; points: string[] };
    verdict: string;
    faqs: { question: string; answer: string }[];
    related: string[];
}

export interface AlternativesEntry {
    slug: string; // e.g. "openclaw" -> /learn/alternatives/openclaw
    name: string; // "OpenClaw"
    shortDesc: string;
    body: string;
    alternatives: {
        name: string;
        slug: string; // directory slug for cross-linking
        reason: string; // why it's an alternative
    }[];
    faqs: { question: string; answer: string }[];
    related: string[];
}

export interface DirectoryEntry {
    slug: string;
    name: string;
    shortDesc: string;
    body: string;
    category: 'framework' | 'platform' | 'model-provider' | 'protocol';
    pricing: 'free' | 'freemium' | 'paid';
    url: string;
    features: string[];
    pros: string[];
    cons: string[];
    related: string[];
}
