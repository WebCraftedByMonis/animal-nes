import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validateAdminSession } from '@/lib/auth/admin-auth';

// PUT update admin (username or password)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    // Await the params object first
    const { id: adminId } = await params;
    
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentAdmin = await validateAdminSession(token);
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, password } = await request.json();

    // Prepare update data
    const updateData: any = {};
    
    if (username) {
      // Check if new username is already taken
      const existing = await prisma.admin.findFirst({
        where: {
          username,
          NOT: { id: adminId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
      
      updateData.username = username;
    }

    if (password) {
      updateData.password = await hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No data to update' },
        { status: 400 }
      );
    }

    // Update admin
    const admin = await prisma.admin.update({
      where: { id: adminId },
      data: updateData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If admin changed their own password, invalidate their sessions
    if (password && currentAdmin.id === adminId) {
      await prisma.adminSession.deleteMany({
        where: {
          adminId: adminId,
          NOT: { token },
        },
      });
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
// DELETE admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    // Await the params object first
    const { id: adminId } = await params;
    
    const token = request.cookies.get('admin-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentAdmin = await validateAdminSession(token);
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prevent self-deletion
    if (currentAdmin.id === adminId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account while logged in' },
        { status: 400 }
      );
    }

    // Check if this is the last admin
    const adminCount = await prisma.admin.count();
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin account' },
        { status: 400 }
      );
    }

    // Delete admin (sessions will be cascade deleted)
    await prisma.admin.delete({
      where: { id: adminId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}