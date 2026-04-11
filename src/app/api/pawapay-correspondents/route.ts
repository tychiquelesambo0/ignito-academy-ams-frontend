/**
 * Pawa Pay Correspondents API
 * 
 * Fetch available correspondents from Pawa Pay API
 */

import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.PAWAPAY_API_KEY
    const baseUrl = process.env.PAWAPAY_BASE_URL

    if (!apiKey || !baseUrl) {
      return NextResponse.json(
        { error: 'Pawa Pay credentials not configured' },
        { status: 500 }
      )
    }

    console.log('🔍 Fetching Pawa Pay correspondents...')

    // Fetch active correspondents from Pawa Pay API
    const response = await fetch(`${baseUrl}/active-conf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Pawa Pay API Error:', response.status, errorText)
      return NextResponse.json(
        { error: `Pawa Pay API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('✅ Correspondents:', JSON.stringify(data, null, 2))

    return NextResponse.json(data)

  } catch (error) {
    console.error('❌ Error fetching correspondents:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
