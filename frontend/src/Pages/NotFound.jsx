import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-lime-50 p-4">
            <div className="text-center max-w-xl mx-auto">
                <div className="flex flex-col items-center justify-center mb-8">
                    <Leaf className="w-24 h-24 text-green-500 mb-4 animate-pulse" />
                    <h1 className="text-8xl font-extrabold text-gray-900 leading-none">404</h1>
                </div>

                <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
                    <h3 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                        Oops! You've gone off the beaten path.
                    </h3>
                    <p className="text-lg text-gray-600 mb-8">
                        The page you were looking for doesn't exist, or has been moved to a more sustainable location!
                    </p>
                    <Link
                        to="/"
                        className="inline-block bg-gradient-to-r from-green-600 to-lime-600 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        Go back to the Eco-Hub
                    </Link>
                </div>
            </div>
        </div>
    );
}
