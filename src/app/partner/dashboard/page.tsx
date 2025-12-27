'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { Eye, Crown, X, Pencil, Trash2, MessageSquare } from 'lucide-react';

interface ProductVariant {
  id: number;
  packingVolume: string;
  companyPrice: number | null;
  dealerPrice: number | null;
  customerPrice: number;
  inventory: number;
}

interface Product {
  id: number;
  productName: string;
  genericName: string | null;
  productLink: string | null;
  category: string;
  subCategory: string;
  description: string | null;
  dosage: string | null;
  isActive: boolean;
  outofstock: boolean;
  image?: {
    url: string;
    alt: string;
  };
  company?: {
    id: number;
    companyName: string;
  };
  variants?: ProductVariant[];
}

interface Partner {
  id: number;
  partnerName: string;
  partnerEmail: string;
  shopName: string;
  partnerMobileNumber: string;
  cityName: string;
  fullAddress: string;
  state: string;
  specialization: string;
  partnerType: string;
  isPremium: boolean;
  referralCode?: string | null;
  walletBalance: number;
  products?: Product[];
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'profile' | 'password' | 'wallet'>('products');

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    partnerName: '',
    partnerEmail: '',
    shopName: '',
    partnerMobileNumber: '',
    cityName: '',
    state: '',
    fullAddress: '',
    specialization: '',
    partnerType: '',
    gender: '',
    qualificationDegree: '',
    rvmpNumber: '',
    zipcode: '',
    areaTown: '',
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Premium upgrade state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState('');
  const [upgradeScreenshot, setUpgradeScreenshot] = useState<File | null>(null);
  const [upgradeScreenshotPreview, setUpgradeScreenshotPreview] = useState<string | null>(null);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // Wallet/Referral state
  const [generatingCode, setGeneratingCode] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalData, setWithdrawalData] = useState({
    amount: '',
    accountTitle: '',
    accountNumber: '',
    bankName: '',
    paymentMethod: '',
  });
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  // Product edit/delete state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [editProductData, setEditProductData] = useState({
    productName: '',
    genericName: '',
    description: '',
    dosage: '',
    isActive: true,
    outofstock: false,
  });
  const [editVariants, setEditVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (partner) {
      setProfileData({
        partnerName: partner.partnerName || '',
        partnerEmail: partner.partnerEmail || '',
        shopName: partner.shopName || '',
        partnerMobileNumber: partner.partnerMobileNumber || '',
        cityName: partner.cityName || '',
        state: partner.state || '',
        fullAddress: partner.fullAddress || '',
        specialization: partner.specialization || '',
        partnerType: partner.partnerType || '',
        gender: (partner as any).gender || '',
        qualificationDegree: (partner as any).qualificationDegree || '',
        rvmpNumber: (partner as any).rvmpNumber || '',
        zipcode: (partner as any).zipcode || '',
        areaTown: (partner as any).areaTown || '',
      });
    }
  }, [partner]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/partner/check-auth');
      const data = await response.json();

      if (response.ok && data.authenticated) {
        setPartner(data.partner);
      } else {
        router.push('/partner/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/partner/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/partner/logout', { method: 'POST' });
      router.push('/partner/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/partner/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpgradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!upgradePaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (!upgradeScreenshot) {
      toast.error('Please upload payment screenshot');
      return;
    }

    setUpgradeLoading(true);

    try {
      const formData = new FormData();
      formData.append('paymentMethod', upgradePaymentMethod);
      formData.append('paymentScreenshot', upgradeScreenshot);

      const response = await fetch('/api/partner/premium-request', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Premium partnership request submitted successfully!');
        setShowUpgradeModal(false);
        setUpgradePaymentMethod('');
        setUpgradeScreenshot(null);
        setUpgradeScreenshotPreview(null);
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleGenerateReferralCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await fetch('/api/partner/generate-referral-code', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Referral code generated successfully!');
        // Refresh partner data
        checkAuth();
      } else {
        toast.error(data.error || 'Failed to generate referral code');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!withdrawalData.amount || !withdrawalData.accountTitle || !withdrawalData.accountNumber ||
        !withdrawalData.bankName || !withdrawalData.paymentMethod) {
      toast.error('All fields are required');
      return;
    }

    const amount = parseFloat(withdrawalData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (partner && amount > partner.walletBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setWithdrawalLoading(true);

    try {
      const response = await fetch('/api/partner/withdrawal-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          accountTitle: withdrawalData.accountTitle,
          accountNumber: withdrawalData.accountNumber,
          bankName: withdrawalData.bankName,
          paymentMethod: withdrawalData.paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Withdrawal request submitted successfully!');
        setShowWithdrawalModal(false);
        setWithdrawalData({
          amount: '',
          accountTitle: '',
          accountNumber: '',
          bankName: '',
          paymentMethod: '',
        });
      } else {
        toast.error(data.error || 'Failed to submit request');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const updateData: any = { ...profileData };

      // Handle image if selected
      if (profileImage) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            updateData.image = reader.result as string;
            await sendProfileUpdate(updateData);
          } catch (error) {
            toast.error('Failed to update profile');
            setProfileLoading(false);
          }
        };
        reader.onerror = () => {
          toast.error('Failed to read image file');
          setProfileLoading(false);
        };
        reader.readAsDataURL(profileImage);
      } else {
        await sendProfileUpdate(updateData);
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      setProfileLoading(false);
    }
  };

  const sendProfileUpdate = async (updateData: any) => {
    try {
      const response = await fetch('/api/partner/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully!');
        setIsEditingProfile(false);
        setProfileImage(null);
        setProfileImagePreview(null);
        // Refresh partner data
        checkAuth();
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductData({
      productName: product.productName || '',
      genericName: product.genericName || '',
      description: product.description || '',
      dosage: product.dosage || '',
      isActive: product.isActive,
      outofstock: product.outofstock,
    });
    setEditVariants(product.variants || []);
    setShowEditProductModal(true);
  };

  const handleProductUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    setProductLoading(true);

    try {
      const formData = new FormData();
      formData.append('productName', editProductData.productName);
      formData.append('genericName', editProductData.genericName);
      formData.append('description', editProductData.description);
      formData.append('dosage', editProductData.dosage);
      formData.append('isActive', String(editProductData.isActive));
      formData.append('outofstock', String(editProductData.outofstock));

      // Add variants
      editVariants.forEach((variant, index) => {
        formData.append(`variants[${index}][packingVolume]`, variant.packingVolume);
        formData.append(`variants[${index}][customerPrice]`, String(variant.customerPrice));
        formData.append(`variants[${index}][inventory]`, String(variant.inventory));
        if (variant.companyPrice !== null && variant.companyPrice !== undefined) {
          formData.append(`variants[${index}][companyPrice]`, String(variant.companyPrice));
        }
        if (variant.dealerPrice !== null && variant.dealerPrice !== undefined) {
          formData.append(`variants[${index}][dealerPrice]`, String(variant.dealerPrice));
        }
      });

      const response = await fetch(`/api/product?id=${editingProduct.id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        toast.success('Product updated successfully!');
        setShowEditProductModal(false);
        setEditingProduct(null);
        checkAuth(); // Refresh data
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update product');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setProductLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProductId) return;

    setProductLoading(true);

    try {
      const response = await fetch(`/api/product?id=${deletingProductId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Product deleted successfully!');
        setShowDeleteConfirm(false);
        setDeletingProductId(null);
        checkAuth(); // Refresh data
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setProductLoading(false);
    }
  };

  const handleVariantChange = (index: number, field: keyof ProductVariant, value: any) => {
    const newVariants = [...editVariants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setEditVariants(newVariants);
  };

  const addVariant = () => {
    setEditVariants([...editVariants, {
      id: Date.now(),
      packingVolume: '',
      companyPrice: null,
      dealerPrice: null,
      customerPrice: 0,
      inventory: 0,
    }]);
  };

  const removeVariant = (index: number) => {
    const newVariants = editVariants.filter((_, i) => i !== index);
    setEditVariants(newVariants);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.jpg"
                alt="Animal Wellness Logo"
                width={120}
                height={40}
                className="object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Partner Dashboard</h1>
                <p className="text-xs text-gray-500">
                  Welcome, {partner.partnerName}
                  {partner.isPremium && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      <Crown className="w-3 h-3 mr-1" />
                      Premium
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!partner.isPremium && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Premium
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Medical Records Section */}
        {partner.partnerType === 'Veterinarian (Clinic, Hospital, Consultant)' && (
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Medical Records</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Prescriptions Card */}
              <button
                onClick={() => router.push('/partner/dashboard/manageprescriptionfrom')}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-green-500 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-500 transition-colors">
                    <svg className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">Prescriptions</h3>
                    <p className="text-sm text-gray-500">View and manage prescriptions</p>
                  </div>
                </div>
              </button>

              {/* Consultation Fees Card */}
              <button
                onClick={() => router.push('/partner/dashboard/additional-consultation-fees')}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-blue-500 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-500 transition-colors">
                    <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Consultation Fees</h3>
                    <p className="text-sm text-gray-500">Track additional fees</p>
                  </div>
                </div>
              </button>

              {/* History Forms Card */}
              <button
                onClick={() => router.push('/partner/dashboard/managehistoryform')}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-purple-500 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-500 transition-colors">
                    <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">History Forms</h3>
                    <p className="text-sm text-gray-500">View patient history records</p>
                  </div>
                </div>
              </button>

              {/* Vet Reviews Card */}
              <button
                onClick={() => router.push('/partner/dashboard/vet-reviews')}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all hover:border-yellow-500 text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 rounded-lg group-hover:bg-yellow-500 transition-colors">
                    <svg className="w-6 h-6 text-yellow-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">Patient Reviews</h3>
                    <p className="text-sm text-gray-500">View and manage reviews</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('products')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'products'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Products ({partner.products?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'profile'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'password'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Change Password
              </button>
              <button
                onClick={() => setActiveTab('wallet')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'wallet'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Wallet & Referrals
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Products Tab */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-green-600">My Products</h2>
                  <button
                    onClick={() => router.push('/partner/dashboard/reviews')}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Manage Reviews
                  </button>
                </div>

                {partner.products && partner.products.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variants</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {partner.products.map((product) => (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap">
                              {product.image ? (
                                <div className="relative w-16 h-16">
                                  <Image
                                    src={product.image.url}
                                    alt={product.image.alt}
                                    fill
                                    className="rounded object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                  No image
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium text-gray-900">{product.productName}</p>
                                {product.genericName && (
                                  <p className="text-sm text-gray-500">{product.genericName}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.company?.companyName || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm">
                                <p className="text-gray-900">{product.category}</p>
                                <p className="text-gray-500">{product.subCategory}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                {product.variants && product.variants.length > 0 ? (
                                  product.variants.map((variant, index) => (
                                    <div key={variant.id || index} className="text-sm">
                                      <span className="font-medium text-gray-900">{variant.packingVolume}</span>
                                      <span className="text-gray-500 ml-2">
                                        Rs. {variant.customerPrice} | Stock: {variant.inventory}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-sm text-gray-500">No variants</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {product.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  !product.outofstock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {!product.outofstock ? 'In stock' : 'Out of stock'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex gap-2 justify-end">
                                {product.productLink && (
                                  <a
                                    href={product.productLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-900"
                                    title="View Product"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                )}
                                <button
                                  onClick={() => handleEditProduct(product)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Edit Product"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingProductId(product.id);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 text-lg">No products assigned yet</p>
                    <p className="text-gray-400 text-sm mt-2">Contact admin to add products to your account</p>
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-green-600">Profile Information</h2>
                  {!isEditingProfile && (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditingProfile ? (
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="partnerName" className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          id="partnerName"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.partnerName}
                          onChange={(e) => setProfileData({ ...profileData, partnerName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="partnerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="partnerEmail"
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.partnerEmail}
                          onChange={(e) => setProfileData({ ...profileData, partnerEmail: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="shopName" className="block text-sm font-medium text-gray-700 mb-1">
                          Shop Name
                        </label>
                        <input
                          type="text"
                          id="shopName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.shopName}
                          onChange={(e) => setProfileData({ ...profileData, shopName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="partnerMobileNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="tel"
                          id="partnerMobileNumber"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.partnerMobileNumber}
                          onChange={(e) => setProfileData({ ...profileData, partnerMobileNumber: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="partnerType" className="block text-sm font-medium text-gray-700 mb-1">
                          Partner Type
                        </label>
                        <input
                          type="text"
                          id="partnerType"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.partnerType}
                          onChange={(e) => setProfileData({ ...profileData, partnerType: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1">
                          Specialization
                        </label>
                        <input
                          type="text"
                          id="specialization"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.specialization}
                          onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="qualificationDegree" className="block text-sm font-medium text-gray-700 mb-1">
                          Qualification Degree
                        </label>
                        <input
                          type="text"
                          id="qualificationDegree"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.qualificationDegree}
                          onChange={(e) => setProfileData({ ...profileData, qualificationDegree: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="rvmpNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          RVMP/License/Registration No.
                        </label>
                        <input
                          type="text"
                          id="rvmpNumber"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.rvmpNumber}
                          onChange={(e) => setProfileData({ ...profileData, rvmpNumber: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="cityName" className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          id="cityName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.cityName}
                          onChange={(e) => setProfileData({ ...profileData, cityName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          id="state"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.state}
                          onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="zipcode" className="block text-sm font-medium text-gray-700 mb-1">
                          Zipcode
                        </label>
                        <input
                          type="text"
                          id="zipcode"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.zipcode}
                          onChange={(e) => setProfileData({ ...profileData, zipcode: e.target.value })}
                        />
                      </div>

                      <div>
                        <label htmlFor="areaTown" className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          id="areaTown"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.areaTown}
                          onChange={(e) => setProfileData({ ...profileData, areaTown: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="fullAddress" className="block text-sm font-medium text-gray-700 mb-1">
                          Address/Map Link
                        </label>
                        <input
                          type="text"
                          id="fullAddress"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          value={profileData.fullAddress}
                          onChange={(e) => setProfileData({ ...profileData, fullAddress: e.target.value })}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-1">
                          Profile Image
                        </label>
                        <input
                          type="file"
                          id="profileImage"
                          accept="image/*"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setProfileImage(file);
                            if (file) {
                              setProfileImagePreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                        {profileImagePreview && (
                          <div className="mt-3">
                            <Image
                              src={profileImagePreview}
                              alt="Profile Preview"
                              width={100}
                              height={100}
                              className="rounded-lg border border-gray-300 object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileImage(null);
                          setProfileImagePreview(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={profileLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {profileLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.partnerName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.partnerEmail || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Shop Name</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.shopName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.partnerMobileNumber || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner Type</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.partnerType || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Specialization</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.specialization || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.cityName || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">State</label>
                      <p className="mt-1 text-sm text-gray-900">{partner.state || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6 max-w-md">
                <h2 className="text-2xl font-bold text-green-600">Change Password</h2>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password * (min. 6 characters)
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {passwordLoading ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Wallet & Referrals Tab */}
            {activeTab === 'wallet' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-green-600">Wallet & Referrals</h2>

                {/* Wallet Balance */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                  <h3 className="text-lg font-semibold mb-2">Wallet Balance</h3>
                  <p className="text-4xl font-bold mb-4">Rs. {partner?.walletBalance || 0}</p>
                  <button
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={!partner?.walletBalance || partner.walletBalance <= 0}
                    className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                  >
                    Request Withdrawal
                  </button>
                </div>

                {/* Referral Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Referral Program</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Earn commissions when partners you refer upgrade to premium:
                  </p>
                  <ul className="text-sm text-gray-700 mb-6 space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>500 PKR</strong> if you're a normal partner</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>1000 PKR</strong> if you're a premium partner</span>
                    </li>
                  </ul>

                  {partner?.referralCode ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Referral Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={partner.referralCode}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          />
                          <button
                            onClick={() => copyToClipboard(partner.referralCode!)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Your Referral Link</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={`${window.location.origin}/addPartner?ref=${partner.referralCode}`}
                            readOnly
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(`${window.location.origin}/addPartner?ref=${partner.referralCode}`)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600 mb-4">You haven't generated a referral code yet.</p>
                      <button
                        onClick={handleGenerateReferralCode}
                        disabled={generatingCode}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingCode ? 'Generating...' : 'Generate Referral Code'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Premium Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Upgrade to Premium Partnership
              </h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleUpgradeSubmit} className="p-6 space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">Premium Benefits:</h4>
                <ul className="list-disc list-inside text-sm text-yellow-800 space-y-1">
                  <li>Featured placement in partner listings</li>
                  <li>Priority customer support</li>
                  <li>Enhanced profile visibility</li>
                  <li>Access to premium marketing tools</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment Information</h4>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-1">Jazz Cash:</p>
                    <p>0300-8424741 - Muhammad Fiaz Qamar</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-1">Easypaisa:</p>
                    <p>03354145431 - Ghazala Yasmeen</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium mb-1">Bank Alfalah:</p>
                    <p>ZAIDIS INTERNATIONAL</p>
                    <p>Account: 01531002450497</p>
                    <p>IBAN: PK82ALFH0153001002450497</p>
                    <p>Swift code: ALFHPKKAXXX</p>
                    <p>Chauburji Branch, Lahore - Branch Code 0153</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Payment Method *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  value={upgradePaymentMethod}
                  onChange={(e) => setUpgradePaymentMethod(e.target.value)}
                >
                  <option value="">Choose payment method</option>
                  <option value="Jazz cash 0300-8424741 Muhammad Fiaz Qamar">Jazz Cash</option>
                  <option value="Easypaisa 03354145431 Ghazala Yasmeen">Easypaisa</option>
                  <option value="Bank Alfalah: ZAIDIS INTERNATIONAL: 01531002450497">Bank Alfalah</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Payment Screenshot *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUpgradeScreenshot(file);
                    if (file) {
                      setUpgradeScreenshotPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                {upgradeScreenshotPreview && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Preview:</p>
                    <div className="relative w-full max-w-md">
                      <Image
                        src={upgradeScreenshotPreview}
                        alt="Payment Screenshot Preview"
                        width={400}
                        height={300}
                        className="rounded-lg border border-gray-300"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After submitting your request, our admin team will review your payment and activate your premium membership within 24-48 hours.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upgradeLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {upgradeLoading ? 'Submitting...' : (
                    <>
                      <Crown className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Request Withdrawal</h3>
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleWithdrawalSubmit} className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Available Balance:</strong> Rs. {partner?.walletBalance || 0}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Withdrawal Amount (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={partner?.walletBalance || 0}
                  step="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={withdrawalData.amount}
                  onChange={(e) => setWithdrawalData({ ...withdrawalData, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={withdrawalData.paymentMethod}
                  onChange={(e) => setWithdrawalData({ ...withdrawalData, paymentMethod: e.target.value })}
                >
                  <option value="">Choose payment method</option>
                  <option value="jazzcash">JazzCash</option>
                  <option value="easypaisa">EasyPaisa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Title *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={withdrawalData.accountTitle}
                  onChange={(e) => setWithdrawalData({ ...withdrawalData, accountTitle: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={withdrawalData.accountNumber}
                  onChange={(e) => setWithdrawalData({ ...withdrawalData, accountNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., HBL, UBL, or JazzCash, EasyPaisa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  value={withdrawalData.bankName}
                  onChange={(e) => setWithdrawalData({ ...withdrawalData, bankName: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Your withdrawal request will be reviewed by admin. Once approved, the amount will be transferred to your account.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawalLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {withdrawalLoading ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Edit Product</h3>
              <button
                onClick={() => {
                  setShowEditProductModal(false);
                  setEditingProduct(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleProductUpdate} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={editProductData.productName}
                    onChange={(e) => setEditProductData({ ...editProductData, productName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Generic Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={editProductData.genericName}
                    onChange={(e) => setEditProductData({ ...editProductData, genericName: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={editProductData.description}
                    onChange={(e) => setEditProductData({ ...editProductData, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dosage
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    value={editProductData.dosage}
                    onChange={(e) => setEditProductData({ ...editProductData, dosage: e.target.value })}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editProductData.isActive}
                      onChange={(e) => setEditProductData({ ...editProductData, isActive: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editProductData.outofstock}
                      onChange={(e) => setEditProductData({ ...editProductData, outofstock: e.target.checked })}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Out of Stock</span>
                  </label>
                </div>
              </div>

              {/* Variants Section */}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-md font-semibold text-gray-900">Product Variants</h4>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="px-3 py-1 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg"
                  >
                    Add Variant
                  </button>
                </div>

                <div className="space-y-4">
                  {editVariants.map((variant, index) => (
                    <div key={variant.id || index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="text-sm font-medium text-gray-700">Variant {index + 1}</h5>
                        {editVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeVariant(index)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Packing Volume *
                          </label>
                          <input
                            type="text"
                            required
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={variant.packingVolume}
                            onChange={(e) => handleVariantChange(index, 'packingVolume', e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Customer Price (PKR) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={variant.customerPrice}
                            onChange={(e) => handleVariantChange(index, 'customerPrice', parseFloat(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Inventory *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={variant.inventory}
                            onChange={(e) => handleVariantChange(index, 'inventory', parseInt(e.target.value))}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Company Price (PKR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={variant.companyPrice || ''}
                            onChange={(e) => handleVariantChange(index, 'companyPrice', e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Dealer Price (PKR)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                            value={variant.dealerPrice || ''}
                            onChange={(e) => handleVariantChange(index, 'dealerPrice', e.target.value ? parseFloat(e.target.value) : null)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {productLoading ? 'Updating...' : 'Update Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingProductId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete this product? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingProductId(null);
                }}
                disabled={productLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={productLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {productLoading ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
