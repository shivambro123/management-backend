const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");

const app = express();
const uri =
  "mongodb+srv://speaktoshivam24:LNuDm2AbmhvolYMN@cluster0.cxqf6rp.mongodb.net/";
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: false,
});
app.use(cors());

const createIndexes = async (db) => {
  await db
    .collection("transactions")
    .createIndex({ "transactions.amount": 1 });
};

const startServer = async () => {
  try {
    await client.connect();
    const db = client.db("management");

    await createIndexes(db); // Create necessary indexes

    app.get("/", (req, res) => {
      res.send("Welcome");
    });

    app.get("/customers", async (req, res) => {
      try {
        const customers = await db
          .collection("customers")
          .find({ active: true })
          .toArray();
        res.json(customers);
      } catch (error) {
        console.error("Error retrieving customers:", error);
        res.status(500).json({
          error: "An error occurred while retrieving customers",
        });
      }
    });

    app.get("/accounts/transactions/:id", async (req, res) => {
      try {
        const accountId = parseInt(req.params.id); // Ensure account_id is parsed as a number
        console.log("Account ID:", accountId);

        const transactions = await db
          .collection("transactions")
          .find({ account_id: accountId })
          .toArray();

        console.log("Transactions:", transactions);

        if (transactions.length === 0) {
          console.log(
            "No transactions found for account ID:",
            accountId
          );
        }

        res.json(transactions);
      } catch (error) {
        console.error("Error retrieving transactions:", error);
        res.status(500).json({
          error: "An error occurred while retrieving transactions",
        });
      }
    });

    // Optimized transaction route with pagination
    app.get("/transaction/lt5k", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const transactions = await db
          .collection("transactions")
          .aggregate([
            { $unwind: "$transactions" },
            { $match: { "transactions.amount": { $lt: 5000 } } },
            {
              $project: {
                _id: 0,
                transaction: "$transactions",
              },
            },
            { $skip: skip },
            { $limit: limit },
          ])
          .toArray();

        if (transactions.length === 0) {
          console.log("No transactions found");
          return res
            .status(404)
            .json({ message: "No transactions found" });
        }

        res.json(transactions);
      } catch (error) {
        console.error("Error retrieving transactions:", error);
        res.status(500).json({
          error: "An error occurred while retrieving transactions",
        });
      }
    });

    app.get("/products", async (req, res) => {
      try {
        const products = await db
          .collection("accounts")
          .aggregate([
            { $unwind: "$products" },
            {
              $group: {
                _id: null,
                distinctProducts: { $addToSet: "$products" },
              },
            },
            { $project: { _id: 0, distinctProducts: 1 } },
          ])
          .toArray();

        if (
          products.length === 0 ||
          !products[0].distinctProducts.length
        ) {
          console.log("No products found");
          return res
            .status(404)
            .json({ message: "No products found" });
        }

        res.json(products[0].distinctProducts);
      } catch (error) {
        console.error("Error retrieving products:", error);
        res.status(500).json({
          error: "An error occurred while retrieving products",
        });
      }
    });

    app.listen(5000, () => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    process.exit(1); // Exit the process with failure
  }
};

startServer();
