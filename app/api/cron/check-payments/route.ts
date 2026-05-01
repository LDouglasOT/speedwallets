import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getTransactionStatus } from '@/lib/marzpay'
import { creditPayment } from '@/lib/payments'

// Allow Vercel Cron to run this without timing out at 10s default
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends it as a Bearer token; manual calls use ?secret=
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '')
    const query = request.nextUrl.searchParams.get('secret')
    if (bearer !== cronSecret && query !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Only check payments that are at least 90 seconds old so active UI polls win first
  const cutoff = new Date(Date.now() - 90 * 1000)

  const pending = await prisma.payment.findMany({
    where: {
      status: 'pending',
      marzpayUuid: { not: null },
      createdAt: { lt: cutoff },
    },
    orderBy: { createdAt: 'asc' },
    take: 50,
  })

  const summary = { total: pending.length, completed: 0, failed: 0, still_pending: 0, errors: 0 }

  for (const payment of pending) {
    try {
      const remote = await getTransactionStatus(payment.marzpayUuid!)

      if (!remote || remote.status === 'pending') {
        summary.still_pending++
        continue
      }

      // Atomic claim — if another process already updated this, updateMany returns 0
      const claimed = await prisma.payment.updateMany({
        where: { reference: payment.reference, status: 'pending' },
        data: { status: remote.status },
      })

      if (claimed.count === 0) continue

      if (remote.status === 'completed') {
        await creditPayment(payment)
        summary.completed++
      } else {
        summary.failed++
      }
    } catch (err) {
      console.error(`Cron: error processing payment ${payment.reference}:`, err)
      summary.errors++
    }
  }

  console.log('Cron check-payments:', summary)
  return NextResponse.json({ success: true, ...summary })
}
