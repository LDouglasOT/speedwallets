import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, hashForLookup, hashPin } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff' || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullName, phone, pin, role } = await request.json()

    if (!fullName || !phone || !pin || !role) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!['staff', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const phoneHash = hashForLookup(phone)

    // Check if phone already exists
    const existing = await prisma.staff.findUnique({
      where: { phoneHash },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    const phoneEncrypted = encrypt(phone)
    const pinHash = await hashPin(pin)

    await prisma.staff.create({
      data: {
        phoneEncrypted,
        phoneHash,
        pinHash,
        fullName,
        role: role as 'staff' | 'admin',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Staff member added successfully',
    })
  } catch (error) {
    console.error('Add staff error:', error)
    return NextResponse.json(
      { error: 'Failed to add staff member' },
      { status: 500 }
    )
  }
}
