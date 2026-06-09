import express from "express";
import Coupon from "../models/Coupon.js";
import { verifyToken, isAdmin } from "../middleware/auth.js";

const router = express.Router();

/* ── GET /coupons — admin: all coupons ── */
router.get("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch coupons", error: err.message });
  }
});

/* ── POST /coupons — admin: create coupon ── */
router.post("/", verifyToken, isAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderValue, maxUses, expiresAt, isActive, forNewUsersOnly, description } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: "code, discountType and discountValue are required" });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
      maxUses: maxUses ? Number(maxUses) : null,
      expiresAt: expiresAt || null,
      isActive: isActive !== undefined ? isActive : true,
      forNewUsersOnly: forNewUsersOnly || false,
      description: description || "",
    });

    res.status(201).json({ message: "Coupon created successfully", coupon });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "A coupon with this code already exists" });
    }
    res.status(500).json({ message: "Failed to create coupon", error: err.message });
  }
});

/* ── PUT /coupons/:id — admin: update coupon ── */
router.put("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { code, discountType, discountValue, minOrderValue, maxUses, expiresAt, isActive, forNewUsersOnly, description } = req.body;

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      {
        ...(code && { code: code.toUpperCase() }),
        ...(discountType && { discountType }),
        ...(discountValue && { discountValue: Number(discountValue) }),
        minOrderValue: minOrderValue !== undefined ? Number(minOrderValue) : 0,
        maxUses: maxUses ? Number(maxUses) : null,
        expiresAt: expiresAt || null,
        isActive: isActive !== undefined ? isActive : true,
        forNewUsersOnly: forNewUsersOnly || false,
        description: description || "",
      },
      { new: true, runValidators: true }
    );

    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon updated successfully", coupon });
  } catch (err) {
    res.status(500).json({ message: "Failed to update coupon", error: err.message });
  }
});

/* ── DELETE /coupons/:id — admin: delete coupon ── */
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coupon", error: err.message });
  }
});

/* ── POST /coupons/validate — public: validate a coupon code ── */
router.post("/validate", async (req, res) => {
  try {
    const { code, orderValue } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });
    if (!coupon) return res.status(404).json({ message: "Invalid or inactive coupon code" });

    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: "This coupon has expired" });
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ message: "This coupon has reached its usage limit" });
    }
    if (orderValue && coupon.minOrderValue && orderValue < coupon.minOrderValue) {
      return res.status(400).json({ message: `Minimum order value of ₹${coupon.minOrderValue} required` });
    }

    res.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to validate coupon", error: err.message });
  }
});

export default router;
