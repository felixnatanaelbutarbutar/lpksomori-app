"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell, X, BookOpen, ClipboardList, GraduationCap, CheckCircle2, Clock, CheckCheck } from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface Notification {
    id: number;
    title: string;
    message: string;
    type: "assignment" | "exam" | "grade" | "announcement";
    ref_id: number;
    is_read: boolean;
    created_at: string;
}

const TYPE_CFG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    assignment: { icon: ClipboardList, color: "#3B82F6", bg: "#EFF6FF" },
    exam: { icon: GraduationCap, color: "var(--role-student)", bg: "var(--role-student-bg)" },
    grade: { icon: CheckCircle2, color: "var(--success)", bg: "var(--success-bg)" },
    announcement: { icon: Bell, color: "var(--gold)", bg: "var(--gold-soft)" },
};

function timeAgo(iso: string): string {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hari lalu`;
}

// ─── Notification Bell (used in header) ───────────────────────────────────────
export function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const ref = useRef<HTMLDivElement>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchNotifications = useCallback(async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API}/notifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const json = await res.json();
            setNotifications(json.data ?? []);
            setUnread(json.unread_count ?? 0);
        } catch { }
    }, [token]);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const markAllRead = async () => {
        try {
            await fetch(`${API}/notifications/read-all`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });
            setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
            setUnread(0);
        } catch { }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => { setOpen((o) => !o); if (!open) fetchNotifications(); }}
                className="relative w-8 h-8 rounded-xl flex items-center justify-center transition-opacity hover:opacity-80"
                title="Notifikasi"
            >
                <Bell size={16} className="text-white/90" />
                {unread > 0 && (
                    <span
                        className="absolute -top-1 -right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                        style={{ background: "var(--danger)", border: "1.5px solid var(--accent)" }}
                    >
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="absolute right-0 top-11 w-80 rounded-2xl overflow-hidden z-50 animate-slide-up"
                    style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        boxShadow: "var(--shadow-lg)",
                    }}
                >
                    <div
                        className="flex items-center justify-between px-4 py-3"
                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    >
                        <div className="flex items-center gap-2">
                            <Bell size={13} style={{ color: "var(--accent)" }} />
                            <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                Notifikasi
                            </span>
                            {unread > 0 && (
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
                                >
                                    {unread} baru
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            {unread > 0 && (
                                <button
                                    onClick={markAllRead}
                                    className="text-[11px] font-semibold transition-colors"
                                    style={{ color: "var(--accent)" }}
                                >
                                    Tandai semua
                                </button>
                            )}
                            <button
                                onClick={() => setOpen(false)}
                                className="w-6 h-6 rounded-lg flex items-center justify-center ml-1 transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                                <X size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center py-10 gap-2">
                                <Bell size={24} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                    Belum ada notifikasi
                                </p>
                            </div>
                        ) : (
                            notifications.map((n) => {
                                const cfg = TYPE_CFG[n.type] ?? { icon: Bell, color: "var(--text-muted)", bg: "var(--bg-subtle)" };
                                const TypeIcon = cfg.icon;
                                return (
                                    <div
                                        key={n.id}
                                        className="flex gap-3 px-4 py-3 transition-colors"
                                        style={{
                                            borderBottom: "1px solid var(--border-subtle)",
                                            background: !n.is_read ? "var(--accent-soft)" : "transparent",
                                        }}
                                    >
                                        <div
                                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: cfg.bg }}
                                        >
                                            <TypeIcon size={13} style={{ color: cfg.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="text-xs font-semibold"
                                                style={{ color: !n.is_read ? "var(--text-primary)" : "var(--text-secondary)" }}
                                            >
                                                {n.title}
                                            </p>
                                            <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)", opacity: 0.7 }}>
                                                {timeAgo(n.created_at)}
                                            </p>
                                        </div>
                                        {!n.is_read && (
                                            <div
                                                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                                                style={{ background: "var(--accent)" }}
                                            />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Standalone Notifications Page ────────────────────────────────────────────
export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetch_ = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/notifications`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setNotifications(json.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetch_(); }, [fetch_]);

    const markAll = async () => {
        await fetch(`${API}/notifications/read-all`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <Bell size={20} />
                        </div>
                        Pusat Notifikasi
                    </h1>
                    <p className="text-sm text-gray-400">Pemberitahuan terbaru seputar ujian, tugas, nilai, dan pengumuman lainnya.</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAll} className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-[#006D77]/20 hover:scale-105 active:scale-95 transition-all bg-[#006D77] shrink-0">
                        <CheckCheck size={18} /> Tandai Semua Dibaca
                    </button>
                )}
            </div>

            {/* List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-6 h-6 border-2 border-t-transparent border-[#006D77] rounded-full animate-spin" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Bell size={40} className="text-gray-200" />
                        <p className="text-sm text-gray-400 font-semibold">Belum Ada Notifikasi</p>
                        <p className="text-[11px] text-gray-400">Pemberitahuan baru akan muncul di sini.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((n) => {
                            const cfg = TYPE_CFG[n.type] ?? { icon: Bell, color: "#006D77", bg: "#006D7715" };
                            const TypeIcon = cfg.icon;
                            return (
                                <div
                                    key={n.id}
                                    className={`flex gap-4 px-6 py-5 transition-colors group ${
                                        !n.is_read ? "bg-[#006D77]/5 hover:bg-[#006D77]/10" : "hover:bg-gray-50/50"
                                    }`}
                                >
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                                        style={{ background: cfg.bg }}
                                    >
                                        <TypeIcon size={20} style={{ color: cfg.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={`text-sm ${
                                                    !n.is_read ? "font-bold text-[#0D1B2A]" : "font-semibold text-gray-500"
                                                }`}
                                            >
                                                {n.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 shrink-0 text-gray-400">
                                                <Clock size={12} />
                                                <span className="text-[11px] font-medium">
                                                    {timeAgo(n.created_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-sm mt-1 text-gray-500 leading-relaxed pr-8">
                                            {n.message}
                                        </p>
                                    </div>
                                    {!n.is_read && (
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#006D77] mt-2 shrink-0 shadow-[0_0_8px_rgba(0,109,119,0.5)] animate-pulse" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer note */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400 pt-4">
                <BookOpen size={14} />
                Notifikasi otomatis disimpan sampai 30 item terakhir
            </div>
        </div>
    );
}
