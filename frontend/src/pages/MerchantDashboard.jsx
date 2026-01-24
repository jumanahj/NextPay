import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import "../UI/MerchantDashboard.css";

export default function MerchantDashboard() {
  const { merchantId } = useOutletContext();
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState({
    amount: "",
    due_date: ""
  });

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/merchants/${merchantId}/customers`)
      .then(res => setCustomers(res.data))
      .catch(() => alert("Failed to load assigned customers"));
  }, [merchantId]);

  const generateOrderId = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const handleSubmit = async () => {
    if (!selectedCustomer) return alert("Select a customer");
    if (!form.amount || parseFloat(form.amount) <= 0) return alert("Enter a valid amount");
    if (!form.due_date) return alert("Select a due date");

    try {
      const res = await axios.post("http://localhost:3000/api/merchants/requests", {
        sending_customer_id: selectedCustomer.customer_id,
        receiving_merchant_id: merchantId,
        order_id: generateOrderId(),
        amount: parseFloat(form.amount),
        due_date: form.due_date
      });

      alert("Request created successfully");
      setSelectedCustomer(null);
      setForm({ amount: "", due_date: "" });
    } catch (err) {
      alert("Failed to create request: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="dashboard-content">
      <div className="section-header">
        <h3>Assigned Customers</h3>
        <p>Select a customer to initiate a payment request</p>
      </div>

      <div className="table-container">
        <table className="merchant-table">
          <thead>
            <tr>
              <th>Customer ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.customer_id} className={selectedCustomer?.customer_id === c.customer_id ? "selected-row" : ""}>
                <td><span className="id-badge">{c.customer_id}</span></td>
                <td><strong>{c.customer_name}</strong></td>
                <td>{c.email}</td>
                <td>
                  <button className="collect-btn" onClick={() => setSelectedCustomer(c)}>
                    Collect Payment
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCustomer && (
        <div className="collection-modal-overlay">
          <div className="collection-card">
            <div className="card-header">
              <h4>Initiate Payment</h4>
              <p>Collecting from: <strong>{selectedCustomer.customer_name}</strong></p>
            </div>
            
            <div className="form-group">
              <label>Amount (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
              />
            </div>

            <div className="card-actions">
              <button className="submit-request-btn" onClick={handleSubmit}>Initiate Payment</button>
              <button className="cancel-request-btn" onClick={() => setSelectedCustomer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}