const express = require("express");
const router = express.Router();
const db = require("../models/db");
const crypto = require("crypto");

router.get("/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

router.post("/merchant_login", async (req, res) => {
  const { merchant_user_id, password } = req.body;

  if (!merchant_user_id || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }

  try {
    const [rows] = await db.execute(
      `SELECT merchant_user_id, password
       FROM merchants
       WHERE merchant_user_id = ?`,
      [merchant_user_id]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid merchant ID or password" });
    }

    if (password !== rows[0].password) {
      return res
        .status(401)
        .json({ message: "Invalid merchant ID or password" });
    }

    res.json({
      message: "Merchant login successful",
      merchant_user_id: rows[0].merchant_user_id,
    });
  } catch (err) {
    console.error("Merchant login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:merchantUserId/transactions", async (req, res) => {
  const { merchantUserId } = req.params;

  if (!merchantUserId) {
    return res.status(400).json({ message: "Merchant User ID is required" });
  }

  try {
    const [rows] = await db.execute(
      `
      SELECT
        transaction_id,
        payer_customer_id,
        amount,
        payment_mode,
        transaction_status,
        transaction_time
      FROM transactions
      WHERE payee_merchant_id = ?
      ORDER BY transaction_time DESC
      `,
      [merchantUserId]
    );

    return res.status(200).json({
      merchantUserId,
      totalTransactions: rows.length,
      transactions: rows,
    });
  } catch (error) {
    console.error("Merchant transactions error:", error);
    return res.status(500).json({
      message: "Failed to fetch merchant transactions",
    });
  }
});

router.get("/:merchantId/customers", async (req, res) => {
  const { merchantId } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT 
        c.customer_user_id AS customer_id,
        c.customer_name,
        c.email,
        c.mobile_no
      FROM customer_merchant_assignments a
      JOIN customers c
        ON a.customer_id = c.customer_user_id
      WHERE a.merchant_id = ?
      `,
      [merchantId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Fetch assigned customers error:", err);
    res.status(500).json({ error: "Failed to fetch assigned customers" });
  }
});

router.post("/credit-card", async (req, res) => {
  const {
    referenceNumber,
    orderId,
    amount,
    customerId,
    paymentMode,
    cardNumber,
    cardHolderName,
    cvv,
    expiryMonth,
    expiryYear,
  } = req.body;

  if (
    !referenceNumber ||
    !orderId ||
    !amount ||
    !customerId ||
    !cardNumber ||
    !cardHolderName ||
    !cvv ||
    !expiryMonth ||
    !expiryYear
  ) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [cardRows] = await conn.execute(
      `
      SELECT linked_account_number, card_status, available_credit, expiry_month, expiry_year
      FROM credit_cards
      WHERE card_number = ?
        AND card_holder_name = ?
        AND cvv = ?
        AND card_status = 'active'
      `,
      [cardNumber, cardHolderName, cvv]
    );

    if (cardRows.length === 0) {
      throw new Error("Invalid or inactive credit card");
    }

    const card = cardRows[0];

    if (
      Number(expiryYear) !== card.expiry_year ||
      Number(expiryMonth) !== card.expiry_month
    ) {
      throw new Error("Credit card expired or incorrect expiry date");
    }

    if (Number(card.available_credit) < Number(amount)) {
      throw new Error("Insufficient credit limit");
    }

    const linkedAccount = card.linked_account_number;

    const [requestRows] = await conn.execute(
      `
      SELECT receiving_merchant_id
      FROM requests
      WHERE reference_number = ?
        AND status = 'not paid'
      `,
      [referenceNumber]
    );

    if (requestRows.length === 0) {
      throw new Error("Invalid or already paid request");
    }

    const merchantId = requestRows[0].receiving_merchant_id;

    const [merchantRows] = await conn.execute(
      `
      SELECT account_number
      FROM merchants
      WHERE merchant_user_id = ?
      `,
      [merchantId]
    );

    if (merchantRows.length === 0) {
      throw new Error("Merchant bank account not found");
    }

    const merchantAccountNumber = merchantRows[0].account_number;

    await conn.execute(
      `
      UPDATE credit_cards
      SET available_credit = available_credit - ?
      WHERE card_number = ?
      `,
      [amount, cardNumber]
    );

    await conn.execute(
      `
      UPDATE bank_accounts
      SET balance = balance + ?
      WHERE account_number = ?
      `,
      [amount, merchantAccountNumber]
    );

    await conn.execute(
      `
      INSERT INTO transactions (
        reference_number,
        order_id,
        payer_customer_id,
        payee_merchant_id,
        amount,
        payment_mode,
        transaction_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'success')
      `,
      [referenceNumber, orderId, customerId, merchantId, amount, "credit_card"]
    );

    await conn.execute(
      `
      UPDATE requests
      SET status = 'paid'
      WHERE reference_number = ?
      `,
      [referenceNumber]
    );

    await conn.commit();

    res.status(200).json({ message: "Credit card payment successful" });
  } catch (err) {
    await conn.rollback();
    console.error("Credit card payment error:", err.message);
    res.status(400).json({ message: err.message || "Payment failed" });
  } finally {
    conn.release();
  }
});

router.post("/upi", async (req, res) => {
  const {
    referenceNumber,
    orderId,
    amount,
    customerId,
    paymentMode,
    upiId,
    mobile,
  } = req.body;

  if (
    !referenceNumber ||
    !orderId ||
    !amount ||
    !customerId ||
    !upiId ||
    !mobile
  ) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [upiRows] = await conn.execute(
      `
      SELECT account_number
      FROM upi_accounts
      WHERE upi_id = ?
        AND registered_mobile_number = ?
        AND upi_status = 'active'
      `,
      [upiId, mobile]
    );

    if (upiRows.length === 0) {
      throw new Error("Invalid or inactive UPI ID");
    }

    const customerAccountNumber = upiRows[0].account_number;

    const [customerAcc] = await conn.execute(
      `
      SELECT balance
      FROM bank_accounts
      WHERE account_number = ?
      FOR UPDATE
      `,
      [customerAccountNumber]
    );

    if (customerAcc.length === 0) {
      throw new Error("Customer bank account not found");
    }

    if (Number(customerAcc[0].balance) < Number(amount)) {
      throw new Error("Insufficient balance");
    }

    const [requestRows] = await conn.execute(
      `
      SELECT receiving_merchant_id
      FROM requests
      WHERE reference_number = ?
        AND status = 'not paid'
      `,
      [referenceNumber]
    );

    if (requestRows.length === 0) {
      throw new Error("Invalid or already paid request");
    }

    const merchantId = requestRows[0].receiving_merchant_id;

    const [merchantRows] = await conn.execute(
      `
      SELECT account_number
      FROM merchants
      WHERE merchant_user_id = ?
      `,
      [merchantId]
    );

    if (merchantRows.length === 0) {
      throw new Error("Merchant bank account not found");
    }

    const merchantAccountNumber = merchantRows[0].account_number;

    await conn.execute(
      `
      UPDATE bank_accounts
      SET balance = balance - ?
      WHERE account_number = ?
      `,
      [amount, customerAccountNumber]
    );

    await conn.execute(
      `
      UPDATE bank_accounts
      SET balance = balance + ?
      WHERE account_number = ?
      `,
      [amount, merchantAccountNumber]
    );

    await conn.execute(
      `
      INSERT INTO transactions (
        reference_number,
        order_id,
        payer_customer_id,
        payee_merchant_id,
        amount,
        payment_mode,
        transaction_status
      )
      VALUES (?, ?, ?, ?, ?, ?, 'success')
      `,
      [
        referenceNumber,
        orderId,
        customerId,
        merchantId,
        amount,
        paymentMode || "upi",
      ]
    );

    await conn.execute(
      `
      UPDATE requests
      SET status = 'paid'
      WHERE reference_number = ?
      `,
      [referenceNumber]
    );

    await conn.commit();

    return res.status(200).json({
      message: "UPI payment successful",
    });
  } catch (error) {
    await conn.rollback();

    console.error("UPI payment error:", error.message);

    return res.status(400).json({
      message: error.message || "UPI payment failed",
    });
  } finally {
    conn.release();
  }
});

router.get("/:merchantId/requests", async (req, res) => {
  const { merchantId } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT 
        reference_number,
        sending_customer_id,
        order_id,
        amount,
        due_date,
        status,
        initialised_date
       FROM requests
       WHERE receiving_merchant_id = ?
       ORDER BY initialised_date DESC`,
      [merchantId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Fetch merchant requests error:", err);
    res.status(500).json({ message: "Failed to fetch payment requests" });
  }
});

router.post("/requests", async (req, res) => {
  const {
    sending_customer_id,
    receiving_merchant_id,
    order_id,
    amount,
    due_date,
  } = req.body;

  if (!sending_customer_id || !receiving_merchant_id || !amount || !due_date) {
    return res.status(400).json({ message: "Missing fields" });
  }

  if (isNaN(amount) || parseFloat(amount) <= 0) {
    return res.status(400).json({ message: "Invalid amount" });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO requests 
       (sending_customer_id, receiving_merchant_id, order_id, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'not paid')`,
      [
        sending_customer_id,
        receiving_merchant_id,
        order_id,
        parseFloat(amount),
        due_date,
      ]
    );

    res.status(201).json({
      message: "Request created",
      reference_number: result.insertId,
    });
  } catch (err) {
    console.error("Insert request failed:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  const { merchant, account } = req.body;

  if (
    !merchant ||
    !account ||
    !merchant.email ||
    !merchant.password ||
    !merchant.merchant_name ||
    !account.account_number
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [accountResult] = await connection.execute(
      `INSERT INTO accounts (
        usertype, bank_name, holder_name, account_number, ifsc_code,
        account_type, phone_number, registered_mobile_number,
        pan_number, permanent_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "merchant",
        account.bank_name,
        account.holder_name,
        account.account_number,
        account.ifsc_code,
        account.account_type,
        account.phone_number,
        account.registered_mobile_number,
        account.pan_number,
        account.permanent_address,
      ]
    );

    const accountId = accountResult.insertId;
    const merchantUserId =
      "MER-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    await connection.execute(
      `INSERT INTO merchants (
    merchant_user_id,
    merchant_name,
    business_name,
    business_domain,
    email,
    password,
    contact_person_name,
    contact_person_mobile,
    gst_number,
    account_id,
    account_number
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        merchantUserId,
        merchant.merchant_name,
        merchant.business_name,
        merchant.business_domain,
        merchant.email,
        merchant.password,
        merchant.contact_person_name,
        merchant.contact_person_mobile,
        merchant.gst_number,
        accountId,
        account.account_number,
      ]
    );

    await connection.commit();

    res.status(201).json({
      message: "Merchant created successfully",
      merchant_user_id: merchantUserId,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Merchant creation failed:", err);
    res.status(500).json({
      error: "Failed to create merchant",
      details: err.message,
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
