import { prisma } from './db'
import { hashForLookup, generateOTP, hashOTP } from './crypto'

const OTP_EXPIRY_MINUTES = 5
const MAX_ATTEMPTS = 3

// Mock mode for development - logs OTP to console
const MOCK_MODE = process.env.SMS_MOCK_MODE !== 'false'

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
  
  // Invalidate any existing OTPs for this phone
  await prisma.oTPCode.updateMany({
    where: {
      phoneHash,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  })
  
  // Create new OTP
  await prisma.oTPCode.create({
    data: {
      phoneHash,
      codeHash: otpHash,
      purpose,
      expiresAt,
    },
  })
  console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`)
  if (MOCK_MODE) {
    // In mock mode, log OTP to console for development
    console.log(`[MOCK SMS] OTP for ${phone}: ${otp}`)
    return { success: true, message: `OTP sent (mock mode: ${otp})` }
  }
  
  // TODO: Implement real Smsnative API integration
  // const response = await fetch('https://api.smsnative.com/send', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SMSNATIVE_API_KEY}` },
  //   body: JSON.stringify({ phone, message: `Your SpeedWallets verification code is: ${otp}` })
  // })
  
  return { success: true, message: 'OTP sent successfully' }
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
