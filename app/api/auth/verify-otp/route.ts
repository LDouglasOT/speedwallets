import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp'

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

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
