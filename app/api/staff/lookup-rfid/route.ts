import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rfidCode = request.nextUrl.searchParams.get('rfid')

    if (!rfidCode) {
      return NextResponse.json({ error: 'RFID code is required' }, { status: 400 })
    }
    

    const account = await prisma.account.findFirst({
      where: { studentNumber:rfidCode, role: 'student' },
      select: {
        id: true,
        fullName: true,
        photoUrl: true,
        balanceUgx: true,
        dailyLimitUgx: true,
        isFrozen: true,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Student not found with this RFID tag' }, { status: 404 })
    }

    return NextResponse.json({ student: account })
  } catch (error) {
    console.error('RFID lookup error:', error)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  }
}
