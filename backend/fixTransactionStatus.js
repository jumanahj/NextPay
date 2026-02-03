const pool = require("./models/db");

async function fixTransactionStatus() {
  const conn = await pool.getConnection();
  try {
    console.log("Updating transaction_status ENUM...");
    await conn.execute(`
      ALTER TABLE transactions 
      MODIFY COLUMN transaction_status ENUM(
        'initiated',
        'OTP_PENDING',
        'success',
        'failed',
        'reversed'
      ) DEFAULT 'initiated'
    `);
    console.log("✓ transaction_status ENUM updated successfully");
  } catch (err) {
    console.error("✗ Error:", err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

fixTransactionStatus();
