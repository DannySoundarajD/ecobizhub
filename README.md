🌿 EcoBizHub – E-Commerce Platform for Eco-friendly Rural Products
EcoBizHub is a web-based marketplace built using the MERN Stack to empower MSMEs and rural entrepreneurs. It enables sellers to showcase eco-friendly and sustainable products, customers to shop seamlessly, and admins to manage the overall ecosystem.

🌐 Live Demo
Check out the live deployment: https://ecobizhub.onrender.com

✨ Key Features
Three Distinct User Roles: A tailored experience for Admins, Sellers, and Customers.
Secure Authentication: JWT-based authentication ensures secure access for all user roles.
Product & Inventory Management: Sellers can easily list products, manage stock, and set pricing.
Seamless Shopping Experience: Customers can browse, add items to a cart/wishlist, and checkout securely.
Secure Payments: Integrated with Razorpay for reliable and safe online transactions.
Order Management: End-to-end order tracking for customers and processing for sellers.
Admin Oversight: Comprehensive dashboard for admins to manage users, sellers, and transactions.
🛠️ Tech Stack
Frontend: React.js
Backend: Node.js, Express.js
Database: MongoDB Atlas
Authentication: JSON Web Tokens (JWT)
Payments: Razorpay Integration
Deployment: Vercel (Frontend), Render (Backend)
🚀 Getting Started
Follow these instructions to set up the project locally for development and testing.

Prerequisites
Node.js & npm (or yarn)
MongoDB Atlas account (or a local MongoDB instance)
Git
🔧 Installation & Setup
1. Clone the Repository
Bash

git clone https://github.com/YourOrg/EcoBizHub.git
cd EcoBizHub
2. Backend Setup
Bash

cd backend
npm install
Create a .env file inside the backend folder and add the following environment variables:

env

mongoURL=your_mongodb_connection_url
port=5000
ADMIN_CLAIM_SECRET_KEY=ADMIN2024
JWT_SECRET=your_jwt_secret
RAZORPAY_KEY=your_razorpay_key
⚠️ Important: Replace the placeholder values with your actual credentials.

Run the Backend Server:

Bash

# Using nodemon for auto-reloading during development
nodemon index.js

# Or using node
node index.js
✅ Expected Output:

text

Firebase Admin SDK initialized successfully.
Connected to MongoDB Atlas
Server is running on port 5000
3. Frontend Setup
Bash

# Navigate back to the root and then to the frontend directory
cd ../frontend
npm install
Create a .env file inside the frontend folder and add the following:

env

REACT_APP_API_URL=https://ecobizhub.onrender.com/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key_id
Note: For local development, you might set REACT_APP_API_URL to http://localhost:5000/api.

Run the Frontend Development Server:

Bash

npm start
The React frontend will now be available at: http://localhost:3000

👥 User Roles & Access
The platform supports three distinct user roles with specific permissions:

🔹 Admin
Manage sellers, customers, and product listings.
Monitor all platform transactions and view analytics.
Approve or reject new seller registration requests.
🔹 Seller
Register an account and get approved by the admin.
List and manage their portfolio of eco-friendly rural products.
Manage inventory levels and product pricing.
View and process incoming customer orders.
🔹 Customer
Browse the complete catalog of sustainable products.
Add desired items to a shopping cart or wishlist.
Place orders through a secure payment gateway.
Track the status of their current and past orders.
🚀 Features Roadmap (Upcoming)
 📊 Analytics Dashboard: Advanced dashboards for admins and sellers to track sales and performance.
 ✅ Seller Verification: Implement MSME certification badges and a robust seller verification process.
 📦 Bulk Ordering System: A dedicated system for institutional and B2B orders.
 💬 Customer Reviews & Ratings: Allow customers to rate products and leave reviews.
 🔔 Smart Notifications: Real-time notifications for order updates, new arrivals, and discounts.
 🌎 Multi-language Support: To improve accessibility and inclusivity for rural entrepreneurs.
