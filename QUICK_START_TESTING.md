# 🚀 Quick Start: Pawa Pay Testing

## **Immediate Next Steps** (Do these NOW)

### **1. Install ngrok** (if testing locally)
```bash
# Mac
brew install ngrok

# Or download from https://ngrok.com/download
```

### **2. Start ngrok**
```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

---

### **3. Configure Pawa Pay Sandbox**

**A. Set Callback URL:**
1. Go to: https://dashboard.sandbox.pawapay.io/#/system/callback-url
2. Enter for **Deposits**: `https://YOUR-NGROK-URL.ngrok.io/api/webhooks/pawapay`
3. Click **Save**

**B. Generate API Token:**
1. Go to: https://dashboard.sandbox.pawapay.io/#/system/api-token
2. Click **"Generate token"**
3. **COPY IT IMMEDIATELY** (you won't see it again!)

---

### **4. Update .env.local**

```env
# Payment Provider
PAYMENT_PROVIDER=pawapay

# Pawa Pay Sandbox
PAWAPAY_API_KEY=YOUR_COPIED_TOKEN_HERE
PAWAPAY_BASE_URL=https://api.sandbox.pawapay.io
PAWAPAY_WEBHOOK_SECRET=
```

---

### **5. Restart Dev Server**

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

---

### **6. Open Test Page**

```
http://localhost:3000/test-payment
```

---

### **7. Run First Test**

1. Enter your DRC mobile number: `+243XXXXXXXXX`
2. Amount: `1` (USD)
3. Click **"Initiate Payment"**
4. Check your phone for payment prompt
5. **APPROVE** the payment
6. Click **"Check Status"**
7. Watch terminal logs!

---

## **Expected Terminal Output**

### **When you initiate payment:**
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

### **When webhook is received:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 [Webhook] PAWA PAY WEBHOOK RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Webhook signature validated
📦 Parsed Webhook Data:
   Transaction ID: TEST-2026-...-1712345678
   Status: Confirmed
   Amount: $1 USD
💰 Payment confirmed - updating application status...
✅ Webhook processed successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## **Troubleshooting**

### **❌ "Payment initiation failed"**
- Check `PAWAPAY_API_KEY` is correct
- Verify `PAYMENT_PROVIDER=pawapay` in .env.local
- Restart dev server after changing .env.local

### **❌ "Webhook not received"**
- Check ngrok is running
- Verify callback URL in Pawa Pay dashboard includes `/api/webhooks/pawapay`
- Check ngrok URL hasn't changed (it changes on restart)

### **❌ "Invalid signature"**
- Leave `PAWAPAY_WEBHOOK_SECRET` empty for now (sandbox)
- Webhook validation will skip if no secret configured

---

## **Testing Checklist**

- [ ] ngrok installed and running
- [ ] Callback URL configured in Pawa Pay Sandbox
- [ ] API token generated and copied
- [ ] .env.local updated with token
- [ ] Dev server restarted
- [ ] Test page opens at /test-payment
- [ ] Payment initiated successfully
- [ ] Phone received payment prompt
- [ ] Payment approved on phone
- [ ] Webhook received in terminal
- [ ] Status check shows "Confirmed"

---

## **What to Tell Me**

After completing the steps above, tell me:

1. ✅ "ngrok is running at https://abc123.ngrok.io"
2. ✅ "Callback URL configured"
3. ✅ "API token added to .env.local"
4. ✅ "Server restarted"
5. Then I'll guide you through the actual payment test!

---

**Ready? Start with Step 1!** 🚀
