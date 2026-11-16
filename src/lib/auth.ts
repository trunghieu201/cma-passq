import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'passq-cma-production-secret-jwt-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
export const AUTH_COOKIE_NAME = 'token';

export interface TokenPayload {
  userId: string;
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface SanitizedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  targetExamDate?: Date | null;
  createdAt?: Date;
}

// 1. Password Hashing
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// 2. Password Verification
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 3. Sign JWT Token
export function signToken(payload: { userId: string; email: string; role?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
}

// 4. Verify JWT Token
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

// 5. Auth Cookie Options
export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}

// 6. Extract Token from Request (Cookies, Header, or next/headers)
export function extractTokenFromRequest(req?: NextRequest | Request): string | null {
  if (req) {
    // 1. Check cookies in NextRequest
    if ('cookies' in req && typeof (req as NextRequest).cookies?.get === 'function') {
      const cookie = (req as NextRequest).cookies.get(AUTH_COOKIE_NAME);
      if (cookie?.value) return cookie.value;
    }

    // 2. Check raw Cookie header
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_NAME}=([^;]*)`));
      if (match && match[1]) return decodeURIComponent(match[1]);
    }

    // 3. Check Authorization Bearer header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }
  }

  // 4. Check next/headers cookies() for Server Component context
  try {
    const cookieStore = cookies();
    const cookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (cookie?.value) return cookie.value;
  } catch (e) {
    // Outside of next/headers context
  }

  return null;
}

// 7. Get Authenticated User
export async function getCurrentUser(req?: NextRequest | Request): Promise<SanitizedUser | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        targetExamDate: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.fullName,
      role: user.role,
      targetExamDate: user.targetExamDate,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

// 8. Require Auth Helper
export async function requireAuth(req?: NextRequest | Request): Promise<SanitizedUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

// 9. Tenant Isolation Wrapper
export async function withTenant<T>(
  userId: string,
  operation: (userId: string) => Promise<T>
): Promise<T> {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Tenant context invalid: userId must be provided');
  }
  return operation(userId);
}
