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
    LogOut,
    Bell,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

import {
    parseRole,
    getNavigationMenu,
    ROLE_META,
    type NavItem,
    type Role,
} from "../../lib/roleHelper";

// Map icon name strings to actual Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
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

    return (
        <div className="flex min-h-screen bg-[#F2F4F7]">
            {/* ── Sidebar ── */}
            <aside
                className="flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-20"
                style={{
                    width: collapsed ? "72px" : "248px",
                    background: "linear-gradient(180deg, #0D1B2A 0%, #0a1520 100%)",
                }}
            >
                {/* Logo */}
                <div className="flex items-center h-16 px-4 border-b border-white/5 overflow-hidden">
                    {collapsed ? (
                        <div className="w-9 h-9 rounded-xl bg-[#006D77] flex items-center justify-center mx-auto shrink-0">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                    ) : (
                        <div className="bg-white/10 rounded-xl px-3 py-2">
                            <Image
                                src="/logo.png"
                                alt="LPK Mori"
                                width={100}
                                height={32}
                                className="object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* Role badge */}
                {!collapsed && (
                    <div className="mx-3 mt-4 mb-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        <p className="text-white/40 text-xs truncate">{userName}</p>
                        <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ color: roleMeta.color, background: roleMeta.bg }}
                        >
                            {roleMeta.label} / {roleMeta.labelJa}
                        </span>
                    </div>
                )}

                {/* Nav Items */}
                <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${active
                                        ? "bg-[#006D77] text-white shadow-lg shadow-[#006D77]/30"
                                        : "text-white/45 hover:text-white hover:bg-white/6"
                                    }`}
                            >
                                <IconComp
                                    size={17}
                                    className={`shrink-0 ${active ? "text-white" : "text-white/35 group-hover:text-white/80"
                                        }`}
                                />
                                {!collapsed && (
                                    <div className="flex-1 min-w-0 flex items-center justify-between">
                                        <span className="truncate">{item.name}</span>
                                        {active && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#E9C46A] shrink-0" />
                                        )}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#006D77] text-white flex items-center justify-center shadow-md hover:bg-[#005f6b] transition-colors z-30"
                >
                    {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>

                {/* Logout */}
                <div className="p-3 border-t border-white/5">
                    <Link
                        href="/login"
                        onClick={() => {
                            localStorage.removeItem("mori_token");
                            localStorage.removeItem("mori_user");
                            localStorage.removeItem("mori_role");
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? "justify-center" : ""
                            }`}
                    >
                        <LogOut size={17} className="shrink-0" />
                        {!collapsed && <span>Logout</span>}
                    </Link>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 shadow-sm">
                    <div>
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                            LPK SO Mori Centre
                        </p>
                        <h2 className="text-sm font-semibold text-[#0D1B2A] capitalize">
                            {navItems.find(
                                (n) =>
                                    n.href === pathname ||
                                    (n.href !== "/dashboard" && pathname.startsWith(n.href))
                            )?.name ?? "Dashboard"}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Notification Bell */}
                        <button className="relative w-9 h-9 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center transition-colors border border-gray-100">
                            <Bell size={15} className="text-gray-400" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#006D77]" />
                        </button>
                        <div className="w-px h-6 bg-gray-100" />

                        {/* User Chip */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-semibold text-[#0D1B2A] max-w-[120px] truncate">
                                    {userName}
                                </p>
                                <p className="text-xs font-medium" style={{ color: roleMeta.color }}>
                                    {roleMeta.label}
                                </p>
                            </div>
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                                style={{
                                    background: `linear-gradient(135deg, ${roleMeta.color}, ${roleMeta.color}bb)`,
                                }}
                            >
                                {initials || "?"}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
