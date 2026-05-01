import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.userType !== 'account' || user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, threshold } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Student ID required' }, { status: 400 })
    }

    // Verify student belongs to this parent
    const student = await prisma.account.findFirst({
      where: { id: studentId, parentId: user.userId, role: 'student' },
    })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // threshold = null clears the alert
    const alertThreshold = threshold === null || threshold === '' ? null : Number(threshold)

    await prisma.account.update({
      where: { id: studentId },
      data: { alertThreshold },
    })

    return NextResponse.json({ success: true, alertThreshold })
  } catch (error) {
    console.error('Alert threshold error:', error)
    return NextResponse.json({ error: 'Failed to update threshold' }, { status: 500 })
  }
}
