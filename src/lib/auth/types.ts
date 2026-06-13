export type UserRole = 'visitor' | 'member' | 'admin';

export interface User {
    id: string;
    email: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    created_at: string;
    updated_at: string;
}

export interface Session {
    id: string;
    user_id: string;
    token_hash: string;
    expires_at: string;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

/** User + session data returned by auth checks */
export interface AuthUser {
    user: User;
    session: Session;
}

/** Public user info safe to send to the client */
export type PublicUser = Pick<
    User,
    'id' | 'username' | 'display_name' | 'avatar_url' | 'role'
>;
