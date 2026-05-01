import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'account' || user.role !== 'parent') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { studentId, freeze } = await request.json()

    if (studentId === undefined || freeze === undefined) {
      return NextResponse.json(
        { error: 'Student ID and freeze status are required' },
        { status: 400 }
      )
    }

    // Verify student belongs to parent
    const student = await prisma.account.findFirst({
      where: {
        id: studentId,
        parentId: user.userId,
        role: 'student',
      },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found or not linked to your account' },
        { status: 404 }
      )
    }

    // Update freeze status
    await prisma.account.update({
      where: { id: studentId },
      data: {
        isFrozen: freeze,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: freeze ? 'Account frozen' : 'Account unfrozen',
    })
  } catch (error) {
    console.error('Freeze error:', error)
    return NextResponse.json(
      { error: 'Failed to update freeze status' },
      { status: 500 }
    )
  }
}
