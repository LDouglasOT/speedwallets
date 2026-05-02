import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './db'
import { hashForLookup, verifyPin } from './crypto'
import { createHash } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'development-secret-key-change-in-production')
const TOKEN_EXPIRY_SECONDS = 24 * 60 * 60 // 24 hours in seconds
const COOKIE_NAME = 'speedwallets_session'

export interface JWTPayload {
  userId: number
  userType: 'account' | 'staff'
  role: string
  fullName: string
  exp?: number
  iat?: number
}

/**
 * Creates a JWT token and stores session in database
 * All time calculations are done in UTC for consistency with JWT standards
 * The JWT exp claim is always UTC (seconds since epoch)
 * For display in EAT (UTC+3), add 3 hours to UTC times
 */
export async function createSession(
  userId: number,
  userType: 'account' | 'staff',
  role: string,
  fullName: string
): Promise<string> {
  // Calculate expiration time as UTC timestamp (24 hours from now)
  // Date.now() returns UTC milliseconds since epoch
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_SECONDS * 1000)
  
const token = await new SignJWT({ userId, userType, role, fullName })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime(`${TOKEN_EXPIRY_SECONDS}s`) // ✅
  .sign(JWT_SECRET)
  
  const tokenHash = createHash('sha256').update(token).digest('hex')
  
  // Store session in database with UTC expiration time
  // Prisma will store this as UTC timestamptz
  if (userType === 'account') {
    await prisma.session.create({
      data: {
        tokenHash,
        accountId: userId,
        userType: 'account',
        expiresAt,
      },
    })
  } else {
    await prisma.session.create({
      data: {
        tokenHash,
        staffId: userId,
        userType: 'staff',
        expiresAt,
      },
    })
  }
  
  return token
}

/**
 * Verifies JWT token and checks session validity
 * All time comparisons are done in UTC for consistency
 */
export async function verifySession(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    console.log('JWT payload:', payload)
    const tokenHash = createHash('sha256').update(token).digest('hex')

    const session = await prisma.session.findFirst({
      where: {
        tokenHash,
        expiresAt: {
          gt: new Date(), // Current UTC time
        },
      },
    })
    console.log('session token from db:',session)
    if (!session) {
      return null
    }
    
    return payload as unknown as JWTPayload
  } catch(e) {
    console.log('JWT verification error:', e)
    return null
  }
}

/**
 * Gets current user from session cookie
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  console.log('Session token from cookie:', token)

  if (!token) {
    return null
  }
  const verified = await verifySession(token)
  console.log('verified token is',verified)

  return verified
}

  /**
   * Sets session cookie
   * maxAge is set in seconds (24 hours) - this is timezone-independent
   */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY_SECONDS, // matches JWT expiration
    path: '/',
  })
}

/**
 * Clears session cookie and invalidates session
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  
  if (token) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await prisma.session.deleteMany({
      where: { tokenHash },
    })
  }
  
  cookieStore.delete(COOKIE_NAME)
}

/**
 * Authenticates account (parent/student) by phone and PIN
 */
export async function authenticateAccount(
  phone: string,
  pin: string
): Promise<{ id: number; role: string; fullName: string; phoneHash: string } | null> {
  const phoneHash = hashForLookup(phone)
  
  const account = await prisma.account.findUnique({
    where: { phoneHash },
  })
  
  if (!account) {
    return null
  }
  
  const isValid = await verifyPin(pin, account.pinHash)
  
  if (!isValid) {
    return null
  }
  
  return {
    id: account.id,
    role: account.role,
    fullName: account.fullName,
    phoneHash: account.phoneHash,
  }
}

/**
 * Authenticates staff by phone and PIN
 */
export async function authenticateStaff(
  phone: string,
  pin: string
): Promise<{ id: number; role: string; fullName: string } | null> {
  const phoneHash = hashForLookup(phone)
  console.log('Authenticating staff:', phoneHash)
  const staff = await prisma.staff.findFirst({
    where: {
      phoneHash,
      isActive: true,
    },
  })
  console.log('Found staff:', staff)

  if (!staff) {
    return null
  }
  
  const isValid = await verifyPin(pin, staff.pinHash)
  
  if (!isValid) {
    return null
  }
  
  return {
    id: staff.id,
    role: staff.role,
    fullName: staff.fullName,
  }
}

/**
 * Gets redirect path based on user role
 */
export function getRedirectPath(userType: 'account' | 'staff', role: string): string {
  if (userType === 'staff') {
    return role === 'admin' ? '/admin' : '/staff'
  }
  return role === 'parent' ? '/parent' : '/student'
}
