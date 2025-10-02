const express = require('express');
const { NewArrivalModel } = require("../model/new_arrival.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const newArrivalRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

const loadNewArrivalData = async () => {
    try {
        console.log('Loading New Arrivals data from API...');
        const response = await axios.get(`${API_BASE_URL}/new_arrivals.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        let combinedProducts = [];
        const nestedData = response.data.new_arrivals;

        if (nestedData && typeof nestedData === 'object') {
            for (const key in nestedData) {
                if (Array.isArray(nestedData[key])) {
                    combinedProducts.push(...nestedData[key]);
                }
            }
        }

        if (combinedProducts.length === 0) {
            console.warn('No new arrival data found to insert.');
            return [];
        }

        const formattedProducts = combinedProducts.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image || "", "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await NewArrivalModel.deleteMany({});
        const result = await NewArrivalModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} New Arrival items`);
        return result;

    } catch (error) {
        console.error('Error loading New Arrival data:', error.message);
        throw error;
    }
};

newArrivalRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadNewArrivalData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

newArrivalRouter.get("/", async (req, res) => {
    try {
        const products = await NewArrivalModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

newArrivalRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await NewArrivalModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `New Arrival with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

newArrivalRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const lastProduct = await NewArrivalModel.findOne().sort({ id: -1 });
        const newId = lastProduct ? lastProduct.id + 1 : 1;
        const newProduct = new NewArrivalModel({ ...req.body, id: newId });
        await newProduct.save();
        res.status(201).send({ msg: "Product added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});

newArrivalRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const updatedProduct = await NewArrivalModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});

newArrivalRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await NewArrivalModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ "msg": "Product not found." });
        }
        res.status(200).send({ "msg": "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { newArrivalRouter };