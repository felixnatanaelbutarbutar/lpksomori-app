"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Users, GraduationCap, CalendarDays, BookOpen,
    ArrowUpRight, ClipboardList, FileText, CheckCircle2,
    TrendingUp, Star, PieChart, Megaphone, Settings,
    RefreshCw, BarChart2, Gift, PartyPopper
} from "lucide-react";
import { parseRole, type Role, hasPermission } from "../../lib/roleHelper";
import { useLanguage } from "../../i18n/LanguageContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface ClassDist { name: string; count: number; }

interface GradeHistory {
    class_name: string;
    final_score: number;
    enrolled_at: string;
}

interface DashboardStats {
    active_students: number;
    total_classes: number;
    active_year: string;
    total_years: number;
    completed_exams: number;
    total_teachers: number;
    new_students_month: number;
    total_assignments: number;
    total_exams: number;
    total_submissions: number;
    class_distribution: ClassDist[];
    app_settings: Record<string, string>;
    top_students: { name: string; score: number; photo?: string }[];
}

// ─── Mini bar chart (pure CSS/SVG, no lib needed) ───────────────────────────
function MiniBarChart({ data }: { data: ClassDist[] }) {
    const { t } = useLanguage();
    if (!data || data.length === 0) return (
        <div className="flex items-center justify-center h-32 text-xs text-gray-300">{t("dashboard.noClassData")}</div>
    );
    const max = Math.max(...data.map(d => d.count), 1);
    const COLORS = ["#006D77", "#4ECDC4", "#E9C46A", "#F4A261", "#6D5ACD", "#2196F3", "#43A047", "#E53935"];
    return (
        <div className="flex items-end gap-2 h-32 pb-1">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <span className="text-[10px] font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                        {d.count}
                    </span>
                    <div
                        className="w-full rounded-t-lg transition-all duration-700"
                        style={{
                            height: `${Math.max((d.count / max) * 90, 8)}%`,
                            background: `linear-gradient(to top, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}99)`,
                        }}
                        title={`${d.name}: ${d.count} siswa`}
                    />
                    <span className="text-[8px] text-gray-400 text-center leading-tight truncate w-full text-center" title={d.name}>
                        {d.name.replace("Kelas ", "")}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── Grade Progress Chart (Line Chart) ──────────────────────────────────────
function GradeProgressChart({ data }: { data: GradeHistory[] }) {
    const { t } = useLanguage();
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    if (!data || data.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center h-48 opacity-40 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                <TrendingUp size={32} className="mb-2 text-gray-300" />
                <p className="text-[10px] uppercase font-bold text-gray-400">
                    {data.length === 1 ? t("dashboard.needMoreData") : t("dashboard.noScoreHistory")}
                </p>
                <p className="text-[9px] text-gray-400 mt-1 px-4 text-center leading-relaxed">{t("dashboard.chartHelpText")}</p>
            </div>
        );
    }

    const width = 600;
    const height = 200;
    const padding = 35;
    const maxScore = 100;
    
    // Calculate points
    const points = data.map((d, i) => {
        const x = padding + (i * (width - 2 * padding)) / (data.length - 1);
        const y = height - padding - (d.final_score / maxScore) * (height - 2 * padding);
        return { x, y, score: d.final_score, name: d.class_name };
    });

    const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
        <div className="relative w-full group py-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#006D77" />
                        <stop offset="100%" stopColor="#4ECDC4" />
                    </linearGradient>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#006D77" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#006D77" stopOpacity="0" />
                    </linearGradient>
                </defs>
                
                {/* Y-Axis Grid */}
                {[0, 25, 50, 75, 100].map(val => {
                    const y = height - padding - (val / maxScore) * (height - 2 * padding);
                    return (
                        <g key={val}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                            <text x={padding - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-300 font-bold">{val}</text>
                        </g>
                    );
                })}

                {/* X-Axis Labels */}
                {data.map((d, i) => {
                    const x = padding + (i * (width - 2 * padding)) / (data.length - 1);
                    return (
                        <text key={i} x={x} y={height - 8} textAnchor="middle" className="text-[9px] font-bold fill-gray-400">
                            {d.class_name.split(" ").slice(1).join(" ") || d.class_name.substring(0, 7)}
                        </text>
                    );
                })}

                {/* Line Area */}
                <path d={areaD} fill="url(#areaGrad)" />
                
                {/* Path with stroke-dasharray animation logic could be here, but using simple CSS for now */}
                <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" 
                    className="transition-all duration-1000" />

                {/* Interaction Overlay (Vertical bars) */}
                {points.map((p, i) => (
                    <rect key={i} x={p.x - 20} y={0} width="40" height={height} fill="transparent" 
                        onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)} className="cursor-pointer" />
                ))}

                {/* Vertical Guideline */}
                {hoverIndex !== null && (
                    <line x1={points[hoverIndex].x} y1={padding} x2={points[hoverIndex].x} y2={height - padding} 
                        stroke="#006D7720" strokeWidth="1" strokeDasharray="4 2" />
                )}

                {/* Data Points */}
                {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r={hoverIndex === i ? 6 : 4.5} fill="white" stroke="#006D77" strokeWidth="2.5" 
                            className="transition-all duration-300" />
                    </g>
                ))}
            </svg>

            {/* Nice interactive Tooltip */}
            {hoverIndex !== null && (
                <div className="absolute bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 z-20 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95"
                    style={{ 
                        left: `${(points[hoverIndex].x / width) * 100}%`, 
                        top: `${(points[hoverIndex].y / height) * 100}%`,
                        transform: "translate(-50%, -125%)" 
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[#006D77]" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">{data[hoverIndex].class_name}</p>
                    </div>
                    <p className="text-2xl font-black text-[#0D1B2A] leading-none mb-1">{data[hoverIndex].final_score}<span className="text-xs font-normal text-gray-400 ml-1">{t("dashboard.points")}</span></p>
                    <p className="text-[9px] text-[#006D77] font-bold">{t("dashboard.enrolled")}: {new Date(data[hoverIndex].enrolled_at).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })}</p>
                </div>
            )}
        </div>
    );
}

// ─── Activity ring (donut chart) ────────────────────────────────────────────
function ActivityRing({ assignments, exams, submissions }: { assignments: number; exams: number; submissions: number; }) {
    const { t } = useLanguage();
    const total = assignments + exams + submissions || 1;
    const segments = [
        { value: assignments, color: "#006D77", label: t("dashboard.assignments") },
        { value: exams, color: "#E9C46A", label: t("dashboard.exams") },
        { value: submissions, color: "#4ECDC4", label: t("dashboard.submissions") },
    ];
    const cx = 50; const cy = 50; const r = 36; const stroke = 14;
    const circumference = 2 * Math.PI * r;
    let cumulativeAngle = -90;
    const arcs = segments.map(seg => {
        const pct = seg.value / total;
        const dashArray = `${pct * circumference} ${circumference}`;
        const rotate = cumulativeAngle;
        cumulativeAngle += pct * 360;
        return { ...seg, dashArray, rotate };
    });
    return (
        <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
                    {arcs.map((arc, i) => (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                            stroke={arc.color} strokeWidth={stroke}
                            strokeDasharray={arc.dashArray}
                            transform={`rotate(${arc.rotate} ${cx} ${cy})`}
                            style={{ transition: "all 0.6s ease" }}
                        />
                    ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-gray-800">{total}</span>
                    <span className="text-[8px] text-gray-400 text-center leading-tight">{t("dashboard.total")}</span>
                </div>
            </div>
            <div className="space-y-2">
                {segments.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                            <p className="text-[10px] text-gray-400">{s.value} {t("dashboard.items")}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, labelJa, value, sub, icon: Icon, color, bg, trend, loading }: {
    label: string; labelJa: string; value: string | number; sub: string;
    icon: React.ElementType; color: string; bg: string; trend?: string; loading: boolean;
}) {
    return (
        <div className="relative rounded-2xl p-5 overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            {/* Glow blob */}
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 blur-xl transition-all group-hover:opacity-20"
                style={{ background: color }} />
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon size={20} style={{ color }} />
                </div>
                {trend && !loading && (
                    <span className="flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        <ArrowUpRight size={11} />{trend}
                    </span>
                )}
            </div>
            {loading ? (
                <div className="space-y-2">
                    <div className="h-8 w-20 rounded-xl bg-gray-100 animate-pulse" />
                    <div className="h-4 w-28 rounded-lg bg-gray-100 animate-pulse" />
                </div>
            ) : (
                <>
                    <p className="text-3xl font-black tracking-tight mb-0.5" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)" }}>
                        {value || "—"}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>{label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{labelJa}</p>
                    <p className="text-xs mt-4 pt-3.5" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)" }}>{sub}</p>
                </>
            )}
        </div>
    );
}

// ─── Leaderboard ────────────────────────────────────────────────────────────
function Leaderboard({ students }: { students: DashboardStats["top_students"] }) {
    const { t, lang } = useLanguage();
    if (!students || students.length === 0) return (
        <div className="flex flex-col items-center justify-center py-10 opacity-30">
            <Star size={32} className="mb-2 text-gray-300" />
            <p className="text-[10px] uppercase font-bold text-gray-400">{t("dashboard.noRankData")}</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {students.map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-3xl border border-gray-100 bg-white hover:shadow-lg transition-all relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ background: i === 0 ? "linear-gradient(90deg, #F59E0B, #FCD34D)" : i === 1 ? "linear-gradient(90deg, #9ca3af, #e5e7eb)" : i === 2 ? "linear-gradient(90deg, #d97706, #fcd34d)" : "linear-gradient(90deg, #006D77, #4ECDC4)" }} />
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center font-black text-xs" style={{ 
                        background: i === 0 ? "#FFFBEB" : i === 1 ? "#F3F4F6" : i === 2 ? "#FFF7ED" : "#E2FCFA",
                        color: i === 0 ? "#D97706" : i === 1 ? "#4B5563" : i === 2 ? "#B45309" : "#006D77"
                    }}>
                        #{i + 1}
                    </div>

                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 shadow-sm shrink-0" style={{ borderColor: i === 0 ? "#FCD34D" : i === 1 ? "#E5E7EB" : i === 2 ? "#d97706" : "#4ECDC4" }}>
                        {s.photo ? (
                            <img src={s.photo} alt={s.name} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xl uppercase bg-gray-50">
                                {s.name[0]}
                            </div>
                        )}
                    </div>
                    
                    <div className="text-center w-full">
                        <p className="text-sm font-bold truncate text-[#0D1B2A] px-2" title={s.name}>{s.name}</p>
                        <p className="text-xs text-gray-400 mt-1 mb-2">{t("dashboard.performance")}: <span className="font-bold text-[#0D1B2A]">{Math.round(s.score)}%</span></p>

                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="h-full transition-all duration-1000" style={{ width: `${Math.min(s.score, 100)}%`, background: i === 0 ? "#F59E0B" : "#006D77" }} />
                        </div>
                        <div className="mt-3 text-[10px] font-semibold flex items-center justify-center gap-1" style={{ color: i === 0 ? "#D97706" : "var(--text-muted)" }}>
                             <CheckCircle2 size={12} className={i === 0 ? "text-amber-500" : "text-[#006D77]"} /> {i === 0 ? t("dashboard.topAchiever") : t("dashboard.excellent")}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Quick Action ────────────────────────────────────────────────────────────
function QuickAction({ label, labelJa, emoji, imgSrc, href, color, bg }: {
    label: string; labelJa: string; emoji?: string; imgSrc?: string; href: string; color: string; bg: string;
}) {
    return (
        <Link href={href}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center no-underline transition-all duration-200 group hover:scale-105 hover:shadow-[0_8px_30px_-10px_rgba(0,109,119,0.15)]"
            style={{ background: "white", border: "1px solid var(--border)" }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = bg;
                (e.currentTarget as HTMLElement).style.borderColor = color + "40";
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "white";
                (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
            }}
        >
            {imgSrc ? (
                <img src={imgSrc} alt={label} className="w-8 h-8 object-contain transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-110 drop-shadow-sm" />
            ) : (
                <span className="text-2xl transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-110 drop-shadow-sm">{emoji}</span>
            )}
            <div>
                <p className="text-xs font-bold text-[#0D1B2A]">{label}</p>
                <p className="text-[10px] mt-0.5 text-gray-400">{labelJa}</p>
            </div>
        </Link>
    );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [now, setNow] = useState("");
    const [userName, setUserName] = useState("Pengguna");
    const [role, setRole] = useState<Role>("student");
    const [gradeHistory, setGradeHistory] = useState<GradeHistory[]>([]);

    const [birthdays, setBirthdays] = useState<{ id: number; name: string; role: string }[]>([]);

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        else setRefreshing(true);
        
        const token = localStorage.getItem("mori_token") || "";
        const headers = { "Authorization": `Bearer ${token}` };

        try {
            // Stats
            fetch(`${API_BASE}/stats`).then(res => res.ok && res.json()).then(setStats);
            
            // Grade History
            fetch(`${API_BASE}/users/me/grade-history`, { headers })
                .then(res => res.ok && res.json())
                .then(j => j && setGradeHistory(j.data || []));

            // Birthdays
            fetch(`${API_BASE}/users/birthdays-today`).then(res => res.ok && res.json()).then(d => d && setBirthdays(d.data || []));
        } catch { } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        const d = new Date();
        setNow(d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
        try {
            const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
            setUserName(u.Name || u.name || "Pengguna");
            setRole(parseRole(localStorage.getItem("mori_role")));
        } catch { }
        fetchStats();
    }, [fetchStats]);

    const statCards = [
        {
            label: "Siswa Aktif", labelJa: "在籍学生数",
            value: stats?.active_students ?? 0,
            sub: stats?.new_students_month ? `+${stats.new_students_month} siswa baru bulan ini` : "Belum ada siswa baru bulan ini",
            icon: Users, color: "#006D77", bg: "#e6f2f3",
            trend: stats?.new_students_month ? `+${stats.new_students_month}` : undefined,
        },
        {
            label: "Total Kelas", labelJa: "総クラス数",
            value: stats?.total_classes ?? 0,
            sub: stats?.active_year ? `Tahun Ajaran ${stats.active_year}` : "Tidak ada tahun aktif",
            icon: GraduationCap, color: "#E9C46A", bg: "#fef8e7",
        },
        {
            label: "Guru Aktif", labelJa: "講師数",
            value: stats?.total_teachers ?? 0,
            sub: `${stats?.total_years ?? 0} tahun ajaran tercatat`,
            icon: BookOpen, color: "#7B5EA7", bg: "#f1eff6",
        },
        {
            label: "Jawaban Ujian", labelJa: "完了試験数",
            value: (stats?.completed_exams ?? 0).toLocaleString("id-ID"),
            sub: `${stats?.total_submissions ?? 0} submission tugas masuk`,
            icon: CheckCircle2, color: "#4ECDC4", bg: "#edfbfb",
        },
    ];

    const quickActions = [
        { label: "Pengguna", labelJa: "ユーザー管理", imgSrc: "/icons/multiple-users-silhouette.png", href: "/dashboard/users", feature: "users" as const, color: "#006D77", bg: "#e6f2f3" },
        { label: "Tahun Ajaran", labelJa: "年度管理", emoji: "📅", href: "/dashboard/academic", feature: "academic_years" as const, color: "#E9C46A", bg: "#fef8e7" },
        { label: "Kelas", labelJa: "クラス管理", imgSrc: "/icons/google-classroom.png", href: "/dashboard/classes", feature: "classes" as const, color: "#7B5EA7", bg: "#f1eff6" },
        { label: "Tugas", labelJa: "課題管理", imgSrc: "/icons/task.png", href: "/dashboard/teacher/assignments", feature: "teacher_assignments" as const, color: "#4ECDC4", bg: "#edfbfb" },
        { label: "Ujian", labelJa: "試験管理", imgSrc: "/icons/exams.png", href: "/dashboard/teacher/exams", feature: "teacher_exams" as const, color: "#F4A261", bg: "#fdf3ea" },
        { label: "Pengumuman", labelJa: "お知らせ", imgSrc: "/icons/megaphone.png", href: "/dashboard/announcements", feature: "announcements" as const, color: "#E53935", bg: "#fdecea" },
        { label: "Rekap Nilai", labelJa: "成績確認", imgSrc: "/icons/score.png", href: "/dashboard/teacher/recap", feature: "reports" as const, color: "#43A047", bg: "#edf7ed" },
        { label: "Pengaturan", labelJa: "設定", imgSrc: "/icons/settings.png", href: "/dashboard/settings", feature: "settings" as const, color: "#607D8B", bg: "#eceff1" },
    ].filter(a => hasPermission(role, a.feature));

    const firstName = userName.split(" ")[0];
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 11) return "Selamat pagi";
        if (h < 15) return "Selamat siang";
        if (h < 18) return "Selamat sore";
        return "Selamat malam";
    })();

    return (
        <div className="space-y-7 max-w-7xl mx-auto pb-10">
            {/* ── Hero Header ── */}
            <div className="relative rounded-3xl overflow-hidden p-7 text-white shadow-sm mx-2 sm:mx-0 bg-[#0D1B2A]">
                {/* Decorative circles */}
                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10" style={{ background: "white" }} />
                <div className="absolute right-20 -bottom-6 w-28 h-28 rounded-full opacity-5" style={{ background: "white" }} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{greeting}</p>
                        <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "var(--font-serif)", color: "white" }}>
                            {firstName} <span className="animate-bounce inline-block">👋</span>
                        </h1>
                        <p className="text-white/70 mt-1 text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                            {stats?.app_settings?.lpk_name || "LPK SO Mori Centre"}{stats?.active_year ? ` — T.A. ${stats.active_year}` : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-xs text-white/80">
                            <CalendarDays size={12} />{now}
                        </div>
                        <button
                            onClick={() => fetchStats(true)}
                            disabled={refreshing}
                            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                            title="Refresh data"
                        >
                            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Mini stat band inside header */}
                <div className="relative z-10 mt-6 flex flex-wrap gap-4">
                    {[
                        { label: "Tahun Ajaran", val: stats?.active_year || "—" },
                        { label: "Total TA", val: `${stats?.total_years ?? "—"} tahun` },
                        { label: "Tugas Dibuat", val: stats?.total_assignments ?? "—" },
                        { label: "Ujian Dibuat", val: stats?.total_exams ?? "—" },
                    ].map((s, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                            <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">{s.label}</p>
                            <p className="text-sm font-black text-white">{loading ? "..." : s.val}</p>
                        </div>
                    ))}
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

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {statCards.map(s => <StatCard key={s.label} {...s} loading={loading} />)}
            </div>

            {/* ── Charts + Quick Actions Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Distribusi Siswa per Kelas */}
                <div className="rounded-2xl p-5"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                <BarChart2 size={16} className="inline mr-2 text-[#006D77]" />Distribusi Siswa
                            </h3>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Siswa per kelas aktif</p>
                        </div>
                    </div>
                    {loading ? (
                        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
                    ) : (
                        <MiniBarChart data={stats?.class_distribution ?? []} />
                    )}
                </div>

                {/* Grafik Perkembangan Nilai Siswa (Line Chart) */}
                <div className="rounded-2xl p-5"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                <TrendingUp size={16} className="inline mr-2 text-[#006D77]" />Progress Belajar
                            </h3>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Riwayat nilai akhir tiap kelas</p>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold uppercase tracking-wider">Line Chart</span>
                    </div>
                    {loading ? (
                        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
                    ) : (
                        <GradeProgressChart data={gradeHistory} />
                    )}
                </div>

                {/* Activity Donut */}
                <div className="rounded-2xl p-5"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="mb-5">
                        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                            <TrendingUp size={16} className="inline mr-2 text-purple-500" />Aktivitas Platform
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Total konten & submission</p>
                    </div>
                    {loading ? (
                        <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
                    ) : (
                        <ActivityRing
                            assignments={stats?.total_assignments ?? 0}
                            exams={stats?.total_exams ?? 0}
                            submissions={stats?.total_submissions ?? 0}
                        />
                    )}
                </div>

                {/* Leaderboard Platinum */}
                <div className="rounded-2xl p-5 lg:col-span-3"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                                <Star size={16} className="inline mr-2 text-amber-500" fill="#f59e0b" />Peringkat Siswa
                            </h3>
                            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Top 5 performa terbaik LPK</p>
                        </div>
                        <Link href="/dashboard/reports" className="text-[10px] font-bold text-[#006D77] hover:underline">Detail</Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : (
                        <Leaderboard students={stats?.top_students ?? []} />
                    )}
                </div>
            </div>

            {/* ── Quick Actions + Summary ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Quick Actions */}
                <div className="lg:col-span-3 rounded-2xl overflow-hidden"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                    <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <div>
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Aksi Cepat</h3>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Navigasi ke fitur utama</p>
                        </div>
                    </div>
                    <div className={`p-4 grid grid-cols-4 sm:grid-cols-4 gap-3`}>
                        {quickActions.map(a => <QuickAction key={a.label} {...a} />)}
                        {quickActions.length === 0 && (
                            <p className="col-span-4 text-center py-8 text-sm text-gray-300">Tidak ada aksi tersedia</p>
                        )}
                    </div>
                </div>

                {/* Summary Panel */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    {/* Ringkasan */}
                    <div className="rounded-2xl overflow-hidden flex-1"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Ringkasan Platform</h3>
                        </div>
                        <div>
                            {[
                                { label: "Guru Aktif", val: stats?.total_teachers ?? "—", icon: BookOpen, color: "#7B5EA7" },
                                { label: "Siswa Aktif", val: stats?.active_students ?? "—", icon: Users, color: "#006D77" },
                                { label: "Kelas Berjalan", val: stats?.total_classes ?? "—", icon: GraduationCap, color: "#E9C46A" },
                                { label: "Submit Masuk", val: (stats?.total_submissions ?? 0).toLocaleString("id-ID"), icon: ClipboardList, color: "#4ECDC4" },
                            ].map((row, i) => (
                                <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/50 transition-colors"
                                    style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                        style={{ background: row.color + "18" }}>
                                        <row.icon size={14} style={{ color: row.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{row.label}</p>
                                    </div>
                                    <span className="text-base font-black" style={{ color: row.color }}>
                                        {loading ? "—" : row.val}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LPK Branding card */}
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #0D1B2A, #006D77)" }}>
                        <Star size={16} className="text-yellow-400 mb-2" fill="#E9C46A" />
                        <p className="font-black text-sm uppercase mb-1" style={{ fontFamily: "var(--font-serif)" }}>
                            {stats?.app_settings?.lpk_name || "LPK SO Mori Centre"}
                        </p>
                        <p className="text-[10px] text-white/50 mb-3">{stats?.app_settings?.lpk_motto || "日本語職業訓練センター"}</p>
                        <p className="text-xs text-white/60">
                            {stats?.active_year ? `Academic Year ${stats.active_year}` : "Tahun Ajaran Aktif"}
                        </p>
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-10" style={{ background: "#4ECDC4" }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
