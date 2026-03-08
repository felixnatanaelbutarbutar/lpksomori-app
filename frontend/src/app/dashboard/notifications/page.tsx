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
        <div className="max-w-2xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--accent)" }}>
                        通知
                    </p>
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
                    >
                        Notifikasi
                    </h1>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAll}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
                        style={{ color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}
                    >
                        <CheckCheck size={13} />
                        Tandai semua dibaca
                    </button>
                )}
            </div>

            {/* List */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                }}
            >
                {loading ? (
                    <div className="flex items-center justify-center py-14 gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
                        <div
                            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: "var(--accent-border)", borderTopColor: "transparent" }}
                        />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center py-14 gap-3">
                        <Bell size={28} style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
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
                                className="flex gap-4 px-5 py-4 transition-colors"
                                style={{
                                    borderBottom: "1px solid var(--border-subtle)",
                                    background: !n.is_read ? "var(--accent-soft)" : "transparent",
                                }}
                                onMouseEnter={(e) => {
                                    if (n.is_read) (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = !n.is_read ? "var(--accent-soft)" : "transparent";
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: cfg.bg }}
                                >
                                    <TypeIcon size={16} style={{ color: cfg.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p
                                            className="text-sm font-semibold"
                                            style={{ color: !n.is_read ? "var(--text-primary)" : "var(--text-secondary)" }}
                                        >
                                            {n.title}
                                        </p>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Clock size={10} style={{ color: "var(--text-muted)" }} />
                                            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                                                {timeAgo(n.created_at)}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                                        {n.message}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <div
                                        className="w-2 h-2 rounded-full mt-2 shrink-0"
                                        style={{ background: "var(--accent)" }}
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer note */}
            <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <BookOpen size={11} />
                Notifikasi disimpan sampai 30 item terakhir
            </div>
        </div>
    );
}
