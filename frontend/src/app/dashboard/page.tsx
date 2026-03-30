"use client";

import { useEffect, useState } from "react";
import {
    Users,
    GraduationCap,
    CalendarDays,
    CheckCircle2,
    BookOpen,
    ArrowUpRight,
    ClipboardList,
    FileText,
} from "lucide-react";
import { parseRole, type Role, hasPermission } from "../../lib/roleHelper";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface DashboardStats {
    active_students: number;
    total_classes: number;
    active_year: string;
    total_years: number;
    completed_exams: number;
    total_teachers: number;
    new_students_month: number;
}

function StatCard({
    label,
    labelJa,
    value,
    sub,
    icon: Icon,
    accentColor,
    accentBg,
    loading,
    trend,
}: {
    label: string;
    labelJa: string;
    value: string | number;
    sub: string;
    icon: React.ElementType;
    accentColor: string;
    accentBg: string;
    loading: boolean;
    trend?: string;
}) {
    return (
        <div
            className="group relative rounded-2xl p-5 cursor-default transition-all duration-300"
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
            }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
        >
            <div className="flex items-start justify-between mb-5">
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: accentBg }}
                >
                    <Icon size={18} style={{ color: accentColor }} />
                </div>
                {trend && !loading && (
                    <span
                        className="flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                            background: "var(--success-bg)",
                            color: "var(--success)",
                        }}
                    >
                        <ArrowUpRight size={11} />
                        {trend}
                    </span>
                )}
            </div>

            {loading ? (
                <div className="space-y-2">
                    <div className="h-8 w-20 rounded-xl skeleton" />
                    <div className="h-4 w-28 rounded-lg skeleton" />
                </div>
            ) : (
                <>
                    <p
                        className="text-3xl font-bold mb-0.5 tracking-tight"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}
                    >
                        {value || "—"}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
                        {label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {labelJa}
                    </p>
                    <p
                        className="text-xs mt-4 pt-4"
                        style={{
                            color: "var(--text-muted)",
                            borderTop: "1px solid var(--border-subtle)",
                        }}
                    >
                        {sub}
                    </p>
                </>
            )}
        </div>
    );
}

function SummaryRow({
    label,
    desc,
    value,
    icon: Icon,
    color,
    bg,
    loading,
}: {
    label: string;
    desc: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    bg: string;
    loading: boolean;
}) {
    return (
        <div
            className="flex items-center gap-4 px-5 py-3.5 transition-colors"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
        >
            <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: bg }}
            >
                <Icon size={15} style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {desc}
                </p>
            </div>
            <div>
                {loading ? (
                    <div className="h-5 w-10 rounded skeleton" />
                ) : (
                    <span className="text-lg font-bold" style={{ color }}>
                        {value}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState("");
    const [userName, setUserName] = useState("Pengguna");
    const [role, setRole] = useState<Role>("student");

    useEffect(() => {
        const d = new Date();
        setNow(
            d.toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            })
        );

        try {
            const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
            setUserName(u.Name || u.name || "Pengguna");
            setRole(parseRole(localStorage.getItem("mori_role")));
        } catch { }

        fetch(`${API_BASE}/stats`)
            .then((r) => r.json())
            .then((j) => setStats(j))
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    }, []);

    const statCards = [
        {
            label: "Siswa Aktif",
            labelJa: "在籍学生数",
            value: stats?.active_students ?? 0,
            sub: stats?.new_students_month
                ? `+${stats.new_students_month} baru bulan ini`
                : "Belum ada data bulan ini",
            icon: Users,
            accentColor: "var(--accent)",
            accentBg: "var(--accent-soft)",
            trend: stats?.new_students_month ? `+${stats.new_students_month}` : undefined,
        },
        {
            label: "Total Kelas",
            labelJa: "総クラス数",
            value: stats?.total_classes ?? 0,
            sub: stats?.active_year ? `Tahun Ajaran ${stats.active_year}` : "Tidak ada tahun aktif",
            icon: GraduationCap,
            accentColor: "var(--gold)",
            accentBg: "var(--gold-soft)",
        },
        {
            label: "Tahun Aktif",
            labelJa: "現年度",
            value: stats?.active_year || "—",
            sub: stats?.total_years ? `${stats.total_years} tahun ajaran tercatat` : "Sedang berjalan",
            icon: CalendarDays,
            accentColor: "var(--role-student)",
            accentBg: "var(--role-student-bg)",
        },
        {
            label: "Jawaban Ujian",
            labelJa: "完了試験数",
            value: (stats?.completed_exams ?? 0).toLocaleString("id-ID"),
            sub: `${stats?.total_teachers ?? 0} guru aktif`,
            icon: CheckCircle2,
            accentColor: "#6D5ACD",
            accentBg: "#EEEEFB",
        },
    ];

    const summaryRows = [
        {
            label: "Total Guru",
            desc: "Pengajar terdaftar",
            value: stats?.total_teachers ?? "—",
            icon: BookOpen,
            color: "var(--accent)",
            bg: "var(--accent-soft)",
        },
        {
            label: "Siswa Aktif",
            desc: "Dengan status aktif",
            value: stats?.active_students ?? "—",
            icon: Users,
            color: "var(--role-student)",
            bg: "var(--role-student-bg)",
        },
        {
            label: "Kelas Berjalan",
            desc: `Tahun ajaran ${stats?.active_year || "—"}`,
            value: stats?.total_classes ?? "—",
            icon: GraduationCap,
            color: "var(--gold)",
            bg: "var(--gold-soft)",
        },
        {
            label: "Jawaban Terkumpul",
            desc: "Total dari semua ujian",
            value: (stats?.completed_exams ?? 0).toLocaleString("id-ID"),
            icon: CheckCircle2,
            color: "#6D5ACD",
            bg: "#EEEEFB",
        },
    ];

    const quickActions = [
        { label: "Manajemen Pengguna", labelJa: "ユーザー管理", color: "var(--accent)", bg: "var(--accent-soft)", emoji: "👥", href: "/dashboard/users", feature: "users" as const },
        { label: "Tahun Ajaran", labelJa: "新年度", color: "var(--gold)", bg: "var(--gold-soft)", emoji: "📅", href: "/dashboard/academic", feature: "academic_years" as const },
        { label: "Kelola Kelas", labelJa: "クラス管理", color: "var(--role-student)", bg: "var(--role-student-bg)", emoji: "🏫", href: "/dashboard/classes", feature: "classes" as const },
        { label: "Manajemen Tugas", labelJa: "課題管理", color: "#006D77", bg: "#e6f2f3", emoji: "📝", href: "/dashboard/teacher/assignments", feature: "teacher_assignments" as const },
        { label: "Manajemen Ujian", labelJa: "試験管理", color: "#7B5EA7", bg: "#f1eff6", emoji: "⏱️", href: "/dashboard/teacher/exams", feature: "teacher_exams" as const },
        { label: "Rekap Nilai", labelJa: "成績確認", color: "#B07D3A", bg: "#F5EDD9", emoji: "📊", href: "/dashboard/teacher/recap", feature: "reports" as const },
    ].filter(action => hasPermission(role, action.feature));

    const firstWord = userName.split(" ")[0];

    return (
        <div className="space-y-7 max-w-7xl mx-auto">
            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                    <p
                        className="text-xs font-semibold uppercase tracking-[0.12em] mb-1"
                        style={{ color: "var(--text-muted)" }}
                    >
                        Selamat datang kembali
                    </p>
                    <h1
                        className="text-2xl font-bold"
                        style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-serif)",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {firstWord}
                        <span className="ml-2 inline-block animate-bounce">👋</span>
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        LPK SO Mori Centre
                        {stats?.active_year ? ` — Tahun Ajaran ${stats.active_year}` : ""}
                    </p>
                </div>

                <div
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium w-fit shrink-0"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <CalendarDays size={12} style={{ color: "var(--accent)" }} />
                    {now}
                </div>
            </div>

            {/* ── Stats Grid ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {statCards.map((s) => (
                    <StatCard key={s.label} {...s} loading={loading} />
                ))}
            </div>

            {/* ── Bottom Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Summary table — 3 cols */}
                <div
                    className="lg:col-span-3 rounded-2xl overflow-hidden"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <div
                        className="flex items-center justify-between px-5 py-4"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Ringkasan Platform
                        </h3>
                        <span
                            className="text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: "var(--text-muted)" }}
                        >
                            プラットフォーム概要
                        </span>
                    </div>
                    <div>
                        {summaryRows.map((row, i) => (
                            <SummaryRow key={i} {...row} loading={loading} />
                        ))}
                    </div>
                </div>

                {/* Quick Actions — 2 cols */}
                <div
                    className="lg:col-span-2 rounded-2xl flex flex-col overflow-hidden"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <div
                        className="px-5 py-4"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            Aksi Cepat
                        </h3>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-3 flex-1">
                        {quickActions.map((action) => (
                            <a
                                key={action.label}
                                href={action.href}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center no-underline transition-all duration-200 group"
                                style={{
                                    background: "var(--bg-canvas)",
                                    border: "1px solid var(--border)",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = action.bg;
                                    (e.currentTarget as HTMLElement).style.borderColor = action.color + "40";
                                    (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${action.color}15`;
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = "var(--bg-canvas)";
                                    (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                                }}
                            >
                                <span className="text-2xl transition-transform duration-200 group-hover:scale-110">
                                    {action.emoji}
                                </span>
                                <div>
                                    <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                        {action.label}
                                    </p>
                                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                        {action.labelJa}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>

                    {/* Branding card */}
                    <div
                        className="mx-4 mb-4 rounded-xl p-4 text-white relative overflow-hidden"
                        style={{
                            background: "var(--sidebar-bg)",
                        }}
                    >
                        <div
                            className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10"
                            style={{ background: "var(--accent)" }}
                        />
                        <p className="text-xs font-bold mb-1 relative z-10" style={{ color: "rgba(255,255,255,0.9)" }}>
                            森センター
                        </p>
                        <p className="text-[11px] leading-relaxed relative z-10" style={{ color: "rgba(255,255,255,0.4)" }}>
                            日本語職業訓練センター
                            <br />
                            {stats?.active_year ? `Academic Year ${stats.active_year}` : "Academic Portal"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
