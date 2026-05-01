import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

async function getAllTransactions(parentId: number) {
  const students = await prisma.account.findMany({
    where: { parentId },
    select: { id: true, fullName: true },
  })
  if (students.length === 0) return []

  const studentIds = students.map((s) => s.id)
  const nameMap = Object.fromEntries(students.map((s) => [s.id, s.fullName]))

  const transactions = await prisma.transaction.findMany({
    where: { OR: [{ fromAccountId: { in: studentIds } }, { toAccountId: { in: studentIds } }] },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return transactions.map((t) => ({
    ...t,
    studentName:
      (t.fromAccountId ? nameMap[t.fromAccountId] : null) ||
      (t.toAccountId ? nameMap[t.toAccountId] : null) ||
      'Unknown',
  }))
}

export default async function ParentHistoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const transactions = await getAllTransactions(user.userId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View all transactions across your children&apos;s wallets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
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
                    <TableHead className="text-right">Balance After</TableHead>
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
                      <TableCell>{tx.studentName}</TableCell>
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
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          tx.type === 'purchase' ? 'text-destructive' : 'text-primary'
                        }`}
                      >
                        {tx.type === 'purchase' ? '-' : '+'}UGX {tx.amountUgx.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        UGX {tx.balanceAfter.toLocaleString()}
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
