import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ShoppingBag, Loader, Heart, Search, Menu, X, ArrowRight, Sparkles, Crown, Gift, Leaf, TreePine, Recycle, Compass, Package, IndianRupee } from 'lucide-react';
import { auth, db } from "../firebaseConfig";
import {
    getFirestore,
    collection,
    addDoc,
    deleteDoc,
    doc,
    query,
    where,
    onSnapshot,
    orderBy,
    serverTimestamp,
    getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const HomeScreen = ({ isLoggedIn, userRole }) => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [actionLoading, setActionLoading] = useState({});
    const [error, setError] = useState(null);
    
    // State for the new curated collections
    const [handicrafts, setHandicrafts] = useState([]);
    const [organicFoods, setOrganicFoods] = useState([]);
    const [naturalFabrics, setNaturalFabrics] = useState([]);
    const [upcycledGoods, setUpcycledGoods] = useState([]);


    const db = useMemo(() => getFirestore(), []);
    
    const productCollections = useMemo(() => [
        'handicrafts',
        'herbal_products',
        'natural_fabrics',
        'organic_foods',
        'upcycled_goods',
    ], []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const fetchProductsFromFirebase = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const allProducts = [];
            
            // Fetch products from each collection to populate all sections
            for (const collectionName of productCollections) {
                const q = query(collection(db, collectionName));
                const snapshot = await getDocs(q);
                const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Assign products to their respective state variables
                if (collectionName === 'handicrafts') setHandicrafts(productsData.slice(0, 4));
                if (collectionName === 'organic_foods') setOrganicFoods(productsData.slice(0, 4));
                if (collectionName === 'natural_fabrics') setNaturalFabrics(productsData.slice(0, 4));
                if (collectionName === 'upcycled_goods') setUpcycledGoods(productsData.slice(0, 4));
                
                allProducts.push(...productsData);
            }

            // Filter for featured products to be used in the featured section
            const featured = allProducts.filter(p => p.is_featured);
            setFeaturedProducts(featured);
            
        } catch (err) {
            console.error("Error fetching products from Firebase:", err);
            setError(`Failed to fetch products: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [db, productCollections]);

    useEffect(() => {
        fetchProductsFromFirebase();
    }, [fetchProductsFromFirebase]);
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const loadUserWishlist = useCallback((userId) => {
        if (!db || !userId) return () => {};
        const q = query(
            collection(db, 'wishlists'),
            where('userId', '==', userId),
            orderBy('addedAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWishlistItems(data);
        }, (error) => {
            console.error(`Failed to load wishlist: ${error.message}`);
            setError(`Failed to load wishlist: ${error.message}`);
        });
        return unsubscribe;
    }, [db]);

    useEffect(() => {
        let unsubscribeWishlist = null;
        if (user && db) {
            unsubscribeWishlist = loadUserWishlist(user.uid);
        } else {
            setWishlistItems([]);
        }
        return () => {
            if (unsubscribeWishlist) unsubscribeWishlist();
        };
    }, [user, db, loadUserWishlist]);

    const isInWishlist = useCallback((productId) => wishlistItems.some(item => item.productId === productId), [wishlistItems]);

    const toggleWishlist = useCallback(async (product, e) => {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        if (!user || !db) { alert('Please sign in to add items to your wishlist'); return; }
        const productId = product.id;
        setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: true }));
        try {
            const itemQuery = query(collection(db, 'wishlists'), where('userId', '==', user.uid), where('productId', '==', productId));
            const querySnapshot = await getDocs(itemQuery);
            if (!querySnapshot.empty) {
                const itemDoc = querySnapshot.docs[0];
                await deleteDoc(doc(db, 'wishlists', itemDoc.id));
            } else {
                const data = { userId: user.uid, productId: productId, productData: product, addedAt: serverTimestamp(), category: product.category || 'featured' };
                await addDoc(collection(db, 'wishlists'), data);
            }
        } catch (err) {
            setError(`Failed to update wishlist: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [`wishlist_${productId}`]: false }));
        }
    }, [user, db]);

    const heroSlides = [
        {
            title: "Sustainable Living",
            subtitle: "Discover eco-friendly products from rural artisans",
            image: "https://completewellbeing.com/wp-content/uploads/2019/10/a-3-step-beginners-guide-to-sustainable-living.jpg",
            cta: "Shop Now",
            route: "/natural_fabrics"
        },
        {
            title: "Empower Rural India",
            subtitle: "Handcrafted goods that support local communities",
            image: "https://thecsrjournal.in/wp-content/uploads/2018/10/rural-women-in-India.jpg",
            cta: "Explore Crafts",
            route: "/handicrafts"
        },
        {
            title: "Pure & Organic",
            subtitle: "Chemical-free foods from the heart of nature",
            image: "https://oasisfarmz.com/wp-content/uploads/2019/12/Why-do-people-buy-organic-Separating-myth-from-motivation.jpeg",
            cta: "Shop Organic Foods",
            route: "/organic_foods"
        }
    ];

    const categories = [
        {
            name: "Handicrafts",
            icon: "🏺",
            image: "https://placehold.co/400x300/e6e6e6/808080?text=Handicrafts",
            route: "/handicrafts"
        },
        {
            name: "Organic Foods",
            icon: "🥗",
            image: "https://placehold.co/400x300/d9f99d/22c55e?text=Organic+Foods",
            route: "/organic_foods"
        },
        {
            name: "Natural Fabrics",
            icon: "🌿",
            image: "https://placehold.co/400x300/c7d2fe/312e81?text=Natural+Fabrics",
            route: "/natural_fabrics"
        },
        {
            name: "Herbal Products",
            icon: "💧",
            image: "https://placehold.co/400x300/f9a8d4/831843?text=Herbal+Products",
            route: "/herbal_products"
        },
        {
            name: "Upcycled Goods",
            icon: "♻️",
            image: "https://placehold.co/400x300/a78bfa/4c1d95?text=Upcycled+Goods",
            route: "/upcycled_goods"
        },
        {
            name: "Artisan Stories",
            icon: "📝",
            image: "https://placehold.co/400x300/60a5fa/1e40af?text=Artisan+Stories",
            route: "/artisan_stories"
        }
    ];
    
    // Dynamically created array for curated collections from your Firebase data
    const curatedCollections = useMemo(() => [
        {
            name: "Handicrafts",
            description: "Handcrafted goods from local artisans",
            items: handicrafts,
            route: "/handicrafts"
        },
        {
            name: "Organic Foods",
            description: "Chemical-free and natural food items",
            items: organicFoods,
            route: "/organic_foods"
        },
        {
            name: "Natural Fabrics",
            description: "Eco-friendly textiles for a greener wardrobe",
            items: naturalFabrics,
            route: "/natural_fabrics"
        },
        {
            name: "Upcycled Goods",
            description: "Unique products made from repurposed materials",
            items: upcycledGoods,
            route: "/upcycled_goods"
        },
    ], [handicrafts, organicFoods, naturalFabrics, upcycledGoods]);


    const renderStars = (rating) => (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-lime-500 fill-lime-500' : 'text-gray-300'}`}
                />
            ))}
            <span className="text-sm text-gray-600 ml-1">({rating > 0 ? rating : 'No ratings yet'})</span>
        </div>
    );

    const handleCategoryClick = (route) => {
        navigate(route);
    };

    const handleProductClick = (product) => {
        const categoryPath = product.category.toLowerCase().replace(' ', '_');
        navigate(`/${categoryPath}/${product.id}`);
    };

    const handleHeroButtonClick = (route) => {
        navigate(route);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Loader className="w-16 h-16 text-green-600 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 text-center">
                <div className="bg-white p-8 rounded-lg shadow-lg">
                    <h2>Error</h2>
                    <p>{error}</p>
                    <button onClick={() => window.location.reload()} className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg">Reload</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-lime-50 font-sans">
            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-10"></div>
                <div
                    className="absolute inset-0 bg-cover bg-center transition-all duration-1000 transform scale-105"
                    style={{ backgroundImage: `url(${heroSlides[currentSlide].image})` }}
                ></div>

                <div className="relative z-20 text-center text-white max-w-4xl mx-auto px-4">
                    <div className="animate-fade-in">
                        <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
                            {heroSlides[currentSlide].title}
                        </h1>
                        <p className="text-xl md:text-2xl mb-8 text-green-100 max-w-2xl mx-auto">
                            {heroSlides[currentSlide].subtitle}
                        </p>
                        <button
                            onClick={() => handleHeroButtonClick(heroSlides[currentSlide].route)}
                            className="bg-gradient-to-r from-green-600 to-lime-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
                        >
                            <span>{heroSlides[currentSlide].cta}</span>
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Slide Indicators */}
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                    {heroSlides.map((_, index) => (
                        <button
                            key={index}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                index === currentSlide ? 'bg-white shadow-lg' : 'bg-white/50'
                            }`}
                            onClick={() => setCurrentSlide(index)}
                        />
                    ))}
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Shop by Category</h2>
                        <p className="text-gray-600 text-lg">Discover our range of sustainable and eco-friendly products</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {categories.map((category, index) => (
                            <div
                                key={index}
                                onClick={() => handleCategoryClick(category.route)}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-lime-50 to-green-50 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100 text-center"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-green-600/10 to-lime-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative flex flex-col items-center">
                                    <div className="text-4xl mb-4">{category.icon}</div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h3>
                                    <p className="text-gray-600 mb-4">{(category.count || "0")} items</p>
                                    <div className="flex items-center justify-center text-green-600 font-medium group-hover:text-lime-600">
                                        <span>Explore Collection</span>
                                        <ArrowRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <hr className="my-8 border-gray-200" />
            {/* Curated Collections (Dynamic) */}
            <section className="py-20 bg-gradient-to-br from-lime-100 to-green-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Curated Collections</h2>
                        <p className="text-gray-600 text-lg">Curated selections that align with your values</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {curatedCollections.map((collection, index) => (
                             collection.items.length > 0 && (
                            <div
                                key={index}
                                onClick={() => navigate(collection.route)}
                                className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer border border-gray-100"
                            >
                                <div className="relative overflow-hidden">
                                    <img
                                        src={collection.items[0].image || 'https://placehold.co/400x300?text=No+Image'}
                                        alt={collection.name}
                                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>

                                <div className="p-6 flex flex-col items-center text-center">
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{collection.name}</h3>
                                    <p className="text-gray-600 mb-4">{collection.description}</p>
                                    <div className="flex items-center justify-center text-green-600 font-medium group-hover:text-lime-600">
                                        <span>View Collection</span>
                                        <ArrowRight className="h-4 w-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                            )
                        ))}
                    </div>
                </div>
            </section>
            <hr className="my-8 border-gray-200" />
            {/* Featured Products (Now with horizontal scroll and wishlist) */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Eco-Products</h2>
                        <p className="text-gray-600 text-lg">Ethically sourced, sustainably crafted</p>
                    </div>

                    <div className="flex overflow-x-scroll pb-10 hide-scrollbar space-x-6">
                        {featuredProducts.map((product) => {
                            const productId = product.id;
                            const inWishlist = isInWishlist(productId);
                            const wishlistLoading = actionLoading[`wishlist_${productId}`];

                            return (
                                <div
                                    key={productId}
                                    className="flex-shrink-0 w-64 md:w-72 lg:w-80 bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 cursor-pointer"
                                    onClick={() => handleProductClick(product)}
                                >
                                    <div className="relative overflow-hidden">
                                        <img
                                            src={product.image}
                                            alt={product.name}
                                            className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                                        />
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-gradient-to-r from-green-600 to-lime-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                                {product.is_bestseller ? "Bestseller" : (product.is_featured ? "Featured" : "New")}
                                            </span>
                                        </div>
                                        <button
                                            className={`absolute top-4 right-4 p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-colors shadow ${inWishlist ? 'active text-red-500' : 'text-gray-500 hover:text-red-500'}`}
                                            onClick={(e) => toggleWishlist(product, e)}
                                            disabled={wishlistLoading}
                                            title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                                        >
                                            {wishlistLoading ? (
                                                <Loader size={18} className="animate-spin" />
                                            ) : (
                                                <Heart size={18} fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" />
                                            )}
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{product.name}</h3>
                                        <div className="flex items-center mb-3">
                                            {renderStars(product.rating)}
                                            <span className="text-sm text-gray-600 ml-2">({product.reviews})</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">
                                            <span className="font-semibold text-gray-800">Origin:</span> {product.origin || 'N/A'}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-4">
                                            <span className="font-semibold text-gray-800">Impact:</span> {product.impact || 'N/A'}
                                        </p>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-2">
                                                <span className="text-2xl font-bold text-gray-900">
                                                    <IndianRupee size={20} className="inline-block" />{product.price.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="w-full bg-gradient-to-r from-green-600 to-lime-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Eco-Impact Section */}
            <section className="py-20 bg-gradient-to-r from-green-600 to-lime-600">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center text-white">
                        <TreePine className="h-16 w-16 mx-auto mb-6 animate-pulse text-green-200" />
                        <h2 className="text-4xl font-bold mb-4">Our Impact So Far</h2>
                        <p className="text-xl mb-8 text-green-100">Every purchase makes a difference</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 border border-green-400/30">
                                <Recycle className="h-12 w-12 text-green-300 mb-4 mx-auto" />
                                <h3 className="text-3xl font-semibold mb-2">5,000+</h3>
                                <p className="text-green-100">Kg of plastic reduced</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 border border-lime-400/30">
                                <Compass className="h-12 w-12 text-lime-300 mb-4 mx-auto" />
                                <h3 className="text-3xl font-semibold mb-2">200+</h3>
                                <p className="text-green-100">Rural artisans empowered</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 hover:bg-white/20 transition-all duration-300 border border-green-400/30">
                                <Package className="h-12 w-12 text-green-300 mb-4 mx-auto" />
                                <h3 className="text-3xl font-semibold mb-2">75%</h3>
                                <p className="text-green-100">Packaging is compostable</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter Section */}
            <section className="py-20 bg-gradient-to-br from-lime-100 to-green-100">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <Leaf className="h-16 w-16 mx-auto mb-6 text-green-600" />
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Join the Green Revolution</h2>
                    <p className="text-xl text-gray-600 mb-8">Get the latest news about our sustainable collections and exclusive offers</p>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button className="bg-gradient-to-r from-green-600 to-lime-600 text-white px-8 py-3 rounded-lg font-medium hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                            Subscribe
                        </button>
                    </div>
                </div>
            </section>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 1s ease-out forwards;
                }

                /* Custom scrollbar styles (optional, for a cleaner look) */
                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
};

export default HomeScreen;