const admin = require('../config/firebaseAdmin');

const auth = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
        console.warn("Auth middleware: No valid Bearer token found in headers.");
        return res.status(401).send({ msg: "Unauthorized: No authentication token provided or token format is invalid (expected 'Bearer <token>')." });
    }

    const idToken = token.split('Bearer ')[1]; 

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken); 
        
        
        req.userID = decodedToken.uid; 
        req.email = decodedToken.email; 
        req.user = decodedToken; 
        
        next(); 

    } catch (error) {
        console.error("Auth middleware error:", error.code, error.message);
        
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).send({ msg: "Unauthorized: Authentication token has expired. Please log in again." });
        } 
        else if (error.code === 'auth/invalid-id-token' || error.code === 'auth/argument-error') {
            return res.status(401).send({ msg: "Unauthorized: Invalid authentication token. Please log in again." });
        }
        
        return res.status(401).send({ msg: "Unauthorized: Authentication failed. Please log in again." });
    }
};


const adminAuth = async (req, res, next) => {
    const token = req.headers.authorization;

    if (!token || !token.startsWith('Bearer ')) {
        console.warn("Admin Auth middleware: No valid token provided.");
        return res.status(401).send({ msg: "Unauthorized: Admin authentication token is required." });
    }

    const idToken = token.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
       
        if (decodedToken.admin === true) {
            req.userID = decodedToken.uid;
            req.email = decodedToken.email;
            req.user = decodedToken;
            next(); 
        } else {
            console.warn(`Admin access denied for user: ${decodedToken.email || decodedToken.uid}. Missing admin claim.`);
            return res.status(403).send({ msg: "Forbidden: You do not have administrator privileges." });
        }
    } catch (error) {
        console.error("Admin authentication failed:", error.code, error.message);
        return res.status(401).send({ msg: "Unauthorized: Failed to verify admin status." });
    }
};

module.exports = { auth, adminAuth };