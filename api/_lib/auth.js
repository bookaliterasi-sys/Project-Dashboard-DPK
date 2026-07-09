// api/_lib/auth.js — util autentikasi (JWT + bcrypt)
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TOKEN_TTL = '8h';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// ambil token dari header Authorization: Bearer <token> atau cookie
export function getToken(req) {
  const auth = req.headers?.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookie = req.headers?.cookie || '';
  const m = cookie.match(/(?:^|;\s*)ise_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// guard: kembalikan user bila valid, atau kirim 401 dan return null
export function requireAuth(req, res) {
  const token = getToken(req);
  const user = token && verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Tidak terautentikasi' });
    return null;
  }
  return user;
}

// helper CORS/JSON ringan untuk semua handler
export function withJson(res) {
  res.setHeader('Content-Type', 'application/json');
  return res;
}
