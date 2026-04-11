/**
 * Currency Utilities Tests
 * 
 * Tests for USD single-currency enforcement
 */

import {
  Currency,
  APPLICATION_FEE_USD,
  validateCurrency,
  validatePaymentAmount,
  validateAmount,
  formatUSD,
} from '../currency'

describe('Currency Type', () => {
  it('should only allow USD as currency type', () => {
    const currency: Currency = 'USD'
    expect(currency).toBe('USD')
    
    // TypeScript should prevent this at compile time:
    // const invalidCurrency: Currency = 'CDF' // ❌ Type error
  })
})

describe('APPLICATION_FEE_USD', () => {
  it('should be exactly 29 USD', () => {
    expect(APPLICATION_FEE_USD).toBe(29)
  })
})

describe('validateCurrency', () => {
  it('should accept USD', () => {
    expect(() => validateCurrency('USD')).not.toThrow()
  })

  it('should reject CDF', () => {
    expect(() => validateCurrency('CDF')).toThrow(
      'Invalid currency: CDF. This system ONLY supports USD'
    )
  })

  it('should reject EUR', () => {
    expect(() => validateCurrency('EUR')).toThrow(
      'Invalid currency: EUR. This system ONLY supports USD'
    )
  })

  it('should reject empty string', () => {
    expect(() => validateCurrency('')).toThrow()
  })

  it('should reject lowercase usd', () => {
    expect(() => validateCurrency('usd')).toThrow()
  })
})

describe('validatePaymentAmount', () => {
  it('should accept 29 USD', () => {
    expect(() => validatePaymentAmount(29, 'USD')).not.toThrow()
  })

  it('should reject 30 USD', () => {
    expect(() => validatePaymentAmount(30, 'USD')).toThrow(
      'Invalid payment amount: $30 USD. Application fee must be exactly $29 USD'
    )
  })

  it('should reject 28 USD', () => {
    expect(() => validatePaymentAmount(28, 'USD')).toThrow(
      'Invalid payment amount: $28 USD. Application fee must be exactly $29 USD'
    )
  })

  it('should reject 29 CDF', () => {
    expect(() => validatePaymentAmount(29, 'CDF')).toThrow(
      'Invalid currency: CDF'
    )
  })

  it('should reject 0 USD', () => {
    expect(() => validatePaymentAmount(0, 'USD')).toThrow()
  })

  it('should reject negative amounts', () => {
    expect(() => validatePaymentAmount(-29, 'USD')).toThrow()
  })
})

describe('validateAmount', () => {
  it('should accept positive amounts', () => {
    expect(() => validateAmount(1)).not.toThrow()
    expect(() => validateAmount(29)).not.toThrow()
    expect(() => validateAmount(100)).not.toThrow()
    expect(() => validateAmount(9999.99)).not.toThrow()
  })

  it('should reject zero', () => {
    expect(() => validateAmount(0)).toThrow(
      'Invalid amount: $0. Amount must be positive'
    )
  })

  it('should reject negative amounts', () => {
    expect(() => validateAmount(-1)).toThrow(
      'Invalid amount: $-1. Amount must be positive'
    )
  })

  it('should reject amounts over 10000', () => {
    expect(() => validateAmount(10001)).toThrow(
      'Invalid amount: $10001. Amount exceeds maximum allowed'
    )
  })

  it('should reject amounts with more than 2 decimal places', () => {
    expect(() => validateAmount(29.999)).toThrow(
      'Invalid amount: $29.999. Maximum 2 decimal places allowed'
    )
  })

  it('should accept amounts with 2 decimal places', () => {
    expect(() => validateAmount(29.99)).not.toThrow()
  })

  it('should accept amounts with 1 decimal place', () => {
    expect(() => validateAmount(29.9)).not.toThrow()
  })

  it('should accept whole numbers', () => {
    expect(() => validateAmount(29)).not.toThrow()
  })
})

describe('formatUSD', () => {
  it('should format whole numbers', () => {
    expect(formatUSD(29)).toBe('$29.00 USD')
  })

  it('should format decimals', () => {
    expect(formatUSD(29.99)).toBe('$29.99 USD')
  })

  it('should format single decimal', () => {
    expect(formatUSD(29.5)).toBe('$29.50 USD')
  })

  it('should format zero', () => {
    expect(formatUSD(0)).toBe('$0.00 USD')
  })

  it('should format large amounts', () => {
    expect(formatUSD(9999.99)).toBe('$9999.99 USD')
  })
})
