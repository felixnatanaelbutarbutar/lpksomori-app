"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
    Camera,
    X,
} from "lucide-react";

import {
    parseRole,
    getNavigationMenu,
    ROLE_META,
    type NavItem,
    type Role,
    ALL_NAV_ITEMS,
    getRolePermissions,
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
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [fullUser, setFullUser] = useState<any>(null);
    const [navItems, setNavItems] = useState<NavItem[]>([]);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const raw = localStorage.getItem("mori_role");
            const parsedRole = parseRole(raw);
            setRole(parsedRole);
            setNavItems(getNavigationMenu(parsedRole));

            // Authorization Check
            if (pathname !== "/dashboard/not-authorized") {
                const permissions = getRolePermissions(parsedRole);
                
                // Exclude check for index routes or some unprotected routes
                if (pathname === "/dashboard" && parsedRole === "student") {
                    router.replace("/dashboard/students/dashboard");
                } else if (pathname !== "/dashboard" && pathname !== "/dashboard/students/dashboard" && pathname.startsWith("/dashboard/")) {
                    // Find matching nav item
                    const matchedItems = ALL_NAV_ITEMS.filter(item => 
                        pathname === item.href || pathname.startsWith(item.href + "/")
                    );
                    
                    if (matchedItems.length > 0) {
                        // Sort by longest matching href to get the most specific
                        matchedItems.sort((a, b) => b.href.length - a.href.length);
                        const matched = matchedItems[0];
                        
                        // If role does not have permission for the matched feature
                        if (!permissions[matched.feature]) {
                            router.replace("/dashboard/not-authorized");
                        }
                    }
                }
            }
            
            try {
                const userJson = localStorage.getItem("mori_user");
                if (userJson) {
                    const user = JSON.parse(userJson);
                    setUserName(user.Name || user.name || user.email || "Pengguna");
                    setUserPhoto(user.photo || user.Photo || null);
                    setFullUser(user);
                }
            } catch { }
        }
    }, [pathname, router]);

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

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !fullUser) return;
        setUploadingPhoto(true);
        try {
            const file = e.target.files[0];
            const token = localStorage.getItem("mori_token");
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`http://localhost:8080/api/v1/users/${fullUser.id || fullUser.ID}/photo`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                const updatedUser = { ...fullUser, photo: data.data.Photo || data.data.photo };
                localStorage.setItem("mori_user", JSON.stringify(updatedUser));
                setUserPhoto(updatedUser.photo);
                setFullUser(updatedUser);
            } else {
                alert(data.error || "Gagal mengunggah foto profil");
            }
        } catch (error) {
            console.error(error);
            alert("Kesalahan jaringan saat mengunggah foto");
        } finally {
            setUploadingPhoto(false);
        }
    };

    return (
        <div className="flex min-h-screen" style={{ background: "var(--bg-canvas)" }}>
            {/* ── Sidebar ── */}
            <aside
                className="fixed top-0 left-0 h-screen flex flex-col transition-all duration-300 ease-in-out z-20"
                style={{
                    width: collapsed ? "68px" : "232px",
                    background: "var(--sidebar-bg)",
                }}
            >
                {/* Logo area */}
                <div
                    className="flex items-center h-[70px] px-5 pt-4 overflow-hidden shrink-0"
                    style={{ borderBottom: "1px solid var(--sidebar-border)" }}
                >
                    {collapsed ? (
                        <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto shrink-0 mb-3"
                            style={{ background: "var(--accent)", opacity: 0.9 }}
                        >
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                    ) : (
                        <div className="flex items-center mb-3">
                            <Image
                                src="/logo.png"
                                alt="LPK Mori"
                                width={95}
                                height={28}
                                className="object-contain"
                            />
                        </div>
                    )}
                </div>

                {/* User info - Removed as requested */}

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
            <div
                className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
                style={{ marginLeft: collapsed ? "68px" : "232px" }}
            >
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
                        {/* User chip */}
                        <button
                            onClick={() => setIsProfileOpen(true)}
                            className="flex items-center gap-2.5 transition-all outline-none rounded-full focus:ring-2 focus:ring-[var(--accent)] hover:opacity-80"
                        >
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
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs overflow-hidden shrink-0"
                                style={{
                                    background: `linear-gradient(135deg, ${roleMeta.color}, ${roleMeta.color}aa)`,
                                    boxShadow: `0 2px 8px ${roleMeta.color}40`,
                                }}
                            >
                                {userPhoto ? (
                                    <img src={`http://localhost:8080${userPhoto}`} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    initials || "?"
                                )}
                            </div>
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main
                    className="flex-1 overflow-y-auto p-6 lg:p-8 animate-fade-in"
                >
                    {children}
                </main>
            </div>

            {/* Profile Modal */}
            {isProfileOpen && fullUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border border-[var(--border)] relative transform transition-all">
                        <button
                            onClick={() => setIsProfileOpen(false)}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-[var(--bg-canvas)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                            <X size={18} />
                        </button>

                        <div className="p-6">
                            <h3 className="text-xl font-bold text-center mb-6 text-[var(--text-primary)]">Profil Pengguna</h3>

                            <div className="flex flex-col items-center">
                                <div className="relative group mb-4">
                                    <div
                                        className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-3xl font-bold text-white shadow-lg"
                                        style={{ background: `linear-gradient(135deg, ${roleMeta.color}, ${roleMeta.color}aa)` }}
                                    >
                                        {userPhoto ? (
                                            <img src={`http://localhost:8080${userPhoto}`} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            initials || "?"
                                        )}
                                    </div>
                                    <label className={`absolute bottom-0 right-0 p-2 rounded-full cursor-pointer shadow-md transition-transform hover:scale-105 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`} style={{ background: "var(--accent)", color: "white" }} title="Ubah Foto Profil">
                                        <Camera size={16} />
                                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                    </label>
                                </div>
                                <h4 className="font-semibold text-lg text-[var(--text-primary)]">{userName}</h4>
                                <p className="text-xs px-3 py-1.5 mt-1 rounded-full font-medium" style={{ color: roleMeta.color, background: roleMeta.bg }}>
                                    {roleMeta.label} · {roleMeta.labelJa}
                                </p>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-canvas)] px-3 py-2 rounded-lg border border-[var(--border)]">{fullUser.email || fullUser.Email || "-"}</p>
                                </div>
                                {(fullUser.nis || fullUser.NIS) && (
                                    <div>
                                        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Nomor Induk Siswa (NIS)</p>
                                        <p className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-canvas)] px-3 py-2 rounded-lg border border-[var(--border)]">{fullUser.nis || fullUser.NIS}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
