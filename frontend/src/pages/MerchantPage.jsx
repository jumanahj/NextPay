import React from "react";
import { useParams, Link, useLocation, Outlet } from "react-router-dom";
import "../UI/MerchantPage.css";

export default function MerchantPage() {
  const { id } = useParams();
  const location = useLocation();

  // Helper to highlight active link
  const isActive = (path) => location.pathname.includes(path);

  return (
    <div className="merchant-main-layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="merchant-sidebar">
        <div className="sidebar-header">
          <div className="merchant-icon">M</div>
          <h2>Merchant Portal</h2>
        </div>
        
        <div className="merchant-id-badge">
          ID: <strong>{id}</strong>
        </div>

        <nav className="merchant-nav-links">
          <Link 
            to={`/merchant/${id}/dashboard`} 
            className={isActive('dashboard') ? 'active' : ''}
          >
            <span className="nav-icon">📊</span> Dashboard
          </Link>
          <Link 
            to={`/merchant/${id}/transactions`} 
            className={isActive('transactions') ? 'active' : ''}
          >
            <span className="nav-icon">📜</span> Transactions
          </Link>
          <Link 
            to={`/merchant/${id}/payments`} 
            className={isActive('payments') ? 'active' : ''}
          >
            <span className="nav-icon">💳</span> Payment Status
          </Link>
        </nav>

        <div className="sidebar-footer">
          <Link to="/login" className="logout-link">Logout</Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="merchant-content-window">
        <Outlet context={{ merchantId: id }} />
      </main>
    </div>
  );
}