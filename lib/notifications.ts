import { normalizePhone } from './phone'

const MOCK_MODE = process.env.MOCK_MODE !== 'false'
const SMSNATIVE_BASE_URL = 'http://www.smsnative.com/sendsms.php'

// SmsNative expects 256XXXXXXXXX (no leading +)
function toSmsNativeFormat(phone: string): string {
  return normalizePhone(phone).replace(/^\+/, '')
}

/**
 * SmsNative API Response Codes
 */
const SMSNATIVE_RESPONSE_CODES: Record<string, string> = {
  '1111': 'SUCCESS: SMS Submitted Successfully',
  '1001': 'ERROR: Invalid URL',
  '1005': 'ERROR: Invalid value in username or password field',
  '1010': 'ERROR: Account expired',
  '1015': 'ERROR: Insufficient SMS Credits',
  '1020': 'ERROR: Invalid Sender',
  '1025': 'ERROR: Invalid Schedule Time',
  '1030': 'ERROR: Account doesn\'t exist',
  '1035': 'ERROR: Character count is greater than limit',
  '1040': 'ERROR: You are not allowed to Send Unicode Messages',
  '1045': 'ERROR: Groups Not Found for Given Group Id(s)',
  '1050': 'ERROR: Other error messages',
}

async function sendSms(phone: string, message: string): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[MOCK SMS] To: ${phone}\n${message}`)
    return
  }

  const username = process.env.SMSNATIVE_USERNAME
  const password = process.env.SMSNATIVE_PASSWORD
  const senderId = process.env.SMSNATIVE_SENDERID || 'SPEEDWALLET'

  if (!username || !password) {
    console.error('SmsNative credentials not configured')
    throw new Error('SMS service not configured')
  }

  const normalizedPhone = toSmsNativeFormat(phone)

  const params = new URLSearchParams({
    user: "wazzination",
    password:"jklasdzc.",
    mobile: normalizedPhone,
    senderid: senderId,
    message,
  })

  const response = await fetch(`${SMSNATIVE_BASE_URL}?${params.toString()}`, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`SMS send failed: HTTP ${response.status}`)
  }

  const responseText = await response.text()
  const responseCode = responseText.trim().split(':')[0]

  if (responseCode !== '1111') {
    const errorMessage = SMSNATIVE_RESPONSE_CODES[responseCode] || `Unknown error: ${responseText}`
    console.error(`[SMSNATIVE] SMS failed to ${normalizedPhone}: ${errorMessage}`)
    throw new Error(`SMS send failed: ${errorMessage}`)
  }
}

export async function notifyBalanceLow(
  parentPhone: string,
  parentName: string,
  studentName: string,
  balanceUgx: number,
  thresholdUgx: number
): Promise<void> {
  const message =
    `SpeedWallets Alert: ${studentName}'s wallet balance is now ` +
    `UGX ${balanceUgx.toLocaleString()}, below your alert threshold of ` +
    `UGX ${thresholdUgx.toLocaleString()}. Please top up soon.`
  await sendSms(parentPhone, message)
}

export async function notifyStudentSelfTopUp(
  parentPhone: string,
  parentName: string,
  studentName: string,
  amountUgx: number,
  newBalanceUgx: number
): Promise<void> {
  const message =
    `SpeedWallets: ${studentName} has topped up their own wallet with ` +
    `UGX ${amountUgx.toLocaleString()}. New balance: UGX ${newBalanceUgx.toLocaleString()}.`
  await sendSms(parentPhone, message)
}

export async function notifyTopUpSuccess(
  parentPhone: string,
  studentName: string,
  amountUgx: number,
  newBalanceUgx: number
): Promise<void> {
  const message =
    `SpeedWallets: Your top-up of UGX ${amountUgx.toLocaleString()} to ` +
    `${studentName}'s wallet was successful. New balance: UGX ${newBalanceUgx.toLocaleString()}.`
  await sendSms(parentPhone, message)
}

export async function notifyParentAccountCreated(
  parentPhone: string,
  parentName: string,
  pin: string,
  loginUrl: string
): Promise<void> {
  const message =
    `Welcome to SpeedWallets, ${parentName}!\n` +
    `Your parent account has been created.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${parentPhone}\n` +
    `PIN: ${pin}\n` +
    `Please change your PIN after your first login.`
  await sendSms(parentPhone, message)
}

export async function notifyStudentRegistration(
  studentPhone: string,
  studentName: string,
  pin: string,
  loginUrl: string
): Promise<void> {
  const message =
    `Welcome to SpeedWallets, ${studentName}!\n` +
    `Your school wallet is ready.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${studentPhone}\n` +
    `PIN: ${pin}\n` +
    `Please change your PIN after your first login.`
  await sendSms(studentPhone, message)
}

export async function notifyParentOfStudentRegistration(
  parentPhone: string,
  parentName: string,
  studentName: string,
  parentPin: string | null,
  studentPin: string,
  loginUrl: string,
  studentNumber?: string
): Promise<void> {
  const pinLine = parentPin ? `Your PIN: ${parentPin}\n` : ''
  const message =
    `Hello ${parentName}, ${studentName} has been enrolled on SpeedWallets.\n` +
    `Login: ${loginUrl}\n` +
    `Phone: ${parentPhone}\n` +
    pinLine +
    `Student PIN: ${studentPin}\n` +
    `Please change your PIN after your first login.`
  await sendSms(parentPhone, message)
}
