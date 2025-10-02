import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, db } from "../firebaseConfig";
import {
    CreditCard,
    Truck,
    Leaf,
    Shield,
    ArrowLeft,
    CheckCircle,
    User,
    Mail,
    Phone,
    MapPin,
    Lock,
    Clock,
    Package,
    ShieldCheck,
    FileText,
    Loader,
    XCircle,
    Check
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const CustomAlert = ({ message, type, onClose }) => {
    const isSuccess = type === 'success';
    const icon = isSuccess ? <Check className="w-6 h-6" /> : <XCircle className="w-6 h-6" />;
    const bgColor = isSuccess ? 'bg-green-500' : 'bg-red-500';

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 animate-slide-in-up transition-transform duration-300 relative z-10">
                <div className={`p-3 rounded-full inline-flex ${bgColor} text-white mb-4`}>
                    {icon}
                </div>
                <p className="text-gray-800 font-semibold text-lg">{message}</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                    Close
                </button>
            </div>
        </div>
    );
};

// New Confirmation Modal Component
const ConfirmationModal = ({ orderData, formData, onClose, onConfirm, isProcessing }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999]">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative">
                <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white p-4 rounded-t-2xl">
                    <h3 className="text-xl font-bold">Confirm Your Order</h3>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    <p className="text-gray-700 mb-4">Please review your order details before confirming.</p>
                    <div className="space-y-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-2">Shipping To:</h4>
                            <p className="text-sm text-gray-600">{formData.fullName}</p>
                            <p className="text-sm text-gray-600">{formData.address}</p>
                            <p className="text-sm text-gray-600">{formData.city}, {formData.state} - {formData.pincode}</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-2">Order Total:</h4>
                            <p className="text-2xl font-bold text-green-600">
                                ₹{(orderData?.totalAmount || 0).toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <h4 className="font-semibold text-gray-800 mb-2">Payment Method:</h4>
                            <p className="text-sm text-gray-600 capitalize">
                                {formData.paymentMethod === 'razorpay' ? 'Online Payment' : 'Cash on Delivery'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isProcessing}
                            className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? (
                                <Loader className="w-5 h-5 animate-spin" />
                            ) : (
                                `Confirm & ${formData.paymentMethod === 'razorpay' ? 'Pay' : 'Place Order'}`
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            disabled={isProcessing}
                            className="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [orderData, setOrderData] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [transactionId, setTransactionId] = useState('');
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [alertType, setAlertType] = useState('success');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConfirmationModal, setShowConfirmationModal] = useState(false); // New state for confirmation modal

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        paymentMethod: 'razorpay',
        notes: ''
    });

    const firestoreDb = useMemo(() => db, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setFormData(prev => ({
                    ...prev,
                    email: currentUser.email || '',
                    fullName: currentUser.displayName || ''
                }));
            }
        });

        if (location.state?.orderData && Array.isArray(location.state.orderData.items)) {
            setOrderData(location.state.orderData);
        } else {
            console.warn("Payment page accessed without valid order data. Using dummy data for testing.");
            setOrderData({
                items: [{
                    product: { id: "test-prod-1", _id: "test-prod-1", name: "Test Product", price: 1000, image: "https://via.placeholder.com/100", category: "Test" },
                    quantity: 1
                }],
                totalAmount: 1000
            });
        }

        return () => unsubscribe();
    }, [location]);

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const showAlertMessage = (message, type) => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
    };

    const validateForm = () => {
        const required = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
        const isValid = required.every(field => formData[field].trim() !== '');
        if (!isValid) {
            showAlertMessage('Please fill in all required fields marked with *', 'error');
        }
        return isValid;
    };

    const placeOrderInFirebase = useCallback(async (paymentDetails) => {
        try {
            const orderDoc = {
                userId: user.uid,
                customerInfo: formData,
                items: orderData.items.map(item => ({
                    productId: item.product.id || item.product._id,
                    name: item.product.name,
                    quantity: item.quantity,
                    price: parseFloat(item.product.price)
                })),
                totalAmount: orderData.totalAmount,
                status: 'pending',
                createdAt: serverTimestamp(),
                ...paymentDetails
            };

            await addDoc(collection(firestoreDb, 'orders'), orderDoc);
            
            showAlertMessage('Order successfully placed!', 'success');
            setTransactionId(paymentDetails.razorpay_payment_id || 'COD-' + Date.now());
            setPaymentSuccess(true);

        } catch (error) {
            console.error('Error saving order to Firestore:', error);
            showAlertMessage('Failed to place order. Please try again.', 'error');
            setPaymentSuccess(false);
        } finally {
            setIsProcessing(false);
            setLoading(false);
        }
    }, [user, formData, orderData, firestoreDb]);

    const handleRazorpayPayment = useCallback(async () => {
        if (!validateForm() || !user || !orderData) {
            showAlertMessage('Please log in, fill out the form, and have valid order data to make a payment.', 'error');
            return;
        }

        if (!window.Razorpay) {
            showAlertMessage('Razorpay SDK is not loaded. Please check your internet connection or try again later.', 'error');
            return;
        }
        
        setShowConfirmationModal(false); // Close the confirmation modal

        setLoading(true);
        setIsProcessing(true);

        const amountInPaise = Math.round(orderData.totalAmount * 100);
        const testOrderId = `order_${Date.now()}`;

        const options = {
            key: process.env.REACT_APP_RAZORPAY_KEY_ID,
            amount: amountInPaise,
            currency: 'INR',
            name: 'EcoBizHub',
            description: `Order for EcoBizHub - ${testOrderId}`,
            order_id: testOrderId,
            receipt: testOrderId,
            handler: async function (response) {
                console.log("Razorpay handler success response:", response);
                await placeOrderInFirebase({
                    paymentMethod: 'razorpay',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature,
                    status: 'paid'
                });
            },
            prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone
            },
            notes: {
                ...formData,
                order_items: JSON.stringify(orderData.items.map(item => ({
                    id: item.product.id || item.product._id,
                    name: item.product.name,
                    qty: item.quantity,
                    price: item.product.price
                })))
            },
            theme: { color: '#34d399' },
            modal: {
                ondismiss: function() {
                    setLoading(false);
                    setIsProcessing(false);
                    showAlertMessage('Payment cancelled by user. Please try again.', 'error');
                }
            }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
    }, [validateForm, user, orderData, formData, placeOrderInFirebase, showAlertMessage]);

    const handleCODPayment = useCallback(async () => {
        if (!validateForm() || !user || !orderData) {
            showAlertMessage('Please log in, fill out the form, and have valid order data to place an order.', 'error');
            return;
        }
        
        setShowConfirmationModal(false); // Close the confirmation modal

        setLoading(true);
        setIsProcessing(true);

        try {
            await placeOrderInFirebase({
                paymentMethod: 'cod',
                status: 'unpaid'
            });
        } catch (error) {
            console.error('Error processing COD order:', error);
            showAlertMessage('Failed to process COD order. Please try again.', 'error');
        }
    }, [validateForm, user, orderData, placeOrderInFirebase, showAlertMessage]);

    const handleProceedToPaymentClick = () => {
        if (validateForm()) {
            setShowConfirmationModal(true);
        }
    };

    const handleConfirmation = () => {
        if (formData.paymentMethod === 'razorpay') {
            handleRazorpayPayment();
        } else if (formData.paymentMethod === 'cod') {
            handleCODPayment();
        }
    };

    if (!orderData || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-lime-600 rounded-full mb-6">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
                        <p className="text-gray-600 mb-8">Please sign in and select a product to proceed with payment.</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        const totalQuantity = orderData.items.reduce((sum, item) => sum + item.quantity, 0);

        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full">
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full mb-6 animate-pulse">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent mb-4">
                            Payment Successful!
                        </h1>
                        <p className="text-gray-600 mb-8 text-lg">Your order has been confirmed and is being processed.</p>

                        <div className="bg-gradient-to-r from-green-50 to-lime-50 rounded-2xl p-6 mb-8">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Order Details</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Transaction ID:</span>
                                    <span className="font-mono text-sm bg-white px-3 py-1 rounded-lg border border-gray-200 break-all">{transactionId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Amount Paid:</span>
                                    <span className="font-bold text-lg">₹{orderData.totalAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Total Items:</span>
                                    <span className="font-medium">{totalQuantity}</span>
                                </div>
                                {orderData.items.length > 0 && (
                                    <div className="border-t border-gray-200 pt-3 mt-3">
                                        <p className="text-gray-700 font-semibold text-left mb-2">Individual Orders Placed:</p>
                                        <div className="max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                            {orderData.items.map((item, index) => (
                                                <div key={item.product?.id || item.product?._id || index} className="flex justify-between items-center text-sm py-1">
                                                    <span className="text-gray-600 flex-1 text-left">{item.product?.name || 'Unknown Product'}</span>
                                                    <span className="font-medium text-gray-800">Qty: {item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md"
                            >
                                Continue Shopping
                            </button>
                            <button
                                onClick={() => navigate('/orders')}
                                className="flex-1 bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                View Orders
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50">
            {showAlert && (
                <CustomAlert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
            )}
            
            {showConfirmationModal && (
                <ConfirmationModal 
                    orderData={orderData}
                    formData={formData}
                    onClose={() => setShowConfirmationModal(false)}
                    onConfirm={handleConfirmation}
                    isProcessing={isProcessing}
                />
            )}
            
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl backdrop-blur-sm transition-all duration-300 text-white"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Back</span>
                            </button>
                            <h1 className="text-2xl sm:text-3xl font-bold">Secure Checkout</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            <span className="text-sm">SSL Encrypted</span>
                        </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center justify-center space-x-4 sm:space-x-8">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                            <span className="font-medium text-sm sm:text-base">Shipping</span>
                        </div>
                        <div className="w-6 sm:w-12 h-px bg-white/40"></div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 bg-white text-green-600 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                            <span className="font-medium text-sm sm:text-base">Payment</span>
                        </div>
                        <div className="w-6 sm:w-12 h-px bg-white/40"></div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 bg-white/20 text-white rounded-full flex items-center justify-center font-bold text-sm">3</div>
                            <span className="font-medium opacity-60 text-sm sm:text-base">Confirmation</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Shipping Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                            {/* Section Header */}
                            <div className="bg-gradient-to-r from-green-600 to-lime-600 p-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Package className="w-6 h-6" />
                                    Shipping Information
                                </h2>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Personal Details */}
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                            <User className="w-4 h-4 text-gray-500" />
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                            <Mail className="w-4 h-4 text-gray-500" />
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <Phone className="w-4 h-4 text-gray-500" />
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                        placeholder="Enter your phone number"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        Address *
                                    </label>
                                    <textarea
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        rows="3"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm resize-none text-gray-800 placeholder-gray-400"
                                        placeholder="Enter your complete address"
                                        required
                                    />
                                </div>

                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">City *</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={formData.city}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                            placeholder="City"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">State *</label>
                                        <input
                                            type="text"
                                            name="state"
                                            value={formData.state}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                            placeholder="State"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Pincode *</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={formData.pincode}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-400"
                                            placeholder="Pincode"
                                            required
                                        />
                                    </div>
                                </div>
                                {/* Added Notes Field */}
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        Order Notes (Optional)
                                    </label>
                                    <textarea
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                        rows="2"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300 bg-white/50 backdrop-blur-sm resize-none text-gray-800 placeholder-gray-400"
                                        placeholder="E.g., Deliver to concierge, leave at door"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Method */}
                        <div className="mt-8 bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-600 to-lime-600 p-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <CreditCard className="w-6 h-6" />
                                    Payment Method
                                </h3>
                            </div>

                            <div className="p-6 space-y-4">
                                <label className="block cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="razorpay"
                                        checked={formData.paymentMethod === 'razorpay'}
                                        onChange={handleInputChange}
                                        className="sr-only"
                                    />
                                    <div className={`border-2 rounded-2xl p-4 transition-all duration-300 ${
                                        formData.paymentMethod === 'razorpay'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 bg-white/50 hover:border-green-300'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-lime-600 rounded-full flex items-center justify-center">
                                                    <CreditCard className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">Online Payment</h4>
                                                    <p className="text-sm text-gray-600">Pay securely with card, UPI, or net banking</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-green-500">
                                                <ShieldCheck className="w-5 h-5" />
                                                <span className="text-sm text-gray-600">Secure</span>
                                            </div>
                                        </div>
                                    </div>
                                </label>

                                <label className="block cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value="cod"
                                        checked={formData.paymentMethod === 'cod'}
                                        onChange={handleInputChange}
                                        className="sr-only"
                                    />
                                    <div className={`border-2 rounded-2xl p-4 transition-all duration-300 ${
                                        formData.paymentMethod === 'cod'
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 bg-white/50 hover:border-green-300'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                                                    <Truck className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-gray-800">Cash on Delivery</h4>
                                                    <p className="text-sm text-gray-600">Pay when your order is delivered</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-green-500">
                                                <Clock className="w-5 h-5" />
                                                <span className="text-sm text-gray-600">No advance payment</span>
                                            </div>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden sticky top-8">
                            <div className="bg-gradient-to-r from-green-600 to-lime-600 p-6">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <Leaf className="w-6 h-6" />
                                    Order Summary
                                </h2>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Products List */}
                                <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {orderData?.items?.map((item, index) => (
                                        <div key={item.product?.id || item.product?._id || index} className="bg-gradient-to-r from-green-50 to-lime-50 rounded-2xl p-4 border border-gray-200">
                                            <div className="flex gap-4 items-center">
                                                <img
                                                    src={item.product?.image || 'https://via.placeholder.com/100?text=No+Img'}
                                                    alt={item.product?.name || 'Product Image'}
                                                    className="w-20 h-20 object-cover rounded-xl shadow-lg"
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/100?text=No+Img'}
                                                />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-800 mb-1">{item.product?.name || 'Unknown Product'}</h3>
                                                    <p className="text-sm text-gray-600 mb-2">Quantity: {item.quantity}</p>
                                                    <p className="font-bold text-lg text-gray-900">₹{(parseFloat(item.product?.price) || 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Price Breakdown */}
                                <div className="space-y-3 pb-4 border-b border-gray-200">
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Subtotal ({orderData?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} item{(orderData?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0) > 1 ? 's' : ''})</span>
                                        <span className="font-semibold">₹{(orderData?.totalAmount || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Shipping</span>
                                        <span className="font-semibold text-green-600">FREE</span>
                                    </div>
                                    <div className="flex justify-between items-center text-gray-600">
                                        <span>Tax</span>
                                        <span className="font-semibold text-green-600">Included</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3">
                                    <span className="text-lg font-bold text-gray-800">Total</span>
                                    <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">
                                        ₹{(orderData?.totalAmount || 0).toLocaleString()}
                                    </span>
                                </div>

                                {/* Security Features (bottom of summary card) */}
                                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 mt-6">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <ShieldCheck className="w-5 h-5 text-green-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Secure Payment</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Truck className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <span className="text-sm font-medium text-gray-700">Fast Delivery</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Place Order Button */}
                                <button
                                    onClick={handleProceedToPaymentClick}
                                    disabled={isProcessing}
                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3 mt-6"
                                >
                                    {isProcessing ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Lock className="w-5 h-5" />
                                            {formData.paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'}
                                            <span className="text-lg">₹{(orderData?.totalAmount || 0).toLocaleString()}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;