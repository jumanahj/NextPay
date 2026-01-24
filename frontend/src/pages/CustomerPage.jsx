import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../UI/CustomerPage.css";

export default function CustomerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/customers/${id}/requests`)
      .then((res) => setRequests(res.data))
      .catch((err) => {
        console.error(err);
        setError("Failed to load requests");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePayClick = (request) => {
    navigate(`/customer/${id}/pay`, {
      state: { request, customerId: id },
    });
  };

  // Filter pending requests for the Highlight Bar
  const pendingRequests = requests.filter((r) => r.status === "not paid");

  return (
    <div className="dashboard-container">
      {/* HEADER SECTION */}
      <header className="dashboard-header">
        <div>
          <h1>Customer Dashboard</h1>
          <p className="user-id-badge">User ID: <strong>{id}</strong></p>
        </div>
        <button className="logout-btn" onClick={() => navigate("/login")}>Logout</button>
      </header>

      {/* HIGHLIGHTED PENDING BOX (Only shows if there are pending payments) */}
      {pendingRequests.length > 0 && (
        <div className="pending-highlight-box">
          <div className="highlight-info">
            <span className="pulse-icon">●</span>
            <strong>Attention:</strong> You have {pendingRequests.length} pending payment(s).
          </div>
          <div className="highlight-scroll-area">
            {pendingRequests.map((r) => (
              <div key={r.reference_number} className="mini-pay-card">
                <span>Amount: <strong>₹{r.amount}</strong></span>
                <button onClick={() => handlePayClick(r)}>Pay Now</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL REQUESTS SECTION */}
      <section className="requests-section">
        <h3>Transaction History</h3>

        {loading && <div className="loader">Loading your requests...</div>}
        {error && <p className="error-text">{error}</p>}
        {!loading && requests.length === 0 && <p className="empty-text">No transaction history found.</p>}

        {!loading && requests.length > 0 && (
          <div className="table-wrapper">
            <table className="styled-table">
              <thead>
                <tr>
                  <th>Reference No</th>
                  <th>Order ID</th>
                  <th>Amount</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.reference_number}>
                    <td>{r.reference_number}</td>
                    <td>{r.order_id}</td>
                    <td>₹{r.amount}</td>
                    <td>{r.due_date}</td>
                    <td>
                      <span className={`status-badge ${r.status.replace(/\s/g, '-')}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "not paid" ? (
                        <button className="pay-btn-small" onClick={() => handlePayClick(r)}>Pay</button>
                      ) : (
                        <span className="paid-text">✓ Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}