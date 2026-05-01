'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react'

interface PendingPayment {
  id: number
  reference: string
  amountUgx: number
  phone: string
  paymentType: string
  createdAt: string
}

type ItemStatus = 'pending' | 'checking' | 'completed' | 'failed' | 'cancelled'

export function PendingPayments() {
  const router = useRouter()
  const [payments, setPayments] = useState<PendingPayment[]>([])
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({})
  const [loading, setLoading] = useState(true)
  const [recheckingAll, setRecheckingAll] = useState(false)

  useEffect(() => {
    fetch('/api/payments/pending')
      .then((r) => r.json())
      .then((d) => setPayments(d.payments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || payments.length === 0) return null

  const setStatus = (reference: string, status: ItemStatus) =>
    setStatuses((prev) => ({ ...prev, [reference]: status }))

  const recheck = async (reference: string): Promise<boolean> => {
    setStatus(reference, 'checking')
    try {
      const res = await fetch(`/api/payments/status?reference=${reference}`)
      const data = await res.json()
      const resolved = data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled'
      setStatus(reference, data.status as ItemStatus)
      if (resolved) {
        // Remove resolved payment after a short delay so user sees the result
        setTimeout(() => {
          setPayments((prev) => prev.filter((p) => p.reference !== reference))
        }, 1500)
        if (data.status === 'completed') router.refresh()
        return true
      }
    } catch {
      setStatus(reference, 'pending')
    }
    return false
  }

  const recheckAll = async () => {
    setRecheckingAll(true)
    for (const p of payments) {
      if ((statuses[p.reference] ?? 'pending') === 'pending') {
        await recheck(p.reference)
      }
    }
    setRecheckingAll(false)
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Unconfirmed Payments
            <Badge variant="secondary" className="text-xs">{payments.length}</Badge>
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={recheckAll}
            disabled={recheckingAll}
          >
            {recheckingAll ? <Spinner /> : <RefreshCw className="w-3 h-3" />}
            Recheck All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {payments.map((p) => {
          const itemStatus = statuses[p.reference] ?? 'pending'
          const isChecking = itemStatus === 'checking'
          const isCompleted = itemStatus === 'completed'
          const isFailed = itemStatus === 'failed' || itemStatus === 'cancelled'

          return (
            <div
              key={p.reference}
              className="flex items-center justify-between gap-3 rounded-lg bg-white dark:bg-card border p-3"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">UGX {p.amountUgx.toLocaleString()}</p>
                  {p.paymentType === 'parent_topup' && (
                    <Badge variant="outline" className="text-xs py-0">Parent</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">{p.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="shrink-0">
                {isCompleted && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    <CheckCircle className="w-4 h-4" /> Received
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                    <XCircle className="w-4 h-4" />
                    {itemStatus === 'cancelled' ? 'Cancelled' : 'Failed'}
                  </span>
                )}
                {!isCompleted && !isFailed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => recheck(p.reference)}
                    disabled={isChecking}
                  >
                    {isChecking ? <Spinner /> : <RefreshCw className="w-3 h-3" />}
                    Recheck
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <p className="text-xs text-muted-foreground pt-1">
          These payments were initiated but not confirmed — the device may have gone offline.
          Use <strong>Recheck</strong> to check with MarzPay, or they will be resolved automatically every 5 minutes.
        </p>
      </CardContent>
    </Card>
  )
}
