import crypto from 'crypto';

export function hashVerificationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashVerificationToken(token);

  const ttlMinutesRaw = process.env.EMAIL_VERIFY_TOKEN_TTL_MINUTES;
  const ttlMinutes = ttlMinutesRaw ? Number(ttlMinutesRaw) : 60 * 24;
  const ttlMs = Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes * 60_000 : 60 * 24 * 60_000;

  const expiresAt = new Date(Date.now() + ttlMs);

  return { token, tokenHash, expiresAt };
}

