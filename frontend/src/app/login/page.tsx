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
            localStorage.setItem("mori_role", data.user.role ?? data.user.Role ?? "student");
            router.push("/dashboard");
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    const LANGS = [
        { code: "id", label: "ID" },
        { code: "ja", label: "日本語" },
        { code: "en", label: "EN" },
    ];

    return (
        <div
            className="min-h-screen flex font-sans"
            style={{ background: "var(--bg-canvas)" }}
        >
            {/* ── Left branding panel ── */}
            <div
                className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
                style={{ background: "#1D2B2A" }}
            >
                {/* Subtle texture rings */}
                <div
                    className="absolute -top-40 -right-40 w-[520px] h-[520px] rounded-full pointer-events-none"
                    style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                />
                <div
                    className="absolute -top-24 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
                    style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                />
                <div
                    className="absolute bottom-10 -left-32 w-[420px] h-[420px] rounded-full pointer-events-none"
                    style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                />
                <div
                    className="absolute bottom-0 left-0 w-full h-32 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(13,122,111,0.08), transparent)" }}
                />

                {/* Lang switcher */}
                <div className="flex justify-end relative z-10">
                    <div
                        className="flex rounded-full p-1 gap-1"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                        {LANGS.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => i18n.changeLanguage(lang.code)}
                                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                                style={{
                                    background: i18n.language === lang.code ? "#fff" : "transparent",
                                    color: i18n.language === lang.code ? "#0D7A6F" : "rgba(255,255,255,0.55)",
                                }}
                            >
                                {lang.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center content */}
                <div className="flex flex-col gap-9 relative z-10">
                    <div
                        className="rounded-2xl p-4 inline-block w-fit"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                    >
                        <Image
                            src="/logo.png"
                            alt="LPK Mori Logo"
                            width={150}
                            height={52}
                            className="object-contain"
                            priority
                        />
                    </div>

                    <div>
                        <h1
                            className="text-5xl font-bold leading-tight mb-3"
                            style={{
                                fontFamily: "var(--font-serif)",
                                color: "#FFFFFF",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {t("login.portal")}
                        </h1>
                        <p
                            className="text-base font-light tracking-wide"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                        >
                            {t("login.subtitle")}
                        </p>
                    </div>

                    {/* Divider w/ Japanese label */}
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-3">
                            <div
                                className="h-px flex-1"
                                style={{ background: "rgba(255,255,255,0.1)" }}
                            />
                            <span
                                className="text-xs font-semibold tracking-[0.18em] uppercase"
                                style={{ color: "var(--gold)" }}
                            >
                                森センター
                            </span>
                            <div
                                className="h-px flex-1"
                                style={{ background: "rgba(255,255,255,0.1)" }}
                            />
                        </div>
                        <p
                            className="text-xs max-w-xs font-light"
                            style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}
                        >
                            日本語職業訓練センター — Japanese Vocational Training Centre
                        </p>
                    </div>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2">
                        {["学習管理", "試験・評価", "出席管理", "お知らせ"].map((pill) => (
                            <span
                                key={pill}
                                className="px-3 py-1.5 rounded-full text-[11px] font-medium"
                                style={{
                                    background: "rgba(255,255,255,0.07)",
                                    color: "rgba(255,255,255,0.45)",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                {pill}
                            </span>
                        ))}
                    </div>
                </div>

                <p className="text-[11px] relative z-10" style={{ color: "rgba(255,255,255,0.2)" }}>
                    © 2025 LPK SO Mori Centre. All rights reserved.
                </p>
            </div>

            {/* ── Right form panel ── */}
            <div
                className="flex-1 flex flex-col justify-center items-center px-8 lg:px-14"
                style={{ background: "var(--bg-surface)" }}
            >
                {/* Mobile: Logo + Lang */}
                <div className="lg:hidden flex flex-col items-center gap-4 mb-10">
                    <Image
                        src="/logo.png"
                        alt="LPK Mori"
                        width={130}
                        height={44}
                        className="object-contain"
                    />
                    <div className="flex gap-2">
                        {LANGS.map((l) => (
                            <button
                                key={l.code}
                                onClick={() => i18n.changeLanguage(l.code)}
                                className="px-3 py-1 rounded-full text-xs font-semibold border transition-all"
                                style={{
                                    background: i18n.language === l.code ? "var(--accent)" : "transparent",
                                    color: i18n.language === l.code ? "#fff" : "var(--text-muted)",
                                    borderColor: i18n.language === l.code ? "var(--accent)" : "var(--border)",
                                }}
                            >
                                {l.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full max-w-[360px] animate-slide-up">
                    {/* Heading */}
                    <div className="mb-8">
                        <h2
                            className="text-3xl font-bold mb-2"
                            style={{
                                fontFamily: "var(--font-serif)",
                                color: "var(--text-primary)",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {t("login.welcome") ?? "Masuk ke Akun"}
                        </h2>
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                            {t("login.authorized")}
                        </p>
                    </div>

                    {/* Error */}
                    {errorMsg && (
                        <div
                            className="mb-6 flex items-start gap-3 rounded-xl p-3.5"
                            style={{
                                background: "var(--danger-bg)",
                                border: "1px solid #F5C5C0",
                            }}
                        >
                            <div
                                className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                                style={{ background: "var(--danger)" }}
                            />
                            <p className="text-sm" style={{ color: "var(--danger)" }}>
                                {errorMsg}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label
                                className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-2"
                                style={{ color: "var(--text-muted)" }}
                            >
                                {t("login.email")}
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@lpkmori.com"
                                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                                style={{
                                    background: "var(--bg-canvas)",
                                    border: "1.5px solid var(--border)",
                                    color: "var(--text-primary)",
                                }}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label
                                    className="block text-[11px] font-semibold uppercase tracking-[0.1em]"
                                    style={{ color: "var(--text-muted)" }}
                                >
                                    {t("login.password")}
                                </label>
                                <a
                                    href="#"
                                    className="text-xs transition-colors"
                                    style={{ color: "var(--accent)" }}
                                >
                                    {t("login.forgot")}
                                </a>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl text-sm transition-all"
                                style={{
                                    background: "var(--bg-canvas)",
                                    border: "1.5px solid var(--border)",
                                    color: "var(--text-primary)",
                                }}
                            />
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2.5 pt-0.5">
                            <input
                                id="remember"
                                type="checkbox"
                                className="w-4 h-4 rounded"
                                style={{ accentColor: "var(--accent)" }}
                            />
                            <label
                                htmlFor="remember"
                                className="text-sm"
                                style={{ color: "var(--text-secondary)" }}
                            >
                                {t("login.remember")}
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 mt-1 rounded-xl font-semibold text-sm text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{
                                background: loading
                                    ? "var(--text-muted)"
                                    : "var(--accent)",
                                boxShadow: loading ? "none" : "0 4px 16px rgba(13,122,111,0.3)",
                            }}
                        >
                            {loading && (
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                            )}
                            {loading ? "Memproses..." : t("login.signin")}
                        </button>
                    </form>

                    {/* Role legend */}
                    <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
                        <p
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3 text-center"
                            style={{ color: "var(--text-muted)" }}
                        >
                            Role Pengguna
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { label: "Admin", color: "var(--role-admin)", bg: "var(--role-admin-bg)" },
                                { label: "先生 (Guru)", color: "var(--role-teacher)", bg: "var(--role-teacher-bg)" },
                                { label: "学生 (Siswa)", color: "var(--role-student)", bg: "var(--role-student-bg)" },
                            ].map((r) => (
                                <div
                                    key={r.label}
                                    className="py-2 px-2 rounded-xl text-center"
                                    style={{ background: r.bg }}
                                >
                                    <p className="text-[10px] font-semibold leading-tight" style={{ color: r.color }}>
                                        {r.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
