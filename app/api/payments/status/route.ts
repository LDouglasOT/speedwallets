import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTransactionStatus } from '@/lib/marzpay'
import { creditPayment } from '@/lib/payments'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reference = request.nextUrl.searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Reference required' }, { status: 400 })
    }

    const payment = await prisma.payment.findFirst({
      where: { reference, accountId: user.userId },
    })
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    if (payment.status !== 'pending') {
      return NextResponse.json({ status: payment.status, amountUgx: payment.amountUgx })
    }

    // Poll MarzPay directly when we have their UUID
    if (payment.marzpayUuid) {
      const remote = await getTransactionStatus(payment.marzpayUuid)

      if (remote && remote.status !== 'pending') {
        // Atomic claim — only one concurrent caller wins
        const claimed = await prisma.payment.updateMany({
          where: { reference, status: 'pending' },
          data: { status: remote.status },
        })

        if (claimed.count > 0 && remote.status === 'completed') {
          await creditPayment(payment)
        }

        return NextResponse.json({ status: remote.status, amountUgx: payment.amountUgx })
      }
    }

    return NextResponse.json({ status: 'pending', amountUgx: payment.amountUgx })
  } catch (error) {
    console.error('Payment status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
