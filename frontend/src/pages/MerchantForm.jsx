import React, { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import "../UI/MerchantForm.css";

export default function MerchantForm() {
  const [step, setStep] = useState(1);

  const [merchant, setMerchant] = useState({
    merchant_name: "",
    email: "",
    password: "",
  });

  const [business, setBusiness] = useState({
    business_name: "",
    business_domain: "",
    gst_number: "",
    contact_person_name: "",
    contact_person_mobile: "",
  });

  const [account, setAccount] = useState({
    bank_name: "",
    holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "savings",
    phone_number: "",
    registered_mobile_number: "",
    pan_number: "",
    permanent_address: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateMerchantDetails = () => {
    const { merchant_name, email, password } = merchant;
    const nameRegex = /^[A-Za-z\s]+$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!merchant_name.trim()) return "Merchant name is required";
    if (!nameRegex.test(merchant_name)) return "Merchant name must contain letters and spaces only";
    if (!emailRegex.test(email)) return "Invalid email format";
    if (!password) return "Password is required";
    return null;
  };

  const validateBusinessDetails = () => {
    const { business_name, business_domain, gst_number, contact_person_name, contact_person_mobile } = business;
    const gstRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z\d{1}$/;
    const nameRegex = /^[A-Za-z\s]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!business_name.trim()) return "Business name is required";
    if (!business_domain.trim()) return "Business domain is required";
    if (!gstRegex.test(gst_number)) return "Invalid GST number format (e.g., 22AABCU1234R1Z5)";
    if (!nameRegex.test(contact_person_name)) return "Contact person name must contain letters and spaces only";
    if (!phoneRegex.test(contact_person_mobile)) return "Contact mobile must be exactly 10 digits";
    return null;
  };

  const validateAccountDetails = () => {
    const { bank_name, holder_name, account_number, ifsc_code, registered_mobile_number, pan_number, permanent_address } = account;
    const accountNumberRegex = /^\d{12}$/;
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const phoneRegex = /^\d{10}$/;

    if (!bank_name.trim()) return "Bank name is required";
    if (!holder_name.trim()) return "Account holder name is required";
    if (!accountNumberRegex.test(account_number)) return "Account number must be exactly 12 digits";
    if (!ifscRegex.test(ifsc_code)) return "Invalid IFSC code format (e.g., SBIN0001234)";
    if (!phoneRegex.test(registered_mobile_number)) return "Registered mobile must be exactly 10 digits";
    if (!panRegex.test(pan_number)) return "Invalid PAN format (e.g., ABCDE1234F)";
    if (!permanent_address.trim() || permanent_address.trim().length < 10) return "Permanent address must be at least 10 characters";
    return null;
  };

  const handleMerchantChange = (e) =>
    setMerchant({ ...merchant, [e.target.name]: e.target.value });

  const handleBusinessChange = (e) =>
    setBusiness({ ...business, [e.target.name]: e.target.value });

  const handleAccountChange = (e) =>
    setAccount({ ...account, [e.target.name]: e.target.value });

  const handleNextStep1 = () => {
    const error = validateMerchantDetails();
    if (error) {
      setError(error);
      return;
    }
    setError("");
    setStep(2);
  };

  const handleNextStep2 = () => {
    const error = validateBusinessDetails();
    if (error) {
      setError(error);
      return;
    }
    setError("");
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const merchantError = validateMerchantDetails();
    const businessError = validateBusinessDetails();
    const accountError = validateAccountDetails();

    if (merchantError) {
      setError(merchantError);
      setStep(1);
      return;
    }
    if (businessError) {
      setError(businessError);
      setStep(2);
      return;
    }
    if (accountError) {
      setError(accountError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        merchant: {
          ...merchant,
          ...business,
        },
        account: {
          ...account,
          usertype: "merchant",
          kyc_status: "pending",
          account_status: "inactive",
        },
      };

      const res = await axios.post(`${API_BASE}/api/merchants`, payload);

      alert(`Merchant created successfully: ${res.data.merchant_user_id}`);

      setStep(1);
      setMerchant({ merchant_name: "", email: "", password: "" });
      setBusiness({
        business_name: "",
        business_domain: "",
        gst_number: "",
        contact_person_name: "",
        contact_person_mobile: "",
      });
      setAccount({
        bank_name: "",
        holder_name: "",
        account_number: "",
        ifsc_code: "",
        account_type: "savings",
        phone_number: "",
        registered_mobile_number: "",
        pan_number: "",
        permanent_address: "",
      });
    } catch (err) {
      console.error("Full error:", err);
      console.error("Error response:", err.response?.data);
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-wrapper">
        <h2>Merchant Registration</h2>
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <h3>Step 1: Merchant Login Details</h3>
              <div className="grid-3">
                <input
                  name="merchant_name"
                  placeholder="Merchant Name"
                  value={merchant.merchant_name}
                  onChange={handleMerchantChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={merchant.email}
                  onChange={handleMerchantChange}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={merchant.password}
                  onChange={handleMerchantChange}
                  required
                />
              </div>
              <button type="button" onClick={handleNextStep1}>
                Next
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h3>Step 2: Business Details</h3>
              <div className="grid-3">
                <input
                  name="business_name"
                  placeholder="Business Name"
                  value={business.business_name}
                  onChange={handleBusinessChange}
                  required
                />
                <input
                  name="business_domain"
                  placeholder="Business Domain"
                  value={business.business_domain}
                  onChange={handleBusinessChange}
                  required
                />
                <input
                  name="gst_number"
                  placeholder="GST Number"
                  value={business.gst_number}
                  onChange={handleBusinessChange}
                  required
                />
                <input
                  name="contact_person_name"
                  placeholder="Contact Person"
                  value={business.contact_person_name}
                  onChange={handleBusinessChange}
                  required
                />
                <input
                  name="contact_person_mobile"
                  placeholder="Contact Mobile"
                  value={business.contact_person_mobile}
                  onChange={handleBusinessChange}
                  required
                />
              </div>
              <button type="button" onClick={() => setStep(1)}>
                Previous
              </button>
              <button type="button" onClick={handleNextStep2}>
                Next
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h3>Step 3: Bank & Account Details</h3>
              <div className="grid-3">
                <input name="bank_name" placeholder="Bank Name" value={account.bank_name} onChange={handleAccountChange} required />
                <input name="holder_name" placeholder="Account Holder" value={account.holder_name} onChange={handleAccountChange} required />
                <input name="account_number" placeholder="Account Number" value={account.account_number} onChange={handleAccountChange} required />
                <input name="ifsc_code" placeholder="IFSC Code" value={account.ifsc_code} onChange={handleAccountChange} required />
                <input name="registered_mobile_number" placeholder="Registered Mobile" value={account.registered_mobile_number} onChange={handleAccountChange} required />
                <input name="pan_number" placeholder="PAN Number" value={account.pan_number} onChange={handleAccountChange} required />
              </div>

              <textarea
                placeholder="Permanent Address"
                name="permanent_address"
                value={account.permanent_address}
                onChange={handleAccountChange}
                required
              />

              <button type="button" onClick={() => setStep(2)}>
                Previous
              </button>
              <button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Create Merchant"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
