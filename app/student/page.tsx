import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getDailySpending } from '@/lib/transactions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Wallet, TrendingUp, Clock, Snowflake } from 'lucide-react'

export default async function StudentDashboard() {
  const user = await getCurrentUser()
  if (!user) return null

  const account = await prisma.account.findFirst({
    where: { id: user.userId, role: 'student' },
  })
  if (!account) return null

  const dailySpent = await getDailySpending(user.userId)
  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromAccountId: user.userId }, { toAccountId: user.userId }] },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const dailyRemaining = Math.max(0, account.dailyLimitUgx - dailySpent)
  const dailyProgress = (dailySpent / account.dailyLimitUgx) * 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {user.fullName.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">Here&apos;s your wallet overview</p>
      </div>

      {account.isFrozen && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <Snowflake className="w-5 h-5 text-blue-500" />
          <div>
            <p className="font-medium text-blue-900">Account Frozen</p>
            <p className="text-sm text-blue-700">
              Your account has been temporarily frozen by your parent. Contact them to unfreeze.
            </p>
          </div>
        </div>
      )}

      <Card className="border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              <span className="font-medium">Available Balance</span>
            </div>
            {account.isFrozen && (
              <Badge variant="secondary" className="bg-white/20">Frozen</Badge>
            )}
          </div>
          <p className="text-4xl font-bold mb-6">UGX {account.balanceUgx.toLocaleString()}</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm opacity-90">
              <span>Today&apos;s Spending</span>
              <span>
                UGX {dailySpent.toLocaleString()} / {account.dailyLimitUgx.toLocaleString()}
              </span>
            </div>
            <Progress value={dailyProgress} className="h-2 bg-white/20" />
            <p className="text-sm opacity-75">UGX {dailyRemaining.toLocaleString()} remaining today</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardDescription>Daily Limit</CardDescription>
              <CardTitle>UGX {account.dailyLimitUgx.toLocaleString()}</CardTitle>
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 pb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
              <Clock className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <CardDescription>Spent Today</CardDescription>
              <CardTitle>UGX {dailySpent.toLocaleString()}</CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your latest wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{tx.description || tx.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p
                    className={`font-semibold ${
                      tx.type === 'purchase' ? 'text-destructive' : 'text-primary'
                    }`}
                  >
                    {tx.type === 'purchase' ? '-' : '+'}UGX {tx.amountUgx.toLocaleString()}
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
