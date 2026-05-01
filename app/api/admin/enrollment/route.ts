import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, hashForLookup, hashPin, generateRfid, hashRfid } from '@/lib/crypto'
import { notifyStudentRegistration, notifyParentOfStudentRegistration } from '@/lib/notifications'
import { parse } from 'csv-parse/sync'

interface EnrollmentRow {
  parent_name: string
  parent_phone: string
  parent_id_number?: string
  parent_pin: string
  student_name: string
  student_phone: string
  student_pin: string
  daily_limit: string
  rfid_code?: string
}

const APP_URL = process.env.APP_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user || user.userType !== 'staff' || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const csvText = await file.text()

    let records: EnrollmentRow[]
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    } catch {
      return NextResponse.json({ error: 'Invalid CSV format' }, { status: 400 })
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty' }, { status: 400 })
    }

    const result = {
      success: true,
      parentsCreated: 0,
      parentsUpdated: 0,
      studentsCreated: 0,
      studentsUpdated: 0,
      errors: [] as string[],
    }

    const parentCache: Record<string, { id: number; isNew: boolean; pin: string }> = {}
    const loginUrl = `${APP_URL}/login`

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2

      try {
        if (!row.parent_name || !row.parent_phone || !row.parent_pin) {
          result.errors.push(`Row ${rowNum}: Missing parent information`)
          continue
        }
        if (!row.student_name || !row.student_phone || !row.student_pin) {
          result.errors.push(`Row ${rowNum}: Missing student information`)
          continue
        }

        const parentPhoneHash = hashForLookup(row.parent_phone)
        const studentPhoneHash = hashForLookup(row.student_phone)
        const dailyLimit = parseInt(row.daily_limit, 10) || 50000

        // Resolve parent
        let cachedParent = parentCache[parentPhoneHash]

        if (!cachedParent) {
          const existingParent = await prisma.account.findUnique({ where: { phoneHash: parentPhoneHash } })

          if (existingParent) {
            cachedParent = { id: existingParent.id, isNew: false, pin: row.parent_pin }
            result.parentsUpdated++
          } else {
            const parentIdEncrypted = row.parent_id_number ? encrypt(row.parent_id_number) : null
            const parentIdHash = row.parent_id_number ? hashForLookup(row.parent_id_number) : null

            const newParent = await prisma.account.create({
              data: {
                phoneEncrypted: encrypt(row.parent_phone),
                phoneHash: parentPhoneHash,
                idNumberEncrypted: parentIdEncrypted,
                idNumberHash: parentIdHash,
                pinHash: await hashPin(row.parent_pin),
                fullName: row.parent_name,
                role: 'parent',
                mustChangePin: true,
              },
            })

            cachedParent = { id: newParent.id, isNew: true, pin: row.parent_pin }
            result.parentsCreated++

            notifyParentOfStudentRegistration(
              row.parent_phone,
              row.parent_name,
              row.student_name,
              row.parent_pin,
              row.student_pin,
              loginUrl
            ).catch(() => {})
          }

          parentCache[parentPhoneHash] = cachedParent
        }

        // Resolve student
        const existingStudent = await prisma.account.findFirst({
          where: { phoneHash: studentPhoneHash, role: 'student' },
        })

        if (existingStudent) {
          await prisma.account.update({
            where: { id: existingStudent.id },
            data: { parentId: cachedParent.id, dailyLimitUgx: dailyLimit, updatedAt: new Date() },
          })
          result.studentsUpdated++
        } else {
          const rawRfid = row.rfid_code || generateRfid()
          const rfidHashValue = hashRfid(rawRfid)

          await prisma.account.create({
            data: {
              phoneEncrypted: encrypt(row.student_phone),
              phoneHash: studentPhoneHash,
              pinHash: await hashPin(row.student_pin),
              fullName: row.student_name,
              role: 'student',
              parentId: cachedParent.id,
              dailyLimitUgx: dailyLimit,
              rfidHash: rfidHashValue,
              mustChangePin: true,
            },
          })
          result.studentsCreated++

          notifyStudentRegistration(
            row.student_phone,
            row.student_name,
            row.student_pin,
            rawRfid,
            loginUrl
          ).catch(() => {})

          // Notify parent about this student (only if parent was already existing — new parents got notified above)
          if (!cachedParent.isNew) {
            notifyParentOfStudentRegistration(
              row.parent_phone,
              row.parent_name,
              row.student_name,
              null,
              row.student_pin,
              loginUrl
            ).catch(() => {})
          }
        }
      } catch (error) {
        result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json({ error: 'Enrollment failed' }, { status: 500 })
  }
}
