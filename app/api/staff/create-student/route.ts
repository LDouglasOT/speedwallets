import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, hashForLookup, hashPin, generateRfid, hashRfid } from '@/lib/crypto'
import { notifyStudentRegistration, notifyParentOfStudentRegistration } from '@/lib/notifications'

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff' || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      studentName,
      studentPhone,
      studentPin,
      dailyLimit = 50000,
      rfidCode,
      photoUrl,
      parentName,
      parentPhone,
      parentPin,
      parentIdNumber,
    } = await request.json()

    if (!studentName || !studentPhone || !studentPin || !parentName || !parentPhone || !parentPin) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const studentPhoneHash = hashForLookup(studentPhone)
    const existingStudent = await prisma.account.findUnique({ where: { phoneHash: studentPhoneHash } })
    if (existingStudent) {
      return NextResponse.json({ error: 'Student phone already registered' }, { status: 400 })
    }

    // Resolve RFID: use provided or auto-generate
    const rawRfid = rfidCode || generateRfid()
    const rfidHashValue = hashRfid(rawRfid)

    const existingRfid = await prisma.account.findUnique({ where: { rfidHash: rfidHashValue } })
    if (existingRfid) {
      return NextResponse.json({ error: 'RFID tag already registered' }, { status: 400 })
    }

    const parentPhoneHash = hashForLookup(parentPhone)
    let parent = await prisma.account.findUnique({ where: { phoneHash: parentPhoneHash } })
    let isNewParent = false

    if (!parent) {
      const parentIdHash = parentIdNumber ? hashForLookup(parentIdNumber) : null
      const parentIdEncrypted = parentIdNumber ? encrypt(parentIdNumber) : null

      parent = await prisma.account.create({
        data: {
          phoneEncrypted: encrypt(parentPhone),
          phoneHash: parentPhoneHash,
          idNumberEncrypted: parentIdEncrypted,
          idNumberHash: parentIdHash,
          pinHash: await hashPin(parentPin),
          fullName: parentName,
          role: 'parent',
          mustChangePin: true,
        },
      })
      isNewParent = true
    }

    const student = await prisma.account.create({
      data: {
        phoneEncrypted: encrypt(studentPhone),
        phoneHash: studentPhoneHash,
        pinHash: await hashPin(studentPin),
        fullName: studentName,
        role: 'student',
        parentId: parent.id,
        dailyLimitUgx: dailyLimit,
        rfidHash: rfidHashValue,
        photoUrl,
        mustChangePin: true,
      },
    })

    // Send SMS non-blocking
    const loginUrl = `${APP_URL}/login`
    notifyStudentRegistration(studentPhone, studentName, studentPin, rawRfid, loginUrl).catch(() => {})
    notifyParentOfStudentRegistration(
      parentPhone,
      parentName,
      studentName,
      isNewParent ? parentPin : null,
      studentPin,
      loginUrl
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Student and parent created successfully',
      student: {
        id: student.id,
        fullName: student.fullName,
        phone: studentPhone,
        rfidCode: rawRfid,
        photoUrl: student.photoUrl,
        balanceUgx: student.balanceUgx,
        dailyLimitUgx: student.dailyLimitUgx,
      },
      parent: {
        id: parent.id,
        fullName: parent.fullName,
        phone: parentPhone,
      },
    })
  } catch (error) {
    console.error('Create student error:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
