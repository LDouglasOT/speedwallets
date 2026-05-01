'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, BellOff, Check } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'

interface AlertThresholdInputProps {
  studentId: number
  initialThreshold: number | null
}

export function AlertThresholdInput({ studentId, initialThreshold }: AlertThresholdInputProps) {
  const [threshold, setThreshold] = useState(initialThreshold?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/parent/alert-threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          threshold: threshold === '' ? null : Number(threshold),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
        {threshold ? (
          <Bell className="w-3.5 h-3.5 text-primary" />
        ) : (
          <BellOff className="w-3.5 h-3.5" />
        )}
        Low-balance alert threshold
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">UGX</span>
          <Input
            type="number"
            placeholder="e.g. 5000"
            value={threshold}
            onChange={(e) => { setThreshold(e.target.value); setSaved(false) }}
            className="pl-11 h-8 text-sm"
            min={0}
          />
        </div>
        <Button size="sm" className="h-8 px-3" onClick={handleSave} disabled={saving}>
          {saving ? <Spinner /> : saved ? <Check className="w-3.5 h-3.5" /> : 'Save'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {threshold
          ? `You'll be notified when balance drops below UGX ${Number(threshold).toLocaleString()}`
          : 'No alert set. Enter an amount to enable notifications.'}
      </p>
    </div>
  )
}
