import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { auth } from '../firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import styles from '../Styles/LoginModal.module.css'; 

export const LoginModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            localStorage.setItem('userRole', 'user');

            console.log('User logged in:', user.email);
            onClose(); 
        } catch (err) {
            console.error("Login error:", err.message);
            if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed login attempts. Please try again later.');
            }
            else {
                setError('Failed to log in. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className={`${styles.modalOverlay} ${styles.ecobizhubOverlay}`} onClick={onClose}>
            <div className={`${styles.modalContent} ${styles.ecobizhubContent}`} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Login to EcoBizHub</h2>
                    <button onClick={onClose} className={`${styles.closeButton} ${styles.ecobizhubCloseButton}`} aria-label="Close login modal">
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleLogin} className={styles.loginForm}>
                    {error && <p className={`${styles.errorMessage} ${styles.ecobizhubError}`}>{error}</p>}
                    <div className={styles.inputGroup}>
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            aria-label="Email address"
                            className={styles.ecobizhubInput}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            aria-label="Password"
                            className={styles.ecobizhubInput}
                        />
                    </div>
                    <button type="submit" className={`${styles.loginButton} ${styles.ecobizhubLoginButton}`} disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className={styles.modalFooter}>
                    <p>Don't have an account? <Link to="/register" onClick={onClose} className={styles.signupLink}>Sign Up</Link></p>
                </div>
            </div>
        </div>,
        document.body 
    );
};