import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

async function getDailyReport() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, type: true, amountUgx: true },
    orderBy: { createdAt: 'desc' },
  })

  const grouped: Record<string, Record<string, { count: number; total: number }>> = {}
  for (const t of transactions) {
    const date = t.createdAt.toISOString().split('T')[0]
    if (!grouped[date]) grouped[date] = {}
    if (!grouped[date][t.type]) grouped[date][t.type] = { count: 0, total: 0 }
    grouped[date][t.type].count++
    grouped[date][t.type].total += t.amountUgx
  }
  return grouped
}

async function getStaffPerformance() {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const staff = await prisma.staff.findMany({
    where: { isActive: true },
    include: {
      transactions: {
        where: { createdAt: { gte: todayStart } },
        select: { type: true, amountUgx: true },
      },
    },
  })

  return staff
    .map((s) => {
      const purchases = s.transactions.filter((t) => t.type === 'purchase')
      const refunds = s.transactions.filter((t) => t.type === 'refund')
      return {
        fullName: s.fullName,
        purchases: purchases.length,
        purchaseTotal: purchases.reduce((sum, t) => sum + t.amountUgx, 0),
        refunds: refunds.length,
        refundTotal: refunds.reduce((sum, t) => sum + t.amountUgx, 0),
      }
    })
    .sort((a, b) => b.purchaseTotal - a.purchaseTotal)
}

async function getAllTransactions() {
  return prisma.transaction.findMany({
    include: {
      fromAccount: { select: { fullName: true } },
      staff: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export default async function ReportsPage() {
  const [reportByDate, staffPerformance, transactions] = await Promise.all([
    getDailyReport(),
    getStaffPerformance(),
    getAllTransactions(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground">System analytics and transaction reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff Performance Today</CardTitle>
          <CardDescription>Sales and refunds by staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Sales Total</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead className="text-right">Refund Total</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerformance.map((s, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-right">{s.purchases}</TableCell>
                    <TableCell className="text-right text-primary">
                      UGX {s.purchaseTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{s.refunds}</TableCell>
                    <TableCell className="text-right text-destructive">
                      UGX {s.refundTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      UGX {(s.purchaseTotal - s.refundTotal).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Summary (Last 30 Days)</CardTitle>
          <CardDescription>Transaction totals by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Top-ups</TableHead>
                  <TableHead className="text-right">Purchases</TableHead>
                  <TableHead className="text-right">Refunds</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(reportByDate).map(([date, data]) => (
                  <TableRow key={date}>
                    <TableCell className="font-medium">
                      {new Date(date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {data.topup?.count || 0} (UGX {(data.topup?.total || 0).toLocaleString()})
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      {data.purchase?.count || 0} (UGX {(data.purchase?.total || 0).toLocaleString()})
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {data.refund?.count || 0} (UGX {(data.refund?.total || 0).toLocaleString()})
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      UGX {((data.purchase?.total || 0) - (data.refund?.total || 0)).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Last 100 transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{tx.fromAccount?.fullName || '-'}</TableCell>
                    <TableCell>{tx.staff?.fullName || 'System'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.type === 'topup'
                            ? 'default'
                            : tx.type === 'refund'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {tx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      UGX {tx.amountUgx.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
