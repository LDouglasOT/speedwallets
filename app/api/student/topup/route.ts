import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { collectMoney } from '@/lib/marzpay'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await prisma.account.findFirst({
      where: { id: user.userId, role: 'student' },
    })
    if (!account) {
      return NextResponse.json({ error: 'Student account not found' }, { status: 403 })
    }
    if (account.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
    }

    const { amount, phone } = await request.json()

    if (!amount || !phone) {
      return NextResponse.json({ error: 'Amount and phone are required' }, { status: 400 })
    }
    if (typeof amount !== 'number' || amount < 500 || amount > 10_000_000) {
      return NextResponse.json(
        { error: 'Amount must be between UGX 500 and UGX 10,000,000' },
        { status: 400 }
      )
    }

    const reference = randomUUID()
    const callbackUrl = `${process.env.APP_URL}/api/webhooks/marzpay`

    await prisma.payment.create({
      data: { reference, accountId: user.userId, amountUgx: amount, phone },
    })

    const result = await collectMoney({ amount, phone_number: phone, reference, callback_url: callbackUrl })

    if (result.data?.transaction?.uuid) {
      await prisma.payment.update({
        where: { reference },
        data: { marzpayUuid: result.data.transaction.uuid },
      })
    }

    return NextResponse.json({
      success: true,
      reference,
      provider: result.data?.collection?.provider ?? null,
      message: result.message,
    })
  } catch (error) {
    console.error('Student topup error:', error)
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
