import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { useNavigate } from "react-router-dom";
import "../UI/OTPVerification.css";

const OTPVerification = ({ 
  transactionId, 
  orderId, 
  amount, 
  paymentMethod,
  customerId,
  cardDetails,
  onSuccess,
  onCancel
}) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [attempts, setAttempts] = useState(3);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', null
  const [statusData, setStatusData] = useState(null);
  const navigate = useNavigate();

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle OTP input
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setError("");
  };

  // Verify OTP
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(`${API_BASE}/api/pay/verify-otp`, { transactionId, otp });

      if (response.data.success) {
        // Show payment status page
        setPaymentStatus("success");
        setStatusData(response.data);
        console.log("[PAYMENT] Payment successful - showing status");

        // Auto redirect after 3 seconds
        setTimeout(() => {
          if (onSuccess) {
            onSuccess(response.data);
          } else {
            navigate(`/customer/${customerId}`, {
              state: { 
                message: "Payment successful!",
                transactionId: response.data.transactionId
              }
            });
          }
        }, 3000);
      } else {
        setError(response.data.message || "OTP verification failed");
        const serverAttempts = typeof response.data.attemptsLeft === 'number' ? response.data.attemptsLeft : attempts - 1;
        setAttempts(serverAttempts);
        if (serverAttempts === 0) setError("Maximum attempts exceeded. Please request a new OTP.");
      }
    } catch (err) {
      console.error("[OTP] Verification Error:", err);
      
      // Show payment failure status
      setPaymentStatus("failed");
      setStatusData({ message: err.response?.data?.message || "Payment verification failed", error: err.response?.data?.error });

      setError(err.response?.data?.message || "OTP verification failed");
      const serverAttempts = typeof err.response?.data?.attemptsLeft === 'number' ? err.response.data.attemptsLeft : attempts - 1;
      setAttempts(serverAttempts);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      console.log("[OTP] Resending OTP for:", transactionId);

      const response = await axios.post(`${API_BASE}/api/pay/resend-otp`, {
        transactionId
      });

      if (response.data.success) {
        setMessage("✓ New OTP sent");
        setOtp("");
        setAttempts(3); // Reset attempts
        setTimeLeft(600); // Reset timer (10 minutes)
      } else {
        setError(response.data.message || "Failed to resend OTP");
      }
    } catch (err) {
      console.error("[OTP] Resend Error:", err);
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Check if OTP expired
  const isExpired = timeLeft === 0;

  // Payment Status Display Component
  if (paymentStatus === "success") {
    return (
      <div className="otp-verification-container">
        <div className="otp-card">
          <div className="payment-status-success">
            <div className="status-icon-large" style={{
              fontSize: "64px",
              marginBottom: "16px",
              animation: "scaleIn 0.6s ease-out"
            }}>
              ✅
            </div>

            <h2 style={{
              color: "#4caf50",
              fontSize: "28px",
              marginBottom: "8px"
            }}>
              Payment Successful!
            </h2>

            <p style={{
              color: "#666",
              fontSize: "16px",
              marginBottom: "24px"
            }}>
              Your payment has been processed successfully
            </p>

            {statusData && (
              <div style={{
                backgroundColor: "#f5f5f5",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "24px",
                border: "1px solid #e0e0e0"
              }}>
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ margin: "0 0 4px 0", color: "#999", fontSize: "12px" }}>Transaction ID</p>
                  <p style={{ margin: "0", color: "#333", fontSize: "14px", fontWeight: "bold" }}>
                    {statusData.transactionId}
                  </p>
                </div>
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ margin: "0 0 4px 0", color: "#999", fontSize: "12px" }}>Order ID</p>
                  <p style={{ margin: "0", color: "#333", fontSize: "14px", fontWeight: "bold" }}>
                    {statusData.orderId}
                  </p>
                </div>
                <div>
                  <p style={{ margin: "0 0 4px 0", color: "#999", fontSize: "12px" }}>Amount</p>
                  <p style={{ margin: "0", color: "#4caf50", fontSize: "16px", fontWeight: "bold" }}>
                    ₹{statusData.amount}
                  </p>
                </div>
              </div>
            )}

            <div style={{
              backgroundColor: "#e8f5e9",
              border: "1px solid #4caf50",
              borderRadius: "4px",
              padding: "12px",
              marginBottom: "24px",
              color: "#2e7d32",
              textAlign: "center"
            }}>
              ⏱ Redirecting to dashboard in 3 seconds...
            </div>

            <button
              className="btn-verify"
              onClick={() => navigate(`/customer/${customerId}`, {
                state: { message: "Payment successful!" }
              })}
              style={{
                backgroundColor: "#4caf50",
                width: "100%"
              }}
            >
              Go to Dashboard Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Payment Failed Status Display Component
  if (paymentStatus === "failed") {
    return (
      <div className="otp-verification-container">
        <div className="otp-card">
          <div className="payment-status-failed">
            <div className="status-icon-large" style={{
              fontSize: "64px",
              marginBottom: "16px"
            }}>
              ❌
            </div>

            <h2 style={{
              color: "#d32f2f",
              fontSize: "28px",
              marginBottom: "8px"
            }}>
              Payment Failed
            </h2>

            <p style={{
              color: "#666",
              fontSize: "16px",
              marginBottom: "24px"
            }}>
              {statusData?.message || "Your payment could not be processed"}
            </p>

            {statusData?.error && (
              <div style={{
                backgroundColor: "#ffebee",
                border: "1px solid #ef5350",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "24px",
                color: "#c62828",
                fontSize: "14px"
              }}>
                {statusData.error}
              </div>
            )}

            <div style={{
              display: "flex",
              gap: "12px"
            }}>
              <button
                className="btn-verify"
                onClick={() => {
                  setPaymentStatus(null);
                  setStatusData(null);
                  setOtp("");
                  setError("");
                }}
                style={{
                  flex: 1,
                  backgroundColor: "#ff9800"
                }}
              >
                Try Again
              </button>

              <button
                className="btn-cancel"
                onClick={onCancel || (() => navigate(-1))}
                style={{
                  flex: 1
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // OTP Input Form
  return (
    <div className="otp-verification-container">
      <div className="otp-card">
        <div className="otp-header">
          <h1>🔒 Verify OTP</h1>
          <p>Secure OTP Authentication</p>
        </div>

        <div className="transaction-details">
          <div className="detail-row">
            <span className="label">Order ID:</span>
            <span className="value">{orderId}</span>
          </div>
          <div className="detail-row">
            <span className="label">Amount:</span>
            <span className="value">₹{amount}</span>
          </div>
          <div className="detail-row">
            <span className="label">Method:</span>
            <span className="value" style={{ textTransform: "capitalize" }}>
              {paymentMethod.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="otp-input-section">
          <label>Enter 6-Digit OTP</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength="6"
            value={otp}
            onChange={handleOtpChange}
            placeholder="000000"
            className="otp-input"
            disabled={isExpired || loading}
          />
        </div>

        

        <div className="otp-info">
          <div className="timer" style={{ color: timeLeft < 30 ? "#d32f2f" : "#666" }}>
            ⏱ {formatTime(timeLeft)} remaining
          </div>
          <div className="attempts">
            Attempts remaining: {attempts}
          </div>
        </div>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="otp-actions">
          <button
            className="btn-verify"
            onClick={handleVerifyOTP}
            disabled={loading || isExpired || otp.length !== 6}
          >
            {loading ? "Processing..." : "Verify OTP"}
          </button>

          <button
            className="btn-cancel"
            onClick={onCancel || (() => navigate(-1))}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        <div className="otp-footer">
          {isExpired ? (
            <p className="expired-text">OTP has expired. Please request a new OTP.</p>
          ) : (
            <>
              <p>Didn't receive OTP?</p>
              <button
                className="btn-resend"
                onClick={handleResendOTP}
                disabled={loading || isExpired}
              >
                Resend OTP
              </button>
            </>
          )}
        </div>

        <div className="security-note">
          <p>🔐 Never share your OTP with anyone. Your bank will never ask for OTP.</p>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
