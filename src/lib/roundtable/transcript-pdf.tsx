// Roundtable Transcript PDF — includes debrief summary prepended to full transcript
// Uses @react-pdf/renderer for pure Node.js PDF generation.
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    renderToBuffer,
} from '@react-pdf/renderer';
import type { Debrief } from './debrief';

// ─── Types ───

interface TranscriptTurn {
    speaker: string;
    displayName: string;
    dialogue: string;
    turnNumber: number;
}

interface TranscriptData {
    sessionId: string;
    format: string;
    topic: string;
    participants: string[];
    turns: TranscriptTurn[];
    startedAt: string;
    completedAt: string;
    debrief?: Debrief | null;
}

// ─── Styles ───

const styles = StyleSheet.create({
    page: {
        backgroundColor: '#faf9f6',
        paddingHorizontal: 40,
        paddingVertical: 36,
        fontFamily: 'Helvetica',
        color: '#1a1a2e',
        fontSize: 10,
    },
    // Cover
    coverTitle: {
        fontSize: 22,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'center',
        marginTop: 60,
        marginBottom: 8,
    },
    coverSubtitle: {
        fontSize: 12,
        textAlign: 'center',
        color: '#555',
        marginBottom: 4,
    },
    coverMeta: {
        fontSize: 9,
        textAlign: 'center',
        color: '#888',
        marginBottom: 30,
    },
    rule: {
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        marginVertical: 12,
    },
    thickRule: {
        borderBottomWidth: 2,
        borderBottomColor: '#1a1a2e',
        marginVertical: 16,
    },
    // Debrief section
    debriefHeader: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 8,
    },
    debriefSummary: {
        fontSize: 10,
        lineHeight: 1.5,
        marginBottom: 10,
    },
    debriefSectionTitle: {
        fontSize: 11,
        fontFamily: 'Helvetica-Bold',
        marginTop: 8,
        marginBottom: 4,
    },
    debriefItem: {
        fontSize: 10,
        lineHeight: 1.4,
        marginLeft: 8,
        marginBottom: 2,
    },
    // Transcript
    transcriptHeader: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 12,
    },
    turn: {
        marginBottom: 10,
    },
    turnSpeaker: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#333',
        marginBottom: 2,
    },
    turnDialogue: {
        fontSize: 10,
        lineHeight: 1.5,
        color: '#1a1a2e',
    },
    turnNumber: {
        fontSize: 8,
        color: '#aaa',
        marginBottom: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 40,
        right: 40,
        fontSize: 8,
        color: '#aaa',
        textAlign: 'center',
    },
    participantList: {
        fontSize: 10,
        color: '#555',
        marginBottom: 6,
    },
});

// ─── Components ───

function DebriefSection({ debrief }: { debrief: Debrief }) {
    return (
        <View>
            <Text style={styles.debriefHeader}>Meeting Debrief</Text>
            <Text style={styles.debriefSummary}>{debrief.summary}</Text>

            {debrief.decisions.length > 0 && (
                <View>
                    <Text style={styles.debriefSectionTitle}>Decisions</Text>
                    {debrief.decisions.map((d, i) => (
                        <Text key={i} style={styles.debriefItem}>{'  \u2713 '}{d}</Text>
                    ))}
                </View>
            )}

            {debrief.actionItems.length > 0 && (
                <View>
                    <Text style={styles.debriefSectionTitle}>Action Items</Text>
                    {debrief.actionItems.map((a, i) => (
                        <Text key={i} style={styles.debriefItem}>
                            {'  \u2022 '}[{a.priority.toUpperCase()}] {a.owner}: {a.task}
                        </Text>
                    ))}
                </View>
            )}

            {debrief.openQuestions.length > 0 && (
                <View>
                    <Text style={styles.debriefSectionTitle}>Open Questions</Text>
                    {debrief.openQuestions.map((q, i) => (
                        <Text key={i} style={styles.debriefItem}>{'  ? '}{q}</Text>
                    ))}
                </View>
            )}

            <View style={styles.thickRule} />
        </View>
    );
}

function TranscriptDocument({ data }: { data: TranscriptData }) {
    const dateStr = data.startedAt
        ? new Date(data.startedAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: '2-digit', minute: '2-digit',
          })
        : 'Unknown date';

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Cover info */}
                <Text style={styles.coverTitle}>{data.format.toUpperCase()}</Text>
                <Text style={styles.coverSubtitle}>{data.topic}</Text>
                <Text style={styles.coverMeta}>
                    {dateStr} | {data.participants.length} participants | {data.turns.length} turns
                </Text>
                <Text style={styles.participantList}>
                    Participants: {data.participants.join(', ')}
                </Text>

                <View style={styles.thickRule} />

                {/* Debrief (prepended before transcript) */}
                {data.debrief && <DebriefSection debrief={data.debrief} />}

                {/* Full transcript */}
                <Text style={styles.transcriptHeader}>Transcript</Text>

                {data.turns.map((turn) => (
                    <View key={turn.turnNumber} style={styles.turn}>
                        <Text style={styles.turnNumber}>Turn {turn.turnNumber + 1}</Text>
                        <Text style={styles.turnSpeaker}>{turn.displayName}</Text>
                        <Text style={styles.turnDialogue}>{turn.dialogue}</Text>
                    </View>
                ))}

                {/* Footer */}
                <Text style={styles.footer} fixed>
                    SUBCULT COLLECTIVE | Session {data.sessionId.slice(0, 8)} | Generated {new Date().toISOString().slice(0, 10)}
                </Text>
            </Page>
        </Document>
    );
}

// ─── Render ───

export async function renderTranscriptPdf(data: TranscriptData): Promise<Buffer> {
    const buffer = await renderToBuffer(
        <TranscriptDocument data={data} />,
    );
    return Buffer.from(buffer);
}
