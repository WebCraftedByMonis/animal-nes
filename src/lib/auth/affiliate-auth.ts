import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// 32-character hex session token (same shape as partner-auth.ts)
function generateSessionToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Create affiliate session
export async function createAffiliateSession(affiliatePartnerId: number) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

  const sessionToken = generateSessionToken();

  // Clean up any existing expired sessions for this affiliate
  await prisma.affiliatePartnerSession.deleteMany({
    where: {
      affiliatePartnerId,
      expiresAt: { lt: new Date() },
    },
  });

  await prisma.affiliatePartnerSession.create({
    data: {
      token: sessionToken,
      affiliatePartnerId,
      expiresAt,
    },
  });

  return sessionToken;
}

// Validate affiliate session
export async function validateAffiliateSession(token: string) {
  if (!token) return null;

  try {
    const session = await prisma.affiliatePartnerSession.findUnique({
      where: { token },
      include: { affiliatePartner: true },
    });

    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.affiliatePartnerSession.delete({ where: { id: session.id } });
      return null;
    }

    return session.affiliatePartner;
  } catch (error) {
    console.error('[affiliate-auth] Session validation error:', error);
    return null;
  }
}

// Generate a unique human-readable referral code, e.g. AW-7F3K9Q2A
export async function generateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `AW-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
    const existing = await prisma.affiliatePartner.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error('Failed to generate a unique referral code');
}

// Clear expired sessions
export async function clearExpiredAffiliateSessions() {
  try {
    return await prisma.affiliatePartnerSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch (error) {
    console.error('[affiliate-auth] Clear expired sessions error:', error);
    return null;
  }
}
