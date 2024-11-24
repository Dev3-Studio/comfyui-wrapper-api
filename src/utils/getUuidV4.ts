import crypto from 'crypto';

export function getUuidV4() {
    return crypto.randomUUID();
}