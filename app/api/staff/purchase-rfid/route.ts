import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processPurchase } from '@/lib/transactions'
import { prisma } from '@/lib/db'
import { hashRfid } from '@/lib/crypto'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { rfidCode, amount, description } = await request.json()

    if (!rfidCode || !amount) {
      return NextResponse.json({ error: 'RFID code and amount are required' }, { status: 400 })
    }

    const student = await prisma.account.findFirst({
      where: { rfidHash: hashRfid(rfidCode), role: 'student' },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found with this RFID tag' }, { status: 404 })
    }

    const result = await processPurchase(student.id, user.userId, amount, description)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      student: {
        fullName: student.fullName,
        photoUrl: student.photoUrl,
        balanceUgx: student.balanceUgx - amount,
      },
    })
  } catch (error) {
    console.error('RFID purchase error:', error)
    return NextResponse.json({ error: 'Purchase failed' }, { status: 500 })
  }
}
