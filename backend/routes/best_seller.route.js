const express = require('express');
const { BestSellerModel } = require("../model/best_seller.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const bestSellerRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

const loadBestSellerData = async () => {
    try {
        console.log('Loading Best Sellers data from API...');
        const response = await axios.get(`${API_BASE_URL}/best_sellers.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        let combinedProducts = [];
        const nestedData = response.data.best_sellers;

        if (nestedData && typeof nestedData === 'object') {
            for (const key in nestedData) {
                if (Array.isArray(nestedData[key])) {
                    combinedProducts.push(...nestedData[key]);
                }
            }
        }

        if (combinedProducts.length === 0) {
            console.warn('No best seller data found to insert.');
            return [];
        }

        const formattedProducts = combinedProducts.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image, "", "", "", ""],
            is_bestseller: true, 
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await BestSellerModel.deleteMany({});
        const result = await BestSellerModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Best Seller items`);
        return result;

    } catch (error) {
        console.error('Error in loadBestSellerData:', error);
        throw error;
    }
};

bestSellerRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadBestSellerData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

bestSellerRouter.get("/", async (req, res) => {
    try {
        const products = await BestSellerModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

bestSellerRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await BestSellerModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Product with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

bestSellerRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const newProduct = new BestSellerModel(req.body);
        await newProduct.save();
        res.status(201).send({ msg: "Product added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});

bestSellerRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ msg: "Invalid ID format." });
        }
        const updatedProduct = await BestSellerModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ msg: "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});

bestSellerRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ msg: "Invalid ID format." });
        }
        const deletedProduct = await BestSellerModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ msg: "Product not found." });
        }
        res.status(200).send({ msg: "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { bestSellerRouter };