"use client";

import { useEffect, useState, useCallback } from "react";
import {
    BarChart3, GraduationCap, TrendingUp, BookOpen,
    CheckCircle2, XCircle, Clock, Star, FileText
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

    // ── Summary stats ──────────────────────────────────────────────────────────
    const totalClasses = recaps.length;
    const avgFinal = totalClasses > 0 ? recaps.reduce((s, r) => s + r.final_score, 0) / totalClasses : 0;
    const passed = recaps.filter(r => r.status === "Passed").length;
    const inProgress = recaps.filter(r => r.status === "In Progress").length;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* ── HEADER ── */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                        <BarChart3 size={20} />
                    </div>
                    Rekap Nilai Saya
                </h1>
                <p className="text-sm text-gray-400">Ringkasan nilai dan status kelulusan di setiap kelas yang kamu ikuti.</p>
            </div>

            {/* ── STATS CARDS ── */}
            {!loading && totalClasses > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                        { label: "Total Kelas",   value: totalClasses, icon: <BookOpen size={18} />,      color: "#006D77", bg: "#006D7715" },
                        { label: "Rata-rata Akhir", value: avgFinal.toFixed(1), icon: <Star size={18} />,  color: "#0EA5E9", bg: "#0EA5E915" },
                        { label: "Lulus",          value: passed,      icon: <CheckCircle2 size={18} />,   color: "#059669", bg: "#05966915" },
                        { label: "Sedang Berjalan",value: inProgress,  icon: <TrendingUp size={18} />,     color: "#6366F1", bg: "#6366F115" },
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

            {/* ── MAIN TABLE ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">Memuat rekap nilai...</p>
                    </div>
                ) : recaps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <GraduationCap size={44} className="text-gray-200" />
                        <p className="font-semibold text-gray-400">Belum ada rekap nilai</p>
                        <p className="text-xs text-gray-300 text-center max-w-xs">Rekap nilai akan muncul setelah guru menerbitkan nilai untuk kelasmu.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recaps.map((recap) => {
                            const className = recap.class?.name ?? `Kelas #${recap.class_id}`;
                            const yearRange = recap.class?.academic_year?.year_range ?? "";
                            return (
                                <div key={recap.id} className="px-6 py-5 hover:bg-gray-50/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {/* Left: Class info */}
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77] shrink-0">
                                                <GraduationCap size={22} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#0D1B2A] text-sm">{className}</p>
                                                {yearRange && <p className="text-[11px] text-gray-400">{yearRange}</p>}
                                                <div className="mt-1.5">
                                                    <StatusBadge status={recap.status} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: scores */}
                                        <div className="flex flex-col sm:items-end gap-1.5">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] text-gray-400 w-24 sm:text-right">Nilai Akhir</span>
                                                <ScoreBadge score={recap.final_score} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score bars */}
                                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-gray-400 flex items-center gap-1.5"><FileText size={11} /> Rata-rata Tugas</span>
                                                <span className="font-bold text-[#0D1B2A]">{recap.assignment_avg.toFixed(1)}</span>
                                            </div>
                                            <ScoreBar value={recap.assignment_avg} color="#3B82F6" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-gray-400 flex items-center gap-1.5"><Star size={11} /> Nilai Ujian</span>
                                                <span className="font-bold text-[#0D1B2A]">{recap.exam_score.toFixed(1)}</span>
                                            </div>
                                            <ScoreBar value={recap.exam_score} color="#006D77" />
                                        </div>
                                    </div>

                                    {recap.notes && (
                                        <div className="mt-3 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                                            <p className="text-[11px] text-amber-700"><span className="font-bold">Catatan guru: </span>{recap.notes}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── LEGEND ── */}
            {!loading && recaps.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 justify-center pt-2">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Nilai Tugas</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#006D77] inline-block" /> Nilai Ujian</span>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-emerald-500" /> Lulus ≥ 70</span>
                </div>
            )}
        </div>
    );
}
