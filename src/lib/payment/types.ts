/**
 * Payment Provider Types
 * 
 * CRITICAL: USD Single-Currency ONLY
 * - All amounts in USD
 * - NO CDF (Congolese Franc)
 * - NO currency conversion
 */

import type { Currency } from './currency'
import { APPLICATION_FEE_USD } from './currency'

// ============================================================================
// PAYMENT TYPES
// ============================================================================

/**
 * Payment status enum
 */
export type PaymentStatus = 
  | 'Pending'      // Payment initiated but not confirmed
  | 'Confirmed'    // Payment confirmed by provider
  | 'Failed'       // Payment failed
  | 'Waived'       // Payment waived (scholarship/admin)

/**
 * Payment method enum
 */
export type PaymentMethod =
  | 'mobile_money'  // Mobile money (Pawa Pay)
  | 'waived'        // Payment waived

/**
 * Payment request data
 */
export interface PaymentRequest {
  /** Application ID */
  applicationId: string
  
  /** User ID */
  userId: string
  
  /** Amount in USD (CRITICAL: USD ONLY) */
  amountUsd: number
  
  /** Currency (MUST be 'USD') */
  currency: Currency
  
  /** Phone number in E.164 format (+243XXXXXXXXX) */
  phoneNumber: string
  
  /** User email */
  email: string
  
  /** User full name */
  fullName: string
  
  /** Payment description */
  description: string
}

/**
 * Payment response from provider
 */
export interface PaymentResponse {
  /** Success status */
  success: boolean
  
  /** Transaction ID from provider */
  transactionId?: string
  
  /** Error message if failed */
  error?: string
  
  /** Payment status */
  status: PaymentStatus
  
  /** Provider-specific data */
  providerData?: Record<string, unknown>
}

/**
 * Webhook payload from payment provider
 */
export interface WebhookPayload {
  /** Transaction ID */
  transactionId: string
  
  /** Payment status */
  status: PaymentStatus
  
  /** Amount in USD */
  amountUsd: number
  
  /** Phone number */
  phoneNumber: string
  
  /** Timestamp */
  timestamp: string
  
  /** Provider-specific data */
  providerData: Record<string, unknown>
}

/**
 * Webhook validation result
 */
export interface WebhookValidation {
  /** Is webhook valid? */
  isValid: boolean
  
  /** Error message if invalid */
  error?: string
}

// ============================================================================
// PAYMENT PROVIDER INTERFACE
// ============================================================================

/**
 * Payment Provider Interface
 * 
 * All payment providers must implement this interface
 * 
 * CRITICAL: All amounts MUST be in USD
 */
export interface IPaymentProvider {
  /**
   * Provider name
   */
  readonly name: string
  
  /**
   * Initiate a payment
   * 
   * @param request Payment request data
   * @returns Payment response with transaction ID
   */
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>
  
  /**
   * Check payment status
   * 
   * @param transactionId Transaction ID from provider
   * @returns Payment status
   */
  checkPaymentStatus(transactionId: string): Promise<PaymentResponse>
  
  /**
   * Validate webhook signature
   * 
   * @param payload Webhook payload
   * @param signature Webhook signature
   * @returns Validation result
   */
  validateWebhook(
    payload: string,
    signature: string
  ): Promise<WebhookValidation>
  
  /**
   * Parse webhook payload
   * 
   * @param payload Raw webhook payload
   * @returns Parsed webhook data
   */
  parseWebhook(payload: string): Promise<WebhookPayload>
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

/**
 * Supported payment providers
 */
export type PaymentProviderType = 'mock' | 'pawapay'

/**
 * Payment provider configuration
 */
export interface PaymentProviderConfig {
  /** Provider type */
  type: PaymentProviderType
  
  /** API key (if required) */
  apiKey?: string
  
  /** API secret (if required) */
  apiSecret?: string
  
  /** Base URL (if required) */
  baseUrl?: string
  
  /** Webhook secret (if required) */
  webhookSecret?: string
}
