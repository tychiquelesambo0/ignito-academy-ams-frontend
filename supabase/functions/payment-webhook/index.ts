import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-nomba-signature',
}

interface WebhookPayload {
  transaction_id: string
  reference: string
  status: 'success' | 'failed' | 'pending'
  amount: number
  currency: string
  provider: string
  timestamp: string
}

/**
 * Verify webhook signature using HMAC-SHA256
 */
async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    )

    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedSignature === signature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get webhook secret from environment
    const webhookSecret = Deno.env.get('NOMBA_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('NOMBA_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get signature from headers
    const signature = req.headers.get('x-nomba-signature')
    if (!signature) {
      console.error('Missing webhook signature')
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Verify signature
    const isValid = await verifySignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse payload
    const payload: WebhookPayload = JSON.parse(rawBody)
    const { transaction_id, reference, status, amount, currency, provider, timestamp } = payload

    // Validate required fields
    if (!transaction_id || !reference || !status) {
      console.error('Missing required fields in webhook payload')
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check for duplicate transaction_id (idempotency)
    const { data: existingLog, error: checkError } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('transaction_id', transaction_id)
      .single()

    if (existingLog) {
      console.log('Duplicate webhook received for transaction:', transaction_id)
      return new Response(
        JSON.stringify({ message: 'Webhook already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert webhook receipt into webhook_logs table
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        transaction_id,
        applicant_id: reference,
        status,
        amount,
        currency,
        provider,
        payload: payload,
        received_at: new Date().toISOString(),
      })

    if (logError) {
      console.error('Error logging webhook:', logError)
      return new Response(
        JSON.stringify({ error: 'Failed to log webhook' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update payment status if successful (Task 20)
    if (status === 'success') {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          payment_status: 'Confirmed',
          application_status: 'Frais Réglés',
          transaction_id: transaction_id,
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('applicant_id', reference)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
        // Still return 200 to acknowledge webhook receipt
      }

      // Send payment confirmation email (Task 21)
      try {
        // Get applicant details for email
        const { data: applicant, error: applicantError } = await supabase
          .from('applicants')
          .select('email, prenom, nom')
          .eq('id', (await supabase
            .from('applications')
            .select('user_id')
            .eq('applicant_id', reference)
            .single()
          ).data?.user_id)
          .single()

        if (applicant && !applicantError) {
          const emailSubject = 'Confirmation de réception de votre dossier d\'admission'
          const emailBody = `
Madame, Monsieur ${applicant.nom},

Nous avons le plaisir de vous confirmer la réception de votre dossier d'admission à Ignito Academy.

Votre identifiant de candidature : ${reference}
Statut du dossier : Frais Réglés

Votre paiement de 29 USD a été confirmé avec succès. Votre dossier est maintenant en cours de traitement par notre commission d'admission.

Vous recevrez une notification par email dès que votre dossier aura été examiné.

Pour toute question, n'hésitez pas à nous contacter en mentionnant votre identifiant de candidature.

Cordialement,
L'équipe d'admission
Ignito Academy
          `.trim()

          // Log email attempt
          const { error: logError } = await supabase
            .from('email_logs')
            .insert({
              applicant_id: reference,
              recipient_email: applicant.email,
              email_type: 'payment_confirmation',
              subject: emailSubject,
              body: emailBody,
              status: 'pending',
              sent_at: new Date().toISOString(),
            })

          if (logError) {
            console.error('Error logging email:', logError)
          }

          // TODO: Integrate with Resend or email service
          // For now, just log the email details
          console.log('Payment confirmation email prepared for:', applicant.email)
        }
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError)
        // Don't fail webhook processing if email fails
      }
    } else if (status === 'failed') {
      const { error: updateError } = await supabase
        .from('applications')
        .update({ 
          payment_status: 'Failed',
          // Keep Application_Status as "Dossier Créé" (no change)
        })
        .eq('applicant_id', reference)

      if (updateError) {
        console.error('Error updating payment status:', updateError)
      }
    }

    console.log('Webhook processed successfully:', transaction_id)
    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
