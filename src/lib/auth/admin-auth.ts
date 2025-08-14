import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma'; // Adjust this import path to your prisma instance
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

// Create admin session
export async function createAdminSession(adminId: string, username: string) {
  try {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    // Generate a short session token (32 chars only)
    const sessionToken = generateSessionToken();
    
    console.log('Generated token length:', sessionToken.length); // Should be 32

    // Clean up any existing expired sessions for this admin
    await prisma.adminSession.deleteMany({
      where: { 
        adminId,
        expiresAt: {
          lt: new Date()
        }
      },
    });

    const session = await prisma.adminSession.create({
      data: {
        token: sessionToken,
        adminId,
        expiresAt,
      },
    });

    return sessionToken;
  } catch (error) {
    console.error('Session creation error:', error);
    throw error;
  }
}

// Validate admin session
export async function validateAdminSession(token: string) {
  if (!token) return null;

  try {
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await prisma.adminSession.delete({ where: { id: session.id } });
      return null;
    }

    return session.admin;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

// Clear expired sessions
export async function clearExpiredSessions() {
  try {
    const result = await prisma.adminSession.deleteMany({
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