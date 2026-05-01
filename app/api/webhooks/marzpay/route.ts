import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { creditPayment } from '@/lib/payments'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const status: string = body.status ?? body.data?.transaction?.status
    const reference: string = body.data?.transaction?.reference ?? body.reference

    if (!reference) {
      return NextResponse.json({ received: true })
    }

    const payment = await prisma.payment.findUnique({ where: { reference } })
    if (!payment || payment.status !== 'pending') {
      return NextResponse.json({ received: true })
    }

    // Atomic claim — prevents double-credit if polling and webhook arrive simultaneously
    const claimed = await prisma.payment.updateMany({
      where: { reference, status: 'pending' },
      data: { status: status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'cancelled' },
    })

    if (claimed.count > 0 && status === 'completed') {
      await creditPayment(payment)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('MarzPay webhook error:', error)
    return NextResponse.json({ received: true })
  }
}
