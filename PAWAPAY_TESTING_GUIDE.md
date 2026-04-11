# 🧪 Pawa Pay Integration Testing Guide

## Complete Step-by-Step Testing Process

This guide will walk you through testing the Pawa Pay integration in both **Sandbox** and **Production** environments.

---

## 📋 **Pre-Testing Checklist**

Before we start, ensure you have:
- ✅ Pawa Pay Sandbox account (Image 3 & 4)
- ✅ Pawa Pay Production account (Image 1 & 2)
- ✅ Access to generate API tokens
- ✅ A DRC mobile number for testing
- ✅ Application deployed or running locally with ngrok

---

## 🔧 **Part 1: Sandbox Environment Setup**

### **Step 1: Configure Callback URLs (Sandbox)**

**1.1** Open your **Pawa Pay Sandbox Dashboard** (you're already there in Image 3)

**1.2** Navigate to: **System Configuration → Callback URLs**

**1.3** You'll need your application's webhook URL. Choose one:

**Option A - Local Development with ngrok:**
```bash
# In a new terminal, run:
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

**Option B - Deployed Application:**
```
https://your-deployed-app.com
```

**1.4** Enter the callback URLs:

| Field | Value |
|-------|-------|
| **Deposits** | `https://your-domain.com/api/webhooks/pawapay` |
| **Payouts** | `https://your-domain.com/api/webhooks/pawapay` |
| **Refunds** | `https://your-domain.com/api/webhooks/pawapay` |

**1.5** Click **Save**

---

### **Step 2: Generate Sandbox API Token**

**2.1** In Sandbox Dashboard, go to: **System Configuration → API Tokens**

**2.2** Click **"Generate token"** button

**2.3** **IMMEDIATELY COPY** the token (you won't see it again!)

Example token format: `sk_sandbox_abc123xyz...`

**2.4** Store it securely

---

### **Step 3: Configure Environment Variables**

**3.1** Open your `.env.local` file

**3.2** Add/update these variables:

```env
# Payment Provider Configuration
PAYMENT_PROVIDER=pawapay

# Pawa Pay Sandbox Credentials
PAWAPAY_API_KEY=sk_sandbox_YOUR_TOKEN_HERE
PAWAPAY_API_SECRET=your_api_secret_if_needed
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
PAWAPAY_WEBHOOK_SECRET=your_webhook_secret_if_configured
```

**3.3** Save the file

**3.4** Restart your development server:
```bash
npm run dev
```

---

## 🧪 **Part 2: Sandbox Testing**

### **Step 4: Create Test Payment Page**

I'll create a dedicated test page for you to easily test payments.

**4.1** The test page will be at: `/test-payment`

**4.2** It will allow you to:
- Enter a phone number
- Specify an amount
- Initiate a payment
- Check payment status
- View detailed logs

---

### **Step 5: Run First Test Payment**

**5.1** Open your browser to: `http://localhost:3000/test-payment`

**5.2** Enter test details:
- **Phone Number**: Your real DRC mobile number (e.g., `+243812345678`)
- **Amount**: `1` (start with $1 USD for testing)

**5.3** Click **"Initiate Payment"**

**5.4** Watch the terminal logs - you should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💳 [PawaPayProvider] INITIATING PAYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Request Details:
   Application ID: TEST-2026-...
   Amount: $1 USD
   Phone: +243812345678
   Detected Provider: VODACOM_CD
   Amount (minor units): 100 cents
📤 Sending request to Pawa Pay API...
✅ Payment initiated successfully!
   Deposit ID: TEST-2026-...-1712345678
   Status: ACCEPTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**5.5** Check your phone - you should receive a payment prompt from your mobile money provider

**5.6** **APPROVE** the payment on your phone

**5.7** Click **"Check Status"** button - status should change to `COMPLETED`

---

### **Step 6: Test Webhook Reception**

**6.1** After approving the payment, Pawa Pay will send a webhook to your callback URL

**6.2** Watch the terminal logs - you should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 [Webhook] PAWA PAY WEBHOOK RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Webhook signature validated
📦 Parsed Webhook Data:
   Transaction ID: TEST-2026-...-1712345678
   Status: Confirmed
   Amount: $1 USD
   Phone: +243812345678
💰 Payment confirmed - updating application status...
✅ Application payment status updated to Confirmed
✅ Webhook processed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**6.3** Verify in Supabase Dashboard:
- Go to **Table Editor → applications**
- Find your test application
- Check `payment_status` = `'Confirmed'`
- Check `payment_transaction_id` is populated

---

### **Step 7: Test Different Providers**

Test with different mobile money providers:

| Provider | Test Phone Number | Expected Correspondent |
|----------|------------------|----------------------|
| Vodacom  | +243 81XXXXXXX | VODACOM_CD |
| Airtel   | +243 97XXXXXXX | AIRTEL_CD |
| Orange   | +243 80XXXXXXX | ORANGE_CD |
| Africell | +243 91XXXXXXX | AFRICELL_CD |

Repeat Step 5 with each provider to ensure auto-detection works.

---

### **Step 8: Test Failure Scenarios**

**8.1** Test with insufficient balance:
- Initiate payment
- **REJECT** on your phone
- Verify status becomes `FAILED`

**8.2** Test with invalid phone number:
- Use: `+243999999999`
- Should get API error

**8.3** Test with invalid amount:
- Use: `0` or negative amount
- Should get validation error

---

## 🚀 **Part 3: Production Environment Setup**

### **Step 9: Configure Production Callback URLs**

**9.1** Open your **Pawa Pay Production Dashboard** (Image 1 & 2)

**9.2** Navigate to: **System Configuration → Callback URLs**

**9.3** Enter your **PRODUCTION** webhook URL:
```
https://your-production-domain.com/api/webhooks/pawapay
```

⚠️ **CRITICAL**: Use your actual production domain (NOT ngrok!)

**9.4** Click **Save**

---

### **Step 10: Generate Production API Token**

**10.1** In Production Dashboard, go to: **System Configuration → API Tokens**

**10.2** Click **"Generate token"**

**10.3** **IMMEDIATELY COPY** the production token

**10.4** Store it in a secure password manager

---

### **Step 11: Update Production Environment Variables**

**11.1** In your production environment (Vercel/Netlify/etc.), set:

```env
PAYMENT_PROVIDER=pawapay
PAWAPAY_API_KEY=sk_live_YOUR_PRODUCTION_TOKEN
PAWAPAY_API_SECRET=your_production_secret
PAWAPAY_BASE_URL=https://api.pawapay.io
PAWAPAY_WEBHOOK_SECRET=your_production_webhook_secret
```

⚠️ **NEVER** commit production credentials to git!

---

### **Step 12: Production Testing**

**12.1** Use a REAL application flow (not the test page)

**12.2** Create a real application as an applicant

**12.3** Proceed to payment

**12.4** Use a SMALL amount first (e.g., $1 USD)

**12.5** Verify:
- Payment initiated successfully
- Phone receives payment prompt
- Payment can be approved
- Webhook is received
- Application status updates
- Applicant can see updated status

---

## ✅ **Testing Checklist**

### **Sandbox Tests**
- [ ] Callback URLs configured
- [ ] API token generated and added to `.env.local`
- [ ] Test payment initiated successfully
- [ ] Payment prompt received on phone
- [ ] Payment approved on phone
- [ ] Webhook received and validated
- [ ] Application status updated to Confirmed
- [ ] Tested with Vodacom number
- [ ] Tested with Airtel number
- [ ] Tested with Orange number
- [ ] Tested with Africell number
- [ ] Tested payment rejection (failure scenario)
- [ ] Tested invalid phone number
- [ ] Logs are clear and helpful

### **Production Tests**
- [ ] Production callback URLs configured
- [ ] Production API token generated
- [ ] Production environment variables set
- [ ] Small test payment ($1) successful
- [ ] Full application fee ($29) successful
- [ ] Webhook received in production
- [ ] Application status updates correctly
- [ ] Applicant sees correct payment status
- [ ] Email notifications sent (if implemented)

---

## � **Troubleshooting**

### **Problem: Webhook not received**

**Solution:**
1. Check ngrok is running (for local testing)
2. Verify callback URL in Pawa Pay dashboard
3. Check terminal logs for incoming requests
4. Verify webhook secret matches

### **Problem: Invalid signature error**

**Solution:**
1. Check `PAWAPAY_WEBHOOK_SECRET` is correct
2. Verify you're using the right environment (sandbox vs production)
3. Check Pawa Pay dashboard for webhook secret

### **Problem: Payment initiation fails**

**Solution:**
1. Check `PAWAPAY_API_KEY` is correct
2. Verify `PAWAPAY_BASE_URL` matches environment
3. Check phone number format (+243XXXXXXXXX)
4. Verify amount is valid (> 0)

### **Problem: Provider detection wrong**

**Solution:**
1. Check phone number format
2. Verify prefix matches provider table
3. Check terminal logs for detected provider

---

## 📞 **Support**

If you encounter issues:
1. Check terminal logs (very detailed)
2. Check Pawa Pay dashboard for transaction status
3. Check Supabase logs for database errors
4. Review `webhook_logs` table in Supabase

---

**Ready to start testing?** Let me know when you've completed Step 1-3, and I'll create the test payment page for you!
