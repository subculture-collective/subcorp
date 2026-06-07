// SUBCORP Weekly — PDF newsletter renderer
// Uses @react-pdf/renderer for pure Node.js PDF generation (no Chromium).
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
} from '@react-pdf/renderer';
import type { NewsletterSection, NewsletterStats } from './newsletter';
import { AGENTS } from '@/lib/agents';
import type { AgentId } from '@/lib/types';

// ─── Styles ───

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#faf9f6',
        paddingHorizontal: 40,
        paddingVertical: 36,
        fontFamily: 'Helvetica',
        color: '#1a1a2e',
    },
    masthead: {
        textAlign: 'center',
        marginBottom: 4,
    },
    mastheadTitle: {
        fontSize: 28,
        fontFamily: 'Helvetica-Bold',
        letterSpacing: 6,
        color: '#1a1a2e',
    },
    mastheadRule: {
        borderBottomWidth: 2,
        borderBottomColor: '#1a1a2e',
        marginVertical: 6,
    },
    mastheadRuleThin: {
        borderBottomWidth: 0.5,
        borderBottomColor: '#1a1a2e',
        marginBottom: 8,
    },
    weekText: {
        fontSize: 9,
        textAlign: 'center',
        color: '#555',
        marginBottom: 12,
    },
    headline: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginBottom: 16,
        color: '#1a1a2e',
        lineHeight: 1.3,
    },
    // Primus message blockquote
    primusBlock: {
        marginBottom: 16,
        paddingLeft: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#f5c2e7', // Primus pink
    },
    primusText: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#444',
        lineHeight: 1.5,
    },
    primusAttribution: {
        fontSize: 7,
        color: '#888',
        marginTop: 4,
    },
    // Stats grid
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 16,
    },
    statBox: {
        width: '23%',
        backgroundColor: '#f0f0ec',
        borderRadius: 4,
        padding: 6,
    },
    statLabel: {
        fontSize: 6,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        color: '#1a1a2e',
        marginTop: 2,
    },
    // Sections
    sectionHeader: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 3,
        marginBottom: 8,
        marginTop: 14,
    },
    sectionContent: {
        fontSize: 8,
        color: '#333',
        lineHeight: 1.6,
        textAlign: 'justify',
    },
    // Agent spotlight accent
    spotlightAccent: {
        width: '100%',
        height: 2,
        marginBottom: 8,
        borderRadius: 1,
    },
    // Footer
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 0.5,
        borderTopColor: '#ccc',
        paddingTop: 6,
    },
    footerText: {
        fontSize: 7,
        color: '#999',
    },
});

// ─── Components ───

function StatsGrid({ stats }: { stats: NewsletterStats }) {
    const items: { label: string; value: number }[] = [
        { label: 'Conversations', value: stats.conversations },
        { label: 'Missions Done', value: stats.missions_completed },
        { label: 'Proposals', value: stats.proposals },
        { label: 'Events', value: stats.events },
        { label: 'Drafts', value: stats.content_drafts },
        { label: 'Dreams', value: stats.dream_cycles },
        { label: 'Memories', value: stats.memories_created },
        { label: 'Governance', value: stats.governance_proposals },
    ];

    return (
        <View style={styles.statsContainer}>
            {items.map((item) => (
                <View key={item.label} style={styles.statBox}>
                    <Text style={styles.statLabel}>{item.label}</Text>
                    <Text style={styles.statValue}>{item.value}</Text>
                </View>
            ))}
        </View>
    );
}

function SectionBlock({
    section,
    spotlightAgent,
}: {
    section: NewsletterSection;
    spotlightAgent: AgentId;
}) {
    const isSpotlight = section.key === 'agent_spotlight';
    const agentConfig = isSpotlight ? AGENTS[spotlightAgent] : null;

    return (
        <View>
            {isSpotlight && agentConfig && (
                <View
                    style={[
                        styles.spotlightAccent,
                        { backgroundColor: agentConfig.color },
                    ]}
                />
            )}
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
    );
}

function NewsletterDocument({
    weekString,
    headline,
    primusMessage,
    stats,
    sections,
    spotlightAgent,
}: {
    weekString: string;
    headline: string;
    primusMessage: string;
    stats: NewsletterStats;
    sections: NewsletterSection[];
    spotlightAgent: AgentId;
}) {
    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Masthead */}
                <View style={styles.masthead}>
                    <Text style={styles.mastheadTitle}>SUBCORP WEEKLY</Text>
                </View>
                <View style={styles.mastheadRule} />
                <View style={styles.mastheadRuleThin} />
                <Text style={styles.weekText}>{weekString} — Office Newsletter</Text>

                {/* Headline */}
                <Text style={styles.headline}>{headline}</Text>

                {/* Primus message */}
                {primusMessage && (
                    <View style={styles.primusBlock}>
                        <Text style={styles.primusText}>{primusMessage}</Text>
                        <Text style={styles.primusAttribution}>
                            — Primus, Sovereign
                        </Text>
                    </View>
                )}

                {/* Stats grid */}
                <StatsGrid stats={stats} />

                {/* Sections */}
                {sections.map((section) => (
                    <SectionBlock
                        key={section.key}
                        section={section}
                        spotlightAgent={spotlightAgent}
                    />
                ))}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        SUBCORP WEEKLY | {weekString}
                    </Text>
                    <Text style={styles.footerText}>
                        subcorp.subcult.tv/stage
                    </Text>
                </View>
            </Page>
        </Document>
    );
}

// ─── Public API ───

export async function renderNewsletterPdf(props: {
    weekString: string;
    headline: string;
    primusMessage: string;
    stats: NewsletterStats;
    sections: NewsletterSection[];
    spotlightAgent: AgentId;
}): Promise<Buffer> {
    // 60s timeout for PDF rendering
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Newsletter PDF render timeout (60s)')), 60_000),
    );

    const renderPromise = renderToBuffer(
        <NewsletterDocument
            weekString={props.weekString}
            headline={props.headline}
            primusMessage={props.primusMessage}
            stats={props.stats}
            sections={props.sections}
            spotlightAgent={props.spotlightAgent}
        />,
    );

    const result = await Promise.race([renderPromise, timeoutPromise]);
    return Buffer.from(result);
}
