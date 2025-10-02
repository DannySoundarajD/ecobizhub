// src/routes/AllRoutes.jsx
import React from "react";
import { Route, Routes } from "react-router-dom";

// --- EcoBizHub Components ---
import EcoBizHubHomePage from "../Pages/HomePage";
import AuthPage from "../Pages/Login";
import SingleProduct from "../Pages/SingleProduct";
import CartPage from "../Pages/CartPage";
import Payment from "../Pages/Payment";
import Orders from "../Pages/Orders";
import WishlistPage from "../Pages/Wishlist";
import NotFound from "../Pages/NotFound";

// --- Eco-Friendly Category Pages ---
import Handicrafts from "../Pages/Handicrafts";
import OrganicFoods from "../Pages/OrganicFoods";
import NaturalFabrics from "../Pages/NaturalFabrics";
import HerbalProducts from "../Pages/HerbalProducts";
import UpcycledGoods from "../Pages/UpcycledGoods";
import BestSellers from "../Pages/BestSellers";
import NewArrivals from "../Pages/NewArrivals";

// --- Admin Components ---
import AdminDashboard from "../Pages/AdminDashboard";
import AdminProducts from "../Pages/Admin/AdminProducts";
import AddEditProduct from "../Pages/Admin/AddEditProduct";
import AdminOrders from "../Pages/Admin/AdminOrders";
import AdminCustomers from "../Pages/Admin/AdminCustomers";

// --- NEW Seller Components ---
import SellerDashboard from "../Pages/Seller/SellerDashboard";
import SellerProducts from "../Pages/Seller/SellerProducts";
import SellerOrders from "../Pages/Seller/SellerOrders";
import SellerProfile from "../Pages/Seller/SellerProfile";
import SellerEditProducts from "../Pages/Seller/SellerEditProducts";

// --- New Wrapper Components for Protected Routes ---
import AdminWrapper from "../Components/AdminWrapper";
import SellerWrapper from "../Components/SellerWrapper";

const AllRoutes = ({ isLoggedIn, userRole }) => {
    return (
        <div>
            <Routes>
                {/* Public Routes */}
                <Route path={"/"} element={<EcoBizHubHomePage isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/login"} element={<AuthPage />} />
                <Route path={"/register"} element={<AuthPage />} />
                <Route path="/:category/:id" element={<SingleProduct isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/handicrafts"} element={<Handicrafts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/organic_foods"} element={<OrganicFoods isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/natural_fabrics"} element={<NaturalFabrics isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/herbal_products"} element={<HerbalProducts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/upcycled_goods"} element={<UpcycledGoods isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/best_sellers"} element={<BestSellers isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/new_arrivals"} element={<NewArrivals isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/cart"} element={<CartPage isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/orders"} element={<Orders isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/payment"} element={<Payment isLoggedIn={isLoggedIn} userRole={userRole} />} />
                <Route path={"/wishlist"} element={<WishlistPage isLoggedIn={isLoggedIn} userRole={userRole} />} />

                {/* Protected Admin Routes (Requires Admin role) */}
                <Route element={<AdminWrapper isLoggedIn={isLoggedIn} userRole={userRole} />}>
                    <Route path={"/admin-dashboard"} element={<AdminDashboard isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/admin/products/:category" element={<AdminProducts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/admin/products/add" element={<AddEditProduct isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/admin/products/edit/:category/:id" element={<AddEditProduct isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/admin/orders" element={<AdminOrders isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/admin/customers" element={<AdminCustomers isLoggedIn={isLoggedIn} userRole={userRole} />} />
                </Route>

                {/* Protected Seller Routes (Requires Seller or Admin role) */}
                <Route element={<SellerWrapper isLoggedIn={isLoggedIn} userRole={userRole} />}>
                    <Route path={"/seller-dashboard"} element={<SellerDashboard isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/seller/products" element={<SellerProducts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/seller/products/add" element={<SellerEditProducts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/seller/products/edit/:category/:id" element={<SellerEditProducts isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/seller/orders" element={<SellerOrders isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/seller/profile" element={<SellerProfile isLoggedIn={isLoggedIn} userRole={userRole} />} />
                </Route>

                {/* Fallback Route for Not Found Pages */}
                <Route path={"*"} element={<NotFound />} />
            </Routes>
        </div>
    );
};

export default AllRoutes;