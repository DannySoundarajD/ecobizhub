const express = require('express');
const cors = require('cors');
const { connection } = require('./db');
const admin = require('./config/firebaseAdmin');

// --- Import existing routers and load functions ---
const { bestSellerRouter, loadBestSellerData } = require('./routes/best_seller.route');
const { newArrivalRouter, loadNewArrivalData } = require('./routes/new_arrival.route');
const { braceletRouter, loadBraceletData } = require('./routes/bracelet.route');
const { mangalsutraRouter, loadMangalsutraData } = require('./routes/mangalsutra.route');
const { otherRouter, loadOtherData } = require('./routes/other.route');
const { ringRouter, loadRingData } = require('./routes/ring.route');
const { solitaryRouter, loadSolitaryData } = require('./routes/solitary.route');

// --- Import NEW routers and load functions ---
const { earringRouter, loadEarringData } = require('./routes/earring.route');
const { giftingRouter, loadGiftingData } = require('./routes/gifting.route');
const { necklaceRouter, loadNecklaceData } = require('./routes/necklace.route');
const { trendingRouter, loadTrendingData } = require('./routes/trending.route');

const { auth, adminAuth } = require('./middleware/auth.middleware');

const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(cors());

const ADMIN_CLAIM_SECRET_KEY = process.env.ADMIN_CLAIM_SECRET_KEY;


// --- Existing Routes (Protected by auth middleware) ---
app.use("/api/bracelet", auth, braceletRouter);
app.use("/api/mangalsutra", auth, mangalsutraRouter);
app.use("/api/other", auth, otherRouter);
app.use("/api/ring", auth, ringRouter);
app.use("/api/solitary", auth, solitaryRouter);
app.use("/api/bestseller", auth, bestSellerRouter);
app.use("/api/new_arrival", auth, newArrivalRouter);

// --- NEW Routes for newly created models (Protected by auth middleware) ---
app.use("/api/earring", auth, earringRouter);
app.use("/api/gifting", auth, giftingRouter);
app.use("/api/necklace", auth, necklaceRouter);
app.use("/api/trending", auth, trendingRouter);


// --- Admin Claim Setter (for initial admin setup) ---
app.post('/admin/set-claim', async (req, res) => {
    const { uid, secretKey } = req.body;

    if (secretKey !== ADMIN_CLAIM_SECRET_KEY) {
        console.warn('Unauthorized attempt to set admin claim with incorrect secret key.');
        return res.status(403).send({ msg: 'Forbidden: Invalid secret key.' });
    }

    if (!uid) {
        return res.status(400).send({ msg: 'Bad Request: User UID is required.' });
    }

    try {
        await admin.auth().setCustomUserClaims(uid, { admin: true });
        // Force token refresh by revoking existing tokens
        await admin.auth().revokeRefreshTokens(uid);

        res.status(200).send({
            msg: `Successfully set 'admin: true' claim for user with UID: ${uid}.`,
            note: 'The user must log out and log back in to get a new token with the updated claim.'
        });
    } catch (error) {
        console.error('Error setting custom claim:', error);
        if (error.code === 'auth/user-not-found') {
            return res.status(404).send({ msg: `User with UID '${uid}' not found.` });
        }
        res.status(500).send({ msg: 'Failed to set admin claim.', error: error.message });
    }
});


// --- Order Placement Route ---
app.post('/api/place-order', auth, async (req, res) => {
    const orderData = req.body;

    if (!req.userID) {
        return res.status(401).json({ message: 'User not authenticated.' });
    }
    
    orderData.userId = req.userID; // Attach user ID from authentication middleware

    try {
        const docRef = await db.collection('orders').add({
            ...orderData,
            createdAt: admin.firestore.FieldValue.serverTimestamp() // Firestore timestamp
        });

        console.log('Order successfully saved to Firestore with ID:', docRef.id);

        res.status(200).json({
            message: 'Order placed successfully!',
            orderId: docRef.id
        });

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            message: 'Failed to place order',
            error: error.message
        });
    }
});


// --- Root Welcome Route ---
app.get("/", (req, res) => {
    res.send("Welcome to the Jewellery API!");
});

// --- Initial Data Load Endpoints (Admin access required) ---
// These endpoints are for one-time (or occasional) data loading from your JSON files
// They delete existing data in the collection before inserting fresh data.
app.post("/load-initial-data/bracelets", adminAuth, async (req, res) => {
    try {
        const result = await loadBraceletData();
        res.status(200).send({ msg: `Loaded ${result.length} bracelets.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/mangalsutra", adminAuth, async (req, res) => {
    try {
        const result = await loadMangalsutraData();
        res.status(200).send({ msg: `Loaded ${result.length} mangalsutra items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/other", adminAuth, async (req, res) => {
    try {
        const result = await loadOtherData();
        res.status(200).send({ msg: `Loaded ${result.length} other items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/rings", adminAuth, async (req, res) => {
    try {
        const result = await loadRingData();
        res.status(200).send({ msg: `Loaded ${result.length} rings.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/solitaries", adminAuth, async (req, res) => {
    try {
        const result = await loadSolitaryData();
        res.status(200).send({ msg: `Loaded ${result.length} solitaries.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/best_sellers", adminAuth, async (req, res) => {
    try {
        const result = await loadBestSellerData();
        res.status(200).send({ msg: `Loaded ${result.length} best seller items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/new_arrivals", adminAuth, async (req, res) => {
    try {
        const result = await loadNewArrivalData();
        res.status(200).send({ msg: `Loaded ${result.length} new arrival items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

// --- NEW Initial Data Load Endpoints ---
app.post("/load-initial-data/earrings", adminAuth, async (req, res) => {
    try {
        const result = await loadEarringData();
        res.status(200).send({ msg: `Loaded ${result.length} earrings.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/gifting", adminAuth, async (req, res) => {
    try {
        const result = await loadGiftingData();
        res.status(200).send({ msg: `Loaded ${result.length} gifting items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/necklaces", adminAuth, async (req, res) => {
    try {
        const result = await loadNecklaceData();
        res.status(200).send({ msg: `Loaded ${result.length} necklaces.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});

app.post("/load-initial-data/trending", adminAuth, async (req, res) => {
    try {
        const result = await loadTrendingData();
        res.status(200).send({ msg: `Loaded ${result.length} trending items.`, data: result });
    } catch (err) { res.status(500).send({ err: err.message }); }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    try {
        await connection; // Ensure MongoDB connection is established
        console.log("Connected to MongoDB Atlas");
        console.log(`Server is running on port ${PORT}`);
    } catch (err) {
        console.error("Failed to connect to DB or start server:", err);
        process.exit(1); // Exit process if DB connection fails
    }
});