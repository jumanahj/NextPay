const express = require("express");
  const app = express();
  const cors = require("cors");

  app.use(cors()); 
  app.use(express.json());

  const merchantRoutes = require("./routes/merchants");
  app.use("/api/merchants", merchantRoutes);
  const customerRoutes = require("./routes/customerRoutes");
  app.use("/api/customers", customerRoutes);

  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
