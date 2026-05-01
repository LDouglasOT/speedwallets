import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserCog, Wallet, TrendingUp, ArrowRight, Upload } from 'lucide-react'

async function getSystemStats() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [parentCount, studentCount, staffCount, totalLiquidity, todayTransactions, todaySales] = await Promise.all([
    prisma.account.count({
      where: { role: 'parent' },
    }),
    prisma.account.count({
      where: { role: 'student' },
    }),
    prisma.staff.count({
      where: { isActive: true },
    }),
    prisma.account.aggregate({
      where: { role: 'student' },
      _sum: { balanceUgx: true },
    }),
    prisma.transaction.count({
      where: {
        createdAt: {
          gte: todayStart,
        },
      },
    }),
    prisma.transaction.aggregate({
      where: {
        type: 'purchase',
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: { amountUgx: true },
    }),
  ])

  return {
    parent_count: parentCount,
    student_count: studentCount,
    staff_count: staffCount,
    total_liquidity: totalLiquidity._sum.balanceUgx || 0,
    today_transactions: todayTransactions,
    today_sales: todaySales._sum.amountUgx || 0,
  }
}

async function getRecentTransactions() {
  const transactions = await prisma.transaction.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      fromAccount: {
        select: { fullName: true },
      },
      toAccount: {
        select: { fullName: true },
      },
      staff: {
        select: { fullName: true },
      },
    },
  })

  return transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount_ugx: tx.amountUgx,
    created_at: tx.createdAt,
    student_name: tx.fromAccount?.fullName || tx.toAccount?.fullName || 'Unknown',
    staff_name: tx.staff?.fullName || 'System',
  }))
}

export default async function AdminDashboard() {
  const stats = await getSystemStats()
  const recentTransactions = await getRecentTransactions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and management
          </p>
        </div>
        <Link href="/admin/enrollment">
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Enrollment
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Parents</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.parent_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.student_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.staff_count}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Liquidity</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              UGX {Number(stats.total_liquidity).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today_transactions}</div>
            <p className="text-xs text-muted-foreground">
              Total sales: UGX {Number(stats.today_sales).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/admin/accounts">
              <Button variant="outline" size="sm">
                Manage Accounts
              </Button>
            </Link>
            <Link href="/admin/staff">
              <Button variant="outline" size="sm">
                Manage Staff
              </Button>
            </Link>
            <Link href="/admin/reports">
              <Button variant="outline" size="sm">
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system transactions</CardDescription>
          </div>
          <Link href="/admin/reports">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {tx.student_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.type} by {tx.staff_name || 'System'} -{' '}
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${
                      tx.type === 'purchase'
                        ? 'text-primary'
                        : tx.type === 'refund'
                        ? 'text-destructive'
                        : 'text-accent-foreground'
                    }`}
                  >
                    UGX {tx.amount_ugx.toLocaleString()}
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
