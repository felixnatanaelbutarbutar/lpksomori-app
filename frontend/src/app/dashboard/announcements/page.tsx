"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Megaphone, Plus, Pin, PinOff, Pencil, Trash2, X,
    Search, Shield, BookOpen, Clock, Languages,
    ChevronRight, Globe, Hash,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface Creator { id: number; name: string; email: string; role: string; }
interface Announcement {
    id: number; title: string; title_ja: string;
    content: string; content_ja: string;
    creator_id: number; creator: Creator; creator_role: string;
    is_pinned: boolean; is_active: boolean;
    created_at: string; updated_at: string;
}

const ROLE_CFG = {
    admin: {
        label: "Admin", labelJa: "管理者",
        color: "var(--role-admin)", bg: "var(--role-admin-bg)",
        icon: Shield,
    },
    teacher: {
        label: "Guru", labelJa: "先生",
        color: "var(--role-teacher)", bg: "var(--role-teacher-bg)",
        icon: BookOpen,
    },
};

function timeAgo(iso: string) {
    const d = (Date.now() - new Date(iso).getTime()) / 1000;
    if (d < 60) return "Baru saja";
    if (d < 3600) return `${Math.floor(d / 60)} mnt lalu`;
    if (d < 86400) return `${Math.floor(d / 3600)} jam lalu`;
    if (d < 604800) return `${Math.floor(d / 86400)} hari lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
    return (
        <div
            className="fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-slide-up"
            style={{
                background: type === "success" ? "var(--success)" : "var(--danger)",
                boxShadow: `0 8px 24px ${type === "success" ? "rgba(45,125,89,0.35)" : "rgba(192,57,43,0.35)"}`,
            }}
        >
            {type === "success" ? "✓" : "✕"}
            {message}
            <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
                <X size={13} />
            </button>
        </div>
    );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                    background: "var(--bg-surface)",
                    boxShadow: "var(--shadow-lg)",
                    border: "1px solid var(--border)",
                }}
            >
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                    <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─── Regular Card ──────────────────────────────────────────────────────────────
function AnnCard({ ann, role, userId, onDelete, onPin, onClick }: {
    ann: Announcement; role: string; userId: number;
    onDelete: (a: Announcement) => void;
    onPin: (a: Announcement) => void;
    onClick: (a: Announcement) => void;
}) {
    const cfg = ROLE_CFG[ann.creator_role as keyof typeof ROLE_CFG] ?? ROLE_CFG.teacher;
    const RI = cfg.icon;
    const canManage = role === "admin" || userId === ann.creator_id;
    const hasJa = !!(ann.title_ja || ann.content_ja);
    const textPreview = ann.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    return (
        <article
            className="group relative flex flex-col rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
            }}
            onClick={() => onClick(ann)}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
        >
            <div className="p-5 flex-1">
                {/* Badges */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                    <span
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                        style={{ color: cfg.color, background: cfg.bg }}
                    >
                        <RI size={9} />
                        {cfg.label}
                    </span>
                    {ann.is_pinned && (
                        <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                        >
                            <Pin size={8} /> Pinned
                        </span>
                    )}
                    {hasJa && (
                        <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ background: "var(--role-student-bg)", color: "var(--role-student)" }}
                        >
                            <Languages size={8} /> Bilingual
                        </span>
                    )}
                </div>

                {/* Title */}
                <h2
                    className="font-semibold text-base leading-snug line-clamp-2 mb-1 transition-colors"
                    style={{
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-serif)",
                    }}
                >
                    {ann.title}
                </h2>

                {ann.title_ja && (
                    <p className="text-xs mb-2.5 pl-3" style={{
                        color: "var(--text-muted)",
                        borderLeft: "2px solid var(--border)",
                    }}>
                        {ann.title_ja}
                    </p>
                )}

                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
                    {textPreview || "—"}
                </p>
            </div>

            {/* Footer */}
            <div
                className="px-5 py-3 flex items-center justify-between"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                        style={{ background: cfg.color }}
                    >
                        {ann.creator?.name ? ann.creator.name[0].toUpperCase() : "?"}
                    </div>
                    <div>
                        <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
                            {ann.creator?.name || "—"}
                        </span>
                        <span className="text-[10px] ml-1.5" style={{ color: "var(--text-muted)" }}>
                            {timeAgo(ann.created_at)}
                        </span>
                    </div>
                </div>

                <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
            </div>

            {/* Hover Actions */}
            {canManage && (
                <div
                    className="absolute top-4 right-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 z-20"
                    onClick={(e) => e.stopPropagation()}
                >
                    {role === "admin" && (
                        <button
                            onClick={() => onPin(ann)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                            style={{
                                background: ann.is_pinned ? "var(--gold-soft)" : "var(--bg-surface)",
                                color: ann.is_pinned ? "var(--gold)" : "var(--text-muted)",
                                borderColor: ann.is_pinned ? "var(--gold-border)" : "var(--border)",
                            }}
                        >
                            {ann.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                    )}
                    <button
                        onClick={() => window.location.href = `/dashboard/announcements/${ann.id}/edit`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#3B82F6"; (e.currentTarget as HTMLElement).style.borderColor = "#BFDBFE"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        onClick={() => onDelete(ann)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--danger)"; (e.currentTarget as HTMLElement).style.borderColor = "#F5C5C0"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </article>
    );
}

// ─── Pinned Card (Banner Style) ────────────────────────────────────────────────
function PinnedCard({ ann, role, userId, onDelete, onPin, onClick }: Parameters<typeof AnnCard>[0]) {
    const cfg = ROLE_CFG[ann.creator_role as keyof typeof ROLE_CFG] ?? ROLE_CFG.teacher;
    const RI = cfg.icon;
    const canManage = role === "admin" || userId === ann.creator_id;
    const textPreview = ann.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    return (
        <article
            className="group relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
            style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                boxShadow: "var(--shadow-sm)",
            }}
            onClick={() => onClick(ann)}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
            }}
        >
            {/* Top accent stripe */}
            <div className="h-1 w-full" style={{ background: cfg.color, opacity: 0.7 }} />

            <div className="p-6 flex flex-col md:flex-row gap-5 items-start">
                {/* Icon */}
                <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg }}
                >
                    <RI size={22} style={{ color: cfg.color }} />
                </div>

                <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                        <span
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                            style={{ color: cfg.color, background: cfg.bg }}
                        >
                            <RI size={9} /> {cfg.label}
                        </span>
                        <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                        >
                            <Pin size={9} /> Disematkan
                        </span>
                        <span
                            className="flex items-center gap-1.5 ml-auto text-[10px]"
                            style={{ color: "var(--text-muted)" }}
                        >
                            <Clock size={10} /> {timeAgo(ann.created_at)}
                        </span>
                    </div>

                    <h2
                        className="font-bold text-xl leading-tight mb-1"
                        style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-serif)",
                            letterSpacing: "-0.01em",
                        }}
                    >
                        {ann.title}
                    </h2>

                    {ann.title_ja && (
                        <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                            {ann.title_ja}
                        </p>
                    )}

                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                        {textPreview}
                    </p>

                    {/* Author + CTA */}
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                        <div className="flex items-center gap-2">
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ background: cfg.color }}
                            >
                                {(ann.creator?.name || "?")[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                                {ann.creator?.name || "—"}
                            </span>
                        </div>
                        <div
                            className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
                            style={{ color: "var(--accent)" }}
                        >
                            Baca selengkapnya <ChevronRight size={13} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Hover Actions */}
            {canManage && (
                <div
                    className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20"
                    onClick={(e) => e.stopPropagation()}
                >
                    {role === "admin" && (
                        <button
                            onClick={() => onPin(ann)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                            style={{ background: "var(--bg-surface)", borderColor: "var(--gold-border)", color: "var(--gold)" }}
                        >
                            <PinOff size={12} />
                        </button>
                    )}
                    <button
                        onClick={() => window.location.href = `/dashboard/announcements/${ann.id}/edit`}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        onClick={() => onDelete(ann)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm border transition-colors"
                        style={{ background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)" }}
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            )}
        </article>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AnnouncementsPage() {
    const router = useRouter();
    const [anns, setAnns] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState<"all" | "admin" | "teacher">("all");
    const [role, setRole] = useState("student");
    const [userId, setUserId] = useState(0);
    const [token, setToken] = useState("");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setRole(localStorage.getItem("mori_role") ?? "student");
            setToken(localStorage.getItem("mori_token") ?? "");
            try { const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}"); setUserId(u.id ?? u.ID ?? 0); } catch { }
        }
    }, []);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/announcements`);
            const j = await res.json();
            setAnns(j.data ?? []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = anns.filter((a) => {
        const q = search.toLowerCase();
        const ms = a.title.toLowerCase().includes(q) || a.content.replace(/<[^>]*>/g, " ").toLowerCase().includes(q) || (a.creator?.name || "").toLowerCase().includes(q);
        const mr = filterRole === "all" || a.creator_role === filterRole;
        return ms && mr;
    });

    const pinned = filtered.filter((a) => a.is_pinned);
    const regular = filtered.filter((a) => !a.is_pinned);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        await fetch(`${API_BASE}/announcements/${deleteTarget.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setToast({ message: "Pengumuman dihapus", type: "success" });
        setDeleteTarget(null);
        fetchAll();
    };

    const handlePin = async (a: Announcement) => {
        await fetch(`${API_BASE}/announcements/${a.id}/pin`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
        setToast({ message: a.is_pinned ? "Sematan dilepas" : "Disematkan 📌", type: "success" });
        fetchAll();
    };

    const canCreate = role === "admin" || role === "teacher";

    const filterTabs = [
        { key: "all" as const, label: "Semua", count: anns.length, icon: Hash },
        { key: "admin" as const, label: "Admin", count: anns.filter(a => a.creator_role === "admin").length, icon: Shield },
        { key: "teacher" as const, label: "Guru", count: anns.filter(a => a.creator_role === "teacher").length, icon: BookOpen },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <p
                        className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1"
                        style={{ color: "var(--accent)" }}
                    >
                        お知らせ
                    </p>
                    <h1
                        className="text-2xl font-bold"
                        style={{
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-serif)",
                            letterSpacing: "-0.02em",
                        }}
                    >
                        Pengumuman
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Informasi dan pengumuman untuk seluruh civitas akademika
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => router.push("/dashboard/announcements/new")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
                        style={{
                            background: "var(--accent)",
                            boxShadow: "0 4px 12px rgba(13,122,111,0.25)",
                        }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)";
                            (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 16px rgba(13,122,111,0.35)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "var(--accent)";
                            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(13,122,111,0.25)";
                        }}
                    >
                        <Plus size={15} />
                        Buat Pengumuman
                    </button>
                )}
            </div>

            {/* ── Filter bar ── */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                    {filterTabs.map(({ key, label, count, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setFilterRole(key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{
                                background: filterRole === key ? "var(--accent)" : "transparent",
                                color: filterRole === key ? "#fff" : "var(--text-secondary)",
                            }}
                        >
                            <Icon size={11} />
                            {label}
                            <span
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                    background: filterRole === key ? "rgba(255,255,255,0.2)" : "var(--bg-subtle)",
                                    color: filterRole === key ? "#fff" : "var(--text-muted)",
                                }}
                            >
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                    <input
                        type="text"
                        placeholder="Cari pengumuman..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 pr-4 py-2 rounded-xl text-sm w-52 transition-all"
                        style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            color: "var(--text-primary)",
                        }}
                    />
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="rounded-2xl p-5 space-y-3"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
                        >
                            <div className="flex gap-2">
                                <div className="h-5 w-16 rounded-full skeleton" />
                                <div className="h-5 w-12 rounded-full skeleton" />
                            </div>
                            <div className="h-5 w-4/5 rounded-lg skeleton" />
                            <div className="space-y-1.5">
                                <div className="h-3 w-full rounded skeleton" />
                                <div className="h-3 w-5/6 rounded skeleton" />
                                <div className="h-3 w-3/4 rounded skeleton" />
                            </div>
                            <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                                <div className="w-6 h-6 rounded-full skeleton" />
                                <div className="h-3 w-24 rounded skeleton" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center"
                        style={{ background: "var(--bg-subtle)" }}
                    >
                        <Megaphone size={28} style={{ color: "var(--text-muted)" }} />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-sm" style={{ color: "var(--text-secondary)" }}>
                            Belum ada pengumuman
                        </p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                            お知らせはまだありません
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => router.push("/dashboard/announcements/new")}
                            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                            style={{ background: "var(--accent)" }}
                        >
                            Buat Pengumuman Pertama
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-7">
                    {/* Pinned */}
                    {pinned.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Pin size={11} style={{ color: "var(--gold)" }} />
                                <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--gold)" }}>
                                    Disematkan
                                </span>
                            </div>
                            <div className={`grid gap-4 ${pinned.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                                {pinned.map((a) => (
                                    <PinnedCard
                                        key={a.id}
                                        ann={a}
                                        role={role}
                                        userId={userId}
                                        onDelete={setDeleteTarget}
                                        onPin={handlePin}
                                        onClick={(x) => router.push(`/dashboard/announcements/${x.id}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Regular */}
                    {regular.length > 0 && (
                        <div className="space-y-3">
                            {pinned.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Globe size={11} style={{ color: "var(--text-muted)" }} />
                                    <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
                                        Lainnya
                                    </span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {regular.map((a) => (
                                    <AnnCard
                                        key={a.id}
                                        ann={a}
                                        role={role}
                                        userId={userId}
                                        onDelete={setDeleteTarget}
                                        onPin={handlePin}
                                        onClick={(x) => router.push(`/dashboard/announcements/${x.id}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <Modal title="Hapus Pengumuman?" onClose={() => setDeleteTarget(null)}>
                    <div
                        className="rounded-xl p-4 mb-5"
                        style={{ background: "var(--danger-bg)", border: "1px solid #F5C5C0" }}
                    >
                        <p className="font-semibold text-sm line-clamp-1" style={{ color: "var(--danger)" }}>
                            {deleteTarget.title}
                        </p>
                    </div>
                    <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                        Pengumuman ini akan dihapus secara permanen dan tidak dapat dikembalikan.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteTarget(null)}
                            className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                            style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-colors"
                            style={{ background: "var(--danger)" }}
                        >
                            <Trash2 size={13} />
                            Ya, Hapus
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
