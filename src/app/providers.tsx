'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/client';
import { AuthModal } from './stage/AuthModal';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <AuthProvider>
            {children}
            <AuthModal />
        </AuthProvider>
    );
}
