import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Register from "./pages/Register";
import SignIn from "./pages/SignIn";
import MerchantForm from "./pages/MerchantForm";
import CustomerPage from "./pages/CustomerPage";
import MerchantPage from "./pages/MerchantPage";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantTransactions from "./pages/MerchantTransactions";
import MerchantPaymentStatus from "./pages/MerchantPaymentStatus";
import PaymentMethods from "./pages/PaymentMethods";
import "./App.css";

function Home() {
  const navigate = useNavigate();

  return (
    <div className="auth-home" style={{ padding: "30px" }}>
      <SignIn />

      {/* <div style={{ marginTop: "20px", textAlign: "center" }}>
        <p>Don't have an account?</p>
        <button onClick={() => navigate("/register")}>Register</button>
      </div> */}
      
    </div>
  );
}

export default function App() {
  return (
    <div>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/signin" element={<SignIn />} />

        <Route path="/customer/:id" element={<CustomerPage />} />
        <Route path="/customer/:id/pay" element={<PaymentMethods />} />

        <Route path="/merchant/:id" element={<MerchantPage />}>
          <Route path="dashboard" element={<MerchantDashboard />} />
          <Route path="transactions" element={<MerchantTransactions />} />
          <Route path="payments" element={<MerchantPaymentStatus />} />
        </Route>

        <Route path="/merchant-form" element={<MerchantForm />} />
      </Routes>
    </BrowserRouter>
    </div>
  );
}
