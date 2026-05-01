import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payments = await prisma.payment.findMany({
      where: { accountId: user.userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reference: true,
        amountUgx: true,
        phone: true,
        paymentType: true,
        marzpayUuid: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('Pending payments error:', error)
    return NextResponse.json({ error: 'Failed to fetch pending payments' }, { status: 500 })
  }
}
