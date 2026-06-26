// Run this once to populate the database with sample products (and a demo admin account)
// Usage: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

const sampleProducts = [
  {
    name: 'Classic Canvas Tote',
    description: 'Sturdy everyday tote bag, hand-stitched cotton canvas.',
    price: 24.99,
    category: 'bags',
    imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400',
    stock: 18,
    rating: 4.6,
    discountPercent: 0,
  },
  {
    name: 'Ceramic Pour-Over Set',
    description: 'Hand-glazed ceramic coffee dripper with matching mug.',
    price: 38.0,
    category: 'kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    stock: 9,
    rating: 4.8,
    discountPercent: 15,
  },
  {
    name: 'Wool Throw Blanket',
    description: 'Soft merino wool blend, woven in a herringbone pattern.',
    price: 65.0,
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1580301762395-83cbcb59cf03?w=400',
    stock: 5,
    rating: 4.4,
    discountPercent: 0,
  },
  {
    name: 'Leather Notebook Cover',
    description: 'Full-grain leather cover fits standard A5 notebooks.',
    price: 32.5,
    category: 'stationery',
    imageUrl: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400',
    stock: 2,
    rating: 4.9,
    discountPercent: 20,
  },
  {
    name: 'Brass Desk Lamp',
    description: 'Adjustable articulating arm, warm-white LED bulb included.',
    price: 89.0,
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400',
    stock: 12,
    rating: 4.3,
    discountPercent: 0,
  },
  {
    name: 'Stoneware Plant Pot',
    description: 'Matte-finish stoneware pot with drainage hole and saucer.',
    price: 19.99,
    category: 'garden',
    imageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400',
    stock: 30,
    rating: 4.7,
    discountPercent: 10,
  },
  {
    name: 'Linen Throw Pillow',
    description: 'Pre-washed linen cover, hidden zip closure, insert included.',
    price: 28.0,
    category: 'home',
    imageUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400',
    stock: 0,
    rating: 4.2,
    discountPercent: 0,
  },
  {
    name: 'Walnut Cutting Board',
    description: 'Solid walnut, food-safe mineral oil finish, juice groove.',
    price: 54.0,
    category: 'kitchen',
    imageUrl: 'https://images.unsplash.com/photo-1594226801341-d9e57f56e89c?w=400',
    stock: 7,
    rating: 4.85,
    discountPercent: 0,
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Create a demo admin if one doesn't already exist
    let admin = await User.findOne({ email: 'admin@cornershop.com' });
    if (!admin) {
      admin = await User.create({
        name: 'Demo Admin',
        email: 'admin@cornershop.com',
        password: 'admin123',
        role: 'admin',
      });
      console.log('Created demo admin: admin@cornershop.com / admin123');
    } else {
      console.log('Demo admin already exists, skipping.');
    }

    // Clear existing products and re-insert sample set (safe for repeated runs)
    await Product.deleteMany({});
    const productsWithCreator = sampleProducts.map((p) => ({ ...p, createdBy: admin._id }));
    await Product.insertMany(productsWithCreator);
    console.log(`Inserted ${productsWithCreator.length} sample products.`);

    console.log('Seeding complete!');
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
