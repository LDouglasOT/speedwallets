'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { User, Snowflake, CreditCard } from 'lucide-react'

interface StudentWithPhone {
  id: number
  fullName: string
  balanceUgx: number
  dailyLimitUgx: number
  isFrozen: boolean
  phone: string
}

interface StudentCardsProps {
  students: StudentWithPhone[]
  parentId: number
}

export function StudentCards({ students, parentId: _parentId }: StudentCardsProps) {
  const router = useRouter()
  const [freezingId, setFreezingId] = useState<number | null>(null)
  const [topUpStudent, setTopUpStudent] = useState<StudentWithPhone | null>(null)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFreezeToggle = async (studentId: number, freeze: boolean) => {
    setFreezingId(studentId)
    try {
      const response = await fetch('/api/parent/freeze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, freeze }),
      })
      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to update freeze status')
        return
      }
      router.refresh()
    } catch {
      alert('Network error')
    } finally {
      setFreezingId(null)
    }
  }

  const handleTopUp = async () => {
    if (!topUpStudent || !amount) return
    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/parent/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: topUpStudent.id, amount: amountNum }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Top-up failed')
        return
      }
      setTopUpStudent(null)
      setAmount('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No students linked</h3>
          <p className="text-muted-foreground text-sm">
            Contact your school administrator to link student accounts.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {students.map((student) => (
          <Card
            key={student.id}
            className={student.isFrozen ? 'border-blue-300 bg-blue-50/50' : ''}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{student.fullName}</CardTitle>
                  {student.isFrozen && (
                    <Badge variant="secondary" className="mt-1">
                      <Snowflake className="w-3 h-3 mr-1" />
                      Frozen
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {freezingId === student.id ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Switch
                    checked={student.isFrozen}
                    onCheckedChange={(checked) => handleFreezeToggle(student.id, checked)}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className="text-2xl font-bold text-primary">
                  UGX {student.balanceUgx.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Daily Limit</span>
                <span>UGX {student.dailyLimitUgx.toLocaleString()}</span>
              </div>
              <Button
                onClick={() => setTopUpStudent(student)}
                disabled={student.isFrozen}
                className="w-full"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Top Up
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!topUpStudent} onOpenChange={() => setTopUpStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top Up {topUpStudent?.fullName}</DialogTitle>
            <DialogDescription>
              Add funds to your child&apos;s wallet. Current balance: UGX{' '}
              {topUpStudent?.balanceUgx.toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Amount (UGX)</FieldLabel>
              <Input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={loading}
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              {[5000, 10000, 20000, 50000].map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(preset.toString())}
                >
                  {preset.toLocaleString()}
                </Button>
              ))}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTopUpStudent(null)}>
              Cancel
            </Button>
            <Button onClick={handleTopUp} disabled={loading || !amount}>
              {loading ? <Spinner className="mr-2" /> : null}
              Top Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
