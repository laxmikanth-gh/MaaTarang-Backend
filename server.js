import multer from "multer";
import { storage } from "./config/cloudinary.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "./models/Product.js";

dotenv.config();

const app = express();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error:", err));

app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));
const upload = multer({ storage });

/* Home Route */
app.get("/", (req, res) => {
  res.send("MaaTarang Backend Running 🚀");
});
app.post("/upload", upload.single("image"), (req, res) => {
  try {
    console.log("Uploaded File:", req.file);

    res.json({
      success: true,
      imageUrl: req.file.path,
    });
  } catch (err) {
    console.log("Upload Error:", err);

    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

/* Get All Products */
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch products",
      error: err.message,
    });
  }
});

/* Add Product */
app.post("/products", async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    const product = new Product({
      name,
      price,
      category,
      image,
    });

    await product.save();

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to add product",
      error: err.message,
    });
  }
});

/* Delete Product */
app.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete product",
      error: err.message,
    });
  }
});

/* Update Product */
app.put("/products/:id", async (req, res) => {
  try {
    const { name, price, category } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, category },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json({
      message: "Product updated successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update product",
      error: err.message,
    });
  }
});

/* Get Single Product */
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch product",
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
