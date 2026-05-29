// SUBCULT Daily — PDF newspaper renderer
// Uses @react-pdf/renderer for pure Node.js PDF generation (no Chromium).
import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    Image,
    Link,
    StyleSheet,
    renderToBuffer,
} from '@react-pdf/renderer';
import type { NewspaperArticle } from './newspaper';

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
    dateText: {
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
    columns: {
        flexDirection: 'row',
        gap: 20,
    },
    column: {
        flex: 1,
    },
    categoryHeader: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#666',
        textTransform: 'uppercase',
        letterSpacing: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingBottom: 3,
        marginBottom: 8,
        marginTop: 12,
    },
    article: {
        marginBottom: 12,
    },
    articleImage: {
        width: '100%',
        height: 80,
        objectFit: 'cover',
        marginBottom: 4,
    },
    articleTitle: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#1a1a2e',
        marginBottom: 2,
        lineHeight: 1.3,
    },
    articleSource: {
        fontSize: 7,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 3,
    },
    articleSummary: {
        fontSize: 8,
        color: '#333',
        lineHeight: 1.5,
        textAlign: 'justify',
    },
    articleLink: {
        fontSize: 7,
        color: '#4a5568',
        marginTop: 2,
        textDecoration: 'none',
    },
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

// ─── Category labels ───

const CATEGORY_LABELS: Record<string, string> = {
    tech: 'Technology',
    security: 'Security',
    politics: 'Politics & Power',
    organizing: 'Labor & Organizing',
    'open-source': 'Open Source',
    world: 'World',
    general: 'General',
};

// ─── Components ───

function ArticleBlock({ article }: { article: NewspaperArticle }) {
    return (
        <View style={styles.article}>
            {article.ogImage && (
                // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop.
                <Image src={article.ogImage} style={styles.articleImage} />
            )}
            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.articleSource}>{article.source}</Text>
            <Text style={styles.articleSummary}>{article.summary}</Text>
            {article.link && (
                <Link src={article.link} style={styles.articleLink}>
                    <Text>Read full article</Text>
                </Link>
            )}
        </View>
    );
}

function NewspaperDocument({
    date,
    headline,
    articles,
}: {
    date: string;
    headline: string;
    articles: NewspaperArticle[];
}) {
    // Group articles by category
    const grouped = new Map<string, NewspaperArticle[]>();
    for (const article of articles) {
        if (!grouped.has(article.category)) grouped.set(article.category, []);
        grouped.get(article.category)!.push(article);
    }

    // Sort categories: tech first, then alphabetical
    const sortedCategories = [...grouped.keys()].sort((a, b) => {
        if (a === 'tech') return -1;
        if (b === 'tech') return 1;
        return a.localeCompare(b);
    });

    // Flatten into ordered article list with category markers
    type CategorizedArticle = { category: string; article: NewspaperArticle; isFirst: boolean };
    const ordered: CategorizedArticle[] = [];
    for (const cat of sortedCategories) {
        const catArticles = grouped.get(cat)!;
        catArticles.forEach((article, i) => {
            ordered.push({ category: cat, article, isFirst: i === 0 });
        });
    }

    // Split roughly evenly into two columns
    const midpoint = Math.ceil(ordered.length / 2);
    const leftArticles = ordered.slice(0, midpoint);
    const rightArticles = ordered.slice(midpoint);

    const sourceCount = new Set(articles.map((a) => a.source)).size;
    const formattedDate = new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Masthead */}
                <View style={styles.masthead}>
                    <Text style={styles.mastheadTitle}>SUBCULT DAILY</Text>
                </View>
                <View style={styles.mastheadRule} />
                <View style={styles.mastheadRuleThin} />
                <Text style={styles.dateText}>{formattedDate}</Text>

                {/* Headline */}
                <Text style={styles.headline}>{headline}</Text>

                {/* Two-column layout */}
                <View style={styles.columns}>
                    <View style={styles.column}>
                        {leftArticles.map(({ category, article, isFirst }, i) => (
                            <View key={i}>
                                {isFirst && (
                                    <Text style={styles.categoryHeader}>
                                        {CATEGORY_LABELS[category] ?? category}
                                    </Text>
                                )}
                                <ArticleBlock article={article} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.column}>
                        {rightArticles.map(({ category, article, isFirst }, i) => (
                            <View key={i}>
                                {isFirst && (
                                    <Text style={styles.categoryHeader}>
                                        {CATEGORY_LABELS[category] ?? category}
                                    </Text>
                                )}
                                <ArticleBlock article={article} />
                            </View>
                        ))}
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>
                        {articles.length} articles from {sourceCount} sources
                    </Text>
                    <Text style={styles.footerText}>subcorp.subcult.tv/news</Text>
                </View>
            </Page>
        </Document>
    );
}

// ─── Public API ───

export async function renderNewspaperPdf(props: {
    date: string;
    headline: string;
    articles: NewspaperArticle[];
}): Promise<Buffer> {
    // 60s timeout for PDF rendering
    const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF render timeout (60s)')), 60_000),
    );

    const renderPromise = renderToBuffer(
        <NewspaperDocument
            date={props.date}
            headline={props.headline}
            articles={props.articles}
        />,
    );

    const result = await Promise.race([renderPromise, timeoutPromise]);
    return Buffer.from(result);
}
