'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, CheckCircle, XCircle, Phone, Clock, Bookmark, X } from 'lucide-react'

interface SavedPhone { id: number; phone: string; label: string | null }

const PRESET_AMOUNTS = [5000, 10000, 20000, 50000]
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 3 * 60 * 1000

type Step = 'form' | 'pending' | 'success' | 'failed'

export function TopupForm() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState<Step>('form')
  const [provider, setProvider] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [savedPhones, setSavedPhones] = useState<SavedPhone[]>([])
  const [showSavePrompt, setShowSavePrompt] = useState(false)
  const [saveLabel, setSaveLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const referenceRef = useRef<string | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/accounts/phones')
      .then((r) => r.json())
      .then((d) => setSavedPhones(d.phones ?? []))
      .catch(() => {})
  }, [])

  const stopPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
  }

  useEffect(() => () => stopPolling(), [])

  const startPolling = (reference: string) => {
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status?reference=${reference}`)
        const data = await res.json()
        if (data.status === 'completed') {
          stopPolling()
          setStep('success')
          const isAlreadySaved = savedPhones.some((p) => p.phone === phone)
          if (!isAlreadySaved) setShowSavePrompt(true)
          router.refresh()
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          stopPolling()
          setStep('failed')
          setError(data.status === 'cancelled' ? 'Payment was cancelled.' : 'Payment failed. Please try again.')
        }
      } catch { /* keep polling on network error */ }
    }, POLL_INTERVAL_MS)

    timeoutTimerRef.current = setTimeout(() => {
      stopPolling()
      setStep('failed')
      setError('Payment timed out. If you approved the prompt, your balance will update shortly.')
    }, POLL_TIMEOUT_MS)
  }

  const handleSubmit = async () => {
    const numAmount = Number(amount)
    if (!numAmount || numAmount < 500) { setError('Minimum top-up is UGX 500'); return }
    if (!phone || phone.length < 10) { setError('Enter a valid phone number'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/student/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, phone }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to initiate payment'); return }
      referenceRef.current = data.reference
      setProvider(data.provider)
      setStep('pending')
      startPolling(data.reference)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePhone = async () => {
    setSaving(true)
    try {
      await fetch('/api/accounts/phones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, label: saveLabel || null }),
      })
      setSavedPhones((prev) => [...prev, { id: Date.now(), phone, label: saveLabel || null }])
      setShowSavePrompt(false)
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  const handleDeletePhone = async (id: number) => {
    await fetch(`/api/accounts/phones?id=${id}`, { method: 'DELETE' })
    setSavedPhones((prev) => prev.filter((p) => p.id !== id))
  }

  const handleReset = () => {
    stopPolling()
    setStep('form')
    setAmount('')
    setPhone('')
    setProvider(null)
    setError('')
    setShowSavePrompt(false)
    setSaveLabel('')
    referenceRef.current = null
  }

  if (step === 'pending') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 animate-pulse text-primary" />
            Waiting for Payment
          </CardTitle>
          <CardDescription>Approve the prompt on your phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-primary/10 p-4 text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              A {provider ?? 'mobile money'} USSD prompt has been sent to
            </p>
            <p className="font-mono font-semibold">{phone}</p>
            <p className="text-sm text-muted-foreground">
              for <span className="font-semibold text-foreground">UGX {Number(amount).toLocaleString()}</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>Checking status…</span>
          </div>
          <Button variant="outline" className="w-full" onClick={handleReset}>Cancel</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'success') {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <p className="font-semibold text-lg">Top-up Successful!</p>
            <p className="text-sm text-muted-foreground">
              UGX {Number(amount).toLocaleString()} has been added to your wallet.
            </p>
          </div>
          {showSavePrompt && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Save this number for next time?
              </p>
              <Input
                placeholder="Label (e.g. My MTN)"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={handleSavePhone} disabled={saving}>
                  {saving ? <Spinner className="mr-1" /> : null} Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSavePrompt(false)}>Skip</Button>
              </div>
            </div>
          )}
          <Button className="w-full" onClick={handleReset}>Top Up Again</Button>
        </CardContent>
      </Card>
    )
  }

  if (step === 'failed') {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-destructive shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
          <Button className="w-full" onClick={handleReset}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Top Up Wallet
        </CardTitle>
        <CardDescription>Add money via MTN or Airtel Mobile Money</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Amount (UGX)</FieldLabel>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  variant={Number(amount) === preset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAmount(String(preset))}
                  disabled={loading}
                >
                  {(preset / 1000).toFixed(0)}k
                </Button>
              ))}
            </div>
            <Input
              type="number"
              placeholder="Or enter custom amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              min={500}
            />
          </Field>

          <Field>
            <FieldLabel className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5" /> Mobile Money Number
            </FieldLabel>
            {savedPhones.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {savedPhones.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                    <button
                      className="hover:text-primary"
                      onClick={() => setPhone(sp.phone)}
                    >
                      {sp.label ?? sp.phone}
                    </button>
                    <button
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePhone(sp.id)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Input
              type="tel"
              placeholder="+256 700 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              MTN (077x, 078x) or Airtel (070x–075x)
            </p>
          </Field>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button onClick={handleSubmit} disabled={loading || !amount || !phone} className="w-full">
            {loading ? <Spinner className="mr-2" /> : <Plus className="mr-2 h-4 w-4" />}
            Top Up
          </Button>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
