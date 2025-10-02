import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { Loader, Award, Leaf, Settings, Users, Package, PlusSquare, TrendingUp, ShoppingCart, Home, TreePine } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [userName, setUserName] = useState("Admin");
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
                        if (userData.type === "admin") {
                            setUserName(userData.fname || user.displayName || "Admin");
                            setLoading(false);
                        } else {
                            showMessage("error", "Access Denied: You are not an administrator.");
                            navigate("/");
                            setLoading(false);
                        }
                    } else {
                        showMessage("error", "User data not found. Access denied.");
                        navigate("/");
                        setLoading(false);
                    }
                } catch (error) {
                    console.error("Error fetching admin status:", error);
                    showMessage("error", "Failed to verify admin status. Please try again.");
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

    const handleViewProducts = (category) => {
        navigate(`/admin/products/${category}`);
    };

    const handleAddProduct = () => {
        navigate('/admin/products/add');
    };

    const handleViewOrders = () => {
        navigate('/admin/orders');
    };

    const handleManageCustomers = () => {
        navigate('/admin/customers');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading Admin Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50">
            {message.show && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3
                                ${message.type === "error" ? "bg-red-500 text-white" : message.type === "success" ? "bg-green-500 text-white" : "bg-blue-500 text-white"}`}>
                    <span className="text-xl">
                        {message.type === "error" ? "⚠️" : "✅"}
                    </span>
                    <div>
                        <strong className="font-bold">{message.type.toUpperCase()}:</strong>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}
            
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white">
                <div className="container mx-auto px-4 py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Award className="w-8 h-8" />
                            <h1 className="text-4xl md:text-5xl font-bold">EcoBizHub Admin Panel</h1>
                            <Settings className="w-8 h-8" />
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            Effortlessly manage your entire eco-friendly marketplace.
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-6">
                            <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2">
                                <Leaf className="w-5 h-5" />
                                <span className="text-sm font-medium">Sustainable Control</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-full px-4 py-2">
                                <TrendingUp className="w-5 h-5 fill-current" />
                                <span className="text-sm font-medium">Eco-Impact Dashboard</span>
                            </div>
                        </div>
                        {/* Go to Home button */}
                        <Link to="/" className="mt-8 px-6 py-3 bg-white text-green-600 rounded-xl font-medium hover:bg-gray-100 transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
                            <Home className="w-5 h-5" /> Go to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Desktop Sidebar / Navigation - Adapting for Dashboard */}
                    <aside className="hidden lg:block w-80 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8 border border-gray-100 space-y-4">
                        <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent mb-4">
                            Navigation
                        </h3>
                        <nav className="space-y-2">
                            <Link to="/admin/products/handicrafts" className="flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-green-600 transition-colors">
                                <Package className="w-5 h-5" /> Product Management
                            </Link>
                            <Link to="/admin/orders" className="flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-green-600 transition-colors">
                                <ShoppingCart className="w-5 h-5" /> Order Management
                            </Link>
                            <Link to="/admin/customers" className="flex items-center gap-3 p-3 rounded-xl text-gray-700 hover:bg-gray-100 hover:text-green-600 transition-colors">
                                <Users className="w-5 h-5" /> Customer Management
                            </Link>
                            {/* Add other admin links here if applicable */}
                        </nav>
                    </aside>

                    {/* Main Dashboard Cards */}
                    <main className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {/* Card: Product Collection */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                                <div className="p-4 bg-green-100 rounded-full mb-4">
                                    <TreePine className="w-16 h-16 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Eco-Products</h3>
                                <p className="text-gray-600 mb-4">Manage your sustainable products, update details & add new arrivals.</p>
                                <button className="mt-auto px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105" onClick={() => handleViewProducts('handicrafts')}>
                                    View Products
                                </button>
                            </div>

                            {/* Card: Add New Product */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                                <div className="p-4 bg-lime-100 rounded-full mb-4">
                                    <PlusSquare className="w-16 h-16 text-lime-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Add New Product</h3>
                                <p className="text-gray-600 mb-4">Effortlessly add new items to your online marketplace.</p>
                                <button className="mt-auto px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105" onClick={handleAddProduct}>
                                    Create New Product
                                </button>
                            </div>

                            {/* Card: Order Management */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                                <div className="p-4 bg-cyan-100 rounded-full mb-4">
                                    <ShoppingCart className="w-16 h-16 text-cyan-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Order Management</h3>
                                <p className="text-gray-600 mb-4">Track, update, and manage all customer orders with ease.</p>
                                <button className="mt-auto px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105" onClick={handleViewOrders}>
                                    View Orders
                                </button>
                            </div>

                            {/* Card: Customer Management */}
                            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 flex flex-col items-center text-center">
                                <div className="p-4 bg-yellow-100 rounded-full mb-4">
                                    <Users className="w-16 h-16 text-yellow-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Management</h3>
                                <p className="text-gray-600 mb-4">Oversee customer accounts and their purchase history.</p>
                                <button className="mt-auto px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105" onClick={handleManageCustomers}>
                                    Manage Customers
                                </button>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}