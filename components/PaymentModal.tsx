import React, { useState } from 'react';
import { X, CreditCard, Wallet, Building, ArrowRight, CheckCircle, Smartphone, Shield } from 'lucide-react';

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

    if (!isOpen) return null;

    const handlePayment = () => {
        setIsProcessing(true);
        // Simulate API call
        setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
        }, 1500);
    };

    if (isSuccess) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        You have successfully subscribed to the <span className="font-semibold text-slate-900 dark:text-white">{planName}</span> plan. Your receipt has been sent to your email.
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
                                <>Processing...</>
                            ) : (
                                <>
                                    Pay ${price}.00 via <span className="capitalize">{selectedMethod === 'ewallet' ? 'E-Wallet' : selectedMethod}</span> <ArrowRight className="w-5 h-5" />
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
