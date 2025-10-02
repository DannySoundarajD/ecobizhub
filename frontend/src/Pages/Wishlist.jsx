import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import {
    getFirestore,
    collection,
    query,
    where,
    onSnapshot,
    doc,
    deleteDoc,
    addDoc,
    serverTimestamp,
    getDocs,
    updateDoc,
    increment,
    orderBy,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { 
    ShoppingCart, 
    Loader, 
    XCircle, 
    Heart, 
    Leaf, 
    Package,
    ShieldCheck,
    Truck,
    Filter,
    Grid,
    List,
    Search,
    ArrowRight,
    Clock,
    Tag,
    Zap,
    CheckCircle,
    AlertCircle,
    Lock
} from 'lucide-react';

const WishlistPage = () => {
    const [wishlistItems, setWishlistItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [actionLoading, setActionLoading] = useState({});
    const [viewMode, setViewMode] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const db = useMemo(() => getFirestore(), []);

    const getCartItemQuantity = useCallback((productId) => {
        const cartItem = cartItems.find(item => item.productId === productId);
        return cartItem ? cartItem.quantity : 0;
    }, [cartItems]);

    const isInCart = useCallback((productId) => getCartItemQuantity(productId) > 0, [getCartItemQuantity]);

    const loadUserWishlist = useCallback((userId) => {
        if (!db) return () => {};
        const q = query(
            collection(db, 'wishlists'),
            where('userId', '==', userId),
            orderBy('addedAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setWishlistItems(items);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Error fetching wishlist items:", err);
            setError(`Failed to load wishlist items: ${err.message}. Please ensure your Firestore indexes are correct.`);
            setLoading(false);
        });
        return unsubscribe;
    }, [db]);

    useEffect(() => {
        let unsubscribeWishlistListener = () => {};
        let unsubscribeCartListener = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            unsubscribeWishlistListener();
            unsubscribeCartListener();

            if (currentUser) {
                unsubscribeWishlistListener = loadUserWishlist(currentUser.uid);

                const cartQuery = query(collection(db, 'cart'), where('userId', '==', currentUser.uid));
                unsubscribeCartListener = onSnapshot(cartQuery, (querySnapshot) => {
                    const cartData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCartItems(cartData);
                });

            } else {
                setWishlistItems([]);
                setCartItems([]);
                setLoading(false);
                setError("Please log in to view your wishlist.");
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeWishlistListener();
            unsubscribeCartListener();
        };
    }, [db, loadUserWishlist]);

    const handleRemoveFromWishlist = useCallback(async (wishlistItemId) => {
        if (!user || !db) {
            console.warn("Not authenticated or DB not initialized.");
            return;
        }
        setActionLoading(prev => ({ ...prev, [`wishlist_remove_${wishlistItemId}`]: true }));
        try {
            const itemRef = doc(db, 'wishlists', wishlistItemId);
            await deleteDoc(itemRef);
        } catch (err) {
            console.error("Error removing from wishlist:", err);
            setError(`Failed to remove item: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`wishlist_remove_${wishlistItemId}`]: false }));
        }
    }, [user, db]);

    const handleAddToCart = useCallback(async (product) => {
        if (!user || !db) {
            alert('Please sign in to add items to your cart.');
            return;
        }

        const productId = product.productId;
        setActionLoading(prev => ({ ...prev, [`cart_add_${productId}`]: true }));

        try {
            const cartQuery = query(
                collection(db, 'cart'),
                where('userId', '==', user.uid),
                where('productId', '==', productId)
            );
            const querySnapshot = await getDocs(cartQuery);

            if (!querySnapshot.empty) {
                const existingItem = querySnapshot.docs[0];
                await updateDoc(doc(db, 'cart', existingItem.id), {
                    quantity: increment(1),
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(collection(db, 'cart'), {
                    userId: user.uid,
                    productId: productId,
                    quantity: 1,
                    productData: product.productData,
                    addedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    category: product.category,
                });
            }
        } catch (err) {
            console.error("Error adding to cart:", err);
            setError(`Failed to add item to cart: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`cart_add_${productId}`]: false }));
        }
    }, [user, db]);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return wishlistItems;
        return wishlistItems.filter(item =>
            item.productData.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.productData.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.productData.gender?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [wishlistItems, searchTerm]);

    const getProductUrlSegment = useCallback((categoryName) => {
        if (!categoryName) return 'product';
        const lowerCaseCategory = categoryName.toLowerCase();
        switch (lowerCaseCategory) {
            case 'handicraft': return 'handicrafts';
            case 'organic_food': return 'organic_foods';
            case 'natural_fabric': return 'natural_fabrics';
            case 'herbal_product': return 'herbal_products';
            case 'upcycled_goods': return 'upcycled_goods';
            case 'best_seller': return 'best_sellers';
            case 'new_arrival': return 'new_arrivals';
            default: return lowerCaseCategory.replace(/_/g, '');
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-lime-600 rounded-full mb-6 animate-pulse">
                        <Loader className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent mb-2">
                        Loading Your Wishlist
                    </h2>
                    <p className="text-gray-600">Please wait while we fetch your saved items...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full mb-6">
                            <AlertCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-8">{error}</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {(error.includes("log in") || error.includes("Authentication required")) ? (
                                <button
                                    onClick={() => navigate('/login')}
                                    className="flex-1 bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                                >
                                    <Lock className="w-5 h-5 inline mr-2" />
                                    Go to Login
                                </button>
                            ) : (
                                <button
                                    onClick={() => loadUserWishlist(user?.uid)}
                                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border border-gray-200 transition-all duration-300 shadow-sm hover:shadow-md"
                                >
                                    Try Again
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (wishlistItems.length === 0 && !loading && !error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50 flex flex-col">
                <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                                <Heart className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-bold mb-2">My Wishlist</h1>
                            <p className="text-green-100 text-lg">Your collection of favorite items</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center max-w-md mx-auto px-4">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-green-100 to-lime-100 rounded-full mb-8 animate-bounce-slow">
                            <Heart className="w-12 h-12 text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Wishlist is Empty</h2>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Looks like you haven't saved any items yet. Start exploring our amazing collection
                            and add items to your wishlist!
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                <Zap className="w-5 h-5" />
                                Start Shopping
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-emerald-50">
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        <div className="text-center lg:text-left">
                            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full">
                                    <Heart className="w-6 h-6" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-bold">My Wishlist</h1>
                            </div>
                            <p className="text-green-100 text-lg mb-2">
                                {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved for later
                            </p>
                            <div className="flex items-center justify-center lg:justify-start gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                    <ShieldCheck className="w-4 h-4" />
                                    <span>Secure & Private</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Zap className="w-4 h-4" />
                                    <span>Quick Add to Cart</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search your wishlist..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm transition-all duration-300"
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-white/20 rounded-xl p-1">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        viewMode === 'grid' 
                                            ? 'bg-white/30 text-white' 
                                            : 'text-white/70 hover:text-white hover:bg-white/20'
                                    }`}
                                >
                                    <Grid className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg transition-all duration-300 ${
                                        viewMode === 'list' 
                                            ? 'bg-white/30 text-white' 
                                            : 'text-white/70 hover:text-white hover:bg-white/20'
                                    }`}
                                >
                                    <List className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {searchTerm && filteredItems.length > 0 && (
                    <div className="mb-6 p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/20 shadow-md">
                        <div className="flex items-center gap-3 flex-wrap">
                            <Filter className="w-5 h-5 text-green-600" />
                            <span className="text-gray-700 font-medium">
                                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found for "{searchTerm}"
                            </span>
                            {filteredItems.length !== wishlistItems.length && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="ml-auto text-green-600 hover:text-green-700 font-medium text-sm px-3 py-1 rounded-md bg-green-50 hover:bg-green-100 transition-colors"
                                >
                                    Clear filter
                                </button>
                            )}
                        </div>
                    </div>
                )}
                 {searchTerm && filteredItems.length === 0 && (
                    <div className="mb-6 p-4 bg-red-50/60 backdrop-blur-sm rounded-2xl border border-red-200 shadow-md text-center">
                        <p className="text-red-800 font-semibold">No items found matching "{searchTerm}" in your wishlist.</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="mt-2 text-red-600 hover:text-red-700 font-medium text-sm px-3 py-1 rounded-md bg-red-100 hover:bg-red-200 transition-colors"
                        >
                            Clear Search
                        </button>
                    </div>
                )}

                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map((item) => {
                            const product = item.productData;
                            const productUrlSegment = getProductUrlSegment(product.category);
                            const isAddingToCart = actionLoading[`cart_add_${item.productId}`];
                            const isRemoving = actionLoading[`wishlist_remove_${item.id}`];
                            const itemInCart = isInCart(item.productId);

                            return (
                                <div key={item.id} className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex flex-col">
                                    <div className="relative">
                                        <Link to={`/${productUrlSegment}/${item.productId}`}>
                                            <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found'}
                                                />
                                            </div>
                                        </Link>
                                        
                                        <button
                                            onClick={() => handleRemoveFromWishlist(item.id)}
                                            disabled={isRemoving}
                                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Remove from Wishlist"
                                        >
                                            {isRemoving ? (
                                                <Loader className="w-5 h-5 animate-spin text-gray-600 group-hover:text-white" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors duration-300" />
                                            )}
                                        </button>

                                        <div className="absolute top-4 left-4 bg-gradient-to-r from-green-600 to-lime-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                                            <Heart className="w-3 h-3 inline mr-1 fill-current" />
                                            Saved
                                        </div>
                                    </div>

                                    <div className="p-6 flex flex-col flex-grow">
                                        <Link to={`/${productUrlSegment}/${item.productId}`} className="flex-grow">
                                            <h3 className="font-bold text-lg text-gray-800 mb-2 group-hover:text-green-600 transition-colors duration-300 line-clamp-2">
                                                {product.name}
                                            </h3>
                                            
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">
                                                    ₹{parseFloat(product.price || 0).toLocaleString()}
                                                </p>
                                                <div className="flex items-center gap-1 text-yellow-500">
                                                    <Leaf className="w-4 h-4 fill-current text-green-500" />
                                                    <span className="text-sm text-gray-600">{product.rating || 0}</span>
                                                    <span className="text-xs text-gray-500">({product.reviews || 0})</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {product.material && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1">
                                                        <Tag className="w-3 h-3" />
                                                        {product.material}
                                                    </span>
                                                )}
                                                {product.gender && (
                                                    <span className="px-2 py-1 bg-lime-100 text-lime-700 rounded-lg text-xs font-medium">
                                                        {product.gender}
                                                    </span>
                                                )}
                                                {product.is_fast_delivery && (
                                                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium flex items-center gap-1">
                                                        <Zap className="w-3 h-3" />
                                                        Fast Delivery
                                                    </span>
                                                )}
                                            </div>
                                        </Link>

                                        <div className="mt-auto pt-4 border-t border-gray-100">
                                            {itemInCart ? (
                                                <button
                                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl cursor-default shadow-lg flex items-center justify-center gap-2"
                                                    disabled
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    In Cart
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    disabled={isAddingToCart}
                                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                                >
                                                    {isAddingToCart ? (
                                                        <Loader className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ShoppingCart className="w-5 h-5" />
                                                        </>
                                                    )}
                                                    Add to Cart
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : ( // List View
                    <div className="space-y-6">
                        {filteredItems.map((item) => {
                            const product = item.productData;
                            const productUrlSegment = getProductUrlSegment(product.category);
                            const isAddingToCart = actionLoading[`cart_add_${item.productId}`];
                            const isRemoving = actionLoading[`wishlist_remove_${item.id}`];
                            const itemInCart = isInCart(item.productId);

                            return (
                                <div key={item.id} className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden flex flex-col sm:flex-row hover:shadow-2xl transition-all duration-300">
                                    <div className="flex-shrink-0 relative w-full sm:w-64">
                                        <Link to={`/${productUrlSegment}/${item.productId}`}>
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-64 sm:h-auto object-cover rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none hover:scale-105 transition-transform duration-300"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found'}
                                            />
                                        </Link>
                                        <button
                                            onClick={() => handleRemoveFromWishlist(item.id)}
                                            disabled={isRemoving}
                                            className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Remove from Wishlist"
                                        >
                                            {isRemoving ? (
                                                <Loader className="w-5 h-5 animate-spin text-gray-600 group-hover:text-white" />
                                            ) : (
                                                <XCircle className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors duration-300" />
                                            )}
                                        </button>
                                        <div className="absolute top-4 left-4 bg-gradient-to-r from-green-600 to-lime-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                                            <Heart className="w-3 h-3 inline mr-1 fill-current" />
                                            Saved
                                        </div>
                                    </div>

                                    <div className="flex-1 p-6 flex flex-col justify-between">
                                        <Link to={`/${productUrlSegment}/${item.productId}`}>
                                            <h3 className="font-bold text-2xl text-gray-800 mb-3 hover:text-green-600 transition-colors duration-300">
                                                {product.name}
                                            </h3>
                                        </Link>
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">{product.description}</p>
                                        
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">
                                                ₹{parseFloat(product.price || 0).toLocaleString()}
                                            </p>
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <Leaf className="w-5 h-5 fill-current text-green-500" />
                                                <span className="text-base text-gray-600">{product.rating || 0}</span>
                                                <span className="text-sm text-gray-500">({product.reviews || 0} reviews)</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {product.material && (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                                    <Tag className="w-4 h-4" />
                                                    {product.material}
                                                </span>
                                            )}
                                            {product.gender && (
                                                <span className="px-3 py-1 bg-lime-100 text-lime-700 rounded-lg text-sm font-medium">
                                                    {product.gender}
                                                </span>
                                            )}
                                            {product.is_fast_delivery && (
                                                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium flex items-center gap-1">
                                                    <Zap className="w-4 h-4" />
                                                    Fast Delivery
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-auto">
                                            {itemInCart ? (
                                                <button
                                                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold py-3 px-6 rounded-xl cursor-default shadow-lg flex items-center justify-center gap-2"
                                                    disabled
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                    In Cart
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleAddToCart(item)}
                                                    disabled={isAddingToCart}
                                                    className="w-full bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                                                >
                                                    {isAddingToCart ? (
                                                        <Loader className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <ShoppingCart className="w-5 h-5" />
                                                        </>
                                                    )}
                                                    Add to Cart
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;