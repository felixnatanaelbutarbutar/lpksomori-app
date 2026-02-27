"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "../../i18n/config";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { t, i18n } = useTranslation();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setLoading(true);
        try {
            const res = await fetch("http://localhost:8080/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Login failed");
            localStorage.setItem("mori_token", data.token);
            localStorage.setItem("mori_user", JSON.stringify(data.user));
            // Go json tag is lowercase: data.user.role (not Role)
            localStorage.setItem("mori_role", data.user.role ?? data.user.Role ?? "student");
            router.push("/dashboard");
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex font-sans">
            {/* ── Left Branding Panel ── */}
            <div
                className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 relative overflow-hidden"
                style={{
                    background: "linear-gradient(145deg, #003d40 0%, #006D77 40%, #0d4f52 75%, #002b2d 100%)",
                }}
            >
                {/* Decorative rings */}
                <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full border border-white/5" />
                <div className="absolute -top-24 -right-24 w-[380px] h-[380px] rounded-full border border-white/5" />
                <div className="absolute bottom-0 -left-32 w-[400px] h-[400px] rounded-full border border-white/5" />

                {/* Language Switcher */}
                <div className="flex justify-end relative z-10">
                    <div className="flex bg-white/10 backdrop-blur-sm rounded-full p-1 gap-1">
                        {[
                            { code: "id", label: "ID" },
                            { code: "ja", label: "日本語" },
                            { code: "en", label: "EN" },
                        ].map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${i18n.language === lang.code
                                    ? "bg-white text-[#006D77] shadow-sm"
                                    : "text-white/70 hover:text-white"
                                    }`}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center Content */}
                <div className="flex flex-col items-start gap-8 relative z-10">
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 inline-block">
                        <Image
                            src="/logo.png"
                            alt="LPK Mori Logo"
                            width={160}
                            height={56}
                            className="object-contain"
                            priority
                        />
                    </div>

                    <div>
                        <h1 className="text-5xl font-serif text-white font-bold leading-tight mb-3">
                            {t("login.portal")}
                        </h1>
                        <p className="text-white/60 text-lg font-light tracking-wide">
                            {t("login.subtitle")}
                        </p>
                    </div>

                    {/* Japanese decorative text */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-px bg-[#E9C46A]" />
                            <span className="text-[#E9C46A] text-sm font-medium tracking-widest uppercase">
                                森センター
                            </span>
                        </div>
                        <p className="text-white/40 text-sm max-w-xs font-light">
                            日本語職業訓練センター — Japanese Vocational Training
                        </p>
                    </div>
                </div>

                {/* Footer note */}
                <div className="text-white/30 text-xs relative z-10">
                    © 2025 LPK SO Mori Centre. All rights reserved.
                </div>
            </div>

            {/* ── Right Form Panel ── */}
            <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-16 bg-[#FAFAFA]">
                {/* Mobile: Logo + Language */}
                <div className="lg:hidden flex flex-col items-center gap-4 mb-10">
                    <Image src="/logo.png" alt="LPK Mori" width={140} height={48} className="object-contain" />
                    <div className="flex gap-2">
                        {["id", "ja", "en"].map((l) => (
                            <button
                                key={l}
                                onClick={() => i18n.changeLanguage(l)}
                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${i18n.language === l
                                    ? "bg-[#006D77] text-white border-[#006D77]"
                                    : "bg-white text-gray-500 border-gray-200"
                                    }`}
                            >
                                {l.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-sm">
                    <div className="mb-10">
                        <h2 className="text-3xl font-serif font-bold text-[#0D1B2A] mb-2">
                            {t("login.welcome") ?? "Masuk ke Akun"}
                        </h2>
                        <p className="text-gray-500 text-sm">{t("login.authorized")}</p>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                            <div className="mt-0.5 w-4 h-4 rounded-full bg-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-700">{errorMsg}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div className="group">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {t("login.email")}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@lpkmori.com"
                                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-[#0D1B2A] placeholder-gray-300 focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t("login.password")}
                                </label>
                                <a href="#" className="text-xs text-[#006D77] hover:text-[#004f54] transition-colors">
                                    {t("login.forgot")}
                                </a>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm text-[#0D1B2A] placeholder-gray-300 focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all"
                            />
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2.5 pt-1">
                            <input
                                id="remember"
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-[#006D77] focus:ring-[#006D77] accent-[#006D77]"
                            />
                            <label htmlFor="remember" className="text-sm text-gray-500">
                                {t("login.remember")}
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 mt-2 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#006D77]/25 disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{
                                background: loading
                                    ? "#888"
                                    : "linear-gradient(135deg, #006D77 0%, #004f54 100%)",
                            }}
                        >
                            {loading ? (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            ) : null}
                            {loading ? "Memproses..." : t("login.signin")}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <div className="flex gap-3">
                            <div className="flex-1 p-3 rounded-xl border border-gray-100 text-center">
                                <div className="text-xs text-gray-400 font-medium">Admin</div>
                                <div className="w-4 h-0.5 bg-[#006D77] mx-auto mt-1.5 rounded" />
                            </div>
                            <div className="flex-1 p-3 rounded-xl border border-gray-100 text-center">
                                <div className="text-xs text-gray-400 font-medium">先生 (Guru)</div>
                                <div className="w-4 h-0.5 bg-[#E9C46A] mx-auto mt-1.5 rounded" />
                            </div>
                            <div className="flex-1 p-3 rounded-xl border border-gray-100 text-center">
                                <div className="text-xs text-gray-400 font-medium">学生 (Siswa)</div>
                                <div className="w-4 h-0.5 bg-gray-300 mx-auto mt-1.5 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
