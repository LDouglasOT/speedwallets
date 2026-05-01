import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, hashForLookup, hashPin } from '@/lib/crypto'
import { notifyParentAccountCreated } from '@/lib/notifications'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'staff' || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullName, phone, pin, idNumber } = await request.json()

    if (!fullName || !phone || !pin) {
      return NextResponse.json(
        { error: 'Name, phone, and PIN are required' },
        { status: 400 }
      )
    }

    if (pin.length < 4) {
      return NextResponse.json(
        { error: 'PIN must be at least 4 digits' },
        { status: 400 }
      )
    }

    const phoneHash = hashForLookup(phone)

    const existing = await prisma.account.findUnique({ where: { phoneHash } })
    if (existing) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    let idNumberEncrypted: string | undefined
    let idNumberHash: string | undefined

    if (idNumber) {
      idNumberHash = hashForLookup(idNumber)
      const existingId = await prisma.account.findFirst({ where: { idNumberHash } })
      if (existingId) {
        return NextResponse.json(
          { error: 'ID number already registered' },
          { status: 400 }
        )
      }
      idNumberEncrypted = encrypt(idNumber)
    }

    await prisma.account.create({
      data: {
        phoneEncrypted: encrypt(phone),
        phoneHash,
        pinHash: await hashPin(pin),
        fullName,
        role: 'parent',
        mustChangePin: true,
        ...(idNumberEncrypted && idNumberHash ? { idNumberEncrypted, idNumberHash } : {}),
      },
    })

    notifyParentAccountCreated(phone, fullName, pin, `${APP_URL}/login`).catch(() => {})

    return NextResponse.json({ success: true, message: 'Parent added successfully' })
  } catch (error) {
    console.error('Add parent error:', error)
    return NextResponse.json({ error: 'Failed to add parent' }, { status: 500 })
  }
}
