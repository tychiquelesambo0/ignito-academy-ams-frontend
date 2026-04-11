/**
 * Test Payment API Route
 * 
 * Server-side endpoint for testing payment initiation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPaymentProvider } from '@/lib/payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, amount } = body

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🧪 [Test Payment API] Initiating test payment')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Get payment provider (this runs server-side, so env vars are available)
    const provider = await getPaymentProvider()

    // Initiate payment
    const response = await provider.initiatePayment({
      applicationId: `TEST-2026-${Date.now()}`,
      userId: 'test-user-123',
      amountUsd: parseFloat(amount),
      phoneNumber,
      email: 'test@example.com',
      fullName: 'Test User',
      description: 'Ignito Academy Fee', // Max 22 chars for Pawa Pay
    })

    console.log('✅ Payment response:', response)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Test payment error:', error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const transactionId = searchParams.get('transactionId')

  if (!transactionId) {
    return NextResponse.json(
      { error: 'transactionId required' },
      { status: 400 }
    )
  }

  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 [Test Payment API] Checking payment status')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    const provider = await getPaymentProvider()
    const response = await provider.checkPaymentStatus(transactionId)

    console.log('✅ Status check response:', response)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json(response)

  } catch (error) {
    console.error('❌ Status check error:', error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
