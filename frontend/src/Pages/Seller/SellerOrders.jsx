import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getFirestore, collection, query, where, getDocs, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
    X, Loader, Edit2, Save, Eye, MoreHorizontal, Package,
    ShoppingCart, Truck, Clock, AlertTriangle, ArrowLeft, ClipboardCopy, Tag, DollarSign, MapPin, Phone, FileText, CreditCard
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { FaRupeeSign } from "react-icons/fa";

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform scale-95 animate-scale-in">
                <div className="text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
                    <h3 className="mt-4 text-lg font-bold text-gray-900">{title}</h3>
                    <div className="mt-2 text-sm text-gray-600">
                        <p>{message}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-center space-x-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const SellerOrders = () => {
    const navigate = useNavigate();
    const db = getFirestore();
    const firebaseAuth = getAuth();

    const [orders, setOrders] = useState([]);
    const [productsMap, setProductsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [viewingOrder, setViewingOrder] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    const dropdownRefs = useRef({});

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => { setMessage({ show: false, type: "", text: "" }); }, 5000);
    };
    
    const fetchOrders = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const ordersCollectionRef = collection(db, "orders");
            const q = query(ordersCollectionRef, where("sellerId", "==", userId));
            
            const unsubscribe = onSnapshot(q, async (querySnapshot) => {
                let ordersList = [];
                const productIdsToFetch = new Set();
                
                querySnapshot.forEach(doc => {
                    const orderData = doc.data();
                    if (orderData.items && Array.isArray(orderData.items)) {
                        orderData.items.forEach(item => {
                            if (item.product && item.product.id) {
                                productIdsToFetch.add(item.product.id);
                            }
                        });
                    }
                    ordersList.push({ id: doc.id, ...orderData });
                });

                const fetchedProducts = await fetchProductDetails(Array.from(productIdsToFetch));
                setProductsMap(fetchedProducts);
                setOrders(ordersList);
                setLoading(false);
            }, (err) => {
                console.error("Real-time listener error:", err);
                setError("Failed to load orders in real-time. Please refresh.");
                setLoading(false);
            });
            return unsubscribe;
        } catch (err) {
            console.error("Error fetching orders:", err);
            setError(`Failed to fetch orders: ${err.message}`);
            setLoading(false);
            return () => {};
        }
    }, [db]);
    
    const fetchProductDetails = useCallback(async (productIds) => {
        if (productIds.length === 0) return {};
        const uniqueProductIds = [...new Set(productIds)];
        const productChunks = [];
        for (let i = 0; i < uniqueProductIds.length; i += 10) {
            productChunks.push(uniqueProductIds.slice(i, i + 10));
        }
    
        let fetchedProducts = {};
        for (const chunk of productChunks) {
            try {
                const q = query(collection(db, "products"), where("__name__", "in", chunk));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(docSnap => {
                    fetchedProducts[docSnap.id] = docSnap.data();
                });
            } catch (err) {
                console.error("Error fetching product chunk:", err);
            }
        }
        return fetchedProducts;
    }, [db]);

    useEffect(() => {
        let unsubscribe = () => {};
        const authUnsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists() && (userDocSnap.data().type === 'seller' || userDocSnap.data().type === 'admin')) {
                        unsubscribe = await fetchOrders(user.uid);
                    } else {
                        setError("Access Denied: You are not authorized to view this page.");
                        setLoading(false);
                        navigate("/seller-dashboard");
                    }
                } catch (err) {
                    setError("Authentication failed or user data incomplete.");
                    setLoading(false);
                    navigate("/login");
                }
            } else {
                setLoading(false);
                setError("You must be logged in to view this page.");
                navigate("/login");
            }
        });
        return () => {
            authUnsubscribe();
            unsubscribe();
        };
    }, [fetchOrders, navigate, firebaseAuth, db]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId] && !dropdownRefs.current[openDropdownId].contains(event.target)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdownId]);

    const toggleDropdown = (orderId) => {
        setOpenDropdownId(openDropdownId === orderId ? null : orderId);
    };

    const handleStatusChange = async (orderId, newStatus) => {
        setLoading(true);
        try {
            const orderDocRef = doc(db, "orders", orderId);
            await updateDoc(orderDocRef, {
                orderStatus: newStatus,
                updatedAt: serverTimestamp(),
            });
            showMessage("success", `Order status updated to '${newStatus}'`);
        } catch (err) {
            console.error("Error updating order status:", err);
            showMessage("error", `Failed to update order status: ${err.message}`);
        } finally {
            setLoading(false);
            setOpenDropdownId(null);
        }
    };
    
    const handleViewDetails = (order) => {
        setOpenDropdownId(null);
        setViewingOrder(order);
    };

    const handleCloseModal = () => {
        setViewingOrder(null);
    };

    const getStatusClassName = (status) => {
        switch (status) {
            case 'Processing': return 'bg-blue-100 text-blue-800';
            case 'Shipped': return 'bg-lime-100 text-lime-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            case 'Confirmed': return 'bg-cyan-100 text-cyan-800';
            case 'Pending':
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Orders</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button onClick={() => navigate("/seller-dashboard")} className="px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 pb-12">
            {message.show && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] p-4 rounded-lg shadow-lg flex items-center space-x-3
                                 ${message.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                    <span className="text-xl">
                        {message.type === "error" ? "⚠️" : "✅"}
                    </span>
                    <div>
                        <strong className="font-bold">{message.type.toUpperCase()}:</strong>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white sticky top-0 z-20 shadow-lg">
                <div className="container mx-auto px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Package className="w-9 h-9" />
                        <h1 className="text-4xl md:text-5xl font-bold">My Orders</h1>
                    </div>
                    <p className="text-xl text-green-100 max-w-2xl mx-auto">
                        View and manage orders for your products.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">My Orders ({orders.length})</h2>
                    </div>
                    <div className="overflow-x-auto min-h-[300px]">
                        {orders.length === 0 && !loading ? (
                            <div className="text-center py-12 text-gray-600">
                                <p className="mb-4 text-lg">You don't have any orders yet.</p>
                                <Package className="w-12 h-12 mx-auto text-gray-400" />
                            </div>
                        ) : (
                            <table className="min-w-full leading-normal orders-table">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg text-center">Order ID</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Customer</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Amount</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Date</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Product(s)</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap truncate max-w-[100px] font-mono">{order.id}</p>
                                            </td>
                                            <td className="border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap font-medium">{order.shippingAddress?.fullName || 'N/A'}</p>
                                                <p className="text-gray-600 whitespace-no-wrap text-xs">{order.shippingAddress?.email || 'N/A'}</p>
                                            </td>
                                            <td className="border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap font-semibold flex items-center">₹{order.totalAmount ? parseFloat(order.totalAmount).toLocaleString() : 'N/A'}</p>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClassName(order.orderStatus)}`}>
                                                    {order.orderStatus}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap">
                                                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A'}
                                                </p>
                                                <p className="text-gray-600 whitespace-no-wrap text-xs">
                                                    {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </p>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                {Array.isArray(order.items) && order.items.length > 0 ? (
                                                    <div className="flex items-center space-x-2">
                                                        <img
                                                            src={order.items[0].product?.image || 'https://via.placeholder.com/50?text=No+Img'}
                                                            alt={order.items[0].product?.name || 'Product Image'}
                                                            className="w-10 h-10 object-contain rounded-md border border-gray-200 flex-shrink-0"
                                                            onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=No+Img'}
                                                        />
                                                        <div>
                                                            <p className="text-gray-900 whitespace-no-wrap truncate max-w-[120px] font-medium">{order.items[0].product?.name || 'Unknown Product'}</p>
                                                            <p className="text-gray-600 whitespace-no-wrap text-xs">Qty: {order.items[0].quantity || 1}</p>
                                                            {order.items.length > 1 && (
                                                                <p className="text-gray-500 text-xs">+{order.items.length - 1} more</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-600">No product</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                                <div className="relative inline-block text-left" ref={el => dropdownRefs.current[order.id] = el}>
                                                    <button
                                                        onClick={() => toggleDropdown(order.id)}
                                                        className="inline-flex justify-center items-center p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                        aria-expanded={openDropdownId === order.id}
                                                        aria-haspopup="true"
                                                    >
                                                        <MoreHorizontal size={20} />
                                                    </button>
                                                    {openDropdownId === order.id && (
                                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                                                <button
                                                                    onClick={() => handleViewDetails(order)}
                                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                    role="menuitem"
                                                                >
                                                                    <Eye size={16} className="mr-2" /> View Details
                                                                </button>
                                                                <div className="border-t border-gray-100 my-1"></div>
                                                                <p className="px-4 pt-2 text-xs font-semibold text-gray-500 uppercase">Update Status</p>
                                                                {['Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                                                                    <button
                                                                        key={status}
                                                                        onClick={() => handleStatusChange(order.id, status)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                        role="menuitem"
                                                                    >
                                                                        <span className={`h-2.5 w-2.5 rounded-full mr-2 ${getStatusClassName(status)}`}></span> {status}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* View Details Modal */}
            {viewingOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative w-full max-w-xl lg:max-w-3xl overflow-y-auto max-h-[90vh] custom-scrollbar rounded-2xl shadow-2xl
                                                 bg-gradient-to-br from-lime-50 to-green-50 text-gray-800 transform scale-95 animate-scale-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center bg-gradient-to-r from-green-100 to-lime-100 p-6 border-b border-gray-200">
                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <Eye size={24} className="text-green-600" /> Order Details <span className="text-base md:text-lg font-mono text-gray-600">#{viewingOrder.id}</span>
                            </h3>
                            <button className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100" onClick={handleCloseModal}>
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-green-200">
                                <h4 className="font-bold text-lg text-green-700 mb-3 flex items-center gap-2">
                                    <ClipboardCopy size={18} className="text-green-500" /> Order Summary
                                </h4>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                    <p className="font-medium text-gray-700 text-left">Status:</p>
                                    <span className={`px-2 py-0.5 inline-flex justify-center items-center text-xs leading-5 font-semibold rounded-full w-fit ${getStatusClassName(viewingOrder.orderStatus)} text-left`}>
                                        {viewingOrder.orderStatus}
                                    </span>
                                    <p className="font-medium text-gray-700 text-left">Total:</p>
                                    <span className="text-green-800 font-bold text-left">₹{viewingOrder.totalAmount?.toLocaleString()}</span>
                                    <p className="font-medium text-gray-700 text-left">Order Date:</p>
                                    <span className="text-left">{viewingOrder.createdAt?.toDate ? viewingOrder.createdAt.toDate().toLocaleDateString('en-IN', { dateStyle: 'short' }) : 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">User ID:</p>
                                    <span className="font-mono text-xs break-all text-left">{viewingOrder.userId || 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">Transaction ID:</p>
                                    <span className="font-mono text-xs break-all text-left">{viewingOrder.transactionId || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-lime-200">
                                <h4 className="font-bold text-lg text-lime-700 mb-3 flex items-center gap-2">
                                    <CreditCard size={18} className="text-lime-500" /> Payment Info
                                </h4>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                    <p className="font-medium text-gray-700 text-left">Method:</p>
                                    <span className="text-left">{viewingOrder.paymentMethod?.toUpperCase() || 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">Status:</p>
                                    <span className={`px-2 py-0.5 inline-flex justify-center items-center text-xs leading-5 font-semibold rounded-full w-fit ${viewingOrder.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-left`}>
                                        {viewingOrder.paymentStatus || 'N/A'}
                                    </span>
                                    {viewingOrder.paymentId && (
                                        <>
                                            <p className="font-medium text-gray-700 text-left">Payment ID:</p>
                                            <span className="font-mono text-xs break-all text-left">{viewingOrder.paymentId}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-cyan-200">
                                <h4 className="font-bold text-lg text-cyan-700 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-cyan-500" /> Shipping Address
                                </h4>
                                {viewingOrder.shippingAddress ? (
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                        <p className="font-medium text-gray-700 text-left">Recipient:</p>
                                        <span className="text-left">{viewingOrder.shippingAddress.fullName || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Address:</p>
                                        <span className="text-left">{viewingOrder.shippingAddress.address || 'N/A'}, {viewingOrder.shippingAddress.city || 'N/A'}, {viewingOrder.shippingAddress.state || 'N/A'} - {viewingOrder.shippingAddress.pincode || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Phone:</p>
                                        <span className="text-left">{viewingOrder.shippingAddress.phone || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Email:</p>
                                        <span className="text-left">{viewingOrder.shippingAddress.email || 'N/A'}</span>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm">No shipping address available.</p>
                                )}
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200 md:col-span-1 max-h-52 overflow-y-auto custom-scrollbar">
                                <h4 className="font-bold text-lg text-blue-700 mb-3 flex items-center gap-2">
                                    <Tag size={18} className="text-blue-500" /> Ordered Products
                                </h4>
                                {Array.isArray(viewingOrder.items) && viewingOrder.items.length > 0 ? (
                                    <div className="space-y-3">
                                        {viewingOrder.items.map((item, index) => {
                                            const product = productsMap[item.product?.id] || item.product || {};
                                            return (
                                                <div key={index} className="flex items-start sm:items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    {product.image && (
                                                        <img
                                                            src={product.image}
                                                            alt={product.name || 'Product Image'}
                                                            className="w-16 h-16 object-contain rounded-md border border-gray-200 flex-shrink-0"
                                                            onError={(e) => e.target.src = 'https://via.placeholder.com/60?text=No+Image'}
                                                        />
                                                    )}
                                                    <div className="flex-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm items-baseline">
                                                        <p className="font-semibold text-gray-900 col-span-2 text-left">{product.name || 'Unknown Product'}</p>
                                                        <p className="text-gray-700 text-left">Qty:</p>
                                                        <span className="font-medium text-left">{item.quantity || 1}</span>
                                                        <p className="text-gray-700 text-left">Unit Price:</p>
                                                        <span className="font-medium text-left">₹{(parseFloat(product.price) || 0).toLocaleString()}</span>
                                                        {(item.quantity !== undefined && item.quantity !== null) &&
                                                            (product.price !== undefined && product.price !== null) && (
                                                                <>
                                                                    <p className="font-medium text-gray-700 text-left">Subtotal:</p>
                                                                    <span className="font-bold text-green-700 text-left">
                                                                        ₹{((item.quantity || 1) * (parseFloat(product.price) || 0)).toLocaleString()}
                                                                    </span>
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm">No product details available.</p>
                                )}
                            </div>
                            {viewingOrder.notes && (
                                <div className="bg-white rounded-lg shadow-sm p-4 border border-yellow-200 lg:col-span-2">
                                    <h4 className="font-bold text-lg text-yellow-700 mb-3 flex items-center gap-2">
                                        <FileText size={18} className="text-yellow-500" /> Order Notes
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">{viewingOrder.notes}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="bg-gradient-to-r from-green-100 to-lime-100 p-6 border-t border-gray-200 flex justify-end">
                            <button onClick={handleCloseModal} className="px-8 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerOrders;