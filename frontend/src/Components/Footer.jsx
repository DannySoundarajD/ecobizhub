import React from 'react';
import {
    IoIosCall,
    IoMdMail,
    IoLogoWhatsapp,
    IoLogoInstagram,
    IoLogoTwitter,
    IoLogoLinkedin,
    IoLogoFacebook,
} from 'react-icons/io';
import {
    FaCcVisa,
    FaCcMastercard,
    FaCcPaypal,
    FaGooglePlay,
    FaApple,
    FaArrowUp,
} from 'react-icons/fa';
import { Leaf, Recycle, Compass } from 'lucide-react';

const EcoBizHubFooter = () => {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="relative bg-gradient-to-r from-green-600 to-lime-600 text-white py-12 sm:py-16 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-green-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-2000"></div>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-lime-400 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-blob animation-delay-4000"></div>
            </div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-y-10 gap-x-8">
                    
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h3 className="text-3xl font-bold text-white mb-4">EcoBizHub</h3>
                        <p className="text-green-100 leading-relaxed mb-6">
                            Your trusted marketplace for sustainable and rural products.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-white hover:text-lime-300 transition-colors text-2xl">
                                <IoLogoFacebook />
                            </a>
                            <a href="#" className="text-white hover:text-lime-300 transition-colors text-2xl">
                                <IoLogoInstagram />
                            </a>
                            <a href="#" className="text-white hover:text-lime-300 transition-colors text-2xl">
                                <IoLogoTwitter />
                            </a>
                            <a href="#" className="text-white hover:text-lime-300 transition-colors text-2xl">
                                <IoLogoLinkedin />
                            </a>
                        </div>
                    </div>

                    <div className="text-center md:text-left">
                        <h4 className="text-xl font-semibold text-white mb-4">Quick Links</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Shop All</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">New Arrivals</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Artisan Stories</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Zero Waste</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Contact Us</a></li>
                        </ul>
                    </div>

                    {/* Customer Service Section */}
                    <div className="text-center md:text-left">
                        <h4 className="text-xl font-semibold text-white mb-4">Customer Service</h4>
                        <ul className="space-y-2">
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">FAQs</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Shipping & Returns</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Track Order</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Sustainability Report</a></li>
                            <li><a href="#" className="text-green-100 hover:text-white transition-colors">Become a Seller</a></li>
                        </ul>
                    </div>

                    {/* Contact & Apps */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        <h4 className="text-xl font-semibold text-white mb-4">Get In Touch</h4>
                        <div className="flex items-center text-green-100 mb-2">
                            <IoIosCall className="text-xl mr-2 text-lime-300" />
                            <span>+91 98765 43210</span>
                        </div>
                        <div className="flex items-center text-green-100 mb-2">
                            <IoMdMail className="text-xl mr-2 text-green-300" />
                            <span>support@ecobizhub.com</span>
                        </div>
                        <div className="flex items-center text-green-100 mb-6">
                            <IoLogoWhatsapp className="text-xl mr-2 text-green-300" />
                            <span>Chat with us</span>
                        </div>

                        <span className="text-base font-medium text-white mb-3">Download Our App:</span>
                        <div className="flex space-x-3">
                            <a href="#" className="flex items-center bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors group">
                                <FaApple className="text-xl mr-2 group-hover:text-lime-300 transition-colors" />
                                <span className="text-sm">iOS</span>
                            </a>
                            <a href="#" className="flex items-center bg-white/10 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-colors group">
                                <FaGooglePlay className="text-xl mr-2 group-hover:text-green-300 transition-colors" />
                                <span className="text-sm">Android</span>
                            </a>
                        </div>
                    </div>
                </div>

                <div className="border-t border-green-500/50 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between text-green-200 text-sm">
                    <div className="flex space-x-4 mb-4 sm:mb-0">
                        <FaCcVisa className="text-3xl" />
                        <FaCcMastercard className="text-3xl" />
                        <FaCcPaypal className="text-3xl" />
                    </div>
                    
                    <div className="text-center sm:text-right">
                        <p className="mb-2 sm:mb-0">© 2025 EcoBizHub. All rights reserved.</p>
                        <div className="flex justify-center sm:justify-end space-x-4 text-xs">
                            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center mt-8 sm:hidden">
                    <button
                        onClick={scrollToTop}
                        className="bg-gradient-to-r from-green-600 to-lime-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300"
                        aria-label="Scroll to top"
                    >
                        <FaArrowUp className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <button
                onClick={scrollToTop}
                className="hidden sm:block fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-lime-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50"
                aria-label="Scroll to top"
            >
                <FaArrowUp className="h-5 w-5" />
            </button>

            <style jsx>{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite ease-in-out;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </footer>
    );
};

export default EcoBizHubFooter;