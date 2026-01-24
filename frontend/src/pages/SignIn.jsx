import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../UI/SignIn.css";

export default function SignIn() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!role || !id || !password) {
      alert("All fields are required");
      return;
    }
    setLoading(true);
    try {
      if (role === "customer") {
        const res = await axios.post("http://localhost:3000/api/customers/customer_login", {
          customer_user_id: id,
          password,
        });
        navigate(`/customer/${res.data.customer_user_id}`);
      } else if (role === "merchant") {
        const res = await axios.post("http://localhost:3000/api/merchants/merchant_login", {
          merchant_user_id: id,
          password,
        });
        navigate(`/merchant/${res.data.merchant_user_id}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="login-card">
        <div className="login-side-banner">
          <div className="banner-content">
            <h1>Next Pay</h1>
            <p>Secure Gateway Simulation</p>
          </div>
        </div>
        
        <div className="login-form-area">
          <div className="form-header">
            <h2>Welcome Back</h2>
            <p>Please enter your details to continue</p>
          </div>

          <form onSubmit={handleLogin} className="neat-form">
            <div className="form-group">
              <label>Select Portal</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} required>
                <option value="">Choose Role</option>
                <option value="customer">Customer Portal</option>
                <option value="merchant">Merchant Portal</option>
              </select>
            </div>

            <div className="form-group">
              <label>{role === "merchant" ? "Merchant ID" : "User ID"}</label>
              <input
                type="text"
                placeholder="Enter ID"
                value={id}
                onChange={(e) => setId(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Security Password</label>
              <input
                type="password"
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          <div className="form-footer">
            <p>New to Nexus? <span onClick={() => navigate("/register")}>Create Account</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}