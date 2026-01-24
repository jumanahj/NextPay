const pool = require("./db");

async function createCustomer(customerName, email) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      "INSERT INTO customers (customer_name, email) VALUES (?, ?)",
      [customerName, email]
    );
    const customerIdNumeric = result.insertId;
    const customerId = "CUST" + String(customerIdNumeric).padStart(6, "0");

    await conn.execute(
      "UPDATE customers SET customer_id = ? WHERE id = ?",
      [customerId, customerIdNumeric]
    );

    await conn.commit();
    return { customerIdNumeric, customerId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { createCustomer };
