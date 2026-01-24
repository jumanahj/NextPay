import React, { useState } from "react";
import axios from "axios";
import "../UI/CreditCardPayment.css";

export default function CreditCardPayment({ request, customerId, paymentMode }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handlePay = async () => {
    if (!cardNumber || !cardHolder || !cvv || !expiryMonth || !expiryYear) {
      setMessage("All credit card fields are required");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        "http://localhost:3000/api/customers/credit",
        {
          referenceNumber: request.reference_number,
          orderId: request.order_id,
          amount: request.amount,
          customerId,
          paymentMode: "credit_card",
          cardDetails: {
            cardNumber,
            cardHolderName: cardHolder,
            expiryMonth,
            expiryYear,
            cvv,
          },
        }
      );

      setMessage(res.data.message || "Payment successful");
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || "Credit card payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="credit-payment-wrapper">
      <h2>Credit Card Payment</h2>

      {/* Info Badges */}
      <div className="order-info-container">
        <p><strong>Order ID:</strong> {request.order_id}</p>
        <p><strong>Total:</strong> ₹{request.amount}</p>
      </div>

      {/* Realistic Card UI */}
      <div className="card-visual">
        <div className="gold-chip"></div>
        <div className="card-logo-text">CREDIT CARD</div>
        
        <div className="field-group">
          <label>Card Number</label>
          <input
            className="card-number-input"
            type="text"
            maxLength={16}
            placeholder="XXXX XXXX XXXX XXXX"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label>Card Holder Name</label>
          <input
            type="text"
            placeholder="FULL NAME"
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value)}
          />
        </div>

        <div className="card-bottom-row">
          <div className="field-group">
            <label>Expiry Date</label>
            <div className="expiry-input-wrapper">
              <input
                type="text"
                placeholder="MM"
                maxLength={2}
                value={expiryMonth}
                onChange={(e) => setExpiryMonth(e.target.value)}
              />
              <span>/</span>
              <input
                type="text"
                placeholder="YYYY"
                maxLength={4}
                value={expiryYear}
                onChange={(e) => setExpiryYear(e.target.value)}
              />
            </div>
          </div>
          
          <div className="field-group">
            <label>CVV</label>
            <input
              className="cvv-input"
              type="password"
              placeholder="***"
              maxLength={3}
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Payment Action */}
      <button 
        className="pay-now-btn" 
        onClick={handlePay} 
        disabled={loading}
      >
        {loading ? "Processing..." : `Pay ₹${request.amount}`}
      </button>

      {/* Success/Error Simulation Modal */}
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