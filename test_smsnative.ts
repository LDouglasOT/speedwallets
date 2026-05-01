/**
 * Test script for SmsNative API integration
 * Run with: npx tsx test_smsnative.ts
 */

import { normalizeUgandaPhone } from './lib/notifications'

// Test phone number normalization
console.log('Testing phone number normalization:\n')

const testCases = [
  { input: '0750123456', expected: '256750123456' },
  { input: '750123456', expected: '256750123456' },
  { input: '256750123456', expected: '256750123456' },
  { input: '+256750123456', expected: '256750123456' },
  { input: '0712345678', expected: '256712345678' },
  { input: '+256-750-123-456', expected: '256750123456' },
  { input: '256 750 123 456', expected: '256750123456' },
]

let passed = 0
let failed = 0

testCases.forEach(({ input, expected }) => {
  const result = normalizeUgandaPhone(input)
  const status = result === expected ? '✓' : '✗'
  if (result === expected) {
    passed++
  } else {
    failed++
  }
  console.log(`${status} Input: "${input}" → Output: "${result}" (expected: "${expected}")`)
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)

// Test environment variables
console.log('\nEnvironment variables check:')
console.log(`- SMSNATIVE_USERNAME: ${process.env.SMSNATIVE_USERNAME ? '✓ Set' : '✗ Not set'}`)
console.log(`- SMSNATIVE_PASSWORD: ${process.env.SMSNATIVE_PASSWORD ? '✓ Set' : '✗ Not set'}`)
console.log(`- SMSNATIVE_SENDERID: ${process.env.SMSNATIVE_SENDERID || 'SPEEDWALLET (default)'}`)
console.log(`- SMS_MOCK_MODE: ${process.env.SMS_MOCK_MODE || 'true (default)'}`)

if (process.env.SMS_MOCK_MODE !== 'false') {
  console.log('\n⚠️  Note: SMS_MOCK_MODE is enabled. SMS will not be sent.')
  console.log('   To test actual SMS sending, set SMS_MOCK_MODE=false in .env')
}
