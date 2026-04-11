/**
 * Payment Provider Factory
 * 
 * Factory pattern for creating payment provider instances
 * based on environment configuration
 * 
 * CRITICAL: USD Single-Currency ONLY
 */

import type {
  IPaymentProvider,
  PaymentProviderType,
  PaymentProviderConfig,
} from './types'

// ============================================================================
// PAYMENT PROVIDER FACTORY
// ============================================================================

export class PaymentProviderFactory {
  private static instance: PaymentProviderFactory
  private provider: IPaymentProvider | null = null

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): PaymentProviderFactory {
    if (!PaymentProviderFactory.instance) {
      PaymentProviderFactory.instance = new PaymentProviderFactory()
    }
    return PaymentProviderFactory.instance
  }

  /**
   * Get payment provider based on environment configuration
   * 
   * @returns Payment provider instance
   * @throws Error if provider type is invalid or configuration is missing
   */
  public async getProvider(): Promise<IPaymentProvider> {
    // Get provider type from environment
    const providerType = (process.env.PAYMENT_PROVIDER || 'mock') as PaymentProviderType
    
    // Debug logging
    console.log('🔧 [Factory] Loading payment provider...')
    console.log('   PAYMENT_PROVIDER:', process.env.PAYMENT_PROVIDER)
    console.log('   Provider type:', providerType)
    console.log('   PAWAPAY_API_KEY:', process.env.PAWAPAY_API_KEY ? '✅ Set' : '❌ Missing')
    console.log('   PAWAPAY_BASE_URL:', process.env.PAWAPAY_BASE_URL || '❌ Missing')
    
    // In development, always reload to pick up env changes
    // In production, use cached provider for performance
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    if (this.provider && !isDevelopment) {
      console.log('   Using cached provider (production mode)')
      return this.provider
    }
    
    if (this.provider && isDevelopment) {
      console.log('   Reloading provider (development mode)')
    }

    // Validate provider type
    if (!['mock', 'pawapay'].includes(providerType)) {
      throw new Error(
        `Invalid payment provider: ${providerType}. Must be 'mock' or 'pawapay'`
      )
    }

    // Create provider configuration
    const config: PaymentProviderConfig = {
      type: providerType,
      apiKey: process.env.PAWAPAY_API_KEY,
      apiSecret: process.env.PAWAPAY_API_SECRET,
      baseUrl: process.env.PAWAPAY_BASE_URL,
      webhookSecret: process.env.PAWAPAY_WEBHOOK_SECRET,
    }

    // Create provider instance
    this.provider = await this.createProvider(config)

    return this.provider
  }

  /**
   * Create provider instance based on configuration
   * 
   * @param config Provider configuration
   * @returns Provider instance
   * @throws Error if provider creation fails
   */
  private async createProvider(
    config: PaymentProviderConfig
  ): Promise<IPaymentProvider> {
    switch (config.type) {
      case 'mock':
        const { MockPaymentProvider } = await import('./providers/mock')
        return new MockPaymentProvider()

      case 'pawapay':
        // Validate Pawa Pay configuration
        if (!config.apiKey || !config.baseUrl) {
          throw new Error(
            'Pawa Pay configuration missing. Required: PAWAPAY_API_KEY, PAWAPAY_BASE_URL'
          )
        }

        const { PawaPayProvider } = await import('./providers/pawapay')
        return new PawaPayProvider({
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          baseUrl: config.baseUrl,
          webhookSecret: config.webhookSecret,
        })

      default:
        throw new Error(`Unsupported payment provider: ${config.type}`)
    }
  }

  /**
   * Reset factory (useful for testing)
   */
  public reset(): void {
    this.provider = null
  }
}

/**
 * Get payment provider instance
 * 
 * Convenience function to get the payment provider
 * 
 * @returns Payment provider instance
 */
export async function getPaymentProvider(): Promise<IPaymentProvider> {
  const factory = PaymentProviderFactory.getInstance()
  return factory.getProvider()
}
