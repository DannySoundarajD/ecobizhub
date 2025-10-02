const express = require('express');
const { EarringModel } = require("../model/earring.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const earringRouter = express.Router();

const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

const loadEarringData = async () => {
    try {
        console.log('Loading Earring data from API...');
        const response = await axios.get(`${API_BASE_URL}/earings.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        const products = response.data.earrings || [];
        if (products.length === 0) {
            console.warn('No earring data found to insert.');
            return [];
        }

        const formattedProducts = products.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Array.isArray(p.reviews) ? p.reviews : [],
            images: Array.isArray(p.images) ? p.images : [],
            category: p.category || 'Earrings',
            is_featured: p.is_featured || false,
            is_bestseller: p.is_bestseller || false,
            has_special_deal: p.has_special_deal || false,
            is_fast_delivery: p.is_fast_delivery || false,
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await EarringModel.deleteMany({});
        const result = await EarringModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Earring items`);
        return result;

    } catch (error) {
        console.error('Error loading Earring data:', error.message);
        throw error;
    }
};

earringRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadEarringData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

earringRouter.get("/", async (req, res) => {
    const { sort, q, material, gender, occasion, minPrice, maxPrice,
        is_featured, is_bestseller, has_special_deal, is_fast_delivery, latest_designs } = req.query;

    const query = {};
    if (q) query.name = { "$regex": q, "$options": "i" };
    if (material) query.material = material;
    if (gender) query.gender = gender;
    if (occasion) query.occasion = occasion;
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = parseFloat(minPrice);
        if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (is_featured !== undefined) query.is_featured = (is_featured === 'true');
    if (is_bestseller !== undefined) query.is_bestseller = (is_bestseller === 'true');
    if (has_special_deal !== undefined) query.has_special_deal = (has_special_deal === 'true');
    if (is_fast_delivery !== undefined) query.is_fast_delivery = (is_fast_delivery === 'true');

    let sortOptions = {};
    if (sort) {
        switch (sort) {
            case "priceAsc": sortOptions.price = 1; break;
            case "priceDesc": sortOptions.price = -1; break;
            case "ratingDesc": sortOptions.rating = -1; break;
            default: sortOptions.name = 1; break;
        }
    }
    if (latest_designs === 'true') {
        sortOptions.added_date = -1;
    }

    try {
        const products = await EarringModel.find(query).sort(sortOptions);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

earringRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await EarringModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Earring with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

earringRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const newProduct = new EarringModel(req.body);
        await newProduct.save();
        res.status(201).send({ msg: "Earring added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add earring: " + err.message });
    }
});

earringRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const updatedProduct = await EarringModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ msg: `Earring with ID: ${productID} not found.` });
        }
        res.status(200).send({ msg: "Earring updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update earring: " + err.message });
    }
});

earringRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await EarringModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ msg: `Earring with ID: ${productID} not found.` });
        }
        res.status(200).send({ msg: "Earring deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete earring: " + err.message });
    }
});

module.exports = { earringRouter };