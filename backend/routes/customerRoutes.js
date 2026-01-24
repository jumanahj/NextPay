const express = require("express");
const router = express.Router();
const pool = require("../models/db");
const bcrypt = require("bcrypt");

router.post("/credit", async (req, res) => {
  const {
    customerId,
    orderId,
    referenceNumber,
    amount,
    paymentMode,
    cardDetails,
  } = req.body;

  if (
    !customerId ||
    !orderId ||
    !referenceNumber ||
    !amount ||
    paymentMode !== "credit_card" ||
    !cardDetails?.cardNumber ||
    !cardDetails?.cvv ||
    !cardDetails?.expiryMonth ||
    !cardDetails?.expiryYear
  ) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [reqRows] = await conn.execute(
      `SELECT receiving_merchant_id, status FROM requests WHERE order_id = ?`,
      [orderId]
    );
    if (reqRows.length === 0) throw new Error("Order not found");
    if (reqRows[0].status === "paid") throw new Error("Already paid");
    const merchantId = reqRows[0].receiving_merchant_id;

    const [cardRows] = await conn.execute(
      `SELECT account_number FROM credit_cards 
       WHERE card_number = ? AND card_holder_name = ? AND cvv = ? AND expiry_month = ? AND expiry_year = ?`,
      [
        cardDetails.cardNumber,
        cardDetails.cardHolderName,
        cardDetails.cvv,
        Number(cardDetails.expiryMonth),
        Number(cardDetails.expiryYear),
      ]
    );

    if (cardRows.length === 0) throw new Error("Invalid card details");
    const customerAccountNumber = cardRows[0].account_number;

    const [custRows] = await conn.execute(
      `SELECT account_number FROM customers WHERE customer_user_id = ?`,
      [customerId]
    );

    if (custRows.length === 0) throw new Error("Customer not found");
    if (custRows[0].account_number !== customerAccountNumber)
      throw new Error("Card does not belong to customer");

    const [custAccRows] = await conn.execute(
      `SELECT * FROM bank_accounts WHERE account_number = ? AND account_status = 'active' FOR UPDATE`,
      [customerAccountNumber]
    );
    if (custAccRows.length === 0)
      throw new Error("Customer bank account inactive or missing");

    const customerAccount = custAccRows[0];

    if (Number(customerAccount.balance) < Number(amount)) {
      await conn.execute(
        `INSERT INTO transactions
        (reference_number, order_id, payer_customer_id, payee_merchant_id, amount, payment_mode, transaction_status)
        VALUES (?, ?, ?, ?, ?, ?, 'failed')`,
        [referenceNumber, orderId, customerId, merchantId, amount, paymentMode]
      );
      await conn.commit();
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    const [merchantRows] = await conn.execute(
      `SELECT account_number FROM merchants WHERE merchant_user_id = ?`,
      [merchantId]
    );
    if (merchantRows.length === 0) throw new Error("Merchant account missing");
    const merchantAccountNumber = merchantRows[0].account_number;

    const [merchantAccRows] = await conn.execute(
      `SELECT * FROM bank_accounts WHERE account_number = ? AND account_status = 'active' FOR UPDATE`,
      [merchantAccountNumber]
    );
    if (merchantAccRows.length === 0)
      throw new Error("Merchant bank account inactive");

    await conn.execute(
      `UPDATE bank_accounts SET balance = balance - ? WHERE account_number = ?`,
      [amount, customerAccountNumber]
    );

    await conn.execute(
      `UPDATE bank_accounts SET balance = balance + ? WHERE account_number = ?`,
      [amount, merchantAccountNumber]
    );

    await conn.execute(
      `INSERT INTO transactions
       (reference_number, order_id, payer_customer_id, payee_merchant_id, amount, payment_mode, transaction_status)
       VALUES (?, ?, ?, ?, ?, ?, 'success')`,
      [referenceNumber, orderId, customerId, merchantId, amount, paymentMode]
    );

    await conn.execute(`UPDATE requests SET status='paid' WHERE order_id=?`, [
      orderId,
    ]);

    await conn.commit();
    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("CREDIT ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get("/:customerId/requests", async (req, res) => {
  const { customerId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT 
         reference_number,
         receiving_merchant_id,
         order_id,
         amount,
         due_date,
         status,
         initialised_date
       FROM requests
       WHERE sending_customer_id = ?
       ORDER BY initialised_date DESC`,
      [customerId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch customer requests error:", err);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});

router.post("/customer_login", async (req, res) => {
  const { customer_user_id, password } = req.body;

  try {
    const [rows] = await pool.execute(
      "SELECT customer_user_id, password FROM customers WHERE customer_user_id = ?",
      [customer_user_id]
    );

    if (rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Invalid customer ID or password" });
    }

    const isValid = await bcrypt.compare(password, rows[0].password);

    if (!isValid) {
      return res
        .status(401)
        .json({ message: "Invalid customer ID or password" });
    }

    res.json({
      message: "Customer login successful",
      customer_user_id: rows[0].customer_user_id,
    });
  } catch (err) {
    console.error("Customer login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/", async (req, res) => {
  const {
    customer_name,
    email,
    mobile_no,
    account_number,
    customer_user_id,
    password,
    bank_name,
    holder_name,
    ifsc_code,
    account_type,
    registered_mobile_number,
    pan_number,
    permanent_address,
  } = req.body;

  if (
    !customer_name ||
    !email ||
    !mobile_no ||
    !account_number ||
    !customer_user_id ||
    !password
  ) {
    return res
      .status(400)
      .json({ error: "Missing required fields for customer registration" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (
      bank_name &&
      holder_name &&
      ifsc_code &&
      account_type &&
      registered_mobile_number &&
      pan_number &&
      permanent_address
    ) {
      await connection.execute(
        `INSERT INTO accounts 
        (usertype, bank_name, holder_name, account_number, ifsc_code, account_type, phone_number, registered_mobile_number, pan_number, permanent_address, balance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          "customer",
          bank_name,
          holder_name,
          account_number,
          ifsc_code,
          account_type,
          mobile_no,
          registered_mobile_number,
          pan_number,
          permanent_address,
          0.0,
        ]
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO customers 
      (customer_user_id, password, customer_name, email, mobile_no, account_number)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        customer_user_id,
        hashedPassword,
        customer_name,
        email,
        mobile_no,
        account_number,
      ]
    );

    await connection.commit();
    res
      .status(201)
      .json({ message: "Customer created successfully", customer_user_id });
  } catch (err) {
    await connection.rollback();
    console.error("Customer creation failed:", err);
    res
      .status(500)
      .json({ error: "Failed to create customer", details: err.message });
  } finally {
    connection.release();
  }
});

router.get("/request/:referenceNumber", async (req, res) => {
  const { referenceNumber } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM requests
       WHERE reference_number = ?`,
      [referenceNumber]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Request not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("Fetch request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/debit", async (req, res) => {
  const {
    customerId,
    orderId,
    referenceNumber,
    amount,
    paymentMode,
    cardDetails,
  } = req.body;

  if (
    !customerId ||
    !orderId ||
    !referenceNumber ||
    !amount ||
    paymentMode !== "debit_card" ||
    !cardDetails?.cardNumber ||
    !cardDetails?.cvv ||
    !cardDetails?.expiryMonth ||
    !cardDetails?.expiryYear
  ) {
    return res.status(400).json({ success: false, message: "Invalid request" });
  }

  let conn;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [reqRows] = await conn.execute(
      `SELECT receiving_merchant_id, status
       FROM requests
       WHERE order_id = ?`,
      [orderId]
    );

    if (reqRows.length === 0) throw new Error("Order not found");
    if (reqRows[0].status === "paid") throw new Error("Already paid");

    const merchantId = reqRows[0].receiving_merchant_id;

    const [cardRows] = await conn.execute(
      `SELECT account_number
       FROM debit_cards
       WHERE card_number = ?
         AND cvv = ?
         AND expiry_month = ?
         AND expiry_year = ?`,
      [
        cardDetails.cardNumber,
        cardDetails.cvv,
        Number(cardDetails.expiryMonth),
        Number(cardDetails.expiryYear),
      ]
    );

    if (cardRows.length === 0) throw new Error("Invalid card details");
    const customerAccountNumber = cardRows[0].account_number;

    const [custRows] = await conn.execute(
      `SELECT account_number
       FROM customers
       WHERE customer_user_id = ?`,
      [customerId]
    );

    if (custRows.length === 0) throw new Error("Customer not found");
    if (custRows[0].account_number !== customerAccountNumber)
      throw new Error("Card does not belong to customer");

    const [custAccRows] = await conn.execute(
      `SELECT *
       FROM bank_accounts
       WHERE account_number = ?
         AND account_status = 'active'
       FOR UPDATE`,
      [customerAccountNumber]
    );

    if (custAccRows.length === 0)
      throw new Error("Customer bank account inactive or missing");

    const customerAccount = custAccRows[0];

    if (Number(customerAccount.balance) < Number(amount)) {
      await conn.execute(
        `INSERT INTO transactions
         (reference_number, order_id, payer_customer_id, payee_merchant_id,
          amount, payment_mode, transaction_status)
         VALUES (?, ?, ?, ?, ?, ?, 'failed')`,
        [referenceNumber, orderId, customerId, merchantId, amount, paymentMode]
      );
      await conn.commit();
      return res
        .status(400)
        .json({ success: false, message: "Insufficient balance" });
    }

    const [merchantRows] = await conn.execute(
      `SELECT account_number
       FROM merchants
       WHERE merchant_user_id = ?`,
      [merchantId]
    );

    if (merchantRows.length === 0) throw new Error("Merchant account missing");
    const merchantAccountNumber = merchantRows[0].account_number;

    const [merchantAccRows] = await conn.execute(
      `SELECT *
       FROM bank_accounts
       WHERE account_number = ?
         AND account_status = 'active'
       FOR UPDATE`,
      [merchantAccountNumber]
    );

    if (merchantAccRows.length === 0)
      throw new Error("Merchant bank account inactive");

    await conn.execute(
      `UPDATE bank_accounts
       SET balance = balance - ?
       WHERE account_number = ?`,
      [amount, customerAccountNumber]
    );

    await conn.execute(
      `UPDATE bank_accounts
       SET balance = balance + ?
       WHERE account_number = ?`,
      [amount, merchantAccountNumber]
    );

    await conn.execute(
      `INSERT INTO transactions
       (reference_number, order_id, payer_customer_id, payee_merchant_id,
        amount, payment_mode, transaction_status)
       VALUES (?, ?, ?, ?, ?, ?, 'success')`,
      [referenceNumber, orderId, customerId, merchantId, amount, paymentMode]
    );

    await conn.execute(`UPDATE requests SET status='paid' WHERE order_id=?`, [
      orderId,
    ]);

    await conn.commit();
    res.json({ success: true, message: "Payment successful" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("DEBIT ERROR:", err.message);
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
