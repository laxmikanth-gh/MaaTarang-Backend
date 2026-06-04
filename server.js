const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));

const products = [
  {
    id: 1,
    name: "Floral Design",
    price: 1349,
    category: "Embroidery",
    image: "/images/floral.png"
  },
  {
    id: 2,
    name: "Peacock Feather Embroidered Kurta",
    price: 9999,
    category: "Premium",
    image: "/images/kurta.png"
  },
{
  id: 3,
  name: "Designer Floral Kurti",
  price: 1799,
  category: "Women's Wear",
  image: "/images/girls-kurti-1.jpeg"
},
{
  id: 4,
  name: "Elegant Peach Kurti Set",
  price: 2299,
  category: "Women's Wear",
  image: "/images/girls-kurti-2.jpeg"
},
{
  id: 5,
  name: "Ralph Lauren Men's Premium Shirt",
  price: 5499,
  category: "Men's Wear",
  image: "/images/ralph-lauren-men.png"
}
];
// Home Route
app.get("/", (req, res) => {
  res.send("MaaTarang Backend Running 🚀");
});

// Get All Products
app.get("/products", (req, res) => {
  res.json(products);
});

// Get Single Product by ID
app.get("/product/:id", (req, res) => {
  const productId = parseInt(req.params.id);

  const product = products.find(
    (p) => p.id === productId
  );

  if (!product) {
    return res.status(404).json({
      message: "Product not found"
    });
  }

  res.json(product);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});