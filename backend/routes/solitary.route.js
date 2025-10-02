const express = require('express');
const { SolitaryModel } = require("../model/solitary.model");
const { auth, adminAuth } = require('../middleware/auth.middleware');
const axios = require('axios');

const solitaryRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

const loadSolitaryData = async () => {
    try {
        console.log('Loading Solitary data from API...');
        const response = await axios.get(`${API_BASE_URL}/solitaires.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        const products = response.data.solitaires || [];
        if (products.length === 0) {
            console.warn('No solitary data found to insert.');
            return [];
        }

        const formattedProducts = products.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image || "", "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await SolitaryModel.deleteMany({});
        const result = await SolitaryModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Solitary items`);
        return result;

    } catch (error) {
        console.error('Error loading Solitary data:', error.message);
        throw error;
    }
};

solitaryRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadSolitaryData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

solitaryRouter.get("/", async (req, res) => {
    try {
        const products = await SolitaryModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

solitaryRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await SolitaryModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Solitary with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

solitaryRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const lastProduct = await SolitaryModel.findOne().sort({ id: -1 });
        const newId = lastProduct ? lastProduct.id + 1 : 1;
        const newProduct = new SolitaryModel({ ...req.body, id: newId });
        await newProduct.save();
        res.status(201).send({ msg: "Product added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});

solitaryRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const updatedProduct = await SolitaryModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});

solitaryRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await SolitaryModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ "msg": "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { solitaryRouter };