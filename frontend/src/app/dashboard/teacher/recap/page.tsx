"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
    ChevronLeft, GraduationCap, CheckCircle2, XCircle,
    AlertCircle, Save, Search, BarChart3, TrendingUp, Download
} from "lucide-react";
import Swal from "sweetalert2";

const API = "http://localhost:8080/api/v1";

interface StudentRecap {
    student_id: number;
    student_name: string;
    nis: string;
    assignment_grades?: Record<string, number>;
    exam_grades?: Record<string, number>;
    assignment_avg: number;
    exam_avg: number;
    final_score: number;
    status: string;
    notes: string;
}

interface ClassModel { id: number; name: string; }

// ─── Mini CSS bar chart ─────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-3 h-32 px-2">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-[10px] font-bold" style={{ color: d.color }}>{d.value.toFixed(0)}</span>
                    <div
                        className="w-full rounded-t-lg transition-all duration-700"
                        style={{
                            height: `${Math.max((d.value / max) * 100, 4)}%`,
                            background: d.color,
                            opacity: 0.85,
                        }}
                    />
                    <span className="text-[9px] text-gray-400 text-center leading-tight truncate w-full text-center">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Donut ring ─────────────────────────────────────────────────────
function DonutChart({ passed, failed, pending, total }: { passed: number; failed: number; pending: number; total: number }) {
    if (total === 0) return <div className="flex items-center justify-center h-24 text-gray-300 text-xs">Belum ada data</div>;
    const segments = [
        { value: passed, color: "#059669" },
        { value: failed, color: "#dc2626" },
        { value: pending, color: "#3b82f6" },
    ];
    let cumulativeAngle = -90;
    const cx = 50; const cy = 50; const r = 38; const stroke = 12;
    const circumference = 2 * Math.PI * r;

    const arcs = segments.map(seg => {
        const pct = seg.value / total;
        const angle = pct * 360;
        const dashArray = `${pct * circumference} ${circumference}`;
        const rotate = cumulativeAngle;
        cumulativeAngle += angle;
        return { ...seg, dashArray, rotate };
    });

    return (
        <div className="relative w-24 h-24">
            <svg viewBox="0 0 100 100">
                {arcs.map((arc, i) => (
                    <circle key={i} cx={cx} cy={cy} r={r}
                        fill="none" stroke={arc.color} strokeWidth={stroke}
                        strokeDasharray={arc.dashArray}
                        transform={`rotate(${arc.rotate} ${cx} ${cy})`}
                        style={{ transition: "all 0.6s" }}
                    />
                ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-gray-700">{total}</span>
            </div>
        </div>
    );
}

export default function TeacherRecapPage() {
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [classes, setClasses] = useState<ClassModel[]>([]);
    const [recapData, setRecapData] = useState<StudentRecap[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [savingId, setSavingId] = useState<number | null>(null);
    const [weightTask, setWeightTask] = useState<number>(40);
    const [weightExam, setWeightExam] = useState<number>(60);
    const weightError = weightTask + weightExam !== 100;

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    useEffect(() => {
        fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(j => setClasses(j.data ?? []));
    }, [token]);

    const fetchRecap = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/classes/${id}/recap`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            setRecapData(json.data ?? []);
        } finally { setLoading(false); }
    }, [token]);

    useEffect(() => { if (selectedClassId) fetchRecap(selectedClassId); }, [selectedClassId, fetchRecap]);

    const handleUpdateRecap = async (studentId: number, status: string, notes: string, finalScore: number) => {
        setSavingId(studentId);
        try {
            await fetch(`${API}/classes/${selectedClassId}/recap/${studentId}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                body: JSON.stringify({ status, notes, final_score: finalScore })
            });
            setRecapData(prev => prev.map(r => r.student_id === studentId ? { ...r, status, notes, final_score: finalScore } : r));
        } finally { setSavingId(null); }
    };

    const recalculateAll = async () => {
        if (weightError) {
            Swal.fire({ title: "Bobot harus 100%!", text: `Total saat ini: ${weightTask + weightExam}%. Sesuaikan bobot terlebih dahulu.`, icon: "warning", confirmButtonColor: "#006D77" });
            return;
        }
        const res = await Swal.fire({
            title: "Hitung Ulang Nilai?",
            text: `Bobot: Tugas ${weightTask}% | Ujian ${weightExam}%. Nilai akhir semua siswa akan dihitung ulang.`,
            icon: "warning", showCancelButton: true,
            confirmButtonColor: "#006D77", cancelButtonColor: "#d33",
            confirmButtonText: "Ya, Hitung!", cancelButtonText: "Batal"
        });
        if (!res.isConfirmed) return;
        setRecapData(prev => prev.map(r => ({
            ...r,
            final_score: Math.round(((r.assignment_avg * weightTask) / 100) + ((r.exam_avg * weightExam) / 100))
        })));
    };

    const filteredRecap = recapData.filter(r =>
        r.student_name.toLowerCase().includes(search.toLowerCase()) || r.nis?.includes(search)
    );

    const { taskArr, examArr } = useMemo(() => {
        const tc = new Set<string>(); const ec = new Set<string>();
        recapData.forEach(r => {
            Object.keys(r.assignment_grades || {}).forEach(k => tc.add(k));
            Object.keys(r.exam_grades || {}).forEach(k => ec.add(k));
        });
        return { taskArr: Array.from(tc), examArr: Array.from(ec) };
    }, [recapData]);

    const exportToCSV = () => {
        let csv = "data:text/csv;charset=utf-8,";
        const headers = ["Nama Siswa", "NIS", ...taskArr, "Rerata Tugas", ...examArr, "Rerata Ujian", "Nilai Akhir", "Status", "Catatan"];
        csv += headers.map(h => `"${h}"`).join(",") + "\n";
        recapData.forEach(r => {
            const row = [`"${r.student_name}"`, `"${r.nis || "-"}"`];
            taskArr.forEach(t => row.push((r.assignment_grades?.[t] ?? 0).toString()));
            row.push(r.assignment_avg.toFixed(1));
            examArr.forEach(e => row.push((r.exam_grades?.[e] ?? 0).toFixed(1)));
            row.push((r.exam_avg ?? 0).toFixed(1));
            row.push(r.final_score.toFixed(1));
            row.push(`"${r.status}"`);
            row.push(`"${(r.notes || "").replace(/"/g, '""')}"`);
            csv += row.join(",") + "\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csv));
        link.setAttribute("download", `Rekap_${classes.find(c => c.id === selectedClassId)?.name || "Kelas"}.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    // ── Stats ──────────────────────────────────────
    const passed = filteredRecap.filter(r => r.status === "Passed").length;
    const failed = filteredRecap.filter(r => r.status === "Failed").length;
    const pending = filteredRecap.filter(r => r.status === "In Progress").length;
    const avgFinal = filteredRecap.length ? filteredRecap.reduce((a, b) => a + b.final_score, 0) / filteredRecap.length : 0;
    const avgTask = filteredRecap.length ? filteredRecap.reduce((a, b) => a + b.assignment_avg, 0) / filteredRecap.length : 0;
    const avgExam = filteredRecap.length ? filteredRecap.reduce((a, b) => a + (b.exam_avg ?? 0), 0) / filteredRecap.length : 0;

    // Distribution buckets: <60, 60-70, 70-80, 80-90, 90+
    const buckets = [
        { label: "< 60", value: filteredRecap.filter(r => r.final_score < 60).length, color: "#ef4444" },
        { label: "60–70", value: filteredRecap.filter(r => r.final_score >= 60 && r.final_score < 70).length, color: "#f97316" },
        { label: "70–80", value: filteredRecap.filter(r => r.final_score >= 70 && r.final_score < 80).length, color: "#eab308" },
        { label: "80–90", value: filteredRecap.filter(r => r.final_score >= 80 && r.final_score < 90).length, color: "#22c55e" },
        { label: "≥ 90", value: filteredRecap.filter(r => r.final_score >= 90).length, color: "#06b6d4" },
    ];

    // ───────────────────────────────────────────────
    if (!selectedClassId) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-serif font-black text-[#0D1B2A]">Rekapitulasi Nilai &amp; Kenaikan</h1>
                <p className="text-gray-500">Pilih kelas untuk melihat rekapitulasi nilai akhir siswa.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {classes.map(c => (
                        <div key={c.id} onClick={() => setSelectedClassId(c.id)} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center gap-4 hover:border-[#006D77]/30">
                            <div className="w-12 h-12 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]"><GraduationCap size={24} /></div>
                            <div>
                                <h3 className="font-bold text-[#0D1B2A]">{c.name}</h3>
                                <p className="text-xs text-gray-400">Lihat Rekap Nilai</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const className = classes.find(c => c.id === selectedClassId)?.name ?? "";

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <button onClick={() => setSelectedClassId(null)} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#006D77] transition-colors">
                <ChevronLeft size={16} /> Kembali ke daftar kelas
            </button>

            {/* ── Header + Controls ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-serif font-black text-[#0D1B2A]">Rekapitulasi: {className}</h1>
                        <p className="text-sm text-gray-400 mt-1">Atur bobot nilai, hitung ulang, dan ekspor data.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Weight inputs */}
                        <div className={`flex items-center gap-2 p-2 rounded-xl border ${weightError ? "border-red-300 bg-red-50" : "border-gray-100 bg-gray-50"} text-sm`}>
                            <span className="px-2 text-gray-500 font-medium">Tugas:</span>
                            <input type="number" min={0} max={100} value={weightTask}
                                onChange={e => setWeightTask(parseInt(e.target.value) || 0)}
                                className="w-14 text-center py-1 bg-white border border-gray-200 rounded-lg text-purple-700 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            <span className="text-gray-400">%</span>
                            <span className="px-1 text-gray-500 font-medium">Ujian:</span>
                            <input type="number" min={0} max={100} value={weightExam}
                                onChange={e => setWeightExam(parseInt(e.target.value) || 0)}
                                className="w-14 text-center py-1 bg-white border border-gray-200 rounded-lg text-purple-700 font-bold focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            <span className="pr-2 text-gray-400">%</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${weightError ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                                {weightTask + weightExam}% {weightError ? "≠ 100!" : "✓"}
                            </span>
                        </div>
                        <button onClick={recalculateAll} disabled={weightError}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold disabled:opacity-40 transition-all">
                            <TrendingUp size={15} className="inline mr-1.5" />Hitung Ulang
                        </button>
                        <button onClick={exportToCSV}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm">
                            <Download size={15} className="inline mr-1.5" />Export CSV
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input type="text" placeholder="Cari siswa..." value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#006D77] transition-all outline-none" />
                </div>
            </div>

            {/* ── Stat Cards + Charts ── */}
            {!loading && filteredRecap.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Status cards */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="font-bold text-[#0D1B2A] flex items-center gap-2"><BarChart3 size={18} className="text-[#006D77]" /> Status Kenaikan</h3>
                        <div className="flex items-center justify-center gap-8">
                            <DonutChart passed={passed} failed={failed} pending={pending} total={filteredRecap.length} />
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-600" /><span className="text-gray-600">Lulus: <b className="text-emerald-700">{passed}</b></span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600" /><span className="text-gray-600">Mengulang: <b className="text-red-600">{failed}</b></span></div>
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-gray-600">Proses: <b className="text-blue-600">{pending}</b></span></div>
                            </div>
                        </div>
                    </div>

                    {/* Average cards */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="font-bold text-[#0D1B2A] flex items-center gap-2"><TrendingUp size={18} className="text-purple-600" /> Rata-Rata Kelas</h3>
                        <div className="space-y-3">
                            {[
                                { label: "Nilai Akhir", value: avgFinal, color: "#006D77", bg: "bg-teal-50" },
                                { label: "Rerata Tugas", value: avgTask, color: "#7c3aed", bg: "bg-purple-50" },
                                { label: "Rerata Ujian", value: avgExam, color: "#0369a1", bg: "bg-blue-50" },
                            ].map(m => (
                                <div key={m.label} className={`flex items-center justify-between p-3 ${m.bg} rounded-xl`}>
                                    <span className="text-sm font-medium text-gray-600">{m.label}</span>
                                    <span className="text-lg font-black" style={{ color: m.color }}>{m.value.toFixed(1)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Distribution bar chart */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                        <h3 className="font-bold text-[#0D1B2A] flex items-center gap-2"><BarChart3 size={18} className="text-amber-500" /> Distribusi Nilai Akhir</h3>
                        <BarChart data={buckets} />
                    </div>
                </div>
            )}

            {/* ── Main Table ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-0 overflow-hidden">
                {loading ? (
                    <div className="py-20 flex justify-center"><div className="w-8 h-8 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1400px] border-collapse text-sm">
                            <thead>
                                {/* ── TIER 1: GROUP HEADERS ── */}
                                <tr className="bg-gray-50/80 border-b border-gray-100">
                                    <th rowSpan={2} className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-widest sticky left-0 bg-gray-50 z-20 border-r border-gray-200 min-w-[180px]">Data Siswa</th>
                                    {taskArr.length > 0 && (
                                        <th colSpan={taskArr.length + 1} className="px-4 py-3 text-center text-[11px] font-black text-blue-700 bg-blue-50/60 border-r-2 border-blue-200 uppercase tracking-widest">
                                            📚 Penugasan (Tugas) — Bobot {weightTask}%
                                        </th>
                                    )}
                                    {examArr.length > 0 && (
                                        <th colSpan={examArr.length + 1} className="px-4 py-3 text-center text-[11px] font-black text-purple-700 bg-purple-50/60 border-r-2 border-purple-200 uppercase tracking-widest">
                                            📝 Evaluasi (Ujian) — Bobot {weightExam}%
                                        </th>
                                    )}
                                    <th rowSpan={2} className="px-4 py-4 text-center text-[10px] font-black text-emerald-700 bg-emerald-50/60 uppercase tracking-widest border-r-2 border-emerald-200 min-w-[90px]">Nilai Akhir</th>
                                    <th rowSpan={2} className="px-4 py-4 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100 min-w-[160px]">Status</th>
                                    <th rowSpan={2} className="px-4 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-r border-gray-100 min-w-[220px]">Catatan</th>
                                    <th rowSpan={2} className="px-4 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest min-w-[90px]">Aksi</th>
                                </tr>
                                {/* ── TIER 2: DETAIL COLUMNS ── */}
                                <tr className="border-b-2 border-gray-200 bg-gray-50/50">
                                    {taskArr.map(t => <th key={t} className="px-3 py-3 text-center text-[10px] font-semibold text-blue-500 bg-blue-50/30 border-l border-blue-100 truncate max-w-[110px]" title={t}>{t}</th>)}
                                    {taskArr.length > 0 && <th className="px-4 py-3 text-center text-[10px] font-black text-blue-800 bg-blue-100/60 border-x-2 border-blue-200">Rerata</th>}
                                    {examArr.map(e => <th key={e} className="px-3 py-3 text-center text-[10px] font-semibold text-purple-500 bg-purple-50/30 border-l border-purple-100 truncate max-w-[110px]" title={e}>{e}</th>)}
                                    {examArr.length > 0 && <th className="px-4 py-3 text-center text-[10px] font-black text-purple-800 bg-purple-100/60 border-x-2 border-purple-200">Rerata</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRecap.map(r => (
                                    <tr key={r.student_id} className="hover:bg-gray-50/40 transition-all group">
                                        {/* Siswa */}
                                        <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-gray-50/60 border-r border-gray-200 z-10">
                                            <p className="font-bold text-[#0D1B2A]">{r.student_name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">NIS: {r.nis || "—"}</p>
                                        </td>
                                        {/* Assignment columns */}
                                        {taskArr.map(t => (
                                            <td key={t} className="px-3 py-4 text-center bg-blue-50/10 border-l border-blue-50">
                                                {r.assignment_grades?.[t] !== undefined
                                                    ? <span className="font-semibold text-gray-700">{r.assignment_grades[t]}</span>
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                        ))}
                                        {taskArr.length > 0 && (
                                            <td className="px-4 py-4 text-center bg-blue-100/30 border-x-2 border-blue-200">
                                                <span className="font-extrabold text-blue-800 text-base">{r.assignment_avg.toFixed(1)}</span>
                                            </td>
                                        )}
                                        {/* Exam columns */}
                                        {examArr.map(e => (
                                            <td key={e} className="px-3 py-4 text-center bg-purple-50/10 border-l border-purple-50">
                                                {r.exam_grades?.[e] !== undefined
                                                    ? <span className="font-semibold text-gray-700">{r.exam_grades[e].toFixed(1)}</span>
                                                    : <span className="text-gray-300">—</span>}
                                            </td>
                                        ))}
                                        {examArr.length > 0 && (
                                            <td className="px-4 py-4 text-center bg-purple-100/30 border-x-2 border-purple-200">
                                                <span className="font-extrabold text-purple-800 text-base">{(r.exam_avg ?? 0).toFixed(1)}</span>
                                            </td>
                                        )}
                                        {/* Nilai Akhir */}
                                        <td className="px-4 py-4 text-center bg-emerald-50/30 border-r-2 border-emerald-200">
                                            <input type="number" value={r.final_score}
                                                onChange={e => {
                                                    const val = parseFloat(e.target.value);
                                                    setRecapData(prev => prev.map(x => x.student_id === r.student_id ? { ...x, final_score: isNaN(val) ? 0 : val } : x));
                                                }}
                                                className="w-16 px-1.5 py-1.5 border rounded-lg text-center font-black text-emerald-700 bg-white border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm" />
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-4 border-r border-gray-100">
                                            <select value={r.status}
                                                onChange={e => setRecapData(prev => prev.map(x => x.student_id === r.student_id ? { ...x, status: e.target.value } : x))}
                                                className={`w-full px-3 py-1.5 rounded-lg font-bold text-xs appearance-none border-0 focus:ring-2 transition-all cursor-pointer ${r.status === "Passed" ? "bg-emerald-100 text-emerald-700" : r.status === "Failed" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                                                <option value="In Progress">🕒 Belum Ditentukan</option>
                                                <option value="Passed">✅ LULUS / NAIK BAB</option>
                                                <option value="Failed">❌ MENGULANG BAB</option>
                                            </select>
                                        </td>
                                        {/* Catatan */}
                                        <td className="px-4 py-4 border-r border-gray-100">
                                            <input type="text" placeholder="Berikan masukan..."
                                                value={r.notes}
                                                onChange={e => setRecapData(prev => prev.map(x => x.student_id === r.student_id ? { ...x, notes: e.target.value } : x))}
                                                className="w-full bg-gray-50 border-0 focus:bg-white focus:ring-1 focus:ring-gray-200 px-3 py-1.5 rounded-lg text-xs outline-none" />
                                        </td>
                                        {/* Aksi */}
                                        <td className="px-4 py-4 text-right">
                                            <button onClick={() => handleUpdateRecap(r.student_id, r.status, r.notes, r.final_score)}
                                                disabled={savingId === r.student_id}
                                                className="inline-flex items-center gap-2 px-3 py-2 bg-[#006D77] text-white rounded-xl text-xs font-bold shadow hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                                                {savingId === r.student_id ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={13} />}
                                                Simpan
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRecap.length === 0 && (
                                    <tr><td colSpan={100} className="py-16 text-center text-sm text-gray-400">Tidak ada data siswa ditemukan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex gap-4">
                <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-amber-700">
                    Nilai ujian otomatis dikonversi ke skala 100. Anda bisa mengatur bobot persentase Tugas dan Ujian lalu menekan <strong>Hitung Ulang</strong>.
                    Total bobot <strong>harus tepat 100%</strong>. Nilai akhir bisa juga diisi manual per siswa, lalu <strong>Simpan</strong> untuk menyimpan ke database.
                </p>
            </div>
        </div>
    );
}
