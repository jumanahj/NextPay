import React, { useState } from "react";
import CustomerForm from "./CustomerForm";
import MerchantForm from "./MerchantForm";

export default function Register() {
  const [role, setRole] = useState("customer");

  return (
    <div className="auth-container">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ marginBottom: "20px" }}
      >
        <option value="customer">Customer</option>
        <option value="merchant">Merchant</option>
      </select>

      {role === "customer" ? <CustomerForm /> : <MerchantForm />}
    </div>
  );
}
