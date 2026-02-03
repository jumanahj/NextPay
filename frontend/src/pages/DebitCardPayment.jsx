import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";
import OTPVerification from "./OTPVerification";
import "../UI/DebitCardPayment.css";
import "../UI/PaymentMethods.css";

export default function DebitCardPayment({ request, customerId }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolderName, setCardHolderName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const validateDebitCardDetails = () => {
    const cardNumberRegex = /^\d{16}$/;
    const cvvRegex = /^\d{3}$/;
    if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
      return "All fields are required";
    }
    if (!cardNumberRegex.test(cardNumber))
      return "Card number must be 16 digits";
    if (!cvvRegex.test(cvv)) return "CVV must be 3 digits";
    return null;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const error = validateDebitCardDetails();
    if (error) {
      setError(error);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        customerId,
        orderId: request.order_id,
        amount: request.amount,
        paymentMethod: "debit_card",
      };

      console.log("[PAYMENT] Initiating debit payment:", payload);

      // Step 1: Initiate payment and get OTP
      const res = await axios.post(`${API_BASE}/api/pay/initiate`, payload);

      console.log("[PAYMENT] Initiate response:", res.data);

      if (res.data.success) {
        // Store OTP data and show verification page
        setOtpData({ transactionId: res.data.transactionId });
        setShowOTP(true);
        setSuccess("OTP sent to your registered mobile");
      } else {
        setError(res.data.message || "Failed to initiate payment");
      }
    } catch (err) {
      console.error("[PAYMENT] Initiation Error:", err);
      console.error("[PAYMENT] Error response:", err.response?.data);
      setError(err.response?.data?.message || "Payment initiation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showOTP && otpData ? (
        <OTPVerification
          transactionId={otpData.transactionId}
          orderId={request.order_id}
          amount={request.amount}
          paymentMethod="debit_card"
          customerId={customerId}
          cardDetails={{
            cardNumber,
            cardHolderName,
            expiryMonth,
            expiryYear,
            cvv,
          }}
          onSuccess={(result) => {
            setSuccess("✓ Payment successful!");
            setTimeout(() => navigate(`/customer/${customerId}`), 2000);
          }}
          onCancel={() => {
            setShowOTP(false);
            setOtpData(null);
            setError("");
            setSuccess("");
          }}
        />
      ) : (
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
      )}
    </>
  );
}