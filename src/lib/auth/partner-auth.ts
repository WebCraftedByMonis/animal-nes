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

// Generate a shorter token - just 32 characters to be absolutely safe
function generateSessionToken(): string {
  // This generates exactly 32 characters
  return crypto.randomBytes(16).toString('hex');
}

// Create partner session
export async function createPartnerSession(partnerId: number) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Generate a short session token (32 chars only)
    const sessionToken = generateSessionToken();

    console.log('Generated token length:', sessionToken.length); // Should be 32

    // Clean up any existing expired sessions for this partner
    await prisma.partnerSession.deleteMany({
      where: {
        partnerId,
        expiresAt: {
          lt: new Date()
        }
      },
    });

    const session = await prisma.partnerSession.create({
      data: {
        token: sessionToken,
        partnerId,
        expiresAt,
      },
    });

    return sessionToken;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
}

// Validate partner session
export async function validatePartnerSession(token: string) {
  if (!token) return null;

  try {
    const session = await prisma.partnerSession.findUnique({
      where: { token },
      include: { partner: true },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.partnerSession.delete({ where: { id: session.id } });
      return null;
    }

    return session.partner;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Clear expired sessions
export async function clearExpiredSessions() {
  try {
    const result = await prisma.partnerSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result;
  } catch (error) {
    console.error('Clear expired sessions error:', error);
    return null;
  }
}
