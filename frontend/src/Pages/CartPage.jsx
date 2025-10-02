import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from "../firebaseConfig";
import { ShoppingCart, Plus, Minus, Trash2, Package, CreditCard, ShieldCheck, Leaf, Truck } from "lucide-react";

const CartPage = () => {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const navigate = useNavigate();

    const db = useMemo(() => getFirestore(), []);

    const handleRemoveItem = useCallback(async (cartItemId) => {
        if (!user || !db) {
            console.warn("User not authenticated or DB not initialized.");
            return;
        }

        setActionLoading(prev => ({ ...prev, [`remove_${cartItemId}`]: true }));
        try {
            const itemRef = doc(db, 'cart', cartItemId);
            await deleteDoc(itemRef);
        } catch (err) {
            console.error("Error removing item:", err);
            setError(`Failed to remove item: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`remove_${cartItemId}`]: false }));
        }
    }, [user, db]);

    const loadUserCart = useCallback((userId) => {
        if (!db) return () => {};

        const q = query(
            collection(db, 'cart'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setCartItems(items);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching cart items:", err);
            setError(`Failed to load cart items: ${err.message}. Please ensure your Firestore indexes are correct.`);
            setLoading(false);
        });

        return unsubscribe;
    }, [db]);

    useEffect(() => {
        let unsubscribeCartListener = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                unsubscribeCartListener = loadUserCart(currentUser.uid);
            } else {
                setCartItems([]);
                setLoading(false);
                setError("Please log in to view your cart items.");
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeCartListener();
        };
    }, [loadUserCart]);

    const handleQuantityChange = useCallback(async (cartItemId, newQuantity) => {
        if (!user || !db) {
            console.warn("User not authenticated or DB not initialized.");
            return;
        }
        if (newQuantity < 1) {
            handleRemoveItem(cartItemId);
            return;
        }

        setActionLoading(prev => ({ ...prev, [`quantity_${cartItemId}`]: true }));
        try {
            const itemRef = doc(db, 'cart', cartItemId);
            await updateDoc(itemRef, {
                quantity: newQuantity,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error updating quantity:", err);
            setError(`Failed to update quantity: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`quantity_${cartItemId}`]: false }));
        }
    }, [user, db, handleRemoveItem]);

    const totalPrice = useMemo(() => {
        return cartItems.reduce((total, item) => {
            const price = parseFloat(item.productData?.price || 0);
            const quantity = item.quantity || 0;
            return total + (price * quantity);
        }, 0);
    }, [cartItems]);

    const totalQuantity = useMemo(() => {
        return cartItems.reduce((total, item) => total + (item.quantity || 0), 0);
    }, [cartItems]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-300 border-t-green-600 rounded-full animate-spin mx-auto"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-lime-600 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }}></div>
                    </div>
                    <p className="text-gray-600 font-medium">Loading your cart...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Cart</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="space-y-3">
                        {(error.includes("log in") || error.includes("Authentication required")) ? (
                            <button 
                                onClick={() => navigate('/login')} 
                                className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105"
                            >
                                Go to Login
                            </button>
                        ) : (
                            <button 
                                onClick={() => loadUserCart(user?.uid)} 
                                className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105"
                            >
                                Try Again
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                            <ShoppingCart className="w-8 h-8" />
                            <h1 className="text-3xl font-bold">Your Cart</h1>
                        </div>
                        <p className="text-green-100">
                            {cartItems.length === 0 ? "Your cart is empty" : `${cartItems.length} item${cartItems.length > 1 ? 's' : ''} in your cart`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {cartItems.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                            <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-lime-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Package className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">Your cart is empty</h2>
                            <p className="text-gray-600 mb-8">Looks like you haven't added any items yet. Start shopping for sustainable products!</p>
                            <Link 
                                to="/" 
                                className="inline-block bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 px-8 rounded-xl font-semibold hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                            >
                                Start Shopping
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items Section */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Try at Home Banner */}
                            <div className="bg-gradient-to-r from-green-600 to-lime-600 rounded-2xl p-6 text-white">
                                <div className="flex items-center space-x-3 mb-2">
                                    <Leaf className="w-6 h-6 text-yellow-300" />
                                    <h3 className="text-xl font-bold">Eco-Friendly Sourcing!</h3>
                                </div>
                                <p className="text-green-100">All our products are sourced from sustainable and ethical rural communities.</p>
                            </div>

                            {/* Cart Items */}
                            <div className="space-y-4">
                                {cartItems.map((item, index) => (
                                    <div 
                                        key={item.id} 
                                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 transform hover:scale-[1.02]"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* Product Image */}
                                            <div className="flex-shrink-0">
                                                <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden">
                                                    <img 
                                                        src={item.productData?.image || 'https://placehold.co/128x128/eeeeee/cccccc?text=No+Image'} 
                                                        alt={item.productData?.name || 'Product Image'} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            </div>

                                            {/* Product Details */}
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                    {item.productData?.name || 'Unknown Product'}
                                                </h3>
                                                <p className="text-gray-500 text-sm mb-2">SKU: {item.productId}</p>
                                                <div className="flex items-center space-x-2 mb-4 text-center">
                                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm text-green-600 font-medium text-center">Certified eco-friendly</span>
                                                </div>
                                                <div className="text-2xl font-bold text-gray-800">
                                                    ₹{(parseFloat(item.productData?.price) || 0).toLocaleString()}
                                                </div>
                                            </div>

                                            {/* Quantity Controls */}
                                            <div className="flex flex-col items-center space-y-4">
                                                <div className="flex items-center space-x-3 bg-gray-100 rounded-xl p-2">
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1 || actionLoading[`quantity_${item.id}`]}
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                                                    >
                                                        <Minus className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    <span className="w-12 text-center font-semibold text-gray-800">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                        disabled={actionLoading[`quantity_${item.id}`]}
                                                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50"
                                                    >
                                                        <Plus className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => handleRemoveItem(item.id)}
                                                    disabled={actionLoading[`remove_${item.id}`]}
                                                    className="flex items-center space-x-2 text-red-500 hover:text-red-700 transition-colors duration-200 disabled:opacity-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    <span className="text-sm font-medium">
                                                        {actionLoading[`remove_${item.id}`] ? 'Removing...' : 'Remove'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary Section */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6">Order Summary</h3>
                                
                                <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Items ({totalQuantity})</span>
                                        <span className="font-semibold">₹{totalPrice.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Shipping</span>
                                        <span className="font-semibold text-green-600">Free</span>
                                    </div>
                                    <hr className="border-gray-200" />
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-2xl">₹{totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => {
                                        if (user) {
                                            const itemsForPayment = cartItems.map(item => ({
                                                product: {
                                                    id: String(item.productId),
                                                    _id: String(item.productId),
                                                    name: item.productData?.name,
                                                    price: parseFloat(item.productData?.price),
                                                    image: item.productData?.image,
                                                    category: item.productData?.category || 'Uncategorized',
                                                },
                                                quantity: item.quantity,
                                            }));

                                            const orderData = {
                                                items: itemsForPayment,
                                                totalAmount: totalPrice,
                                                userId: user.uid,
                                                userEmail: user.email,
                                            };

                                            navigate('/payment', { state: { orderData } });
                                        } else {
                                            alert("Please log in to proceed to payment.");
                                            navigate('/login');
                                        }
                                    }}
                                    disabled={cartItems.length === 0}
                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                                >
                                    <CreditCard className="w-5 h-5" />
                                    <span>Proceed to Payment</span>
                                </button>

                                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-lime-50 rounded-xl">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <ShieldCheck className="w-5 h-5 text-green-500" />
                                        <span className="text-sm font-medium text-gray-700">Secure Checkout</span>
                                    </div>
                                    <p className="text-xs text-gray-600">Your payment information is encrypted and secure</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartPage;