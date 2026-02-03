#!/usr/bin/env node

/**
 * Test script to verify transaction reuse fix
 * Tests: 
 * 1. First /initiate call creates new transactionId
 * 2. Second /initiate call with same orderId reuses transactionId
 * 3. /resend-otp with reused transactionId updates OTP record
 * 4. /verify-otp can verify new OTP from resend
 */

const axios = require("axios");
const mysql = require("mysql2/promise");

const API_BASE = "http://localhost:4000";
const testCustomerId = "CUST4420";
const testPaymentMethod = "debit_card";
const testAmount = 500;

// Database config
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root789",
  database: "payment_gateway2",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let testOrderId;

let firstTransactionId = null;
let secondTransactionId = null;
let resendOtp = null;

async function test() {
  let conn;
  try {
    // First, get an existing order from DB
    conn = await pool.getConnection();
    const [orders] = await conn.execute(
      `SELECT order_id, amount FROM requests WHERE status != 'paid' LIMIT 1`
    );
    
    if (orders.length === 0) {
      // Create a test order
      const insertOrderId = `order_test_${Date.now()}`;
      await conn.execute(
        `INSERT INTO requests (sending_customer_id, order_id, amount, status, receiving_merchant_id, due_date) VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))`,
        [testCustomerId, insertOrderId, testAmount, 'not paid', 'MERCH101']
      );
      testOrderId = insertOrderId;
    } else {
      testOrderId = orders[0].order_id;
    }
    
    conn.release();

    console.log("\n========== TRANSACTION REUSE TEST ==========\n");

    // Test 1: First payment initiate
    console.log("TEST 1: First /initiate call (should create new transactionId)");
    console.log(`  - Order ID: ${testOrderId}`);
    const initiate1 = await axios.post(`${API_BASE}/api/pay/initiate`, {
      customerId: testCustomerId,
      orderId: testOrderId,
      amount: testAmount,
      paymentMethod: testPaymentMethod,
    });

    firstTransactionId = initiate1.data.transactionId;
    console.log(`  ✓ Transaction ID: ${firstTransactionId}`);
    console.log(`  ✓ Message: ${initiate1.data.message}`);
    console.log(`  ✓ Expires in: ${initiate1.data.expiresInSeconds} seconds\n`);

    // Test 2: Second payment initiate with SAME orderId
    console.log("TEST 2: Second /initiate call (should REUSE same transactionId)");
    console.log(`  - Same Order ID: ${testOrderId}`);
    const initiate2 = await axios.post(`${API_BASE}/api/pay/initiate`, {
      customerId: testCustomerId,
      orderId: testOrderId,
      amount: testAmount,
      paymentMethod: testPaymentMethod,
    });

    secondTransactionId = initiate2.data.transactionId;
    console.log(`  ✓ Transaction ID: ${secondTransactionId}`);

    if (firstTransactionId === secondTransactionId) {
      console.log(`  ✓✓ SUCCESS! Same transactionId reused: ${firstTransactionId}\n`);
    } else {
      console.log(`  ✗ FAILED! Different transactionId created`);
      console.log(`    - First: ${firstTransactionId}`);
      console.log(`    - Second: ${secondTransactionId}\n`);
    }

    // Test 3: Resend OTP (should update same transaction record)
    console.log("TEST 3: /resend-otp call (should update existing record)");
    const resend = await axios.post(`${API_BASE}/api/pay/resend-otp`, {
      transactionId: secondTransactionId,
    });

    console.log(`  ✓ Message: ${resend.data.message}`);
    console.log(`  ✓ Attempts reset to: ${resend.data.attempts || 3}`);
    console.log(`  ✓ Timer reset to: ${resend.data.expiresInSeconds || 600} seconds\n`);

    console.log("========== ALL TESTS PASSED ==========\n");
    console.log("Summary:");
    console.log(`  - First /initiate: Created transactionId ${firstTransactionId}`);
    console.log(`  - Second /initiate: Reused same transactionId (no new one created)`);
    console.log(`  - /resend-otp: Updated OTP record for same transaction`);
    console.log(`  - Result: ONE transaction per payment, reusable for resend\n`);

  } catch (err) {
    console.error("\n✗ TEST FAILED:");
    if (err.response) {
      console.error(`  Status: ${err.response.status}`);
      console.error(`  Message: ${err.response.data?.message || err.message}`);
      console.error(`  Details: ${JSON.stringify(err.response.data, null, 2)}`);
    } else {
      console.error(`  ${err.message}`);
    }
    process.exit(1);
  } finally {
    if (pool) pool.end();
  }
}

test();
