import jwt from 'jsonwebtoken';

export type JwtUserPayload = {
  sub: string;
};

export function signAccessToken(payload: JwtUserPayload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];
  const options: jwt.SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

export function verifyAccessToken(token: string): JwtUserPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');

  const decoded = jwt.verify(token, secret);
  if (!decoded || typeof decoded !== 'object') throw new Error('Invalid token');

  const sub = (decoded as { sub?: unknown }).sub;
  if (typeof sub !== 'string' || !sub) throw new Error('Invalid token payload');

  return { sub };
}

