"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Users as UsersIcon,
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
import Link from "next/link";
import { useLanguage } from "@/i18n/LanguageContext";

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
    place_of_birth?: string;
    date_of_birth?: string;
    gender?: string;
    phone?: string;
    address?: string;
}

type RoleTab = "all" | "teacher" | "student";

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
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div>
                        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
                        {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all ml-4 shrink-0 hover:bg-gray-100"
                        style={{ color: "var(--text-muted)" }}
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
function RoleBadge({ role, t }: { role: string; t: any }) {
    const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
        admin: { label: "Admin", color: "#0D7A6F", bg: "#E5F4F2", border: "#B8DDD9" },
        teacher: { label: t("dashboard.teacherRole"), color: "#B07D3A", bg: "#F5EDD9", border: "#E2C98A" },
        student: { label: t("dashboard.studentRole"), color: "#5C5EA6", bg: "#EEEEF8", border: "#C5C6E0" },
    };
    const r = ROLE_META[role] ?? { label: role, color: "#888", bg: "#f3f4f6", border: "#e5e7eb" };
    return (
        <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase"
            style={{ color: r.color, background: r.bg, borderColor: r.border }}
        >
            {r.label}
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
            <div className={`w-${size} h-${size} rounded-2xl overflow-hidden shrink-0 shadow-sm border border-gray-100`}>
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
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm transition-all border border-gray-200 focus:border-[#006D77] outline-none bg-white";

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
    const { t, lang } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<RoleTab>("all");
    const [search, setSearch] = useState("");

    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showToast = (message: string, type: "success" | "error" = "success") => setToast({ message, type });

    // Create modal
    const [showCreate, setShowCreate] = useState(false);

    // Edit modal
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: "", nis: "", active: true, photo: "", place_of_birth: "", date_of_birth: "", gender: "L", phone: "", address: "" });
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
                    place_of_birth: editForm.place_of_birth || undefined,
                    date_of_birth: editForm.date_of_birth || undefined,
                    gender: editForm.gender,
                    phone: editForm.phone || undefined,
                    address: editForm.address || undefined,
                }),
            });
            if (!res.ok) throw new Error("Gagal menyimpan");
            setEditUser(null);
            fetchUsers();
            showToast(t("common.success"));
        } catch { showToast(t("common.error"), "error"); }
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
                showToast(t("common.success"));
                fetchUsers(); // Refresh background list
            } else {
                showToast(data.error || t("common.error"), "error");
            }
        } catch (error) {
            console.error(error);
            showToast(t("common.error"), "error");
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
            showToast(t("common.success"));
        } catch (err: unknown) {
            showToast(err instanceof Error ? err.message : t("common.error"), "error");
        } finally {
            setPwLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteUser) return;
        try {
            await fetch(`${API_BASE}/users/${deleteUser.id}`, { method: "DELETE" });
            showToast(t("common.success"));
            setDeleteUser(null);
            fetchUsers();
        } catch { showToast(t("common.error"), "error"); }
    };

    const openEdit = (u: User) => {
        setEditUser(u);
        setEditForm({ 
            name: u.name ?? "", 
            nis: u.nis ?? "", 
            active: u.active, 
            photo: u.photo ?? "",
            place_of_birth: u.place_of_birth ?? "",
            date_of_birth: u.date_of_birth ? u.date_of_birth.substring(0, 10) : "",
            gender: u.gender ?? "L",
            phone: u.phone ?? "",
            address: u.address ?? "" 
        });
    };

    const tabs: { key: RoleTab; label: string; icon: React.ElementType; count: number }[] = [
        { key: "all", label: t("users.tabsAll"), icon: UsersIcon, count: users.length },
        { key: "teacher", label: t("users.tabsTeacher"), icon: BookOpen, count: teacherCount },
        { key: "student", label: t("users.tabsStudent"), icon: GraduationCap, count: studentCount },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <UsersIcon size={20} />
                        </div>
                        {t("users.title")}
                    </h1>
                    <p className="text-sm text-gray-400">{t("users.subtitle")}</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#006D77] text-white font-bold text-sm shadow-lg shadow-[#006D77]/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto shrink-0"
                >
                    <Plus size={18} /> {t("users.add")}
                </button>
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: t("users.tabsAll"), value: users.length, icon: UsersIcon, color: "#006D77", bg: "#E5F4F2" },
                    { label: t("users.active"), value: activeCount, icon: UserCheck, color: "#10b981", bg: "#ecfdf5" },
                    { label: t("users.inactive"), value: users.length - activeCount, icon: UserX, color: "#ef4444", bg: "#fef2f2" },
                ].map((s) => (
                    <div key={s.label} className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                            <s.icon size={17} style={{ color: s.color }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-900">
                                {loading ? "..." : s.value}
                            </p>
                            <p className="text-xs text-gray-400">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Card */}
            <div className="rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="flex gap-1 p-1 rounded-xl bg-gray-50">
                        {tabs.map(({ key, label, icon: Icon, count }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    tab === key ? "bg-white text-[#006D77] shadow-sm" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Icon size={12} />
                                <span>{label}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    tab === key ? "bg-[#006D77]/10 text-[#006D77]" : "bg-gray-200 text-gray-400"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t("users.searchPlaceholder")}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 rounded-xl text-sm w-60 border border-gray-100 bg-gray-50 focus:bg-white focus:border-[#006D77] outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 text-sm">{t("common.loading")}</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    <th className="text-left px-6 py-3.5">{t("users.colUser")}</th>
                                    <th className="text-left px-6 py-3.5">{t("users.colRole")}</th>
                                    <th className="text-left px-6 py-3.5">{t("users.colNis")}</th>
                                    <th className="text-left px-6 py-3.5">{t("users.colStatus")}</th>
                                    <th className="text-left px-6 py-3.5">{t("users.colJoined")}</th>
                                    <th className="text-left px-6 py-3.5">{t("users.colAction")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={u.name} email={u.email} photo={u.photo} size={10} />
                                                <div>
                                                    <p className="font-semibold text-gray-900 leading-tight">
                                                        {u.name || "---"}
                                                    </p>
                                                    <p className="text-gray-400 text-[10px] mt-0.5">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <RoleBadge role={u.role} t={t} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs text-gray-600">{u.nis || "---"}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                u.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                                            }`}>
                                                {u.active ? t("users.active") : t("users.inactive")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-[10px]">
                                            {new Date(u.created_at).toLocaleDateString(lang === 'id' ? "id-ID" : "en-US")}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(u)} className="p-2 text-gray-400 hover:text-[#006D77]"><Pencil size={14}/></button>
                                                <button onClick={() => { setPwUser(u); setNewPassword(""); }} className="p-2 text-gray-400 hover:text-amber-600"><KeyRound size={14}/></button>
                                                <button onClick={() => setDeleteUser(u)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal Components */}
            {showCreate && (
                <Modal title={t("users.add")} onClose={() => setShowCreate(false)}>
                    <div className="grid grid-cols-2 gap-4 pb-4">
                        <Link href="/dashboard/users/create?role=teacher" className="flex flex-col items-center p-6 bg-amber-50 rounded-2xl border border-amber-100 hover:shadow-md transition-all">
                            <span className="text-3xl mb-2">👨‍🏫</span>
                            <span className="font-bold text-amber-900 text-[10px] uppercase">{t("dashboard.teacherRole")}</span>
                        </Link>
                        <Link href="/dashboard/users/create?role=student" className="flex flex-col items-center p-6 bg-indigo-50 rounded-2xl border border-indigo-100 hover:shadow-md transition-all">
                            <span className="text-3xl mb-2">🎓</span>
                            <span className="font-bold text-indigo-900 text-[10px] uppercase">{t("dashboard.studentRole")}</span>
                        </Link>
                    </div>
                </Modal>
            )}

            {/* Edit User Modal */}
            {editUser && (
                <Modal title={t("users.editProfile")} subtitle={editUser.email} onClose={() => setEditUser(null)}>
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-6">
                        <UserAvatar name={editUser.name} email={editUser.email} photo={editForm.photo || editUser.photo} size={14} />
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{editUser.name || "---"}</p>
                            <RoleBadge role={editUser.role} t={t} />
                        </div>
                    </div>
                    <form onSubmit={handleEdit} className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                        <Field label={t("users.formName")}>
                            <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label={t("users.formNis")}>
                            <input type="text" value={editForm.nis} onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })} className={inputCls} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label={t("users.formPob")}>
                                <input type="text" value={editForm.place_of_birth} onChange={(e) => setEditForm({ ...editForm, place_of_birth: e.target.value })} className={inputCls} />
                            </Field>
                            <Field label={t("users.formDob")}>
                                <input type="date" value={editForm.date_of_birth} onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })} className={inputCls} />
                            </Field>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 rounded-xl border border-gray-100 text-[10px] font-bold tracking-widest uppercase">{t("users.cancel")}</button>
                            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-[#006D77] text-white text-[10px] font-bold tracking-widest uppercase">{t("users.saveChanges")}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Password/Delete modals similarly simplified and localized */}
            {pwUser && (
               <Modal title={t("users.resetPassword")} onClose={() => setPwUser(null)}>
                   <form onSubmit={handlePasswordReset} className="space-y-4">
                       <Field label="Password Baru" required>
                           <PasswordInput placeholder="Min. 6 Karakter" value={newPassword} onChange={setNewPassword} />
                       </Field>
                       <button type="submit" className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold text-xs uppercase tracking-widest">{t("common.save")}</button>
                   </form>
               </Modal> 
            )}

            {deleteUser && (
                <Modal title={t("users.deleteConfirm")} onClose={() => setDeleteUser(null)}>
                    <div className="p-4 bg-red-50 text-red-600 text-xs rounded-xl mb-6">{t("common.delete")}</div>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 rounded-xl border border-gray-100 text-[10px] font-bold uppercase">{t("users.cancel")}</button>
                        <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[10px] font-bold uppercase">{t("common.delete")}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
