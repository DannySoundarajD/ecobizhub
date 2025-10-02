import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import { Loader, Store, BarChart, ShoppingBag, PlusSquare, User, Home, Package, ShoppingCart } from 'lucide-react';

export default function SellerDashboard({ isLoggedIn, userRole }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState("Seller");
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const db = getFirestore();

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        if (userData.type === "seller" || userData.type === "admin") {
                            setUserName(userData.fname || user.displayName || "Seller");
                            setLoading(false);
                        } else {
                            showMessage("error", "Access Denied: You are not authorized as a seller.");
                            navigate("/");
                            setLoading(false);
                        }
                    } else {
                        showMessage("error", "User data not found. Access denied.");
                        navigate("/");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching seller status:", error);
                    showMessage("error", "Failed to verify seller status. Please try again.");
                    navigate("/");
                    setLoading(false);
                }
            } else {
                showMessage("error", "You need to be logged in to access this page.");
                navigate("/login");
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [navigate, db]);

    const handleViewProducts = () => {
        navigate('/seller/products');
    };

    const handleAddProduct = () => {
        navigate('/seller/products/add');
    };

    const handleViewOrders = () => {
        navigate('/seller/orders');
    };

    const handleManageProfile = () => {
        navigate('/seller/profile');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading Seller Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50">
            {message.show && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 
                                ${message.type === "error" ? "bg-red-500 text-white" : message.type === "success" ? "bg-green-500 text-white" : "bg-blue-500 text-white"}`}>
                    <span className="text-xl">{message.type === "error" ? "⚠️" : "✅"}</span>
                    <div>
                        <strong className="font-bold">{message.type.toUpperCase()}:</strong>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}
            
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white">
                <div className="container mx-auto px-4 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Store className="w-8 h-8" />
                            <h1 className="text-4xl md:text-5xl font-bold">Seller Dashboard</h1>
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            Welcome, {userName}! Manage your store, products, and orders.
                        </p>
                        <Link to="/" className="mt-8 px-6 py-3 bg-white text-green-600 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 transform hover:scale-105">
                            <Home className="w-5 h-5 inline mr-2" /> Go to Store
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                        <div className="p-4 bg-lime-100 rounded-full mb-4">
                            <ShoppingBag className="w-16 h-16 text-lime-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">My Products</h3>
                        <p className="text-gray-600 mb-4">View and manage all your listed products and inventory.</p>
                        <button onClick={handleViewProducts} className="mt-auto w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                            Manage Products
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                        <div className="p-4 bg-green-100 rounded-full mb-4">
                            <PlusSquare className="w-16 h-16 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Product</h3>
                        <p className="text-gray-600 mb-4">List a new item for sale in your store.</p>
                        <button onClick={handleAddProduct} className="mt-auto w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                            Create New Product
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                        <div className="p-4 bg-cyan-100 rounded-full mb-4">
                            <BarChart className="w-16 h-16 text-cyan-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">My Orders</h3>
                        <p className="text-gray-600 mb-4">Track and fulfill orders placed by customers.</p>
                        <button onClick={handleViewOrders} className="mt-auto w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                            View Orders
                        </button>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                        <div className="p-4 bg-yellow-100 rounded-full mb-4">
                            <User className="w-16 h-16 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">My Public Profile</h3>
                        <p className="text-gray-600 mb-4">Update your store information and artisan story.</p>
                        <button onClick={handleManageProfile} className="mt-auto w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}