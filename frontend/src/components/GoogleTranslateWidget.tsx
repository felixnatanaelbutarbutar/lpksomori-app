"use client";

import { useEffect, useState, useRef } from "react";
import Script from "next/script";
import { Globe, ChevronUp } from "lucide-react";

export default function GoogleTranslateWidget() {
    const [currentLang, setCurrentLang] = useState("id");
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);

    // Provide the initialization function globally
    useEffect(() => {
        (window as any).googleTranslateElementInit = () => {
            new (window as any).google.translate.TranslateElement(
                { 
                    pageLanguage: "id", 
                    includedLanguages: "id,en,ja",
                    autoDisplay: false 
                },
                "google_translate_element"
            );
        };

        // Close dropdown when clicked outside
        const handleClickOutside = (event: MouseEvent) => {
            if (widgetRef.current && !widgetRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleChangeLanguage = (langCode: string) => {
        // Find the hidden google select element
        const googleScript = document.querySelector(".goog-te-combo") as HTMLSelectElement;
        
        if (googleScript) {
            googleScript.value = langCode;
            googleScript.dispatchEvent(new Event("change"));
            setCurrentLang(langCode);
        } else {
            console.warn("Google Translate widget not ready yet.");
        }
        setIsOpen(false);
    };

    const languages = [
        { code: "id", label: "Indonesia", flag: "🇮🇩" },
        { code: "en", label: "English", flag: "🇺🇸" },
        { code: "ja", label: "日本語", flag: "🇯🇵" },
    ];

    const currentTheme = languages.find(l => l.code === currentLang) || languages[0];

    return (
        <div translate="no" className="translate-no notranslate">
            {/* NextJS Script injection for optimal loading */}
            <Script 
                src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
                strategy="lazyOnload"
            />
            
            {/* We still need a container for Google's vanilla widget injection (we hide it in CSS) */}
            <div id="google_translate_element"></div>
            
            {/* Custom UI floating at bottom right */}
            <div className="fixed bottom-6 right-6 z-[9999]" ref={widgetRef}>
                <div className="relative">
                    {isOpen && (
                        <div className="absolute bottom-full right-0 mb-3 w-44 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-slide-up origin-bottom-right">
                            <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                                <Globe size={14} className="text-gray-400" />
                                <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Pilih Bahasa</span>
                            </div>
                            <div className="p-1">
                                {languages.map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleChangeLanguage(lang.code)}
                                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors rounded-xl ${currentLang === lang.code ? 'bg-[#E5F4F2] text-[#0D7A6F] font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                    >
                                        <span className="text-xl shadow-sm rounded-sm bg-white leading-none">{lang.flag}</span>
                                        <span className="flex-1">{lang.label}</span>
                                        {currentLang === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[#0D7A6F]" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => setIsOpen(!isOpen)}
                        className={`flex items-center gap-2.5 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 border ${isOpen ? 'bg-white border-[#0D7A6F]/20 text-[#0D7A6F] scale-105' : 'bg-[#0D1B2A] border-white/10 text-white hover:-translate-y-1'}`}
                    >
                        <Globe size={20} className={isOpen ? "text-[#0D7A6F]" : "text-white/80 opacity-70"} />
                        <span className="font-bold text-sm tracking-wide mr-1">{currentTheme.code.toUpperCase()}</span>
                        <ChevronUp size={16} className={`transition-transform duration-300 ${isOpen ? "rotate-180 text-[#0D7A6F]/50" : "text-white/40"}`}/>
                    </button>
                </div>
            </div>
        </div>
    );
}
