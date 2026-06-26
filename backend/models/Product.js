const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, default: 'general' },
    imageUrl: { type: String, default: '' },
    stock: { type: Number, required: true, default: 0, min: 0 },
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    discountPercent: { type: Number, default: 0, min: 0, max: 90 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
