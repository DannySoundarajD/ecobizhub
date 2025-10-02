const mongoose = require('mongoose');

const necklaceSchema = mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, default: 'Necklace' },
    material: { type: String },
    gemstone: { type: String },
    type: { type: String },
    gender: { type: String, default: 'Unisex' },
    occasion: { type: String, default: 'General' },
    rating: { type: Number, default: 0 },
    reviews: { type: [String], default: [] },
    image: { type: String, required: true },
    images: { type: [String], default: [] },
    description: { type: String },
    is_featured: { type: Boolean, default: false },
    is_bestseller: { type: Boolean, default: false },
    has_special_deal: { type: Boolean, default: false },
    is_fast_delivery: { type: Boolean, default: false },
    added_date: { type: Date, default: Date.now },
}, {
    versionKey: false
});

const NecklaceModel = mongoose.model("necklace", necklaceSchema);

module.exports = {
    NecklaceModel
};