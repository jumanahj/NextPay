const pool = require("./models/db");

async function addOtpColumn() {
  const conn = await pool.getConnection();
  try {
    console.log("Adding otp_code column to transactions table...");
    await conn.execute(`
      ALTER TABLE transactions 
      ADD COLUMN otp_code VARCHAR(10) NULL 
      AFTER transaction_status
    `);
    console.log("✓ otp_code column added successfully");
  } catch (err) {
    if (err.message.includes("Duplicate column")) {
      console.log("✓ otp_code column already exists");
    } else {
      console.error("✗ Error:", err.message);
    }
  } finally {
    conn.release();
    process.exit(0);
  }
}

addOtpColumn();
