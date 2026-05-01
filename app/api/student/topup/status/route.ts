import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reference = request.nextUrl.searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: { reference, accountId: user.userId },
      select: { status: true, amountUgx: true },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    return NextResponse.json({ status: payment.status, amountUgx: payment.amountUgx })
  } catch (error) {
    console.error('Topup status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
