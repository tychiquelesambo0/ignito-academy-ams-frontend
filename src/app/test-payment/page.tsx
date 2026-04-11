'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TestPaymentPage() {
  const [phoneNumber, setPhoneNumber] = useState('+243812345678')
  const [amount, setAmount] = useState('1')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testPayment = async () => {
    setLoading(true)
    setResult(null)

    try {
      console.log('🧪 Testing payment with:', { phoneNumber, amount })

      // Call server-side API route
      const response = await fetch('/api/test-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, amount }),
      })

      const data = await response.json()
      setResult(data)
      console.log('✅ Payment response:', data)

    } catch (error) {
      console.error('❌ Payment error:', error)
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setLoading(false)
    }
  }

  const checkStatus = async () => {
    if (!result?.transactionId) return

    setLoading(true)

    try {
      // Call server-side API route
      const response = await fetch(`/api/test-payment?transactionId=${result.transactionId}`)
      const statusResponse = await response.json()
      
      setResult({ ...result, statusCheck: statusResponse })
      console.log('✅ Status check:', statusResponse)

    } catch (error) {
      console.error('❌ Status check error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🧪 Pawa Pay Payment Test</h1>
        <p className="text-gray-600 mb-8">Test payment integration with Pawa Pay Sandbox</p>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Phone Number (E.164 format)
            </label>
            <Input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+243812345678"
              className="font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              <strong>Vodacom:</strong> +243 81/82/83/84/85 | 
              <strong> Airtel:</strong> +243 97/98/99 | 
              <strong> Orange:</strong> +243 80/89/90 | 
              <strong> Africell:</strong> +243 91/92/93/94/95/96
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Amount (USD)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1"
              step="0.01"
              min="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              Start with $1 for testing, then try $29 (application fee)
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testPayment}
              disabled={loading}
              className="flex-1 bg-[#021463] hover:bg-[#021463]/90"
            >
              {loading ? 'Processing...' : '💳 Initiate Payment'}
            </Button>

            {result?.transactionId && (
              <Button
                onClick={checkStatus}
                disabled={loading}
                variant="outline"
                className="border-[#021463] text-[#021463] hover:bg-[#021463]/10"
              >
                🔍 Check Status
              </Button>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Result:</h2>
            
            {result.success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800 font-medium">✅ Payment Initiated Successfully!</p>
                <p className="text-sm text-green-700 mt-1">
                  Transaction ID: <code className="bg-green-100 px-2 py-1 rounded">{result.transactionId}</code>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Status: <strong>{result.status}</strong>
                </p>
              </div>
            )}

            {result.error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-800 font-medium">❌ Error</p>
                <p className="text-sm text-red-700 mt-1">{result.error}</p>
              </div>
            )}

            {result.statusCheck && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800 font-medium">🔍 Status Check Result:</p>
                <p className="text-sm text-blue-700 mt-1">
                  Status: <strong>{result.statusCheck.status}</strong>
                </p>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                View Full Response (JSON)
              </summary>
              <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs mt-2">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold mb-2">📝 Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Enter your DRC mobile number (use your real number for sandbox)</li>
            <li>Enter amount (start with $1 USD)</li>
            <li>Click <strong>"Initiate Payment"</strong></li>
            <li>Check your phone for the payment prompt from your mobile money provider</li>
            <li><strong>APPROVE</strong> the payment on your phone</li>
            <li>Click <strong>"Check Status"</strong> to see if payment is confirmed</li>
            <li>Check terminal logs for detailed information</li>
            <li>Verify webhook was received (check terminal)</li>
          </ol>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-bold mb-2">⚠️ Important Notes:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li>This page is for <strong>testing only</strong> - do not use in production</li>
            <li>Ensure <code className="bg-yellow-100 px-1">PAYMENT_PROVIDER=pawapay</code> in your .env.local</li>
            <li>For local testing, use <strong>ngrok</strong> to expose your localhost</li>
            <li>Check terminal logs for detailed payment flow information</li>
            <li>Webhook URL must be configured in Pawa Pay dashboard</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <a 
            href="/dashboard" 
            className="text-[#021463] hover:underline text-sm"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}
