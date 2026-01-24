import React, { useState } from "react";
import axios from "axios";
import "../UI/UPIPayment.css";
import "../UI/PaymentMethods.css";

export default function UPIPayment({ request, customerId, paymentMode }) {
  const [upiId, setUpiId] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePay = async () => {
    if (!upiId || !mobile) {
      setMessage("UPI ID and registered mobile are required");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        "http://localhost:3000/api/merchants/upi",
        {
          referenceNumber: request.reference_number,
          orderId: request.order_id,
          amount: request.amount,
          customerId,
          paymentMode,
          upiId,
          mobile,
        }
      );

      setMessage(res.data.message || "Payment successful");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "UPI payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upi-payment-container">
      <h2>UPI Payment</h2>

      {/* Shared Order Info Style */}
      <div className="order-info-row">
        <p><strong>Order ID:</strong> {request.order_id}</p>
        <p><strong>Total:</strong> ₹{request.amount}</p>
      </div>

      <div className="upi-form-box">
        <div className="upi-header">
          <div className="upi-logo-badge">UPI</div>
          <p>Transfer money securely using your UPI ID</p>
        </div>

        <div className="input-field-group">
          <label>UPI ID</label>
          <input
            type="text"
            placeholder="username@bank / mobile@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
        </div>

        <div className="input-field-group">
          <label>Registered Mobile Number</label>
          <input
            type="text"
            placeholder="Enter 10-digit number"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        <div className="upi-security-note">
          <span className="lock-icon">🔒</span>
          Secure 128-bit encrypted payment
        </div>
      </div>

      <button className="pay-now-btn" onClick={handlePay} disabled={loading}>
        {loading ? "Processing..." : `Pay ₹${request.amount}`}
      </button>

      {/* Universal Status Modal */}
      {message && (
        <div className="status-modal-overlay">
          <div className="status-modal">
            <div className={`status-icon ${message.includes("failed") || message.includes("required") ? 'error' : 'success'}`}>
              {message.includes("failed") || message.includes("required") ? '✕' : '✓'}
            </div>
            <p>{message}</p>
            <button className="close-btn" onClick={() => setMessage("")}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
}