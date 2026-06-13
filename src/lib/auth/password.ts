import argon2 from 'argon2';

// OWASP recommended defaults for argon2id
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
    hash: string,
    password: string,
): Promise<boolean> {
    try {
        return await argon2.verify(hash, password);
    } catch {
        return false;
    }
}

/**
 * Dummy hash to run argon2 against when user is not found.
 * Prevents timing attacks that reveal whether an email exists.
 */
export const DUMMY_HASH =
    '$argon2id$v=19$m=65536,t=3,p=1$dW5rbm93bg$dW5rbm93bg';
