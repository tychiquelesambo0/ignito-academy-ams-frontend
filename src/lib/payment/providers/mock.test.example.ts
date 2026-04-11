/**
 * Mock Payment Provider - Usage Examples
 * 
 * This file demonstrates how to use the Mock Payment Provider
 * for development and testing
 * 
 * CRITICAL: USD Single-Currency ONLY
 */

import { MockPaymentProvider } from './mock'
import type { PaymentRequest } from '../types'

/**
 * Example 1: Initiate a payment
 */
async function example1_initiatePayment() {
  console.log('\n📝 EXAMPLE 1: Initiate Payment\n')
  
  const provider = new MockPaymentProvider()
  
  const request: PaymentRequest = {
    applicationId: 'APP-2026-001234',
    userId: 'user-123',
    amountUsd: 29, // CRITICAL: USD only
    phoneNumber: '+243812345678',
    email: 'jean.kabila@example.com',
    fullName: 'Jean Kabila',
    description: 'Application Fee - UK Level 3 Foundation Diploma',
  }
  
  const response = await provider.initiatePayment(request)
  
  if (response.success) {
    console.log('✅ Payment initiated!')
    console.log('Transaction ID:', response.transactionId)
    console.log('Status:', response.status)
  } else {
    console.log('❌ Payment failed:', response.error)
  }
  
  return response.transactionId
}

/**
 * Example 2: Check payment status
 */
async function example2_checkStatus(transactionId: string) {
  console.log('\n📝 EXAMPLE 2: Check Payment Status\n')
  
  const provider = new MockPaymentProvider()
  
  // Check immediately (should be Pending)
  console.log('Checking status immediately...')
  let response = await provider.checkPaymentStatus(transactionId)
  console.log('Status:', response.status)
  
  // Wait 4 seconds and check again (should be Confirmed)
  console.log('\nWaiting 4 seconds for auto-confirmation...')
  await new Promise(resolve => setTimeout(resolve, 4000))
  
  console.log('Checking status again...')
  response = await provider.checkPaymentStatus(transactionId)
  console.log('Status:', response.status)
}

/**
 * Example 3: Validate webhook
 */
async function example3_validateWebhook() {
  console.log('\n📝 EXAMPLE 3: Validate Webhook\n')
  
  const provider = new MockPaymentProvider()
  
  const payload = JSON.stringify({
    transactionId: 'MOCK-1234567890-ABC123',
    status: 'Confirmed',
    amountUsd: 29,
    phoneNumber: '+243812345678',
  })
  
  const signature = 'mock-signature-12345'
  
  const validation = await provider.validateWebhook(payload, signature)
  console.log('Webhook valid:', validation.isValid)
}

/**
 * Example 4: Parse webhook
 */
async function example4_parseWebhook() {
  console.log('\n📝 EXAMPLE 4: Parse Webhook\n')
  
  const provider = new MockPaymentProvider()
  
  const payload = JSON.stringify({
    transactionId: 'MOCK-1234567890-ABC123',
    status: 'Confirmed',
    amountUsd: 29,
    phoneNumber: '+243812345678',
  })
  
  const webhookData = await provider.parseWebhook(payload)
  console.log('Parsed webhook data:', webhookData)
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 MOCK PAYMENT PROVIDER - USAGE EXAMPLES')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  try {
    // Example 1: Initiate payment
    const transactionId = await example1_initiatePayment()
    
    // Example 2: Check status (with auto-confirmation)
    if (transactionId) {
      await example2_checkStatus(transactionId)
    }
    
    // Example 3: Validate webhook
    await example3_validateWebhook()
    
    // Example 4: Parse webhook
    await example4_parseWebhook()
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ All examples completed successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
  } catch (error) {
    console.error('❌ Error running examples:', error)
  }
}

// Uncomment to run examples
// runAllExamples()

export {
  example1_initiatePayment,
  example2_checkStatus,
  example3_validateWebhook,
  example4_parseWebhook,
  runAllExamples,
}
