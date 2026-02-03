const mysql = require("mysql2/promise");
const axios = require("axios");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root789",
  database: "payment_gateway2",
});

async function test() {
  try {
    // Get first order
    const conn = await pool.getConnection();
    const [orders] = await conn.execute(`SELECT * FROM requests LIMIT 1`);
    console.log("Sample order:", orders[0]);
    
    if (orders.length === 0) {
      console.log("No orders found, creating test order...");
      await conn.execute(
        `INSERT INTO requests (order_id, amount, status, receiving_merchant_id) VALUES (?, ?, ?, ?)`,
        [`test_order_${Date.now()}`, 500, 'pending', 'MERCH101']
      );
      const [newOrder] = await conn.execute(`SELECT * FROM requests ORDER BY order_id DESC LIMIT 1`);
      console.log("Created order:", newOrder[0]);
    }
    
    const orderId = orders[0]?.order_id || `test_order_${Date.now()}`;
    conn.release();

    console.log("\nCalling /api/pay/initiate with:", { customerId: 'CUST4420', orderId, amount: 500 });
    
    try {
      const response = await axios.post("http://localhost:4000/api/pay/initiate", {
        customerId: "CUST4420",
        orderId: orderId,
        amount: 500,
        paymentMethod: "debit_card"
      });
      console.log("SUCCESS:", response.data);
    } catch (err) {
      console.log("ERROR Response Status:", err.response?.status);
      console.log("ERROR Response Data:", err.response?.data);
      console.log("ERROR Message:", err.message);
      if (err.code) console.log("Error code:", err.code);
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Test error:", err.message);
    process.exit(1);
  }
}

test();
