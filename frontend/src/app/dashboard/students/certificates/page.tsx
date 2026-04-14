"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Award, Download, Eye, BookOpen, Calendar,
    Sparkles, Shield, Star, CheckCircle2
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface Certificate {
    id: number;
    uuid: string;
    student_id: number;
    class_id: number;
    final_score: number;
    issued_at: string;
    issued_by: number;
    student: { id: number; name: string; nis: string; };
    class: { id: number; name: string; academic_year?: { year_range: string } };
    teacher: { id: number; name: string };
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert }: { cert: Certificate }) {
    const handleDownload = () => {
        const a = document.createElement("a");
        a.href = `${API}/certificates/download/${cert.uuid}`;
        a.download = `Sertifikat_${cert.class?.name}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePreview = () => {
        window.open(`${API}/certificates/preview/${cert.uuid}`, "_blank");
    };

    const handleVerify = () => {
        window.open(`${API}/certificates/verify/${cert.uuid}`, "_blank");
    };

    const scoreColor =
        cert.final_score >= 90 ? "#059669" :
        cert.final_score >= 80 ? "#0D7A6F" :
        cert.final_score >= 70 ? "#B07D3A" : "#5C5EA6";

    return (
        <div className="group relative bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            {/* Certificate decorative header */}
            <div
                className="relative h-36 flex flex-col items-center justify-center overflow-hidden"
                style={{ background: "linear-gradient(135deg, #054646 0%, #006D77 60%, #0D9488 100%)" }}
            >
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i}
                            className="absolute border border-white/30 rounded-full"
                            style={{
                                width: `${(i + 1) * 40}px`,
                                height: `${(i + 1) * 40}px`,
                                top: "50%", left: "50%",
                                transform: "translate(-50%, -50%)"
                            }}
                        />
                    ))}
                </div>

                {/* Gold border lines */}
                <div className="absolute top-3 left-3 right-3 bottom-3 border border-[#D4AF37]/40 rounded-2xl pointer-events-none" />
                <div className="absolute top-4 left-4 right-4 bottom-4 border border-[#D4AF37]/20 rounded-xl pointer-events-none" />

                {/* Award icon */}
                <div className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
                    style={{ background: "rgba(212,175,55,0.15)", border: "1.5px solid rgba(212,175,55,0.4)" }}>
                    <Award size={30} className="text-[#D4AF37]" />
                </div>

                {/* LULUS badge */}
                <div className="relative z-10 flex items-center gap-1.5 px-4 py-1 rounded-full"
                    style={{ background: "rgba(212,175,55,0.2)", border: "1px solid rgba(212,175,55,0.5)" }}>
                    <CheckCircle2 size={11} className="text-[#D4AF37]" />
                    <span className="text-[#D4AF37] text-xs font-bold tracking-widest uppercase">Sertifikat Kelulusan</span>
                </div>
            </div>

            {/* Card content */}
            <div className="p-5">
                {/* Class name */}
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-1.5 mb-1">
                            <BookOpen size={12} className="text-[#006D77]" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Kelas</p>
                        </div>
                        <h3 className="font-black text-[#0D1B2A] text-lg leading-tight">{cert.class?.name ?? "—"}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">T.A. {cert.class?.academic_year?.year_range ?? "—"}</p>
                    </div>

                    {/* Score badge */}
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Nilai</p>
                        <div className="flex items-center gap-1">
                            <Sparkles size={13} style={{ color: scoreColor }} />
                            <span className="text-2xl font-black" style={{ color: scoreColor }}>
                                {cert.final_score.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Divider with star */}
                <div className="flex items-center gap-2 my-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <Star size={10} className="text-[#D4AF37]" />
                    <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Info row */}
                <div className="space-y-1.5 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar size={11} className="text-gray-400 shrink-0" />
                        <span>
                            Dikeluarkan {new Date(cert.issued_at).toLocaleDateString("id-ID", {
                                day: "2-digit", month: "long", year: "numeric"
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Shield size={11} className="text-gray-400 shrink-0" />
                        <span className="font-mono text-[10px] truncate text-gray-400">{cert.uuid}</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleVerify}
                        title="Verifikasi Keaslian"
                        className="p-2.5 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors border border-amber-100"
                    >
                        <Shield size={15} />
                    </button>
                    <button
                        onClick={handlePreview}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold transition-colors border border-gray-100"
                    >
                        <Eye size={14} />
                        Preview
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
                        style={{ background: "linear-gradient(135deg, #054646, #006D77)" }}
                    >
                        <Download size={14} />
                        Unduh PDF
                    </button>
                </div>
            </div>

            {/* Cert number label */}
            <div className="px-5 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400">
                    No. CERT-{String(cert.id).padStart(4, "0")}/{new Date(cert.issued_at).getFullYear()}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                    <CheckCircle2 size={10} />
                    Terverifikasi
                </div>
            </div>
        </div>
    );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-24 gap-6">
            <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, #054646, #006D77)" }}
            >
                <Award size={44} className="text-[#D4AF37]" />
            </div>
            <div className="text-center max-w-sm">
                <h3 className="text-xl font-black text-[#0D1B2A] mb-2">Belum Ada Sertifikat</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                    Sertifikat akan muncul di sini setelah kamu dinyatakan <strong className="text-emerald-600">Lulus</strong> oleh guru di rekap nilai akhir.
                </p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StudentCertificatesPage() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("Siswa");

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
            setUserName(u.name || u.Name || "Siswa");
        } catch { }
    }, []);

    const fetchCerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/certificates/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setCerts(json.data ?? []);
        } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { fetchCerts(); }, [fetchCerts]);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* ── Header ── */}
            <div
                className="rounded-[32px] p-8 animate-in fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #054646 0%, #006D77 60%, #0D9488 100%)" }}
            >
                {/* Pattern */}
                <div className="absolute inset-0 opacity-5">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="absolute border border-white rounded-full"
                            style={{
                                width: `${(i + 1) * 60}px`, height: `${(i + 1) * 60}px`,
                                top: "50%", left: "50%",
                                transform: "translate(-50%,-50%)"
                            }} />
                    ))}
                </div>

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: "rgba(212,175,55,0.2)", border: "1.5px solid rgba(212,175,55,0.4)" }}>
                                <Award size={24} className="text-[#D4AF37]" />
                            </div>
                            <div>
                                <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">LPK SO Mori Centre</p>
                                <h1 className="text-2xl font-serif font-black text-white">Sertifikat Saya</h1>
                            </div>
                        </div>
                        <p className="text-white/70 text-sm">
                            Hai <strong className="text-white">{userName}</strong>! Berikut adalah sertifikat kelulusan yang telah kamu raih.
                        </p>
                    </div>
                    <div className="flex flex-col items-center sm:items-end gap-2">
                        <div className="px-6 py-3 rounded-2xl text-center"
                            style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.4)" }}>
                            <p className="text-[#D4AF37] text-3xl font-black">{certs.length}</p>
                            <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Sertifikat</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Certificates Grid ── */}
            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-400">Memuat sertifikat kamu...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {certs.length === 0 ? <EmptyState /> : certs.map(cert => (
                        <CertCard key={cert.id} cert={cert} />
                    ))}
                </div>
            )}

            {/* ── Info ── */}
            {certs.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                    <Shield className="text-amber-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm text-amber-700">
                        <p className="font-bold mb-1">Tentang QR Code Validasi</p>
                        <p>Setiap sertifikat dilengkapi QR Code unik. Scan QR Code pada sertifikat untuk memverifikasi keasliannya secara online kapan saja.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
