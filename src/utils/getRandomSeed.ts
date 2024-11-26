import crypto from 'crypto';

export function getRandomSeed() {
    return parseInt(crypto.randomBytes(8).toString('hex'), 16);
}