import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { topUpStudent } from '@/lib/transactions'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'account' || user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, amount } = await request.json()

    if (!studentId || !amount) {
      return NextResponse.json(
        { error: 'Student ID and amount are required' },
        { status: 400 }
      )
    }

    const result = await topUpStudent(user.userId, studentId, amount)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error) {
    console.error('Top-up error:', error)
    return NextResponse.json(
      { error: 'Top-up failed' },
      { status: 500 }
    )
  }
}
