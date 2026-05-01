import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPin, hashPin } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPin, newPin } = await request.json()

    if (!currentPin || !newPin) {
      return NextResponse.json({ error: 'Current PIN and new PIN are required' }, { status: 400 })
    }

    if (newPin.length < 4) {
      return NextResponse.json({ error: 'New PIN must be at least 4 digits' }, { status: 400 })
    }

    if (!/^\d+$/.test(newPin)) {
      return NextResponse.json({ error: 'PIN must contain digits only' }, { status: 400 })
    }

    const account = await prisma.account.findUnique({ where: { id: user.userId } })
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const valid = await verifyPin(currentPin, account.pinHash)
    if (!valid) {
      return NextResponse.json({ error: 'Current PIN is incorrect' }, { status: 400 })
    }

    if (currentPin === newPin) {
      return NextResponse.json({ error: 'New PIN must be different from current PIN' }, { status: 400 })
    }

    await prisma.account.update({
      where: { id: user.userId },
      data: { pinHash: await hashPin(newPin), mustChangePin: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change PIN error:', error)
    return NextResponse.json({ error: 'Failed to change PIN' }, { status: 500 })
  }
}
