// app/api/traditional-job-posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const jobPost = await prisma.traditionalJobPost.findUnique({
      where: { id },
      include: {
        image: true,
      },
    })

    if (!jobPost) {
      return NextResponse.json({ error: 'Job post not found' }, { status: 404 })
    }

    return NextResponse.json(jobPost)
  } catch (error) {
    console.error('Error fetching job post:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job post' },
      { status: 500 }
    )
  }
}