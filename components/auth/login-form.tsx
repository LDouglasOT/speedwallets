'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { User, Users, ShieldCheck } from 'lucide-react'

type UserType = 'account' | 'staff'

export function LoginForm() {
  const router = useRouter()
  const [userType, setUserType] = useState<UserType>('account')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp' | 'pin'>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mockOtp, setMockOtp] = useState('')

  const handleRequestOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, userType }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send OTP')
        return
      }

      // In mock mode, show the OTP
      if (data.mockOtp) {
        setMockOtp(data.mockOtp)
      }

      setStep('otp')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, userType }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid OTP')
        return
      }

      setStep('pin')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!pin || pin.length < 4) {
      setError('Please enter your PIN')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin, userType }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        return
      }

      router.push(data.redirectUrl)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demo: 'parent' | 'student' | 'staff' | 'admin') => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Demo login failed')
        return
      }
      router.push(data.redirectUrl)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'pin') {
      setStep('otp')
      setPin('')
    } else if (step === 'otp') {
      setStep('phone')
      setOtp('')
      setMockOtp('')
    }
    setError('')
  }

  return (
    <>
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Sign In</CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your phone number to get started'}
          {step === 'otp' && 'Enter the verification code sent to your phone'}
          {step === 'pin' && 'Enter your PIN to complete sign in'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={userType}
          onValueChange={(v) => setUserType(v as UserType)}
          className="mb-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account" className="gap-2">
              <Users className="w-4 h-4" />
              Parent/Student
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Staff
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <FieldGroup>
          {step === 'phone' && (
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
          )}

          {step === 'otp' && (
            <Field>
              <FieldLabel>Verification Code</FieldLabel>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="text-center text-2xl tracking-widest"
              />
              {mockOtp && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  Mock OTP: <span className="font-mono font-bold text-primary">{mockOtp}</span>
                </p>
              )}
            </Field>
          )}

          {step === 'pin' && (
            <Field>
              <FieldLabel>PIN</FieldLabel>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter your PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                disabled={loading}
                className="text-center text-2xl tracking-widest"
              />
            </Field>
          )}

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2 pt-2">
            {step !== 'phone' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="flex-1"
              >
                Back
              </Button>
            )}
            
            {step === 'phone' && (
              <Button
                onClick={handleRequestOTP}
                disabled={loading || !phone}
                className="w-full"
              >
                {loading ? <Spinner className="mr-2" /> : null}
                Send Code
              </Button>
            )}

            {step === 'otp' && (
              <Button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1"
              >
                {loading ? <Spinner className="mr-2" /> : null}
                Verify
              </Button>
            )}

            {step === 'pin' && (
              <Button
                onClick={handleLogin}
                disabled={loading || pin.length < 4}
                className="flex-1"
              >
                {loading ? <Spinner className="mr-2" /> : null}
                Sign In
              </Button>
            )}
          </div>
        </FieldGroup>
      </CardContent>
    </Card>

    <div className="mt-6">
      <p className="text-xs text-muted-foreground text-center mb-3">Try a demo account</p>
      <div className="grid grid-cols-2 gap-2">
        {(['parent', 'student', 'staff', 'admin'] as const).map((role) => (
          <Button
            key={role}
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleDemoLogin(role)}
            className="capitalize"
          >
            {loading ? <Spinner className="mr-2" /> : null}
            {role}
          </Button>
        ))}
      </div>
    </div>
    </>
  )
}
