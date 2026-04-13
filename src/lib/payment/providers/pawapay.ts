/**
 * Pawa Pay Payment Provider
 * 
 * Integration with Pawa Pay for DRC mobile money payments
 * 
 * CRITICAL: USD Single-Currency ONLY
 * 
 * API Documentation: https://docs.pawapay.io
 */

import crypto from 'crypto'
import type {
  IPaymentProvider,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookValidation,
} from '../types'

export interface PawaPayConfig {
  apiKey: string
  apiSecret: string
  baseUrl: string
  webhookSecret?: string
}

/**
 * Pawa Pay correspondent codes for DRC mobile money providers
 * 
 * From Pawa Pay API Documentation:
 * https://docs.pawapay.io/v2/docs/test_numbers#democratic-republic-of-the-congo-drc
 * 
 * - Vodacom: VODACOM_MPESA_COD
 * - Airtel: AIRTEL_COD
 * - Orange: ORANGE_COD
 */
const DRC_CORRESPONDENTS = {
  VODACOM: 'VODACOM_MPESA_COD',
  AIRTEL: 'AIRTEL_COD',
  ORANGE: 'ORANGE_COD',
  AFRICELL: 'VODACOM_MPESA_COD',  // Fallback to Vodacom (no Africell in Pawa Pay)
} as const

/**
 * Pawa Pay API response types
 */
interface PawaPayDepositResponse {
  depositId: string
  status: 'ACCEPTED' | 'COMPLETED' | 'FAILED' | 'REJECTED'
  amount: string
  currency: string
  correspondent: string
  payer: {
    type: string
    address: {
      value: string
    }
  }
  created: string
  respondedByPayer?: string
  failureReason?: {
    failureMessage: string
    failureCode: string
  }
}

export class PawaPayProvider implements IPaymentProvider {
  public readonly name = 'Pawa Pay'
  
  private config: PawaPayConfig

  constructor(config: PawaPayConfig) {
    this.config = config
  }

  /**
   * Detect mobile money provider from phone number
   * Task 6.3: Map phone prefixes to correspondent codes
   */
  private detectCorrespondent(phoneNumber: string): string {
    // Remove +243 prefix
    const number = phoneNumber.replace('+243', '')
    
    // Vodacom: 81, 82, 83, 84, 85
    if (/^8[12345]/.test(number)) {
      return DRC_CORRESPONDENTS.VODACOM
    }
    
    // Airtel: 97, 98, 99
    if (/^9[789]/.test(number)) {
      return DRC_CORRESPONDENTS.AIRTEL
    }
    
    // Orange: 80, 89, 90
    if (/^(80|89|90)/.test(number)) {
      return DRC_CORRESPONDENTS.ORANGE
    }
    
    // Africell: 91, 92, 93, 94, 95, 96
    if (/^9[123456]/.test(number)) {
      return DRC_CORRESPONDENTS.AFRICELL
    }
    
    // Default to Vodacom (most common)
    console.warn(`[PawaPayProvider] Unknown phone prefix for ${phoneNumber}, defaulting to Vodacom`)
    return DRC_CORRESPONDENTS.VODACOM
  }

  /**
   * Format USD amount as a decimal string for the PawaPay API.
   *
   * IMPORTANT: PawaPay does NOT use minor units (cents).
   * The `amount` field must be the full decimal value as a string.
   * Example: $1.00 → "1.00"   $29.00 → "29.00"
   * Sending "100" instead of "1.00" would attempt a $100 charge.
   */
  private toAmountString(amountUsd: number): string {
    return amountUsd.toFixed(2)
  }

  /**
   * Initiate payment with Pawa Pay
   * Task 6.2: Implement initiatePayment() with Pawa Pay API
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💳 [PawaPayProvider] INITIATING PAYMENT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 Request Details:')
    console.log(`   Application ID: ${request.applicationId}`)
    console.log(`   Amount: $${request.amountUsd} USD`)
    console.log(`   Phone: ${request.phoneNumber}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      // Detect correspondent from phone number
      const correspondent = this.detectCorrespondent(request.phoneNumber)
      console.log(`   Detected Provider: ${correspondent}`)

      // Format amount as full decimal string (PawaPay does NOT use minor units)
      const amountMinorUnits = this.toAmountString(request.amountUsd)
      console.log(`   Amount (decimal string): ${amountMinorUnits} USD`)

      // Generate unique deposit ID (UUID v4 format - exactly 36 characters)
      const depositId = crypto.randomUUID()
      console.log(`   Deposit ID: ${depositId} (${depositId.length} chars)`)

      // MSISDN format: international number WITHOUT the leading '+' sign.
      // PawaPay requires "243812345678", not "+243812345678".
      const msisdn = request.phoneNumber.replace(/^\+/, '')
      console.log(`   MSISDN (no +): ${msisdn}`)

      // PawaPay enforces a 22-character max on statementDescription.
      // Truncate and use a short, fixed label to avoid validation rejection.
      const statementDescription = 'Ignito Academy Admiss.'  // exactly 22 chars

      // Prepare Pawa Pay deposit request
      const pawaPayRequest = {
        depositId,
        amount: amountMinorUnits,
        currency: 'USD', // CRITICAL: USD only
        correspondent,
        payer: {
          type: 'MSISDN',
          address: {
            value: msisdn,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription,
        metadata: [
          {
            fieldName: 'applicationId',
            fieldValue: request.applicationId,
          },
          {
            fieldName: 'userId',
            fieldValue: request.userId,
          },
        ],
      }

      console.log('📤 Sending request to Pawa Pay API...')
      console.log('📦 Full request payload:', JSON.stringify(pawaPayRequest, null, 2))

      // Call Pawa Pay API
      const response = await fetch(`${this.config.baseUrl}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(pawaPayRequest),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Pawa Pay API Error:', response.status, errorText)
        
        return {
          success: false,
          error: `Pawa Pay API error: ${response.status} - ${errorText}`,
          status: 'Failed',
        }
      }

      const pawaPayResponse: PawaPayDepositResponse = await response.json()

      console.log('✅ Payment initiated successfully!')
      console.log(`   Deposit ID: ${pawaPayResponse.depositId}`)
      console.log(`   Status: ${pawaPayResponse.status}`)
      console.log('📦 Full Pawa Pay Response:', JSON.stringify(pawaPayResponse, null, 2))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      // Map Pawa Pay status to our status
      const status = this.mapPawaPayStatus(pawaPayResponse.status)

      return {
        success: true,
        transactionId: pawaPayResponse.depositId,
        status,
        providerData: {
          pawaPayStatus: pawaPayResponse.status,
          correspondent: pawaPayResponse.correspondent,
          created: pawaPayResponse.created,
        },
      }

    } catch (error) {
      console.error('❌ Error initiating payment:', error)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'Failed',
      }
    }
  }

  /**
   * Map Pawa Pay status to our PaymentStatus
   */
  private mapPawaPayStatus(pawaPayStatus: string): 'Pending' | 'Confirmed' | 'Failed' {
    switch (pawaPayStatus) {
      case 'COMPLETED':
        return 'Confirmed'
      case 'ACCEPTED':
        return 'Pending'
      case 'FAILED':
      case 'REJECTED':
        return 'Failed'
      default:
        return 'Pending'
    }
  }

  /**
   * Check payment status with Pawa Pay
   * Task 6.7: Implement getTransactionStatus() with Pawa Pay deposits API
   */
  async checkPaymentStatus(transactionId: string): Promise<PaymentResponse> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [PawaPayProvider] CHECKING PAYMENT STATUS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`   Deposit ID: ${transactionId}`)

    try {
      // Call Pawa Pay deposits API
      const response = await fetch(
        `${this.config.baseUrl}/deposits/${encodeURIComponent(transactionId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Pawa Pay API Error:', response.status, errorText)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        return {
          success: false,
          error: `Pawa Pay API error: ${response.status}`,
          status: 'Failed',
        }
      }

      const pawaPayResponse: PawaPayDepositResponse = await response.json()

      console.log(`   Status: ${pawaPayResponse.status}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      const status = this.mapPawaPayStatus(pawaPayResponse.status)

      return {
        success: true,
        transactionId: pawaPayResponse.depositId,
        status,
        providerData: {
          pawaPayStatus: pawaPayResponse.status,
          correspondent: pawaPayResponse.correspondent,
          respondedByPayer: pawaPayResponse.respondedByPayer,
          failureReason: pawaPayResponse.failureReason,
        },
      }

    } catch (error) {
      console.error('❌ Error checking payment status:', error)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 'Failed',
      }
    }
  }

  /**
   * Validate Pawa Pay webhook
   * Task 6.5: Implement verifyWebhook() with HMAC-SHA256
   */
  async validateWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookValidation> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔐 [PawaPayProvider] VALIDATING WEBHOOK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    try {
      if (!this.config.webhookSecret) {
        console.warn('⚠️  No webhook secret configured, skipping validation')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        return {
          isValid: true, // Allow in development if no secret
        }
      }

      // Compute HMAC-SHA256 signature
      const hmac = crypto.createHmac('sha256', this.config.webhookSecret)
      hmac.update(payload)
      const computedSignature = hmac.digest('hex')

      // Compare signatures (constant-time comparison)
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      )

      console.log(`   Signature valid: ${isValid}`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return {
        isValid,
        error: isValid ? undefined : 'Invalid webhook signature',
      }

    } catch (error) {
      console.error('❌ Error validating webhook:', error)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Parse Pawa Pay webhook
   */
  async parseWebhook(payload: string): Promise<WebhookPayload> {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📦 [PawaPayProvider] PARSING WEBHOOK')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const data: PawaPayDepositResponse = JSON.parse(payload)

    // PawaPay sends the full decimal amount (NOT minor units)
    const amountUsd = parseFloat(data.amount)

    const webhookData: WebhookPayload = {
      transactionId: data.depositId,
      status: this.mapPawaPayStatus(data.status),
      amountUsd,
      phoneNumber: data.payer.address.value,
      timestamp: data.created,
      providerData: {
        pawaPayStatus: data.status,
        correspondent: data.correspondent,
        respondedByPayer: data.respondedByPayer,
        failureReason: data.failureReason,
      },
    }

    console.log('   Transaction ID:', webhookData.transactionId)
    console.log('   Status:', webhookData.status)
    console.log('   Amount: $' + webhookData.amountUsd + ' USD')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return webhookData
  }
}
