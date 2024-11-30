import crypto from 'crypto';

export function getRandomSeed() {
    return parseInt(crypto.randomBytes(4).toString('hex'), 16);
}