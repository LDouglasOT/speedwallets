'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowUpRight, ArrowDownRight, RotateCcw, Clock } from 'lucide-react'

interface Transaction {
  id: number
  type: 'topup' | 'purchase' | 'refund'
  amountUgx: number
  createdAt: Date
  studentName?: string
  description?: string | null
}

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'topup':    return <ArrowDownRight className="w-4 h-4 text-primary" />
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-destructive" />
      case 'refund':   return <RotateCcw className="w-4 h-4 text-accent" />
      default:         return null
    }
  }

  const getBadge = (type: string) => {
    switch (type) {
      case 'topup':    return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Top Up</Badge>
      case 'purchase': return <Badge variant="destructive">Purchase</Badge>
      case 'refund':   return <Badge className="bg-accent/10 text-accent-foreground hover:bg-accent/20">Refund</Badge>
      default:         return null
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest transactions across all student wallets</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No transactions yet</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{tx.studentName || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description || tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'purchase' ? 'text-destructive' : 'text-primary'}`}>
                      {tx.type === 'purchase' ? '-' : '+'}UGX {tx.amountUgx.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(tx.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

