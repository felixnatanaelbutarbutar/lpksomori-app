"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Users,
    Plus,
    Pencil,
    Trash2,
    X,
    Search,
    GraduationCap,
    BookOpen,
    CircleUserRound,
    KeyRound,
    Eye,
    EyeOff,
    ShieldCheck,
    UserCheck,
    UserX,
    ChevronRight,
    Camera,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    nis: string;
    photo: string;
    active: boolean;
    created_at: string;
}

type RoleTab = "all" | "teacher" | "student";

const ROLE_META: Record<string, { label: string; labelJa: string; color: string; bg: string; border: string }> = {
    admin: { label: "Admin", labelJa: "管理者", color: "#0D7A6F", bg: "#E5F4F2", border: "#B8DDD9" },
    teacher: { label: "Guru", labelJa: "先生", color: "#B07D3A", bg: "#F5EDD9", border: "#E2C98A" },
    student: { label: "Siswa", labelJa: "学生", color: "#5C5EA6", bg: "#EEEEF8", border: "#C5C6E0" },
};

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-slide-up"
            style={{ background: type === "success" ? "var(--success)" : "var(--danger)", boxShadow: `0 8px 24px ${type === "success" ? "rgba(45,125,89,0.35)" : "rgba(192,57,43,0.35)"}` }}
        >
            {type === "success" ? <ShieldCheck size={16} /> : <X size={16} />}
            {message}
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
                <X size={12} />
            </button>
        </div>
    );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children }: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
                <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
                        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors ml-4 shrink-0"
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

// ─── Role badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
    const r = ROLE_META[role] ?? { label: role, labelJa: "", color: "#888", bg: "#88881a", border: "#88882a" };
    return (
        <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
            style={{ color: r.color, background: r.bg, borderColor: r.border }}
        >
            {r.label}
            {r.labelJa && <span className="opacity-60 text-[10px]">{r.labelJa}</span>}
        </span>
    );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
    ["#006D77", "#4ECDC4"],
    ["#7C3AED", "#A78BFA"],
    ["#B45309", "#FCD34D"],
    ["#0F766E", "#34D399"],
    ["#BE185D", "#F9A8D4"],
];
function UserAvatar({ name, email, photo, size = 9 }: { name?: string; email: string; photo?: string; size?: number }) {
    const idx = email.charCodeAt(0) % AVATAR_COLORS.length;
    const [from, to] = AVATAR_COLORS[idx];
    const letter = (name || email)[0]?.toUpperCase() ?? "?";

    if (photo) {
        return (
            <div className={`w-${size} h-${size} rounded-2xl overflow-hidden shrink-0 shadow-sm border border-[var(--border)]`}>
                <img src={`http://localhost:8080${photo}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div
            className={`w-${size} h-${size} rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, fontSize: size < 10 ? 12 : 16 }}
        >
            {letter}
        </div>
    );
}

// ─── Password input ───────────────────────────────────────────────────────────
function PasswordInput({ placeholder, value, onChange, minLength }: {
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    minLength?: number;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                required
                minLength={minLength ?? 6}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all"
            />
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
        </div>
    );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>
                {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm transition-all";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<RoleTab>("all");
    const [search, setSearch] = useState("");

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createRole, setCreateRole] = useState<"teacher" | "student">("teacher");
    const [form, setForm] = useState({ email: "", password: "", name: "", nis: "", active: true });
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Edit modal
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: "", nis: "", active: true, photo: "" });
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    // Password reset modal
    const [pwUser, setPwUser] = useState<User | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [pwLoading, setPwLoading] = useState(false);

    // Delete confirm
    const [deleteUser, setDeleteUser] = useState<User | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const roleFilter = tab === "all" ? "" : `?role=${tab}`;
            const res = await fetch(`${API_BASE}/users${roleFilter}`);
            const json = await res.json();
            setUsers(json.data ?? []);
        } catch {
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [tab]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filteredUsers = users.filter((u) => {
        const q = search.toLowerCase();
        return (
            u.name?.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.nis?.toLowerCase().includes(q)
        );
    });

    // Counts
    const teacherCount = users.filter((u) => u.role === "teacher").length;
    const studentCount = users.filter((u) => u.role === "student").length;
    const activeCount = users.filter((u) => u.active).length;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    role: createRole,
                    name: form.name || undefined,
                    nis: form.nis || undefined,
                    active: form.active,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat akun");
            setShowCreate(false);
            setForm({ email: "", password: "", name: "", nis: "", active: true });
            fetchUsers();
            showToast(`Akun ${createRole === "teacher" ? "Guru" : "Siswa"} berhasil dibuat! 🎉`);
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUser) return;
        try {
            const res = await fetch(`${API_BASE}/users/${editUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name || undefined,
                    nis: editForm.nis || undefined,
                    active: editForm.active,
                }),
            });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setEditUser(null);
            fetchUsers();
            showToast("Profil pengguna berhasil diperbarui!");
        } catch { showToast("Gagal memperbarui pengguna", "error"); }
    };

    const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !editUser) return;
        setUploadingPhoto(true);
        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_BASE}/users/${editUser.id}/photo`, {
                method: "POST",
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setEditForm({ ...editForm, photo: data.data.Photo || data.data.photo });
                showToast("Foto profil pengguna berhasil diperbarui!");
                fetchUsers(); // Refresh background list
            } else {
                showToast(data.error || "Gagal mengunggah foto profil", "error");
            }
        } catch (error) {
            console.error(error);
            showToast("Kesalahan jaringan saat mengunggah foto", "error");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pwUser) return;
        setPwLoading(true);
        try {
            const res = await fetch(`${API_BASE}/users/${pwUser.id}/password`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: newPassword }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal mereset password");
            setPwUser(null);
            setNewPassword("");
            showToast(`Password ${pwUser.name || pwUser.email} berhasil diperbarui! 🔐`);
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : "Gagal mereset password", "error");
        } finally {
            setPwLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        try {
            await fetch(`${API_BASE}/users/${deleteUser.id}`, { method: "DELETE" });
            showToast(`Akun ${deleteUser.name || deleteUser.email} berhasil dihapus`);
            setDeleteUser(null);
            fetchUsers();
        } catch { showToast("Gagal menghapus pengguna", "error"); }
    };

    const openEdit = (u: User) => {
        setEditUser(u);
        setEditForm({ name: u.name ?? "", nis: u.nis ?? "", active: u.active, photo: u.photo ?? "" });
    };

    const tabs: { key: RoleTab; label: string; labelJa: string; icon: React.ElementType; count: number }[] = [
        { key: "all", label: "Semua", labelJa: "全員", icon: Users, count: users.length },
        { key: "teacher", label: "Guru", labelJa: "先生", icon: BookOpen, count: teacherCount },
        { key: "student", label: "Siswa", labelJa: "学生", icon: GraduationCap, count: studentCount },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--accent)" }}>ユーザー管理</p>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}>
                        Manajemen Pengguna
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Kelola akun Guru dan Siswa di platform
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shrink-0"
                    style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(13,122,111,0.25)" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent)"; }}
                >
                    <Plus size={15} />
                    Tambah Pengguna
                </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Pengguna", value: users.length, icon: Users, color: "var(--accent)", bg: "var(--accent-soft)" },
                    { label: "Aktif", value: activeCount, icon: UserCheck, color: "var(--success)", bg: "var(--success-bg)" },
                    { label: "Nonaktif", value: users.length - activeCount, icon: UserX, color: "var(--danger)", bg: "var(--danger-bg)" },
                ].map((s) => (
                    <div key={s.label} className="flex items-center gap-4 px-5 py-4 rounded-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                            <s.icon size={17} style={{ color: s.color }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                                {loading ? <span className="inline-block w-8 h-5 rounded skeleton" /> : s.value}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--bg-canvas)" }}>
                        {tabs.map(({ key, label, labelJa, icon: Icon, count }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: tab === key ? "var(--bg-surface)" : "transparent",
                                    color: tab === key ? "var(--accent)" : "var(--text-secondary)",
                                    boxShadow: tab === key ? "var(--shadow-sm)" : "none",
                                }}
                            >
                                <Icon size={12} />
                                <span>{label}</span>
                                <span className="hidden sm:inline text-[10px] opacity-60">{labelJa}</span>
                                <span
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                    style={{
                                        background: tab === key ? "var(--accent-soft)" : "var(--bg-subtle)",
                                        color: tab === key ? "var(--accent)" : "var(--text-muted)",
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                        <input
                            type="text"
                            placeholder="Cari nama, email, NIS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 rounded-xl text-sm w-60 transition-all"
                            style={{ background: "var(--bg-canvas)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="space-y-0 divide-y divide-gray-50">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-100" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-40 bg-gray-100 rounded" />
                                        <div className="h-3 w-52 bg-gray-50 rounded" />
                                    </div>
                                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                                    <div className="h-5 w-12 bg-gray-50 rounded-full" />
                                    <div className="h-8 w-24 bg-gray-100 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                                <CircleUserRound size={28} className="text-gray-200" />
                            </div>
                            <div className="text-center">
                                <p className="text-gray-500 text-sm font-medium">Tidak ada pengguna</p>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada pengguna yang terdaftar"}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/50">
                                    {["Pengguna", "Role", "NIS / Info", "Status", "Bergabung", "Aksi"].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-widest"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="hover:bg-gradient-to-r hover:from-[#006D77]/2 hover:to-transparent transition-colors group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={u.name} email={u.email} photo={u.photo} size={10} />
                                                <div>
                                                    <p className="font-semibold text-[#0D1B2A] leading-tight">
                                                        {u.name || <span className="italic text-gray-300">(Belum diatur)</span>}
                                                    </p>
                                                    <p className="text-gray-400 text-xs mt-0.5">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.nis ? (
                                                <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg">
                                                    {u.nis}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${u.active
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                                    : "bg-gray-100 text-gray-400 border border-gray-200"
                                                    }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                                                        }`}
                                                />
                                                {u.active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-xs whitespace-nowrap">
                                            {new Date(u.created_at).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors text-xs font-medium"
                                                    title="Edit profil"
                                                >
                                                    <Pencil size={12} />
                                                    <span className="hidden lg:inline">Edit</span>
                                                </button>
                                                <button
                                                    onClick={() => { setPwUser(u); setNewPassword(""); }}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors text-xs font-medium"
                                                    title="Reset password"
                                                >
                                                    <KeyRound size={12} />
                                                    <span className="hidden lg:inline">Password</span>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteUser(u)}
                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors text-xs font-medium"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                {!loading && filteredUsers.length > 0 && (
                    <div className="px-6 py-3.5 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400">
                        <span>
                            Menampilkan{" "}
                            <span className="font-semibold text-gray-600">{filteredUsers.length}</span>{" "}
                            dari{" "}
                            <span className="font-semibold text-gray-600">{users.length}</span>{" "}
                            pengguna
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {activeCount} aktif
                        </span>
                    </div>
                )}
            </div>

            {/* ── Create User Modal ── */}
            {showCreate && (
                <Modal
                    title="Tambah Pengguna Baru"
                    subtitle="Buat akun Guru atau Siswa"
                    onClose={() => { setShowCreate(false); setFormError(""); }}
                >
                    {/* Role selector */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {(["teacher", "student"] as const).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setCreateRole(r)}
                                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all text-left ${createRole === r
                                    ? "border-[#006D77] bg-[#006D77]/5 text-[#006D77]"
                                    : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"
                                    }`}
                            >
                                <span className="text-xl">{r === "teacher" ? "👨‍🏫" : "👤"}</span>
                                <div>
                                    <p className="text-xs font-bold">{r === "teacher" ? "Guru" : "Siswa"}</p>
                                    <p className="text-[10px] opacity-70">{r === "teacher" ? "先生" : "学生"}</p>
                                </div>
                                {createRole === r && (
                                    <ChevronRight size={14} className="ml-auto" />
                                )}
                            </button>
                        ))}
                    </div>

                    {formError && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                            <X size={13} className="shrink-0" />
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <Field label="Email" required>
                            <input
                                type="email"
                                required
                                placeholder="contoh@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="Password" required>
                            <PasswordInput
                                placeholder="Min. 6 karakter"
                                value={form.password}
                                onChange={(v) => setForm({ ...form, password: v })}
                            />
                        </Field>
                        <Field label="Nama Lengkap">
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                        {createRole === "student" && (
                            <Field label="NIS">
                                <input
                                    type="text"
                                    placeholder="Nomor Induk Siswa"
                                    value={form.nis}
                                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                                    className={inputCls}
                                />
                            </Field>
                        )}
                        <div className="flex items-center gap-3 pt-1 px-1">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={form.active}
                                onClick={() => setForm({ ...form, active: !form.active })}
                                className={`relative w-10 h-6 rounded-full transition-all ${form.active ? "bg-emerald-500" : "bg-gray-200"}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-4" : "translate-x-0"}`}
                                />
                            </button>
                            <span className="text-sm text-gray-600">
                                {form.active ? "Akun langsung aktif" : "Akun dinonaktifkan"}
                            </span>
                        </div>

                        <div className="flex gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setFormError(""); }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shadow-sm"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                            >
                                {formLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Menyimpan...
                                    </span>
                                ) : "Buat Akun"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Edit Modal ── */}
            {editUser && (
                <Modal
                    title="Edit Pengguna"
                    subtitle={editUser.email}
                    onClose={() => setEditUser(null)}
                >
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                        <div className="relative group shrink-0">
                            <UserAvatar name={editUser.name} email={editUser.email} photo={editForm.photo || editUser.photo} size={14} />
                            <label className={`absolute -bottom-2 -right-2 p-1.5 rounded-full cursor-pointer shadow-md transition-transform hover:scale-105 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`} style={{ background: "var(--accent)", color: "white" }} title="Ubah Foto Profil">
                                <Camera size={14} />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAdminPhotoUpload} disabled={uploadingPhoto} />
                            </label>
                        </div>
                        <div>
                            <p className="font-semibold text-[#0D1B2A] text-sm">{editUser.name || "(Belum ada nama)"}</p>
                            <RoleBadge role={editUser.role} />
                        </div>
                    </div>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <Field label="Nama Lengkap">
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                        <Field label="NIS">
                            <input
                                type="text"
                                placeholder="Nomor Induk Siswa"
                                value={editForm.nis}
                                onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                                className={inputCls}
                            />
                        </Field>
                        <div className="flex items-center gap-3 px-1">
                            <button
                                type="button"
                                role="switch"
                                aria-checked={editForm.active}
                                onClick={() => setEditForm({ ...editForm, active: !editForm.active })}
                                className={`relative w-10 h-6 rounded-full transition-all ${editForm.active ? "bg-emerald-500" : "bg-gray-200"}`}
                            >
                                <span
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${editForm.active ? "translate-x-4" : "translate-x-0"}`}
                                />
                            </button>
                            <span className="text-sm text-gray-600">
                                {editForm.active ? "Akun aktif" : "Akun nonaktif"}
                            </span>
                        </div>
                        <div className="flex gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setEditUser(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Reset Password Modal ── */}
            {pwUser && (
                <Modal
                    title="Reset Password"
                    subtitle={`Atur password baru untuk ${pwUser.name || pwUser.email}`}
                    onClose={() => { setPwUser(null); setNewPassword(""); }}
                >
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                            <KeyRound size={18} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-amber-800">{pwUser.name || "(Belum ada nama)"}</p>
                            <p className="text-xs text-amber-600">{pwUser.email} · <RoleBadge role={pwUser.role} /></p>
                        </div>
                    </div>
                    <form onSubmit={handlePasswordReset} className="space-y-5">
                        <Field label="Password Baru" required>
                            <PasswordInput
                                placeholder="Min. 6 karakter"
                                value={newPassword}
                                onChange={setNewPassword}
                                minLength={6}
                            />
                        </Field>
                        {newPassword.length > 0 && newPassword.length < 6 && (
                            <p className="text-xs text-red-500 -mt-2">Password minimal 6 karakter</p>
                        )}
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => { setPwUser(null); setNewPassword(""); }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={pwLoading || newPassword.length < 6}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-sm"
                                style={{ background: "linear-gradient(135deg, #B45309, #92400E)" }}
                            >
                                {pwLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Menyimpan...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <KeyRound size={13} />
                                        Set Password
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Delete Confirm Modal ── */}
            {deleteUser && (
                <Modal
                    title="Hapus Pengguna?"
                    subtitle="Tindakan ini tidak dapat dibatalkan"
                    onClose={() => setDeleteUser(null)}
                >
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-6">
                        <UserAvatar name={deleteUser.name} email={deleteUser.email} size={12} />
                        <div>
                            <p className="font-semibold text-red-800 text-sm">{deleteUser.name || "(Belum ada nama)"}</p>
                            <p className="text-xs text-red-500">{deleteUser.email}</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                        Akun pengguna ini akan dihapus secara permanen beserta seluruh data yang terkait.
                        Pastikan ini adalah tindakan yang benar.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteUser(null)}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            Ya, Hapus Sekarang
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
