import { prisma } from './db'
import { hashForLookup, generateOTP, hashOTP } from './crypto'
import { normalizePhone } from './phone'

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

// Mock mode for development - logs OTP to console
const MOCK_MODE = process.env.MOCK_MODE !== 'false'

/**
 * Sends OTP via SMS (mock mode logs to console)
 */
export async function sendOTP(
  phone: string,
  purpose: 'login' | 'reset_pin'
): Promise<{ success: boolean; message: string }> {
  const phoneHash = hashForLookup(phone)
  const otp = generateOTP()
  const otpHash = hashOTP(otp)
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  
  await prisma.oTPCode.updateMany({
    where: { phoneHash, usedAt: null },
    data: { usedAt: new Date() },
  })
  
  await prisma.oTPCode.create({
    data: {
      phoneHash,
      codeHash: otpHash,
      purpose,
      expiresAt,
    },
  })
  
  if (MOCK_MODE) {
    console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`)
    return { success: true, message: 'OTP sent successfully' }
  }
  
   try {
     // Keep message plain text (no special emojis or curly quotes)
     const message = `Your SpeedWallets verification code is: ${otp}`
     
     // SMSNative expects format: 256740123456 (no + prefix)
     const normalizedPhone = normalizePhone(phone).replace(/^\+/, '')
     
     const baseUrl = 'http://www.smsnative.com/sendsms.php'
     const params = new URLSearchParams({
       user: 'wazzination', 
       password: 'jklasdzc.',
       mobile: normalizedPhone,
       senderid: process.env.SMSNATIVE_SENDERID || 'SPEEDWALLET',
       message: message,
     })

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      method: 'GET'
    })
    
    const resultText = await response.text()
    console.log('SMSNative API response:', response.status, resultText)

    if (!response.ok || resultText.includes('ERROR')) {
      console.error('SMSNative API error:', response.status, resultText)
      return { success: false, message: 'Failed to send SMS' }
    }
    
    return { success: true, message: 'OTP sent successfully' }
  } catch (error) {
    console.error('SMS sending error:', error)
    return { success: false, message: 'Failed to send SMS' }
  }
}

/**
 * Verifies OTP code
 */
export async function verifyOTP(
  phone: string,
  code: string,
  purpose: 'login' | 'reset_pin'
): Promise<{ valid: boolean; message: string }> {
  const phoneHash = hashForLookup(phone)
  const codeHash = hashOTP(code)
  
  // Find valid OTP
  const otp = await prisma.oTPCode.findFirst({
    where: {
      phoneHash,
      purpose,
      usedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
  
  if (!otp) {
    return { valid: false, message: 'No valid OTP found. Please request a new one.' }
  }
  
  // Check attempts
  if (otp.attempts >= MAX_ATTEMPTS) {
    await prisma.oTPCode.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    })
    return { valid: false, message: 'Maximum attempts exceeded. Please request a new OTP.' }
  }
  
  // Increment attempts
  await prisma.oTPCode.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  })
  
  // Verify code
  if (otp.codeHash !== codeHash) {
    return { valid: false, message: 'Invalid OTP code.' }
  }
  
  // Mark as used
  await prisma.oTPCode.update({
    where: { id: otp.id },
    data: { usedAt: new Date() },
  })
  
  return { valid: true, message: 'OTP verified successfully.' }
}