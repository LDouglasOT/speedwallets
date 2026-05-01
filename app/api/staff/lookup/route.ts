import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashForLookup } from '@/lib/crypto'
import { getDailySpending } from '@/lib/transactions'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const phone = request.nextUrl.searchParams.get('phone')

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const phoneHash = hashForLookup(phone)

    const account = await prisma.account.findFirst({
      where: {
        phoneHash,
        role: 'student',
      },
      select: {
        id: true,
        fullName: true,
        balanceUgx: true,
        dailyLimitUgx: true,
        isFrozen: true,
      },
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    const dailySpent = await getDailySpending(account.id)

    return NextResponse.json({
      student: {
        id: account.id,
        fullName: account.fullName,
        balanceUgx: account.balanceUgx,
        dailyLimitUgx: account.dailyLimitUgx,
        dailySpent: dailySpent,
        isFrozen: account.isFrozen,
      },
    })
  } catch (error) {
    console.error('Lookup error:', error)
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500 }
    )
  }
}
