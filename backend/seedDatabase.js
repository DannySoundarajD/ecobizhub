const mongoose = require('mongoose');
const axios = require('axios');

// Import your MongoDB connection from db.js
const { connection } = require('./db');

// --- Import ALL models ---
const { BraceletModel } = require('./model/bracelet.model');
const { EarringModel } = require('./model/earring.model');
const { NecklaceModel } = require('./model/necklace.model');
const { RingModel } = require('./model/ring.model');
const { BestSellerModel } = require('./model/best_seller.model');
const { GiftingModel } = require('./model/gifting.model');
const { MangalsutraModel } = require('./model/mangalsutra.model');
const { NewArrivalModel } = require('./model/new_arrival.model');
const { OtherModel } = require('./model/other.model');
const { SolitaryModel } = require('./model/solitary.model');
const { TrendingModel } = require('./model/trending.model');

// Define your API base URL
const API_BASE_URL = 'https://dannysoundarajd.github.io/jewellery-products-json';

/**
 * An intelligent data loader that handles various JSON structures and data types.
 */
async function loadAndSeedData(modelName, model, url) {
    if (!model || typeof model.deleteMany !== 'function') {
        console.error(`❌ Model for ${modelName} is not valid. Skipping.`);
        return 0;
    }
    try {
        console.log(`Fetching data for ${modelName} from: ${url}`);
        const response = await axios.get(url, {
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache', 'Expires': '0' },
        });

        let productsToInsert = [];
        const responseData = response.data;
        const topLevelKey = Object.keys(responseData)[0]; // e.g., 'bracelets', 'best_sellers', 'gifting'

        // Logic to extract product arrays from flat or nested structures
        if (Array.isArray(responseData[topLevelKey])) {
            productsToInsert = responseData[topLevelKey]; // Flat structure like gifting.json
        } else if (typeof responseData[topLevelKey] === 'object') {
            // Nested structure like best_sellers.json or new_arrivals.json
            const nestedObject = responseData[topLevelKey];
            for (const key in nestedObject) {
                if (Array.isArray(nestedObject[key])) {
                    productsToInsert.push(...nestedObject[key]);
                }
            }
        }

        if (productsToInsert.length === 0) {
            console.warn(`No products found for ${modelName} at ${url}. Skipping.`);
            return 0;
        }

        // --- Intelligent Formatting Logic ---
        const formattedProducts = productsToInsert.map(p => ({
            ...p,
            id: Number(p.id),
            // Handle both types of reviews data (Number or Array)
            reviews: Array.isArray(p.reviews) ? p.reviews : (Number(p.reviews) || 0),
            // Handle both types of images data
            images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image || '', "", "", "", ""],
            added_date: p.added_date ? new Date(p.added_date) : new Date(),
        }));

        await model.deleteMany({});
        const result = await model.insertMany(formattedProducts);
        console.log(`✅ Successfully loaded ${result.length} ${modelName} items.`);
        return result.length;

    } catch (error) {
        console.error(`❌ Error loading ${modelName} data from ${url}:`, error.message);
        if (error.response && error.response.status === 404) {
            console.error(`-> Hint: The URL might be incorrect or the JSON file is not found.`);
        }
        return 0;
    }
}

// --- Main Database Seeding Function ---
async function seedDatabase() {
    try {
        await connection;
        console.log("🚀 MongoDB connection established for seeding.");

        let totalLoadedItems = 0;

        // --- Load data for ALL collections ---
        totalLoadedItems += await loadAndSeedData('Bracelets', BraceletModel, `${API_BASE_URL}/braclets.json`);
        totalLoadedItems += await loadAndSeedData('Earrings', EarringModel, `${API_BASE_URL}/earings.json`);
        totalLoadedItems += await loadAndSeedData('Necklaces', NecklaceModel, `${API_BASE_URL}/necklaces.json`);
        totalLoadedItems += await loadAndSeedData('Rings', RingModel, `${API_BASE_URL}/rings.json`);
        totalLoadedItems += await loadAndSeedData('BestSellers', BestSellerModel, `${API_BASE_URL}/best_sellers.json`);
        totalLoadedItems += await loadAndSeedData('Gifting', GiftingModel, `${API_BASE_URL}/gifting.json`);
        totalLoadedItems += await loadAndSeedData('Mangalsutras', MangalsutraModel, `${API_BASE_URL}/mangalsutra.json`);
        totalLoadedItems += await loadAndSeedData('NewArrivals', NewArrivalModel, `${API_BASE_URL}/new_arrivals.json`);
        totalLoadedItems += await loadAndSeedData('Other', OtherModel, `${API_BASE_URL}/other.json`);
        totalLoadedItems += await loadAndSeedData('Solitaires', SolitaryModel, `${API_BASE_URL}/solitaries.json`);
        totalLoadedItems += await loadAndSeedData('Trending', TrendingModel, `${API_BASE_URL}/trending.json`);
        
        console.log(`\n🎉 Database seeding complete! Total items loaded: ${totalLoadedItems}`);

    } catch (error) {
        console.error("❌ Critical error during database seeding:", error);
        process.exit(1);
    } finally {
        mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB.");
    }
}

// Execute the seeding function
seedDatabase();