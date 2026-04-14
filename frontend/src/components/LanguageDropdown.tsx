"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown } from "lucide-react";
import { useLanguage, LangCode } from "@/i18n/LanguageContext";

export default function LanguageDropdown() {
    const { lang, setLang } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const languages: { code: LangCode; label: string; flag: string }[] = [
        { code: "id", label: "Indonesia", flag: "🇮🇩" },
        { code: "en", label: "English", flag: "🇺🇸" },
        { code: "ja", label: "日本語", flag: "🇯🇵" },
    ];

    const currentTheme = languages.find(l => l.code === lang) || languages[0];

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100/80 transition-colors border border-transparent hover:border-gray-200"
            >
                <Globe size={16} className="text-gray-500" />
                <span className="font-semibold text-sm tracking-wide uppercase">{currentTheme.code}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}/>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 shadow-xl rounded-xl overflow-hidden z-50 animate-fade-in origin-top-right">
                    <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Pilih Bahasa</span>
                    </div>
                    <div className="p-1">
                        {languages.map(l => (
                            <button
                                key={l.code}
                                onClick={() => { setLang(l.code); setIsOpen(false); }}
                                className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors rounded-lg ${lang === l.code ? 'bg-[#E5F4F2] text-[#0D7A6F] font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                            >
                                <span className="text-lg bg-white shadow-sm rounded-sm leading-none">{l.flag}</span>
                                <span className="flex-1">{l.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
