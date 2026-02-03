const express = require("express");
const router = express.Router();
const axios = require("axios");
const pool = require("../models/db");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Nodemailer transporter using credentials from environment variables
// Tip: app passwords may be copied with spaces; we strip whitespace automatically
const EMAIL_USER_RAW = process.env.BANK_EMAIL_USER || 'jjumanah2005@gmail.com';
const EMAIL_PASS_RAW = process.env.BANK_EMAIL_PASS || 'ldsdpvzociyhmmhw';
const EMAIL_USER = EMAIL_USER_RAW.trim();
const EMAIL_PASS = (EMAIL_PASS_RAW || '').toString().replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  }
});

let emailAvailable = true;
console.log(`[PAYMENT] Nodemailer transporter initialized with email: ${EMAIL_USER}`);

// Verify transporter credentials at startup (non-blocking) and set fallback flag
transporter.verify()
  .then(() => {
    console.log('[PAYMENT] Nodemailer transporter verified: ready to send emails');
    emailAvailable = true;
  })
  .catch((err) => {
    console.error('[PAYMENT] Nodemailer verification failed:', err && err.message ? err.message : err);
    console.error('[PAYMENT] Email sending disabled until credentials are fixed. Common fixes: set `BANK_EMAIL_USER` to your Gmail and `BANK_EMAIL_PASS` to the app-password (16 chars, no spaces).');
    emailAvailable = false;
  });

const OTP_DUMP_FILE = path.join(__dirname, '..', '..', 'backend_otp_dump.log');

/**
 * ============================================================
 * PAYMENT GATEWAY ROUTES - Professional Enterprise Version
 * ============================================================
 * Handles payment initiation, OTP verification, and fund transfers
 */

// ============================================================
// 1. PAYMENT INITIATION - /api/pay/initiate
// Generates secure OTP, stores hashed OTP in `otp_transactions`, and emails it
// ============================================================
router.post("/initiate", async (req, res) => {
  console.log("[PAYMENT] /initiate endpoint called");
  const { customerId, orderId, amount, paymentMethod, cardDetails } = req.body;
  console.log("[PAYMENT] Request body:", { customerId, orderId, amount, paymentMethod });

  try {
    if (!customerId || !orderId || !amount || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Missing required payment details" });
    }

    let conn;
    try {
      conn = await pool.getConnection();

      // Validate order
      const [orderRows] = await conn.execute(
        `SELECT receiving_merchant_id, status, amount as order_amount FROM requests WHERE order_id = ? LIMIT 1`,
        [orderId]
      );

      if (orderRows.length === 0) return res.status(404).json({ success: false, message: "Order not found" });
      if (orderRows[0].status === 'paid') return res.status(400).json({ success: false, message: "Order already paid" });

      const merchantId = orderRows[0].receiving_merchant_id;
      const orderAmount = orderRows[0].order_amount;

      // Get customer email
      const [customerRows] = await conn.execute(
        `SELECT customer_id, email FROM customers WHERE customer_user_id = ? LIMIT 1`,
        [customerId]
      );
      if (customerRows.length === 0) return res.status(404).json({ success: false, message: "Customer not found" });
      const customerEmail = customerRows[0].email;

      // CRITICAL: Check if PENDING transaction already exists for this orderId
      // This prevents creating multiple transactions for the same payment attempt
      const [existingOtp] = await conn.execute(
        `SELECT transaction_id FROM otp_transactions WHERE order_id = ? AND status IN ('PENDING', 'SUCCESS') LIMIT 1`,
        [orderId]
      );

      let transactionId;
      let isResend = false;

      if (existingOtp.length > 0) {
        // REUSE existing transactionId - customer clicked "Pay" again or this is a resend scenario
        transactionId = existingOtp[0].transaction_id;
        isResend = true;
        console.log(`[PAYMENT] Reusing existing transactionId for orderId ${orderId}: ${transactionId}`);
      } else {
        // Create NEW transactionId for this first payment attempt
        transactionId = String(Date.now() + Math.floor(Math.random() * 100000));
        console.log(`[PAYMENT] Creating new transactionId for orderId ${orderId}: ${transactionId}`);

        // Create transaction record without storing plaintext OTP
        await conn.execute(
          `INSERT INTO transactions (reference_number, order_id, payer_customer_id, payee_merchant_id, amount, payment_mode, transaction_status)
           VALUES (?, ?, ?, ?, ?, ?, 'OTP_PENDING')`,
          [transactionId, orderId, customerId, merchantId, orderAmount, paymentMethod]
        );
      }

      // Generate NEW OTP (fresh each time, whether new transaction or resend)
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // 10 minutes

      if (isResend) {
        // UPDATE existing otp_transactions row: new OTP, reset attempts, reset expiry
        await conn.execute(
          `UPDATE otp_transactions SET otp_hash = ?, attempts_left = 3, expires_at = ?, status = 'PENDING' WHERE transaction_id = ?`,
          [otpHash, expiresAt, transactionId]
        );
        console.log(`[PAYMENT] Resending OTP for existing transactionId ${transactionId}`);
      } else {
        // INSERT new otp_transactions row (first time for this orderId)
        await conn.execute(
          `INSERT INTO otp_transactions (transaction_id, order_id, customer_id, email, otp_hash, attempts_left, expires_at, status, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
          [transactionId, orderId, customerId, customerEmail, otpHash, 3, expiresAt, orderAmount]
        );
      }

      // Send OTP email from jjumanah2005@gmail.com to customer email
      const mailOptions = {
        from: 'jjumanah2005@gmail.com',
        to: customerEmail,
        subject: 'OTP for Secure Payment Verification',
        text: `Your OTP for payment is ${otp}. It is valid for 10 minutes. Never share this OTP with anyone. If you did not initiate this transaction, contact your bank immediately.`
      };

      console.log(`[PAYMENT] Sending OTP email to ${customerEmail}`);
      console.log(`[PAYMENT] Transporter config - User: ${process.env.BANK_EMAIL_USER || 'jjumanah2005@gmail.com'}`);
      
      try {
        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[PAYMENT] OTP email sent successfully: ${mailResult.messageId}`);
      } catch (mailErr) {
        // Log the failure
        console.error('[PAYMENT] OTP Email Error:', mailErr && mailErr.message ? mailErr.message : mailErr);
        console.error('[PAYMENT] Full error:', mailErr);

        // If email auth failed or transporter not available, persist OTP to server-side dump file
        try {
          const dumpLine = JSON.stringify({ time: new Date().toISOString(), transactionId, orderId, email: customerEmail, note: 'initiate', error: mailErr && mailErr.message ? mailErr.message : String(mailErr), otp });
          fs.appendFileSync(OTP_DUMP_FILE, dumpLine + '\n');
          console.warn(`[PAYMENT] OTP saved to server file: ${OTP_DUMP_FILE}`);
        } catch (dumpErr) {
          console.error('[PAYMENT] Failed to write OTP dump file:', dumpErr && dumpErr.message ? dumpErr.message : dumpErr);
        }

        // Keep DB record as PENDING, allow manual retrieval or retry after fixing credentials
        return res.json({ success: true, message: 'OTP could not be emailed; saved to server for retrieval. Fix email credentials to enable emailing.' , transactionId, orderId, expiresInSeconds: 600 });
      }

      // Return only transaction id and details - never return OTP
      return res.json({ success: true, message: 'OTP sent successfully. Please verify to complete payment.', transactionId, orderId, amount: orderAmount, expiresInSeconds: 600 });

    } finally {
      if (conn) conn.release();
    }

  } catch (err) {
    console.error('[PAYMENT] Initiation Error:', err.message);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
});

// ============================================================
// ============================================================
// 2. OTP VERIFICATION & PAYMENT PROCESSING - /api/pay/verify-otp
// Status transitions:
// - PENDING → PENDING (wrong OTP, attempts > 0)
// - PENDING → FAILED (wrong OTP, attempts reach 0)
// - PENDING → SUCCESS (correct OTP + payment success)
// - SUCCESS (already verified, payment done)
// - FAILED (transaction locked, no more attempts)
// ============================================================
router.post("/verify-otp", async (req, res) => {
  const { transactionId, otp } = req.body;

  try {
    if (!transactionId || !otp) return res.status(400).json({ success: false, message: 'Transaction ID and OTP required' });

    let conn;
    try {
      conn = await pool.getConnection();

      // Load OTP transaction
      const [otpRows] = await conn.execute(`SELECT * FROM otp_transactions WHERE transaction_id = ? LIMIT 1`, [transactionId]);
      if (otpRows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });
      const otpRecord = otpRows[0];

      // ===== STATUS: Already verified =====
      if (otpRecord.status === 'SUCCESS') {
        return res.json({ success: true, message: 'Payment already completed', transactionId, orderId: transactionId, amount: otpRecord.amount });
      }

      // ===== STATUS: Transaction locked (max attempts exceeded) =====
      if (otpRecord.status === 'FAILED') {
        return res.json({ success: false, message: 'Transaction locked. Maximum attempts exceeded. Please retry payment.', attemptsLeft: 0 });
      }

      // At this point, status must be PENDING
      // ===== CHECK: OTP expiry (does NOT change status to FAILED) =====
      const now = new Date();
      const expiresAtDate = new Date(otpRecord.expires_at);
      console.log(`[OTP] Checking expiry | Now: ${now.toISOString()} | ExpiresAt: ${expiresAtDate.toISOString()}`);
      
      if (expiresAtDate < now) {
        // OTP expired but status remains PENDING - user can resend
        console.log(`[OTP] OTP expired for transaction ${transactionId}`);
        return res.json({ success: false, message: 'OTP has expired. Please request a new OTP.', attemptsLeft: otpRecord.attempts_left });
      }

      // ===== CHECK: Attempts already exhausted =====
      if (otpRecord.attempts_left <= 0) {
        // Mark transaction as FAILED since no attempts left
        await conn.execute(`UPDATE otp_transactions SET status = 'FAILED' WHERE transaction_id = ?`, [transactionId]);
        console.log(`[OTP] Transaction locked due to 0 attempts | Transaction: ${transactionId}`);
        return res.json({ success: false, message: 'Transaction locked. Maximum attempts exceeded. Please retry payment.', attemptsLeft: 0 });
      }

      // ===== VERIFY OTP: Compare securely using bcrypt =====
      const match = await bcrypt.compare(otp, otpRecord.otp_hash);
      console.log(`[OTP] Comparing OTP for transaction ${transactionId} | Match: ${match}`);
      
      if (!match) {
        // OTP incorrect: decrement attempts but keep status PENDING
        const newAttempts = Math.max(0, otpRecord.attempts_left - 1);
        // Only mark FAILED if we're about to use the last attempt
        const willBeLocked = newAttempts === 0;
        const newStatus = willBeLocked ? 'FAILED' : 'PENDING';
        
        await conn.execute(`UPDATE otp_transactions SET attempts_left = ?, status = ? WHERE transaction_id = ?`, [newAttempts, newStatus, transactionId]);
        console.log(`[OTP] Invalid OTP | Attempts left: ${newAttempts} | Transaction now: ${newStatus}`);
        return res.json({ success: false, message: newAttempts === 0 ? 'Invalid OTP. Maximum attempts exceeded.' : 'Invalid OTP. Please try again.', attemptsLeft: newAttempts });
      }

      // ===== OTP CORRECT: Mark SUCCESS and process payment =====
      console.log(`[OTP] OTP verification successful for transaction ${transactionId}`);
      await conn.execute(`UPDATE otp_transactions SET status = 'SUCCESS' WHERE transaction_id = ?`, [transactionId]);

      // Proceed to perform the payment using existing transaction info
      const [txnRows] = await conn.execute(`SELECT * FROM transactions WHERE reference_number = ? LIMIT 1`, [transactionId]);
      if (txnRows.length === 0) {
        return res.status(404).json({ success: false, message: 'Payment transaction not found' });
      }
      const transaction = txnRows[0];

      // Process the actual payment (fund transfer)
      const paymentResult = await processPaymentTransaction(conn, {
        transactionId,
        customerId: transaction.payer_customer_id,
        orderId: transaction.order_id,
        amount: transaction.amount,
        paymentMethod: transaction.payment_mode,
        merchantId: transaction.payee_merchant_id
      });

      if (!paymentResult.success) {
        console.error(`[PAYMENT] Payment processing failed: ${paymentResult.message}`);
        await conn.execute(`UPDATE transactions SET transaction_status = 'failed' WHERE reference_number = ?`, [transactionId]);
        return res.json({ success: false, message: paymentResult.message });
      }

      // Mark transaction and request as paid
      await conn.execute(`UPDATE transactions SET transaction_status = 'success' WHERE reference_number = ?`, [transactionId]);
      await conn.execute(`UPDATE requests SET status = 'paid' WHERE order_id = ?`, [transaction.order_id]);
      console.log(`[PAYMENT] Payment successful | Transaction: ${transactionId} | Order: ${transaction.order_id} | Amount: ${transaction.amount}`);

      // Notify bank services non-blocking
      try { await axios.post("http://localhost:5000/bank/complete-payment", { transactionId }, { timeout: 4000 }); } catch (e) { /* ignore */ }

      return res.json({ success: true, message: 'Payment completed successfully', transactionId, orderId: transaction.order_id, amount: transaction.amount });

    } finally {
      if (conn) conn.release();
    }

  } catch (err) {
    console.error('[PAYMENT] OTP Verification Error:', err.message);
    return res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

// ============================================================
// 3. OTP RESEND - /api/pay/resend-otp
// ============================================================
// ============================================================
// 3. OTP RESEND - /api/pay/resend-otp
// Generates a new OTP, updates hash, resets attempts and expiry, and resends email
// ============================================================
router.post('/resend-otp', async (req, res) => {
  const { transactionId } = req.body;
  try {
    if (!transactionId) return res.status(400).json({ success: false, message: 'Transaction ID required' });

    let conn;
    try {
      conn = await pool.getConnection();
      const [otpRows] = await conn.execute(`SELECT * FROM otp_transactions WHERE transaction_id = ? LIMIT 1`, [transactionId]);
      if (otpRows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });

      const otpRecord = otpRows[0];

      // Generate new OTP and hash
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const newHash = await bcrypt.hash(newOtp, 10);
      const newExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      await conn.execute(`UPDATE otp_transactions SET otp_hash = ?, attempts_left = 3, expires_at = ?, status = 'PENDING' WHERE transaction_id = ?`, [newHash, newExpiry, transactionId]);

      // Send OTP email to customer
      const mailOptions = {
        from: 'jjumanah2005@gmail.com',
        to: otpRecord.email,
        subject: 'OTP for Secure Payment Verification',
        text: `Your new OTP for payment is ${newOtp}. It is valid for 1 minute. Never share this OTP with anyone.`
      };

      try {
        const mailResult = await transporter.sendMail(mailOptions);
        console.log(`[PAYMENT] Resend OTP email sent: ${mailResult.messageId}`);
        return res.json({ success: true, message: 'OTP resent successfully', expiresInSeconds: 600 });
      } catch (mailErr) {
        console.error('[PAYMENT] Resend OTP Email Error:', mailErr && mailErr.message ? mailErr.message : mailErr);

        // Dump OTP to server file for manual retrieval when email fails
        try {
          const dumpLine = JSON.stringify({ time: new Date().toISOString(), transactionId, orderId: otpRecord.order_id || otpRecord.orderId || null, email: otpRecord.email, note: 'resend', error: mailErr && mailErr.message ? mailErr.message : String(mailErr), otp: newOtp });
          fs.appendFileSync(OTP_DUMP_FILE, dumpLine + '\n');
          console.warn(`[PAYMENT] Resent OTP saved to server file: ${OTP_DUMP_FILE}`);
        } catch (dumpErr) {
          console.error('[PAYMENT] Failed to write OTP dump file:', dumpErr && dumpErr.message ? dumpErr.message : dumpErr);
        }

        return res.json({ success: true, message: 'OTP could not be emailed; saved to server for retrieval. Fix email credentials to enable emailing.', expiresInSeconds: 600 });
      }

    } finally {
      if (conn) conn.release();
    }

  } catch (err) {
    console.error('[PAYMENT] OTP Resend Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
});

// ============================================================
// HELPER FUNCTION: Process Payment Transaction (Fund Transfer)
// ============================================================
async function processPaymentTransaction(conn, data) {
  const { transactionId, customerId, orderId, amount, paymentMethod, merchantId, cardDetails } = data;

  try {
    console.log(`[PAYMENT] Processing fund transfer | Ref: ${transactionId}`);

    // Get customer account number
    const [custRows] = await conn.execute(
      `SELECT account_number FROM customers WHERE customer_user_id = ? LIMIT 1`,
      [customerId]
    );

    if (custRows.length === 0) {
      throw new Error("Customer account not found");
    }

    const customerAccountNumber = custRows[0].account_number;

    // Validate payment method and get customer account
    await validatePaymentMethod(conn, {
      paymentMethod,
      cardDetails,
      customerAccountNumber
    });

    // Get customer bank account
    const [custBankRows] = await conn.execute(
      `SELECT balance, account_status FROM bank_accounts WHERE account_number = ? LIMIT 1`,
      [customerAccountNumber]
    );

    if (custBankRows.length === 0) {
      throw new Error("Customer bank account not found");
    }

    if (custBankRows[0].account_status !== "active") {
      throw new Error("Customer bank account is inactive");
    }

    // Check sufficient balance
    if (Number(custBankRows[0].balance) < Number(amount)) {
      throw new Error(`Insufficient balance. Available: ${custBankRows[0].balance}, Required: ${amount}`);
    }

    // Get merchant account number
    const [merchantRows] = await conn.execute(
      `SELECT account_number FROM merchants WHERE merchant_user_id = ? LIMIT 1`,
      [merchantId]
    );

    if (merchantRows.length === 0) {
      throw new Error("Merchant account not found");
    }

    const merchantAccountNumber = merchantRows[0].account_number;

    // Get merchant bank account
    const [merchantBankRows] = await conn.execute(
      `SELECT account_status FROM bank_accounts WHERE account_number = ? LIMIT 1`,
      [merchantAccountNumber]
    );

    if (merchantBankRows.length === 0) {
      throw new Error("Merchant bank account not found");
    }

    if (merchantBankRows[0].account_status !== "active") {
      throw new Error("Merchant bank account is inactive");
    }

    // Perform fund transfer
    // Deduct from customer
    await conn.execute(
      `UPDATE bank_accounts SET balance = balance - ? WHERE account_number = ?`,
      [Number(amount), customerAccountNumber]
    );

    // Add to merchant
    await conn.execute(
      `UPDATE bank_accounts SET balance = balance + ? WHERE account_number = ?`,
      [Number(amount), merchantAccountNumber]
    );

    console.log(`[PAYMENT] Funds transferred | From: ${customerAccountNumber} | To: ${merchantAccountNumber} | Amount: ${amount}`);

    return { success: true, message: "Payment processed successfully" };

  } catch (err) {
    console.error(`[PAYMENT] Fund Transfer Error: ${err.message}`);
    return { success: false, message: err.message };
  }
}

// ============================================================
// HELPER FUNCTION: Validate Payment Method
// ============================================================
async function validatePaymentMethod(conn, data) {
  const { paymentMethod, cardDetails, customerAccountNumber } = data;

  if (!cardDetails) {
    throw new Error("Card details required");
  }

  switch (paymentMethod) {
    case "credit_card":
      const [creditCardRows] = await conn.execute(
        `SELECT account_number FROM credit_cards 
         WHERE card_number = ? AND account_number = ? LIMIT 1`,
        [cardDetails.cardNumber, customerAccountNumber]
      );

      if (creditCardRows.length === 0) {
        throw new Error("Credit card not found or does not belong to this customer");
      }
      break;

    case "debit_card":
      const [debitCardRows] = await conn.execute(
        `SELECT account_number FROM debit_cards 
         WHERE card_number = ? AND account_number = ? LIMIT 1`,
        [cardDetails.cardNumber, customerAccountNumber]
      );

      if (debitCardRows.length === 0) {
        throw new Error("Debit card not found or does not belong to this customer");
      }
      break;

    case "upi":
      const [upiRows] = await conn.execute(
        `SELECT account_number FROM upi_accounts 
         WHERE upi_id = ? AND account_number = ? LIMIT 1`,
        [cardDetails.upiId, customerAccountNumber]
      );

      if (upiRows.length === 0) {
        throw new Error("UPI ID not found or does not belong to this customer");
      }
      break;

    default:
      throw new Error("Invalid payment method");
  }
}

module.exports = router;
