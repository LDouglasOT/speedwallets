import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateAccount,
  authenticateStaff,
  createSession,
  setSessionCookie,
  getRedirectPath,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { phone, pin, userType } = await request.json()

    if (!phone || !pin || !userType) {
      return NextResponse.json(
        { error: 'Phone, PIN, and user type are required' },
        { status: 400 }
      )
    }

    let user: { id: number; role: string; fullName: string } | null = null

    if (userType === 'account') {
      const account = await authenticateAccount(phone, pin)
      if (account) {
        user = { id: account.id, role: account.role, fullName: account.fullName }
      }
    } else {
      const staff = await authenticateStaff(phone, pin)
      if (staff) {
        user = { id: staff.id, role: staff.role, fullName: staff.fullName }
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const token = await createSession(user.id, userType, user.role, user.fullName)
    await setSessionCookie(token)

    const redirectUrl = getRedirectPath(userType, user.role)

    return NextResponse.json({
      success: true,
      redirectUrl,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
