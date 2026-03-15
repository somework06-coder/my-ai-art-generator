'use client';

import { useState } from 'react';
import { Star, Download, Setting, Category, ArrowRight } from "react-iconly";

export default function LandingPage() {
    const [legalModal, setLegalModal] = useState<'tos' | 'privacy' | null>(null);

    return (
        <div className="min-h-screen bg-[#050505] text-white scroll-smooth">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 glass-card rounded-none border-t-0 border-x-0 !bg-[#050505]/80">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="MOSSION Logo" className="w-10 h-10 object-contain rounded-lg" />
                        <span className="text-xl font-bold tracking-tight uppercase">MOSSION</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <a href="#download" className="bg-[#E1B245] text-black px-5 py-2 rounded-full text-sm font-bold hover:bg-[#F2C96C] transition-colors">
                            Download App
                        </a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#E1B245]/5 via-transparent to-[#F2C96C]/5" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#E1B245]/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-card text-xs font-medium text-[#E1B245] mb-8 border-[#E1B245]/20">
                        <Star set="bulk" size="small" primaryColor="#E1B245" />
                        <span>Professional Motion Backgrounds</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
                        Design the <span className="text-gradient">Unseen.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Generate stunning abstract motion backgrounds and export them directly with optimized stock metadata for Shutterstock & Adobe Stock.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a href="#download" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#E1B245] text-black px-8 py-4 rounded-full font-bold hover:bg-[#F2C96C] transition-transform hover:scale-105 active:scale-95 duration-200 shadow-[0_4px_20px_rgba(225,178,69,0.3)]">
                            <Download set="bold" size="small" primaryColor="currentColor" />
                            For macOS
                        </a>
                        <a href="#download" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#E1B245] text-black px-8 py-4 rounded-full font-bold hover:bg-[#F2C96C] transition-transform hover:scale-105 active:scale-95 duration-200 shadow-[0_4px_20px_rgba(225,178,69,0.3)]">
                            <Download set="bold" size="small" primaryColor="currentColor" />
                            For Windows
                        </a>
                    </div>
                    <p className="mt-6 text-sm text-white/40">Requires macOS 11+ or Windows 10+</p>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">A complete studio on your desktop</h2>
                        <p className="text-white/60 max-w-2xl mx-auto">Everything you need to generate, manage, and export high-quality stock motion graphics.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                icon: <Star set="bulk" size="medium" primaryColor="#E1B245" />,
                                title: "AI Art Engine",
                                desc: "Generate stunning abstract motion art using Gemini 2.0 Flash."
                            },
                            {
                                icon: <Category set="bulk" size="medium" primaryColor="#E1B245" />,
                                title: "Stock-Ready Export",
                                desc: "Bulk export videos bundled with Adobe Stock & Shutterstock metadata CSVs."
                            },
                            {
                                icon: <Setting set="bulk" size="medium" primaryColor="#E1B245" />,
                                title: "GPU-Accelerated",
                                desc: "Native desktop performance with WebGL and local FFmpeg rendering."
                            },
                            {
                                icon: <Download set="bulk" size="medium" primaryColor="#E1B245" />,
                                title: "Cloud + Offline",
                                desc: "Gallery synced to the cloud, but fully functional offline with local caching."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="glass-card p-6 hover:bg-white/10 transition-colors cursor-default hover:border-[#E1B245]/30 group">
                                <div className="w-12 h-12 rounded-xl bg-[#E1B245]/10 flex items-center justify-center mb-4 group-hover:bg-[#E1B245]/20 transition-colors">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                                <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section id="how-it-works" className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
                        <p className="text-white/60">From blank canvas to stock marketplace in three steps.</p>
                    </div>
                    <div className="space-y-12">
                        {[
                            { step: "01", title: "Download & Install", desc: "Get the lightweight native desktop app for macOS or Windows." },
                            { step: "02", title: "Generate Art", desc: "Type a prompt or hit randomize. The AI writes custom GLSL shaders instantly." },
                            { step: "03", title: "Bulk Export", desc: "Select multiple artworks and export as MP4 videos along with a consolidated metadata CSV." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-16 h-16 rounded-full glass-card flex items-center justify-center text-xl font-bold text-[#E1B245] border-[#E1B245]/30">
                                    {item.step}
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
                                    <p className="text-white/60 text-lg">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section id="pricing" className="py-24 px-6 border-t border-white/5 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#E1B245]/5 blur-[120px] rounded-full pointer-events-none" />
                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Pay as you generate</h2>
                        <p className="text-white/60 max-w-xl mx-auto">
                            No monthly subscriptions. Buy credits when you need them.
                            <br /><span className="text-[#E1B245] font-medium block mt-2">New users get 50 free credits directly in the app!</span>
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { name: "Starter", credits: "200", price: "20.000", per: "100", popular: false },
                            { name: "Pro", credits: "500", price: "35.000", per: "70", popular: true },
                            { name: "Mega", credits: "1,000", price: "50.000", per: "50", popular: false },
                        ].map((tier, i) => (
                            <div key={i} className={`glass-card relative p-8 flex flex-col ${tier.popular ? 'border-[#E1B245]/50 bg-[#E1B245]/5 shadow-[0_0_30px_rgba(225,178,69,0.15)]' : ''}`}>
                                {tier.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E1B245] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                        Most Popular
                                    </div>
                                )}
                                <h3 className="text-xl font-medium text-white/70 mb-2">{tier.name} Pack</h3>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl font-bold">{tier.credits}</span>
                                    <span className="text-white/50 font-medium tracking-wide">Credits</span>
                                </div>
                                <div className="text-3xl font-bold mb-1 border-b border-white/10 pb-4">Rp {tier.price}</div>
                                <div className="text-sm text-[#E1B245] mb-6 font-medium mt-4">Only Rp {tier.per} / credit</div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    <li className="flex items-center gap-3 text-sm text-white/80">
                                        <ArrowRight set="bold" size="small" primaryColor="#E1B245" /> Never expires
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-white/80">
                                        <ArrowRight set="bold" size="small" primaryColor="#E1B245" /> Full HD / 4K Export
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-white/80">
                                        <ArrowRight set="bold" size="small" primaryColor="#E1B245" /> Stock Metadata CSV included
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-white/80">
                                        <ArrowRight set="bold" size="small" primaryColor="#E1B245" /> Commercial Usage Rights
                                    </li>
                                </ul>
                                <a href="#download" className={`block w-full py-3 rounded-xl font-bold text-center transition-colors ${tier.popular ? 'bg-[#E1B245] text-black hover:bg-[#F2C96C]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                                    Get Started in App
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* System Requirements */}
            <section className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">System Requirements</h2>
                        <p className="text-white/60">Built natively for performance on modern desktops.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-2xl">🍏</span> macOS
                            </h3>
                            <ul className="space-y-4 text-sm">
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">OS Version</span>
                                    <span className="font-medium">macOS 11 (Big Sur) or newer</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Memory (RAM)</span>
                                    <span className="font-medium">4 GB Minimum</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Storage</span>
                                    <span className="font-medium">~200 MB Free Space</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Graphics</span>
                                    <span className="font-medium">Any Metal-supported GPU</span>
                                </li>
                                <li className="flex justify-between pt-2">
                                    <span className="text-white/50">Internet</span>
                                    <span className="font-medium text-[#E1B245]">Required for AI generation</span>
                                </li>
                            </ul>
                        </div>
                        <div className="glass-card p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <span className="text-2xl">🪟</span> Windows
                            </h3>
                            <ul className="space-y-4 text-sm">
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">OS Version</span>
                                    <span className="font-medium">Windows 10 or newer</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Memory (RAM)</span>
                                    <span className="font-medium">4 GB Minimum</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Storage</span>
                                    <span className="font-medium">~200 MB Free Space</span>
                                </li>
                                <li className="flex justify-between border-b border-white/10 pb-4">
                                    <span className="text-white/50">Graphics</span>
                                    <span className="font-medium">Any DirectX 11 GPU</span>
                                </li>
                                <li className="flex justify-between pt-2">
                                    <span className="text-white/50">Internet</span>
                                    <span className="font-medium text-[#E1B245]">Required for AI generation</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className="py-24 px-6 border-t border-white/5">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { q: "What is Mossion?", a: "Mossion is a desktop generative AI application that lets you create abstract looping motion backgrounds using only text prompts, perfect for selling on microstock platforms." },
                            { q: "What are credits used for?", a: "1 credit is consumed for each 'Generate' click. If you are unsatisfied with the result and generate again, it will consume another credit. Exporting videos does not cost any credits." },
                            { q: "How do I purchase credits?", a: "Purchasing credits or Top-Ups are done directly within the Mossion desktop app. After signing in, you can click the 'Get More Credits' button." },
                            { q: "Does the app work offline?", a: "Yes! Mossion stores your project gallery locally. You can render and export videos completely offline. However, an internet connection is required when generating new AI prompts." },
                            { q: "What is the export video format?", a: "Mossion exports videos in MP4 (H.264), ready to be uploaded to platforms like Shutterstock & Adobe Stock, complete with an automatic AI-generated SEO metadata CSV." }
                        ].map((faq, i) => (
                            <div key={i} className="glass-card p-6 border-l-4 border-l-transparent hover:border-l-[#E1B245] transition-all">
                                <h3 className="text-lg font-bold mb-2">{faq.q}</h3>
                                <p className="text-white/60 leading-relaxed text-sm">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Download Section CTA */}
            <section id="download" className="py-32 px-6 border-t border-white/5 bg-gradient-to-t from-[#050505] to-[#E1B245]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#E1B245]/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F2C96C]/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Start generating today.</h2>
                    <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">
                        Download Mossion desktop app. Sign up directly in the app to claim your free credits.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8">
                        <button className="w-full sm:w-auto flex flex-col items-center justify-center bg-white text-black px-12 py-5 rounded-2xl font-medium hover:bg-gray-100 transition-transform hover:-translate-y-1 duration-200">
                            <span className="flex items-center gap-2 text-lg font-bold mb-1">
                                <Download set="bold" size="medium" primaryColor="currentColor" />
                                Download for macOS
                            </span>
                            <span className="text-xs text-black/60">Requires macOS 11+ (.dmg)</span>
                        </button>
                        <button className="w-full sm:w-auto flex flex-col items-center justify-center bg-[#E1B245] text-black px-12 py-5 rounded-2xl font-medium hover:bg-[#F2C96C] transition-transform hover:-translate-y-1 duration-200 shadow-[0_4px_30px_rgba(225,178,69,0.3)]">
                            <span className="flex items-center gap-2 text-lg font-bold mb-1">
                                <Download set="bold" size="medium" primaryColor="currentColor" />
                                Download for Windows
                            </span>
                            <span className="text-xs text-black/60">Requires Windows 10+ (.exe)</span>
                        </button>
                    </div>
                    <p className="text-sm text-white/40">
                        * Credit top-ups are processed directly inside the application
                    </p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-white/10 bg-[#050505] relative z-20">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="MOSSION Logo" className="w-6 h-6 object-contain opacity-70 grayscale" />
                        <span className="text-xl font-bold text-[#E1B245] tracking-tight uppercase">MOSSION</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <button onClick={() => setLegalModal('tos')} className="hover:text-[#E1B245] transition-colors text-left">Terms of Service</button>
                        <button onClick={() => setLegalModal('privacy')} className="hover:text-[#E1B245] transition-colors text-left">Privacy Policy</button>
                    </div>
                    <p className="text-sm text-white/40">© 2026 Mossion. All rights reserved.</p>
                </div>
            </footer>

            {/* Legal Modals */}
            {legalModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setLegalModal(null)}>
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-8 relative shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setLegalModal(null)}
                            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <h2 className="text-3xl font-bold mb-6 text-[#E1B245]">
                            {legalModal === 'tos' ? 'Terms of Service' : 'Privacy Policy'}
                        </h2>

                        {legalModal === 'tos' ? (
                            <div className="space-y-5 text-white/70 text-sm leading-relaxed">
                                <p><strong>1. Acceptance of Terms</strong><br />By accessing or using Mossion, you agree to be bound by these Terms of Service. If you do not agree, do not use the application.</p>
                                <p><strong>2. Description of Service</strong><br />Mossion provides professional generative abstract motion backgrounds. You may export these backgrounds with metadata for stock agency submission.</p>
                                <p><strong>3. Credits and Payments</strong><br />Generative processes consume credits. Credits can be purchased in-app. All payments are final and non-refundable. Top-ups do not expire as long as your account remains active.</p>
                                <p><strong>4. User Content and License</strong><br />You retain ownership of the generated outputs, provided you have sufficient rights to use the prompts or source materials. Mossion grants you a worldwide, royalty-free license to use, modify, and distribute the generated videos for both personal and commercial purposes, including selling on stock agencies.</p>
                                <p><strong>5. Limitation of Liability</strong><br />Mossion is provided "as is" without warranties of any kind. We are not liable for any lost profits or data arising from your use of the service.</p>
                                <p className="pt-4 text-white/40"><em>Last updated: March 2026</em></p>
                            </div>
                        ) : (
                            <div className="space-y-5 text-white/70 text-sm leading-relaxed">
                                <p><strong>1. Information We Collect</strong><br />We collect information you provide directly to us (such as email addresses during sign-up) and data automatically collected through your use of the application (such as generational parameters and export history).</p>
                                <p><strong>2. How We Use Information</strong><br />We use the information to provide, maintain, and improve Mossion, process transactions (via third-party gateways), and communicate with you about updates and promotions.</p>
                                <p><strong>3. Information Sharing</strong><br />We do not sell your personal data. We may share information with trusted third-party service providers (like payment processors or cloud hosting) strictly to operate our services.</p>
                                <p><strong>4. Data Security</strong><br />We implement commercially reasonable security measures to protect your data. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
                                <p><strong>5. Your Rights</strong><br />You have the right to access, update, or delete your personal information. You can do this within the application's account settings or by contacting our support team.</p>
                                <p className="pt-4 text-white/40"><em>Last updated: March 2026</em></p>
                            </div>
                        )}

                        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                            <button
                                onClick={() => setLegalModal(null)}
                                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
