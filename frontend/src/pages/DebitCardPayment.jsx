import React, { useState } from "react";
import axios from "axios";
import "../UI/DebitCardPayment.css";
import "../UI/PaymentMethods.css";

export default function DebitCardPayment({ request, customerId }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePayment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
      setError("All fields are required");
      return;
    }

    if (cardNumber.length !== 16 || cvv.length !== 3) {
      setError("Invalid card details");
      return;
    }

    setLoading(true);

    try {
      const reqRes = await axios.get(
        `http://localhost:3000/api/customers/request/${request.reference_number}`
      );

      const merchantId = reqRes.data?.receiving_merchant_id;

      if (!merchantId) {
        setError("Merchant account missing");
        setLoading(false);
        return;
      }

      const payload = {
        customerId,
        referenceNumber: request.reference_number,
        orderId: request.order_id,
        amount: request.amount,
        paymentMode: "debit_card",
        cardDetails: {
          cardNumber,
          cardHolderName,
          expiryMonth,
          expiryYear,
          cvv,
        },
      };

      const res = await axios.post(
        "http://localhost:3000/api/customers/debit",
        payload
      );

      if (res.data.success) {
        setSuccess("Payment successful!");
        request.status = "paid";
        sessionStorage.removeItem("paymentData");
      } else {
        setError(res.data.message || "Payment failed");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Payment failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Debit Card Payment</h2>

      {/* Aligned Order Info Row */}
      <div className="order-info-row">
        <p><strong>Order ID:</strong> {request.order_id}</p>
        <p><strong>Total:</strong> ₹{request.amount}</p>
      </div>

      <div className={`card-inner ${isFlipped ? "is-flipped" : ""}`}>
        {/* Front Side */}
        <div className="card-face card-front">
          <div className="card-chip"></div>
          <div className="card-logo">DEBIT CARD</div>

          <div className="card-field number-field">
            <label>Card Number</label>
            <input
              type="text"
              placeholder="XXXX XXXX XXXX XXXX"
              maxLength={16}
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
            />
          </div>

          <div className="card-bottom-row">
            <div className="card-field">
              <label>Card Holder</label>
              <input
                type="text"
                placeholder="NAME ON CARD"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
              />
            </div>

            <div className="card-field">
              <label>Expiry Date</label>
              <div className="expiry-inputs">
                <input
                  type="text"
                  placeholder="MM"
                  maxLength={2}
                  value={expiryMonth}
                  onChange={(e) => setExpiryMonth(e.target.value)}
                />
                <span style={{ color: "white", padding: "0 2px" }}>/</span>
                <input
                  type="text"
                  placeholder="YYYY"
                  maxLength={4}
                  value={expiryYear}
                  onChange={(e) => setExpiryYear(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Back Side */}
        <div className="card-face card-back">
          <div className="magnetic-strip"></div>
          <div className="signature-bar">
            <input
              type="password"
              placeholder="CVV"
              maxLength={3}
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              className="cvv-field"
            />
          </div>
          <div className="back-info">AUTHORIZED SIGNATURE</div>
        </div>
      </div>

      <button
        type="button"
        className="flip-btn"
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        {isFlipped ? "View Card Front" : "View Card Back (CVV)"}
      </button>

      <form onSubmit={handlePayment}>
        {/* Modal Overlay for Status Messages */}
        {(error || success) && (
          <div className="status-modal-overlay">
            <div className="status-modal">
              <div className={`status-icon ${error ? "error" : "success"}`}>
                {error ? "✕" : "✓"}
              </div>
              <p style={{ color: error ? "#dc3545" : "#28a745" }}>
                {error || success}
              </p>
              <button 
                className="close-btn" 
                type="button" 
                onClick={() => { setError(""); setSuccess(""); }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          className="pay-now-btn"
          disabled={loading}
        >
          {loading ? "Processing..." : `Pay ₹${request.amount}`}
        </button>
      </form>
    </div>
  );
}