import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth } from '../firebaseConfig';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const FirestoreContext = createContext();

export const useFirestoreData = () => useContext(FirestoreContext);

export const FirestoreProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [wishlistItems, setWishlistItems] = useState([]);
    const [firestoreError, setFirestoreError] = useState(null);
    const [loading, setLoading] = useState(true);

    const db = useMemo(() => getFirestore(), []);

    const loadUserCart = useCallback((userId) => {
        const q = query(collection(db, 'cart'), where('userId', '==', userId), orderBy('updatedAt', 'desc'));
        return onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCartItems(data);
            setLoading(false);
            setFirestoreError(null);
        }, (err) => {
            console.error('Cart listener error:', err);
            setFirestoreError(`Failed to load cart: ${err.message}.`);
            setLoading(false);
        });
    }, [db]);

    const loadUserWishlist = useCallback((userId) => {
        const q = query(collection(db, 'wishlists'), where('userId', '==', userId), orderBy('addedAt', 'desc'));
        return onSnapshot(q, (querySnapshot) => {
            const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setWishlistItems(data);
            setLoading(false);
            setFirestoreError(null);
        }, (err) => {
            console.error('Wishlist listener error:', err);
            setFirestoreError(`Failed to load wishlist: ${err.message}.`);
            setLoading(false);
        });
    }, [db]);

    useEffect(() => {
        let unsubscribeCart = () => {};
        let unsubscribeWishlist = () => {};

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            
            unsubscribeCart();
            unsubscribeWishlist();

            if (currentUser) {
                unsubscribeCart = loadUserCart(currentUser.uid);
                unsubscribeWishlist = loadUserWishlist(currentUser.uid);
            } else {
                setCartItems([]);
                setWishlistItems([]);
                setLoading(false);
                setFirestoreError(null);
            }
        });

        return () => {
            unsubscribeAuth();
            unsubscribeCart();
            unsubscribeWishlist();
        };
    }, [loadUserCart, loadUserWishlist]);
    
    const value = {
        user,
        cartItems,
        wishlistItems,
        firestoreError,
        loading,
        cartCount: cartItems.reduce((total, item) => total + (item.quantity || 0), 0),
        wishlistCount: wishlistItems.length,
    };

    return (
        <FirestoreContext.Provider value={value}>
            {children}
        </FirestoreContext.Provider>
    );
};