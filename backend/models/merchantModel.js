const pool = require("./db");

async function insertMerchantWithAccounts(merchantDetails, accounts) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [merchantDetails.email.trim()]
    );

    if (existing.length > 0) {
      throw new Error("Email already registered");
    }

    const [userResult] = await connection.execute(
      `INSERT INTO users (user_type, name, email) VALUES (?, ?, ?)`,
      [
        "MERCHANT",
        merchantDetails.merchantName.trim(),
        merchantDetails.email.trim()
      ]
    );

    const userIdNumeric = userResult.insertId;
    const userCode = "USR" + String(userIdNumeric).padStart(6, "0");

    await connection.execute(
      `UPDATE users SET user_code = ? WHERE user_id = ?`,
      [userCode, userIdNumeric]
    );

    console.log("Created user ID:", userIdNumeric, "Code:", userCode);

    const [merchantResult] = await connection.execute(
      `INSERT INTO merchants 
       (user_id, business_name, business_domain, contact_person_name, 
        contact_person_mobile, gst_number) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userIdNumeric,
        merchantDetails.businessName?.trim() || '',
        merchantDetails.businessDomain?.trim() || '',
        merchantDetails.contactPersonName?.trim() || null,
        merchantDetails.contactPersonMobile?.trim() || null,
        merchantDetails.gstNumber?.trim() || null
      ]
    );

    const merchantIdNumeric = merchantResult.insertId;
    const merchantCode = "MERC" + String(merchantIdNumeric).padStart(6, "0");

    await connection.execute(
      `UPDATE merchants SET merchant_code = ? WHERE merchant_id = ?`,
      [merchantCode, merchantIdNumeric]
    );

    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      if (!acc.bankName?.trim() || !acc.accountNumber?.trim()) {
        throw new Error(`Account ${i+1}: Bank name and account number required`);
      }

      const [accountResult] = await connection.execute(
        `INSERT INTO accounts
         (user_id, bank_name, holder_name, account_number, phone_number,
          pan_number, ifsc_code, account_type, registered_mobile,
          kyc_status, account_status, permanent_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userIdNumeric,
          acc.bankName.trim(),
          acc.holderName?.trim() || null,
          acc.accountNumber.trim(),
          acc.phoneNumber?.trim() || null,
          acc.panNumber?.trim() || null,
          acc.ifscCode?.trim() || null,
          acc.accountType?.trim() || null,
          acc.registeredMobile?.trim() || null,
          acc.kycStatus?.trim() || 'PENDING',
          acc.accountStatus?.trim() || 'ACTIVE',
          acc.permanentAddress?.trim() || null
        ]
      );

      const accountIdNumeric = accountResult.insertId;
      const accountCode = "AUC" + String(accountIdNumeric).padStart(6, "0");

      await connection.execute(
        `UPDATE accounts SET account_code = ? WHERE account_id = ?`,
        [accountCode, accountIdNumeric]
      );
    }

    await connection.commit();
    return userIdNumeric;
  } catch (err) {
    await connection.rollback();
    console.error("Transaction error:", err);
    throw new Error(err.message);
  } finally {
    connection.release();
  }
}

module.exports = { insertMerchantWithAccounts };
