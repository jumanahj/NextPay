import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";
import OTPVerification from "./OTPVerification";
import "../UI/UPIPayment.css";
import "../UI/PaymentMethods.css";

export default function UPIPayment({ request, customerId, paymentMode }) {
  const [upiId, setUpiId] = useState("");
  const [mobile, setMobile] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otpData, setOtpData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const validateUPIPayment = () => {
    const upiIdRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+$/;
    const mobileRegex = /^\d{10}$/;
    if (!upiId || !mobile) {
      return "UPI ID and registered mobile are required";
    }
    if (!upiIdRegex.test(upiId)) return "Invalid UPI ID format";
    if (!mobileRegex.test(mobile)) return "Mobile number must be exactly 10 digits";
    return null;
  };

  const handlePay = async () => {
    const error = validateUPIPayment();
    if (error) {
      setMessage(error);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        customerId,
        orderId: request.order_id,
        amount: request.amount,
        paymentMethod: "upi",
      };

      console.log("[PAYMENT] Initiating UPI payment:", payload);

      // Step 1: Initiate payment and get OTP
      const res = await axios.post(`${API_BASE}/api/pay/initiate`, payload);

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
      setMessage(err.response?.data?.message || "Payment initiation failed");
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
          paymentMethod="upi"
          customerId={customerId}
          cardDetails={{ upiId, mobile }}
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
              Secure 128-bit encrypted payment with OTP verification
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
      )}
    </>
  );
}