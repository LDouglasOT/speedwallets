/**
 * Standalone script to create demo accounts directly in the database
 * Run with: node create-demo-accounts.js
 */

const fs = require('fs')
const path = require('path')

// Load .env file manually
const envPath = path.resolve(__dirname, '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '')
      process.env[key.trim()] = value.trim()
    }
  })
}

const { PrismaClient } = require('@prisma/client')
const { PrismaNeon } = require('@prisma/adapter-neon')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

// Initialize Prisma with Neon adapter (same as in lib/db.ts)
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Encryption setup (matching lib/crypto.ts)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'speedwallets-demo-encryption-key-32ch'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey() {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest()
}

function encrypt(plaintext) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const authTag = cipher.getAuthTag()

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

function hashForLookup(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex')
}

async function hashPin(pin) {
  return await bcrypt.hash(pin, 10)
}

const DEMO_ACCOUNTS = [
  { phone: '+256700000001', name: 'Demo Parent',  pin: '1234', role: 'parent' },
  { phone: '+256700000002', name: 'Demo Student', pin: '1234', role: 'student' },
  { phone: '+256700000003', name: 'Demo Staff',   pin: '1234', role: 'staff' },
  { phone: '+256700000004', name: 'Demo Admin',   pin: '1234', role: 'admin' },
]

async function createDemoAccounts() {
  console.log('Creating demo accounts...\n')

  for (const account of DEMO_ACCOUNTS) {
    const phoneHash = hashForLookup(account.phone)
    const pinHash = await hashPin(account.pin)
    const phoneEncrypted = encrypt(account.phone)

    try {
      if (account.role === 'staff' || account.role === 'admin') {
        // Create staff/admin record
        const existing = await prisma.staff.findFirst({ where: { phoneHash } })
        if (existing) {
          console.log(`✓ ${account.role.toUpperCase()} already exists: ${account.name} (${account.phone})`)
          continue
        }

        await prisma.staff.create({
          data: {
            phoneEncrypted,
            phoneHash,
            pinHash,
            fullName: account.name,
            role: account.role,
            isActive: true,
          },
        })
        console.log(`✓ Created ${account.role.toUpperCase()}: ${account.name} (${account.phone})`)
      } else {
        // Create account record (parent or student)
        const existing = await prisma.account.findUnique({ where: { phoneHash } })
        if (existing) {
          console.log(`✓ ${account.role.toUpperCase()} already exists: ${account.name} (${account.phone})`)
          continue
        }

        // For students, link to parent
        let parentId = undefined
        if (account.role === 'student') {
          const parent = await prisma.account.findUnique({
            where: { phoneHash: hashForLookup('+256700000001') },
          })
          if (parent) {
            parentId = parent.id
          }
        }

        await prisma.account.create({
          data: {
            phoneEncrypted,
            phoneHash,
            pinHash,
            fullName: account.name,
            role: account.role,
            balanceUgx: account.role === 'student' ? 50000 : 0,
            ...(parentId ? { parentId } : {}),
          },
        })
        console.log(`✓ Created ${account.role.toUpperCase()}: ${account.name} (${account.phone})`)
        if (account.role === 'student' && parentId) {
          console.log(`  Linked to parent (ID: ${parentId})`)
        }
      }
    } catch (error) {
      console.error(`✗ Error creating ${account.role}:`, error.message)
    }
  }

  console.log('\nDemo account creation complete!')
}

createDemoAccounts()
  .catch((e) => {
    console.error('Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
