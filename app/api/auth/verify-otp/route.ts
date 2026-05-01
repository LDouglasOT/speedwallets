import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp'
import { prisma } from '@/lib/db'
import { hashForLookup } from '@/lib/crypto'
import { createSession, setSessionCookie, getRedirectPath } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { phone, otp, userType } = await request.json()

    if (!phone || !otp || !userType) {
      return NextResponse.json(
        { error: 'Phone, OTP, and user type are required' },
        { status: 400 }
      )
    }

    const result = await verifyOTP(phone, otp, 'login')

    if (!result.valid) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    // OTP verified successfully, now create session
    const phoneHash = hashForLookup(phone)
    
    let user: { id: number; role: string; fullName: string } | null = null

    if (userType === 'account') {
      const account = await prisma.account.findUnique({
        where: { phoneHash },
      })
      if (account) {
        user = { id: account.id, role: account.role, fullName: account.fullName }
      }
    } else {
      const staff = await prisma.staff.findFirst({
        where: {
          phoneHash,
          isActive: true,
        },
      })
      if (staff) {
        user = { id: staff.id, role: staff.role, fullName: staff.fullName }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const token = await createSession(user.id, userType, user.role, user.fullName)
    await setSessionCookie(token)

    const redirectUrl = getRedirectPath(userType, user.role)

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      redirectUrl,
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
