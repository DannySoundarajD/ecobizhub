import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { auth, storage, db } from "../../firebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { 
    Loader, 
    Edit2, 
    Save, 
    ArrowLeft, 
    Image, 
    Tag, 
    DollarSign, 
    MapPin, 
    Package as PackageIcon, 
    Star,
    Upload,
    X,
    Plus,
    Trash2,
    Eye,
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    LinkIcon,
    UploadCloud,
    Leaf,
    Award,
    Calendar,
    MessageSquare,
    PlusSquare,
    Zap,
    Palette,
    Camera,
    Sparkles,
    RotateCcw,
    ChevronRight,
    CheckCircle,
    Heart,
    Shield
} from 'lucide-react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';

const SellerEditProduct = () => {
    const { category, id } = useParams();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [currentStep, setCurrentStep] = useState(1);
    const [dragActive, setDragActive] = useState(false);

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
        tags: []
    });

    const [loading, setLoading] = useState(isEditMode);
    const [loadingAI, setLoadingAI] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState({ show: false, type: "", text: "" });
    const [imageFiles, setImageFiles] = useState(Array(5).fill(null));
    const [uploadProgress, setUploadProgress] = useState(Array(5).fill(0));
    const [isUploading, setIsUploading] = useState(Array(5).fill(false));
    const [imageUploadMethods, setImageUploadMethods] = useState(Array(5).fill('url'));
    const [showPreview, setShowPreview] = useState(false);
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        images: true,
        details: false,
        reviews: false,
        features: false
    });

    const showMessage = (type, text) => {
        setMessage({ show: true, type, text });
        setTimeout(() => {
            setMessage({ show: false, type: "", text: "" });
        }, 5000);
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const parseAIResponse = (text) => {
        let result = { description: '', name: '', price: '', tags: [], material: '', origin: '', impact: '', category: '' };
        
        let jsonText = text.trim();
        jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '');
        
        try {
            const data = JSON.parse(jsonText);
            
            result.name = data.name || '';
            result.description = data.description || '';
            result.price = data.price || '';
            result.material = data.material || '';
            result.origin = data.origin || '';
            result.impact = data.impact || '';
            result.category = data.category || '';
            
            if (typeof data.tags === 'string') {
                result.tags = data.tags.split(',').map(tag => tag.trim()).filter(Boolean);
            } else if (Array.isArray(data.tags)) {
                result.tags = data.tags.map(tag => tag.trim()).filter(Boolean);
            }
        } catch (e) {
            console.error("Failed to parse AI response as JSON, falling back to regex:", e);
            const nameMatch = text.match(/"name":\s*"(.*?)"/);
            const descriptionMatch = text.match(/"description":\s*"(.*?)"/);
            const priceMatch = text.match(/"price":\s*"(.*?)"/);
            const tagsMatch = text.match(/"tags":\s*"(.*?)"/);
            const materialMatch = text.match(/"material":\s*"(.*?)"/);
            const originMatch = text.match(/"origin":\s*"(.*?)"/);
            const impactMatch = text.match(/"impact":\s*"(.*?)"/);
            const categoryMatch = text.match(/"category":\s*"(.*?)"/);

            if (nameMatch) result.name = nameMatch[1];
            if (descriptionMatch) result.description = descriptionMatch[1];
            if (priceMatch) result.price = priceMatch[1];
            if (tagsMatch) result.tags = tagsMatch[1].split(',').map(t => t.trim());
            if (materialMatch) result.material = materialMatch[1];
            if (originMatch) result.origin = originMatch[1];
            if (impactMatch) result.impact = impactMatch[1];
            if (categoryMatch) result.category = categoryMatch[1];
        }
        return result;
    };

    const generateWithAI = useCallback(async (fileToProcess) => {
        if (!fileToProcess) return;
        setLoadingAI(true);
        setError(null);
        
        const API_URL = "http://192.168.56.1:1234/v1/chat/completions";

        try {
            new URL(API_URL);

            const base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result.split(',')[1]);
                reader.readAsDataURL(fileToProcess);
            });

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen/qwen2.5-vl-7b',
                    messages: [
                        { role: 'system', content: 'You are an e-commerce product manager. Based on the image, generate a detailed product name, a detailed description (50-100 words), a comma-separated list of suitable tags (e.g., eco-friendly, sustainable), an estimated market price in INR, the primary material, the country/region of origin, the eco-friendly impact, and a suggested product category from the following list: handicrafts, organic_foods, natural_fabrics, herbal_products, upcycled_goods. Respond in a strict JSON-like format with keys: name, description, price, tags, material, origin, impact, category.' },
                        { role: 'user', content: [{ type: 'text', text: 'Generate product details.' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] }
                    ],
                    max_tokens: 250,
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText}`);
            }

            const data = await response.json();
            const aiContent = data.choices[0].message.content;
            console.log("AI Raw Content:", aiContent);

            const parsedData = parseAIResponse(aiContent);
            console.log("Parsed AI Data:", parsedData);

            setFormData(prev => ({
                ...prev,
                name: parsedData.name || prev.name,
                description: parsedData.description || prev.description,
                tags: parsedData.tags.length > 0 ? parsedData.tags : prev.tags,
                price: parsedData.price !== '' ? parsedData.price : prev.price,
                material: parsedData.material || prev.material,
                origin: parsedData.origin || prev.origin,
                impact: parsedData.impact || prev.impact,
                category: parsedData.category || prev.category,
            }));

            showMessage("success", "Product details generated successfully with AI!");

        } catch (err) {
            console.error("Error generating with AI:", err);
            setError(`AI generation failed: ${err.message}. Please try again.`);
            showMessage("error", `AI generation failed: ${err.message}.`);
        } finally {
            setLoadingAI(false);
        }
    }, []);

    // Load product data for edit mode
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
                        
                        if (productData.sellerId !== user.uid) {
                            throw new Error("You don't have permission to edit this product.");
                        }
                        
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
                            tags: productData.tags || []
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
    }, [id, category, isEditMode, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevState => ({ 
            ...prevState, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const handleRatingChange = useCallback((newRating) => {
        setFormData(prevState => ({ ...prevState, rating: newRating }));
    }, []);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                setImageFiles(prev => {
                    const updated = [...prev];
                    updated[0] = file;
                    return updated;
                });
                setFormData(prev => ({ 
                    ...prev, 
                    image: URL.createObjectURL(file),
                    images: [URL.createObjectURL(file), ...prev.images.slice(1)]
                }));
                generateWithAI(file);
            }
        }
    };

    const handleImageMethodChange = (index, method) => {
        setImageUploadMethods(prev => prev.map((m, i) => i === index ? method : m));
        if (method === 'url') {
            setImageFiles(prev => prev.map((f, i) => i === index ? null : f));
        } else {
            setFormData(prev => ({ 
                ...prev, 
                images: prev.images.map((img, i) => i === index ? '' : img) 
            }));
        }
    };
    // Add logo background
    useEffect(() => {
        const logoUrl = "/logo192.png"; // Change to your logo path
        document.body.style.backgroundImage = `url(${logoUrl})`;
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundPosition = "top right";
        document.body.style.backgroundSize = "200px auto";
        return () => {
            document.body.style.backgroundImage = "";
            document.body.style.backgroundRepeat = "";
            document.body.style.backgroundPosition = "";
            document.body.style.backgroundSize = "";
        };
    }, []);
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
                updatedImages[index] = URL.createObjectURL(file);
                return {
                    ...prev,
                    images: updatedImages,
                    image: index === 0 ? URL.createObjectURL(file) : prev.image
                };
            });
            if (index === 0) {
                generateWithAI(file);
            }
        }
    };

    const removeImage = (index) => {
        setImageFiles(prev => {
            const updated = [...prev];
            updated[index] = null;
            return updated;
        });
        
        setFormData(prev => {
            const updatedImages = [...prev.images];
            updatedImages[index] = '';
            return {
                ...prev,
                images: updatedImages,
                image: index === 0 ? (updatedImages.find(img => img) || '') : prev.image
            };
        });
    };

    const handleReviewChange = (index, value) => {
        setFormData(prev => ({ 
            ...prev, 
            reviews: prev.reviews.map((r, i) => i === index ? value : r) 
        }));
    };

    const addReview = () => {
        if (formData.reviews.length < 10) {
            setFormData(prev => ({ ...prev, reviews: [...prev.reviews, ''] }));
        } else {
            showMessage("error", "You can add a maximum of 10 reviews.");
        }
    };

    const removeReview = (indexToRemove) => {
        setFormData(prev => ({ 
            ...prev, 
            reviews: prev.reviews.filter((_, index) => index !== indexToRemove) 
        }));
    };

    const uploadSingleImage = useCallback(async (file, index) => {
        if (!file) return null;
        setIsUploading(prev => prev.map((status, i) => i === index ? true : status));
        
        const storageRef = ref(storage, `seller_products/${formData.category}/${file.name}_${Date.now()}`);
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

        setSaving(true);
        
        const requiredFields = ['name', 'price', 'category', 'stock'];
        if (requiredFields.some(field => !formData[field] && formData[field] !== 0)) {
            showMessage("error", "Please fill all required fields: Name, Price, Category, and Stock.");
            setSaving(false);
            return;
        }

        if (formData.price <= 0) {
            showMessage("error", "Price must be greater than 0");
            setSaving(false);
            return;
        }

        if (formData.stock < 0) {
            showMessage("error", "Stock cannot be negative");
            setSaving(false);
            return;
        }

        try {
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
                showMessage("error", "At least one image is required.");
                setSaving(false);
                return;
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
                tags: formData.tags || []
            };
            
            if (isEditMode) {
                await updateDoc(doc(db, 'products', id), dataToSubmit);
                showMessage("success", "Product updated successfully!");
            } else {
                await addDoc(collection(db, 'products'), dataToSubmit);
                showMessage("success", "Product added successfully!");
            }
            
            setTimeout(() => {
                navigate('/seller-dashboard');
            }, 1500);
            
        } catch (err) {
            const errorMessage = err.message || "An unexpected error occurred.";
            showMessage("error", `Failed to ${isEditMode ? 'update' : 'add'} product: ${errorMessage}`);
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const categories = [
        { path: 'handicrafts', display: 'Handicrafts' },
        { path: 'organic_foods', display: 'Organic Foods' },
        { path: 'natural_fabrics', display: 'Natural Fabrics' },
        { path: 'herbal_products', display: 'Herbal Products' },
        { path: 'upcycled_goods', display: 'Upcycled Goods' },
    ];

    if (loading && isEditMode) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
                <div className="text-center bg-white rounded-xl p-8 shadow-xl max-w-sm w-full border border-green-100">
                    <Loader className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Product</h2>
                    <p className="text-gray-600">Please wait while we fetch your product details...</p>
                </div>
            </div>
        );
    }

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                    <Camera className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                                    <Sparkles className="w-5 h-5 text-yellow-800" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Upload Your Product Photo
                            </h2>
                            <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
                                Just upload a photo and our smart AI will write everything for you!
                            </p>
                        </div>

                        <div 
                            className={`relative group transition-all duration-500 transform hover:scale-105 ${dragActive ? 'scale-105' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <div className={`relative overflow-hidden rounded-3xl border-4 border-dashed transition-all duration-300 ${
                                dragActive 
                                    ? 'border-green-500 bg-green-50 shadow-2xl' 
                                    : formData.image 
                                        ? 'border-green-400 bg-green-50' 
                                        : 'border-gray-300 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 hover:border-green-400 hover:shadow-xl'
                            }`}>
                                <div className="relative p-12 text-center">
                                    {formData.image ? (
                                        <div className="space-y-6">
                                            <div className="relative inline-block">
                                                <img 
                                                    src={formData.image} 
                                                    alt="Product Preview" 
                                                    className="h-64 w-auto max-w-full object-contain rounded-2xl shadow-2xl border-4 border-white mx-auto transition-all duration-500 hover:scale-105" 
                                                />
                                                <div className="absolute -top-3 -right-3 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                                    <CheckCircle className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center gap-3 text-green-600 font-bold text-lg">
                                                    <Heart className="w-6 h-6 text-red-500 animate-pulse" />
                                                    <span>Photo uploaded successfully!</span>
                                                    <Heart className="w-6 h-6 text-red-500 animate-pulse" />
                                                </div>
                                                
                                                {loadingAI ? (
                                                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-2xl shadow-lg">
                                                        <div className="flex items-center justify-center gap-4 mb-4">
                                                            <div className="relative">
                                                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                <Sparkles className="absolute inset-0 w-8 h-8 text-yellow-300 animate-pulse" />
                                                            </div>
                                                            <span className="text-lg font-medium">AI is working its magic...</span>
                                                        </div>
                                                        <div className="text-center text-sm opacity-90">
                                                            <div className="animate-pulse">Reading your photo...</div>
                                                            <div className="animate-pulse" style={{ animationDelay: '1s' }}>Writing description...</div>
                                                            <div className="animate-pulse" style={{ animationDelay: '2s' }}>Calculating price...</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-center gap-4">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => generateWithAI(imageFiles[0])} 
                                                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 hover:shadow-xl"
                                                        >
                                                            <RotateCcw className="w-5 h-5" />
                                                            Try Again
                                                        </button>
                                                        <button 
                                                            type="button" 
                                                            onClick={() => setCurrentStep(2)} 
                                                            className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 hover:shadow-xl"
                                                        >
                                                            Continue 
                                                            <ChevronRight className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="relative">
                                                <UploadCloud className="w-24 h-24 text-green-400 mx-auto animate-bounce" />
                                                <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-ping">
                                                    <Plus className="w-4 h-4 text-yellow-800" />
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <label htmlFor="file-upload" className="block cursor-pointer group">
                                                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 group-hover:shadow-3xl">
                                                        <Camera className="w-6 h-6" />
                                                        <span className="text-lg">Click to Upload Photo</span>
                                                        <Sparkles className="w-6 h-6 animate-pulse" />
                                                    </div>
                                                    <input 
                                                        id="file-upload" 
                                                        name="file-upload" 
                                                        type="file" 
                                                        onChange={(e) => handleImageFileChange(0, e.target.files[0])} 
                                                        className="hidden" 
                                                        accept="image/*" 
                                                    />
                                                </label>
                                                
                                                <div className="text-center space-y-2">
                                                    <p className="text-lg text-gray-600">
                                                        <strong>Or drag your photo here!</strong>
                                                    </p>
                                                    <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                                                        Take a clear photo of your product. Our AI will automatically write the name, description, and price for you!
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                    <Edit2 className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center animate-bounce">
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Review & Edit Details
                            </h2>
                            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                                Our AI filled everything for you! Feel free to make changes if needed.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Image preview */}
                            <div className="lg:order-2">
                                <div className="sticky top-8">
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 shadow-lg border border-gray-200">
                                        <div className="text-center space-y-4">
                                            <h3 className="text-lg font-bold text-gray-800">Your Product</h3>
                                            {formData.image && (
                                                <div className="relative inline-block">
                                                    <img 
                                                        src={formData.image} 
                                                        alt="Product" 
                                                        className="h-48 w-auto max-w-full object-contain rounded-2xl shadow-xl border-4 border-white transition-all duration-300 hover:scale-105" 
                                                    />
                                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                                        <Heart className="w-5 h-5 text-white animate-pulse" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Form fields */}
                            <div className="lg:order-1 space-y-6">
                                {/* Product Name */}
                                <div className="group">
                                    <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                            <Tag className="w-4 h-4 text-white" />
                                        </div>
                                        Product Name
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            name="name" 
                                            value={formData.name} 
                                            onChange={handleChange} 
                                            required 
                                            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-green-300" 
                                            placeholder="What do you call your product?" 
                                        />
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                            <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="group">
                                    <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-teal-500 rounded-full flex items-center justify-center">
                                            <MessageSquare className="w-4 h-4 text-white" />
                                        </div>
                                        Description
                                    </label>
                                    <div className="relative">
                                        <textarea 
                                            name="description" 
                                            value={formData.description} 
                                            onChange={handleChange} 
                                            rows="4" 
                                            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl resize-none group-hover:border-green-300" 
                                            placeholder="Tell people about your amazing product!" 
                                        />
                                        <div className="absolute right-4 bottom-4">
                                            <Sparkles className="w-5 h-5 text-green-400 animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="group">
                                    <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                            <DollarSign className="w-4 h-4 text-white" />
                                        </div>
                                        Price (₹)
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            name="price" 
                                            value={formData.price} 
                                            onChange={handleChange} 
                                            step="1" 
                                            required 
                                            className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-yellow-300" 
                                            placeholder="How much does it cost?"
                                        />
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">₹</div>
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                                            <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="group">
                                    <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                            <Star className="w-4 h-4 text-white" />
                                        </div>
                                        Tags
                                    </label>
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-4 transition-all duration-300 focus-within:ring-4 focus-within:ring-green-200 focus-within:border-green-500 shadow-lg hover:shadow-xl">
                                        <div className="flex flex-wrap gap-3 mb-4">
                                            {formData.tags.map((tag, index) => (
                                                <span 
                                                    key={index} 
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-green-400 to-emerald-500 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                                                >
                                                    <span>#{tag}</span>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))} 
                                                        className="w-5 h-5 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all duration-200"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input 
                                            type="text" 
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && e.target.value) {
                                                    e.preventDefault();
                                                    const newTag = e.target.value.trim().toLowerCase();
                                                    if (newTag && !formData.tags.includes(newTag)) {
                                                        setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                                                    }
                                                    e.target.value = '';
                                                }
                                            }} 
                                            className="w-full px-4 py-3 bg-white border-0 rounded-xl focus:outline-none text-lg placeholder-green-400" 
                                            placeholder="Add tags like 'handmade', 'organic'... (press Enter)" 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-8">
                        <div className="text-center space-y-4">
                            <div className="relative inline-block">
                                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                                    <Save className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                                    <Star className="w-5 h-5 text-yellow-800" />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                Final Details
                            </h2>
                            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
                                Just a few more details and you're ready to sell!
                            </p>
                        </div>

                        {/* Stock */}
                        <div className="group">
                            <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                    <PackageIcon className="w-4 h-4 text-white" />
                                </div>
                                How many do you have?
                            </label>
                            <input 
                                type="number" 
                                name="stock" 
                                value={formData.stock} 
                                onChange={handleChange} 
                                required 
                                min="0" 
                                className="w-full px-4 py-4 text-xl border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-green-300 text-center font-bold" 
                                placeholder="10"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Origin */}
                            <div className="group">
                                <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-white" />
                                    </div>
                                    Where is it made?
                                </label>
                                <input 
                                    type="text" 
                                    name="origin" 
                                    value={formData.origin} 
                                    onChange={handleChange} 
                                    className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-200 focus:border-red-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-red-300" 
                                    placeholder="India, Tamil Nadu..."
                                />
                            </div>

                            {/* Category */}
                            <div className="group">
                                <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                        <LinkIcon className="w-4 h-4 text-white" />
                                    </div>
                                    What type of product?
                                </label>
                                <select 
                                    name="category" 
                                    value={formData.category} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full px-4 py-4 text-lg border-2 border-gray-200 bg-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 shadow-lg hover:shadow-xl group-hover:border-green-300"
                                >
                                    <option value="">Choose category...</option>
                                    {categories.map(cat => (
                                        <option key={cat.path} value={cat.path}>
                                            {cat.display}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type */}
                            <div className="group">
                                <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-red-500 rounded-full flex items-center justify-center">
                                        <Award className="w-4 h-4 text-white" />
                                    </div>
                                    Special type?
                                </label>
                                <input 
                                    type="text" 
                                    name="type" 
                                    value={formData.type} 
                                    onChange={handleChange} 
                                    className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-yellow-200 focus:border-yellow-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-yellow-300" 
                                    placeholder="Handmade, Organic, Traditional..."
                                />
                            </div>

                            {/* Material */}
                            <div className="group">
                                <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-green-500 rounded-full flex items-center justify-center">
                                        <Leaf className="w-4 h-4 text-white" />
                                    </div>
                                    What's it made of?
                                </label>
                                <input 
                                    type="text" 
                                    name="material" 
                                    value={formData.material} 
                                    onChange={handleChange} 
                                    className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-teal-300" 
                                    placeholder="Cotton, Wood, Clay..."
                                />
                            </div>
                        </div>

                        {/* Eco Impact */}
                        <div className="group">
                            <label className="block text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                Eco-friendly impact?
                            </label>
                            <input 
                                type="text" 
                                name="impact" 
                                value={formData.impact} 
                                onChange={handleChange} 
                                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-200 focus:border-green-500 transition-all duration-300 bg-white shadow-lg hover:shadow-xl group-hover:border-green-300" 
                                placeholder="Zero waste, Recyclable, Biodegradable..."
                            />
                        </div>

                        {/* Special features */}
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-lg">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
                                    <Star className="w-6 h-6 text-yellow-500" />
                                    Make it special!
                                    <Star className="w-6 h-6 text-yellow-500" />
                                </h3>
                                <p className="text-gray-600 mt-2">Choose what makes your product stand out</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <label className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group">
                                    <input 
                                        type="checkbox" 
                                        name="is_featured" 
                                        checked={formData.is_featured} 
                                        onChange={handleChange} 
                                        className="w-6 h-6 text-green-600 rounded-lg focus:ring-4 focus:ring-green-200" 
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                            <Star className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-lg text-gray-800">Featured</span>
                                            <p className="text-sm text-gray-600">Show on homepage</p>
                                        </div>
                                    </div>
                                </label>
                                
                                <label className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-lg cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 group">
                                    <input 
                                        type="checkbox" 
                                        name="is_bestseller" 
                                        checked={formData.is_bestseller} 
                                        onChange={handleChange} 
                                        className="w-6 h-6 text-yellow-600 rounded-lg focus:ring-4 focus:ring-yellow-200" 
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                            <Award className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-lg text-gray-800">Best Seller</span>
                                            <p className="text-sm text-gray-600">Popular choice</p>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
            {/* Success/Error Messages */}
            {message.show && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 max-w-md w-full mx-4 ${
                    message.type === "error" ? "bg-red-500 text-white" : "bg-green-500 text-white"
                }`}>
                    {message.type === "error" ? 
                        <AlertCircle className="w-5 h-5 flex-shrink-0" /> : 
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                        <p className="font-medium">{message.type === "error" ? "Error" : "Success"}</p>
                        <p className="text-sm opacity-90 break-words">{message.text}</p>
                    </div>
                    <button 
                        onClick={() => setMessage({ show: false, type: "", text: "" })}
                        className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="max-w-4xl mx-auto p-3 sm:p-4 pb-24">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <Link 
                            to="/seller-dashboard"
                            className="inline-flex items-center gap-2 text-green-100 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className="font-medium">Back to Dashboard</span>
                        </Link>
                        
                        <button
                            type="button"
                            onClick={() => setShowPreview(!showPreview)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            <span className="hidden sm:inline">Preview</span>
                        </button>
                    </div>
                    
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            {isEditMode ? <Edit2 className="w-6 h-6" /> : <PlusSquare className="w-6 h-6" />}
                            <h1 className="text-2xl sm:text-3xl font-bold">
                                {isEditMode ? 'Edit Product' : 'Add New Product'}
                            </h1>
                        </div>
                        <p className="text-green-100">
                            {isEditMode ? `Modifying "${formData.name}"` : 'Create a new product listing with AI assistance'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {/* Progress Steps for non-edit mode */}
                {!isEditMode && (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 mb-8">
                        <div className="flex justify-between items-center relative">
                            {/* Progress line */}
                            <div className="absolute top-5 left-0 w-full h-1 bg-gray-200 rounded-full">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                ></div>
                            </div>

                            {[1, 2, 3].map((step) => (
                                <div key={step} className="relative z-10 text-center">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-500 shadow-lg ${
                                        currentStep >= step 
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white transform scale-110' 
                                            : 'bg-gray-200 text-gray-500'
                                    }`}>
                                        {step === 1 && <Camera className="w-6 h-6" />}
                                        {step === 2 && <Edit2 className="w-6 h-6" />}
                                        {step === 3 && <Save className="w-6 h-6" />}
                                    </div>
                                    <div className={`font-bold text-sm transition-all duration-300 ${currentStep >= step ? 'text-green-600' : 'text-gray-400'}`}>
                                        {step === 1 && "Upload"}
                                        {step === 2 && "Edit"}
                                        {step === 3 && "Finish"}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {isEditMode ? (
                        <div>
                            {/* Basic Information */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('basic')}
                                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Tag className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
                                            <p className="text-sm text-gray-600">Product name, description, category and pricing</p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedSections.basic ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedSections.basic && (
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100 space-y-4">
                                        {/* Product Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Tag size={14} className="mr-2 text-green-500" />
                                                Product Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                placeholder="Enter product name"
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <PackageIcon size={14} className="mr-2 text-green-500" />
                                                Description
                                            </label>
                                            <textarea
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors resize-none"
                                                placeholder="Describe your product in detail..."
                                            />
                                        </div>

                                        {/* Grid for smaller fields */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Tag size={14} className="mr-2 text-green-500" />
                                                    Category *
                                                </label>
                                                <select
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors bg-white"
                                                >
                                                    <option value="">Select category</option>
                                                    {categories.map(cat => (
                                                        <option key={cat.path} value={cat.path}>
                                                            {cat.display}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <DollarSign size={14} className="mr-2 text-green-500" />
                                                    Price (₹) *
                                                </label>
                                                <input
                                                    type="number"
                                                    name="price"
                                                    value={formData.price}
                                                    onChange={handleChange}
                                                    required
                                                    min="1"
                                                    step="0.01"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <PackageIcon size={14} className="mr-2 text-green-500" />
                                                    Stock Quantity *
                                                </label>
                                                <input
                                                    type="number"
                                                    name="stock"
                                                    value={formData.stock}
                                                    onChange={handleChange}
                                                    required
                                                    min="0"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        {/* Rating and Date */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Star size={14} className="mr-2 text-yellow-500" />
                                                    Product Rating
                                                </label>
                                                <div className="flex items-center space-x-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => handleRatingChange(star)}
                                                            className="p-1 hover:scale-110 transition-transform focus:outline-none"
                                                        >
                                                            {star <= formData.rating ? 
                                                                <AiFillStar className="text-yellow-400 text-xl" /> : 
                                                                <AiOutlineStar className="text-gray-300 text-xl hover:text-yellow-300" />
                                                            }
                                                        </button>
                                                    ))}
                                                    <span className="ml-2 text-sm text-gray-600">
                                                        ({formData.rating}/5)
                                                    </span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Calendar size={14} className="mr-2 text-gray-500" />
                                                    Added Date
                                                </label>
                                                <input
                                                    type="date"
                                                    name="added_date"
                                                    value={formData.added_date}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Tags */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                <Tag size={14} className="mr-2 text-green-500" />
                                                Tags
                                            </label>
                                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-3">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {formData.tags.map((tag, index) => (
                                                        <span 
                                                            key={index} 
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-500 text-white"
                                                        >
                                                            #{tag}
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))} 
                                                                className="w-4 h-4 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full flex items-center justify-center"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <input 
                                                    type="text" 
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && e.target.value) {
                                                            e.preventDefault();
                                                            const newTag = e.target.value.trim().toLowerCase();
                                                            if (newTag && !formData.tags.includes(newTag)) {
                                                                setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
                                                            }
                                                            e.target.value = '';
                                                        }
                                                    }} 
                                                    className="w-full px-3 py-2 bg-white border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" 
                                                    placeholder="Add tags (press Enter)..." 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Product Images */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('images')}
                                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Image className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Product Images</h2>
                                            <p className="text-sm text-gray-600">Upload up to 5 product photos</p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedSections.images ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedSections.images && (
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100">
                                        <p className="text-sm text-gray-500 mb-4">Add up to 5 images. The first image is the main image.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                            {[...Array(5)].map((_, index) => (
                                                <div key={index} className="p-3 border rounded-lg bg-white shadow-sm space-y-3">
                                                    <label className="block text-xs font-medium text-gray-600">
                                                        Image {index + 1} {index === 0 && "(Main)"}
                                                    </label>
                                                    
                                                    {/* Upload method selector */}
                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageMethodChange(index, 'url')}
                                                            className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                                                                imageUploadMethods[index] === 'url' 
                                                                    ? 'bg-green-600 text-white shadow-sm' 
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            <LinkIcon size={12} /> URL
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleImageMethodChange(index, 'file')}
                                                            className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                                                                imageUploadMethods[index] === 'file' 
                                                                    ? 'bg-green-600 text-white shadow-sm' 
                                                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                            }`}
                                                        >
                                                            <UploadCloud size={12} /> File
                                                        </button>
                                                    </div>

                                                    {/* URL input or File input */}
                                                    {imageUploadMethods[index] === 'url' ? (
                                                        <input
                                                            type="url"
                                                            value={formData.images[index] || ''}
                                                            onChange={(e) => handleImageUrlChange(index, e.target.value)}
                                                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                                            placeholder="https://example.com/image.jpg"
                                                        />
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                onChange={(e) => handleImageFileChange(index, e.target.files[0])}
                                                                className="w-full text-xs text-gray-700 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                                            />
                                                            {imageFiles[index] && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleImageFileChange(index, null)}
                                                                    className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                                                                >
                                                                    <X size={10} /> Clear
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Upload progress */}
                                                    {isUploading[index] && (
                                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                            <div 
                                                                className="bg-green-600 h-1.5 rounded-full transition-all duration-300" 
                                                                style={{ width: `${uploadProgress[index]}%` }}
                                                            ></div>
                                                        </div>
                                                    )}

                                                    {/* Image preview */}
                                                    {(imageFiles[index] || formData.images[index]) && (
                                                        <div className="relative">
                                                            <img
                                                                src={imageFiles[index] ? URL.createObjectURL(imageFiles[index]) : formData.images[index]}
                                                                alt={`Preview ${index + 1}`}
                                                                className="h-20 w-full object-cover rounded-lg border"
                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                onLoad={(e) => { e.target.style.display = 'block'; }}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImage(index)}
                                                                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Details */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('details')}
                                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <MapPin className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Additional Details</h2>
                                            <p className="text-sm text-gray-600">Material, origin, and other information</p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedSections.details ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedSections.details && (
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100 space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Award size={14} className="mr-2 text-yellow-500" />
                                                    Material
                                                </label>
                                                <input
                                                    type="text"
                                                    name="material"
                                                    value={formData.material}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="e.g., Cotton, Bamboo"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <MapPin size={14} className="mr-2 text-teal-500" />
                                                    Origin
                                                </label>
                                                <input
                                                    type="text"
                                                    name="origin"
                                                    value={formData.origin}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="e.g., Gujarat, Tamil Nadu"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Award size={14} className="mr-2 text-green-500" />
                                                    Type/Style
                                                </label>
                                                <input
                                                    type="text"
                                                    name="type"
                                                    value={formData.type}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="e.g., Handmade, Traditional"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                                    <Leaf size={14} className="mr-2 text-green-500" />
                                                    Environmental Impact
                                                </label>
                                                <input
                                                    type="text"
                                                    name="impact"
                                                    value={formData.impact}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                                    placeholder="e.g., Zero waste, Sustainable"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Product Reviews */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('reviews')}
                                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <MessageSquare className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Product Reviews</h2>
                                            <p className="text-sm text-gray-600">
                                                Add customer reviews ({formData.reviews.length} of 10)
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedSections.reviews ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedSections.reviews && (
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100 space-y-4">
                                        <p className="text-sm text-gray-500">Add or remove customer reviews. Maximum of 10 reviews.</p>
                                        
                                        {formData.reviews.map((review, index) => (
                                            <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                                <textarea
                                                    value={review}
                                                    onChange={(e) => handleReviewChange(index, e.target.value)}
                                                    rows="2"
                                                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none resize-none"
                                                    placeholder={`Enter customer review ${index + 1}...`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => removeReview(index)}
                                                    className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors flex-shrink-0"
                                                    aria-label="Remove review"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        
                                        {formData.reviews.length < 10 && (
                                            <button
                                                type="button"
                                                onClick={addReview}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                                            >
                                                <Plus size={16} />
                                                Add New Review
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Product Features */}
                            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 mb-6">
                                <button
                                    type="button"
                                    onClick={() => toggleSection('features')}
                                    className="w-full p-4 sm:p-6 flex items-center justify-between text-left hover:bg-green-50/50 transition-colors rounded-t-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <Star className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-semibold text-gray-900">Special Features</h2>
                                            <p className="text-sm text-gray-600">Highlight your product's unique qualities</p>
                                        </div>
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-gray-400 transform transition-transform ${expandedSections.features ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {expandedSections.features && (
                                    <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-gray-100">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    name="is_featured"
                                                    checked={formData.is_featured}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                                                />
                                                <div>
                                                    <span className="font-medium text-gray-900 group-hover:text-green-600">Featured Product</span>
                                                    <p className="text-sm text-gray-600">Show in featured products section</p>
                                                </div>
                                            </label>

                                            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    name="is_bestseller"
                                                    checked={formData.is_bestseller}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                                                />
                                                <div>
                                                    <span className="font-medium text-gray-900 group-hover:text-green-600">Best Seller</span>
                                                    <p className="text-sm text-gray-600">Mark as popular with customers</p>
                                                </div>
                                            </label>

                                            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    name="has_special_deal"
                                                    checked={formData.has_special_deal}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                                                />
                                                <div>
                                                    <span className="font-medium text-gray-900 group-hover:text-green-600">Special Deal</span>
                                                    <p className="text-sm text-gray-600">Display special discount badge</p>
                                                </div>
                                            </label>

                                            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    name="is_fast_delivery"
                                                    checked={formData.is_fast_delivery}
                                                    onChange={handleChange}
                                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                                                />
                                                <div>
                                                    <span className="font-medium text-gray-900 group-hover:text-green-600">Fast Delivery</span>
                                                    <p className="text-sm text-gray-600">Offer quick shipping option</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
                            {renderStepContent()}
                            
                            {/* Navigation Buttons */}
                            <div className="flex justify-between items-center pt-12 border-t border-gray-100">
                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(prev => prev - 1)}
                                        className="flex items-center gap-3 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                        <span>Go Back</span>
                                    </button>
                                )}

                                <div className="ml-auto">
                                    {currentStep < 3 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (currentStep === 1 && !formData.image) {
                                                    showMessage("error", "Please upload a photo first!");
                                                    return;
                                                }
                                                if (currentStep === 2 && (!formData.name || !formData.price || !formData.description)) {
                                                    showMessage("error", "Please fill out the required fields!");
                                                    return;
                                                }
                                                setCurrentStep(prev => prev + 1);
                                            }}
                                            disabled={loadingAI}
                                            className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl ${
                                                loadingAI 
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:shadow-2xl'
                                            }`}
                                        >
                                            <span>Continue</span>
                                            <ChevronRight className="w-6 h-6" />
                                            <Sparkles className="w-5 h-5 animate-pulse" />
                                        </button>
                                    )}

                                    {currentStep === 3 && (
                                        <button
                                            type="submit"
                                            disabled={saving || loadingAI}
                                            className={`flex items-center justify-center gap-4 px-12 py-4 rounded-2xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-xl w-full max-w-md ${
                                                saving || loadingAI 
                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white hover:shadow-2xl'
                                            }`}
                                        >
                                            {(saving || loadingAI) ? (
                                                <>
                                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Processing...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-6 h-6" />
                                                    <span>Publish Product</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submit Button for Edit Mode */}
                    {isEditMode && (
                        <div className="flex items-center justify-center pt-6">
                            <button
                                type="submit"
                                disabled={saving || isUploading.some(Boolean)}
                                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-200 transform ${
                                    saving || isUploading.some(Boolean)
                                        ? 'bg-gray-400 cursor-not-allowed scale-95'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95'
                                }`}
                            >
                                {(saving || isUploading.some(Boolean)) ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        {isUploading.some(Boolean) ? 'Uploading Images...' : 'Saving Product...'}
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Update Product
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>

                {/* Preview Modal */}
                {showPreview && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Product Preview</h3>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="space-y-4">
                                    {formData.image && (
                                        <img 
                                            src={formData.image} 
                                            alt={formData.name}
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                    )}
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">{formData.name || 'Product Name'}</h4>
                                        <p className="text-2xl font-semibold text-green-600 mt-1">₹{formData.price || '0'}</p>
                                    </div>
                                    {formData.description && (
                                        <p className="text-gray-600">{formData.description}</p>
                                    )}
                                    {formData.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {formData.tags.map((tag, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {formData.material && (
                                            <div>
                                                <span className="font-medium">Material:</span> {formData.material}
                                            </div>
                                        )}
                                        {formData.origin && (
                                            <div>
                                                <span className="font-medium">Origin:</span> {formData.origin}
                                            </div>
                                        )}
                                        {formData.stock > 0 && (
                                            <div>
                                                <span className="font-medium">Stock:</span> {formData.stock} available
                                            </div>
                                        )}
                                        {formData.rating > 0 && (
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">Rating:</span>
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star 
                                                            key={i} 
                                                            className={`w-4 h-4 ${i < formData.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {formData.reviews.filter(r => r.trim()).length > 0 && (
                                        <div>
                                            <h5 className="font-medium mb-2">Reviews:</h5>
                                            <div className="space-y-2">
                                                {formData.reviews.filter(r => r.trim()).map((review, i) => (
                                                    <p key={i} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                                        "{review}"
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SellerEditProduct;