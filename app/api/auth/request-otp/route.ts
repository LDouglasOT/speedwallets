import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashForLookup } from '@/lib/crypto'
import { sendOTP } from '@/lib/otp'

export async function POST(request: NextRequest) {
  try {
    const { phone, userType } = await request.json()

    if (!phone || !userType) {
      return NextResponse.json(
        { error: 'Phone and user type are required' },
        { status: 400 }
      )
    }

    const phoneHash = hashForLookup(phone)

    // Check if user exists
    if (userType === 'account') {
      const account = await prisma.account.findUnique({
        where: { phoneHash },
      })
      if (!account) {
        return NextResponse.json(
          { error: 'Account not found. Please contact your school administrator.' },
          { status: 404 }
        )
      }
    } else {
      const staff = await prisma.staff.findFirst({
        where: {
          phoneHash,
          isActive: true,
        },
      })
      if (!staff) {
        return NextResponse.json(
          { error: 'Staff account not found or inactive.' },
          { status: 404 }
        )
      }
    }

    // Send OTP
    const result = await sendOTP(phone, 'login')

    if (!result.success) {
      console.log(result.message)
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }

    // Extract mock OTP if present
    const mockMatch = result.message.match(/mock mode: (\d{6})/)
    const mockOtp = mockMatch ? mockMatch[1] : undefined

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      mockOtp, // Only present in mock mode
    })
  } catch (error) {
    console.error('Request OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
