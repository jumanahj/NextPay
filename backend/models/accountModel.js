const pool = require("./db");

async function createCustomerAccounts(customerIdNumeric, accounts) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const acc of accounts) {
      const [result] = await conn.execute(
        `INSERT INTO customer_accounts
        (customer_id, bank_name, holder_name, account_number, ifsc_code,
         phone_number, registered_mobile, pan_number, account_type, permanent_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customerIdNumeric,
          acc.bankName,
          acc.holderName,
          acc.accountNumber,
          acc.ifscCode,
          acc.phoneNumber || null,
          acc.registeredMobile || null,
          acc.panNumber || null,
          acc.accountType || null,
          acc.permanentAddress || null,
        ]
      );

      const accountIdNumeric = result.insertId;
      const accountCode = "AUC" + String(accountIdNumeric).padStart(6, "0");

      await conn.execute(
        "UPDATE customer_accounts SET account_code = ? WHERE account_id = ?",
        [accountCode, accountIdNumeric]
      );
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { createCustomerAccounts };
