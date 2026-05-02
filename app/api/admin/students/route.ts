import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    console.log(
      "/////////////////////////////////////////////////////"
    )
    // Verify admin access\
    console.log(user)
    
   if (!user || user.userType !== 'staff') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

    console.log("/////////////////////////////////////////////////////")

    const students = await prisma.account.findMany({
      where: { role: 'student' },
      select: {
        id: true,
        fullName: true,
        balanceUgx: true,
        dailyLimitUgx: true,
        isFrozen: true,
        studentNumber: true,
        photoUrl: true,
        createdAt: true,
        
        parent: {
          select: {
            id: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    console.log(students)

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Fetch students error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}