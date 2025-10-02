import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, db } from "../../firebaseConfig";
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, getDoc, orderBy } from "firebase/firestore";
import {
    Search, X, MoreHorizontal, Edit2, Trash2, Box, Loader, PlusSquare, ArrowLeft,
    Tag, DollarSign, Image, List, Grid, TreePine, Leaf, AlertTriangle, Package as PackageIcon
} from 'lucide-react';
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


const AdminProducts = () => {
    const { category } = useParams();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [searchTerm, setSearchTerm] = useState('');
    const [currentSearchQuery, setCurrentSearchQuery] = useState('');
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const [sortBy, setSortBy] = useState('name_asc');

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const dropdownRefs = useRef({});
    
    // Updated to use the correct collection names from your Firebase structure
    const categories = [
        { path: 'handicrafts', display: 'Handicrafts' },
        { path: 'organic_foods', display: 'Organic Foods' },
        { path: 'natural_fabrics', display: 'Natural Fabrics' },
        { path: 'herbal_products', display: 'Herbal Products' },
        { path: 'upcycled_goods', display: 'Upcycled Goods' },
        { path: 'best_sellers', display: 'Best Sellers' },
        { path: 'new_arrivals', display: 'New Arrivals' },
    ];

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    const fetchProducts = useCallback(async (queryToUse, sortOption) => {
        setLoading(true);
        setError(null);
        
        try {
            const user = auth.currentUser;
            if (!user) {
                showMessage("error", "You must be logged in to view product data.");
                navigate("/login");
                return;
            }
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists() || userDoc.data().type !== "admin") {
                showMessage("error", "Access Denied: You are not authorized to view this page.");
                navigate("/admin-dashboard");
                return;
            }
            
            let productsQuery;

            if (category === 'best_sellers') {
                const productsCollectionRef = collection(db, "products");
                productsQuery = query(productsCollectionRef, where('is_bestseller', '==', true));
            } else if (category === 'new_arrivals') {
                const productsCollectionRef = collection(db, "products");
                productsQuery = query(productsCollectionRef, orderBy('added_date', 'desc'));
            } else {
                 const productsCollectionRef = collection(db, category);
                 productsQuery = query(productsCollectionRef);
            }

            const querySnapshot = await getDocs(productsQuery);
            
            let productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (queryToUse) {
                productsList = productsList.filter(p => p.name.toLowerCase().includes(queryToUse.toLowerCase()));
            }

            if (sortOption) {
                productsList.sort((a, b) => {
                    const [field, direction] = sortOption.split('_');
                    let aValue = a[field];
                    let bValue = b[field];

                    if (field === 'price' || field === 'stock') {
                        aValue = parseFloat(aValue) || 0;
                        bValue = parseFloat(bValue) || 0;
                    } else {
                        aValue = String(aValue || '').toLowerCase();
                        bValue = String(bValue || '').toLowerCase();
                    }

                    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            setProducts(productsList);
        } catch (err) {
            console.error("Error fetching products:", err);
            setError(`Failed to fetch products: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [category, navigate, db]);

    useEffect(() => {
        setCurrentSearchQuery('');
        setSearchTerm('');
        fetchProducts('', sortBy);
    }, [category, fetchProducts, sortBy]);

    useEffect(() => {
        const timerId = setTimeout(() => {
            if (searchTerm !== currentSearchQuery) {
                setCurrentSearchQuery(searchTerm);
            }
        }, 300);
        return () => clearTimeout(timerId);
    }, [searchTerm, currentSearchQuery]);

    useEffect(() => {
        fetchProducts(currentSearchQuery, sortBy);
    }, [currentSearchQuery, fetchProducts, sortBy]);

    const handleSearchSubmit = useCallback((e) => {
        e.preventDefault();
        setCurrentSearchQuery(searchTerm);
    }, [searchTerm]);

    const handleClearSearch = useCallback(() => {
        setSearchTerm('');
        setCurrentSearchQuery('');
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openDropdownId && dropdownRefs.current[openDropdownId] && !dropdownRefs.current[openDropdownId].contains(event.target)) {
                setOpenDropdownId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openDropdownId]);

    const toggleDropdown = (productId) => {
        setOpenDropdownId(openDropdownId === productId ? null : productId);
    };

    const handleDeleteClick = (productId) => {
        setProductToDelete(productId);
        setIsConfirmModalOpen(true);
        setOpenDropdownId(null);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        const user = auth.currentUser;
        if (!user) {
            showMessage("error", "You must be logged in.");
            navigate("/login");
            return;
        }

        try {
            await deleteDoc(doc(db, category, productToDelete));
            setProducts(products.filter(p => p.id !== productToDelete));
            showMessage("success", "Product deleted successfully!");
        } catch (err) {
            console.error("Error deleting product:", err);
            showMessage("error", `Failed to delete product: ${err.message}`);
        } finally {
            setIsConfirmModalOpen(false);
            setProductToDelete(null);
        }
    };

    const handleEdit = (productId) => {
        navigate(`/admin/products/edit/${category}/${productId}`);
        setOpenDropdownId(null);
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
            return `${field}_asc`;
        });
    };

    const handleCategoryChange = (e) => {
        const newCategoryPath = e.target.value;
        if (newCategoryPath) {
            navigate(`/admin/products/${newCategoryPath}`);
        }
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50">
            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this product? This action is permanent and cannot be undone."
            />
            {message.show && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3
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

            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-b-2xl shadow-xl p-6">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-4">
                        <Link to="/admin-dashboard" className="text-white hover:text-gray-100 flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <TreePine className="w-8 h-8" />
                            <h1 className="text-4xl md:text-5xl font-bold">{categories.find(cat => cat.path === category)?.display || 'Product'} Collection</h1>
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            Manage your eco-friendly items: edit details, add new products, and keep your inventory up-to-date.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Product List</h2>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <label htmlFor="category-select" className="text-gray-700 text-sm font-medium">View Category:</label>
                                <select
                                    id="category-select"
                                    value={category}
                                    onChange={handleCategoryChange}
                                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.path} value={cat.path}>
                                            {cat.display}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                                <Search className="absolute left-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                                {searchTerm && (
                                    <X className="absolute right-10 text-gray-400 cursor-pointer hover:text-gray-600" size={18} onClick={handleClearSearch} />
                                )}
                                <button type="submit" className="ml-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors hidden sm:block">Search</button>
                                <button type="submit" className="ml-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors sm:hidden">
                                    <Search size={18} />
                                </button>
                            </form>
                            <Link to={`/admin/products/add`} className="px-4 py-2 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-200 flex items-center gap-2">
                                <PlusSquare size={16} /> Add New
                            </Link>
                        </div>
                    </div>

                    {products.length === 0 && !loading && currentSearchQuery && (
                        <p className="text-center py-8 text-gray-600">No products found matching "{currentSearchQuery}" in this category.</p>
                    )}
                    {products.length === 0 && !loading && !currentSearchQuery && (
                        <p className="text-center py-8 text-gray-600">No products found in the selected category.</p>
                    )}

                    {products.length > 0 && (
                        <div className="overflow-x-auto mt-6">
                            <table className="min-w-full leading-normal product-table">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg">Image</th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('id')}
                                        >
                                            ID {getSortIcon('id')}
                                        </th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('name')}
                                        >
                                            Name {getSortIcon('name')}
                                        </th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors "
                                            onClick={() => handleSortClick('price')}
                                        >
                                            Price {getSortIcon('price')}
                                        </th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Category</th>
                                        <th
                                            className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors text-center"
                                            onClick={() => handleSortClick('stock')}
                                        >
                                            Stock {getSortIcon('stock')}
                                        </th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const displayId = product.id || product._id || 'N/A';
                                        const displayName = product.name || 'Untitled Product';
                                        const displayDescription = product.description ? product.description.substring(0, 50) + (product.description.length > 50 ? '...' : '') : 'No description.';
                                        const displayPrice = typeof product.price === 'number' ? product.price.toLocaleString() : parseFloat(product.price)?.toLocaleString() || 'N/A';
                                        const displayCategory = (product.category || 'N/A').replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                                        const displayStock = typeof product.stock === 'number' ? product.stock : (parseInt(product.stock, 10) || 0);
                                        const displayImage = product.image || 'https://via.placeholder.com/64?text=No+Image';

                                        return (
                                            <tr key={displayId} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <img src={displayImage} alt={displayName} className="w-16 h-16 object-contain rounded-md shadow-sm border border-gray-200" onError={(e) => e.target.src = 'https://via.placeholder.com/64?text=No+Image'} />
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap truncate max-w-[100px] font-mono text-xs">{displayId}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap font-medium">{displayName}</p>
                                                    <p className="text-gray-600 text-xs">{displayDescription}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap font-semibold flex items-center">
                                                        <FaRupeeSign className="text-xs" />{displayPrice}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className="text-gray-900 whitespace-no-wrap">{displayCategory}</p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                    <p className={`whitespace-no-wrap font-medium ${displayStock > 10 ? 'text-green-600' : displayStock > 0 ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {displayStock}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                                    <div className="relative inline-block text-left" ref={el => dropdownRefs.current[displayId] = el}>
                                                        <button
                                                            onClick={() => toggleDropdown(displayId)}
                                                            className="inline-flex justify-center items-center p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                            aria-expanded={openDropdownId === displayId}
                                                            aria-haspopup="true"
                                                        >
                                                            <MoreHorizontal size={20} />
                                                        </button>
                                                        {openDropdownId === displayId && (
                                                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                                                    <button
                                                                        onClick={() => handleEdit(displayId)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                        role="menuitem"
                                                                    >
                                                                        <Edit2 size={16} className="mr-2" /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(displayId)}
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminProducts;