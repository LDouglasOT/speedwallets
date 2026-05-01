const MARZPAY_BASE_URL = 'https://wallet.wearemarz.com/api/v1'

/**
 * Normalizes a Ugandan phone number to E.164 format (+256XXXXXXXXX).
 * Accepts: 0712345678, 712345678, 256712345678, +256712345678
 */
export function normalizeUgandaPhone(raw: string): string {
  const digits = raw.replace(/[\s\-().+]/g, '')
  if (digits.startsWith('256')) return `+${digits}`
  if (digits.startsWith('0')) return `+256${digits.slice(1)}`
  if (digits.length === 9) return `+256${digits}`
  return `+${digits}`
}

export interface MarzPayTransactionStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  uuid: string
  reference: string
}

export async function getTransactionStatus(uuid: string): Promise<MarzPayTransactionStatus | null> {
  try {
    const response = await fetch(`${MARZPAY_BASE_URL}/collections/${uuid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${process.env.MARZPAY_BASE64}`,
      },
    })
    if (!response.ok) return null
    const data = await response.json()
    const tx = data?.data?.transaction ?? data?.transaction ?? data
    return {
      status: tx?.status ?? 'pending',
      uuid: tx?.uuid ?? uuid,
      reference: tx?.reference ?? '',
    }
  } catch {
    return null
  }
}

export interface MarzPayCollectResponse {
  status: string
  message: string
  data?: {
    transaction: {
      uuid: string
      reference: string
      status: string
    }
    collection: {
      amount: number
      provider: string
    }
  }
}

export async function collectMoney(params: {
  amount: number
  phone_number: string
  reference: string
  callback_url: string
}): Promise<MarzPayCollectResponse> {
  const response = await fetch(`${MARZPAY_BASE_URL}/collect-money`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${process.env.MARZPAY_BASE64}`,
    },
    body: JSON.stringify({ ...params, phone_number: normalizeUgandaPhone(params.phone_number), country: 'UG' }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`MarzPay error ${response.status}: ${text}`)
  }

  return response.json()
}
