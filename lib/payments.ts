import { prisma } from './db'
import { topUpSelf, topUpStudent } from './transactions'
import { decrypt } from './crypto'
import { notifyStudentSelfTopUp, notifyTopUpSuccess } from './notifications'

interface PaymentRecord {
  reference: string
  accountId: number
  beneficiaryId: number | null
  amountUgx: number
  paymentType: string
}

/**
 * Credits a wallet after MarzPay confirms payment and sends parent notification.
 * Used by the status polling endpoint, webhook handler, and cron job.
 * Notification balance is read AFTER the credit so it's always accurate.
 */
export async function creditPayment(payment: PaymentRecord): Promise<void> {
  if (payment.paymentType === 'self_topup') {
    await topUpSelf(payment.accountId, payment.amountUgx, 'Mobile money top-up')
    await notifySelfTopUp(payment.accountId, payment.amountUgx)
  } else if (payment.paymentType === 'parent_topup' && payment.beneficiaryId) {
    await topUpStudent(
      payment.accountId,
      payment.beneficiaryId,
      payment.amountUgx,
      'Top-up from parent via MarzPay'
    )
    await notifyParentTopUp(payment.accountId, payment.beneficiaryId, payment.amountUgx)
  }
}

async function notifySelfTopUp(studentId: number, amountUgx: number) {
  try {
    // Fetch AFTER credit so balanceUgx reflects the new balance
    const student = await prisma.account.findUnique({ where: { id: studentId } })
    if (!student?.parentId) return
    const parent = await prisma.account.findUnique({ where: { id: student.parentId } })
    if (!parent) return
    await notifyStudentSelfTopUp(
      decrypt(parent.phoneEncrypted),
      parent.fullName,
      student.fullName,
      amountUgx,
      student.balanceUgx
    )
  } catch (err) {
    console.error('Self top-up notification error:', err)
  }
}

async function notifyParentTopUp(parentId: number, studentId: number, amountUgx: number) {
  try {
    const parent = await prisma.account.findUnique({ where: { id: parentId } })
    // Fetch AFTER credit so balanceUgx reflects the new balance
    const student = await prisma.account.findUnique({ where: { id: studentId } })
    if (!parent || !student) return
    await notifyTopUpSuccess(
      decrypt(parent.phoneEncrypted),
      student.fullName,
      amountUgx,
      student.balanceUgx
    )
  } catch (err) {
    console.error('Parent top-up notification error:', err)
  }
}
