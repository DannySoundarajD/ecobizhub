const express = require('express');
const { GiftingModel } = require("../model/gifting.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const giftingRouter = express.Router();

const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';


const loadGiftingData = async () => {
    try {
        console.log('Loading Gifting data from API...');
        const response = await axios.get(`${API_BASE_URL}/gifting.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        const products = response.data.gifting || [];
        if (products.length === 0) {
            console.warn('No gifting data found to insert.');
            return [];
        }

        const formattedProducts = products.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image || "", "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await GiftingModel.deleteMany({});
        const result = await GiftingModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Gifting items`);
        return result;

    } catch (error) {
        console.error('Error loading Gifting data:', error.message);
        throw error;
    }
};


giftingRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadGiftingData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});


giftingRouter.get("/", async (req, res) => {
    try {

        const products = await GiftingModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

giftingRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await GiftingModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Gifting item with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});


giftingRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const lastProduct = await GiftingModel.findOne().sort({ id: -1 });

        const newId = lastProduct ? lastProduct.id + 1 : 1;

        const newProduct = new GiftingModel({
            ...req.body, 
            id: newId,   
        });
        
        await newProduct.save();

        res.status(201).send({ msg: "Product added successfully!", product: newProduct });

    } catch (err) {
        console.error("Error adding product:", err);
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});


giftingRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ msg: "Invalid ID format." });
        }
        const updatedProduct = await GiftingModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ msg: "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});


giftingRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await GiftingModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ msg: "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { giftingRouter };