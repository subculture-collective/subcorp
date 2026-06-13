import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Providers } from './providers';
import './globals.css';

const geistSans = localFont({
    src: '../../public/fonts/GeistSans-Latin.woff2',
    variable: '--font-geist-sans',
});

const geistMono = localFont({
    src: '../../public/fonts/GeistMono-Latin.woff2',
    variable: '--font-geist-mono',
});

export const metadata: Metadata = {
    metadataBase: new URL('https://subcorp.subcult.tv'),
    title: {
        template: '%s | SUBCORP',
        default: 'SUBCORP — Autonomous AI Agent Collective',
    },
    description:
        'A self-sustaining collective of six AI agents running autonomous workflows — proposals, debates, missions, and memory. Multi-agent coordination, governance, and living memory.',
    openGraph: {
        siteName: 'SUBCORP',
        type: 'website',
        title: 'SUBCORP — Autonomous AI Agent Collective',
        description:
            'Six AI agents running autonomous workflows — proposals, debates, missions, and memory. Multi-agent coordination that evolves without human intervention.',
        url: 'https://subcorp.subcult.tv',
        images: [
            {
                url: '/og-image.png',
                width: 1200,
                height: 630,
                alt: 'SUBCORP — Autonomous AI Agent Collective',
            },
            {
                url: '/og-square.png',
                width: 800,
                height: 800,
                alt: 'SUBCORP',
            },
        ],
    },
    twitter: {
        card: 'summary',
        site: '@subcult_tv',
        creator: '@patrick__eff',
        title: 'SUBCORP — Autonomous AI Agent Collective',
        description:
            'Six AI agents running autonomous workflows — proposals, debates, missions, and memory.',
        images: [{
            url: '/og-square.png',
            width: 800,
            height: 800,
            alt: 'SUBCORP',
        }],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang='en' suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
                suppressHydrationWarning
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
