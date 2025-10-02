import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    getFirestore,
    collection,
    doc,
    updateDoc,
    query,
    orderBy,
    getDocs,
    onSnapshot,
    deleteDoc,
    serverTimestamp,
    getDoc,
    where
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
    X, Loader, Edit2, Save, Trash2, Eye, MoreHorizontal, Package, TrendingUp, Clock, FileText,
    ShoppingCart, Truck, CreditCard, Users, DollarSign, Calendar, MapPin, Phone, Mail, Image, ClipboardCopy, Tag, AlertTriangle, Leaf, TreePine
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
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};


const AdminOrders = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [productsMap, setProductsMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [editingOrder, setEditingOrder] = useState(null);
    const [sortBy, setSortBy] = useState('createdAt_desc');
    const [editForm, setEditForm] = useState({});
    const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState(null);

    const dropdownRefs = useRef({});

    const db = getFirestore();
    const firebaseAuth = getAuth();

    const overviewData = useMemo(() => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.totalAmount) || 0), 0);
        const pendingOrders = orders.filter(o => o.orderStatus === 'Pending').length;
        const processingOrders = orders.filter(o => o.orderStatus === 'Processing').length;
        const deliveredOrders = orders.filter(o => o.orderStatus === 'Delivered').length;
        const cancelledOrders = orders.filter(o => o.orderStatus === 'Cancelled').length;
        const confirmedOrders = orders.filter(o => o.orderStatus === 'confirmed').length;

        return {
            totalOrders,
            totalRevenue,
            pendingOrders,
            processingOrders,
            deliveredOrders,
            cancelledOrders,
            confirmedOrders
        };
    }, [orders]);


    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    const fetchProductDetails = useCallback(async (productIds) => {
        if (productIds.length === 0) {
            return {};
        }
        const uniqueProductIds = [...new Set(productIds)];
        const productChunks = [];
        for (let i = 0; i < uniqueProductIds.length; i += 10) {
            productChunks.push(uniqueProductIds.slice(i, i + 10));
        }

        let fetchedProducts = {};
        for (const chunk of productChunks) {
            try {
                const q = query(collection(db, "products"), where("__name__", "in", chunk.map(id => String(id))));
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


    const fetchOrdersAndProducts = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            let ordersQuery = collection(db, "orders");
            const queryConstraints = [];

            let sortField = 'createdAt';
            let sortDirection = 'desc';
            if (sortBy.includes('totalAmount')) {
                sortField = 'totalAmount';
            } else if (sortBy.includes('orderStatus')) {
                sortField = 'orderStatus';
            }
            if (sortBy.endsWith('_asc')) {
                sortDirection = 'asc';
            }

            queryConstraints.push(orderBy(sortField, sortDirection));
            ordersQuery = query(ordersQuery, ...queryConstraints);

            const processSnapshot = async (querySnapshot) => {
                let orderList = [];
                const productIdsToFetch = new Set();

                querySnapshot.forEach(doc => {
                    const orderData = doc.data();
                    
                    const product = orderData.product || {};
                    const quantity = orderData.quantity || 1;
                    const totalAmount = orderData.totalAmount || (parseFloat(product.price) * quantity);

                    if (product && (product._id || product.id)) {
                        productIdsToFetch.add(String(product._id || product.id));
                    } else {
                        console.warn(`Order ${doc.id} missing product ID or product data in order document.`);
                    }

                    orderList.push({
                        id: doc.id,
                        ...orderData,
                        product: product,
                        quantity: quantity,
                        totalAmount: totalAmount,
                    });
                });

                const fetchedProducts = await fetchProductDetails(Array.from(productIdsToFetch));
                setProductsMap(fetchedProducts);
                setOrders(orderList);
                setLoading(false);
            };

            if (isRealTimeEnabled) {
                const unsubscribe = onSnapshot(ordersQuery, processSnapshot, (err) => {
                    console.error("Real-time listener error:", err);
                    setError("Failed to load orders in real-time. Please refresh.");
                    setLoading(false);
                });
                return unsubscribe;
            } else {
                const querySnapshot = await getDocs(ordersQuery);
                await processSnapshot(querySnapshot);
                return () => { };
            }
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            setError("Failed to load orders. Please try again.");
            setLoading(false);
            return () => { };
        }
    }, [db, sortBy, isRealTimeEnabled, fetchProductDetails]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId] && !dropdownRefs.current[openDropdownId].contains(event.target)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openDropdownId]);

    const toggleDropdown = (orderId) => {
        setOpenDropdownId(openDropdownId === orderId ? null : orderId);
    };

    useEffect(() => {
        let unsubscribeOrders = null;

        const authUnsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists() && userDocSnap.data().type === "admin") {
                        unsubscribeOrders = await fetchOrdersAndProducts();
                    } else {
                        setError("Access Denied. You do not have administrator privileges.");
                        setLoading(false);
                        navigate("/");
                    }
                } catch (err) {
                    console.error("Error getting user claims/doc:", err);
                    setError("Authentication failed or user data incomplete. Please log in again.");
                    setLoading(false);
                    navigate("/login");
                }
            } else {
                setError("You must be logged in to access this page.");
                setLoading(false);
                navigate("/login");
            }
        });

        return () => {
            authUnsubscribe();
            if (unsubscribeOrders) unsubscribeOrders();
        };
    }, [firebaseAuth, fetchOrdersAndProducts, db, navigate]);


    useEffect(() => {
        if (selectedOrder || editingOrder || isConfirmModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedOrder, editingOrder, isConfirmModalOpen]);


    const handleStatusChange = async (orderId, newStatus) => {
        setLoading(true);
        try {
            const orderDocRef = doc(db, "orders", orderId);
            await updateDoc(orderDocRef, {
                orderStatus: newStatus,
                updatedAt: serverTimestamp(),
            });
            showMessage("success", `Order ${orderId} status updated to '${newStatus}'`);
        } catch (err) {
            console.error("Error updating order status:", err);
            showMessage("error", `Failed to update order status: ${err.message}`);
        } finally {
            setLoading(false);
            setOpenDropdownId(null);
        }
    };

    const startEditing = (order) => {
        const productFromMap = productsMap[String(order.product?.id || order.product?._id)];
        const displayProductForEdit = productFromMap || order.product || {};

        setEditingOrder(order.id);
        setEditForm({
            orderId: order.orderId || order.id,
            orderStatus: order.orderStatus,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            shippingAddress: { ...order.shippingAddress },
            product: { ...displayProductForEdit },
            quantity: order.quantity,
            notes: order.notes || '',
            transactionId: order.transactionId || ''
        });
        setOpenDropdownId(null);
    };

    const cancelEditing = () => {
        setEditingOrder(null);
        setEditForm({});
    };

    const saveOrderChanges = async (orderId) => {
        setLoading(true);
        try {
            const orderDocRef = doc(db, "orders", orderId);

            const updatedProductData = {
                id: String(editForm.product?.id || editForm.product?._id),
                _id: String(editForm.product?._id || editForm.product?.id),
                name: editForm.product?.name || 'Unknown Product',
                price: parseFloat(editForm.product?.price) || 0,
                image: editForm.product?.image || 'https://via.placeholder.com/50?text=No+Image',
                category: editForm.product?.category || 'Uncategorized',
            };

            const updateData = {
                orderId: editForm.orderId,
                orderStatus: editForm.orderStatus,
                totalAmount: parseFloat(editForm.totalAmount),
                paymentMethod: editForm.paymentMethod,
                paymentStatus: editForm.paymentStatus,
                shippingAddress: { ...editForm.shippingAddress },
                product: updatedProductData,
                quantity: parseInt(editForm.quantity),
                notes: editForm.notes,
                transactionId: editForm.transactionId,
                updatedAt: serverTimestamp(),
            };

            await updateDoc(orderDocRef, updateData);
            showMessage("success", `Order ${orderId} updated successfully`);

        } catch (err) {
            console.error("Error updating order:", err);
            showMessage("error", `Failed to update order: ${err.message}`);
        } finally {
            setLoading(false);
            cancelEditing();
        }
    };

    const handleDeleteClick = (orderId) => {
        setOrderToDelete(orderId);
        setIsConfirmModalOpen(true);
        setOpenDropdownId(null);
    };

    const confirmDeleteOrder = async () => {
        if (!orderToDelete) return;

        setLoading(true);
        try {
            await deleteDoc(doc(db, "orders", orderToDelete));
            showMessage("success", `Order ${orderToDelete} deleted successfully`);
        } catch (err) {
            console.error("Error deleting order:", err);
            showMessage("error", `Failed to delete order: ${err.message}`);
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
            setOrderToDelete(null);
        }
    };


    const handleFormChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleAddressChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            shippingAddress: {
                ...prev.shippingAddress,
                [field]: value
            }
        }));
    };

    const handleProductFieldChange = (field, value) => {
        setEditForm(prev => ({
            ...prev,
            product: {
                ...prev.product,
                [field]: value
            }
        }));
    };


    const getStatusClassName = (status) => {
        switch (status) {
            case 'Processing': return 'bg-blue-100 text-blue-800';
            case 'Shipped': return 'bg-lime-100 text-lime-800';
            case 'Delivered': return 'bg-green-100 text-green-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            case 'confirmed': return 'bg-cyan-100 text-cyan-800';
            case 'Pending':
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const handleViewDetails = (order) => {
        setOpenDropdownId(null);
        const productFromMap = productsMap[String(order.product?.id || order.product?._id)];
        const displayProductForModal = productFromMap || order.product || {};

        setSelectedOrder({
            ...order,
            product: displayProductForModal
        });
    };


    const handleCloseModal = () => {
        setSelectedOrder(null);
    };

    const exportOrders = () => {
        if (orders.length === 0) {
            showMessage("error", "No orders to export.");
            return;
        }

        const csvContent = orders.map(order => {
            const product = productsMap[String(order.product?._id || order.product?.id)] || order.product || {};

            return {
                'Order ID': order.orderId || order.id,
                'Transaction ID': order.transactionId || 'N/A',
                'User ID': order.userId || 'N/A',
                'Customer Name': order.shippingAddress?.fullName || 'N/A',
                'Email': order.shippingAddress?.email || 'N/A',
                'Total Product Amount (This Order)': parseFloat(order.totalAmount) || 0,
                'Order Status': order.orderStatus || 'N/A',
                'Payment Method': order.paymentMethod || 'N/A',
                'Payment Status': order.paymentStatus || 'N/A',
                'Order Date': order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-IN') : 'N/A',
                'Product Name': product?.name || 'N/A',
                'Product Category': product?.category || 'N/A',
                'Product Quantity (in this order)': order.quantity || 1,
                'Product Unit Price (in this order)': parseFloat(product?.price) || 0,
                'Shipping Address Full': `${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.state || ''} - ${order.shippingAddress?.pincode || ''}`.trim().replace(/^, |^,|, $/, ''),
                'Customer Phone': order.shippingAddress?.phone || 'N/A',
                'Customer Email': order.shippingAddress?.email || 'N/A',
                'Order Notes': order.notes || 'N/A',
            };
        });

        const headers = Object.keys(csvContent[0]).join(',');
        const rows = csvContent.map(row =>
            Object.values(row).map(value => {
                const stringValue = String(value);
                return stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"') ?
                    `"${stringValue.replace(/"/g, '""')}"` : stringValue;
            }).join(',')
        );

        const csvString = [headers, ...rows].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_orders_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showMessage("success", "Orders exported successfully as CSV.");
    };


    const getSortIcon = (field) => {
        if (sortBy.startsWith(field)) {
            return sortBy.endsWith('_asc') ? '▲' : '▼';
        }
        return '◆';
    };

    const handleSortClick = (field) => {
        setSortBy(prevSortBy => {
            if (prevSortBy.startsWith(field)) {
                return prevSortBy.endsWith('_asc') ? `${field}_desc` : `${field}_asc`;
            }
            return `${field}_desc`;
        });
    };

    if (loading && orders.length === 0) {
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
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">
                        Reload Page
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 pb-12">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDeleteOrder}
                title="Confirm Deletion"
                message="Are you sure you want to delete this order? This action is permanent and cannot be undone."
            />

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
                        <h1 className="text-4xl md:text-5xl font-bold">Order Management</h1>
                    </div>
                    <p className="text-xl text-green-100 max-w-2xl mx-auto">
                        Track and manage all customer orders, ensuring timely fulfillment.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-green-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.totalOrders}</p>
                        </div>
                        <ShoppingCart className="w-10 h-10 text-green-500 opacity-70" />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-lime-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">₹{overviewData.totalRevenue.toLocaleString()}</p>
                        </div>
                        <FaRupeeSign className="w-10 h-10 text-lime-500 opacity-70" />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-cyan-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.pendingOrders}</p>
                        </div>
                        <Clock className="w-10 h-10 text-cyan-500 opacity-70" />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-yellow-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Delivered Orders</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.deliveredOrders}</p>
                        </div>
                        <Truck className="w-10 h-10 text-yellow-500 opacity-70" />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">All Orders</h2>
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="flex items-center text-gray-700 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isRealTimeEnabled}
                                    onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
                                    className="form-checkbox h-4 w-4 text-green-600 rounded mr-2 focus:ring-green-500"
                                />
                                Real-time Updates
                            </label>
                            <button onClick={exportOrders} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium">
                                <FileText size={16} /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {orders.length === 0 && !loading ? (
                            <div className="text-center py-12 text-gray-600">
                                <p className="mb-4 text-lg">No orders found.</p>
                                <Package className="w-12 h-12 mx-auto text-gray-400" />
                            </div>
                        ) : (
                            <table className="min-w-full leading-normal orders-table">
                                <thead>
                                    <tr>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('createdAt')}
                                        >
                                            Order ID {getSortIcon('createdAt')}
                                        </th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Transaction ID</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Customer</th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('totalAmount')}
                                        >
                                            Amount {getSortIcon('totalAmount')}
                                        </th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('orderStatus')}
                                        >
                                            Status {getSortIcon('orderStatus')}
                                        </th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Payment</th>
                                        <th className="px-12 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Date</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Product(s)</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(order => {
                                        const displayProduct = productsMap[String(order.product?.id || order.product?._id)] || order.product || {};

                                        return (
                                            <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap truncate max-w-[100px] font-mono">{order.orderId || order.id}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap truncate max-w-[100px] font-mono text-xs">{order.transactionId || 'N/A'}</p>
                                                </td>
                                                <td className="border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap font-medium">{order.shippingAddress?.fullName || 'N/A'}</p>
                                                    <p className="text-gray-600 whitespace-no-wrap text-xs">{order.shippingAddress?.email || 'N/A'}</p>
                                                </td>
                                                <td className="border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap font-semibold flex items-center">₹{order.totalAmount ? parseFloat(order.totalAmount).toLocaleString() : 'N/A'}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full  ${getStatusClassName(order.orderStatus)}`}>
                                                        {order.orderStatus}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap font-medium">{order.paymentMethod?.toUpperCase() || 'N/A'}</p>
                                                    <p className={`whitespace-no-wrap text-xs ${order.paymentStatus === 'completed' ? 'text-green-600' : 'text-red-600'}`}>
                                                        {order.paymentStatus || 'N/A'}
                                                    </p>
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
                                                    {order.product ? (
                                                        <div className="flex items-center space-x-2">
                                                            {displayProduct.image && (
                                                                <img
                                                                    src={displayProduct.image}
                                                                    alt={displayProduct.name || 'Product Image'}
                                                                    className="w-10 h-10 object-contain rounded-md border border-gray-200 flex-shrink-0"
                                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=No+Img'}
                                                                />
                                                            )}
                                                            <div>
                                                                <p className="text-gray-900 whitespace-no-wrap truncate max-w-[120px] font-medium">{displayProduct.name || 'Unknown Product'}</p>
                                                                <p className="text-gray-600 whitespace-no-wrap text-xs">Qty: {order.quantity || 1}</p>
                                                                <p className="text-gray-600 whitespace-no-wrap text-xs">₹{parseFloat(displayProduct.price || 0).toLocaleString()}</p>
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
                                                                        onClick={() => startEditing(order)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                        role="menuitem"
                                                                    >
                                                                        <Edit2 size={16} className="mr-2" /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleViewDetails(order)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                        role="menuitem"
                                                                    >
                                                                        <Eye size={16} className="mr-2" /> View Details
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(order.id)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900"
                                                                        role="menuitem"
                                                                    >
                                                                        <Trash2 size={16} className="mr-2" /> Delete
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* View Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative w-full max-w-xl lg:max-w-3xl overflow-y-auto max-h-[90vh] custom-scrollbar rounded-2xl shadow-2xl
                                             bg-gradient-to-br from-lime-50 to-green-50 text-gray-800 transform scale-95 animate-scale-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center bg-gradient-to-r from-green-100 to-lime-100 p-6 border-b border-gray-200">
                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <Eye size={24} className="text-green-600" /> Order Details <span className="text-base md:text-lg font-mono text-gray-600">#{selectedOrder.orderId || selectedOrder.id}</span>
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
                                    <span className={`px-2 py-0.5 inline-flex justify-center items-center text-xs leading-5 font-semibold rounded-full w-fit ${getStatusClassName(selectedOrder.orderStatus)} text-left`}>
                                        {selectedOrder.orderStatus}
                                    </span>
                                    <p className="font-medium text-gray-700 text-left">Total:</p>
                                    <span className="text-green-800 font-bold text-left">₹{selectedOrder.totalAmount?.toLocaleString()}</span>
                                    <p className="font-medium text-gray-700 text-left">Order Date:</p>
                                    <span className="text-left">{selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleDateString('en-IN', { dateStyle: 'short' }) : 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">User ID:</p>
                                    <span className="font-mono text-xs break-all text-left">{selectedOrder.userId || 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">Transaction ID:</p>
                                    <span className="font-mono text-xs break-all text-left">{selectedOrder.transactionId || 'N/A'}</span>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-lime-200">
                                <h4 className="font-bold text-lg text-lime-700 mb-3 flex items-center gap-2">
                                    <CreditCard size={18} className="text-lime-500" /> Payment Info
                                </h4>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                    <p className="font-medium text-gray-700 text-left">Method:</p>
                                    <span className="text-left">{selectedOrder.paymentMethod?.toUpperCase() || 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">Status:</p>
                                    <span className={`px-2 py-0.5 inline-flex justify-center items-center text-xs leading-5 font-semibold rounded-full w-fit ${selectedOrder.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-left`}>
                                        {selectedOrder.paymentStatus || 'N/A'}
                                    </span>
                                    {selectedOrder.paymentId && (
                                        <>
                                            <p className="font-medium text-gray-700 text-left">Payment ID:</p>
                                            <span className="font-mono text-xs break-all text-left">{selectedOrder.paymentId}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-cyan-200">
                                <h4 className="font-bold text-lg text-cyan-700 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-cyan-500" /> Shipping Address
                                </h4>
                                {selectedOrder.shippingAddress ? (
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                        <p className="font-medium text-gray-700 text-left">Recipient:</p>
                                        <span className="text-left">{selectedOrder.shippingAddress.fullName || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Address:</p>
                                        <span className="text-left">{selectedOrder.shippingAddress.address || 'N/A'}, {selectedOrder.shippingAddress.city || 'N/A'}, {selectedOrder.shippingAddress.state || 'N/A'} - {selectedOrder.shippingAddress.pincode || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Phone:</p>
                                        <span className="text-left">{selectedOrder.shippingAddress.phone || 'N/A'}</span>
                                        <p className="font-medium text-gray-700 text-left">Email:</p>
                                        <span className="text-left">{selectedOrder.shippingAddress.email || 'N/A'}</span>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm">No shipping address available.</p>
                                )}
                            </div>
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-blue-200 md:col-span-1 max-h-52 overflow-y-auto custom-scrollbar">
                                <h4 className="font-bold text-lg text-blue-700 mb-3 flex items-center gap-2">
                                    <Tag size={18} className="text-blue-500" /> Ordered Product
                                </h4>
                                {selectedOrder.product ? (
                                    <div className="flex items-start sm:items-center space-x-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        {selectedOrder.product.image && (
                                            <img
                                                src={selectedOrder.product.image}
                                                alt={selectedOrder.product.name || 'Product Image'}
                                                className="w-16 h-16 object-contain rounded-md border border-gray-200 flex-shrink-0"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/60?text=No+Image'}
                                            />
                                        )}
                                        <div className="flex-1 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm items-baseline">
                                            <p className="font-semibold text-gray-900 col-span-2 text-left">{selectedOrder.product.name || 'Unknown Product'}</p>
                                            <p className="text-gray-700 text-left">Qty:</p>
                                            <span className="font-medium text-left">{selectedOrder.quantity || 1}</span>
                                            <p className="text-gray-700 text-left">Unit Price:</p>
                                            <span className="font-medium text-left">₹{(parseFloat(selectedOrder.product.price) || 0).toLocaleString()}</span>
                                            {(selectedOrder.quantity !== undefined && selectedOrder.quantity !== null) &&
                                                (selectedOrder.product.price !== undefined && selectedOrder.product.price !== null) && (
                                                <>
                                                    <p className="font-medium text-gray-700 text-left">Subtotal:</p>
                                                    <span className="font-bold text-green-700 text-left">
                                                        ₹{((selectedOrder.quantity || 1) * (parseFloat(selectedOrder.product.price) || 0)).toLocaleString()}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm">No product details available.</p>
                                )}
                            </div>
                            {selectedOrder.notes && (
                                <div className="bg-white rounded-lg shadow-sm p-4 border border-yellow-200 lg:col-span-2">
                                    <h4 className="font-bold text-lg text-yellow-700 mb-3 flex items-center gap-2">
                                        <FileText size={18} className="text-yellow-500" /> Order Notes
                                    </h4>
                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedOrder.notes}</p>
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
            {editingOrder && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 transform scale-95 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-4 mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Edit2 size={24} className="text-green-600" /> Edit Order: <span className="font-mono text-lg text-gray-600">#{editingOrder}</span>
                            </h3>
                            <button className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" onClick={cancelEditing}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-gray-700 overflow-y-auto max-h-[calc(90vh-190px)] custom-scrollbar pr-6">
                            <div>
                                <h4 className="font-semibold text-lg text-gray-900 mb-3 border-b pb-2">Order Info</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="edit-order-id" className="block text-sm font-medium text-gray-700">Order ID:</label>
                                        <input type="text" id="edit-order-id" value={editForm.orderId || ''} readOnly className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed focus:outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-transaction-id" className="block text-sm font-medium text-gray-700">Transaction ID:</label>
                                        <input type="text" id="edit-transaction-id" value={editForm.transactionId || ''} readOnly className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-not-allowed focus:outline-none text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-total-amount" className="block text-sm font-medium text-gray-700">Total Amount:</label>
                                        <input type="number" id="edit-total-amount" value={editForm.totalAmount || 0} onChange={(e) => handleFormChange('totalAmount', parseFloat(e.target.value))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" step="0.01" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-order-status" className="block text-sm font-medium text-gray-700">Order Status:</label>
                                        <select id="edit-order-status" value={editForm.orderStatus || ''} onChange={(e) => handleFormChange('orderStatus', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm">
                                            <option value="Pending">Pending</option>
                                            <option value="confirmed">Confirmed</option>
                                            <option value="Processing">Processing</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="edit-payment-method" className="block text-sm font-medium text-gray-700">Payment Method:</label>
                                        <select id="edit-payment-method" value={editForm.paymentMethod || ''} onChange={(e) => handleFormChange('paymentMethod', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm">
                                            <option value="cod">COD</option>
                                            <option value="razorpay">Razorpay (Online)</option>
                                            <option value="card">Card</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="edit-payment-status" className="block text-sm font-medium text-gray-700">Payment Status:</label>
                                        <select id="edit-payment-status" value={editForm.paymentStatus || ''} onChange={(e) => handleFormChange('paymentStatus', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm">
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                            <option value="failed">Failed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-lg text-gray-900 mb-3 border-b pb-2">Shipping Address</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label htmlFor="edit-full-name" className="block text-sm font-medium text-gray-700">Full Name:</label>
                                        <input type="text" id="edit-full-name" value={editForm.shippingAddress?.fullName || ''} onChange={(e) => handleAddressChange('fullName', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700">Email:</label>
                                        <input type="email" id="edit-email" value={editForm.shippingAddress?.email || ''} onChange={(e) => handleAddressChange('email', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700">Phone:</label>
                                        <input type="tel" id="edit-phone" value={editForm.shippingAddress?.phone || ''} onChange={(e) => handleAddressChange('phone', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                    </div>
                                    <div>
                                        <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700">Address:</label>
                                        <textarea id="edit-address" value={editForm.shippingAddress?.address || ''} onChange={(e) => handleAddressChange('address', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" rows="1"></textarea>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="edit-city" className="block text-sm font-medium text-gray-700">City:</label>
                                            <input type="text" id="edit-city" value={editForm.shippingAddress?.city || ''} onChange={(e) => handleAddressChange('city', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                        </div>
                                        <div>
                                            <label htmlFor="edit-state" className="block text-sm font-medium text-gray-700">State:</label>
                                            <input type="text" id="edit-state" value={editForm.shippingAddress?.state || ''} onChange={(e) => handleAddressChange('state', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="edit-pincode" className="block text-sm font-medium text-gray-700">Pincode:</label>
                                        <input type="text" id="edit-pincode" value={editForm.shippingAddress?.pincode || ''} onChange={(e) => handleAddressChange('pincode', e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="col-span-full">
                                <h4 className="font-semibold text-lg text-gray-900 mb-3 border-b pb-2">Ordered Product</h4>
                                {editForm.product ? (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex items-center space-x-4">
                                        {editForm.product.image && (
                                            <img
                                                src={editForm.product.image}
                                                alt={editForm.product.name || 'Product Image'}
                                                className="w-16 h-16 object-contain rounded-md flex-shrink-0"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/50?text=No+Img'}
                                            />
                                        )}
                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600">Product Name:</label>
                                                <input type="text" value={editForm.product.name || 'Unknown'} onChange={(e) => handleProductFieldChange('name', e.target.value)} className="mt-1 block w-full text-sm font-semibold px-2 py-1 border border-gray-300 rounded-md shadow-sm" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600">Unit Price:</label>
                                                <input type="number" value={editForm.product.price || 0} onChange={(e) => handleProductFieldChange('price', parseFloat(e.target.value))} className="mt-1 block w-full text-sm px-2 py-1 border border-gray-300 rounded-md shadow-sm" />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-product-quantity" className="block text-xs font-medium text-gray-600">Quantity:</label>
                                                <input
                                                    type="number"
                                                    id="edit-product-quantity"
                                                    value={editForm.quantity || 1}
                                                    onChange={(e) => handleFormChange('quantity', parseInt(e.target.value) || 1)}
                                                    className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                                                    min="1"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600">Item Total:</label>
                                                <span className="mt-1 block w-full text-sm font-bold text-green-700">
                                                    ₹{((editForm.quantity || 1) * (parseFloat(editForm.product.price) || 0)).toLocaleString()}
                                                </span>
                                            </div>
                                            {editForm.product.category && (
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-600">Category:</label>
                                                    <input type="text" value={editForm.product.category} readOnly className="mt-1 block w-full text-sm border-none bg-transparent" />
                                                </div>
                                            )}
                                            {editForm.product.image && (
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-600">Image URL:</label>
                                                    <input type="text" value={editForm.product.image} readOnly className="mt-1 block w-full text-sm border-none bg-transparent" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-600 text-sm text-center py-4">No product details available for this order.</p>
                                )}
                            </div>

                            <div className="col-span-full">
                                <h4 className="font-semibold text-lg text-gray-900 mb-3 border-b pb-2">Order Notes</h4>
                                <textarea
                                    placeholder="Add notes about this order..."
                                    value={editForm.notes || ''}
                                    onChange={(e) => handleFormChange('notes', e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                                    rows="1"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end items-center mt-6 pt-4 border-t">
                            <button onClick={cancelEditing} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors mr-3">
                                Cancel
                            </button>
                            <button
                                onClick={() => saveOrderChanges(editingOrder)}
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-200 shadow-md"
                            >
                                <Save size={16} className="inline mr-2" /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;