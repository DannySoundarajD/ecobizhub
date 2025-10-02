import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Eye, EyeOff, Leaf, TreePine, Recycle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";

import {
    auth,
    db,
} from "../firebaseConfig";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

const initialLoginState = {
    email: "",
    password: "",
    adminCode: "",
};

const initialSignupState = {
    fname: "",
    lname: "",
    email: "",
    password: "",
    type: "user",
    gender: "",
    mobile: "",
    adminCode: "",
    sellerCode: "",
    storeName: "",
    storeDescription: "",
    artisanStory: ""
};

const SELLER_ACCESS_CODE = "SELLER2025";
const ADMIN_ACCESS_CODE = "ADMIN2024";

export default function AuthPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loginData, setLoginData] = useState(initialLoginState);
    const [signupData, setSignupData] = useState(initialSignupState);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [authMethod, setAuthMethod] = useState("email_password");
    const [message, setMessage] = useState({ show: false, type: "", text: "" });

    const googleProvider = useMemo(() => new GoogleAuthProvider(), []);

    const showMessage = useCallback((type, text) => {
        setMessage({ show: true, type, text });
        const timer = setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    const handleLoginChange = useCallback((e) => {
        const { name, value } = e.target;
        setLoginData(prevData => ({ ...prevData, [name]: value }));
    }, []);

    const handleSignupChange = useCallback((e) => {
        const { name, value } = e.target;
        setSignupData(prevData => ({ ...prevData, [name]: value }));
    }, []);

    const handleSignupTypeChange = useCallback((e) => {
        const { value } = e.target;
        setSignupData(prevData => ({ ...prevData, type: value }));
    }, []);


    const isGoogleSignupFieldsFilled = useMemo(() => {
        if (!isLogin && authMethod === "google_auth") {
            return (
                signupData.fname.trim() !== "" &&
                signupData.lname.trim() !== "" &&
                signupData.mobile.trim() !== "" &&
                signupData.gender.trim() !== "" &&
                signupData.type.trim() !== ""
            );
        }
        return true;
    }, [isLogin, authMethod, signupData]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Firebase User is signed in:", user.uid, user.email);
                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    let userRole = 'user';
                    let fname = '';
                    let lname = '';

                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        userRole = userData.type || 'user';
                        fname = userData.fname || '';
                        lname = userData.lname || '';
                    } else {
                        console.log("User document not found in Firestore for UID:", user.uid);
                        await setDoc(userDocRef, {
                            uid: user.uid,
                            email: user.email,
                            type: 'user',
                            createdAt: new Date(),
                            authProvider: user.providerData[0]?.providerId || "unknown",
                            fname: user.displayName?.split(' ')[0] || '',
                            lname: user.displayName?.split(' ').slice(1).join(' ') || '',
                        }, { merge: true });
                        userRole = 'user';
                        fname = user.displayName?.split(' ')[0] || '';
                        lname = user.displayName?.split(' ').slice(1).join(' ') || '';
                    }

                    localStorage.setItem('userRole', userRole);
                    localStorage.setItem('userId', user.uid);
                    localStorage.setItem('userEmail', user.email);
                    localStorage.setItem('isLoggedIn', 'true');
                    if (fname && lname) {
                        localStorage.setItem('userName', `${fname} ${lname}`);
                    } else if (user.displayName) {
                        localStorage.setItem('userName', user.displayName);
                    } else {
                        localStorage.removeItem('userName');
                    }

                    const targetPath = (userRole === 'admin') ? "/admin-dashboard" : (userRole === 'seller' ? "/seller-dashboard" : "/");
                    if (window.location.pathname !== targetPath) {
                        navigate(targetPath);
                    }

                } catch (error) {
                    console.error("Error fetching user role from Firestore during auth state change:", error);
                    showMessage("error", "Failed to retrieve user role. Please try again.");
                    localStorage.removeItem('userRole');
                    localStorage.setItem('isLoggedIn', 'false');
                    if (window.location.pathname !== "/") {
                        navigate("/");
                    }
                }
            } else {
                console.log("Firebase User is signed out.");
                localStorage.removeItem('userRole');
                localStorage.removeItem('userId');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.setItem('isLoggedIn', 'false');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [navigate, db, showMessage]);

    const handleEmailPasswordLogin = async () => {
        if (!loginData.email || !loginData.password) {
            showMessage("error", "Please enter email and password.");
            return;
        }

        setIsLoading(true);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            let userRole = 'user';
            let fname = '';
            let lname = '';

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                userRole = userData.type || 'user';
                fname = userData.fname || '';
                lname = userData.lname || '';
            } else {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    email: user.email,
                    type: 'user',
                    createdAt: new Date(),
                    authProvider: "email_password",
                }, { merge: true });
                userRole = 'user';
                console.warn("User document not found for email login; created a default one.");
            }

            if (authMethod === "admin_access") {
                if (!loginData.adminCode) {
                    showMessage("error", "Please enter admin access code.");
                    await signOut(auth);
                    setIsLoading(false);
                    return;
                }
                if (loginData.adminCode !== ADMIN_ACCESS_CODE) {
                    showMessage("error", "Invalid admin access code.");
                    await signOut(auth);
                    setIsLoading(false);
                    return;
                }
                if (userRole !== 'admin') {
                    showMessage("error", "This account does not have admin privileges.");
                    await signOut(auth);
                    setIsLoading(false);
                    return;
                }
                userRole = 'admin';
            }

            localStorage.setItem('userRole', userRole);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('isLoggedIn', 'true');
            if (fname && lname) {
                localStorage.setItem('userName', `${fname} ${lname}`);
            } else if (user.displayName) {
                localStorage.setItem('userName', user.displayName);
            } else {
                localStorage.removeItem('userName');
            }

            showMessage("success", `Login successful as ${userRole}!`);
            setLoginData(initialLoginState);

        } catch (error) {
            console.error("Firebase Email/Password Login Error:", error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                showMessage("error", "Invalid email or password.");
            } else if (error.code === 'auth/too-many-requests') {
                showMessage("error", "Too many failed login attempts. Try again later.");
            } else if (error.code === 'auth/network-request-failed') {
                showMessage("error", "Network error. Please check your internet connection.");
            }
            else {
                showMessage("error", error.message || "Login failed.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailPasswordSignup = async () => {
        if (!signupData.fname || !signupData.lname || !signupData.email || !signupData.password ||
            signupData.mobile.trim() === '' ||
            signupData.gender.trim() === '' ||
            signupData.type.trim() === ''
        ) {
            showMessage("error", "Please fill in all required fields.");
            return;
        }
        
        if (signupData.type === 'seller' && (!signupData.storeName || !signupData.storeDescription || !signupData.artisanStory)) {
            showMessage("error", "Please fill in all store details for seller signup.");
            return;
        }

        setIsLoading(true);
        try {
            let finalUserType = signupData.type;

            if (authMethod === "admin_signup") {
                if (!signupData.adminCode) {
                    showMessage("error", "Please enter admin access code.");
                    setIsLoading(false);
                    return;
                }
                if (signupData.adminCode !== ADMIN_ACCESS_CODE) {
                    showMessage("error", "Invalid admin access code.");
                    setIsLoading(false);
                    return;
                }
                finalUserType = 'admin';
            } else if (signupData.type === 'seller' && authMethod !== "google_auth") {
                if (!signupData.sellerCode) {
                    showMessage("error", "Please enter seller access code.");
                    setIsLoading(false);
                    return;
                }
                if (signupData.sellerCode !== SELLER_ACCESS_CODE) {
                    showMessage("error", "Invalid seller access code.");
                    setIsLoading(false);
                    return;
                }
                finalUserType = 'seller';
            }


            const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
            const user = userCredential.user;

            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                uid: user.uid,
                fname: signupData.fname,
                lname: signupData.lname,
                email: user.email,
                gender: signupData.gender,
                mobile: signupData.mobile,
                type: finalUserType,
                createdAt: new Date(),
                authProvider: "email_password",
            });
            
            if (finalUserType === 'seller') {
                const sellerDocRef = doc(db, "sellers", user.uid);
                await setDoc(sellerDocRef, {
                    sellerId: user.uid,
                    storeName: signupData.storeName,
                    storeDescription: signupData.storeDescription,
                    artisanStory: signupData.artisanStory,
                    storePhone: signupData.mobile,
                    storeEmail: user.email,
                    createdAt: new Date(),
                });
            }

            await signOut(auth);

            showMessage("success", "Account created successfully! Please login with your new credentials.");
            setSignupData(initialSignupState);

            setTimeout(() => {
                setIsLogin(true);
                setAuthMethod("email_password");
            }, 1000);

        } catch (error) {
            console.error("Firebase Email/Password Signup Error:", error);
            if (error.code === 'auth/email-already-in-use') {
                showMessage("error", "Email already in use. Try logging in or use a different email.");
            } else if (error.code === 'auth/weak-password') {
                showMessage("error", "Password is too weak. Must be at least 6 characters.");
            } else if (error.code === 'auth/invalid-email') {
                showMessage("error", "Invalid email address format.");
            }
            else {
                showMessage("error", error.message || "Registration failed.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        try {
            if (!isLogin && !isGoogleSignupFieldsFilled) {
                showMessage("error", "Please fill all required details for Google signup.");
                setIsLoading(false);
                return;
            }

            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            let userRole = signupData.type || 'user';
            let fname = signupData.fname || user.displayName?.split(' ')[0] || '';
            let lname = signupData.lname || user.displayName?.split(' ').slice(1).join(' ') || '';

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                userRole = userData.type || 'user';
                fname = userData.fname || fname;
                lname = userData.lname || lname;
            } else {
                await setDoc(userDocRef, {
                    uid: user.uid,
                    fname: fname,
                    lname: lname,
                    email: user.email,
                    gender: signupData.gender || "",
                    mobile: signupData.mobile || "",
                    type: signupData.type || "user",
                    createdAt: new Date(),
                    authProvider: "google",
                    photoURL: user.photoURL || "",
                }, { merge: true });

                if (userRole === 'seller' && (signupData.storeName || signupData.storeDescription || signupData.artisanStory)) {
                    const sellerDocRef = doc(db, "sellers", user.uid);
                    await setDoc(sellerDocRef, {
                        sellerId: user.uid,
                        storeName: signupData.storeName,
                        storeDescription: signupData.storeDescription,
                        artisanStory: signupData.artisanStory,
                        storePhone: signupData.mobile,
                        storeEmail: user.email,
                        createdAt: new Date(),
                    });
                }
            }

            if (!isLogin && !userDocSnap.exists()) {
                await signOut(auth);

                showMessage("success", "Google account created successfully! Please login with your Google account.");
                setSignupData(initialSignupState);
                setIsLoading(false);

                setTimeout(() => {
                    setIsLogin(true);
                    setAuthMethod("google_auth");
                }, 1000);
                return;
            }

            localStorage.setItem('userRole', userRole);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('isLoggedIn', 'true');
            if (fname && lname) {
                localStorage.setItem('userName', `${fname} ${lname}`);
            } else if (user.displayName) {
                localStorage.setItem('userName', user.displayName);
            } else {
                localStorage.removeItem('userName');
            }

            showMessage("success", `Google ${isLogin ? "login" : "signup"} successful as ${userRole}!`);
            setLoginData(initialLoginState);
            setSignupData(initialSignupState);

        } catch (error) {
            console.error("Google Auth Error:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                showMessage("error", "Google login canceled.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                showMessage("error", "Multiple login requests. Please try again.");
            } else if (error.code === 'auth/network-request-failed') {
                showMessage("error", "Network error. Please check your internet connection.");
            }
            else {
                showMessage("error", error.message || "Google authentication failed.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (isLoading) return;

        if (isLogin) {
            if (authMethod === "google_auth") {
                handleGoogleAuth();
            } else {
                handleEmailPasswordLogin();
            }
        } else {
            if (authMethod === "google_auth") {
                handleGoogleAuth();
            } else {
                handleEmailPasswordSignup();
            }
        }
    };

    const toggleMode = useCallback(() => {
        setIsLogin(prevIsLogin => !prevIsLogin);
        setAuthMethod("email_password");
        setLoginData(initialLoginState);
        setSignupData(initialSignupState);
        setShowPassword(false);
        setMessage({ show: false, type: "", text: "" });
        setIsLoading(false);
    }, []);

    const currentData = isLogin ? loginData : signupData;
    const handleChange = isLogin ? handleLoginChange : handleSignupChange;

    return (
        <div className="min-h-screen w-full overflow-hidden bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-lime-400 to-green-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-teal-400 to-cyan-600 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
            </div>

            {/* Floating Eco Icons */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <Leaf className="absolute top-1/4 left-1/4 w-6 h-6 text-lime-300 opacity-30 animate-float" />
                <TreePine className="absolute top-1/3 right-1/3 w-8 h-8 text-green-300 opacity-40 animate-float-delayed" />
                <Recycle className="absolute bottom-1/4 right-1/4 w-5 h-5 text-teal-300 opacity-30 animate-float-slow" />
                <Leaf className="absolute bottom-1/3 left-1/3 w-7 h-7 text-emerald-300 opacity-40 animate-float" />
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 flex min-h-screen w-full">
                {/* Left Side - Branding/Welcome */}
                <div className={`hidden lg:flex flex-col justify-center items-center p-12 relative transition-all duration-700 ease-in-out ${
                    isLogin ? 'lg:w-1/2 xl:w-3/5 order-first' : 'lg:w-2/5 xl:w-2/5 order-last'
                }`}>
                    <div className="text-center max-w-lg">
                        <div className="flex items-center justify-center mb-8">
                            <Leaf className="w-16 h-16 text-lime-300 mr-4" />
                            <h1 className="text-6xl font-bold text-white">EcoBizHub</h1>
                            <TreePine className="w-12 h-12 text-emerald-300 ml-4" />
                        </div>
                        <h2 className="text-4xl font-semibold text-white mb-6">
                            {isLogin ? "Discover Sustainable Living" : "Join the Green Community"}
                        </h2>
                        <p className="text-xl text-white/80 leading-relaxed">
                            {isLogin
                                ? "Explore a world of eco-friendly and handcrafted products from rural artisans. Make a difference with every purchase, supporting communities and the planet."
                                : "Join our mission to promote sustainability. Sign up to get exclusive access to unique products and track your personal impact on the environment."
                            }
                        </p>
                        <div className="mt-12 grid grid-cols-3 gap-8 text-center">
                            {isLogin ? (
                                <>
                                    <div>
                                        <div className="text-3xl font-bold text-lime-300">200+</div>
                                        <div className="text-white/70">Artisans Empowered</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-emerald-300">5K+</div>
                                        <div className="text-white/70">Tons of Plastic Saved</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-teal-300">500+</div>
                                        <div className="text-white/70">Products Available</div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <div className="text-3xl font-bold text-green-300">FREE</div>
                                        <div className="text-white/70">Membership</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-amber-300">24/7</div>
                                        <div className="text-white/70">Support</div>
                                    </div>
                                    <div>
                                        <div className="text-3xl font-bold text-cyan-300">TRACK</div>
                                        <div className="text-white/70">Your Eco-Impact</div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side - Auth Form */}
                <div className={`w-full lg:w-1/2 xl:w-2/5 flex items-center justify-center p-6 sm:p-8 transition-all duration-700 ease-in-out ${
                    isLogin ? 'order-last' : 'order-first'
                }`}>
                    <div className="w-full max-w-lg">
                        <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 relative overflow-hidden transition-all duration-500 transform ${isLogin ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'}`}">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full animate-shine"></div>

                            {/* Message Box */}
                            {message.show && (
                                <div className={`mb-4 p-3 rounded-2xl backdrop-blur-sm transition-all duration-300 animate-slide-down ${
                                    message.type === "error"
                                        ? "bg-red-500/20 border border-red-400/30 text-red-100"
                                        : "bg-green-500/20 border border-green-400/30 text-green-100"
                                }`}>
                                    <p className="font-semibold text-sm">{message.type === "error" ? "Error" : "Success"}</p>
                                    <p className="text-sm mt-1">{message.text}</p>
                                </div>
                            )}

                            {/* Mobile Header (only shows on mobile) */}
                            <div className="text-center mb-6 lg:hidden">
                                <div className="flex items-center justify-center mb-4">
                                    <Leaf className="w-8 h-8 text-lime-300 mr-2" />
                                    <h1 className="text-2xl font-bold text-white">EcoBizHub</h1>
                                    <TreePine className="w-6 h-6 text-emerald-300 ml-2" />
                                </div>
                                <h2 className="text-xl font-semibold text-white mb-2">
                                    {isLogin ? "Welcome Back!" : "Create Your Account"}
                                </h2>
                                <p className="text-white/70 text-sm">
                                    {isLogin ? "Sign in to your sustainable account" : "Join our eco-friendly community"}
                                </p>
                            </div>

                            {/* Desktop Header */}
                            <div className="text-center mb-6 hidden lg:block">
                                <h2 className="text-2xl font-semibold text-white mb-2">
                                    {isLogin ? "Welcome Back!" : "Create Your Account"}
                                </h2>
                                <p className="text-white/70 text-sm">
                                    {isLogin ? "Sign in to your sustainable account" : "Join our eco-friendly community"}
                                </p>
                            </div>

                            {/* Method Toggle Buttons */}
                            <div className="flex mb-4 p-1 bg-white/10 rounded-2xl backdrop-blur-sm">
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className={`flex-1 py-2 px-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                                        isLogin
                                            ? "bg-white/20 text-white shadow-lg"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    Login
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleMode}
                                    className={`flex-1 py-2 px-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                                        !isLogin
                                            ? "bg-white/20 text-white shadow-lg"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    Sign Up
                                </button>
                            </div>

                            {/* Authentication Method Selection Buttons */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setAuthMethod("email_password")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                        authMethod === "email_password"
                                            ? "bg-green-500/30 text-green-100 border border-green-400/30"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                                >
                                    Email
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuthMethod("google_auth")}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                        authMethod === "google_auth"
                                            ? "bg-amber-500/30 text-amber-100 border border-amber-400/30"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                                >
                                    Google
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMethod(isLogin ? "admin_access" : "admin_signup");
                                        setSignupData(prev => ({ ...prev, type: 'admin' }));
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                        authMethod === "admin_access" || authMethod === "admin_signup"
                                            ? "bg-teal-500/30 text-teal-100 border border-teal-400/30"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                                >
                                    Admin
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setAuthMethod("seller_signup");
                                        setSignupData(prev => ({ ...prev, type: 'seller' }));
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                                        !isLogin && authMethod === "seller_signup"
                                            ? "bg-blue-500/30 text-blue-100 border border-blue-400/30"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                                >
                                    Seller
                                </button>
                            </div>

                            {/* Main Authentication Form */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {authMethod === "google_auth" ? (
                                    <div className="space-y-3">
                                        <div className="text-center py-3">
                                            <div className="w-12 h-12 mx-auto mb-3 bg-white rounded-full flex items-center justify-center">
                                                <FcGoogle size={28} />
                                            </div>
                                            <h3 className="text-white text-lg font-medium mb-2">
                                                {isLogin ? "Sign in with Google" : "Sign up with Google"}
                                            </h3>
                                            <p className="text-white/70 text-sm">
                                                {isLogin ? "Use your Google account for quick and secure access" : "Provide a few more details to complete your signup"}
                                            </p>
                                        </div>

                                        {!isLogin && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="google_fname" className="block text-white/90 text-sm font-medium mb-1">First Name</label>
                                                    <input id="google_fname" name="fname" type="text" required={!isLogin && authMethod === "google_auth"} value={signupData.fname} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="First name" />
                                                </div>
                                                <div>
                                                    <label htmlFor="google_lname" className="block text-white/90 text-sm font-medium mb-1">Last Name</label>
                                                    <input id="google_lname" name="lname" type="text" required={!isLogin && authMethod === "google_auth"} value={signupData.lname} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Last name" />
                                                </div>
                                                <div>
                                                    <label htmlFor="google_mobile" className="block text-white/90 text-sm font-medium mb-1">Mobile Number</label>
                                                    <input id="google_mobile" name="mobile" type="tel" value={signupData.mobile} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Your mobile number" />
                                                </div>
                                                <div>
                                                    <label htmlFor="google_gender" className="block text-white/90 text-sm font-medium mb-1">Gender</label>
                                                    <select id="google_gender" name="gender" value={signupData.gender} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm">
                                                        <option value="">Select Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {!isLogin && (authMethod === "email_password" || authMethod === "admin_signup" || authMethod === "seller_signup") && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="signup_fname" className="block text-white/90 text-sm font-medium mb-1">First Name</label>
                                                    <input id="signup_fname" name="fname" type="text" required value={signupData.fname} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="First name" />
                                                </div>
                                                <div>
                                                    <label htmlFor="signup_lname" className="block text-white/90 text-sm font-medium mb-1">Last Name</label>
                                                    <input id="signup_lname" name="lname" type="text" required value={signupData.lname} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Last name" />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label htmlFor="email_field" className="block text-white/90 text-sm font-medium mb-1">Email Address</label>
                                            <input id="email_field" name="email" type="email" autoComplete="email" required value={currentData.email} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="you@example.com" />
                                        </div>

                                        <div>
                                            <label htmlFor="password_field" className="block text-white/90 text-sm font-medium mb-1">Password</label>
                                            <div className="relative">
                                                <input id="password_field" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={currentData.password} onChange={handleChange} className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Enter your password" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white transition-colors">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {!isLogin && (authMethod === "admin_access" || authMethod === "admin_signup" || authMethod === "seller_signup") && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="signup_mobile" className="block text-white/90 text-sm font-medium mb-1">Mobile Number</label>
                                                    <input id="signup_mobile" name="mobile" type="tel" value={signupData.mobile} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Your mobile number" />
                                                </div>
                                                <div>
                                                    <label htmlFor="signup_gender" className="block text-white/90 text-sm font-medium mb-1">Gender</label>
                                                    <select id="signup_gender" name="gender" value={signupData.gender} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm">
                                                        <option value="">Select Gender</option>
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                
                                            </div>
                                        )}

                                        {(authMethod === "admin_access" || authMethod === "admin_signup") && (
                                            <div className="mt-4">
                                                <label htmlFor="adminCode_field" className="block text-white/90 text-sm font-medium mb-1">Admin Access Code</label>
                                                <input id="adminCode_field" name="adminCode" type="password" required value={currentData.adminCode} onChange={handleChange} className="w-full px-3 py-2 bg-teal-500/10 border border-teal-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-teal-400/50 focus:bg-teal-500/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Enter admin access code" />
                                                <p className="text-teal-200/70 text-xs mt-1">Contact system administrator for access code</p>
                                            </div>
                                        )}
                                        
                                        {(!isLogin && signupData.type === "seller") && (
                                            <div className="space-y-3 mt-4">
                                                <h3 className="text-white/90 text-lg font-semibold">Store Details</h3>
                                                <div>
                                                    <label htmlFor="storeName" className="block text-white/90 text-sm font-medium mb-1">Store Name</label>
                                                    <input id="storeName" name="storeName" type="text" required value={signupData.storeName} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Your store name" />
                                                </div>
                                                <div>
                                                    <label htmlFor="storeDescription" className="block text-white/90 text-sm font-medium mb-1">Store Description</label>
                                                    <textarea id="storeDescription" name="storeDescription" required value={signupData.storeDescription} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Describe your store in a few words" />
                                                </div>
                                                <div>
                                                    <label htmlFor="artisanStory" className="block text-white/90 text-sm font-medium mb-1">Artisan Story</label>
                                                    <textarea id="artisanStory" name="artisanStory" required value={signupData.artisanStory} onChange={handleChange} className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Share the story behind your products" />
                                                </div>
                                                <div>
                                                    <label htmlFor="sellerCode_field" className="block text-white/90 text-sm font-medium mb-1">Seller Access Code</label>
                                                    <input id="sellerCode_field" name="sellerCode" type="password" required value={signupData.sellerCode} onChange={handleChange} className="w-full px-3 py-2 bg-blue-500/10 border border-blue-400/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:bg-blue-500/20 transition-all duration-300 backdrop-blur-sm text-sm" placeholder="Enter seller access code" />
                                                    <p className="text-blue-200/70 text-xs mt-1">Contact system administrator for access code</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading || (!isLogin && authMethod === "google_auth" && !isGoogleSignupFieldsFilled)}
                                    className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
                                        authMethod === "google_auth"
                                            ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 shadow-lg shadow-amber-500/30"
                                            : authMethod === "admin_access" || authMethod === "admin_signup"
                                                ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30"
                                                : signupData.type === "seller"
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/30"
                                                    : "bg-gradient-to-r from-green-500 to-lime-500 hover:from-green-600 hover:to-lime-600 shadow-lg shadow-green-500/30"
                                    }`}
                                >
                                    {isLoading ? (
                                        <div className="flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing...
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center">
                                            {authMethod === "google_auth" && <FcGoogle size={20} className="mr-2" />}
                                            {authMethod === "google_auth"
                                                ? `${isLogin ? "Sign In" : "Complete Sign Up"}`
                                                : authMethod === "admin_access" || authMethod === "admin_signup"
                                                    ? `${isLogin ? "Admin Login" : "Create Admin Account"}`
                                                    : signupData.type === "seller"
                                                        ? "Create Seller Account"
                                                        : `${isLogin ? "Sign In" : "Create Account"}`
                                            }
                                        </div>
                                    )}
                                </button>
                            </form>

                            <div className="text-center mt-6">
                                <p className="text-white/70 text-sm">
                                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                                    <button
                                        type="button"
                                        onClick={toggleMode}
                                        className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
                                    >
                                        {isLogin ? "Sign Up" : "Sign In"}
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes shine {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    100% { transform: translateX(200%) skewX(-12deg); }
                }
                @keyframes slide-down {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-float { animation: float 3s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 4s ease-in-out infinite; }
                .animate-float-slow { animation: float-slow 5s ease-in-out infinite; }
                .animate-shine { animation: shine 2s ease-in-out infinite; }
                .animate-slide-down { animation: slide-down 0.5s ease-out forwards; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }
                select option {
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                }
            `}</style>
        </div>
    );
}
