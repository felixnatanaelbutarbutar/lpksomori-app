"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Award, Download, Eye, Search, CheckCircle2,
    RefreshCw, Shield, Calendar, User, BookOpen,
    Sparkles, FileCheck, Copy, Check
} from "lucide-react";
import Swal from "sweetalert2";

const API = "http://localhost:8080/api/v1";

interface Certificate {
    id: number;
    uuid: string;
    student_id: number;
    class_id: number;
    final_score: number;
    issued_at: string;
    issued_by: number;
    student: { id: number; name: string; nis: string; photo?: string };
    class: { id: number; name: string; academic_year?: { year_range: string } };
    teacher: { id: number; name: string };
}

interface ClassModel { id: number; name: string; }

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                <div style={{ color }}>{icon}</div>
            </div>
            <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-2xl font-black text-[#0D1B2A]">{value}</p>
            </div>
        </div>
    );
}

// ─── Copy UUID Button ─────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={copy} title="Salin UUID" className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] text-gray-500 font-mono transition-colors">
            {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
            {text.slice(0, 8)}…
        </button>
    );
}

export default function CertificatesPage() {
    const [certs, setCerts] = useState<Certificate[]>([]);
    const [classes, setClasses] = useState<ClassModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterClass, setFilterClass] = useState<number>(0);

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchCerts = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/certificates`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            setCerts(json.data ?? []);
        } finally { setLoading(false); }
    }, [token]);

    useEffect(() => {
        fetchCerts();
        fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(j => setClasses(j.data ?? []));
    }, [token, fetchCerts]);

    const handleDownload = (uuid: string, studentName: string) => {
        const url = `${API}/certificates/download/${uuid}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = `Sertifikat_${studentName}.pdf`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handlePreview = (uuid: string) => {
        window.open(`${API}/certificates/preview/${uuid}`, "_blank");
    };

    const handleVerifyLink = (uuid: string) => {
        const url = `${API}/certificates/verify/${uuid}`;
        window.open(url, "_blank");
    };

    const filtered = certs.filter(c => {
        const matchSearch = !search ||
            c.student?.name?.toLowerCase().includes(search.toLowerCase()) ||
            c.student?.nis?.includes(search) ||
            c.class?.name?.toLowerCase().includes(search.toLowerCase());
        const matchClass = !filterClass || c.class_id === filterClass;
        return matchSearch && matchClass;
    });

    const totalCerts = certs.length;
    const avgScore = certs.length ? (certs.reduce((a, b) => a + b.final_score, 0) / certs.length).toFixed(1) : "0";
    const uniqueStudents = new Set(certs.map(c => c.student_id)).size;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* ── Header ── */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #054646, #006D77)" }}>
                                <Award size={20} className="text-[#D4AF37]" />
                            </div>
                            <h1 className="text-3xl font-serif font-black text-[#0D1B2A]">Manajemen Sertifikat</h1>
                        </div>
                        <p className="text-sm text-gray-400 ml-13">
                            Sertifikat otomatis digenerate saat siswa dinyatakan <strong className="text-emerald-600">Lulus</strong> di rekap nilai.
                        </p>
                    </div>
                    <button
                        onClick={fetchCerts}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={<Award size={22} />} label="Total Sertifikat" value={totalCerts} color="#006D77" />
                <StatCard icon={<User size={22} />} label="Siswa Tersertifikasi" value={uniqueStudents} color="#7c3aed" />
                <StatCard icon={<Sparkles size={22} />} label="Rata-rata Nilai" value={avgScore} color="#D4AF37" />
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        placeholder="Cari nama siswa, NIS, atau kelas..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#006D77] transition-all outline-none"
                    />
                </div>
                <select
                    value={filterClass}
                    onChange={e => setFilterClass(Number(e.target.value))}
                    className="px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium text-gray-600 focus:bg-white focus:border-[#006D77] outline-none cursor-pointer"
                >
                    <option value={0}>Semua Kelas</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <span className="text-xs text-gray-400 font-medium">
                    {filtered.length} dari {totalCerts} sertifikat
                </span>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-10 h-10 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Memuat data sertifikat...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center gap-5">
                        <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg, #054646, #006D77)" }}>
                            <Award size={36} className="text-[#D4AF37]" />
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-[#0D1B2A] text-lg mb-1">Belum Ada Sertifikat</p>
                            <p className="text-sm text-gray-400 max-w-xs">
                                Sertifikat akan muncul di sini setelah guru menyimpan rekap nilai siswa dengan status <strong>Lulus</strong>.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/60">
                                    <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Siswa</th>
                                    <th className="text-left px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Kelas</th>
                                    <th className="text-center px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nilai Akhir</th>
                                    <th className="text-left px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">ID Verifikasi</th>
                                    <th className="text-left px-4 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Dikeluarkan</th>
                                    <th className="text-right px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((cert) => (
                                    <tr key={cert.id} className="hover:bg-[#006D77]/4 transition-all group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                    style={{ background: "linear-gradient(135deg, #054646, #006D77)" }}>
                                                    {cert.student?.name?.charAt(0)?.toUpperCase() ?? "?"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#0D1B2A]">{cert.student?.name ?? "—"}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono">NIS: {cert.student?.nis || "—"}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen size={12} className="text-[#006D77]" />
                                                <div>
                                                    <p className="font-semibold text-[#0D1B2A]">{cert.class?.name ?? "—"}</p>
                                                    <p className="text-[10px] text-gray-400">{cert.class?.academic_year?.year_range ?? ""}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-sm ${cert.final_score >= 80 ? "bg-emerald-100 text-emerald-700" : cert.final_score >= 70 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                                                <Sparkles size={11} />
                                                {cert.final_score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <CopyBtn text={cert.uuid} />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-1.5 text-gray-500">
                                                <Calendar size={11} />
                                                <span className="text-xs">
                                                    {new Date(cert.issued_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-0.5">oleh {cert.teacher?.name ?? "—"}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleVerifyLink(cert.uuid)}
                                                    title="Verifikasi"
                                                    className="p-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                                >
                                                    <Shield size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handlePreview(cert.uuid)}
                                                    title="Preview PDF"
                                                    className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(cert.uuid, cert.student?.name ?? "siswa")}
                                                    title="Download PDF"
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#006D77] hover:bg-[#005a63] text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                                                >
                                                    <Download size={12} />
                                                    PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Info Box ── */}
            <div className="bg-gradient-to-r from-[#054646]/10 to-[#006D77]/10 border border-[#006D77]/20 rounded-2xl p-5 flex gap-4">
                <FileCheck className="text-[#006D77] shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-[#054646] space-y-1">
                    <p><strong>Cara kerja Auto-Generate:</strong> Sertifikat dibuat otomatis saat guru menekan tombol <strong>Simpan Rekap</strong> dengan status <strong>LULUS</strong>.</p>
                    <p>Setiap sertifikat memiliki <strong>QR Code unik</strong> yang bisa di-scan untuk memvalidasi keaslian sertifikat secara online.</p>
                </div>
            </div>
        </div>
    );
}
