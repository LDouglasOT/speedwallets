import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, hashForLookup, hashPin } from '@/lib/crypto'
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
}

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

    // Cache for parent IDs by phone hash (for sibling handling)
    const parentCache: Record<string, number> = {}

    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNum = i + 2 // Account for header row and 0-indexing

      try {
        // Validate required fields
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

        // Check/create parent
        let parentId = parentCache[parentPhoneHash]

        if (!parentId) {
          // Check if parent exists in database
          const existingParent = await prisma.account.findUnique({
            where: {
              phoneHash: parentPhoneHash,
            },
          })

          if (existingParent) {
            parentId = existingParent.id
            parentCache[parentPhoneHash] = parentId
            result.parentsUpdated++
          } else {
            // Create new parent
            const parentPhoneEncrypted = encrypt(row.parent_phone)
            const parentPinHash = await hashPin(row.parent_pin)
            const parentIdEncrypted = row.parent_id_number ? encrypt(row.parent_id_number) : null
            const parentIdHash = row.parent_id_number ? hashForLookup(row.parent_id_number) : null

            const newParent = await prisma.account.create({
              data: {
                phoneEncrypted: parentPhoneEncrypted,
                phoneHash: parentPhoneHash,
                idNumberEncrypted: parentIdEncrypted,
                idNumberHash: parentIdHash,
                pinHash: parentPinHash,
                fullName: row.parent_name,
                role: 'parent',
              },
            })

            parentId = newParent.id
            parentCache[parentPhoneHash] = parentId
            result.parentsCreated++
          }
        }

        // Check/create student
        const existingStudent = await prisma.account.findFirst({
          where: {
            phoneHash: studentPhoneHash,
            role: 'student',
          },
        })

        if (existingStudent) {
          // Update existing student
          await prisma.account.update({
            where: { id: existingStudent.id },
            data: {
              parentId,
              dailyLimitUgx: dailyLimit,
              updatedAt: new Date(),
            },
          })
          result.studentsUpdated++
        } else {
          // Create new student
          const studentPhoneEncrypted = encrypt(row.student_phone)
          const studentPinHash = await hashPin(row.student_pin)

          await prisma.account.create({
            data: {
              phoneEncrypted: studentPhoneEncrypted,
              phoneHash: studentPhoneHash,
              pinHash: studentPinHash,
              fullName: row.student_name,
              role: 'student',
              parentId,
              dailyLimitUgx: dailyLimit,
            },
          })
          result.studentsCreated++
        }
      } catch (error) {
        result.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Enrollment error:', error)
    return NextResponse.json(
      { error: 'Enrollment failed' },
      { status: 500 }
    )
  }
}
