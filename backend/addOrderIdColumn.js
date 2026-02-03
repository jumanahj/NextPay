const pool = require("./models/db");

async function addOrderIdColumn() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // First, check if order_id column exists
    const [columns] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='otp_transactions' AND COLUMN_NAME='order_id'`
    );
    
    if (columns.length > 0) {
      console.log("✓ order_id column already exists in otp_transactions");
    } else {
      console.log("Adding order_id column to otp_transactions table...");
      await conn.execute(`
        ALTER TABLE otp_transactions 
        ADD COLUMN order_id VARCHAR(50) NULL AFTER transaction_id
      `);
      console.log("✓ order_id column added successfully");
    }
    
    // Also add an index on (order_id, status) for faster lookups
    console.log("Adding index on (order_id, status)...");
    try {
      await conn.execute(`
        CREATE INDEX idx_order_status ON otp_transactions(order_id, status)
      `);
      console.log("✓ Index created");
    } catch (err) {
      if (err.message.includes("Duplicate key")) {
        console.log("✓ Index already exists");
      } else {
        throw err;
      }
    }
    
    process.exit(0);
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

addOrderIdColumn();
