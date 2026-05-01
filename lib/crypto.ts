import { createCipheriv, createDecipheriv, randomBytes, createHash, randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

// Ensure key is 32 bytes for AES-256
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  // Hash the key to ensure it's exactly 32 bytes
  return createHash('sha256').update(ENCRYPTION_KEY).digest()
}

/**
 * Encrypts sensitive data using AES-256-GCM
 * Returns: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  
  const authTag = cipher.getAuthTag()
  
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * Decrypts data encrypted with encrypt()
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey()
  const parts = ciphertext.split(':')
  
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format')
  }
  
  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const encrypted = parts[2]
  
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

/**
 * Creates SHA-256 hash for indexed lookups (phone numbers, IDs)
 */
export function hashForLookup(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

/**
 * Creates MD5 hash for transaction integrity verification
 */
export function createTransactionHash(
  type: string,
  fromId: number | null,
  toId: number | null,
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  timestamp: string
): string {
  const data = `${type}:${fromId}:${toId}:${amount}:${balanceBefore}:${balanceAfter}:${timestamp}`
  return createHash('md5').update(data).digest('hex')
}

/**
 * Hashes PIN using bcrypt
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

/**
 * Verifies PIN against bcrypt hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

/**
 * Generates a random 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Hashes OTP for storage
 */
export function hashOTP(otp: string): string {
  return createHash('sha256').update(otp).digest('hex')
}

/**
 * Generates a random RFID code (16 uppercase hex chars)
 */
export function generateRfid(): string {
  return randomBytes(8).toString('hex').toUpperCase()
}

/**
 * Hashes an RFID code for indexed storage/lookup
 */
export function hashRfid(rfid: string): string {
  return createHash('sha256').update(rfid.toUpperCase().trim()).digest('hex')
}

/**
 * Generates a random numeric PIN of given length
 */
export function generatePin(length = 6): string {
  const max = Math.pow(10, length)
  const min = Math.pow(10, length - 1)
  return (Math.floor(Math.random() * (max - min)) + min).toString()
}
