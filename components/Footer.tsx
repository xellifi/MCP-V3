import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Send, Facebook, Twitter, Instagram, Linkedin, Youtube, Mail } from 'lucide-react';

const Footer: React.FC = () => {
    const navigate = useNavigate();

    return (
        <footer className="relative mt-32">
            {/* Newsletter Section - Floating Card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl px-6 z-20">
                <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 flex-1">
                        <h2 className="text-3xl font-bold text-white mb-2">Subscribe newsletter</h2>
                        <p className="text-white/80">Be the first to recieve all latest post in your inbox</p>
                    </div>

                    <div className="relative z-10 w-full md:w-auto flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="px-6 py-3 rounded-lg text-slate-900 bg-white border-0 outline-none focus:ring-2 focus:ring-white/50 w-full sm:w-80"
                        />
                        <button className="px-8 py-3 bg-white text-violet-600 font-bold rounded-lg hover:bg-slate-100 transition-colors uppercase text-sm tracking-wider">
                            Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="bg-gradient-to-b from-indigo-600 to-violet-700 pt-48 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center md:text-left">

                        {/* Brand Column */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex flex-col md:flex-row items-center gap-6 justify-center md:justify-start">
                                <div className="flex items-center gap-2">
                                    <Bot className="w-8 h-8 text-white" />
                                    <span className="text-2xl font-bold text-white">MyChat Pilot</span>
                                </div>
                                {/* Meta Partner Badge Placeholder */}
                                <div className="bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-2">
                                    <span className="text-xs font-semibold text-white">∞ Meta Business Partner</span>
                                </div>
                            </div>

                            <p className="text-white/80 max-w-sm mx-auto md:mx-0 leading-relaxed">
                                Create a FREE (forever) account today to get access to everything you need to succeed in chatbot marketing.
                            </p>

                            <div className="flex items-center justify-center md:justify-start gap-4">
                                {[
                                    { icon: Send, label: 'Telegram' },
                                    { icon: Facebook, label: 'Facebook' },
                                    { icon: Youtube, label: 'Youtube' },
                                    { icon: Twitter, label: 'Twitter' },
                                    { icon: Instagram, label: 'Instagram' },
                                    { icon: Linkedin, label: 'LinkedIn' },
                                ].map((item, index) => (
                                    <button key={index} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white hover:text-violet-600 transition-all duration-300">
                                        <item.icon size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Links Column */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6">Links</h3>
                            <ul className="space-y-4">
                                <li>
                                    <button onClick={() => navigate('/features')} className="text-white/80 hover:text-white transition-colors">Features</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/login')} className="text-white/80 hover:text-white transition-colors">Login</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/register')} className="text-white/80 hover:text-white transition-colors">Register</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/#pricing')} className="text-white/80 hover:text-white transition-colors">Pricing</button>
                                </li>
                            </ul>
                        </div>

                        {/* Legal Column */}
                        <div>
                            <h3 className="text-lg font-bold text-white mb-6">Legal</h3>
                            <ul className="space-y-4">
                                <li>
                                    <button onClick={() => navigate('/privacy-policy')} className="text-white/80 hover:text-white transition-colors">Privacy Policy</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/terms-of-service')} className="text-white/80 hover:text-white transition-colors">Terms of Service</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/gdpr-policy')} className="text-white/80 hover:text-white transition-colors">GDPR Policy</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/refund-policy')} className="text-white/80 hover:text-white transition-colors">Refund Policy</button>
                                </li>
                                <li>
                                    <button onClick={() => navigate('/affiliate-policy')} className="text-white/80 hover:text-white transition-colors">Affiliate Policy</button>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Copyright */}
                    <div className="mt-16 pt-8 border-t border-white/10 text-center md:text-left">
                        <p className="text-white/60 text-sm">
                            © {new Date().getFullYear()} MyChat Pilot | All Rights Reserved
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
