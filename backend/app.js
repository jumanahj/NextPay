const express = require("express");
  const app = express();
  const cors = require("cors");

  app.use(cors()); 
  app.use(express.json());

  const merchantRoutes = require("./routes/merchants");
  app.use("/api/merchants", merchantRoutes);
  const customerRoutes = require("./routes/customerRoutes");
  app.use("/api/customers", customerRoutes);
  const paymentRoutes = require("./routes/paymentRoutes");
  app.use("/api/pay", paymentRoutes);

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
