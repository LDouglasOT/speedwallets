import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashForLookup, encrypt, hashPin } from '@/lib/crypto'
import { createSession, setSessionCookie, getRedirectPath } from '@/lib/auth'

const DEMO_ACCOUNTS = {
  parent:  { phone: '+256700000001', name: 'Demo Parent',  pin: '1234', role: 'parent'  as const },
  student: { phone: '+256700000002', name: 'Demo Student', pin: '1234', role: 'student' as const },
  staff:   { phone: '+256700000003', name: 'Demo Staff',   pin: '1234', role: 'staff'   as const },
  admin:   { phone: '+256700000004', name: 'Demo Admin',   pin: '1234', role: 'admin'   as const },
}

export async function POST(request: NextRequest) {
  try {
    const { demo } = await request.json()
    const config = DEMO_ACCOUNTS[demo as keyof typeof DEMO_ACCOUNTS]

    if (!config) {
      return NextResponse.json({ error: 'Invalid demo type' }, { status: 400 })
    }

    const phoneHash = hashForLookup(config.phone)
    const isStaff = config.role === 'staff' || config.role === 'admin'

    if (isStaff) {
      let staff = await prisma.staff.findFirst({ where: { phoneHash } })
      if (!staff) {
        staff = await prisma.staff.create({
          data: {
            phoneEncrypted: encrypt(config.phone),
            phoneHash,
            pinHash: await hashPin(config.pin),
            fullName: config.name,
            role: config.role,
            
            isActive: true,
          },
        })
      }
      const token = await createSession(staff.id, 'staff', staff.role, staff.fullName)
      await setSessionCookie(token)
      return NextResponse.json({ redirectUrl: getRedirectPath('staff', staff.role) })
    } else {
      let account = await prisma.account.findUnique({ where: { phoneHash } })
      if (!account) {
        let parentId: number | undefined
        if (config.role === 'student') {
          const parent = await prisma.account.findUnique({
            where: { phoneHash: hashForLookup('+256700000001') },
          })
          if (parent) parentId = parent.id
        }
        account = await prisma.account.create({
          data: {
            phoneEncrypted: encrypt(config.phone),
            phoneHash,
            studentNumber: config.role === 'student' ? 'S123456' : undefined,
            pinHash: await hashPin(config.pin),
            fullName: config.name,
            role: config.role,
            balanceUgx: config.role === 'student' ? 50000 : 0,
            ...(parentId ? { parentId } : {}),
          },
        })
      }
      const token = await createSession(account.id, 'account', account.role, account.fullName)
      await setSessionCookie(token)
      return NextResponse.json({ redirectUrl: getRedirectPath('account', account.role) })
    }
  } catch (error) {
    console.error('Demo login error:', error)
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 })
  }
}
