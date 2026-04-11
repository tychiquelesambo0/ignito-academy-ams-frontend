/**
 * Payment Module
 * 
 * Exports payment types, providers, and factory
 * 
 * CRITICAL: USD Single-Currency ONLY
 */

// Export types
export type {
  PaymentStatus,
  PaymentMethod,
  PaymentRequest,
  PaymentResponse,
  WebhookPayload,
  WebhookValidation,
  IPaymentProvider,
  PaymentProviderType,
  PaymentProviderConfig,
} from './types'

// Export currency types and utilities
export type { Currency } from './currency'
export {
  APPLICATION_FEE_USD,
  validateCurrency,
  validatePaymentAmount,
  validateAmount,
  formatUSD,
} from './currency'

// Export factory
export { PaymentProviderFactory, getPaymentProvider } from './factory'

// Export providers (for testing)
export { MockPaymentProvider } from './providers/mock'
export { PawaPayProvider } from './providers/pawapay'
