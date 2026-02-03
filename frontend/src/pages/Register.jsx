import React, { useState } from "react";
import CustomerForm from "./CustomerForm";
import MerchantForm from "./MerchantForm";

export default function Register() {
  const [role, setRole] = useState("customer");

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    if (selectedRole !== "customer" && selectedRole !== "merchant") {
      alert("Invalid role selected");
    }
    setRole(selectedRole);
  };

  return (
    <div className="auth-container">
      <select
        value={role}
        onChange={handleRoleChange}
        style={{ marginBottom: "20px" }}
      >
        <option value="customer">Customer</option>
        <option value="merchant">Merchant</option>
      </select>

      {role === "customer" ? <CustomerForm /> : <MerchantForm />}
    </div>
  );
}
