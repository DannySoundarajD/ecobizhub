const mongoose = require('mongoose');

const mangalsutraSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    description: { type: String },
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 },
    category: { type: String, default: 'Mangalsutra' },
    material: { type: String },
    gemstone: { type: String },
    type: { type: String },
    region: { type: String },
    occasion: { type: String },
    gender: { type: String, default: 'Women' },
    is_featured: { type: Boolean, default: false },
    is_bestseller: { type: Boolean, default: false },
    has_special_deal: { type: Boolean, default: false },
    is_fast_delivery: { type: Boolean, default: false },
    added_date: { type: Date, default: Date.now },
}, { versionKey: false });

const MangalsutraModel = mongoose.model("mangalsutra", mangalsutraSchema);

module.exports = { MangalsutraModel };