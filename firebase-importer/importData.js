const admin = require('firebase-admin');
const axios = require('axios');

// Path to your service account key file
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// List of data sources (URLs and corresponding Firestore collection names)
const dataSources = [
  {
    url: 'https://ecobizhub-data.vercel.app/herbal_products.json',
    collectionName: 'herbal_products'
  },
  {
    url: 'https://ecobizhub-data.vercel.app/handicrafts.json',
    collectionName: 'handicrafts'
  },
  {
    url: 'https://ecobizhub-data.vercel.app/natural_fabrics.json',
    collectionName: 'natural_fabrics'
  },
  {
    url: 'https://ecobizhub-data.vercel.app/organic_foods.json',
    collectionName: 'organic_foods'
  },
  {
    url: 'https://ecobizhub-data.vercel.app/upcycled_goods.json',
    collectionName: 'upcycled_goods'
  },
];

async function importData() {
  console.log("Starting data import to Firestore...");

  for (const source of dataSources) {
    try {
      console.log(`\nFetching data from ${source.url}...`);
      const response = await axios.get(source.url);
      const data = response.data;
      const collectionRef = db.collection(source.collectionName);

      if (!Array.isArray(data)) {
        throw new Error(`Data from ${source.url} is not an array.`);
      }

      console.log(`Found ${data.length} items for collection '${source.collectionName}'.`);

      // Use a batch write for better performance
      const batch = db.batch();
      let totalItemsAdded = 0;

      data.forEach((item) => {
        // Use 'id' or '_id' as the document ID for consistent, readable references
        const docId = String(item.id || item._id);
        const docRef = collectionRef.doc(docId);
        batch.set(docRef, item);
        totalItemsAdded++;
      });
      
      await batch.commit();
      console.log(`Successfully imported ${totalItemsAdded} documents to collection '${source.collectionName}'.`);

    } catch (error) {
      console.error(`\nError importing data for collection '${source.collectionName}':`, error.message);
    }
  }

  console.log("\nData import process finished.");
}

// Execute the import function
importData();