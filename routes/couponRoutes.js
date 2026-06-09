import express from "express";
import Coupon from "../models/Coupon.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ── Validate coupon (public) ── */
router.post("/validate", async (req, res) => {
  try {
    const { code, orderValue, userId } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }
    if (!coupon.isActive) {
      return res.status(400).json({ message: "This coupon is no longer active" });
    }
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: "This coupon has expired" });
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "This coupon has reached its usage limit" });
    }
    if (orderValue && orderValue < coupon.minOrderValue) {
      return res.status(400).json({
        message: `Minimum order value of ₹${coupon.minOrderValue} required`,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === "percent") {
      discountAmount = Math.round((orderValue * coupon.discountValue) / 100);
    } else {
      discountAmount = coupon.discountValue;
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      discountAmount,
      finalAmount: Math.max(0, orderValue - discountAmount),
    });
  } catch (err) {
    res.status(500).json({ message: "Validation failed", error: err.message });
  }
});

/* ── Get all coupons (admin) ── */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupons", error: err.message });
  }
});

/* ── Create coupon (admin) ── */
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      code, discountType, discountValue,
      minOrderValue, maxUses, expiresAt,
      isActive, forNewUsersOnly, description,
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: "code, discountType and discountValue are required" });
    }

    const coupon = await Coupon.create({
      code, discountType, discountValue,
      minOrderValue, maxUses, expiresAt,
      isActive, forNewUsersOnly, description,
    });

    res.status(201).json({ message: "Coupon created", coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Coupon code already exists" });
    }
    res.status(500).json({ message: "Failed to create coupon", error: err.message });
  }
});

/* ── Update coupon (admin) ── */
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon updated", coupon });
  } catch (err) {
    res.status(500).json({ message: "Failed to update coupon", error: err.message });
  }
});

/* ── Delete coupon (admin) ── */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coupon", error: err.message });
  }
});

export default router;
