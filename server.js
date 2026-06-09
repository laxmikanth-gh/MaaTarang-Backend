import multer from "multer";
import { storage } from "./config/cloudinary.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import Product from "./models/Product.js";
import authRoutes from "./routes/auth.js";
import couponRoutes from "./routes/coupons.js";
import { verifyToken, isAdmin } from "./middleware/auth.js";

dotenv.config();

const app = express();

/* ── Security middleware ── */
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

/* ── Rate limiting ── */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: { message: "Too many requests, please try again later" },
});
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: "Too many requests, please try again later" },
});

// Apply only to products
app.use("/products", generalLimiter);
app.use(express.json());
app.use("/images", express.static("images"));

/* ── File upload ── */
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG and WebP images are allowed"));
    }
    cb(null, true);
  },
});

/* ── DB connection ── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("MongoDB Error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err);
});

/* ── Routes ── */
app.get("/", (req, res) => {
  res.send("MaaTarang Backend Running 🚀");
});

app.use("/auth", authLimiter, authRoutes);
app.use("/coupons", couponRoutes);

/* ── Upload (protected: admin only) ── */
app.post("/upload", verifyToken, isAdmin, upload.single("image"), (req, res) => {
  try {
    res.json({ success: true, imageUrl: req.file.path });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ── Products ── */
app.get("/products", async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const filter = category ? { category } : {};
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Product.countDocuments(filter),
    ]);

    res.json({ products, total, page: Number(page), totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
});

app.post("/products", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    if (!name || !price || !category) {
      return res.status(400).json({ message: "name, price and category are required" });
    }
    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    const product = await Product.create({ name, price, category, image });
    res.status(201).json({ message: "Product added successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to add product", error: err.message });
  }
});

app.put("/products/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, price, category, image } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, category, image },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ message: "Failed to update product", error: err.message });
  }
});

app.delete("/products/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
});

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || "Internal server error" });
});

/* ── Unhandled rejections ── */
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
