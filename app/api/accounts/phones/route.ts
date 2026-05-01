import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const phones = await prisma.savedPhone.findMany({
      where: { accountId: user.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, phone: true, label: true },
    })

    return NextResponse.json({ phones })
  } catch (error) {
    console.error('Get saved phones error:', error)
    return NextResponse.json({ error: 'Failed to fetch phones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone, label } = await request.json()
    if (!phone) {
      return NextResponse.json({ error: 'Phone is required' }, { status: 400 })
    }

    const saved = await prisma.savedPhone.upsert({
      where: { accountId_phone: { accountId: user.userId, phone } },
      update: { label: label ?? null },
      create: { accountId: user.userId, phone, label: label ?? null },
    })

    return NextResponse.json({ success: true, phone: saved })
  } catch (error) {
    console.error('Save phone error:', error)
    return NextResponse.json({ error: 'Failed to save phone' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = Number(request.nextUrl.searchParams.get('id'))
    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    await prisma.savedPhone.deleteMany({
      where: { id, accountId: user.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete phone error:', error)
    return NextResponse.json({ error: 'Failed to delete phone' }, { status: 500 })
  }
}
