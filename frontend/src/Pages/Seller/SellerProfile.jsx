import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import {
    Loader, User, Store, ArrowLeft, Mail, Phone,
    DollarSign, ShoppingBag, Truck, CheckCircle, Award, Check
} from 'lucide-react';
import { FaRupeeSign } from 'react-icons/fa';

const SellerProfile = ({ isLoggedIn, userRole }) => {
    const navigate = useNavigate();
    const db = getFirestore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState({
        storeName: "",
        storeDescription: "",
        artisanStory: "",
        storeAddress: "",
        storePhone: "",
        storeEmail: ""
    });
    const [metrics, setMetrics] = useState({
        totalProducts: 0,
        totalRevenue: 0,
        shippedOrders: 0,
        averageRating: 0
    });

    const fetchProfile = useCallback(async (userId) => {
        setLoading(true);
        try {
            // 1. Fetch seller profile document from the 'sellers' collection
            const profileDocRef = doc(db, "sellers", userId);
            const profileDocSnap = await getDoc(profileDocRef);
            if (profileDocSnap.exists()) {
                setProfile(profileDocSnap.data());
            }

            // 2. Fetch seller's products
            const productsQuery = query(collection(db, "products"), where("sellerId", "==", userId));
            const productsSnapshot = await getDocs(productsQuery);
            const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 3. Fetch seller's orders and calculate revenue/shipped count
            const ordersQuery = query(collection(db, "orders"), where("sellerId", "==", userId));
            const ordersSnapshot = await getDocs(ordersQuery);
            const ordersList = ordersSnapshot.docs.map(doc => doc.data());
            
            const totalRevenue = ordersList.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
            const shippedOrders = ordersList.filter(order => order.orderStatus === 'Shipped' || order.orderStatus === 'Delivered').length;
            
            // 4. Calculate average rating
            let totalRating = 0;
            let ratingCount = 0;
            productsList.forEach(p => {
                if (p.rating && p.reviews && p.reviews.length > 0) {
                    totalRating += p.rating * p.reviews.length;
                    ratingCount += p.reviews.length;
                }
            });
            const averageRating = ratingCount > 0 ? (totalRating / ratingCount) : 0;

            setMetrics({
                totalProducts: productsList.length,
                totalRevenue: totalRevenue,
                shippedOrders: shippedOrders,
                averageRating: parseFloat(averageRating.toFixed(1))
            });

        } catch (err) {
            console.error("Error fetching profile data:", err);
            setError("Failed to load profile data. Please check Firestore rules and connection.");
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        const user = auth.currentUser;
        if (user && (userRole === 'seller' || userRole === 'admin')) {
            fetchProfile(user.uid);
        } else if (isLoggedIn) {
            setError("Access Denied: You are not authorized to view this page.");
            navigate("/seller-dashboard");
        } else {
            navigate("/login");
        }
    }, [isLoggedIn, userRole, fetchProfile, navigate]);
    
    if (loading) {
        return (
             <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return <p>Error: {error}</p>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 p-4">
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-b-2xl shadow-xl p-6 mb-8">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between mb-4">
                        <Link to="/seller-dashboard" className="text-white hover:text-gray-100 flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <Store className="w-8 h-8" />
                            <h1 className="text-4xl md:text-5xl font-bold">My Store Profile</h1>
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            View your public-facing store information and performance metrics.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-green-50 rounded-xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500">Total Products</h3>
                            <p className="text-4xl font-bold text-green-600 mt-2">{metrics.totalProducts}</p>
                        </div>
                        <div className="bg-lime-50 rounded-xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500">Shipped Orders</h3>
                            <p className="text-4xl font-bold text-lime-600 mt-2">{metrics.shippedOrders}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                            <p className="text-4xl font-bold text-emerald-600 mt-2">
                                <FaRupeeSign className="inline w-5 h-5" />{metrics.totalRevenue.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-yellow-50 rounded-xl p-6 text-center">
                            <h3 className="text-sm font-medium text-gray-500">Average Rating</h3>
                            <p className="text-4xl font-bold text-yellow-600 mt-2">
                                {metrics.averageRating} <span className="text-lg">/ 5</span>
                            </p>
                        </div>
                    </div>
                    
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <User className="w-6 h-6 text-green-600" />
                            Store Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-700">
                            <div>
                                <p className="font-semibold">Store Name</p>
                                <p className="text-gray-600">{profile.storeName || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Store Description</p>
                                <p className="text-gray-600">{profile.storeDescription || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Artisan Story</p>
                                <p className="text-gray-600">{profile.artisanStory || 'N/A'}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Contact Details</p>
                                <div className="space-y-1 mt-1">
                                    <p className="text-gray-600 flex items-center gap-2">
                                        <Mail className="w-4 h-4" /> {profile.storeEmail || 'N/A'}
                                    </p>
                                    <p className="text-gray-600 flex items-center gap-2">
                                        <Phone className="w-4 h-4" /> {profile.storePhone || 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SellerProfile;