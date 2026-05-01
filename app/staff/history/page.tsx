import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default async function StaffHistoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const transactions = await prisma.transaction.findMany({
    where: { staffId: user.userId },
    include: { fromAccount: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">View all transactions you&apos;ve processed</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Transactions</CardTitle>
          <CardDescription>Showing {transactions.length} transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString()}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleTimeString()}
                        </span>
                      </TableCell>
                      <TableCell>{tx.fromAccount?.fullName || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'purchase' ? 'default' : 'secondary'}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'purchase' ? 'text-primary' : 'text-destructive'
                        }`}
                      >
                        UGX {tx.amountUgx.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
