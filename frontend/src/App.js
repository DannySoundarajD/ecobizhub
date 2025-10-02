// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import AllRoutes from "./routes/AllRoutes";
import ScrollToTop from "./Components/ScrollToTop";
import { auth, db } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { FaLeaf } from "react-icons/fa";

import "./App.css";

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Define routes where Navbar and Footer should NOT be shown
  const noNavFooterRoutes = ["/login", "/register"];

  const showNavAndFooter = useMemo(() => {
    if (noNavFooterRoutes.includes(location.pathname)) {
      return false;
    }
    return true;
  }, [location.pathname]);

  useEffect(() => {
    let minLoaderTimer;

    const unsubscribeFirebase = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.type);
            console.log("Firebase user logged in. Role:", userData.type);
          } else {
            console.log("User document not found in Firestore.");
            setUserRole("user");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserRole("user");
        }
      } else {
        console.log("Firebase user signed out.");
        setIsLoggedIn(false);
        setUserRole(null);
      }

      // Force loader to stay for at least 2 seconds
      minLoaderTimer = setTimeout(() => {
        setLoading(false);
      }, 2000);
    });

    return () => {
      clearTimeout(minLoaderTimer);
      unsubscribeFirebase();
    };
  }, [location.pathname, navigate]);

  // Animated Loader for EcoBizHub
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        {/* Animated Eco icon */}
        <motion.div
          className="relative flex items-center justify-center"
          animate={{ rotateY: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          style={{ perspective: 1000 }}
        >
          <motion.div
            className="w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          >
            <FaLeaf className="text-white text-4xl" />
          </motion.div>
        </motion.div>

        {/* Loading text with bounce */}
        <motion.p
          className="mt-6 text-2xl font-semibold text-emerald-700"
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          Loading EcoBizHub...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="App">
      <ScrollToTop />
      {showNavAndFooter && (
        <Navbar isLoggedIn={isLoggedIn} userRole={userRole} />
      )}

      <div className={showNavAndFooter ? "pt-20" : ""}>
        <AllRoutes isLoggedIn={isLoggedIn} userRole={userRole} />
      </div>

      {showNavAndFooter && <Footer />}
    </div>
  );
}

export default App;
