'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { CreditCard, Zap } from 'lucide-react'

interface StudentWithPhone {
  id: number
  fullName: string
  balanceUgx: number
  isFrozen: boolean
  phone: string
}

interface QuickTopUpProps {
  students: StudentWithPhone[]
}

export function QuickTopUp({ students }: QuickTopUpProps) {
  const router = useRouter()
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleTopUp = async () => {
    if (!selectedStudent || !amount) {
      setError('Please select a student and enter an amount')
      return
    }
    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/parent/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: parseInt(selectedStudent, 10), amount: amountNum }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Top-up failed')
        return
      }
      setSuccess(`Successfully added UGX ${amountNum.toLocaleString()}`)
      setAmount('')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (students.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          Quick Top-Up
        </CardTitle>
        <CardDescription>Quickly add funds to any student wallet</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Student</FieldLabel>
            <Select value={selectedStudent} onValueChange={setSelectedStudent}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter((s) => !s.isFrozen)
                  .map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()}>
                      {student.fullName} (UGX {student.balanceUgx.toLocaleString()})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>
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
          {success && <p className="text-sm text-primary">{success}</p>}
          <Button
            onClick={handleTopUp}
            disabled={loading || !selectedStudent || !amount}
            className="w-full"
          >
            {loading ? <Spinner className="mr-2" /> : <CreditCard className="mr-2 h-4 w-4" />}
            Top Up
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
