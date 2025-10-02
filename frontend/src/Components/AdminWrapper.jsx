// src/Components/AdminWrapper.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Loader, AlertCircle } from 'lucide-react';

const AdminWrapper = ({ isLoggedIn, userRole }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (isLoggedIn === false) {
            // User is not logged in, redirect to login page
            setLoading(false);
            alert("Please log in to view this page.");
            navigate('/login');
            return;
        }

        if (userRole === 'admin') {
            // User is an admin, grant access
            setIsAuthorized(true);
            setLoading(false);
        } else if (isLoggedIn && userRole && userRole !== 'admin') {
            // User is logged in but not an admin, deny access
            setLoading(false);
            alert("Access Denied. You do not have administrator privileges.");
            navigate('/');
        } else if (isLoggedIn && !userRole) {
            // Still loading the user role, wait for it
            setLoading(true);
        }
    }, [isLoggedIn, userRole, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader className="w-16 h-16 text-green-600 animate-spin" />
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h2>
                    <p className="text-gray-600 mb-6">You do not have the required permissions to view this page.</p>
                </div>
            </div>
        );
    }

    return <Outlet />;
};

export default AdminWrapper;