"use client";

import { useEffect, useState, useCallback } from "react";
import {
    GraduationCap,
    BookOpen,
    ClipboardList,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    FileText,
    Layers,
    PartyPopper,
    CalendarDays
} from "lucide-react";
import Link from "next/link";

const API = "http://localhost:8080/api/v1";

interface EnrolledClassInfo {
    class_id: number;
    class_name: string;
    academic_year: string;
    course_count: number;
}

interface PendingTask {
    type: "assignment" | "exam";
    id: number;
    title: string;
    course_name: string;
    class_name: string;
    due_date: string | null;
    is_submitted: boolean;
}

interface StudentDashboard {
    enrollments: EnrolledClassInfo[];
    pending_tasks: PendingTask[];
}

function formatDue(due: string | null): string {
    if (!due) return "Tidak ada batas waktu";
    const d = new Date(due);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 1000 / 60 / 60; // hours
    if (diff < 0) return "⚠️ Sudah lewat";
    if (diff < 24) return `🔴 ${Math.floor(diff)}j lagi`;
    if (diff < 48) return `🟡 Besok`;
    return `🟢 ${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function urgencyClass(due: string | null): string {
    if (!due) return "bg-gray-50 text-gray-500";
    const diff = (new Date(due).getTime() - Date.now()) / 1000 / 60 / 60;
    if (diff < 0) return "bg-red-50 text-red-600 border-red-100";
    if (diff < 24) return "bg-red-50 text-red-600 border-red-100";
    if (diff < 48) return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
}

const LEVEL_COLORS = [
    "from-[#006D77] to-[#4ECDC4]",
    "from-[#7B5EA7] to-[#b18fe0]",
    "from-[#E9A800] to-[#f7c948]",
    "from-[#E63946] to-[#f7887e]",
    "from-[#2D6A4F] to-[#52b788]",
];

export default function StudentDashboardPage() {
    const [data, setData] = useState<StudentDashboard | null>(null);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState("");
    const [filter, setFilter] = useState<"all" | "pending" | "submitted">("all");
    const [now, setNow] = useState("");
    const [birthdays, setBirthdays] = useState<{ id: number; name: string; role: string }[]>([]);

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/student/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setData(json.data);
        } finally {
            setLoading(false);
        }

        // Fetch birthdays
        fetch(`${API}/users/birthdays-today`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.data) {
                setBirthdays(data.data);
            }
        })
        .catch(() => {});
    }, [token]);

    useEffect(() => {
        fetchDashboard();
        const d = new Date();
        setNow(d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
        try {
            const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
            setUserName(u.name || u.email || "Siswa");
        } catch { }
    }, [fetchDashboard]);

    const firstName = userName.split(" ")[0];
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 11) return "Selamat pagi";
        if (h < 15) return "Selamat siang";
        if (h < 18) return "Selamat sore";
        return "Selamat malam";
    })();

    const pendingTasks = data?.pending_tasks ?? [];
    const filtered = pendingTasks.filter((t) => {
        if (filter === "pending") return !t.is_submitted;
        if (filter === "submitted") return t.is_submitted;
        return true;
    });

    const pendingCount = pendingTasks.filter((t) => !t.is_submitted).length;
    const submittedCount = pendingTasks.filter((t) => t.is_submitted).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3">
                <div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Memuat dashboard...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-10">
            {/* ── Greeting Header ── */}
            <div className="relative overflow-hidden rounded-3xl p-7 text-white shadow-sm mx-2 sm:mx-0 bg-[#0D1B2A]">
                <div className="absolute right-0 top-0 w-64 h-64 rounded-full opacity-10 bg-white blur-3xl translate-x-1/3 -translate-y-1/3" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1">{greeting}</p>
                        <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: "var(--font-serif)" }}>
                            {firstName} <span className="animate-bounce inline-block">👋</span>
                        </h1>
                        <p className="text-white/90 text-sm">
                            Kamu terdaftar di <span className="font-bold">{data?.enrollments?.length ?? 0} kelas</span> dengan <span className="font-bold">{pendingCount} tugas</span> yang belum diselesaikan.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium border border-white/10 shrink-0">
                        <CalendarDays size={14} /> {now}
                    </div>
                </div>
            </div>

            {/* ── Birthday Notification Banner ── */}
            {birthdays.length > 0 && (
                <div className="bg-white border border-pink-100 rounded-3xl p-5 sm:px-6 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left animate-in fade-in slide-in-from-top-4 duration-500 mx-2 sm:mx-0">
                    <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center shrink-0">
                        <img src="/icons/birthday-cake.png" alt="Cake" className="w-7 h-7 object-contain" />
                    </div>
                    <div className="flex-1">
                            <h3 className="text-[#0D1B2A] font-bold text-base flex items-center justify-center sm:justify-start gap-2">
                                Hari ini ada yang berulang tahun! 🎂
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                Selamat ulang tahun kepada:{" "}
                                <span className="font-semibold text-purple-700">
                                    {birthdays.map((b, i) => (
                                        <span key={b.id}>
                                            {b.name} <span className="text-xs font-normal text-gray-400">({b.role === "teacher" ? "Guru" : "Siswa"})</span>
                                            {i < birthdays.length - 1 ? ", " : ""}
                                        </span>
                                    ))}
                                </span>
                            </p>
                        </div>
                </div>
            )}

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    {
                        label: "Kelas Diikuti",
                        value: data?.enrollments?.length ?? 0,
                        icon: <Layers size={20} className="text-[#006D77]" />,
                        bg: "bg-[#006D77]/10",
                    },
                    {
                        label: "Tugas Belum Dikumpul",
                        value: pendingCount,
                        icon: <ClipboardList size={20} className={pendingCount > 0 ? "text-rose-500" : "text-[#006D77]"} />,
                        bg: pendingCount > 0 ? "bg-rose-50" : "bg-[#006D77]/10",
                    },
                    {
                        label: "Sudah Dikumpul",
                        value: submittedCount,
                        icon: <CheckCircle2 size={20} className="text-emerald-500" />,
                        bg: "bg-emerald-50",
                    },
                ].map((s) => (
                    <div
                        key={s.label}
                        className="rounded-2xl p-5 bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-center justify-between">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                                {s.icon}
                            </div>
                            <span className="text-3xl font-black text-[#0D1B2A]">{s.value}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-4 font-semibold">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Enrolled Classes ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-serif font-bold text-[#0D1B2A]">Kelas Saya</h2>
                    <Link
                        href="/dashboard/students/my-class"
                        className="text-xs text-[#006D77] hover:underline flex items-center gap-1"
                    >
                        Detail kelas <ChevronRight size={12} />
                    </Link>
                </div>

                {(!data?.enrollments || data.enrollments.length === 0) ? (
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-6 flex items-center gap-3">
                        <AlertCircle size={18} className="text-amber-500 shrink-0" />
                        <p className="text-sm text-amber-700">
                            Kamu belum didaftarkan ke kelas manapun. Hubungi admin untuk pendaftaran.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.enrollments.map((cls, i) => (
                            <div
                                key={cls.class_id}
                                className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow"
                            >
                                {/* Color header */}
                                <div
                                    className={`h-16 bg-gradient-to-r ${LEVEL_COLORS[i % LEVEL_COLORS.length]} flex items-center px-4`}
                                >
                                    <GraduationCap size={22} className="text-white/90" />
                                    <span className="ml-2 text-white font-bold text-sm">{cls.class_name}</span>
                                </div>
                                {/* Body */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Tahun Ajaran</span>
                                        <span className="text-xs font-semibold text-gray-700">{cls.academic_year || "—"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Status</span>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-xs font-semibold text-emerald-600">Terdaftar Aktif</span>
                                        </div>
                                    </div>
                                    <Link
                                        href="/dashboard/students/my-class"
                                        className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-[#006D77] py-2 rounded-xl bg-[#006D77]/6 hover:bg-[#006D77]/12 transition-colors"
                                    >
                                        Buka Detail Kelas <ChevronRight size={12} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Assignments & Exams ── */}
            <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <h2 className="text-lg font-serif font-bold text-[#0D1B2A]">Tugas & Ujian</h2>
                    {/* Filter tabs */}
                    <div className="flex rounded-xl overflow-hidden border border-gray-100 bg-gray-50 text-xs">
                        {(["all", "pending", "submitted"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 font-medium transition-colors ${filter === f
                                    ? "bg-[#006D77] text-white"
                                    : "text-gray-500 hover:text-[#006D77]"
                                    }`}
                            >
                                {f === "all" ? "Semua" : f === "pending" ? "Belum Dikumpul" : "Sudah Dikumpul"}
                            </button>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-12 gap-2 bg-white rounded-2xl border border-gray-100">
                        <CheckCircle2 size={32} className="text-emerald-300" />
                        <p className="text-sm text-gray-400">
                            {filter === "pending" ? "Tidak ada tugas yang belum dikumpul 🎉" : "Tidak ada item"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filtered.map((task, idx) => {
                            const isExam = task.type === "exam";
                            const linkHref = `/dashboard/students/${isExam ? "exams" : "assignments"}/${task.id}`;
                            return (
                                <Link
                                    href={linkHref}
                                    key={`${task.type}-${task.id}-${idx}`}
                                    onClick={(e) => {
                                        if (task.is_submitted) {
                                            e.preventDefault();
                                            alert("Anda sudah mengerjakan ujian/tugas ini!");
                                        }
                                    }}
                                    className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer block ${task.is_submitted ? "border-emerald-100 opacity-60" : "border-gray-100 hover:border-[#006D77]/50"
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Type badge */}
                                        <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${isExam
                                                ? "bg-gradient-to-br from-purple-500 to-purple-700"
                                                : "bg-gradient-to-br from-blue-500 to-blue-700"
                                                }`}
                                        >
                                            {isExam ? <FileText size={15} /> : <ClipboardList size={15} />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-sm font-semibold text-[#0D1B2A] leading-tight group-hover:text-[#006D77] transition-colors">
                                                    {task.title}
                                                </p>
                                                {task.is_submitted && (
                                                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 size={10} />
                                                        Terkumpul
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {task.course_name} · {task.class_name}
                                            </p>

                                            <div className="flex items-center justify-between mt-2.5">
                                                {/* Due date */}
                                                <div
                                                    className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border ${task.is_submitted ? "bg-gray-50 text-gray-400 border-gray-100" : urgencyClass(task.due_date)
                                                        }`}
                                                >
                                                    <Clock size={10} />
                                                    <span>{task.is_submitted ? "Sudah dikirim" : formatDue(task.due_date)}</span>
                                                </div>

                                                {/* Type label */}
                                                <span
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${isExam
                                                        ? "bg-purple-50 text-purple-600"
                                                        : "bg-blue-50 text-blue-600"
                                                        }`}
                                                >
                                                    {isExam ? "Ujian" : "Tugas"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
