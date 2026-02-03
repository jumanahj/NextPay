import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";
import OTPVerification from "./OTPVerification";
import "../UI/CreditCardPayment.css";

export default function CreditCardPayment({ request, customerId, paymentMode }) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const navigate = useNavigate();

  const validateCardDetails = () => {
    const cardNumberRegex = /^\d{16}$/;
    const cvvRegex = /^\d{3,4}$/;
    const expiryMonthNum = parseInt(expiryMonth);
    const expiryYearNum = parseInt(expiryYear);
    const currentYear = new Date().getFullYear();

    if (!cardNumberRegex.test(cardNumber)) return "Card number must be 16 digits";
    if (!cvvRegex.test(cvv)) return "CVV must be 3 or 4 digits";
    if (expiryMonthNum < 1 || expiryMonthNum > 12) return "Expiry month must be between 1 and 12";
    if (expiryYearNum < currentYear) return "Expiry year must be current or future";
    if (!cardHolder) return "Card holder name is required";
    return null;
};

  const handlePay = async () => {
    const error = validateCardDetails();
    if (error) {
        setMessage(error);
        return;
    }

    if (!cardNumber || !cardHolder || !cvv || !expiryMonth || !expiryYear) {
      setMessage("All credit card fields are required");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        customerId,
        orderId: request.order_id,
        amount: request.amount,
        paymentMethod: "credit_card",
      };
      
      console.log("[PAYMENT] Initiating payment:", payload);
      
      // Step 1: Initiate payment and get OTP
      const res = await axios.post(
        `${API_BASE}/api/pay/initiate`,
        payload
      );

      console.log("[PAYMENT] Initiate response:", res.data);

      if (res.data.success) {
        // Store OTP data and show verification page
        setOtpData({ transactionId: res.data.transactionId });
        setShowOTP(true);
        setMessage("OTP sent to your registered mobile");
      } else {
        setMessage(res.data.message || "Failed to initiate payment");
      }
    } catch (err) {
      console.error("[PAYMENT] Initiation Error:", err);
      console.error("[PAYMENT] Error response:", err.response?.data);
      setMessage(err.response?.data?.message || err.response?.data?.error || "Payment initiation failed");
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
          paymentMethod="credit_card"
          customerId={customerId}
          cardDetails={{
            cardNumber,
            cardHolderName: cardHolder,
            expiryMonth,
            expiryYear,
            cvv,
          }}
          onSuccess={(result) => {
            setMessage("✓ Payment successful!");
            setTimeout(() => navigate(`/customer/${customerId}`), 2000);
          }}
          onCancel={() => {
            setShowOTP(false);
            setOtpData(null);
            setMessage("");
          }}
        />
      ) : (
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
      )}
    </>
  );
}