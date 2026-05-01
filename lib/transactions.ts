import { prisma } from './db'
import { createTransactionHash } from './crypto'

/**
 * Performs a top-up from parent to student wallet
 * Uses pessimistic locking to ensure atomic balance updates
 */
export async function topUpStudent(
  parentId: number,
  studentId: number,
  amountUgx: number,
  description?: string
): Promise<{ success: boolean; transaction?: unknown; error?: string }> {
  if (amountUgx <= 0) {
    return { success: false, error: 'Amount must be greater than 0' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get parent account with lock
      const parent = await tx.account.findFirst({
        where: {
          id: parentId,
          role: 'parent',
        },
        lock: { mode: 'FOR_UPDATE' },
      })

      if (!parent) {
        throw new Error('Parent account not found')
      }

      // Get student account with lock
      const student = await tx.account.findFirst({
        where: {
          id: studentId,
          role: 'student',
          parentId,
        },
        lock: { mode: 'FOR_UPDATE' },
      })

      if (!student) {
        throw new Error('Student account not found or not linked to parent')
      }

      if (student.isFrozen) {
        throw new Error('Student account is frozen')
      }

      // Calculate new balance
      const studentBalanceBefore = student.balanceUgx
      const studentBalanceAfter = studentBalanceBefore + amountUgx
      const timestamp = new Date()

      // Create integrity hash
      const integrityHash = createTransactionHash(
        'topup',
        parentId,
        studentId,
        amountUgx,
        studentBalanceBefore,
        studentBalanceAfter,
        timestamp.toISOString()
      )

      // Update student balance
      const updatedStudent = await tx.account.update({
        where: { id: studentId },
        data: {
          balanceUgx: studentBalanceAfter,
          updatedAt: timestamp,
        },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: 'topup',
          fromAccountId: parentId,
          toAccountId: studentId,
          amountUgx,
          balanceBefore: studentBalanceBefore,
          balanceAfter: studentBalanceAfter,
          description: description || 'Top-up from parent',
          integrityHash,
          createdAt: timestamp,
        },
      })

      return { transaction, updatedStudent }
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    console.error('Top-up error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' }
  }
}

/**
 * Processes a purchase by staff from student wallet
 * Uses pessimistic locking and checks daily limits
 */
export async function processPurchase(
  studentId: number,
  staffId: number,
  amountUgx: number,
  description?: string
): Promise<{ success: boolean; transaction?: unknown; error?: string }> {
  if (amountUgx <= 0) {
    return { success: false, error: 'Amount must be greater than 0' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get student account with lock
      const student = await tx.account.findFirst({
        where: {
          id: studentId,
          role: 'student',
        },
        lock: { mode: 'FOR_UPDATE' },
      })

      if (!student) {
        throw new Error('Student account not found')
      }

      if (student.isFrozen) {
        throw new Error('Account is frozen')
      }

      if (student.balanceUgx < amountUgx) {
        throw new Error('Insufficient balance')
      }

      // Check daily spending limit
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const dailySpending = await tx.transaction.aggregate({
        where: {
          toAccountId: studentId,
          type: 'purchase',
          createdAt: {
            gte: todayStart,
          },
        },
        _sum: {
          amountUgx: true,
        },
      })

      const currentDailySpent = dailySpending._sum.amountUgx || 0
      if (currentDailySpent + amountUgx > student.dailyLimitUgx) {
        throw new Error(`Daily limit exceeded. Remaining: UGX ${student.dailyLimitUgx - currentDailySpent}`)
      }

      // Calculate new balance
      const balanceBefore = student.balanceUgx
      const balanceAfter = balanceBefore - amountUgx
      const timestamp = new Date()

      // Create integrity hash
      const integrityHash = createTransactionHash(
        'purchase',
        studentId,
        null,
        amountUgx,
        balanceBefore,
        balanceAfter,
        timestamp.toISOString()
      )

      // Update balance
      await tx.account.update({
        where: { id: studentId },
        data: {
          balanceUgx: balanceAfter,
          updatedAt: timestamp,
        },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: 'purchase',
          fromAccountId: studentId,
          staffId,
          amountUgx,
          balanceBefore,
          balanceAfter,
          description: description || 'Canteen purchase',
          integrityHash,
          createdAt: timestamp,
        },
      })

      return { transaction }
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    console.error('Purchase error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' }
  }
}

/**
 * Processes a refund to student wallet
 */
export async function processRefund(
  studentId: number,
  staffId: number,
  amountUgx: number,
  description?: string
): Promise<{ success: boolean; transaction?: unknown; error?: string }> {
  if (amountUgx <= 0) {
    return { success: false, error: 'Amount must be greater than 0' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Get student account with lock
      const student = await tx.account.findFirst({
        where: {
          id: studentId,
          role: 'student',
        },
        lock: { mode: 'FOR_UPDATE' },
      })

      if (!student) {
        throw new Error('Student account not found')
      }

      // Calculate new balance
      const balanceBefore = student.balanceUgx
      const balanceAfter = balanceBefore + amountUgx
      const timestamp = new Date()

      // Create integrity hash
      const integrityHash = createTransactionHash(
        'refund',
        null,
        studentId,
        amountUgx,
        balanceBefore,
        balanceAfter,
        timestamp.toISOString()
      )

      // Update balance
      await tx.account.update({
        where: { id: studentId },
        data: {
          balanceUgx: balanceAfter,
          updatedAt: timestamp,
        },
      })

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          type: 'refund',
          toAccountId: studentId,
          staffId,
          amountUgx,
          balanceBefore,
          balanceAfter,
          description: description || 'Refund',
          integrityHash,
          createdAt: timestamp,
        },
      })

      return { transaction }
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    console.error('Refund error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Transaction failed' }
  }
}

/**
 * Gets transaction history for an account
 */
export async function getTransactionHistory(
  accountId: number,
  limit: number = 50,
  offset: number = 0
): Promise<unknown[]> {
  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromAccountId: accountId },
        { toAccountId: accountId },
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  })

  return transactions
}

/**
 * Gets daily spending total for a student
 */
export async function getDailySpending(studentId: number): Promise<number> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const result = await prisma.transaction.aggregate({
    where: {
      fromAccountId: studentId,
      type: 'purchase',
      createdAt: {
        gte: todayStart,
      },
    },
    _sum: {
      amountUgx: true,
    },
  })

  return result._sum.amountUgx || 0
}
