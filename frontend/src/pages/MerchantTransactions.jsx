import React, { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axios from "axios";
import "../UI/MerchantTransactions.css";

export default function MerchantTransactions() {
  const { merchantId: merchantUserId } = useOutletContext();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!merchantUserId) return;

    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `http://localhost:3000/api/merchants/${merchantUserId}/transactions`
        );
        setTransactions(res.data.transactions || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [merchantUserId]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Fetching your transaction history...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-box">{error}</div>;
  }

  return (
    <div className="transactions-content">
      <header className="page-header">
        <div>
          <h3>Transaction History</h3>
          <p className="merchant-sub-id">ID: <strong>{merchantUserId}</strong></p>
        </div>
        <div className="stat-card">
          <span>Total Volume</span>
          <strong>{transactions.length} Txns</strong>
        </div>
      </header>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found in your records.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="merchant-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer ID</th>
                <th>Amount (₹)</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.transaction_id}>
                  <td><span className="id-badge-small">{txn.transaction_id}</span></td>
                  <td><strong>{txn.payer_customer_id}</strong></td>
                  <td className="amount-cell">₹{txn.amount.toLocaleString()}</td>
                  <td>
                    <span className="mode-tag">{txn.payment_mode.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <StatusBadge status={txn.transaction_status} />
                  </td>
                  <td className="date-cell">
                    {new Date(txn.transaction_time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  // Logic remains the same, styling handled by CSS classes
  return (
    <span className={`status-pill ${status}`}>
      {status}
    </span>
  );
}