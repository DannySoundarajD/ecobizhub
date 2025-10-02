import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { auth } from "../../firebaseConfig";
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { MoreHorizontal, Eye, Edit2, Trash2, Users, Loader, X, ArrowLeft, Mail, Phone, MapPin, Calendar, CheckCircle, Save, AlertTriangle, Leaf, TreePine } from 'lucide-react';
import { useNavigate, Link } from "react-router-dom";

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


const AdminCustomers = () => {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [viewingCustomer, setViewingCustomer] = useState(null);
    const [openDropdownId, setOpenDropdownId] = useState(null);

    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);


    const dropdownRefs = useRef({});

    const db = getFirestore();

    const overviewData = useMemo(() => {
        const totalCustomers = customers.length;
        const adminUsers = customers.filter(c => c.type === 'admin').length;
        const sellerUsers = customers.filter(c => c.type === 'seller').length;
        const regularUsers = customers.filter(c => c.type === 'user' || c.type === 'customer' || !c.type).length;
        return {
            totalCustomers,
            adminUsers,
            sellerUsers,
            regularUsers,
        };
    }, [customers]);

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    useEffect(() => {
        const fetchCustomers = async () => {
            setLoading(true);
            setError(null);
            const user = auth.currentUser;

            if (!user) {
                showMessage("error", "You must be logged in to view customer data.");
                navigate("/login");
                setLoading(false);
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists() || userDocSnap.data().type !== "admin") {
                    showMessage("error", "Access Denied: You are not authorized to view this page.");
                    navigate("/admin-dashboard");
                    setLoading(false);
                    return;
                }

                const usersCollectionRef = collection(db, "users");
                const querySnapshot = await getDocs(usersCollectionRef);

                const customerList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setCustomers(customerList);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching customers:", err);
                setError("Failed to load customer data. Please check Firestore rules and connection.");
                setLoading(false);
            }
        };

        fetchCustomers();
    }, [db, navigate]);

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

    useEffect(() => {
        if (viewingCustomer || editingCustomer || isConfirmModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [viewingCustomer, editingCustomer, isConfirmModalOpen]);

    const toggleDropdown = (customerId) => {
        setOpenDropdownId(openDropdownId === customerId ? null : customerId);
    };

    const handleViewCustomer = (customer) => {
        setViewingCustomer(customer);
        setOpenDropdownId(null);
    };

    const handleEditCustomer = (customer) => {
        setEditingCustomer({ ...customer });
        setOpenDropdownId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingCustomer) return;

        const user = auth.currentUser;
        if (!user) {
            showMessage("error", "You must be logged in to edit customers.");
            return;
        }

        setLoading(true);
        try {
            const customerRef = doc(db, "users", editingCustomer.id);
            await updateDoc(customerRef, {
                fname: editingCustomer.fname,
                lname: editingCustomer.lname,
                email: editingCustomer.email,
                type: editingCustomer.type,
                phone: editingCustomer.phone || null,
                address: editingCustomer.address || null,
                city: editingCustomer.city || null,
                state: editingCustomer.state || null,
                pincode: editingCustomer.pincode || null,
            });

            setCustomers(customers.map(cust =>
                cust.id === editingCustomer.id ? editingCustomer : cust
            ));

            setEditingCustomer(null);
            showMessage("success", "Customer updated successfully!");
        } catch (err) {
            console.error("Error updating customer:", err);
            showMessage("error", "Failed to update customer. Check Firestore permissions.");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (customerId) => {
        setCustomerToDelete(customerId);
        setIsConfirmModalOpen(true);
        setOpenDropdownId(null);
    };

    const confirmDelete = async () => {
        if (!customerToDelete) return;

        const user = auth.currentUser;
        if (!user) {
            showMessage("error", "You must be logged in to delete customers.");
            return;
        }

        setLoading(true);
        try {
            await deleteDoc(doc(db, "users", customerToDelete));
            setCustomers(customers.filter(cust => cust.id !== customerToDelete));
            showMessage("success", "Customer deleted successfully!");
        } catch (err) {
            console.error("Error deleting customer:", err);
            showMessage("error", "Failed to delete customer. Check Firestore permissions.");
        } finally {
            setLoading(false);
            setIsConfirmModalOpen(false);
            setCustomerToDelete(null);
        }
    };


    const getDisplayUserType = (type) => {
        if (!type) return 'N/A';

        switch (type.toLowerCase()) {
            case 'admin':
                return 'Admin';
            case 'customer':
                return 'Customer';
            case 'user':
                return 'User';
            case 'seller':
                return 'seller';
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    };

    if (loading && customers.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-green-600 border-t-transparent"></div>
                    <p className="mt-4 text-gray-600 font-medium">Loading customer data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Customers</h2>
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
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this customer? This action is permanent and cannot be undone."
            />

            {message.show && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] p-4 rounded-lg shadow-lg flex items-center space-x-3
                                ${message.type === "error" ? "bg-red-500 text-white" : message.type === "success" ? "bg-green-500 text-white" : "bg-blue-500 text-white"}`}>
                    <span className="text-xl">
                        {message.type === "error" ? "⚠️" : "✅"}
                    </span>
                    <div>
                        <strong className="font-bold">{message.type.toUpperCase()}:</strong>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}

            {/* Header Section for Customers */}
            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-b-2xl shadow-xl p-6 sticky top-0 z-20">
                <div className="container mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-4">
                        <Link to="/admin-dashboard" className="text-white hover:text-gray-100 flex items-center gap-2">
                            <ArrowLeft className="w-5 h-5" /> Back to Dashboard
                        </Link>
                    </div>
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Users className="w-9 h-9" />
                            <h1 className="text-4xl md:text-5xl font-bold">Customer Management</h1>
                        </div>
                        <p className="text-xl text-green-100 max-w-2xl mx-auto">
                            View and manage all customer accounts, ensuring smooth operations.
                        </p>
                    </div>
                </div>
            </div>

            {/* Overview Section */}
            <div className="container mx-auto px-4 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-green-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Total Customers</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.totalCustomers}</p>
                        </div>
                        <Users className="w-10 h-10 text-green-500 opacity-70" />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-lime-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Admin Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.adminUsers}</p>
                        </div>
                        <TreePine className="w-10 h-10 text-lime-500 opacity-70" />
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 flex items-center justify-between border border-cyan-100">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Regular Users</p>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{overviewData.regularUsers}</p>
                        </div>
                        <Leaf className="w-10 h-10 text-cyan-500 opacity-70" />
                    </div>
                </div>
            </div>

            {/* Main Content Layout (Customer List) */}
            <div className="container mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Customer Accounts</h2>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        {customers.length === 0 && !loading ? (
                            <div className="text-center py-12 text-gray-600">
                                <p className="mb-4 text-lg">No customers found.</p>
                                <Users size={48} className="mx-auto text-gray-400" />
                            </div>
                        ) : (
                            <table className="min-w-full leading-normal customer-table">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tl-lg text-center" id="nameid">Name</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center" id="emailid">Email</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider text-center" id="typeid">Type</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider rounded-tr-lg text-center" id="acctionsid">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(customer => (
                                        <tr key={customer.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className=" border-b border-gray-200 bg-white text-sm text-center">
                                                <p className="text-gray-900 whitespace-no-wrap font-medium">{customer.fname || 'N/A'} {customer.lname || ''}</p>
                                            </td>
                                            <td className="border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 break-words">{customer.email || 'N/A'}</p>
                                            </td>
                                            <td className=" border-b border-gray-200 bg-white text-sm">
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.type === 'admin' ? 'bg-green-100 text-green-800' :
                                                    customer.type === 'seller' ? 'bg-lime-100 text-lime-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {getDisplayUserType(customer.type)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-center">
                                                <div className="relative inline-block text-left" ref={el => dropdownRefs.current[customer.id] = el}>
                                                    <button
                                                        onClick={() => toggleDropdown(customer.id)}
                                                        className="inline-flex justify-center items-center p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                        aria-expanded={openDropdownId === customer.id}
                                                        aria-haspopup="true"
                                                    >
                                                        <MoreHorizontal size={20} />
                                                    </button>
                                                    {openDropdownId === customer.id && (
                                                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                                                <button
                                                                    onClick={() => handleViewCustomer(customer)}
                                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                    role="menuitem"
                                                                >
                                                                    <Eye size={16} className="mr-2" /> View
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditCustomer(customer)}
                                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-green-600"
                                                                    role="menuitem"
                                                                >
                                                                    <Edit2 size={16} className="mr-2" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteClick(customer.id)}
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
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* View Customer Modal */}
            {viewingCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-2xl shadow-2xl
                                 bg-gradient-to-br from-lime-50 to-green-50 text-gray-800 transform scale-95 animate-scale-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center bg-gradient-to-r from-green-100 to-lime-100 p-6 border-b border-gray-200">
                            <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <Eye size={24} className="text-green-600" /> Customer Details
                            </h3>
                            <button className="text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-full hover:bg-gray-100" onClick={() => setViewingCustomer(null)}>
                                <X size={24} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

                            {/* Personal Information */}
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-green-200">
                                <h4 className="font-bold text-lg text-green-700 mb-3 flex items-center gap-2">
                                    <Users size={18} className="text-green-500" /> Personal Information
                                </h4>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                    <p className="font-medium text-gray-700 text-left">Name:</p>
                                    <span className="text-left break-words">{viewingCustomer.fname || 'N/A'} {viewingCustomer.lname || ''}</span>
                                    <p className="font-medium text-gray-700 text-left">Email:</p>
                                    <span className="text-left break-all">{viewingCustomer.email || 'N/A'}</span>
                                    <p className="font-medium text-gray-700 text-left">User ID:</p>
                                    <span className="font-mono text-xs break-all text-left">{viewingCustomer.id}</span>
                                </div>
                            </div>

                            {/* Account Details */}
                            <div className="bg-white rounded-lg shadow-sm p-4 border border-lime-200">
                                <h4 className="font-bold text-lg text-lime-700 mb-3 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-lime-500" /> Account Details
                                </h4>
                                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                    <p className="font-medium text-gray-700 text-left">Type:</p>
                                    <span className={`px-2 py-0.5 inline-flex justify-center items-center text-xs leading-5 font-semibold rounded-full w-fit ${viewingCustomer.type === 'admin' ? 'bg-green-100 text-green-800' :
                                        viewingCustomer.type === 'seller' ? 'bg-lime-100 text-lime-800' :
                                            'bg-gray-100 text-gray-800'
                                        } text-left`}>
                                        {getDisplayUserType(viewingCustomer.type)}
                                    </span>
                                    {viewingCustomer.creationTime && (
                                        <>
                                            <p className="font-medium text-gray-700 text-left">Created:</p>
                                            <span className="text-left break-words">{new Date(viewingCustomer.creationTime).toLocaleDateString('en-IN', { dateStyle: 'short' })}</span>
                                        </>
                                    )}
                                    {viewingCustomer.lastSignInTime && (
                                        <>
                                            <p className="font-medium text-gray-700 text-left">Last Login:</p>
                                            <span className="text-left break-words">{new Date(viewingCustomer.lastSignInTime).toLocaleDateString('en-IN', { dateStyle: 'short' })}</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Contact Information */}
                            {(viewingCustomer.phone || viewingCustomer.address || viewingCustomer.city || viewingCustomer.state || viewingCustomer.pincode) && (
                                <div className="bg-white rounded-lg shadow-sm p-4 border border-cyan-200 md:col-span-2">
                                    <h4 className="font-bold text-lg text-cyan-700 mb-3 flex items-center gap-2">
                                        <Phone size={18} className="text-cyan-500" /> Contact Information
                                    </h4>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm items-baseline">
                                        {viewingCustomer.phone && (
                                            <>
                                                <p className="font-medium text-gray-700 text-left">Phone:</p>
                                                <span className="text-left break-words">{viewingCustomer.phone}</span>
                                            </>
                                        )}
                                        {viewingCustomer.address && (
                                            <>
                                                <p className="font-medium text-gray-700 text-left">Address:</p>
                                                <span className="text-left break-words">{viewingCustomer.address}</span>
                                            </>
                                        )}
                                        {viewingCustomer.city && (
                                            <>
                                                <p className="font-medium text-gray-700 text-left">City:</p>
                                                <span className="text-left break-words">{viewingCustomer.city}</span>
                                            </>
                                        )}
                                        {viewingCustomer.state && (
                                            <>
                                                <p className="font-medium text-gray-700 text-left">State:</p>
                                                <span className="text-left break-words">{viewingCustomer.state}</span>
                                            </>
                                        )}
                                        {viewingCustomer.pincode && (
                                            <>
                                                <p className="font-medium text-gray-700 text-left">Pincode:</p>
                                                <span className="text-left break-words">{viewingCustomer.pincode}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-r from-green-100 to-lime-100 p-6 border-t border-gray-200 flex justify-end">
                            <button onClick={() => setViewingCustomer(null)} className="px-8 py-3 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Customer Modal */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform scale-95 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center border-b pb-4 mb-6">
                            <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                <Edit2 size={24} className="text-green-600" /> Edit Customer
                            </h3>
                            <button className="text-gray-500 hover:text-gray-800 p-2 rounded-full hover:bg-gray-100" onClick={() => setEditingCustomer(null)}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="form-group">
                                <label htmlFor="edit-fname" className="block text-gray-700 text-sm font-bold mb-2">First Name:</label>
                                <input
                                    type="text"
                                    id="edit-fname"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    value={editingCustomer.fname || ''}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, fname: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-lname" className="block text-gray-700 text-sm font-bold mb-2">Last Name:</label>
                                <input
                                    type="text"
                                    id="edit-lname"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    value={editingCustomer.lname || ''}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, lname: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-email" className="block text-gray-700 text-sm font-bold mb-2">Email:</label>
                                <input
                                    type="email"
                                    id="edit-email"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    value={editingCustomer.email || ''}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-type" className="block text-gray-700 text-sm font-bold mb-2">User Type:</label>
                                <select
                                    id="edit-type"
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    value={editingCustomer.type || ''}
                                    onChange={(e) => setEditingCustomer({ ...editingCustomer, type: e.target.value })}
                                >
                                    <option value="">Select Type</option>
                                    <option value="admin">Admin</option>
                                    <option value="user">User</option>
                                    <option value="seller">seller</option>
                                </select>
                            </div>
                            {editingCustomer.phone !== undefined && (
                                <div className="form-group">
                                    <label htmlFor="edit-phone" className="block text-gray-700 text-sm font-bold mb-2">Phone:</label>
                                    <input
                                        type="tel"
                                        id="edit-phone"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                        value={editingCustomer.phone || ''}
                                        onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                                    />
                                </div>
                            )}
                            {editingCustomer.address !== undefined && (
                                <div className="form-group">
                                    <label htmlFor="edit-address" className="block text-gray-700 text-sm font-bold mb-2">Address:</label>
                                    <textarea
                                        id="edit-address"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                        value={editingCustomer.address || ''}
                                        onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                                        rows="2"
                                    ></textarea>
                                </div>
                            )}
                            {editingCustomer.city !== undefined && (
                                <div className="form-group">
                                    <label htmlFor="edit-city" className="block text-gray-700 text-sm font-bold mb-2">City:</label>
                                    <input
                                        type="text"
                                        id="edit-city"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                        value={editingCustomer.city || ''}
                                        onChange={(e) => setEditingCustomer({ ...editingCustomer, city: e.target.value })}
                                    />
                                </div>
                            )}
                            {editingCustomer.state !== undefined && (
                                <div className="form-group">
                                    <label htmlFor="edit-state" className="block text-gray-700 text-sm font-bold mb-2">State:</label>
                                    <input
                                        type="text"
                                        id="edit-state"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                        value={editingCustomer.state || ''}
                                        onChange={(e) => setEditingCustomer({ ...editingCustomer, state: e.target.value })}
                                    />
                                </div>
                            )}
                            {editingCustomer.pincode !== undefined && (
                                <div className="form-group">
                                    <label htmlFor="edit-pincode" className="block text-gray-700 text-sm font-bold mb-2">Pincode:</label>
                                    <input
                                        type="text"
                                        id="edit-pincode"
                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                        value={editingCustomer.pincode || ''}
                                        onChange={(e) => setEditingCustomer({ ...editingCustomer, pincode: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                            <button
                                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                                onClick={() => setEditingCustomer(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-6 py-2 bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-lg hover:from-green-700 hover:to-lime-700 transition-all duration-200 shadow-md"
                                onClick={handleSaveEdit}
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

export default AdminCustomers;