import React, { useEffect, useState } from "react";
import axios from "axios";
import { useOutletContext } from "react-router-dom";
import "../UI/MerchantPaymentStatus.css";

export default function MerchantPaymentStatus() {
  const { merchantId } = useOutletContext();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`http://localhost:3000/api/merchants/${merchantId}/requests`)
      .then(res => setRequests(res.data))
      .catch(() => setError("Failed to load payment status"))
      .finally(() => setLoading(false));
  }, [merchantId]);

  if (loading) {
    return (
      <div className="status-loading">
        <div className="loader-ring"></div>
        <p>Syncing request status...</p>
      </div>
    );
  }

  if (error) {
    return <div className="status-error-msg">{error}</div>;
  }

  return (
    <div className="payment-status-content">
      <header className="status-header">
        <div>
          <h3>Payment Requests Status</h3>
          <p>Tracking all invoices sent to customers</p>
        </div>
        <div className="filter-hint">Showing: All Requests</div>
      </header>

      {requests.length === 0 ? (
        <div className="empty-status">
          <p>No payment requests found in your account history.</p>
        </div>
      ) : (
        <div className="table-card">
          <table className="status-table">
            <thead>
              <tr>
                <th>Ref No</th>
                <th>Customer ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Initialized Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(r => (
                <tr key={r.reference_number}>
                  <td><span className="ref-tag">{r.reference_number}</span></td>
                  <td className="cust-id-cell">{r.sending_customer_id}</td>
                  <td>{r.order_id}</td>
                  <td className="amount-bold">₹{r.amount}</td>
                  <td>{r.due_date}</td>
                  <td>
                    <span className={`status-pill-big ${r.status === 'paid' ? 'paid' : 'unpaid'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="date-dim">{r.initialised_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}