const crypto = require('crypto');

const PREFIX = 'enc:v1:';

function encryptionKey() {
    const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET is required to encrypt bot tokens');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

function encryptSecret(plain) {
    if (!plain) return plain;
    if (String(plain).startsWith(PREFIX)) return plain;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptSecret(value) {
    if (!value) return value;
    const text = String(value);
    if (!text.startsWith(PREFIX)) return text;
    const raw = Buffer.from(text.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

module.exports = { encryptSecret, decryptSecret, PREFIX };
