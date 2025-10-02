const express = require('express');
const { OtherModel } = require("../model/other.model");
const axios = require('axios');
const { auth, adminAuth } = require('../middleware/auth.middleware');

const otherRouter = express.Router();
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';


const loadOtherData = async () => {
    try {
        console.log('Loading Other data from API...');
        const response = await axios.get(`${API_BASE_URL}/other.json`, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        const rings = response.data.other_jeweleries || [];
        const mangalsutras = response.data.mangalsutras || [];
        const otherItems = response.data.other_items || []; 
        const products = [...rings, ...mangalsutras, ...otherItems];
        
        if (products.length === 0) {
            console.warn('No "Other" data found to insert.');
            return [];
        }

        const formattedProducts = products.map(p => ({
            ...p,
            id: Number(p.id),
            reviews: Number(p.reviews) || 0,
            images: [p.image, "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await OtherModel.deleteMany({});
        const result = await OtherModel.insertMany(formattedProducts);
        console.log(`Successfully loaded ${result.length} Other items`);
        return result;

    } catch (error) {
        console.error('Error loading Other data:', error.message);
        throw error;
    }
};

otherRouter.post("/load-data", adminAuth, async (req, res) => {
    try {
        const result = await loadOtherData();
        res.status(200).send({ "msg": `Successfully loaded ${result.length} items`, "data": result });
    } catch (err) {
        res.status(500).send({ "err": "Failed to load data: " + err.message });
    }
});

otherRouter.get("/", async (req, res) => {
    try {
        const products = await OtherModel.find(req.query);
        res.status(200).send(products);
    } catch (err) {
        res.status(400).send({ "err": err.message });
    }
});

otherRouter.get("/:id", async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ "msg": "Invalid ID format." });
        }
        const product = await OtherModel.findOne({ id: productID });
        if (!product) {
            return res.status(404).send({ "msg": `Product with ID: ${productID} not found.` });
        }
        res.status(200).send(product);
    } catch (err) {
        res.status(500).send({ "err": err.message });
    }
});

otherRouter.post("/add", adminAuth, async (req, res) => {
    try {
        const newProduct = new OtherModel(req.body);
        await newProduct.save();
        res.status(201).send({ msg: "Product added successfully!", product: newProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to add product: " + err.message });
    }
});

otherRouter.patch("/update/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ msg: "Invalid ID format." });
        }
        const updatedProduct = await OtherModel.findOneAndUpdate({ id: productID }, req.body, { new: true });
        if (!updatedProduct) {
            return res.status(404).send({ msg: "Product not found." });
        }
        res.status(200).send({ msg: "Product updated successfully!", product: updatedProduct });
    } catch (err) {
        res.status(400).send({ err: "Failed to update product: " + err.message });
    }
});

otherRouter.delete("/delete/:id", adminAuth, async (req, res) => {
    try {
        const productID = parseInt(req.params.id, 10);
        if (isNaN(productID)) {
            return res.status(400).send({ msg: "Invalid ID format." });
        }
        const deletedProduct = await OtherModel.findOneAndDelete({ id: productID });
        if (!deletedProduct) {
            return res.status(404).send({ msg: "Product not found." });
        }
        res.status(200).send({ msg: "Product deleted successfully!" });
    } catch (err) {
        res.status(500).send({ err: "Failed to delete product: " + err.message });
    }
});

module.exports = { otherRouter };