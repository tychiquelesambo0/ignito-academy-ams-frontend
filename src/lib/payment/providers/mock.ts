/**
 * Mock Payment Provider
 * 
 * For development and testing purposes
 * Always succeeds with fake transaction IDs
 * 
 * CRITICAL: USD Single-Currency ONLY
 */

import type {
  IPaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookValidation,
} from '../types'

export class MockPaymentProvider implements IPaymentProvider {
  public readonly name = 'Mock Payment Provider'
  
  // Store mock transactions for status checking
  private transactions = new Map<string, {
    status: 'Pending' | 'Confirmed' | 'Failed'
    timestamp: string
    request: PaymentRequest
  }>()

  /**
   * Initiate a mock payment (always succeeds after delay)
   * 
   * Task 5.2: Instant success simulation with realistic delay
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔵 [MockPaymentProvider] PAYMENT INITIATION')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 Request Details:')
    console.log(`   Application ID: ${request.applicationId}`)
    console.log(`   User ID: ${request.userId}`)
    console.log(`   Amount: $${request.amountUsd} USD`)
    console.log(`   Phone: ${request.phoneNumber}`)
    console.log(`   Email: ${request.email}`)
    console.log(`   Name: ${request.fullName}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Simulate network delay (1-2 seconds)
    const delay = 1000 + Math.random() * 1000
    console.log(`⏳ Simulating network delay: ${Math.round(delay)}ms...`)
    await new Promise(resolve => setTimeout(resolve, delay))

    // Generate fake transaction ID
    const transactionId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Store transaction (starts as Pending, auto-confirms after 3 seconds)
    this.transactions.set(transactionId, {
      status: 'Pending',
      timestamp: new Date().toISOString(),
      request,
    })

    // Auto-confirm after 3 seconds (Task 5.5)
    setTimeout(() => {
      const tx = this.transactions.get(transactionId)
      if (tx) {
        tx.status = 'Confirmed'
        console.log(`✅ [MockPaymentProvider] Transaction auto-confirmed: ${transactionId}`)
      }
    }, 3000)

    console.log('✅ Payment initiated successfully!')
    console.log(`   Transaction ID: ${transactionId}`)
    console.log(`   Status: Pending → Will auto-confirm in 3 seconds`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return {
      success: true,
      transactionId,
      status: 'Pending',
      providerData: {
        mock: true,
        timestamp: new Date().toISOString(),
        willConfirmAt: new Date(Date.now() + 3000).toISOString(),
      },
    }
  }

  /**
   * Check mock payment status
   * 
   * Task 5.5: Returns actual status (Pending or Confirmed based on time)
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [MockPaymentProvider] CHECKING PAYMENT STATUS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Transaction ID: ${transactionId}`)

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Check if transaction exists
    const transaction = this.transactions.get(transactionId)
    
    if (!transaction) {
      console.log('❌ Transaction not found')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      return {
        success: false,
        error: 'Transaction not found',
        status: 'Failed',
      }
    }

    console.log(`   Status: ${transaction.status}`)
    console.log(`   Created: ${transaction.timestamp}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return {
      success: true,
      transactionId,
      status: transaction.status === 'Confirmed' ? 'Confirmed' : 'Pending',
      providerData: {
        mock: true,
        timestamp: new Date().toISOString(),
        transactionCreated: transaction.timestamp,
      },
    }
  }

  /**
   * Validate mock webhook (always valid)
   * 
   * Task 5.3: Always returns true for development
   */
  async validateWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookValidation> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [MockPaymentProvider] VALIDATING WEBHOOK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Payload length: ${payload.length} bytes`)
    console.log(`   Signature: ${signature.substring(0, 20)}...`)
    console.log('   ✅ Mock webhook always valid')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return {
      isValid: true,
    }
  }

  /**
   * Parse mock webhook payload
   * 
   * Task 5.6: Enhanced logging for debugging
   */
  async parseWebhook(payload: string): Promise<WebhookPayload> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [MockPaymentProvider] PARSING WEBHOOK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    const data = JSON.parse(payload)
    
    const webhookData: WebhookPayload = {
      transactionId: data.transactionId || `MOCK-${Date.now()}`,
      status: 'Confirmed',
      amountUsd: data.amountUsd || 29,
      phoneNumber: data.phoneNumber || '+243000000000',
      timestamp: new Date().toISOString(),
      providerData: {
        mock: true,
        ...data,
      },
    }

    console.log('   Transaction ID:', webhookData.transactionId)
    console.log('   Status:', webhookData.status)
    console.log('   Amount: $' + webhookData.amountUsd + ' USD')
    console.log('   Phone:', webhookData.phoneNumber)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return webhookData
  }
}
