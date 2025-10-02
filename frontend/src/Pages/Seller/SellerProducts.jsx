import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { auth } from "../../firebaseConfig";
import {
    Search, X, MoreHorizontal, Edit2, Trash2, Box, Loader, PlusSquare, ArrowLeft,
    Tag, DollarSign, Image, List, Grid, Leaf, AlertTriangle, Package as PackageIcon, TreePine
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
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium shadow-md">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

const SellerProducts = ({ isLoggedIn, userRole }) => {
    const navigate = useNavigate();
    const db = getFirestore();
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

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => { setMessage({ show: false, type: "", text: "" }); }, 5000);
    };

    const fetchProducts = useCallback(async (userId, queryToUse, sortOption) => {
        setLoading(true);
        setError(null);
        
        try {
            const productsCollectionRef = collection(db, "products");
            const q = query(productsCollectionRef, where("sellerId", "==", userId));
            const querySnapshot = await getDocs(q);

            let productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (queryToUse) {
                productsList = productsList.filter(p => p.name.toLowerCase().includes(queryToUse.toLowerCase()));
            }

            if (sortOption) {
                productsList.sort((a, b) => {
                    const [field, direction] = sortOption.split('_');
                    const aValue = a[field];
                    const bValue = b[field];

                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        return direction === 'asc' ? aValue - bValue : bValue - aValue;
                    }
                    return direction === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
                });
            }

            setProducts(productsList);
        } catch (err) {
            console.error("Error fetching products:", err);
            setError(`Failed to fetch products: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        const user = auth.currentUser;
        if (user && (userRole === 'seller' || userRole === 'admin')) {
             fetchProducts(user.uid, currentSearchQuery, sortBy);
        } else {
            setLoading(false);
            setError("Access Denied: You are not authorized to view this page.");
            if (isLoggedIn) navigate("/seller-dashboard");
            else navigate("/login");
        }
    }, [isLoggedIn, userRole, currentSearchQuery, fetchProducts, sortBy, navigate]);

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
            await deleteDoc(doc(db, "products", productToDelete));
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
        const productToEdit = products.find(p => p.id === productId);
        if (productToEdit) {
            navigate(`/admin/products/edit/${productToEdit.category}/${productId}`);
        } else {
            showMessage("error", "Product not found for editing.");
        }
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
                        <Link to="/seller-dashboard" className="text-white hover:text-gray-100 flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <PackageIcon className="w-8 h-8" />
                            <h1 className="text-4xl md:text-5xl font-bold">My Products</h1>
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            Manage your listings, add new products, and update your inventory.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Product List</h2>
                        <div className="flex flex-wrap items-center gap-4">
                            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                                <Search className="absolute left-3 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search your products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                                />
                                {searchTerm && (
                                    <X className="absolute right-10 text-gray-400 cursor-pointer hover:text-gray-600" size={18} onClick={handleClearSearch} />
                                )}
                            </form>
                            <Link to="/seller/products/add" className="px-4 py-2 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-200 flex items-center gap-2">
                                <PlusSquare className="w-5 h-5" /> Add New
                            </Link>
                        </div>
                    </div>

                    {products.length === 0 && !loading && currentSearchQuery && (
                        <p className="text-center py-8 text-gray-600">No products found matching "{currentSearchQuery}".</p>
                    )}
                    {products.length === 0 && !loading && !currentSearchQuery && (
                        <p className="text-center py-8 text-gray-600">You have no products listed yet. Start by adding a new one!</p>
                    )}

                    {products.length > 0 && (
                        <div className="overflow-x-auto mt-6">
                            <table className="min-w-full leading-normal product-table">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg">Image</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSortClick('id')}>ID</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center cursor-pointer hover:bg-gray-200" onClick={() => handleSortClick('name')}>Name</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSortClick('price')}>Price</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center">Category</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200" onClick={() => handleSortClick('stock')}>Stock</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map((product) => {
                                        const displayId = product.id || 'N/A';
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
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600 focus:outline-none"
                                                                        role="menuitem"
                                                                    >
                                                                        <Edit2 size={16} className="mr-2" /> Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteClick(displayId)}
                                                                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-900 focus:outline-none"
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

export default SellerProducts;