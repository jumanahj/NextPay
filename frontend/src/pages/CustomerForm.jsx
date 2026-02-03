import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import "../UI/CustomerForm.css";

export default function CustomerForm() {
  const [step, setStep] = useState(1);

  const [personal, setPersonal] = useState({
    customer_name: "",
    email: "",
    mobile_no: "",
  });

  const [account, setAccount] = useState({
    bank_name: "",
    holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "savings",
    registered_mobile_number: "",
    pan_number: "",
    permanent_address: "",
  });

  const [credentials, setCredentials] = useState({
    customer_user_id: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePersonalChange = (e) =>
    setPersonal({ ...personal, [e.target.name]: e.target.value });

  const handleAccountChange = (e) =>
    setAccount({ ...account, [e.target.name]: e.target.value });

  const handleCredentialsChange = (e) =>
    setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const generateCustomerID = () => {
    const id = "CUST" + Math.floor(1000 + Math.random() * 9000);
    setCredentials({ ...credentials, customer_user_id: id });
  };

  const validatePersonalDetails = () => {
    const { customer_name, email, mobile_no } = personal;
    const nameRegex = /^[A-Za-z\s]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^\d{10}$/;

    if (!nameRegex.test(customer_name)) return "Name must contain letters and spaces only";
    if (!emailRegex.test(email)) return "Invalid email format";
    if (!phoneRegex.test(mobile_no)) return "Phone number must be exactly 10 digits";
    return null;
  };

  const validateAccountDetails = () => {
    const { account_number, ifsc_code, bank_name } = account;
    const accountNumberRegex = /^\d{12}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!accountNumberRegex.test(account_number)) return "Account number must be exactly 12 digits";
    if (!ifscRegex.test(ifsc_code)) return "Invalid IFSC code format";
    if (!bank_name) return "Bank name is required";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const personalError = validatePersonalDetails();
    const accountError = validateAccountDetails();
    if (personalError || accountError) {
        setError(personalError || accountError);
        return;
    }
    setLoading(true);
    setError("");

    try {
      const payload = {
        ...personal,
        ...account,
        ...credentials,
      };

      const res = await axios.post(`${API_BASE}/api/customers`, payload);

      alert(`Customer created successfully: ${res.data.customer_user_id}`);

      setStep(1);
      setPersonal({ customer_name: "", email: "", mobile_no: "" });
      setAccount({
        bank_name: "",
        holder_name: "",
        account_number: "",
        ifsc_code: "",
        account_type: "savings",
        registered_mobile_number: "",
        pan_number: "",
        permanent_address: "",
      });
      setCredentials({ customer_user_id: "", password: "" });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-wrapper">
        <h2>Customer Registration</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <h3>Step 1: Personal Details</h3>
              <div className="grid-3">
                <div className="form-group">
                  <label>Customer Name</label>
                  <input
                    name="customer_name"
                    value={personal.customer_name}
                    onChange={handlePersonalChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={personal.email}
                    onChange={handlePersonalChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Mobile Number</label>
                  <input
                    type="tel"
                    name="mobile_no"
                    value={personal.mobile_no}
                    onChange={handlePersonalChange}
                    required
                  />
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)}>
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3>Step 2: Account Details</h3>
              <div className="grid-3">
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    name="bank_name"
                    value={account.bank_name}
                    onChange={handleAccountChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Holder Name</label>
                  <input
                    name="holder_name"
                    value={account.holder_name}
                    onChange={handleAccountChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    name="account_number"
                    value={account.account_number}
                    onChange={handleAccountChange}
                    required
                  />
                </div>
              </div>
              <div className="grid-3">
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    name="ifsc_code"
                    value={account.ifsc_code}
                    onChange={handleAccountChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Account Type</label>
                  <select
                    name="account_type"
                    value={account.account_type}
                    onChange={handleAccountChange}
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                    <option value="salary">Salary</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Registered Mobile</label>
                  <input
                    name="registered_mobile_number"
                    value={account.registered_mobile_number}
                    onChange={handleAccountChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group full-width">
                <label>Permanent Address</label>
                <textarea
                  name="permanent_address"
                  value={account.permanent_address}
                  onChange={handleAccountChange}
                  required
                />
              </div>
              <button type="button" onClick={() => setStep(1)}>
                Previous
              </button>
              <button type="button" onClick={() => { generateCustomerID(); setStep(3); }}>
                Next
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3>Step 3: Set Password</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label>Generated Customer ID</label>
                  <input
                    value={credentials.customer_user_id}
                    readOnly
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={credentials.password}
                    onChange={handleCredentialsChange}
                    required
                  />
                </div>
              </div>
              <button type="button" onClick={() => setStep(2)}>
                Previous
              </button>
              <button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Customer"}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
