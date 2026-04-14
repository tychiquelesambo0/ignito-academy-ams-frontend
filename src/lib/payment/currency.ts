/**
 * Currency Utilities
 * 
 * CRITICAL: USD Single-Currency ONLY
 * This system ONLY supports USD. No other currencies are allowed.
 * 
 * Architectural Pillar #1: USD Single-Currency Enforcement
 */

/**
 * Currency type - SINGLE LITERAL (not union type)
 * This enforces USD-only at the type level
 */
export type Currency = 'USD'

/**
 * Application fee in USD — 29 USD (non-negotiable, production value)
 */
export const APPLICATION_FEE_USD = 29

/**
 * Validate that currency is USD
 * Throws error if non-USD currency is provided
 * 
 * @param currency - Currency to validate
 * @throws Error if currency is not USD
 */
export function validateCurrency(currency: string): asserts currency is Currency {
  if (currency !== 'USD') {
    throw new Error(
      `Invalid currency: ${currency}. This system ONLY supports USD. ` +
      `No other currencies (including CDF) are allowed.`
    )
  }
}

/**
 * Validate payment amount
 * Ensures amount is exactly the application fee (29 USD)
 * 
 * @param amountUsd - Amount in USD to validate
 * @param currency - Currency (must be USD)
 * @throws Error if amount does not match APPLICATION_FEE_USD or currency is not USD
 */
export function validatePaymentAmount(amountUsd: number, currency: string): void {
  // First validate currency
  validateCurrency(currency)
  
  // Then validate amount
  if (amountUsd !== APPLICATION_FEE_USD) {
    throw new Error(
      `Invalid payment amount: $${amountUsd} USD. ` +
      `Application fee must be exactly $${APPLICATION_FEE_USD} USD.`
    )
  }
}

/**
 * Format amount as USD currency string
 * Example: 29 → "$29.00 USD"
 * 
 * @param amountUsd - Amount in USD
 * @returns Formatted currency string
 */
export function formatUSD(amountUsd: number): string {
  return `$${amountUsd.toFixed(2)} USD`
}

/**
 * Validate that an amount is positive and reasonable
 * Used for refunds and other non-application-fee amounts
 * 
 * @param amountUsd - Amount in USD to validate
 * @throws Error if amount is invalid
 */
export function validateAmount(amountUsd: number): void {
  if (amountUsd <= 0) {
    throw new Error(`Invalid amount: $${amountUsd}. Amount must be positive.`)
  }
  
  if (amountUsd > 10000) {
    throw new Error(`Invalid amount: $${amountUsd}. Amount exceeds maximum allowed ($10,000).`)
  }
  
  // Check for reasonable decimal places (max 2)
  const decimalPlaces = (amountUsd.toString().split('.')[1] || '').length
  if (decimalPlaces > 2) {
    throw new Error(`Invalid amount: $${amountUsd}. Maximum 2 decimal places allowed.`)
  }
}
