import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'SUBCORP privacy policy — how we handle your data.',
};

export default function PrivacyPolicyPage() {
    return (
        <div className='min-h-screen bg-[#11111b] text-zinc-100'>
            <div className='mx-auto max-w-2xl px-4 py-16 sm:px-6'>
                <Link
                    href='/'
                    className='text-xs text-zinc-500 hover:text-zinc-300 transition-colors'
                >
                    &larr; Back
                </Link>

                <h1 className='text-2xl font-bold mt-6 mb-2'>Privacy Policy</h1>
                <p className='text-xs text-zinc-500 mb-10'>
                    Last updated: February 18, 2026
                </p>

                <div className='space-y-8 text-sm text-zinc-300 leading-relaxed'>
                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Who we are
                        </h2>
                        <p>
                            SUBCORP (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is
                            operated by SUBCORP. Our website is{' '}
                            <a
                                href='https://subcorp.subcult.tv'
                                className='text-zinc-100 underline underline-offset-2'
                            >
                                subcorp.subcult.tv
                            </a>
                            .
                        </p>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            What data we collect
                        </h2>
                        <p className='mb-3'>
                            We collect the minimum data necessary to operate the
                            service:
                        </p>
                        <ul className='list-disc pl-5 space-y-1.5'>
                            <li>
                                <strong className='text-zinc-100'>
                                    Account data
                                </strong>{' '}
                                &mdash; email address, username, and password
                                hash when you create an account. Passwords are
                                hashed with argon2id and never stored in
                                plaintext.
                            </li>
                            <li>
                                <strong className='text-zinc-100'>
                                    OAuth data
                                </strong>{' '}
                                &mdash; if you sign in via GitHub or Discord, we
                                receive your provider account ID, email, display
                                name, and avatar URL. We do not receive or store
                                your provider password.
                            </li>
                            <li>
                                <strong className='text-zinc-100'>
                                    Session data
                                </strong>{' '}
                                &mdash; IP address and user agent string, stored
                                with your session for security purposes.
                                Sessions expire after 30 days.
                            </li>
                            <li>
                                <strong className='text-zinc-100'>
                                    User-generated content
                                </strong>{' '}
                                &mdash; any votes, questions, or other actions
                                you take on the platform.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            How we use your data
                        </h2>
                        <ul className='list-disc pl-5 space-y-1.5'>
                            <li>
                                To authenticate you and maintain your session.
                            </li>
                            <li>
                                To display your username and avatar on public
                                actions (votes, questions).
                            </li>
                            <li>To enforce rate limits and prevent abuse.</li>
                        </ul>
                        <p className='mt-3'>
                            We do not sell your data. We do not use your data
                            for advertising. We do not share your data with
                            third parties except as required by law.
                        </p>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Cookies
                        </h2>
                        <p>We use the following cookies:</p>
                        <ul className='list-disc pl-5 space-y-1.5 mt-2'>
                            <li>
                                <code className='text-xs bg-zinc-800 px-1.5 py-0.5 rounded'>
                                    auth_session
                                </code>{' '}
                                &mdash; HttpOnly session cookie. Identifies your
                                login session.
                            </li>
                            <li>
                                <code className='text-xs bg-zinc-800 px-1.5 py-0.5 rounded'>
                                    auth_csrf
                                </code>{' '}
                                &mdash; CSRF protection token. Readable by
                                JavaScript on our domain only.
                            </li>
                            <li>
                                <code className='text-xs bg-zinc-800 px-1.5 py-0.5 rounded'>
                                    oauth_state
                                </code>{' '}
                                &mdash; temporary cookie (10 minutes) used
                                during OAuth sign-in to prevent cross-site
                                request forgery.
                            </li>
                        </ul>
                        <p className='mt-3'>
                            We do not use analytics cookies, tracking pixels, or
                            third-party cookies.
                        </p>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Data retention
                        </h2>
                        <p>
                            Account data is retained for as long as your account
                            exists. Sessions are automatically deleted after
                            they expire. You can request deletion of your
                            account and all associated data by contacting us.
                        </p>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Your rights
                        </h2>
                        <p>You have the right to:</p>
                        <ul className='list-disc pl-5 space-y-1.5 mt-2'>
                            <li>Access the personal data we hold about you.</li>
                            <li>Request correction of inaccurate data.</li>
                            <li>Request deletion of your account and data.</li>
                            <li>
                                Withdraw consent at any time by deleting your
                                account.
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Security
                        </h2>
                        <p>
                            Passwords are hashed with argon2id using
                            OWASP-recommended parameters. Session tokens are
                            stored as SHA-256 hashes. All traffic is served over
                            HTTPS. We follow current best practices for web
                            application security.
                        </p>
                    </section>

                    <section>
                        <h2 className='text-base font-semibold text-zinc-100 mb-2'>
                            Contact
                        </h2>
                        <p>
                            For privacy-related questions or requests, reach out
                            on X at{' '}
                            <a
                                href='https://x.com/subcult_tv'
                                className='text-zinc-100 underline underline-offset-2'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                @subcult_tv
                            </a>
                            .
                        </p>
                    </section>
                </div>

                <footer className='mt-16 text-center text-[10px] text-zinc-700'>
                    SUBCORP
                </footer>
            </div>
        </div>
    );
}
