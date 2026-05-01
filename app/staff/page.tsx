import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShoppingCart, RotateCcw, TrendingUp, Clock } from 'lucide-react'

async function getStaffStats(staffId: number) {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [purchases, refunds] = await Promise.all([
    prisma.transaction.aggregate({
      where: { staffId, type: 'purchase', createdAt: { gte: todayStart } },
      _count: true,
      _sum: { amountUgx: true },
    }),
    prisma.transaction.aggregate({
      where: { staffId, type: 'refund', createdAt: { gte: todayStart } },
      _count: true,
      _sum: { amountUgx: true },
    }),
  ])

  return {
    purchaseCount: purchases._count,
    purchaseTotal: purchases._sum.amountUgx ?? 0,
    refundCount: refunds._count,
    refundTotal: refunds._sum.amountUgx ?? 0,
  }
}

async function getRecentTransactions(staffId: number) {
  return prisma.transaction.findMany({
    where: { staffId },
    include: { fromAccount: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })
}

export default async function StaffDashboard() {
  const user = await getCurrentUser()
  if (!user) return null

  const stats = await getStaffStats(user.userId)
  const transactions = await getRecentTransactions(user.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Good day, {user.fullName.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Process purchases and manage the canteen</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/staff/sale">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-primary-foreground">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">New Sale</p>
                <p className="text-sm text-muted-foreground">Process a student purchase</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/staff/refunds">
          <Card className="cursor-pointer hover:border-primary transition-colors h-full">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-accent-foreground">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold">Process Refund</p>
                <p className="text-sm text-muted-foreground">Refund a student purchase</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales Today</CardDescription>
            <CardTitle className="text-2xl">{stats.purchaseCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sales Total</CardDescription>
            <CardTitle className="text-2xl text-primary">
              UGX {stats.purchaseTotal.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Refunds Today</CardDescription>
            <CardTitle className="text-2xl">{stats.refundCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Refunds Total</CardDescription>
            <CardTitle className="text-2xl text-destructive">
              UGX {stats.refundTotal.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions today. Start by processing a sale!
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {tx.fromAccount?.fullName || 'Unknown Student'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.type === 'purchase' ? 'Sale' : 'Refund'} -{' '}
                      {new Date(tx.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${
                      tx.type === 'purchase' ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {tx.type === 'purchase' ? '+' : '-'}UGX {tx.amountUgx.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
