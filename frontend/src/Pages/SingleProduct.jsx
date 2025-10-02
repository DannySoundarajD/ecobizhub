import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, deleteDoc, doc, query, where, updateDoc, increment, onSnapshot, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { Star, ShoppingCart, Heart, Minus, Plus, CreditCard, Loader, Shield, RotateCcw, BadgeCheck, ChevronRight, Eye, MessageSquare, X, IndianRupee } from 'lucide-react';
import "./../Styles/products.css";

const CATEGORIES_CONFIG = {
    'handicrafts': { displayName: 'Handicrafts', path: '/handicrafts' },
    'organic_foods': { displayName: 'Organic Foods', 'path': '/organic_foods' },
    'natural_fabrics': { displayName: 'Natural Fabrics', path: '/natural_fabrics' },
    'herbal_products': { displayName: 'Herbal Products', path: '/herbal_products' },
    'upcycled_goods': { displayName: 'Upcycled Goods', path: '/upcycled_goods' },
    'best_sellers': { displayName: 'Best Sellers', path: '/best_sellers' },
    'new_arrivals': { displayName: 'New Arrivals', path: '/new_arrivals' },
};

const ImageModal = ({ imageUrl, onClose, altText }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[999] flex items-center justify-center p-4" onClick={onClose}>
            <button className="absolute top-4 right-4 text-white text-3xl z-50 p-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white" onClick={onClose} aria-label="Close image">
                <X className="w-8 h-8" />
            </button>
            <img
                src={imageUrl}
                alt={altText}
                className="max-w-full max-h-[90vh] object-contain"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
};

const ProductReviewForm = ({ onSubmit, isSubmitting, user }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!user) {
            setError("You must be logged in to submit a review.");
            return;
        }
        if (rating === 0) {
            setError("Please select a star rating.");
            return;
        }
        if (comment.trim().length < 5) {
            setError("Please write a review of at least 5 characters.");
            return;
        }
        setError('');
        onSubmit({ rating, comment, userId: user.uid });
        setComment('');
        setRating(0);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Leave a Review</h3>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Rating</label>
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            className={`w-6 h-6 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                            onClick={() => setRating(star)}
                        />
                    ))}
                </div>
            </div>
            <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700">Your Review</label>
                <textarea
                    id="comment"
                    rows="4"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Share your thoughts..."
                />
            </div>
            <button
                type="submit"
                disabled={isSubmitting || !user}
                className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
                {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                Submit Review
            </button>
        </form>
    );
};

const ProductReviewsDisplay = ({ reviews, rating }) => {
    const renderStars = (starCount) => (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`w-5 h-5 ${i < Math.floor(starCount) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );

    const reviewsArray = Array.isArray(reviews) ? reviews : [];
    
    const filteredReviews = reviewsArray.filter(review => typeof review === 'string' && review.trim().length > 3);

    return (
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Customer Reviews & Rating</h3>
            <div className="flex items-center gap-3 border-b pb-4">
                {renderStars(rating)}
                <span className="text-lg font-bold text-gray-800">{rating?.toFixed(1) || 'N/A'}</span>
                <span className="text-gray-500">({filteredReviews.length} reviews)</span>
            </div>
            {filteredReviews.length === 0 ? (
                <p className="text-gray-600 pt-2">No valid reviews yet for this product.</p>
            ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                    {filteredReviews.map((review, index) => (
                        <div key={index} className="border-t border-gray-100 pt-4 first:pt-0 first:border-t-0">
                            <blockquote className="text-gray-700 italic leading-relaxed">"{review}"</blockquote>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SingleProduct = () => {
    const { category: pluralCategory, id } = useParams();
    const navigate = useNavigate();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [wishlistItems, setWishlistItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [actionLoading, setActionLoading] = useState({});

    // Now uses Firestore collection names
    const COLLECTION_NAMES = useMemo(() => ([
        'herbal_products',
        'natural_fabrics',
        'organic_foods',
        'upcycled_goods',
        'handicrafts'
    ]), []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, currentUser => {
            setUser(currentUser);
            setUserLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const fetchProduct = useCallback(async () => {
        if (!pluralCategory || !id) {
            setError("Invalid product URL.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        let foundProduct = null;

        // Try to fetch from the specified category first
        const categoryDocRef = doc(db, pluralCategory, id);
        const categoryDocSnap = await getDoc(categoryDocRef);
        
        if (categoryDocSnap.exists()) {
            foundProduct = { id: categoryDocSnap.id, ...categoryDocSnap.data() };
        } else {
            // If not found in the specified category, search all categories
            for (const collectionName of COLLECTION_NAMES) {
                try {
                    const docRef = doc(db, collectionName, id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        foundProduct = { id: docSnap.id, ...docSnap.data() };
                        break; // Found the product, stop iterating
                    }
                } catch (err) {
                    console.error(`Error fetching from ${collectionName}:`, err);
                }
            }
        }

        if (foundProduct) {
            setProduct(foundProduct);
        } else {
            setError("Product not found or failed to fetch data.");
            setProduct(null);
        }
        setLoading(false);
    }, [pluralCategory, id, COLLECTION_NAMES]);

    useEffect(() => {
        if (!userLoading) {
            fetchProduct();
        }
    }, [userLoading, fetchProduct]);

    const getCartItemQuantity = useCallback((productId) => {
        return cartItems.find(item => (String(item.productId) === String(productId)))?.quantity || 0;
    }, [cartItems]);

    const isInWishlist = useCallback((productId) => {
        return wishlistItems.some(item => (String(item.productId) === String(productId)));
    }, [wishlistItems]);

    const loadUserWishlist = useCallback((userId) => {
        if (!db || !userId) return () => {};
        const q = query(collection(db, 'wishlists'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWishlistItems(data);
        }, (error) => {
            console.error('Error loading wishlist:', error);
        });
        return unsubscribe;
    }, []);

    const loadUserCart = useCallback((userId) => {
        if (!db || !userId) return () => {};
        const q = query(collection(db, 'cart'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCartItems(data);
        }, (error) => {
            console.error('Error loading cart:', error);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        let unsubscribeWishlist = null;
        let unsubscribeCart = null;

        if (user) {
            unsubscribeWishlist = loadUserWishlist(user.uid);
            unsubscribeCart = loadUserCart(user.uid);
        } else {
            setWishlistItems([]);
            setCartItems([]);
        }

        return () => {
            if (unsubscribeWishlist) unsubscribeWishlist();
            if (unsubscribeCart) unsubscribeCart();
        };
    }, [user, loadUserWishlist, loadUserCart]);

    const toggleWishlist = useCallback(async (productToToggle) => {
        if (!user) {
            alert('Please sign in to add items to your wishlist');
            navigate('/login');
            return;
        }

        const productId = String(productToToggle.id || productToToggle._id);
        setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: true }));

        try {
            const isCurrentlyInWishlist = isInWishlist(productId);
            if (isCurrentlyInWishlist) {
                const item = wishlistItems.find(i => (String(i.productId) === productId));
                if (item) await deleteDoc(doc(db, 'wishlists', item.id));
                alert(`${productToToggle.name} removed from your wishlist.`);
            } else {
                const data = {
                    userId: user.uid,
                    productId: productId,
                    productData: productToToggle,
                    addedAt: serverTimestamp(),
                    category: pluralCategory,
                };
                await addDoc(collection(db, 'wishlists'), data);
                alert(`${productToToggle.name} added to your wishlist!`);
            }
        } catch (err) {
            console.error('Wishlist error:', err);
            setError(`Failed to update wishlist: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: false }));
        }
    }, [user, navigate, isInWishlist, wishlistItems, pluralCategory]);

    const handleAddToCart = useCallback(async (productToAdd, quantityToAdd) => {
        if (!user) {
            alert('Please sign in to add items to your cart');
            navigate('/login');
            return;
        }

        const productId = String(productToAdd.id || productToAdd._id);
        setActionLoading(prev => ({ ...prev, [`cart_${productId}`]: true }));

        try {
            const existingItem = cartItems.find(i => (String(i.productId) === productId));
            if (existingItem) {
                await updateDoc(doc(db, 'cart', existingItem.id), {
                    quantity: increment(quantityToAdd),
                    updatedAt: serverTimestamp()
                });
            } else {
                const data = {
                    userId: user.uid,
                    productId: productId,
                    quantity: quantityToAdd,
                    productData: productToAdd,
                    addedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    category: pluralCategory,
                };
                await addDoc(collection(db, 'cart'), data);
            }
            alert(`${productToAdd.name} has been added to your cart!`);
        } catch (err) {
            console.error('Cart error:', err);
            setError(`Failed to add item to cart: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`cart_${productId}`]: false }));
        }
    }, [user, navigate, cartItems, pluralCategory]);

    const handleBuyNow = useCallback(() => {
        if (!user) {
            alert('Please sign in to proceed with purchase');
            navigate('/login');
            return;
        }

        const orderData = {
            items: [
                {
                    product: {
                        id: product.id,
                        name: product.name,
                        price: parseFloat(product.price),
                        image: product.image || (product.images && product.images[0]) || 'https://via.placeholder.com/100',
                        category: pluralCategory,
                    },
                    quantity: quantity,
                }
            ],
            totalAmount: parseFloat(product.price) * quantity,
            userId: user.uid,
            userEmail: user.email
        };

        navigate('/payment', { state: { orderData } });
    }, [user, product, quantity, navigate, pluralCategory]);

    const handleReviewSubmit = async ({ rating, comment }) => {
        if (!user || !product) {
            alert("You must be logged in to submit a review.");
            return;
        }
        setIsSubmitting(true);
        const productId = product.id || product._id;
        
        try {
            console.log(`Submitting review for product ${productId}: rating=${rating}, comment=${comment}`);
            alert("Review submitted successfully! (Note: This is a mock submission as real-time API patching is not enabled in this environment.)");
        } catch (err) {
            console.error("Error submitting review:", err);
            alert(`Failed to submit review: ${err.response?.data?.msg || err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (userLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-16 h-16 text-green-600 animate-spin" />
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-lg">
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    const categoryInfo = CATEGORIES_CONFIG[pluralCategory] || {};
    const breadcrumb = {
        path: categoryInfo.path || `/${pluralCategory}`,
        name: categoryInfo.displayName || pluralCategory
    };
    const productImages = product.images?.length ? product.images : (product.image ? [product.image] : ['https://via.placeholder.com/500?text=No+Image']);

    const productId = String(product.id || product._id);
    const isAddingToCart = actionLoading[`cart_${productId}`];
    const isTogglingWishlist = actionLoading[`wishlist_${productId}`];
    const inWishlist = isInWishlist(productId);
    const cartQuantity = getCartItemQuantity(productId);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 py-4 sm:py-10 px-4 sm:px-6 lg:px-8">
            {/* Breadcrumb Navigation */}
            <nav className="max-w-7xl mx-auto">
                <ol role="list" className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-500 flex-wrap">
                    <li><Link to="/" className="hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">Home</Link></li>
                    <li><ChevronRight className="w-4 h-4 text-gray-400" /></li>
                    <li><Link to={breadcrumb.path} className="hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">{breadcrumb.name}</Link></li>
                    <li><ChevronRight className="w-4 h-4 text-gray-400" /></li>
                    <li className="text-gray-700 font-semibold truncate">{product.name}</li>
                </ol>
            </nav>

            <div className="max-w-7xl mx-auto pt-6 sm:pt-8 pb-12">
                {/* Desktop Layout */}
                <div className="hidden lg:grid lg:grid-cols-2 gap-8 lg:gap-12">
                    {/* Desktop Left Column */}
                    <div className="lg:sticky lg:top-8 h-fit space-y-6">
                        {/* Image Gallery */}
                        <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden group">
                            <img
                                src={productImages[selectedImageIndex] || 'https://via.placeholder.com/500'}
                                alt={product.name}
                                className="w-full h-80 sm:h-[500px] object-cover cursor-pointer"
                                onClick={() => setShowImageModal(true)}
                                onError={(e) => { e.target.src = 'https://via.placeholder.com/500?text=No+Image'; }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center" onClick={() => setShowImageModal(true)}>
                                <Eye className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        {/* Thumbnail Gallery */}
                        <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 mt-4">
                            {productImages.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImageIndex(index)}
                                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 ${selectedImageIndex === index ? 'border-green-600' : 'border-transparent'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                                >
                                    <img src={image} alt={`${product.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=X'; }}/>
                                </button>
                            ))}
                        </div>

                        {/* Description */}
                        {product.description && (
                            <div className="bg-white rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        {/* Desktop Review Form */}
                        <ProductReviewForm onSubmit={handleReviewSubmit} isSubmitting={isSubmitting} user={user} />
                    </div>

                    {/* Desktop Right Column */}
                    <div className="space-y-6">
                        {/* Product Title */}
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-gray-900">{product.name}</h1>
                            <p className="text-gray-500 mt-2">A fine piece from our {breadcrumb.name} collection.</p>
                        </div>

                        {/* Quantity and Price */}
                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center bg-gray-100 rounded-xl">
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        className="p-3 hover:bg-gray-200 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <span className="px-4 sm:px-6 py-3 font-semibold text-lg">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(q => q + 1)}
                                        className="p-3 hover:bg-gray-200 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 text-left sm:text-right">Total Price</p>
                                    <p className="text-2xl sm:text-3xl font-bold text-green-600">
                                        <IndianRupee size={24} className="inline-block" />{(parseFloat(product.price || 0) * quantity).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            <button
                                className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg hover:from-green-700 hover:to-lime-700 disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                onClick={handleBuyNow}
                                disabled={!user}
                            >
                                <CreditCard className="w-5 h-5" /> Buy Now
                            </button>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    className="bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
                                    onClick={() => handleAddToCart(product, quantity)}
                                    disabled={!user || isAddingToCart}
                                >
                                    {isAddingToCart ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-5 h-5" />
                                            {cartQuantity > 0 ? `Add More (${cartQuantity})` : 'Add to Cart'}
                                        </>
                                    )}
                                </button>
                                <button
                                    className={`py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${inWishlist ? 'bg-lime-500 text-white hover:bg-lime-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-lime-500`}
                                    onClick={() => toggleWishlist(product)}
                                    disabled={!user || isTogglingWishlist}
                                >
                                    {isTogglingWishlist ? (
                                        <Loader className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Heart
                                                className="w-5 h-5"
                                                style={{
                                                    fill: inWishlist ? 'currentColor' : 'none',
                                                    color: inWishlist ? 'white' : '#333'
                                                }}
                                            />
                                            {inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Guarantees */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="flex flex-col items-center">
                                    <div className="bg-green-100 p-3 rounded-full mb-2">
                                        <Shield className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">Secure Payment</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-lime-100 p-3 rounded-full mb-2">
                                        <RotateCcw className="w-6 h-6 text-lime-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">30-Day Returns</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-emerald-100 p-3 rounded-full mb-2">
                                        <BadgeCheck className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-900">Quality Certified</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Reviews Display */}
                        <ProductReviewsDisplay reviews={product.reviews} rating={product.rating} />
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden space-y-6">
                    {/* Mobile Image Gallery */}
                    <div className="relative bg-white rounded-2xl shadow-xl overflow-hidden">
                        <img
                            src={productImages[selectedImageIndex] || 'https://via.placeholder.com/500'}
                            alt={product.name}
                            className="w-full h-80 object-cover cursor-pointer"
                            onClick={() => setShowImageModal(true)}
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/500?text=No+Image'; }}
                        />
                        <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-full p-2">
                            <Eye className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    {/* Mobile Thumbnail Gallery */}
                    <div className="flex gap-2 overflow-x-auto pb-2 px-1">
                        {productImages.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedImageIndex(index)}
                                className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 ${selectedImageIndex === index ? 'border-green-600' : 'border-transparent'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                            >
                                <img src={image} alt={`${product.name} thumbnail ${index + 1}`} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://via.placeholder.com/100?text=X'; }}/>
                            </button>
                        ))}
                    </div>

                    {/* Mobile Product Info */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg">
                        <h1 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h1>
                        <p className="text-gray-500 text-sm mb-4">A fine piece from our {breadcrumb.name} collection.</p>

                        {/* Mobile Price and Quantity */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center bg-gray-100 rounded-xl">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="p-2 hover:bg-gray-200 rounded-l-xl"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 font-semibold">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="p-2 hover:bg-gray-200 rounded-r-xl"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-600">Total Price</p>
                                <p className="text-xl font-bold text-green-600">
                                    ₹{(parseFloat(product.price || 0) * quantity).toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Mobile Action Buttons */}
                        <div className="space-y-3">
                            <button
                                className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 rounded-xl font-semibold hover:from-green-700 hover:to-lime-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                onClick={handleBuyNow}
                                disabled={!user}
                            >
                                <CreditCard className="w-5 h-5" /> Buy Now
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className="bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
                                    onClick={() => handleAddToCart(product, quantity)}
                                    disabled={!user || isAddingToCart}
                                >
                                    {isAddingToCart ? (
                                        <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-4 h-4" />
                                            {cartQuantity > 0 ? `Add More (${cartQuantity})` : 'Add to Cart'}
                                        </>
                                    )}
                                </button>
                                <button
                                    className={`py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2 ${inWishlist ? 'bg-lime-500 text-white hover:bg-lime-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                    onClick={() => toggleWishlist(product)}
                                    disabled={!user || isTogglingWishlist}
                                >
                                    {isTogglingWishlist ? (
                                        <Loader className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Heart
                                                className="w-4 h-4"
                                                style={{
                                                    fill: inWishlist ? 'currentColor' : 'none',
                                                    color: inWishlist ? 'white' : '#333'
                                                }}
                                            />
                                            {inWishlist ? 'Saved' : 'Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Description */}
                    {product.description && (
                        <div className="bg-white rounded-2xl p-4 shadow-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                            <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                        </div>
                    )}

                    {/* Mobile Guarantees */}
                    <div className="bg-white rounded-2xl p-4 shadow-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="flex flex-col items-center">
                                <div className="bg-green-100 p-2 rounded-full mb-1">
                                    <Shield className="w-5 h-5 text-green-600" />
                                </div>
                                <p className="text-xs font-medium text-gray-900">Secure Payment</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="bg-lime-100 p-2 rounded-full mb-1">
                                    <RotateCcw className="w-5 h-5 text-lime-600" />
                                </div>
                                <p className="text-xs font-medium text-gray-900">30-Day Returns</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="bg-emerald-100 p-2 rounded-full mb-1">
                                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                                </div>
                                <p className="text-xs font-medium text-gray-900">Quality Certified</p>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Reviews Display */}
                    <ProductReviewsDisplay reviews={product.reviews} rating={product.rating} />

                    {/* Mobile Review Form */}
                    <ProductReviewForm onSubmit={handleReviewSubmit} isSubmitting={isSubmitting} user={user} />
                </div>
            </div>

            {/* Image Modal */}
            <ImageModal
                imageUrl={showImageModal ? productImages[selectedImageIndex] : null}
                onClose={() => setShowImageModal(false)}
                altText={product.name}
            />
        </div>
    );
};

export default SingleProduct;