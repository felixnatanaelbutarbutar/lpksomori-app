"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    BookOpen,
    GraduationCap,
    FileText,
    Database,
    BookMarked,
    BarChart2,
    PieChart,
    Settings,
    Bell,
    ClipboardList,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Megaphone,
    Menu,
} from "lucide-react";

import {
    parseRole,
    getNavigationMenu,
    ROLE_META,
    type NavItem,
    type Role,
} from "../../lib/roleHelper";

import { NotificationBell } from "./notifications/page";

const ICON_MAP: Record<string, React.ElementType> = {
    LayoutDashboard, Users, CalendarDays, BookOpen, GraduationCap,
    FileText, Database, BookMarked, BarChart2, PieChart,
    Settings, Bell, ClipboardList, Megaphone,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const [role, setRole] = useState<Role>("student");
    const [userName, setUserName] = useState("Pengguna");
    const [navItems, setNavItems] = useState<NavItem[]>([]);
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const raw = localStorage.getItem("mori_role");
            const parsedRole = parseRole(raw);
            setRole(parsedRole);
            setNavItems(getNavigationMenu(parsedRole));
            try {
                const userJson = localStorage.getItem("mori_user");
                if (userJson) {
                    const user = JSON.parse(userJson);
                    setUserName(user.Name || user.name || user.email || "Pengguna");
                }
            } catch { }
        }
    }, []);

    const roleMeta = ROLE_META[role];
    const initials = userName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const currentPage = navItems.find(
        (n) => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href))
    )?.name ?? "Dashboard";

    return (
        <div className="flex min-h-screen" style={{ background: "var(--bg-canvas)" }}>
            {/* ── Sidebar ── */}
            <aside
                className="flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-20"
                style={{
                    width: collapsed ? "68px" : "232px",
                    background: "var(--sidebar-bg)",
                }}
            >
                {/* Logo area */}
                <div
                    className="flex items-center h-[60px] px-4 overflow-hidden shrink-0"
                    style={{ borderBottom: "1px solid var(--sidebar-border)" }}
                >
                    {collapsed ? (
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto shrink-0"
                            style={{ background: "var(--accent)", opacity: 0.9 }}
                        >
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                    ) : (
                        <div
                            className="rounded-xl px-3 py-2 flex items-center"
                            style={{ background: "rgba(255,255,255,0.07)" }}
                        >
                            <Image
                                src="/logo.png"
                                alt="LPK Mori"
                                width={90}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* User info */}
                {!collapsed && (
                    <div
                        className="mx-3 mt-4 mb-2 px-3 py-2.5 rounded-xl"
                        style={{ background: "var(--sidebar-surface)", border: "1px solid var(--sidebar-border)" }}
                    >
                        <p className="text-xs font-medium truncate" style={{ color: "var(--sidebar-text)" }}>
                            {userName}
                        </p>
                        <span
                            className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{ color: roleMeta.color, background: roleMeta.bg }}
                        >
                            {roleMeta.label} · {roleMeta.labelJa}
                        </span>
                    </div>
                )}

                {/* Nav */}
                <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
                    {navItems.map((item) => {
                        const IconComp = ICON_MAP[item.icon] ?? LayoutDashboard;
                        const active =
                            pathname === item.href ||
                            (item.href !== "/dashboard" && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={collapsed ? item.name : undefined}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${collapsed ? "justify-center" : ""
                                    }`}
                                style={{
                                    color: active ? "var(--sidebar-active-text)" : "var(--sidebar-text)",
                                    background: active ? "var(--sidebar-active-bg)" : "transparent",
                                }}
                                onMouseEnter={(e) => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = "var(--sidebar-hover-bg)";
                                        (e.currentTarget as HTMLElement).style.color = "#fff";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!active) {
                                        (e.currentTarget as HTMLElement).style.background = "transparent";
                                        (e.currentTarget as HTMLElement).style.color = "var(--sidebar-text)";
                                    }
                                }}
                            >
                                <IconComp size={16} className="shrink-0" />
                                {!collapsed && (
                                    <span className="truncate flex-1">{item.name}</span>
                                )}
                                {!collapsed && active && (
                                    <div
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ background: "var(--gold)" }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-[72px] w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-colors z-30"
                    style={{
                        background: "var(--sidebar-bg)",
                        border: "1.5px solid var(--sidebar-border)",
                        color: "var(--sidebar-text-muted)",
                    }}
                    title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
                >
                    {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
                </button>

                {/* Logout */}
                <div className="p-2.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
                    <Link
                        href="/login"
                        onClick={() => {
                            localStorage.removeItem("mori_token");
                            localStorage.removeItem("mori_user");
                            localStorage.removeItem("mori_role");
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${collapsed ? "justify-center" : ""}`}
                        style={{ color: "rgba(255,100,90,0.55)" }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "rgba(220,60,60,0.12)";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,120,110,0.85)";
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                            (e.currentTarget as HTMLElement).style.color = "rgba(255,100,90,0.55)";
                        }}
                    >
                        <LogOut size={15} className="shrink-0" />
                        {!collapsed && <span>Keluar</span>}
                    </Link>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header
                    className="h-[60px] flex items-center justify-between px-6 shrink-0"
                    style={{
                        background: "var(--bg-surface)",
                        borderBottom: "1px solid var(--border)",
                        boxShadow: "var(--shadow-sm)",
                    }}
                >
                    <div className="flex items-center gap-3">
                        <div>
                            <p
                                className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                                style={{ color: "var(--text-muted)" }}
                            >
                                LPK SO Mori Centre
                            </p>
                            <h2
                                className="text-sm font-semibold leading-tight"
                                style={{ color: "var(--text-primary)", fontFamily: "var(--font-sans)" }}
                            >
                                {currentPage}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notification Bell */}
                        <div
                            className="relative w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{
                                background: "var(--accent)",
                                boxShadow: "0 2px 8px rgba(13,122,111,0.25)",
                            }}
                        >
                            <NotificationBell />
                        </div>

                        <div
                            className="w-px h-5"
                            style={{ background: "var(--border)" }}
                        />

                        {/* User chip */}
                        <div className="flex items-center gap-2.5">
                            <div className="text-right hidden sm:block">
                                <p
                                    className="text-xs font-semibold max-w-[110px] truncate"
                                    style={{ color: "var(--text-primary)" }}
                                >
                                    {userName}
                                </p>
                                <p className="text-[10px] font-medium" style={{ color: roleMeta.color }}>
                                    {roleMeta.label}
                                </p>
                            </div>
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                style={{
                                    background: `linear-gradient(135deg, ${roleMeta.color}, ${roleMeta.color}aa)`,
                                    boxShadow: `0 2px 8px ${roleMeta.color}40`,
                                }}
                            >
                                {initials || "?"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main
                    className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in"
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
