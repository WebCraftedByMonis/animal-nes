import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' // adjust path if needed

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  const history = await prisma.historyForm.findUnique({
    where: { id },
  })

  if (!history) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(history)
}
