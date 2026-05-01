import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { processPurchase } from '@/lib/transactions'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, amount, description } = await request.json()

    if (!studentId || !amount) {
      return NextResponse.json(
        { error: 'Student ID and amount are required' },
        { status: 400 }
      )
    }

    const result = await processPurchase(
      studentId,
      user.userId,
      amount,
      description
    )

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error) {
    console.error('Purchase error:', error)
    return NextResponse.json(
      { error: 'Purchase failed' },
      { status: 500 }
    )
  }
}
