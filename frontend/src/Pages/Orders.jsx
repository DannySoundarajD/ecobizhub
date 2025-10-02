import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { getFirestore, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
    Package,
    XCircle,
    Loader,
    User,
    ShieldCheck,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Clock,
    Truck,
    ShoppingBag,
    CreditCard,
    MapPin,
    Heart,
    Search,
    ChevronDown,
    SortAsc,
    Eye,
    Download,
    Share2,
    RotateCcw,
    AlertCircle,
    Home,
    Gift,
    Zap,
    FileText,
    X,
    Copy,
    Check
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

const Orders = () => {
    const [user, setUser] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('desc');
    const [showTrackingModal, setShowTrackingModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const navigate = useNavigate();
    const db = getFirestore();

    const fetchOrders = useCallback(async (userId) => {
        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', userId),
                orderBy('createdAt', sortOrder)
            );
            const querySnapshot = await getDocs(q);
            const userOrders = querySnapshot.docs.map(doc => {
                const orderData = doc.data();
                return {
                    id: doc.id,
                    ...orderData,
                    items: Array.isArray(orderData.items) ? orderData.items : [{ product: orderData.product, quantity: orderData.quantity }],
                    orderStatus: orderData.status,
                    totalAmount: orderData.totalAmount
                };
            });
            setOrders(userOrders);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to fetch orders. Please try again later.');
            setLoading(false);
        }
    }, [db, sortOrder]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                fetchOrders(currentUser.uid);
            } else {
                setOrders([]);
                setLoading(false);
                setError('Please log in to view your orders.');
            }
        });

        return () => unsubscribe();
    }, [fetchOrders]);

    const getStatusIcon = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'shipped':
                return <Truck className="w-5 h-5 text-lime-500" />;
            case 'delivered':
                return <Package className="w-5 h-5 text-emerald-500" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Clock className="w-5 h-5 text-orange-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'shipped':
                return 'bg-lime-100 text-lime-800 border-lime-200';
            case 'delivered':
                return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-orange-100 text-orange-800 border-orange-200';
        }
    };

    const getOrderStatuses = () => {
        return [
            { key: 'pending', label: 'Order Placed', icon: Clock },
            { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
            { key: 'shipped', label: 'Shipped', icon: Truck },
            { key: 'delivered', label: 'Delivered', icon: Package }
        ];
    };

    const getCurrentStatusIndex = (status) => {
        const statuses = getOrderStatuses();
        return statuses.findIndex(s => s.key === status?.toLowerCase());
    };

    const generatePDF = (order) => {
        const invoiceHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Invoice - Order #${order.id}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; line-height: 1.6; }
                    .header { text-align: center; border-bottom: 2px solid #34d399; padding-bottom: 20px; margin-bottom: 30px; }
                    .invoice-title { color: #34d399; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
                    .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    .section-title { color: #34d399; font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                    th, td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                    th { background-color: #f3f4f6; color: #4b5563; }
                    .product-details { background: #f8fafc; padding: 15px; border-radius: 8px; }
                    .amount { color: #059669; font-size: 24px; font-weight: bold; }
                    .status { display: inline-block; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                    .status-confirmed { background: #dcfce7; color: #166534; }
                    .status-shipped { background: #dbeafe; color: #1e40af; }
                    .status-delivered { background: #d1fae5; color: #065f46; }
                    .status-pending { background: #fef3c7; color: #92400e; }
                    .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="invoice-title">INVOICE</div>
                    <div>EcoBizHub - Sustainable Marketplace</div>
                </div>

                <div class="invoice-details">
                    <div>
                        <strong>Order ID:</strong> #${order.id}<br>
                        <strong>Transaction ID:</strong> ${order.transactionId || 'N/A'}<br>
                        <strong>Date:</strong> ${new Date(order.createdAt?.toDate()).toLocaleDateString()}<br>
                        <strong>Status:</strong> <span class="status status-${order.orderStatus?.toLowerCase() || 'pending'}">${order.orderStatus || 'Pending'}</span>
                    </div>
                    <div>
                        <strong>Customer:</strong> ${order.customerInfo?.fullName || 'N/A'}<br>
                        <strong>Payment:</strong> ${order.paymentMethod?.toUpperCase() || 'N/A'}<br>
                        <strong>Payment Status:</strong> ${order.paymentStatus || 'N/A'}
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Product Details</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.name || item.product?.name || 'N/A'}</td>
                                    <td style="text-align: center;">${item.quantity || 1}</td>
                                    <td style="text-align: right;">₹${(item.price || item.product?.price || 0).toLocaleString()}</td>
                                    <td style="text-align: right;">₹${((item.price || item.product?.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="section">
                    <div class="section-title">Shipping Address</div>
                    <div>
                        ${order.customerInfo?.fullName || 'N/A'}<br>
                        ${order.customerInfo?.address || 'N/A'}<br>
                        ${order.customerInfo?.city || 'N/A'}, ${order.customerInfo?.state || 'N/A'} - ${order.customerInfo?.pincode || 'N/A'}<br>
                        Phone: ${order.customerInfo?.phone || 'N/A'}
                    </div>
                </div>

                <div class="footer">
                    <p>Thank you for your purchase! For any queries, please contact our support team.</p>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                </div>
            </body>
            </html>
        `;

        const element = document.createElement('div');
        element.innerHTML = invoiceHTML;

        html2pdf().from(element).set({
            margin: [10, 10, 10, 10],
            filename: `invoice-order-${order.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).save();
    };

    const handleTrackOrder = (order) => {
        setSelectedOrder(order);
        setShowTrackingModal(true);
    };

    const handleShareOrder = (order) => {
        setSelectedOrder(order);
        setShowShareModal(true);
    };

    const shareToWhatsApp = (order) => {
        const productNames = order.items.map(item => `${item.name || item.product?.name} (x${item.quantity || 1})`).join(', ');
        const message = `🛍️ *My Order Details*\n\n📦 *Products:* ${productNames}\n🔢 *Order ID:* #${order.id}\n💰 *Amount:* ₹${order.totalAmount?.toLocaleString()}\n📅 *Date:* ${order.createdAt?.toDate().toLocaleDateString()}\n🚚 *Status:* ${order.orderStatus || 'Pending'}\n\n*Shipping Address:*\n${order.customerInfo?.fullName || 'N/A'}\n${order.customerInfo?.address || 'N/A'}\n${order.customerInfo?.city || 'N/A'}, ${order.customerInfo?.state || 'N/A'} - ${order.customerInfo?.pincode || 'N/A'}`;

        const whatsappURL = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappURL, '_blank');
    };

    const copyOrderDetails = (order) => {
        const productNames = order.items.map(item => `${item.name || item.product?.name} (x${item.quantity || 1})`).join(', ');
        const orderText = `My Order Details\n\nProducts: ${productNames}\nOrder ID: #${order.id}\nAmount: ₹${order.totalAmount?.toLocaleString()}\nDate: ${order.createdAt?.toDate().toLocaleDateString()}\nStatus: ${order.orderStatus || 'Pending'}\n\nShipping Address:\n${order.customerInfo?.fullName || 'N/A'}\n${order.customerInfo?.address || 'N/A'}\n${order.customerInfo?.city || 'N/A'}, ${order.customerInfo?.state || 'N/A'} - ${order.customerInfo?.pincode || 'N/A'}`;

        navigator.clipboard.writeText(orderText).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.items.some(item =>
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ) || order.id?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.orderStatus?.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleRetry = () => {
        if (user) {
            fetchOrders(user.uid);
        }
    };

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.orderStatus?.toLowerCase() === 'delivered').length;
    const shippedOrders = orders.filter(o => o.orderStatus?.toLowerCase() === 'shipped').length;
    
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-r from-green-600 to-lime-600 rounded-full mb-6 animate-pulse">
                        <Loader className="w-6 sm:w-8 h-6 sm:h-8 text-white animate-spin" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent mb-2">
                        Loading Your Orders
                    </h2>
                    <p className="text-gray-600 text-sm sm:text-base">Please wait while we fetch your order history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-6 sm:p-8 text-center">
                        <div className="inline-flex items-center justify-center w-12 sm:w-16 h-12 sm:h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mb-6">
                            <AlertCircle className="w-6 sm:w-8 h-6 sm:h-8 text-white" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-8 text-sm sm:text-base">{error}</p>
                        <div className="space-y-4">
                            {user ? (
                                <button
                                    onClick={handleRetry}
                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Try Again
                                </button>
                            ) : (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    <User className="w-5 h-5" />
                                    Sign In
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                            >
                                <Home className="w-5 h-5" />
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                        <div className="flex items-center gap-2 sm:gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 sm:px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-300 text-white"
                            >
                                <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="font-medium text-sm sm:text-base hidden sm:block">Back to Shop</span>
                            </button>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="w-8 sm:w-10 h-8 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                                    <ShoppingBag className="w-5 sm:w-6 h-5 sm:h-6" />
                                </div>
                                <div>
                                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">My Orders</h1>
                                    <p className="text-white/80 text-xs sm:text-sm">Track and manage your purchases</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 sm:w-5 h-4 sm:h-5" />
                            <span className="text-xs sm:text-sm hidden sm:block">Secure</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <Package className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">Total</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold">{totalOrders}</p>
                        </div>
                        <div className="bg-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">Delivered</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold">
                                {deliveredOrders}
                            </p>
                        </div>
                        <div className="bg-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <Truck className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">Shipped</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold">
                                {shippedOrders}
                            </p>
                        </div>
                        <div className="bg-white/20 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                <Heart className="w-4 sm:w-5 h-4 sm:h-5" />
                                <span className="text-xs sm:text-sm font-medium">Favorites</span>
                            </div>
                            <p className="text-lg sm:text-2xl font-bold">
                                {Math.floor(orders.length * 0.7)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {/* Filters and Search */}
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 mb-6 sm:mb-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 sm:w-5 h-4 sm:h-5" />
                                <input
                                    type="text"
                                    placeholder="Search orders, products, or transaction IDs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-sm sm:text-base"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="appearance-none bg-white/50 backdrop-blur-sm border border-gray-200 rounded-xl px-4 py-2.5 sm:py-3 pr-10 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 cursor-pointer text-sm sm:text-base"
                                >
                                    <option value="all">All Orders</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="shipped">Shipped</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 sm:w-5 h-4 sm:h-5 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orders Content */}
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 sm:py-16">
                        <div className="bg-white/80 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-8 sm:p-12 max-w-2xl mx-auto">
                            <div className="inline-flex items-center justify-center w-20 sm:w-24 h-20 sm:h-24 bg-gradient-to-r from-green-100 to-lime-100 rounded-full mb-6">
                                {searchTerm || statusFilter !== 'all' ? (
                                    <Search className="w-10 sm:w-12 h-10 sm:h-12 text-gray-400" />
                                ) : (
                                    <ShoppingBag className="w-10 sm:w-12 h-10 sm:h-12 text-gray-400" />
                                )}
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
                                {searchTerm || statusFilter !== 'all' ? 'No matching orders found' : 'No orders yet'}
                            </h2>
                            <p className="text-gray-600 mb-6 sm:mb-8 text-base sm:text-lg">
                                {searchTerm || statusFilter !== 'all'
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'Start shopping to place your first order!'
                                }
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                {(searchTerm || statusFilter !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setStatusFilter('all');
                                        }}
                                        className="bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                        Clear Filters
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/')}
                                    className="bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 sm:px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    <Gift className="w-5 h-5" />
                                    Start Shopping
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {filteredOrders.map(order => {
                            const totalQuantity = order.items.reduce((sum, item) => sum + (item.quantity || 1), 0);

                            return (
                                <div key={order.id} className="bg-white/80 backdrop-blur-lg rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                                    {/* Order Header */}
                                    <div className="bg-gradient-to-r from-green-600 to-lime-600 p-4 sm:p-6 text-white flex items-center justify-between">
                                        <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.orderStatus)}`}>
                                            {getStatusIcon(order.orderStatus)}
                                            <span className="capitalize">{order.orderStatus}</span>
                                        </div>
                                        <span className="text-sm font-medium">Order ID: #{order.id.slice(0, 8)}</span>
                                    </div>
                                    {/* Order Body */}
                                    <div className="p-4 sm:p-6">
                                        {/* Product Info */}
                                        <div className="flex gap-3 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto custom-scrollbar">
                                            {order.items.map((item, index) => (
                                                <div key={index} className="flex-shrink-0 w-24">
                                                    <img
                                                        src={item.product?.image || 'https://via.placeholder.com/100?text=No+Img'}
                                                        alt={item.product?.name || 'Product Image'}
                                                        className="w-full h-24 object-cover rounded-xl shadow-lg"
                                                        onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=No+Img'}
                                                    />
                                                    <p className="text-center text-xs text-gray-600 mt-1">{item.product?.name || 'N/A'}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Order Details Summary */}
                                        <div className="space-y-3 pb-4 border-b border-gray-200 mb-4">
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span>Total Items:</span>
                                                <span className="font-semibold text-gray-800">{totalQuantity}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span>Total Amount:</span>
                                                <span className="text-lg font-bold text-gray-900">₹{order.totalAmount?.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span>Payment Method:</span>
                                                <span className="font-semibold text-gray-800 capitalize">{order.paymentMethod || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-gray-600">
                                                <span>Date:</span>
                                                <span className="font-semibold text-gray-800">{order.createdAt?.toDate().toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                            <button
                                                onClick={() => handleTrackOrder(order)}
                                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
                                            >
                                                <Eye className="w-4 h-4" />
                                                <span>Track</span>
                                            </button>
                                            <button
                                                onClick={() => generatePDF(order)}
                                                className="flex items-center justify-center gap-2 bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs sm:text-sm"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span>Invoice</span>
                                            </button>
                                            <button
                                                onClick={() => handleShareOrder(order)}
                                                className="col-span-2 flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-medium py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md text-xs sm:text-sm"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                <span>Share Order</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Track Order Modal */}
            {showTrackingModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <Truck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold">Track Order</h3>
                                        <p className="text-white/80 text-sm">Real-time tracking</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTrackingModal(false)}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6 overflow-y-auto">
                            {/* Product Info */}
                            <h4 className="font-semibold text-gray-800 mb-3">Products in this Order:</h4>
                            <div className="space-y-3 p-3 bg-gray-50 rounded-xl mb-6">
                                {selectedOrder.items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <img
                                            src={item.product?.image || 'https://via.placeholder.com/100?text=No+Img'}
                                            alt={item.product?.name || 'Product Image'}
                                            className="w-16 h-16 object-cover rounded-xl"
                                            onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=No+Img'}
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800 mb-1">{item.product?.name || 'Unknown Product'}</h4>
                                            <p className="text-gray-600 text-sm">Qty: {item.quantity || 1}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tracking Progress */}
                            <div className="space-y-4">
                                <h4 className="font-semibold text-gray-800 mb-4">Order Progress</h4>
                                {getOrderStatuses().map((status, index) => {
                                    const currentIndex = getCurrentStatusIndex(selectedOrder.orderStatus);
                                    const isActive = index <= currentIndex;
                                    const isCurrent = index === currentIndex;

                                    return (
                                        <div key={status.key} className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                                isActive
                                                    ? 'bg-gradient-to-r from-green-600 to-lime-600 text-white shadow-lg'
                                                    : 'bg-gray-200 text-gray-400'
                                                } ${isCurrent ? 'ring-4 ring-green-200 scale-110' : ''}`}>
                                                <status.icon className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h5 className={`font-medium ${isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                                                    {status.label}
                                                </h5>
                                                <p className={`text-sm ${isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                                                    {isCurrent ? 'Current Status' : isActive ? 'Completed' : 'Pending'}
                                                </p>
                                            </div>
                                            {isCurrent && (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <Zap className="w-4 h-4" />
                                                    <span className="text-sm font-medium">Active</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Estimated Delivery */}
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-lime-50 rounded-xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <Clock className="w-5 h-5 text-green-600" />
                                    <span className="font-medium text-gray-800">Estimated Delivery</span>
                                </div>
                                <p className="text-sm text-gray-600">
                                    {selectedOrder.orderStatus?.toLowerCase() === 'delivered'
                                        ? 'Order has been delivered successfully!'
                                        : '3-5 business days from order confirmation'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <Share2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg sm:text-xl font-bold">Share Order</h3>
                                        <p className="text-white/80 text-sm">Share with friends & family</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {/* Product Preview */}
                            <h4 className="font-semibold text-gray-800 mb-3">Products in this Order:</h4>
                            <div className="space-y-3 p-3 bg-gray-50 rounded-xl mb-6">
                                {selectedOrder.items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-center">
                                        <img
                                            src={item.product?.image || 'https://via.placeholder.com/100?text=No+Img'}
                                            alt={item.product?.name || 'Product Image'}
                                            className="w-16 h-16 object-cover rounded-xl"
                                            onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=No+Img'}
                                        />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-800 mb-1">{item.product?.name || 'Unknown Product'}</h4>
                                            <p className="text-gray-600 text-sm">Qty: {item.quantity || 1}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Share Options */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => shareToWhatsApp(selectedOrder)}
                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-bold">W</span>
                                    </div>
                                    <span>Share on WhatsApp</span>
                                </button>

                                <button
                                    onClick={() => copyOrderDetails(selectedOrder)}
                                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-lime-600 to-green-600 hover:from-lime-700 hover:to-green-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    {copySuccess ? (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-5 h-5" />
                                            <span>Copy Order Details</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {copySuccess && (
                                <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-xl text-center text-sm">
                                    Order details copied to clipboard!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <div className="fixed bottom-6 right-6 z-40">
                <button
                    onClick={() => navigate('/')}
                    className="w-14 h-14 bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                >
                    <Home className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default Orders;