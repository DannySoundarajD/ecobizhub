import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, Filter, Leaf, ShoppingCart, Heart, ChevronLeft, ChevronRight, Loader, Search, X, SlidersHorizontal, IndianRupee, RotateCcw, Tag } from 'lucide-react';
import { auth, db } from "../firebaseConfig";
import { Link, useNavigate } from 'react-router-dom';
import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    updateDoc,
    increment,
    onSnapshot,
    orderBy,
    serverTimestamp,
    getDocs,
} from 'firebase/firestore';

const FilterContent = React.memo(({
    searchTerm, setSearchTerm, handleSearchTrigger,
    uniqueMaterials, selectedMaterial, setSelectedMaterial,
    uniqueOrigins, selectedOrigin, setSelectedOrigin,
    priceRange, setPriceRange,
    isFeatured, setIsFeatured,
    hasSpecialDeal, setHasSpecialDeal,
    isFastDelivery, setIsFastDelivery,
    sortBy, setSortBy,
    clearFilters
}) => {
    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchTrigger(); }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
            </div>
            
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={selectedMaterial} onChange={(e) => setSelectedMaterial(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                    {uniqueMaterials.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>
            
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Origin</label>
                <select value={selectedOrigin} onChange={(e) => setSelectedOrigin(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                    {uniqueOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>

            <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Price Range</label>
                <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-lime-50 rounded-xl border border-gray-200">
                    <div className="text-center text-sm font-medium text-gray-700 mb-3">₹{priceRange.min.toLocaleString()} - ₹{priceRange.max.toLocaleString()}</div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Min Price</label>
                            <input type="range" min="0" max="50000" value={priceRange.min} onChange={(e) => setPriceRange({ ...priceRange, min: parseInt(e.target.value) })} className="w-full h-2 bg-gradient-to-r from-green-200 to-lime-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Max Price</label>
                            <input type="range" min="0" max="50000" value={priceRange.max} onChange={(e) => setPriceRange({ ...priceRange, max: parseInt(e.target.value) })} className="w-full h-2 bg-gradient-to-r from-green-200 to-lime-200 rounded-lg appearance-none cursor-pointer" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Filters</label>
                <label className="flex items-center text-gray-700 cursor-pointer"><input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="form-checkbox h-4 w-4 text-green-600 rounded" /><span className="ml-2 text-sm">Featured</span></label>
                <label className="flex items-center text-gray-700 cursor-pointer"><input type="checkbox" checked={hasSpecialDeal} onChange={(e) => setHasSpecialDeal(e.target.checked)} className="form-checkbox h-4 w-4 text-green-600 rounded" /><span className="ml-2 text-sm">Special Deals</span></label>
                <label className="flex items-center text-gray-700 cursor-pointer"><input type="checkbox" checked={isFastDelivery} onChange={(e) => setIsFastDelivery(e.target.checked)} className="form-checkbox h-4 w-4 text-green-600 rounded" /><span className="ml-2 text-sm">Fast Delivery</span></label>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="name">Name (A-Z)</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="reviews">Most Reviewed</option>
                </select>
            </div>
            
            <button onClick={clearFilters} className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl font-medium hover:from-green-700 hover:to-lime-700 transition-all duration-200 transform hover:scale-105">Clear All Filters</button>
        </div>
    );
});

const MobileFilterModal = React.memo(({ isOpen, onClose, ...props }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
            <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto transform transition-transform duration-300 ease-out z-50">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">Filters</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600" aria-label="Close filters"><X size={24} /></button>
                    </div>
                    <FilterContent {...props} />
                </div>
            </div>
        </div>
    );
});

const Pagination = React.memo(({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
                <span>Previous</span>
            </button>
            <span className="font-medium text-gray-800">
                Page {currentPage} of {totalPages}
            </span>
            <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <span>Next</span>
                <ChevronRight size={16} />
            </button>
        </div>
    );
});

const OrganicFoods = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedMaterial, setSelectedMaterial] = useState('All');
    const [selectedOrigin, setSelectedOrigin] = useState('All');
    const [priceRange, setPriceRange] = useState({ min: 0, max: 50000 });
    const [sortBy, setSortBy] = useState('name');
    const [isFeatured, setIsFeatured] = useState(false);
    const [hasSpecialDeal, setHasSpecialDeal] = useState(false);
    const [isFastDelivery, setIsFastDelivery] = useState(false);
    const [user, setUser] = useState(null);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [actionLoading, setActionLoading] = useState({});
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const PRODUCTS_PER_PAGE = 8;
    
    const navigate = useNavigate();
    const COLLECTION_NAME = 'organic_foods';

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const productsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setProducts(productsData);
        } catch (err) {
            console.error("Error fetching products:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearchTrigger = () => {
        setDebouncedSearchTerm(searchTerm);
        setCurrentPage(1);
    };

    const filteredAndSortedProducts = useMemo(() => {
        let currentProducts = [...products];
        if (debouncedSearchTerm) {
            const searchLower = debouncedSearchTerm.toLowerCase();
            currentProducts = currentProducts.filter(product =>
                ['name', 'description', 'category', 'origin', 'dietary_info'].some(field =>
                    product[field]?.toLowerCase().includes(searchLower)
                )
            );
        }
        if (selectedMaterial !== 'All') currentProducts = currentProducts.filter(p => p.category === selectedMaterial);
        if (selectedOrigin !== 'All') currentProducts = currentProducts.filter(p => p.origin === selectedOrigin);
        currentProducts = currentProducts.filter(p => (parseFloat(p.price) || 0) >= priceRange.min && (parseFloat(p.price) || 0) <= priceRange.max);
        if (isFeatured) currentProducts = currentProducts.filter(p => p.is_featured);
        if (hasSpecialDeal) currentProducts = currentProducts.filter(p => p.has_special_deal);
        if (isFastDelivery) currentProducts = currentProducts.filter(p => p.is_fast_delivery);
        
        currentProducts.sort((a, b) => {
            switch (sortBy) {
                case 'price-low': return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
                case 'price-high': return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
                case 'rating': return (b.rating || 0) - (a.rating || 0);
                case 'reviews': return (b.reviews || 0) - (a.reviews || 0);
                default: return (a.name || '').localeCompare(b.name || '');
            }
        });
        return currentProducts;
    }, [products, debouncedSearchTerm, selectedMaterial, selectedOrigin, priceRange, sortBy, isFeatured, hasSpecialDeal, isFastDelivery]);

    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
        return filteredAndSortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
    }, [currentPage, filteredAndSortedProducts]);

    const totalPages = Math.ceil(filteredAndSortedProducts.length / PRODUCTS_PER_PAGE);
    const uniqueMaterials = useMemo(() => ['All', ...new Set(products.map(p => p.category).filter(Boolean))], [products]);
    const uniqueOrigins = useMemo(() => ['All', ...new Set(products.map(p => p.origin).filter(Boolean))], [products]);

    const isInWishlist = useCallback((productId) => wishlistItems.some(item => item.productId === productId), [wishlistItems]);
    const getCartItemQuantity = useCallback((productId) => cartItems.find(item => item.productId === productId)?.quantity || 0, [cartItems]);

    const toggleWishlist = useCallback(async (product, e) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return navigate('/login');
        const productId = product.id || product._id;
        setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: true }));
        try {
            const q = query(collection(db, 'wishlists'), where('userId', '==', user.uid), where('productId', '==', productId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                await deleteDoc(doc(db, 'wishlists', snapshot.docs[0].id));
            } else {
                await addDoc(collection(db, 'wishlists'), { userId: user.uid, productId, productData: product, addedAt: serverTimestamp(), category: 'organic_foods' });
            }
        } catch (err) { console.error("Wishlist error:", err); }
        finally { setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: false })); }
    }, [user, db, navigate]);

    const addToCart = useCallback(async (product, e, quantity = 1) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return navigate('/login');
        const productId = product.id || product._id;
        setActionLoading(prev => ({ ...prev, [`cart_${productId}`]: true }));
        try {
            const q = query(collection(db, 'cart'), where('userId', '==', user.uid), where('productId', '==', productId));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                await updateDoc(doc(db, 'cart', snapshot.docs[0].id), { quantity: increment(quantity), updatedAt: serverTimestamp() });
            } else {
                await addDoc(collection(db, 'cart'), { userId: user.uid, productId, quantity, productData: product, addedAt: serverTimestamp(), updatedAt: serverTimestamp(), category: 'organic_foods' });
            }
        } catch (err) { console.error("Cart error:", err); }
        finally { setActionLoading(prev => ({ ...prev, [`cart_${productId}`]: false })); }
    }, [user, db, navigate]);

    const renderStars = (rating) => (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
            <span className="text-sm text-gray-600 ml-1">({rating})</span>
        </div>
    );

    const clearFilters = () => {
        setSearchTerm('');
        setDebouncedSearchTerm('');
        setSelectedMaterial('All');
        setSelectedOrigin('All');
        setPriceRange({ min: 0, max: 50000 });
        setSortBy('name');
        setIsFeatured(false);
        setHasSpecialDeal(false);
        setIsFastDelivery(false);
        setCurrentPage(1);
    };

    const filterProps = {
        searchTerm, setSearchTerm, handleSearchTrigger,
        uniqueMaterials, selectedMaterial, setSelectedMaterial,
        uniqueOrigins, selectedOrigin, setSelectedOrigin,
        priceRange, setPriceRange,
        isFeatured, setIsFeatured,
        hasSpecialDeal, setHasSpecialDeal,
        isFastDelivery, setIsFastDelivery,
        sortBy, setSortBy,
        clearFilters
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading products...</p>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Products</h2>
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
            <MobileFilterModal isOpen={isMobileFilterOpen} onClose={() => setIsMobileFilterOpen(false)} {...filterProps} />

            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white">
                <div className="container mx-auto px-4 py-16 text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Leaf className="w-8 h-8" />
                        <h1 className="text-4xl md:text-5xl font-bold">Organic Foods</h1>
                        <Tag className="w-8 h-8" />
                    </div>
                    <p className="text-xl text-green-100 max-w-2xl mx-auto">Explore wholesome, nutritious foods grown and processed without synthetic pesticides or fertilizers.</p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    <aside className="hidden lg:block w-80 bg-white rounded-2xl shadow-lg p-6 h-fit sticky top-8 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <SlidersHorizontal className="w-6 h-6 text-green-600" />
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-lime-600 bg-clip-text text-transparent">Filters</h3>
                        </div>
                        <FilterContent {...filterProps} />
                    </aside>
                    <main className="flex-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <span className="text-gray-700 font-medium">{filteredAndSortedProducts.length} Products Found</span>
                                {loading && <div className="flex items-center gap-2 text-green-600"><Loader size={16} className="animate-spin" /><span>Loading...</span></div>}
                                <button onClick={() => setIsMobileFilterOpen(true)} className="lg:hidden flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl">
                                    <Filter size={16} /><span>Filters</span>
                                </button>
                            </div>
                        </div>
                        {paginatedProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {paginatedProducts.map((product) => {
                                    const productId = product.id || product._id;
                                    const inWishlist = isInWishlist(productId);
                                    const wishlistLoading = actionLoading[`wishlist_${productId}`];
                                    const cartQuantity = getCartItemQuantity(productId);

                                    return (
                                        <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group" key={productId}>
                                            <Link to={`/organic_foods/${productId}`} className="block">
                                                <div className="relative overflow-hidden">
                                                    <img src={product.image} alt={product.name} className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" onError={(e) => e.target.src = 'https://placehold.co/400x300?text=No+Image'} />
                                                    <button className={`absolute top-3 right-3 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-colors shadow ${inWishlist ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`} onClick={(e) => toggleWishlist(product, e)} disabled={wishlistLoading}>
                                                        {wishlistLoading ? <Loader size={18} className="animate-spin" /> : <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} />}
                                                    </button>
                                                </div>
                                                <div className="p-4">
                                                    <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">{product.name}</h3>
                                                    <p className="text-sm text-gray-600 mb-2">{product.origin}</p>
                                                    <div className="flex items-center gap-1 mb-2">
                                                        {renderStars(product.rating)}
                                                        <span className="text-sm text-gray-600">({product.reviews})</span>
                                                    </div>
                                                    <p className="text-xl font-bold text-gray-900 flex items-center">
                                                        <IndianRupee size={16} className="inline-block mr-1" />{parseFloat(product.price).toLocaleString()}
                                                    </p>
                                                </div>
                                            </Link>
                                            <button className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 font-semibold text-base hover:from-green-700 hover:to-lime-700 transition-colors flex items-center justify-center gap-2 rounded-b-xl" onClick={(e) => addToCart(product, e)} disabled={actionLoading[`cart_${productId}`]}>
                                                {actionLoading[`cart_${productId}`] ? <Loader size={18} className="animate-spin" /> : <><ShoppingCart size={18} />{cartQuantity > 0 ? `Add More (${cartQuantity})` : 'Add to Cart'}</>}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="col-span-full text-center py-12 flex flex-col items-center justify-center h-96 bg-white rounded-xl shadow-lg border border-gray-100">
                                <Leaf className="w-12 h-12 text-gray-400 mb-4" />
                                <h3 className="text-2xl font-bold text-gray-800 mb-2">No Products Found</h3>
                                <p className="text-gray-600 mb-6">Try adjusting or clearing your filters to see more products.</p>
                                <button onClick={clearFilters} className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 transform hover:scale-105">
                                    Clear Filters
                                </button>
                            </div>
                        )}
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default OrganicFoods;