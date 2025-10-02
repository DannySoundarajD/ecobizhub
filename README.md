
# 💍 Thanga Nagai Ulagam - E-Commerce Website & Mobile App

**Thanga Nagai Ulagam** is a cross-platform e-commerce solution for jewellery shopping, built using the **MERN Stack**. It supports both web and mobile platforms, with the mobile version implemented via **React Native (Expo)** using a WebView that wraps the deployed MERN frontend.

---

## 🌐 Web Application Setup

### 📦 Clone the Repository

```bash
git clone https://github.com/Unitive-Technologies/E-commerce.git
cd E-commerce
```

---

### 🔧 Backend Setup

```bash
cd backend
npm install
```

#### ➕ Create `.env` file in the `backend` folder:

```env
mongoURL=your_mongodb_connection_url
port=5000
ADMIN_CLAIM_SECRET_KEY=ADMIN2024
```

> ⚠️ Replace `mongoURL` with your own MongoDB connection string.

---

### ▶️ Run the Backend Server

```bash
node index.js
# or
nodemon index.js
```

#### ✅ Expected Output:

```
Firebase Admin SDK initialized successfully.
Connected to MongoDB Atlas
Server is running on port 5000
```

---

### 🖥️ Frontend Setup

```bash
cd ../frontend
npm install
```

#### ➕ Create `.env` file in the `frontend` folder:

```env
REACT_APP_API_URL=https://thanga-nagai-ulagam.onrender.com/api
REACT_APP_RAZORPAY_KEY_ID=your_razorpay_key
```

> ⚠️ Replace `your_razorpay_key` with your actual Razorpay Key ID.

---

### ▶️ Run the Frontend

```bash
npm start
```

This will start the React frontend at `http://localhost:3000`.

---

## 📱 Mobile App (WebView Wrapper)

The mobile app is built using **React Native + Expo** and wraps the deployed website using WebView.

---

### 🔧 Setup and Run

```bash
cd mobile               # Go into the mobile app directory
npm install             # Install all dependencies
npx expo start          # Start the development server
```

- Open the **Expo Go** app on your Android or iOS device
- Scan the QR code shown in your terminal/browser to preview the app

---

### 📦 Build Android APK

To generate a standalone Android `.apk` file:

```bash
npx eas login                   # Login to your Expo account (if not already)
npx eas build:configure         # Set up build configuration
npx eas build -p android        # Start the build
```

> Expo will give you a download link for the APK after the build finishes.

---



## 🔗 Live Deployment

🌍 **Website:** [https://thanga-nagai-ulagam.onrender.com]([https://thanga-nagai-ulagam.onrender.com](https://thanga-nagai-ulagam-git-main-danny-soundarajds-projects.vercel.app/))

---

## 🛠️ Tech Stack

- **Frontend:** React.js (with Razorpay integration)
- **Backend:** Node.js + Express.js
- **Database:** MongoDB (Atlas)
- **Authentication:** JWT-based Admin auth
- **Mobile App:** React Native + Expo + WebView
- **Deployment:** Vercel{Frontend}(web),Render {Backend}(web), EAS (mobile)

---
