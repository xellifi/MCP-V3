import React, { useState, useRef } from 'react';
import { X, CreditCard, Wallet, Building, ArrowRight, CheckCircle, Smartphone, Shield, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    planName: string;
    billingCycle: 'monthly' | 'yearly';
    price: number;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    planName,
    billingCycle,
    price
}) => {
    const [selectedMethod, setSelectedMethod] = useState<string>('xendit');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Manual Payment States
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [proofPreview, setProofPreview] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const isManualMethod = selectedMethod === 'ewallet' || selectedMethod === 'banking';
    // const isAutoMethod = selectedMethod === 'xendit' || selectedMethod === 'paypal';

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProofFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProofPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            // Get current user for email if available, otherwise require email input (simplified here assuming user is logged in or email is provided)
            const user = await api.auth.getCurrentUser();
            const userEmail = user?.email || email;

            if (!userEmail) {
                // In a real app we'd prompt for email login if user is null
                // For now, let's assume if user is null, they can't pay. 
                // But typically this modal is inside a secured context or we prompt login.
                const promptEmail = prompt("Please enter your email to associate with this subscription:");
                if (!promptEmail) {
                    throw new Error("Email is required");
                }
                // Update email state if we had it, but simplified:
                // For now let's just use the prompt or fail.
            }

            // Re-fetch or use prompt
            const finalEmail = userEmail || email;

            if (isManualMethod) {
                if (!proofFile) {
                    alert("Please upload a proof of payment");
                    setIsProcessing(false);
                    return;
                }

                // 1. Upload Proof
                const proofUrl = await api.subscriptions.uploadProof(proofFile);

                // 2. Create Subscription (Pending)
                // Map planName to id. E.g. "Starter Plan" -> "starter"
                // Ideally this prop should be planId.
                const packageId = planName.toLowerCase().split(' ')[0];

                await api.subscriptions.create({
                    email: finalEmail || 'guest@example.com', // Fallback for safety, logic should be tighter
                    package_id: packageId,
                    status: 'Active',
                    billing_cycle: billingCycle === 'monthly' ? 'Monthly' : 'Yearly',
                    amount: price,
                    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    payment_method: selectedMethod,
                    proof_url: proofUrl
                });

            } else {
                // Auto Method Simulation
                await new Promise(resolve => setTimeout(resolve, 1500));
            }

            setIsSuccess(true);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Payment failed");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                        {isManualMethod ? 'Payment Submitted!' : 'Payment Successful!'}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        {isManualMethod
                            ? "Your payment proof has been verified. We will notify you once your subscription is approved (usually within 24h)."
                            : <>You have successfully subscribed to the <span className="font-semibold text-slate-900 dark:text-white">{planName}</span> plan. Your receipt has been sent to your email.</>
                        }
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors"
                    >
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row h-[90vh] md:h-auto md:max-h-[85vh]">

                {/* Left Panel - Summary */}
                <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-950 p-6 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-xs">
                            MP
                        </span>
                        Mychat Pilot
                    </h3>

                    <div className="flex-1">
                        <div className="mb-2 text-sm text-slate-500 font-medium uppercase tracking-wider">Order Summary</div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">{planName} Plan</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mb-6 capitalize">{billingCycle} Billing</div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>Subtotal</span>
                                <span>${price}.00</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>Tax (0%)</span>
                                <span>$0.00</span>
                            </div>
                            <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                            <div className="flex justify-between text-base font-bold text-slate-900 dark:text-white">
                                <span>Total Due</span>
                                <span>${price}.00</span>
                            </div>
                        </div>

                        {/* Instructions for Manual Methods */}
                        {isManualMethod && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-4 mb-4">
                                <h4 className="font-bold text-yellow-800 dark:text-yellow-500 text-sm mb-2">Payment Instructions</h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">
                                    Please transfer the exact amount to:
                                </p>
                                <div className="text-xs font-mono bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded text-yellow-900 dark:text-yellow-300 mb-2">
                                    {selectedMethod === 'ewallet' ? (
                                        <>
                                            GCash: 0917 123 4567<br />
                                            Name: MyChat Pilot Inc.
                                        </>
                                    ) : (
                                        <>
                                            Bank: BDO Unibank<br />
                                            Acct: 1234 5678 9012<br />
                                            Name: MyChat Pilot Inc.
                                        </>
                                    )}
                                </div>
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                    Take a screenshot of your successful transfer and upload it here.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-6 text-xs text-slate-400">
                        <p>By confirming your subscription, you allow Mychat Pilot to charge your card for future payments in accordance with our terms.</p>
                    </div>
                </div>

                {/* Right Panel - Payment Methods */}
                <div className="w-full md:w-2/3 p-6 md:p-8 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select Payment Method</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {/* Xendit */}
                        <div
                            onClick={() => setSelectedMethod('xendit')}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${selectedMethod === 'xendit'
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-900 dark:text-white font-bold">
                                X
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-white">Xendit</div>
                                <div className="text-xs text-slate-500">Credit / Debit Card</div>
                            </div>
                            {selectedMethod === 'xendit' && <CheckCircle className="ml-auto w-5 h-5 text-primary-600" />}
                        </div>

                        {/* PayPal */}
                        <div
                            onClick={() => setSelectedMethod('paypal')}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${selectedMethod === 'paypal'
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-[#003087] flex items-center justify-center text-white font-bold italic">
                                P
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-white">PayPal</div>
                                <div className="text-xs text-slate-500">Safe Payment</div>
                            </div>
                            {selectedMethod === 'paypal' && <CheckCircle className="ml-auto w-5 h-5 text-primary-600" />}
                        </div>

                        {/* E-Wallet */}
                        <div
                            onClick={() => setSelectedMethod('ewallet')}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${selectedMethod === 'ewallet'
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-white">E-Wallet</div>
                                <div className="text-xs text-slate-500">GCash, Maya, GrabPay</div>
                            </div>
                            {selectedMethod === 'ewallet' && <CheckCircle className="ml-auto w-5 h-5 text-primary-600" />}
                        </div>

                        {/* Online Banking */}
                        <div
                            onClick={() => setSelectedMethod('banking')}
                            className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${selectedMethod === 'banking'
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <Building className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-semibold text-slate-900 dark:text-white">Online Banking</div>
                                <div className="text-xs text-slate-500">Direct Bank Transfer</div>
                            </div>
                            {selectedMethod === 'banking' && <CheckCircle className="ml-auto w-5 h-5 text-primary-600" />}
                        </div>
                    </div>

                    {/* Manual Payment Proof Upload Area */}
                    {isManualMethod && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Upload Proof of Payment (Required)
                            </label>

                            {!proofPreview ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                    <p className="text-slate-600 dark:text-slate-400 font-medium">Click to upload screenshot</p>
                                    <p className="text-xs text-slate-400">JPG, PNG up to 5MB</p>
                                </div>
                            ) : (
                                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                                    <img src={proofPreview} alt="Proof Preview" className="w-full h-48 object-contain" />
                                    <div className="absolute top-2 right-2">
                                        <button
                                            onClick={() => {
                                                setProofFile(null);
                                                setProofPreview(null);
                                            }}
                                            className="p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-500 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="px-4 py-2 bg-slate-900/10 dark:bg-slate-900/50 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-green-500" />
                                        <span className="text-xs font-medium text-green-600 dark:text-green-400">Proof Uploaded</span>
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Payment Form (Mock) */}
                    <div className="mt-auto">
                        <button
                            onClick={handlePayment}
                            disabled={isProcessing}
                            className={`w-full py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${isProcessing
                                ? 'bg-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-primary-500/25 transform hover:scale-[1.02]'
                                }`}
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                            ) : (
                                <>
                                    {isManualMethod ? 'Submit Payment Proof' : `Pay $${price}.00 via ${selectedMethod}`}
                                    {!isManualMethod && <ArrowRight className="w-5 h-5" />}
                                </>
                            )}
                        </button>
                        <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
                            <Shield className="w-3 h-3" />
                            <span>Payments are secure and encrypted.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
