import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, storage, db } from "../../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Loader, PlusSquare, Edit2, X, Save, ArrowLeft, Image, Tag, DollarSign, Leaf, Palette, Calendar, Award, Star, Package as PackageIcon, Zap, MapPin, UploadCloud, LinkIcon, MessageSquare, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';

const AddEditProduct = () => {
    const { category, id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [isReviewsVisible, setIsReviewsVisible] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        image: '',
        images: Array(5).fill(''),
        description: '',
        price: 0,
        rating: 0,
        reviews: [],
        material: '',
        origin: '',
        impact: '',
        category: category || '',
        type: '',
        added_date: new Date().toISOString().split('T')[0],
        stock: 0,
        is_featured: false,
        is_bestseller: false,
        has_special_deal: false,
        is_fast_delivery: false,
    });

    const [loading, setLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [imageFiles, setImageFiles] = useState(Array(5).fill(null));
    const [uploadProgress, setUploadProgress] = useState(Array(5).fill(0));
    const [isUploading, setIsUploading] = useState(Array(5).fill(false));
    const [imageUploadMethods, setImageUploadMethods] = useState(Array(5).fill('url'));

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            const fetchProduct = async () => {
                const user = auth.currentUser;
                if (!user) {
                    showMessage("error", "You must be logged in to view product data.");
                    navigate("/login");
                    return;
                }
                try {
                    const docRef = doc(db, 'products', id);
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const productData = docSnap.data();
                        
                        const fetchedImages = Array.isArray(productData.images) ? productData.images : [];
                        const newImagesArray = Array(5).fill('');
                        for (let i = 0; i < fetchedImages.length && i < 5; i++) {
                            newImagesArray[i] = fetchedImages[i];
                        }
                        
                        setFormData(prevFormData => ({
                            ...prevFormData,
                            ...productData,
                            reviews: productData.reviews || [],
                            added_date: productData.added_date ? new Date(productData.added_date.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                            images: newImagesArray,
                            price: productData.price || 0,
                            rating: productData.rating || 0,
                            stock: productData.stock || 0,
                        }));
                        const initialImageMethods = newImagesArray.map(img => img ? 'url' : 'url');
                        setImageUploadMethods(initialImageMethods);
                    } else {
                        throw new Error("Product not found.");
                    }
                } catch (err) {
                    setError("Failed to load product data. Please check the URL and server connection.");
                    console.error("Error fetching product:", err.message);
                    showMessage("error", `Failed to load product: ${err.message}`);
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [id, category, isEditMode, navigate, db]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleRatingChange = useCallback((newRating) => {
        setFormData(prevState => ({ ...prevState, rating: newRating }));
    }, []);

    const handleImageMethodChange = (index, method) => {
        setImageUploadMethods(prev => prev.map((m, i) => i === index ? method : m));
        if (method === 'url') setImageFiles(prev => prev.map((f, i) => i === index ? null : f));
        else setFormData(prev => ({ ...prev, images: prev.images.map((img, i) => i === index ? '' : img) }));
    };

    const handleImageUrlChange = (index, url) => {
        setFormData(prev => {
            const updatedImages = [...prev.images];
            updatedImages[index] = url;
            return {
                ...prev,
                images: updatedImages,
                image: index === 0 ? url : prev.image
            };
        });
    };

    const handleImageFileChange = (index, file) => {
        setImageFiles(prev => {
            const updatedFiles = [...prev];
            updatedFiles[index] = file;
            return updatedFiles;
        });
        if (file) {
            setFormData(prev => {
                const updatedImages = [...prev.images];
                updatedImages[index] = '';
                return {
                    ...prev,
                    images: updatedImages,
                    image: index === 0 ? URL.createObjectURL(file) : prev.image
                };
            });
        }
    };
    
    const handleReviewChange = (index, value) => {
        setFormData(prev => ({ ...prev, reviews: prev.reviews.map((r, i) => i === index ? value : r) }));
    };

    const addReview = () => {
        if (formData.reviews.length < 10) {
            setFormData(prev => ({ ...prev, reviews: [...prev.reviews, ''] }));
        } else {
            showMessage("error", "You can add a maximum of 10 reviews.");
        }
    };

    const removeReview = (indexToRemove) => {
        setFormData(prev => ({ ...prev, reviews: prev.reviews.filter((_, index) => index !== indexToRemove) }));
    };

    const uploadSingleImage = useCallback(async (file, index) => {
        if (!file) return null;
        setIsUploading(prev => prev.map((status, i) => i === index ? true : status));
        const storageRef = ref(storage, `eco_products/${formData.category}/${file.name}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(prev => prev.map((p, i) => i === index ? progress : p));
                },
                (error) => {
                    setIsUploading(prev => prev.map((status, i) => i === index ? false : status));
                    reject(error);
                },
                async () => {
                    try {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        setIsUploading(prev => prev.map((status, i) => i === index ? false : status));
                        resolve(downloadURL);
                    } catch (urlError) {
                        setIsUploading(prev => prev.map((status, i) => i === index ? false : status));
                        reject(urlError);
                    }
                }
            );
        });
    }, [formData.category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            showMessage("error", "You must be logged in to perform this action.");
            navigate("/login");
            return;
        }

        setLoading(true);
        try {
            const requiredFields = ['name', 'price', 'category', 'stock'];
            if (requiredFields.some(field => !formData[field] && formData[field] !== 0)) {
                throw new Error("Please fill all required fields: Name, Price, Category, and Stock.");
            }
            if (formData.stock < 0) {
                throw new Error("Stock cannot be negative.");
            }

            const finalImages = await Promise.all(
                formData.images.map(async (url, i) => {
                    if (imageUploadMethods[i] === 'file' && imageFiles[i]) {
                        return await uploadSingleImage(imageFiles[i], i);
                    }
                    return url;
                })
            );
            const cleanedImages = finalImages.filter(Boolean);

            if (cleanedImages.length === 0) {
                throw new Error("At least one image URL or file is required.");
            }

            const dataToSubmit = {
                ...formData,
                images: cleanedImages,
                image: cleanedImages[0] || '',
                price: parseFloat(formData.price),
                rating: parseFloat(formData.rating),
                reviews: formData.reviews.map(r => r.trim()).filter(Boolean),
                added_date: serverTimestamp(),
                stock: parseInt(formData.stock, 10),
                sellerId: user.uid,
                updatedAt: serverTimestamp(),
            };
            
            if (isEditMode) {
                await updateDoc(doc(db, 'products', id), dataToSubmit);
                showMessage("success", `Product updated successfully!`);
            } else {
                await addDoc(collection(db, 'products'), dataToSubmit);
                showMessage("success", `Product added successfully!`);
            }
            
            setTimeout(() => navigate(`/admin/products/${formData.category}`), 1000);
        } catch (err) {
            const errorMessage = err.message || "An unexpected error occurred.";
            showMessage("error", `Failed to submit product: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader className="w-16 h-16 text-green-600 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600 font-medium">Loading product data...</p>
                </div>
            </div>
        );
    }

    const categoriesForHeaderLink = [
        { path: 'handicrafts', display: 'Handicrafts' },
        { path: 'organic_foods', display: 'Organic Foods' },
        { path: 'natural_fabrics', display: 'Natural Fabrics' },
        { path: 'herbal_products', display: 'Herbal Products' },
        { path: 'upcycled_goods', display: 'Upcycled Goods' },
    ];
    
    const currentCategoryPath = categoriesForHeaderLink.find(c => c.path === (isEditMode ? formData.category : category))?.path;

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-lime-50 p-3">
            {message.show && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 ${message.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                    <span className="text-xl">{message.type === "error" ? "⚠️" : "✅"}</span>
                    <div>
                        <strong className="font-bold">{message.type.toUpperCase()}:</strong>
                        <p className="text-sm">{message.text}</p>
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-r from-green-600 to-lime-600 text-white rounded-xl shadow-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                    <Link to={isEditMode ? `/admin/products/${currentCategoryPath}` : "/admin-dashboard"} className="text-white hover:text-gray-100 flex items-center gap-2 text-sm transition-colors duration-200">
                        <ArrowLeft className="w-4 h-4" /> {isEditMode ? `Back to Products` : 'Back to Dashboard'}
                    </Link>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        {isEditMode ? <Edit2 className="w-6 h-6" /> : <PlusSquare className="w-6 h-6" />}
                        <h1 className="text-2xl font-bold">{isEditMode ? "Edit Product" : "Add New Product"}</h1>
                    </div>
                    <p className="text-green-100 text-sm">{isEditMode ? `Modifying "${formData.name}"` : "Input details for your new eco-friendly product"}</p>
                </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm"><strong>Error:</strong> {error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                            <Tag size={12} className="mr-1 text-green-500" /> Product Name
                        </label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" placeholder="Enter product name" />
                    </div>

                    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                            <Image size={16} className="text-green-500" /> Product Images (Up to 5)
                        </h3>
                        <p className="text-xs text-gray-500">Add up to 5 images. The first image is the main image.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {[...Array(5)].map((_, index) => (
                                <div key={index} className="p-3 border rounded-lg bg-white shadow-sm space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">Image {index + 1} {index === 0 && "(Main)"}</label>
                                    <div className="flex items-center space-x-2">
                                        <button type="button" onClick={() => handleImageMethodChange(index, 'url')} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${imageUploadMethods[index] === 'url' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                            <LinkIcon size={12} /> URL
                                        </button>
                                        <button type="button" onClick={() => handleImageMethodChange(index, 'file')} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${imageUploadMethods[index] === 'file' ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                            <UploadCloud size={12} /> File
                                        </button>
                                    </div>
                                    {imageUploadMethods[index] === 'url' ? (
                                        <input type="url" value={formData.images[index] || ''} onChange={(e) => handleImageUrlChange(index, e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="https://example.com/image.jpg" />
                                    ) : (
                                        <div className="space-y-2">
                                            <input type="file" accept="image/*" onChange={(e) => handleImageFileChange(index, e.target.files[0])} className="w-full text-sm text-gray-700 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                                            {imageFiles[index] && (<button type="button" onClick={() => handleImageFileChange(index, null)} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"><X size={10} /> Clear</button>)}
                                        </div>
                                    )}
                                    {isUploading[index] && (<div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-green-600 h-1.5 rounded-full" style={{ width: `${uploadProgress[index]}%` }}></div></div>)}
                                    {(imageFiles[index] || formData.images[index]) && (<div className="mt-2"><img src={imageFiles[index] ? URL.createObjectURL(imageFiles[index]) : formData.images[index]} alt={`Preview ${index + 1}`} className="h-20 w-20 object-cover rounded-lg border" onError={(e) => { e.target.style.display = 'none'; }} onLoad={(e) => { e.target.style.display = 'block'; }} /></div>)}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><PackageIcon size={12} className="mr-1 text-green-500" /> Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none" placeholder="Enter product description" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><DollarSign size={12} className="mr-1 text-green-500" /> Price (₹)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" required className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Tag size={12} className="mr-1 text-green-500" /> Category</label>
                            <select name="category" value={formData.category} onChange={handleChange} required disabled={isEditMode} className="w-full px-2 py-1.5 border border-gray-300 bg-white rounded-lg text-sm">
                                <option value="">Select</option>
                                {categoriesForHeaderLink.map(cat => <option key={cat.path} value={cat.path}>{cat.display}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Palette size={12} className="mr-1 text-yellow-500" /> Material</label>
                            <input type="text" name="material" value={formData.material} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Bamboo, Cotton..." />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><MapPin size={12} className="mr-1 text-teal-500" /> Origin</label>
                            <input type="text" name="origin" value={formData.origin} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Assam, Gujarat..." />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Award size={12} className="mr-1 text-green-500" /> Type</label>
                            <input type="text" name="type" value={formData.type} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Handloom, Beaded..." />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Leaf size={12} className="mr-1 text-green-500" /> Eco-Impact</label>
                            <input type="text" name="impact" value={formData.impact} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" placeholder="Zero-waste, Supports artisans..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Calendar size={12} className="mr-1 text-gray-500" /> Added Date</label>
                            <input type="date" name="added_date" value={formData.added_date} onChange={handleChange} className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center">
                                <PackageIcon size={12} className="mr-1 text-gray-500" /> Stock
                            </label>
                            <input
                                type="number"
                                name="stock"
                                value={formData.stock}
                                onChange={handleChange}
                                required
                                min="0"
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                                placeholder="Number of items in stock"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center"><Star size={12} className="mr-1 text-yellow-500" /> Rating</label>
                        <div className="flex items-center space-x-1 py-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => handleRatingChange(star)} className="focus:outline-none transition-colors duration-200">
                                    {star <= formData.rating ? <AiFillStar className="text-yellow-500 text-lg hover:text-yellow-600" /> : <AiOutlineStar className="text-gray-400 text-lg hover:text-yellow-500" />}
                                </button>
                            ))}
                            <span className="ml-2 text-sm text-gray-600">({formData.rating}/5)</span>
                        </div>
                    </div>

                    <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <button type="button" onClick={() => setIsReviewsVisible(!isReviewsVisible)} className="w-full flex justify-between items-center text-left">
                            <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                                <MessageSquare size={16} className="text-green-500" />
                                Product Reviews
                                <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">{formData.reviews.length}</span>
                            </h3>
                            <ChevronDown size={20} className={`text-gray-500 transition-transform duration-300 ${isReviewsVisible ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {isReviewsVisible && (
                            <div className="pt-4 border-t mt-2 space-y-3">
                                <p className="text-xs text-gray-500">Add or remove customer reviews. Maximum of 10.</p>
                                {formData.reviews.map((review, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <textarea value={review} onChange={(e) => handleReviewChange(index, e.target.value)} rows="2" className="flex-grow px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-green-500 focus:outline-none resize-none" placeholder={`Enter customer review ${index + 1}...`} />
                                        <button type="button" onClick={() => removeReview(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" aria-label="Remove review">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {formData.reviews.length < 10 && (
                                    <button type="button" onClick={addReview} className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500">
                                        <Plus size={16} />
                                        Add New Review
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
                        <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2"><Zap size={16} className="text-green-500" /> Product Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="form-checkbox h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-700 group-hover:text-green-600">Featured</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" name="is_bestseller" checked={formData.is_bestseller} onChange={handleChange} className="form-checkbox h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-700 group-hover:text-green-600">Best Seller</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" name="has_special_deal" checked={formData.has_special_deal} onChange={handleChange} className="form-checkbox h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-700 group-hover:text-green-600">Special Deal</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" name="is_fast_delivery" checked={formData.is_fast_delivery} onChange={handleChange} className="form-checkbox h-4 w-4 text-green-600" />
                                <span className="text-sm text-gray-700 group-hover:text-green-600">Fast Delivery</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-center pt-4">
                        <button type="submit" disabled={loading || isUploading.some(Boolean)} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-all duration-200 ${loading || isUploading.some(Boolean) ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-lime-600 hover:from-green-700 hover:to-lime-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'}`}>
                            {(loading || isUploading.some(Boolean)) ? (<><Loader className="w-5 h-5 animate-spin" /> {isUploading.some(Boolean) ? 'Uploading...' : 'Processing...'}</>) : (<><Save className="w-5 h-5" /> {isEditMode ? 'Update Product' : 'Add Product'}</>)}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditProduct;