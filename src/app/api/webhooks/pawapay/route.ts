/**
 * Pawa Pay Webhook Handler
 * 
 * Receives payment status updates from Pawa Pay
 * 
 * CRITICAL: USD Single-Currency ONLY
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payment'

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📨 [Webhook] PAWA PAY WEBHOOK RECEIVED')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Get raw body and signature
    const body = await request.text()
    const signature = request.headers.get('x-pawapay-signature') || ''

    console.log('📋 Webhook Details:')
    console.log(`   Signature: ${signature.substring(0, 20)}...`)
    console.log(`   Body length: ${body.length} bytes`)

    // Get payment provider
    const provider = await getPaymentProvider()

    // Validate webhook signature
    const validation = await provider.validateWebhook(body, signature)

    if (!validation.isValid) {
      console.error('❌ Invalid webhook signature')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✅ Webhook signature validated')

    // Parse webhook payload
    const webhookData = await provider.parseWebhook(body)

    console.log('📦 Parsed Webhook Data:')
    console.log(`   Transaction ID: ${webhookData.transactionId}`)
    console.log(`   Status: ${webhookData.status}`)
    console.log(`   Amount: $${webhookData.amountUsd} USD`)
    console.log(`   Phone: ${webhookData.phoneNumber}`)

    // Extract application ID from transaction ID
    // Format: APP-2026-001234-timestamp
    const applicationId = webhookData.transactionId.split('-').slice(0, 3).join('-')

    console.log(`   Application ID: ${applicationId}`)

    // Create Supabase client
    const supabase = await createClient()

    // Log webhook to database
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        provider: 'pawapay',
        event_type: 'deposit_status',
        payload: JSON.parse(body),
        signature,
        status: 'processed',
        processed_at: new Date().toISOString(),
      })

    if (logError) {
      console.error('⚠️  Error logging webhook:', logError)
    }

    // Update application payment status
    if (webhookData.status === 'Confirmed') {
      console.log('💰 Payment confirmed - updating application status...')

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          payment_status: 'Confirmed',
          payment_transaction_id: webhookData.transactionId,
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('applicant_id', applicationId)

      if (updateError) {
        console.error('❌ Error updating application:', updateError)
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
        
        return NextResponse.json(
          { error: 'Failed to update application' },
          { status: 500 }
        )
      }

      console.log('✅ Application payment status updated to Confirmed')

      // TODO: Send confirmation email to applicant

    } else if (webhookData.status === 'Failed') {
      console.log('❌ Payment failed - updating application status...')

      const { error: updateError } = await supabase
        .from('applications')
        .update({
          payment_status: 'Failed',
          payment_transaction_id: webhookData.transactionId,
        })
        .eq('applicant_id', applicationId)

      if (updateError) {
        console.error('❌ Error updating application:', updateError)
      }

      console.log('✅ Application payment status updated to Failed')

      // TODO: Send failure notification email

    } else {
      console.log('⏳ Payment still pending...')
    }

    console.log('✅ Webhook processed successfully')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Error processing webhook:', error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Allow POST requests only
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
