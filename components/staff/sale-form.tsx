'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, User, CheckCircle, XCircle, ShoppingCart } from 'lucide-react'

interface StudentInfo {
  id: number
  fullName: string
  balanceUgx: number
  dailyLimitUgx: number
  dailySpent: number
  isFrozen: boolean
}

export function SaleForm() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [student, setStudent] = useState<StudentInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSearch = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setSearching(true)
    setError('')
    setStudent(null)

    try {
      const response = await fetch(`/api/staff/lookup?phone=${encodeURIComponent(phone)}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Student not found')
        return
      }

      setStudent(data.student)
    } catch {
      setError('Network error')
    } finally {
      setSearching(false)
    }
  }

  const handleSale = async () => {
    if (!student || !amount) return

    const amountNum = parseInt(amount, 10)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/staff/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.id,
          amount: amountNum,
          description: description || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Purchase failed')
        return
      }

      setSuccess(`Sale of UGX ${amountNum.toLocaleString()} processed successfully!`)
      
      // Reset form
      setPhone('')
      setStudent(null)
      setAmount('')
      setDescription('')
      
      // Refresh after a moment
      setTimeout(() => {
        router.refresh()
        setSuccess('')
      }, 2000)
    } catch {
      setError('Network error')
    } finally {
      setProcessing(false)
    }
  }

  const dailyRemaining = student
    ? Math.max(0, student.dailyLimitUgx - student.dailySpent)
    : 0

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Search Student */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Find Student
          </CardTitle>
          <CardDescription>
            Search by student phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Phone Number</FieldLabel>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="+256 700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={searching}
                />
                <Button onClick={handleSearch} disabled={searching || !phone}>
                  {searching ? <Spinner /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </Field>

            {error && !student && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Student Info & Sale */}
      <Card className={student ? '' : 'opacity-50'}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {student ? student.fullName : 'Student Details'}
          </CardTitle>
          {student && (
            <CardDescription>
              Balance: UGX {student.balanceUgx.toLocaleString()}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!student ? (
            <p className="text-center text-muted-foreground py-8">
              Search for a student to process a sale
            </p>
          ) : student.isFrozen ? (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This account is frozen and cannot make purchases.
              </AlertDescription>
            </Alert>
          ) : (
            <FieldGroup>
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Balance</span>
                  <span className="font-semibold">
                    UGX {student.balanceUgx.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Remaining</span>
                  <span className="font-semibold">
                    UGX {dailyRemaining.toLocaleString()}
                  </span>
                </div>
              </div>

              <Field>
                <FieldLabel>Sale Amount (UGX)</FieldLabel>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={processing}
                />
              </Field>

              {/* Quick amounts */}
              <div className="flex flex-wrap gap-2">
                {[1000, 2000, 3000, 5000].map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preset.toString())}
                    disabled={processing}
                  >
                    {preset.toLocaleString()}
                  </Button>
                ))}
              </div>

              <Field>
                <FieldLabel>Description (optional)</FieldLabel>
                <Input
                  type="text"
                  placeholder="e.g., Lunch, Snack"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={processing}
                />
              </Field>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-primary/10 border-primary">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-primary">{success}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSale}
                disabled={processing || !amount}
                className="w-full"
                size="lg"
              >
                {processing ? (
                  <Spinner className="mr-2" />
                ) : (
                  <ShoppingCart className="mr-2 h-4 w-4" />
                )}
                Process Sale
              </Button>
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
