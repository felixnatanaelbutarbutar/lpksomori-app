"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotAuthorizedPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <ShieldAlert size={48} />
            </div>
            
            <h1 className="text-4xl font-serif font-black text-[#0D1B2A] mb-4">
                403 - Not Authorized
            </h1>
            
            <p className="text-lg text-gray-500 max-w-md mx-auto mb-8 leading-relaxed">
                Maaf, peran (role) Anda tidak memiliki izin untuk mengakses halaman ini.
            </p>
            
            <Link 
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0D7A6F] text-white font-bold hover:bg-[#0a665d] transition-colors shadow-sm"
            >
                <ArrowLeft size={18} />
                Kembali ke Dashboard
            </Link>
        </div>
    );
}
