const express = require('express');
const { MangalsutraModel } = require("../model/mangalsutra.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const mangalsutraRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';


const loadMangalsutraData = async () => {
    try {
        console.log('Loading Mangalsutra data from API...');
        const response = await axios.get(`${API_BASE_URL}/mangalsutra.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        const products = response.data.mangalsutras || [];
        if (products.length === 0) {
            console.warn('No mangalsutra data found to insert.');
            return [];
        }

        const formattedProducts = products.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image || "", "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await MangalsutraModel.deleteMany({});
        const result = await MangalsutraModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Mangalsutra items`);
        return result;

    } catch (error) {
        console.error('Error loading Mangalsutra data:', error.message);
        throw error;
    }
};


mangalsutraRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadMangalsutraData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});


mangalsutraRouter.get("/", async (req, res) => {
    try {
        const products = await MangalsutraModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});


mangalsutraRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await MangalsutraModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Mangalsutra with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});


mangalsutraRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const lastProduct = await MangalsutraModel.findOne().sort({ id: -1 });
        const newId = lastProduct ? lastProduct.id + 1 : 1;
        const newProduct = new MangalsutraModel({ ...req.body, id: newId });
        await newProduct.save();
        res.status(201).send({ msg: "Mangalsutra added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add mangalsutra: " + err.message });
    }
});


mangalsutraRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const updatedProduct = await MangalsutraModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ "msg": "Mangalsutra not found." });
        }
        res.status(200).send({ msg: "Mangalsutra updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update mangalsutra: " + err.message });
    }
});


mangalsutraRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const deletedProduct = await MangalsutraModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ "msg": "Mangalsutra not found." });
        }
        res.status(200).send({ "msg": "Mangalsutra deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete mangalsutra: " + err.message });
    }
});

module.exports = { mangalsutraRouter };