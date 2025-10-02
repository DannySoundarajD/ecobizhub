const express = require('express');
const { TrendingModel } = require("../model/trending.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const trendingRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

const loadTrendingData = async () => {
    try {
        console.log('Loading Trending data from API...');
        const response = await axios.get(`${API_BASE_URL}/trending.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        let combinedProducts = [];
        const nestedData = response.data.trending;

        if (nestedData && typeof nestedData === 'object') {
            for (const key in nestedData) {
                if (Array.isArray(nestedData[key])) {
                    combinedProducts.push(...nestedData[key]);
                }
            }
        }

        if (combinedProducts.length === 0) {
            console.warn('No trending data found to insert.');
            return [];
        }

        const formattedProducts = combinedProducts.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image || "", "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await TrendingModel.deleteMany({});
        const result = await TrendingModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Trending items`);
        return result;

    } catch (error) {
        console.error('Error loading Trending data:', error.message);
        throw error;
    }
};

trendingRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadTrendingData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

trendingRouter.get("/", async (req, res) => {
    try {
        const products = await TrendingModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

trendingRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await TrendingModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Trending item with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

trendingRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const lastProduct = await TrendingModel.findOne().sort({ id: -1 });
        const newId = lastProduct ? lastProduct.id + 1 : 1;
        const newProduct = new TrendingModel({ ...req.body, id: newId });
        await newProduct.save();
        res.status(201).send({ msg: "Product added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});

trendingRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const updatedProduct = await TrendingModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});

trendingRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await TrendingModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ "msg": "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { trendingRouter };