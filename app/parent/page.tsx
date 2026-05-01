import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/crypto'
import { StudentCards } from '@/components/parent/student-cards'
import { QuickTopUp } from '@/components/parent/quick-topup'
import { RecentTransactions } from '@/components/parent/recent-transactions'
import { PendingPayments } from '@/components/shared/pending-payments'

async function getStudents(parentId: number) {
  const students = await prisma.account.findMany({
    where: { parentId, role: 'student' },
    orderBy: { fullName: 'asc' },
  })
  return students.map((s) => ({ ...s, phone: decrypt(s.phoneEncrypted) }))
}

async function getRecentTransactions(parentId: number) {
  const studentIds = (
    await prisma.account.findMany({ where: { parentId }, select: { id: true } })
  ).map((s) => s.id)

  if (studentIds.length === 0) return []

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromAccountId: { in: studentIds } }, { toAccountId: { in: studentIds } }] },
    include: {
      fromAccount: { select: { fullName: true } },
      toAccount: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  return transactions.map((t) => ({
    ...t,
    studentName: t.fromAccount?.fullName || t.toAccount?.fullName || 'Unknown',
  }))
}

export default async function ParentDashboard() {
  const user = await getCurrentUser()
  if (!user) return null

  const students = await getStudents(user.userId)
  const transactions = await getRecentTransactions(user.userId)
  const totalBalance = students.reduce((sum, s) => sum + s.balanceUgx, 0)
  const todaySpending = transactions
    .filter(
      (t) =>
        t.type === 'purchase' &&
        new Date(t.createdAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum, t) => sum + t.amountUgx, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user.fullName.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Manage your children&apos;s school wallets</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Total Balance</p>
          <p className="text-3xl font-bold text-primary">UGX {totalBalance.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Students</p>
          <p className="text-3xl font-bold">{students.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">Today&apos;s Spending</p>
          <p className="text-3xl font-bold">UGX {todaySpending.toLocaleString()}</p>
        </div>
      </div>

      <PendingPayments />

      <StudentCards students={students} parentId={user.userId} />

      <div className="grid gap-6 md:grid-cols-2">
        <QuickTopUp students={students} />
        <RecentTransactions transactions={transactions} />
      </div>
    </div>
  )
}
