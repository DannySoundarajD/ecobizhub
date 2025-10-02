import React, { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Dialog,
    DialogBackdrop,
    DialogPanel,
    Menu,
    MenuButton,
    MenuItems,
    MenuItem,
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    Transition,
} from '@headlessui/react';
import {
    Bars3Icon,
    MagnifyingGlassIcon,
    ShoppingBagIcon,
    XMarkIcon,
    HeartIcon,
    UserIcon,
    ChevronDownIcon,
    CogIcon,
    ArrowRightStartOnRectangleIcon,
    ArrowLeftEndOnRectangleIcon,
    UserPlusIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { X, Leaf, Package, Compass, IndianRupee, TreePine, Store, FileText, BarChart } from 'lucide-react'; // Added Store, FileText, BarChart for seller links
import axios from 'axios';
import { auth, db } from '../firebaseConfig';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

import ConfirmModal from './ConfirmModal';
import '../Styles/navbar.css';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

const SearchSuggestions = ({ suggestions, products, onProductSelect, onCategorySelect, isVisible }) => {
    const hasResults = suggestions.length > 0 || products.length > 0;

    if (!isVisible || !hasResults) return null;

    return (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto mt-2">
            {suggestions.map((suggestion, index) => (
                <div
                    key={`cat-${index}`}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                    onClick={() => onCategorySelect(suggestion)}
                >
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 mr-3" />
                    <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{suggestion.text}</span>
                        <p className="text-xs text-gray-500">{suggestion.category}</p>
                    </div>
                </div>
            ))}

            {products.length > 0 && (
                <>
                    {suggestions.length > 0 && <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500 border-b">Products</div>}
                    {products.slice(0, 6).map((product) => (
                        <div
                            key={`prod-${product.id}`}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                            onClick={() => onProductSelect(product)}
                        >
                            <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover mr-3" />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-900">{product.name}</span>
                                <p className="text-xs text-gray-500"><IndianRupee size={12} className="inline-block" />{product.price?.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                    {products.length > 6 && (
                        <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
                            +{products.length - 6} more products found
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const EcoBizHubNavbar = ({ isLoggedIn, userRole }) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [cartCount, setCartCount] = useState(0);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const logoRef = useRef(null);

    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownTimeoutRef = useRef(null);

    const handleDropdownEnter = useCallback((dropdownName) => {
        clearTimeout(dropdownTimeoutRef.current);
        setActiveDropdown(dropdownName);
    }, []);

    const handleDropdownLeave = useCallback(() => {
        dropdownTimeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
        }, 150);
    }, []);

    const categoryRouteMapping = useMemo(() => ({
        'handicraft': '/handicrafts',
        'organic_food': '/organic_foods',
        'natural_fabric': '/natural_fabrics',
        'herbal_product': '/herbal_products',
        'upcycled_goods': '/upcycled_goods',
        'artisan_stories': '/artisan_stories',
        'best_seller': '/best_sellers',
        'new_arrival': '/new_arrivals'
    }), []);

    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    const apiEndpoints = useMemo(() => [
        { url: `${API_BASE_URL}/handicraft`, category: 'handicraft' },
        { url: `${API_BASE_URL}/organic_food`, category: 'organic_food' },
        { url: `${API_BASE_URL}/natural_fabric`, category: 'natural_fabric' },
        { url: `${API_BASE_URL}/herbal_product`, category: 'herbal_product' },
        { url: `${API_BASE_URL}/upcycled_goods`, category: 'upcycled_goods' },
        { url: `${API_BASE_URL}/best_seller`, category: 'best_seller' },
        { url: `${API_BASE_URL}/new_arrival`, category: 'new_arrival' }
    ], [API_BASE_URL]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            // We now get userRole from props, but keep this for internal state
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        let unsubscribeCart = () => { };
        let unsubscribeWishlist = () => { };

        if (user) {
            const userId = user.uid;

            const cartRef = collection(db, 'cart');
            const qCart = query(cartRef, where('userId', '==', userId));
            unsubscribeCart = onSnapshot(qCart, (snapshot) => {
                setCartCount(snapshot.size);
            }, (error) => {
                console.error("Error listening to cart:", error);
                setCartCount(0);
            });

            const wishlistRef = collection(db, 'wishlists');
            const qWishlist = query(wishlistRef, where('userId', '==', userId), orderBy('addedAt', 'desc'));
            unsubscribeWishlist = onSnapshot(qWishlist, (snapshot) => {
                setWishlistCount(snapshot.size);
            }, (error) => {
                console.error("Error listening to wishlist:", error);
                setWishlistCount(0);
            });
        } else {
            setCartCount(0);
            setWishlistCount(0);
        }

        return () => {
            unsubscribeCart();
            unsubscribeWishlist();
        };
    }, [user]);

    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchQuery);
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchQuery]);

    const searchAllProducts = useCallback(async (searchTerm) => {
        if (!searchTerm.trim() || searchTerm.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);

        try {
            const currentUser = auth.currentUser;
            const headers = {};

            if (currentUser) {
                const token = await currentUser.getIdToken();
                headers.Authorization = `Bearer ${token}`;
            }

            const promises = apiEndpoints.map(endpoint =>
                axios.get(`${endpoint.url}?q=${encodeURIComponent(searchTerm)}`, { headers })
                    .then(response => {
                        return response.data.map(product => ({
                            ...product,
                            category: endpoint.category,
                            id: product.id || product._id
                        }));
                    })
                    .catch(error => {
                        console.warn(`Error fetching from ${endpoint.url}:`, error);
                        return [];
                    })
            );

            const results = await Promise.all(promises);

            const allProducts = results.flat();
            const uniqueProducts = allProducts.filter((product, index, self) =>
                index === self.findIndex(p => p.id === product.id)
            );

            setSearchResults(uniqueProducts);
        } catch (error) {
            console.error('Error searching products:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [apiEndpoints]);

    useEffect(() => {
        if (debouncedSearchTerm) {
            searchAllProducts(debouncedSearchTerm);
        } else {
            setSearchResults([]);
        }
    }, [debouncedSearchTerm, searchAllProducts]);

    const searchData = useMemo(() => [
        { keywords: ['handicraft', 'crafts', 'artisan', 'handmade'], route: '/handicrafts', category: 'Handicrafts' },
        { keywords: ['organic', 'food', 'grains', 'spices', 'produce'], route: '/organic_foods', category: 'Organic Foods' },
        { keywords: ['fabric', 'natural fabric', 'textile', 'handloom', 'khadi'], route: '/natural_fabrics', category: 'Natural Fabrics' },
        { keywords: ['herbal', 'ayurvedic', 'natural beauty', 'personal care'], route: '/herbal_products', category: 'Herbal Products' },
        { keywords: ['upcycled', 'recycled', 'zero waste', 'sustainable'], route: '/upcycled_goods', category: 'Upcycled Goods' },
        { keywords: ['artisan stories', 'stories', 'community impact'], route: '/artisan_stories', category: 'Artisan Stories' },
        { keywords: ['best', 'seller', 'sellers', 'popular', 'trending'], route: '/best_sellers', category: 'Best Sellers' },
        { keywords: ['new', 'arrival', 'arrivals', 'latest', 'recent'], route: '/new_arrivals', category: 'New Arrivals' },
        { keywords: ['terracotta', 'pottery', 'clay'], route: '/handicrafts', category: 'Handicrafts' },
        { keywords: ['bamboo', 'cane', 'basketry'], route: '/handicrafts', category: 'Handicrafts' },
        { keywords: ['honey', 'pure honey', 'forest honey'], route: '/organic_foods', category: 'Organic Foods' },
        { keywords: ['black rice', 'chak-hao', 'heirloom grain'], route: '/organic_foods', category: 'Organic Foods' },
        { keywords: ['shampoo bar', 'soap', 'body wash'], route: '/herbal_products', category: 'Herbal Products' },
        { keywords: ['moringa', 'tea', 'herbal tea'], route: '/herbal_products', category: 'Herbal Products' },
        { keywords: ['handloom cotton', 'fabric', 'stole'], route: '/natural_fabrics', category: 'Natural Fabrics' },
        { keywords: ['ajrakh', 'block print'], route: '/natural_fabrics', category: 'Natural Fabrics' },
    ], []);

    useEffect(() => {
        searchData.forEach((item, index) => {
            if (!item.keywords || !Array.isArray(item.keywords)) {
                console.warn(`Invalid keywords in searchData at index ${index}:`, item);
            }
        });
    }, [searchData]);

    const generateCategorySuggestions = useCallback((query) => {
        if (!query.trim()) return [];

        const suggestions = [];
        const queryLower = query.toLowerCase();

        searchData.forEach((item, index) => {
            if (!item || !Array.isArray(item.keywords)) {
                console.warn(`Invalid item at index ${index} in searchData:`, item);
                return;
            }

            item.keywords.forEach(keyword => {
                if (keyword.startsWith(queryLower) && suggestions.length < 5) {
                    const existingSuggestion = suggestions.find(s => s.route === item.route && s.category === item.category);
                    if (!existingSuggestion) {
                        suggestions.push({
                            text: keyword,
                            category: item.category,
                            route: item.route
                        });
                    }
                }
            });
        });

        if (suggestions.length < 5) {
            searchData.forEach((item, index) => {
                if (!item || !Array.isArray(item.keywords)) {
                    console.warn(`Invalid item at index ${index} in searchData:`, item);
                    return;
                }

                item.keywords.forEach(keyword => {
                    if (keyword.includes(queryLower) && !keyword.startsWith(queryLower) && suggestions.length < 5) {
                        const existingSuggestion = suggestions.find(s => s.route === item.route && s.category === item.category);
                        if (!existingSuggestion) {
                            suggestions.push({
                                text: keyword,
                                category: item.category,
                                route: item.route
                            });
                        }
                    }
                });
            });
        }

        return suggestions;
    }, [searchData]);

    const handleSearchChange = useCallback((e) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (value.trim()) {
            const categorySuggestions = generateCategorySuggestions(value);
            setSearchSuggestions(categorySuggestions);
            setShowSuggestions(true);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    }, [generateCategorySuggestions]);

    const clearSearch = useCallback(() => {
        setSearchQuery('');
        setDebouncedSearchTerm('');
        setSearchSuggestions([]);
        setSearchResults([]);
        setShowSuggestions(false);
    }, []);

    const handleProductSelect = useCallback((product) => {
        const categoryRoute = categoryRouteMapping[product.category];
        if (categoryRoute) {
            navigate(`${categoryRoute}/${product.id}`);
        } else {
            navigate(`/product/${product.id}`);
        }
        clearSearch();
    }, [navigate, categoryRouteMapping, clearSearch]);

    const handleCategorySelect = useCallback((suggestion) => {
        const queryParams = new URLSearchParams();
        queryParams.append('search', suggestion.text);
        navigate(`${suggestion.route}?${queryParams.toString()}`);
        clearSearch();
    }, [navigate, clearSearch]);

    const handleSearchSubmit = useCallback((e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        if (searchResults.length === 1) {
            handleProductSelect(searchResults[0]);
            return;
        }

        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
        clearSearch();
    }, [searchQuery, searchResults, navigate, handleProductSelect, clearSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.search-container') && !event.target.closest('.menu-button') && !event.target.closest('.mobile-menu-open-button')) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogoClick = useCallback(() => {
        navigate("/");
    }, [navigate]);

    const handleConfirmLogout = useCallback(async () => {
        setShowLogoutConfirm(false);
        try {
            if (auth.currentUser) {
                await signOut(auth);
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.setItem('isLoggedIn', 'false');
                console.log("Firebase user logged out and local storage cleared.");
            }
            navigate('/login');
        } catch (error) {
            console.error("Error logging out:", error);
            alert("Failed to log out. Please try again.");
        }
    }, [navigate]);

    const mobileNavLinks = [
        {
            name: "Handicrafts",
            sublinks: [
                { name: "Terracotta", href: "/handicrafts" },
                { name: "Bamboo Crafts", href: "/handicrafts" },
                { name: "Textile Art", href: "/handicrafts" },
            ]
        },
        {
            name: "Organic Foods",
            sublinks: [
                { name: "Grains & Spices", href: "/organic_foods" },
                { name: "Herbal Tea", href: "/organic_foods" },
                { name: "Honey", href: "/organic_foods" },
            ]
        },
        {
            name: "Natural Fabrics",
            sublinks: [
                { name: "Handloom", href: "/natural_fabrics" },
                { name: "Khadi", href: "/natural_fabrics" },
                { name: "Natural Dyes", href: "/natural_fabrics" },
            ]
        },
        {
            name: "Herbal Products",
            sublinks: [
                { name: "Personal Care", href: "/herbal_products" },
                { name: "Medicinal", href: "/herbal_products" },
                { name: "Wellness", href: "/herbal_products" },
            ]
        },
        {
            name: "More",
            sublinks: [
                { name: "Best Sellers", href: "/best_sellers" },
                { name: "New Arrivals", href: "/new_arrivals" },
                { name: "Upcycled Goods", href: "/upcycled_goods" },
                { name: "Artisan Stories", href: "/artisan_stories" }
            ]
        }
    ];

    return (
        <div className="bg-white">
            {/* Mobile Dialog (Off-canvas menu) */}
            <Dialog open={open} onClose={setOpen} className="relative z-40 lg:hidden">
                <DialogBackdrop
                    transition
                    className="fixed inset-0 bg-black bg-opacity-40 transition-opacity duration-300 ease-in-out data-[closed]:opacity-0"
                />
                <div className="fixed inset-0 z-50 flex">
                    <DialogPanel
                        transition
                        className="relative flex w-full max-w-xs transform flex-col overflow-y-auto bg-gradient-to-b from-green-800 to-lime-700 pb-12 shadow-xl transition duration-300 ease-in-out data-[closed]:-translate-x-full"
                    >
                        <div className="flex items-center justify-between px-4 pt-5 pb-2">
                            <h2 className="text-lg font-semibold text-white">Menu</h2>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="-m-2 p-2 text-white"
                            >
                                <span className="sr-only">Close menu</span>
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Mobile Search Input */}
                        <div className="px-4 py-2 relative search-container">
                            <form onSubmit={handleSearchSubmit} className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-200" />
                                <input
                                    type="text"
                                    placeholder="Search for eco-products..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    onFocus={() => (searchQuery || searchResults.length > 0 || searchSuggestions.length > 0) && setShowSuggestions(true)}
                                    className="w-full rounded-lg border border-green-400/50 bg-green-900/40 py-2 pl-10 pr-8 text-white placeholder-green-200/80 focus:outline-none focus:ring-2 focus:ring-lime-400"
                                />
                                {isSearching && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-green-300">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 16.5V12a8 8 0 1115.356-2H20a2 2 0 012 2v4a2 2 0 01-2 2h-4v-5"></path>
                                        </svg>
                                    </div>
                                )}
                                {searchQuery && !isSearching && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300 hover:text-white"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </form>
                            <SearchSuggestions
                                suggestions={searchSuggestions}
                                products={searchResults}
                                onProductSelect={handleProductSelect}
                                onCategorySelect={handleCategorySelect}
                                isVisible={showSuggestions}
                            />
                        </div>

                        {/* Mobile Navigation Links (Accordion) */}
                        <div className="mt-4 space-y-2 px-2">
                            {mobileNavLinks.map((item) => (
                                <Disclosure as="div" key={item.name} className="space-y-2">
                                    {({ open }) => (
                                        <>
                                            <DisclosureButton className="flex w-full items-center justify-between rounded-lg bg-green-700/50 px-4 py-3 text-left text-sm font-medium text-white hover:bg-green-600/50 focus:outline-none focus-visible:ring focus-visible:ring-lime-400/75">
                                                <span>{item.name}</span>
                                                <ChevronDownIcon
                                                    className={`${open ? 'rotate-180 transform' : ''
                                                        } h-5 w-5 text-green-200 transition-transform`}
                                                />
                                            </DisclosureButton>
                                            <DisclosurePanel className="space-y-2 px-4 pb-2 pt-2 text-sm text-gray-200">
                                                {item.sublinks.map((sublink) => (
                                                    <Link
                                                        key={sublink.name}
                                                        to={sublink.href}
                                                        onClick={() => setOpen(false)}
                                                        className="block rounded-md px-3 py-2 text-base font-medium text-green-100 hover:bg-green-600/50 hover:text-white"
                                                    >
                                                        {sublink.name}
                                                    </Link>
                                                ))}
                                            </DisclosurePanel>
                                        </>
                                    )}
                                </Disclosure>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="my-6 h-px w-full bg-green-500/30" />

                        {/* Mobile User Actions */}
                        <div className="space-y-3 px-4">
                            {isLoggedIn ? (
                                <>
                                    <Link to="/orders" className="flex items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white" onClick={() => setOpen(false)}>
                                        <ClipboardDocumentListIcon className="mr-3 h-6 w-6" />
                                        My Orders
                                    </Link>
                                    {userRole === 'admin' && (
                                        <Link to="/admin-dashboard" className="flex items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white" onClick={() => setOpen(false)}>
                                            <CogIcon className="mr-3 h-6 w-6" />
                                            Admin Dashboard
                                        </Link>
                                    )}
                                    {userRole === 'seller' && (
                                        <Link to="/seller-dashboard" className="flex items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white" onClick={() => setOpen(false)}>
                                            <Store className="mr-3 h-6 w-6" />
                                            Seller Dashboard
                                        </Link>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setShowLogoutConfirm(true); setOpen(false); }}
                                        className="flex w-full items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white"
                                    >
                                        <ArrowRightStartOnRectangleIcon className="mr-3 h-6 w-6" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="flex items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white" onClick={() => setOpen(false)}>
                                        <ArrowLeftEndOnRectangleIcon className="mr-3 h-6 w-6" />
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="flex items-center rounded-md py-2 text-base font-medium text-white hover:bg-green-600/50 hover:text-white" onClick={() => setOpen(false)}>
                                        <UserPlusIcon className="mr-3 h-6 w-6" />
                                        Create Account
                                    </Link>
                                </>
                            )}
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            {/* Main Header and Desktop Navigation */}
            <header className="fixed top-0 left-0 w-full bg-gradient-to-r from-green-600 to-lime-600 z-30 shadow-md">
                {/* Top Announcement Bar */}
                <div className="py-2 text-center text-sm font-medium text-white bg-black/10">
                    <span className="mr-2">🌱</span>
                    Supporting rural artisans & promoting sustainable living
                    <span className="ml-2">🌍</span>
                </div>

                {/* Navbar Content */}
                <nav className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between lg:justify-start lg:gap-x-8 xl:gap-x-12">
                        {/* Left Section: Hamburger (mobile) + Logo */}
                        <div className="flex items-center">
                            {/* Mobile Hamburger Icon */}
                            <button
                                type="button"
                                onClick={() => setOpen(true)}
                                className="relative rounded-md p-2 text-green-100 lg:hidden hover:text-white mobile-menu-open-button"
                            >
                                <span className="sr-only">Open menu</span>
                                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                            </button>

                            {/* Logo */}
                            <div className="ml-4 flex lg:ml-0" ref={logoRef} >
                                <Link to="/" className="flex items-center" onClick={handleLogoClick}>
                                    <svg className="h-8 sm:h-10 w-auto text-white flex-shrink-0" viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#4ade80" />
                                                <stop offset="100%" stopColor="#84cc16" />
                                            </linearGradient>
                                        </defs>
                                        <rect x="0" y="0" width="200" height="50" fill="url(#gradient)" rx="8" ry="8" className="hidden sm:block" />
                                        <text x="100" y="25" dominantBaseline="middle" textAnchor="middle"
                                            fontFamily="Arial, sans-serif"
                                            className="text-base sm:text-2xl font-bold"
                                            fill="currentColor">
                                            EcoBizHub
                                        </text>
                                        <text x="100" y="40" dominantBaseline="middle" textAnchor="middle"
                                            fontFamily="Arial, sans-serif"
                                            className="text-xs sm:text-sm"
                                            fill="currentColor" opacity="0.8">
                                            Sustainable Marketplace
                                        </text>
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Middle Section: Desktop Navigation Links */}
                        <div className="hidden lg:flex lg:items-left lg:flex-1 lg:justify-center">
                            <div className="flex items-center lg:space-x-6 xl:space-x-8">
                                {/* Handicrafts Dropdown */}
                                <div
                                    className="relative group"
                                    onMouseEnter={() => handleDropdownEnter('handicrafts')}
                                    onMouseLeave={handleDropdownLeave}
                                    onFocus={() => handleDropdownEnter('handicrafts')}
                                    onBlur={handleDropdownLeave}
                                >
                                    <a
                                        href="/handicrafts"
                                        className="flex items-center text-sm font-medium text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600 transition-colors duration-200"
                                        aria-haspopup="true"
                                        aria-expanded={activeDropdown === 'handicrafts'}
                                    >
                                        Handicrafts
                                        <ChevronDownIcon className="ml-1 h-4 w-4" />
                                    </a>
                                    <div
                                        className={classNames(
                                            "fixed top-[140px] bg-white shadow-lg border-t border-gray-200 w-[min(960px,90vw)] z-50 rounded-lg",
                                            activeDropdown === 'handicrafts' ? "opacity-100 visible" : "opacity-0 invisible",
                                            "transition-all duration-300 ease-in-out transform -translate-x-1/2 left-1/2"
                                        )}
                                        role="menu"
                                        aria-label="Handicrafts dropdown"
                                    >
                                        <div className="p-8">
                                            <div className="grid grid-cols-4 gap-8">
                                                <div className="col-span-2">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="group/item relative">
                                                            <img src="https://taajoo.com/wp-content/uploads/2021/12/Terracottta-1.jpg" alt="Handcrafted terracotta pottery" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/handicrafts" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Terracotta</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                        <div className="group/item relative">
                                                            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSG10ng_oleFNWEWsoSUGfWNq7rRfpQ5L6uiQ&s" alt="Woven bamboo baskets" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/handicrafts" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Bamboo Crafts</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Textile Arts</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Handloom Fabrics</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Block Prints</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Embroidery</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Natural Dyes</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Pottery & Clay</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/handicrafts" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Terracotta</Link></li>
                                                            <li><Link to="/handicrafts" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Ceramic Pots</Link></li>
                                                            <li><Link to="/handicrafts" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Decorative Items</Link></li>
                                                            <li><Link to="/handicrafts" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Clay Cookware</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Organic Foods Dropdown */}
                                <div
                                    className="relative group"
                                    onMouseEnter={() => handleDropdownEnter('organic_foods')}
                                    onMouseLeave={handleDropdownLeave}
                                    onFocus={() => handleDropdownEnter('organic_foods')}
                                    onBlur={handleDropdownLeave}
                                >
                                    <a
                                        href="/organic_foods"
                                        className="flex items-center text-sm font-medium text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600 transition-colors duration-200"
                                        aria-haspopup="true"
                                        aria-expanded={activeDropdown === 'organic_foods'}
                                    >
                                        Organic Foods
                                        <ChevronDownIcon className="ml-1 h-4 w-4" />
                                    </a>
                                    <div
                                        className={classNames(
                                            "fixed top-[140px] bg-white shadow-lg border-t border-gray-200 w-[min(960px,90vw)] z-50 rounded-lg",
                                            activeDropdown === 'organic_foods' ? "opacity-100 visible" : "opacity-0 invisible",
                                            "transition-all duration-300 ease-in-out transform -translate-x-1/2 left-1/2"
                                        )}
                                        role="menu"
                                        aria-label="Organic Foods dropdown"
                                    >
                                        <div className="p-8">
                                            <div className="grid grid-cols-4 gap-8">
                                                <div className="col-span-2">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="group/item relative">
                                                            <img src="https://5.imimg.com/data5/SELLER/Default/2023/2/UF/CD/NT/12070852/cardamom-500x500.jpg" alt="Pure and raw honey" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/organic_foods" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Organic Honey</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                        <div className="group/item relative">
                                                            <img src="https://static01.nyt.com/images/2015/03/18/dining/18APPETITEBOX/18APPETITEBOX-superJumbo.jpg" alt="Heirloom grains" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/organic_foods" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Heirloom Grains</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Farm Fresh</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Fruits & Vegetables</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Dairy Products</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Spices & Herbs</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Jams & Preserves</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Pantry Staples</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Pulses & Lentils</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Cooking Oils</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Flours & Grains</Link></li>
                                                            <li><Link to="/organic_foods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Sweeteners</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Natural Fabrics Dropdown */}
                                <div
                                    className="relative group"
                                    onMouseEnter={() => handleDropdownEnter('natural_fabrics')}
                                    onMouseLeave={handleDropdownLeave}
                                    onFocus={() => handleDropdownEnter('natural_fabrics')}
                                    onBlur={handleDropdownLeave}
                                >
                                    <a
                                        href="/natural_fabrics"
                                        className="flex items-center text-sm font-medium text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600 transition-colors duration-200"
                                        aria-haspopup="true"
                                        aria-expanded={activeDropdown === 'natural_fabrics'}
                                    >
                                        Natural Fabrics
                                        <ChevronDownIcon className="ml-1 h-4 w-4" />
                                    </a>
                                    <div
                                        className={classNames(
                                            "fixed top-[140px] bg-white shadow-lg border-t border-gray-200 w-[min(960px,90vw)] z-50 rounded-lg",
                                            activeDropdown === 'natural_fabrics' ? "opacity-100 visible" : "opacity-0 invisible",
                                            "transition-all duration-300 ease-in-out transform -translate-x-1/2 left-1/2"
                                        )}
                                        role="menu"
                                        aria-label="Natural Fabrics dropdown"
                                    >
                                        <div className="p-8">
                                            <div className="grid grid-cols-4 gap-8">
                                                <div className="col-span-2">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="group/item relative">
                                                            <img src="https://himalayankraft.in/wp-content/uploads/2023/09/HimalayanKraft-Pure-Wool-Kullu-Handloom-Stole-Scarf-12-1.jpg" alt="Handloom stoles" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/natural_fabrics" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Handloom Collection</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                        <div className="group/item relative">
                                                            <img src="https://i.etsystatic.com/11505850/r/il/102516/1157988685/il_570xN.1157988685_c05i.jpg" alt="Organic cotton and khadi apparel" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/natural_fabrics" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Khadi Apparel</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Eco-Friendly Clothing</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Organic Cotton</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Linen & Jute</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Hand-Dyed Fabrics</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Woven Sarees</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Accessories</p>
                                                        <ul className="space-y-3">
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Stoles & Scarves</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Totes & Bags</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Pouches</Link></li>
                                                            <li><Link to="/natural_fabrics" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Wall Hangings</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* More Dropdown */}
                                <div
                                    className="relative group"
                                    onMouseEnter={() => handleDropdownEnter('more')}
                                    onMouseLeave={handleDropdownLeave}
                                    onFocus={() => handleDropdownEnter('more')}
                                    onBlur={handleDropdownLeave}
                                >
                                    <a
                                        href="#"
                                        className="flex items-center text-sm font-medium text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600 transition-colors duration-200"
                                        aria-haspopup="true"
                                        aria-expanded={activeDropdown === 'more'}
                                    >
                                        More
                                        <ChevronDownIcon className="ml-1 h-4 w-4" />
                                    </a>
                                    <div
                                        className={classNames(
                                            "fixed top-[140px] bg-white shadow-lg border-t border-gray-200 w-[min(960px,90vw)] z-50 rounded-lg",
                                            activeDropdown === 'more' ? "opacity-100 visible" : "opacity-0 invisible",
                                            "transition-all duration-300 ease-in-out transform -translate-x-1/2 left-1/2"
                                        )}
                                        role="menu"
                                        aria-label="More dropdown"
                                    >
                                        <div className="p-8">
                                            <div className="grid grid-cols-4 gap-8">
                                                <div className="col-span-2">
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="group/item relative">
                                                            <img src="https://www.letsbeco.com/cdn/shop/articles/front-view-natural.jpg?v=1700549076" alt="Popular eco-friendly products" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/best_sellers" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">Best Sellers</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                        <div className="group/item relative">
                                                            <img src="https://ih1.redbubble.net/image.1314065696.1310/ssrco,tote,cotton,canvas_creme,flatlay,tall_portrait,750x1000-bg,f8f8f8.1.jpg" alt="Latest eco-friendly arrivals" className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover/item:opacity-75 transition-opacity" />
                                                            <Link to="/new_arrivals" className="mt-4 block font-medium text-gray-900 hover:text-green-600" role="menuitem">New Arrivals</Link>
                                                            <p className="mt-1 text-lime-500 text-sm">Shop now</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 grid grid-cols-2 gap-8">
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Explore More</p>
                                                        <ul className="mt-4 flex flex-col space-y-4">
                                                            <li><Link to="/upcycled_goods" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Upcycled Goods</Link></li>
                                                            <li><Link to="/artisan_stories" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Artisan Stories</Link></li>
                                                            <li><Link to="/zero_waste" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Zero Waste</Link></li>
                                                            <li><Link to="/gifting" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Sustainable Gifting</Link></li>
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900 mb-4">Customer Support</p>
                                                        <ul className="mt-4 flex flex-col space-y-5">
                                                            <li><Link to="/contact" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Contact Us</Link></li>
                                                            <li><Link to="/about" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">About EcoBizHub</Link></li>
                                                            <li><Link to="/faqs" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">FAQs</Link></li>
                                                            <li><Link to="/sustainability-report" className="text-sm text-gray-500 hover:text-green-600 transition-colors" role="menuitem">Sustainability Report</Link></li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Section: Desktop Search and Icons */}
                                <div className="flex items-center lg:ml-auto lg:gap-x-4 xl:gap-x-6">
                                    {/* Desktop Search Input */}
                                    <div className="relative hidden lg:block search-container flex-grow max-w-[280px] xl:max-w-[320px]">
                                        <form onSubmit={handleSearchSubmit} className="relative">
                                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-200" />
                                            <input
                                                type="text"
                                                placeholder="Search for eco-products..."
                                                value={searchQuery}
                                                onChange={handleSearchChange}
                                                onFocus={() => (searchQuery || searchResults.length > 0 || searchSuggestions.length > 0) && setShowSuggestions(true)}
                                                className="w-full pl-10 pr-8 py-2 border border-green-400/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent bg-green-700/20 text-white placeholder-green-200/80"
                                            />
                                            {isSearching && (
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300 animate-spin">
                                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004 16.5V12a8 8 0 1115.356-2H20a2 2 0 012 2v4a2 2 0 01-2 2h-4v-5"></path>
                                                    </svg>
                                                </div>
                                            )}
                                            {searchQuery && !isSearching && (
                                                <button
                                                    type="button"
                                                    onClick={clearSearch}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-green-300 hover:text-white"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                        </form>
                                        <SearchSuggestions
                                            suggestions={searchSuggestions}
                                            products={searchResults}
                                            onProductSelect={handleProductSelect}
                                            onCategorySelect={handleCategorySelect}
                                            isVisible={showSuggestions}
                                        />
                                    </div>

                                    {/* Wishlist Icon */}
                                    <Link
                                        to="/wishlist"
                                        className="relative p-2 text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600"
                                    >
                                        <span className="sr-only">View wishlist</span>
                                        <HeartIcon className="h-6 w-6" aria-hidden="true" />
                                        {wishlistCount > 0 && (
                                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-lime-500 rounded-full">
                                                {wishlistCount}
                                            </span>
                                        )}
                                    </Link>

                                    {/* Cart Icon */}
                                    <Link
                                        to="/cart"
                                        className="relative p-2 text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600"
                                    >
                                        <span className="sr-only">View cart</span>
                                        <ShoppingBagIcon className="h-6 w-6" aria-hidden="true" />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-lime-500 rounded-full">
                                                {cartCount}
                                            </span>
                                        )}
                                    </Link>
                                    
                                    {/* User Profile Dropdown */}
                                    <Menu as="div" className="relative">
                                        <MenuButton className="relative p-2 text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-green-600">
                                            <span className="sr-only">Open user menu</span>
                                            <UserIcon className="h-6 w-6" />
                                        </MenuButton>
                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <MenuItems className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                {user ? (
                                                    <>
                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <Link
                                                                    to="/orders"
                                                                    className={classNames(active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700')}
                                                                >
                                                                    <ClipboardDocumentListIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                                    <span>My Orders</span>
                                                                </Link>
                                                            )}
                                                        </MenuItem>
                                                        {userRole === 'admin' && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <Link
                                                                        to="/admin-dashboard"
                                                                        className={classNames(active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700')}
                                                                    >
                                                                        <CogIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                                        <span>Admin Dashboard</span>
                                                                    </Link>
                                                                )}
                                                            </MenuItem>
                                                        )}
                                                        {userRole === 'seller' && (
                                                            <MenuItem>
                                                                {({ active }) => (
                                                                    <Link
                                                                        to="/seller-dashboard"
                                                                        className={classNames(active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700')}
                                                                    >
                                                                        <Store className="mr-3 h-5 w-5 text-gray-400" />
                                                                        <span>Seller Dashboard</span>
                                                                    </Link>
                                                                )}
                                                            </MenuItem>
                                                        )}
                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowLogoutConfirm(true)}
                                                                    className={classNames(active ? 'bg-gray-100' : '', 'flex w-full items-center px-4 py-2 text-left text-sm text-gray-700')}
                                                                >
                                                                    <ArrowRightStartOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                                    <span>Logout</span>
                                                                </button>
                                                            )}
                                                        </MenuItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <Link
                                                                    to="/login"
                                                                    className={classNames(active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700')}
                                                                >
                                                                    <ArrowLeftEndOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                                    <span>Sign In</span>
                                                                </Link>
                                                            )}
                                                        </MenuItem>
                                                        <MenuItem>
                                                            {({ active }) => (
                                                                <Link
                                                                    to="/register"
                                                                    className={classNames(active ? 'bg-gray-100' : '', 'flex items-center px-4 py-2 text-sm text-gray-700')}
                                                                >
                                                                    <UserPlusIcon className="mr-3 h-5 w-5 text-gray-400" />
                                                                    <span>Create Account</span>
                                                                </Link>
                                                            )}
                                                        </MenuItem>
                                                    </>
                                                )}
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Mobile Search Icon */}
                <div className="lg:hidden fixed bottom-4 right-4 z-50">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="relative p-3 bg-gradient-to-r from-green-500 to-lime-500 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200"
                    >
                        <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
            </header>

            {/* Logout Confirmation Modal */}
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleConfirmLogout}
                title="Confirm Logout"
                message="Are you sure you want to log out?"
                confirmText="Logout"
                cancelText="Cancel"
            />
        </div>
    );
};

export default EcoBizHubNavbar;