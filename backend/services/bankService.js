/**
 * Bank API Service - Simulates Bank Server
 * Handles OTP generation, verification, and payment validation
 */

class BankService {
  constructor() {
    // In-memory OTP storage: { transactionId: { otp, expiresAt, verified } }
    this.otpStore = {};
  }

  /**
   * Generate OTP for transaction
   * @param {string} transactionId - Unique transaction identifier
   * @returns {object} { success, otp, expiresAt, message }
   */
  generateOTP(transactionId) {
    try {
      // Generate 6-digit OTP
      const otp = String(Math.floor(Math.random() * 900000) + 100000);
      
      // Set expiry to 2 minutes from now
      const expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes
      
      // Store OTP
      this.otpStore[transactionId] = {
        otp,
        expiresAt,
        verified: false,
        attempts: 0
      };
      
      console.log(`[BANK] OTP Generated for ${transactionId}`);
      
      return {
        success: true,
        expiresAt,
        message: "OTP sent to registered mobile"
      };
    } catch (err) {
      console.error("[BANK] OTP Generation Error:", err);
      return {
        success: false,
        message: "Failed to generate OTP"
      };
    }
  }

  /**
   * Validate payment request from Payment Gateway
   * @param {object} paymentData - Payment details
   * @returns {object} { success, transactionId, message }
   */
  validatePayment(paymentData) {
    try {
      const { customerId, orderId, amount } = paymentData;
      
      if (!customerId || !orderId || !amount) {
        return {
          success: false,
          message: "Invalid payment details"
        };
      }
      
      // Create unique transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log(`[BANK] Payment Validated: ${transactionId} for ₹${amount}`);
      
      // Generate OTP for this transaction
      this.generateOTP(transactionId);
      
      return {
        success: true,
        transactionId,
        message: "Payment validated. OTP sent."
      };
    } catch (err) {
      console.error("[BANK] Validation Error:", err);
      return {
        success: false,
        message: "Payment validation failed"
      };
    }
  }

  /**
   * Verify OTP submitted by user
   * @param {string} transactionId - Transaction identifier
   * @param {string} userOtp - OTP submitted by user
   * @returns {object} { success, message }
   */
  verifyOTP(transactionId, userOtp) {
    try {
      const otpRecord = this.otpStore[transactionId];
      
      if (!otpRecord) {
        return {
          success: false,
          message: "Transaction not found or OTP expired"
        };
      }
      
      // Check if OTP has expired
      if (Date.now() > otpRecord.expiresAt) {
        delete this.otpStore[transactionId];
        return {
          success: false,
          message: "OTP has expired. Please request a new one.",
          expired: true
        };
      }
      
      // Check OTP attempts (max 3 attempts)
      if (otpRecord.attempts >= 3) {
        delete this.otpStore[transactionId];
        return {
          success: false,
          message: "Maximum OTP attempts exceeded. Please try again later.",
          locked: true
        };
      }
      
      // Verify OTP
      if (otpRecord.otp === userOtp) {
        otpRecord.verified = true;
        console.log(`[BANK] OTP Verified for ${transactionId}`);
        return {
          success: true,
          message: "OTP verified successfully"
        };
      } else {
        otpRecord.attempts += 1;
        console.log(`[BANK] Invalid OTP for ${transactionId}. Attempts: ${otpRecord.attempts}`);
        return {
          success: false,
          message: `Invalid OTP. Attempts remaining: ${3 - otpRecord.attempts}`,
          attemptsRemaining: 3 - otpRecord.attempts
        };
      }
    } catch (err) {
      console.error("[BANK] OTP Verification Error:", err);
      return {
        success: false,
        message: "OTP verification failed"
      };
    }
  }

  /**
   * Complete payment (after OTP verification)
   * @param {string} transactionId - Transaction identifier
   * @returns {object} { success, message }
   */
  completePayment(transactionId) {
    try {
      const otpRecord = this.otpStore[transactionId];
      
      if (!otpRecord || !otpRecord.verified) {
        return {
          success: false,
          message: "Payment not authorized. OTP verification required."
        };
      }
      
      console.log(`[BANK] Payment Completed for ${transactionId}`);
      
      // Clean up OTP record after successful completion
      delete this.otpStore[transactionId];
      
      return {
        success: true,
        message: "Payment completed successfully"
      };
    } catch (err) {
      console.error("[BANK] Payment Completion Error:", err);
      return {
        success: false,
        message: "Payment completion failed"
      };
    }
  }

  /**
   * Resend OTP
   * @param {string} transactionId - Transaction identifier
   * @returns {object} { success, otp, message }
   */
  resendOTP(transactionId) {
    try {
      const otpRecord = this.otpStore[transactionId];
      
      if (!otpRecord) {
        return {
          success: false,
          message: "Transaction not found"
        };
      }
      
      // Reset attempts when resending
      otpRecord.attempts = 0;
      
      // Generate new OTP
      const newOtp = String(Math.floor(Math.random() * 900000) + 100000);
      otpRecord.otp = newOtp;
      otpRecord.expiresAt = Date.now() + 2 * 60 * 1000; // 2 minutes
      
      console.log(`[BANK] OTP Resent for ${transactionId}`);
      
      return {
        success: true,
        expiresAt: otpRecord.expiresAt,
        message: "New OTP sent to registered mobile"
      };
    } catch (err) {
      console.error("[BANK] OTP Resend Error:", err);
      return {
        success: false,
        message: "Failed to resend OTP"
      };
    }
  }
}

module.exports = new BankService();
