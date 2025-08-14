import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validateAdminSession } from '@/lib/auth/admin-auth';

// GET all admins
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentAdmin = await validateAdminSession(token);
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST create new admin
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentAdmin = await validateAdminSession(token);
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await prisma.admin.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password and create admin
    const hashedPassword = await hashPassword(password);
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}