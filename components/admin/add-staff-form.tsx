'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserPlus, CheckCircle, XCircle } from 'lucide-react'

export function AddStaffForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    if (!fullName || !phone || !pin) {
      setError('All fields are required')
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, pin, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to add staff')
        return
      }

      setSuccess(`${fullName} added successfully!`)
      setFullName('')
      setPhone('')
      setPin('')
      setRole('staff')
      router.refresh()
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add Staff
        </CardTitle>
        <CardDescription>
          Register a new staff member
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Full Name</FieldLabel>
            <Input
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel>Phone Number</FieldLabel>
            <Input
              type="tel"
              placeholder="+256 700 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel>PIN</FieldLabel>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="4-6 digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
            />
          </Field>

          <Field>
            <FieldLabel>Role</FieldLabel>
            <Select value={role} onValueChange={(v) => setRole(v as 'staff' | 'admin')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? <Spinner className="mr-2" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Add Staff Member
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
