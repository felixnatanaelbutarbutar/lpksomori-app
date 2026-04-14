"use client";

import { useEffect, useState, useCallback } from "react";
import {
    BarChart3, GraduationCap, TrendingUp, BookOpen,
    CheckCircle2, XCircle, Clock, Star, FileText, ChevronRight
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface GradeRecap {
    id: number;
    class_id: number;
    class?: { name: string; academic_year?: { year_range: string } };
    assignment_avg: number;
    exam_score: number;
    final_score: number;
    status: string; // "Passed" | "Failed" | "In Progress"
    notes: string;
    updated_at: string;
}

interface DetailedRecap {
    assignment_grades: Record<string, number>;
    exam_grades: Record<string, number>;
    assignment_avg: number;
    exam_avg: number;
    final_score: number;
}

function ScoreBadge({ score }: { score: number }) {
    const color =
        score >= 85 ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
        score >= 70 ? "text-blue-600 bg-blue-50 border-blue-100" :
        score >= 55 ? "text-amber-600 bg-amber-50 border-amber-100" :
        "text-red-600 bg-red-50 border-red-100";
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
            {score.toFixed(1)}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
        "Passed":      { icon: <CheckCircle2 size={12} />, cls: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "Lulus" },
        "Failed":      { icon: <XCircle      size={12} />, cls: "text-red-600 bg-red-50 border-red-100",             label: "Tidak Lulus" },
        "In Progress": { icon: <Clock        size={12} />, cls: "text-blue-600 bg-blue-50 border-blue-100",          label: "Dalam Proses" },
    };
    const c = cfg[status] ?? { icon: <Clock size={12} />, cls: "text-gray-500 bg-gray-50 border-gray-100", label: status };
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.cls}`}>
            {c.icon} {c.label}
        </span>
    );
}

function ScoreBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
    );
}

export default function StudentMyRecapPage() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";
    const [recaps, setRecaps] = useState<GradeRecap[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecap, setSelectedRecap] = useState<GradeRecap | null>(null);
    const [detailedRecap, setDetailedRecap] = useState<DetailedRecap | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const handleSelectRecap = async (recap: GradeRecap) => {
        setSelectedRecap(recap);
        setDetailedRecap(null);
        setLoadingDetail(true);
        try {
            const r = await fetch(`${API}/student/grade-recap/${recap.class_id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const j = await r.json();
            if (j.data) {
                setDetailedRecap(j.data);
            }
        } finally {
            setLoadingDetail(false);
        }
    };

    const fetchRecaps = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/student/grade-recap`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const j = await r.json();
            setRecaps(j.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchRecaps(); }, [fetchRecaps]);

    const totalClasses = recaps.length;
    const avgFinal = totalClasses > 0 ? recaps.reduce((s, r) => s + r.final_score, 0) / totalClasses : 0;
    const passedCount = recaps.filter(r => r.status === "Passed").length;
    const inProgressCount = recaps.filter(r => r.status === "In Progress").length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-3">
                <div className="w-8 h-8 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400 font-medium tracking-wide">Memuat rekap nilai...</p>
            </div>
        );
    }

    if (selectedRecap) {
        const className = selectedRecap.class?.name ?? `Kelas #${selectedRecap.class_id}`;
        const yearRange = selectedRecap.class?.academic_year?.year_range ?? "";

        return (
            <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setSelectedRecap(null)}
                        className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#006D77] transition-colors bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm"
                    >
                        ← Kembali ke Daftar Kelas
                    </button>
                    <div className="text-right">
                        <StatusBadge status={selectedRecap.status} />
                    </div>
                </div>

                <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
                    <div className="bg-[#0D1B2A] p-8 text-white relative overflow-hidden">
                        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                        <div className="relative z-10">
                            <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest mb-1">Laporan Nilai Akhir</p>
                            <h2 className="text-3xl font-serif font-black mb-1">{className}</h2>
                            <p className="text-white/60 text-sm">{yearRange || "Tahun Ajaran Aktif"}</p>
                        </div>
                    </div>

                    <div className="p-8 space-y-10">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full border-4 border-gray-50 flex items-center justify-center bg-gray-50/50">
                                    <span className="text-4xl font-black text-[#0D1B2A]">{(detailedRecap?.final_score ?? selectedRecap.final_score).toFixed(1)}</span>
                                </div>
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-md border border-gray-100">
                                    <span className="text-[10px] font-black uppercase text-[#006D77]">Nilai Akhir</span>
                                </div>
                            </div>
                            <p className="max-w-xs text-sm text-gray-400 leading-relaxed italic">
                                "{selectedRecap.notes || "Terus semangat belajar untuk mencapai impianmu di Negeri Sakura!"}"
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-8">
                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[#3B82F6]">
                                        <FileText size={18} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Rata-rata Tugas</span>
                                    </div>
                                    <span className="text-xl font-black text-[#0D1B2A]">{(detailedRecap?.assignment_avg ?? selectedRecap.assignment_avg).toFixed(1)}</span>
                                </div>
                                <ScoreBar value={detailedRecap?.assignment_avg ?? selectedRecap.assignment_avg} color="#3B82F6" />
                            </div>

                            <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[#006D77]">
                                        <Star size={18} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Nilai Ujian</span>
                                    </div>
                                    <span className="text-xl font-black text-[#0D1B2A]">{(detailedRecap?.exam_avg ?? selectedRecap.exam_score).toFixed(1)}</span>
                                </div>
                                <ScoreBar value={detailedRecap?.exam_avg ?? selectedRecap.exam_score} color="#006D77" />
                            </div>
                        </div>

                        {loadingDetail ? (
                            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
                        ) : detailedRecap ? (
                            <div className="pt-6 border-t border-gray-100 grid md:grid-cols-2 gap-8">
                                {/* Assignment Breakdown */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#0D1B2A] mb-4 flex items-center gap-2">
                                        <FileText size={16} className="text-[#3B82F6]"/> Rincian Nilai Tugas
                                    </h3>
                                    {Object.keys(detailedRecap.assignment_grades || {}).length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Belum ada tugas untuk kelas ini.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {Object.entries(detailedRecap.assignment_grades).map(([title, grade]) => (
                                                <div key={title} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <span className="text-sm font-semibold text-gray-700 truncate mr-3">{title}</span>
                                                    {grade === -1 ? (
                                                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-md">Belum Dinilai</span>
                                                    ) : (
                                                        <span className={`text-sm font-black ${grade === 0 ? 'text-red-500' : 'text-[#0D1B2A]'}`}>{grade.toFixed(1)}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Exam Breakdown */}
                                <div>
                                    <h3 className="text-sm font-bold text-[#0D1B2A] mb-4 flex items-center gap-2">
                                        <Star size={16} className="text-[#006D77]"/> Rincian Nilai Ujian
                                    </h3>
                                    {Object.keys(detailedRecap.exam_grades || {}).length === 0 ? (
                                        <p className="text-xs text-gray-400 italic">Belum ada ujian untuk kelas ini.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {Object.entries(detailedRecap.exam_grades).map(([title, grade]) => (
                                                <div key={title} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <span className="text-sm font-semibold text-gray-700 truncate mr-3">{title}</span>
                                                    {grade === -1 ? (
                                                        <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-md">Belum Dinilai</span>
                                                    ) : (
                                                        <span className={`text-sm font-black ${grade === 0 ? 'text-red-500' : 'text-[#0D1B2A]'}`}>{grade.toFixed(1)}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1">Rekap Nilai Saya</h1>
                        <p className="text-sm text-gray-400">Pilih kelas untuk melihat detail rekap nilai tugas dan ujian.</p>
                    </div>
                </div>
            </div>

            {totalClasses > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Kelas",   value: totalClasses, icon: <BookOpen size={18} />,      color: "#006D77", bg: "#006D7715" },
                        { label: "Rata-rata Akhir", value: avgFinal.toFixed(1), icon: <Star size={18} />,  color: "#0EA5E9", bg: "#0EA5E915" },
                        { label: "Lulus",          value: passedCount,      icon: <CheckCircle2 size={18} />,   color: "#059669", bg: "#05966915" },
                        { label: "Sedang Berjalan",value: inProgressCount,  icon: <TrendingUp size={18} />,     color: "#6366F1", bg: "#6366F115" },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: stat.bg, color: stat.color }}>
                                {stat.icon}
                            </div>
                            <div>
                                <p className="text-2xl font-black text-[#0D1B2A]">{stat.value}</p>
                                <p className="text-[11px] text-gray-400 font-medium">{stat.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {recaps.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-20 flex flex-col items-center justify-center text-center px-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                        <GraduationCap size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-[#0D1B2A]">Belum Ada Nilai Diterbitkan</h3>
                    <p className="text-sm text-gray-400 max-w-sm mt-1">Rekap nilai akan muncul di sini setelah Sensei menyelesaikan dan menerbitkan nilai untuk kelasmu.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recaps.map((recap) => {
                        const className = recap.class?.name ?? `Kelas #${recap.class_id}`;
                        const yearRange = recap.class?.academic_year?.year_range ?? "";
                        return (
                            <div 
                                key={recap.id} 
                                className="group bg-white rounded-[24px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                                            <GraduationCap size={24} />
                                        </div>
                                        <StatusBadge status={recap.status} />
                                    </div>
                                    <h3 className="font-black text-[#0D1B2A] text-lg leading-tight mb-1">{className}</h3>
                                    <p className="text-xs text-gray-400 mb-6">{yearRange || "Tahun Ajaran Aktif"}</p>
                                    
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Tugas</p>
                                            <p className="text-sm font-black text-[#0D1B2A]">{recap.assignment_avg.toFixed(1)}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Ujian</p>
                                            <p className="text-sm font-black text-[#0D1B2A]">{recap.exam_score.toFixed(1)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                                    <button
                                        onClick={() => handleSelectRecap(recap)}
                                        className="w-full py-3 bg-[#006D77] text-white rounded-xl text-xs font-bold shadow-[0_4px_12px_rgba(0,109,119,0.2)] hover:bg-[#0D7A6F] transition-all flex items-center justify-center gap-2"
                                    >
                                        Lihat Detail Rekap <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
