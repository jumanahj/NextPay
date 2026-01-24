import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DebitCardPayment from "./DebitCardPayment";
import CreditCardPayment from "./CreditCardPayment";
import UPIPayment from "./UPIPayment";

import "../UI/PaymentMethods.css";

export default function PaymentMethods() {
  const location = useLocation();

  const [request, setRequest] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("debit");

  useEffect(() => {
    if (location.state?.request && location.state?.customerId) {
      setRequest(location.state.request);
      setCustomerId(location.state.customerId);

      sessionStorage.setItem(
        "paymentData",
        JSON.stringify({
          request: location.state.request,
          customerId: location.state.customerId,
        })
      );
    } else {
      const stored = sessionStorage.getItem("paymentData");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRequest(parsed.request);
        setCustomerId(parsed.customerId);
      }
    }
  }, [location.state]);

  const methods = [
    { key: "debit", label: "Debit Card" },
    { key: "credit", label: "Credit Card" },
    { key: "upi", label: "UPI / Other" },
  
  ];

  if (!request || !customerId) {
    return (
      <div className="error-session">
        <p>Invalid payment session. Go back to dashboard.</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (selectedMethod) {
      case "debit":
        return (
          <DebitCardPayment
            request={request}
            customerId={customerId}
            paymentMode="debit_card"
          />
        );
        case "credit":
        return (
          <CreditCardPayment
            request={request}
            customerId={customerId}
            paymentMode="credit_card"
          />
        );
      case "upi":
        return (
          <UPIPayment
            request={request}
            customerId={customerId}
            paymentMode="upi"
          />
        );
    
      default:
        return <p>Select a payment method</p>;
    }
  };

  return (
    <div className="payment-main-wrapper">
      {/* LEFT SIDEBAR - Pinned to the corner */}
      <div className="sidebar-container">
        <h3>Payment Methods</h3>
        <ul className="method-list">
          {methods.map((method) => (
            <li key={method.key} className="method-item">
              <button
                onClick={() => setSelectedMethod(method.key)}
                className={`method-btn ${
                  selectedMethod === method.key ? "active" : ""
                }`}
              >
                {method.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* RIGHT CONTENT AREA - Light theme with centered card */}
      <div className="payment-content-area">
        <div className="method-content-card">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}