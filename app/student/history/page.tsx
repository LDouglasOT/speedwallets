import { getCurrentUser } from '@/lib/auth'
import { getTransactionHistory } from '@/lib/transactions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Transaction } from '@/lib/db'

export default async function StudentHistoryPage() {
  const user = await getCurrentUser()
  if (!user) return null

  const transactions = (await getTransactionHistory(user.userId, 100)) as Transaction[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">View all your wallet transactions</p>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
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
                      <TableCell>
                        <Badge variant={tx.type === 'topup' ? 'default' : tx.type === 'refund' ? 'secondary' : 'destructive'}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.description || '-'}</TableCell>
                      <TableCell className={`text-right font-medium ${tx.type === 'purchase' ? 'text-destructive' : 'text-primary'}`}>
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
