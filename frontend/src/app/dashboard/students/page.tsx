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
    Check,
    BarChart2,
} from "lucide-react";
import { StudentProgressChart } from "../../../components/StudentProgressChart";

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

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: "Admin", color: "var(--role-admin)", bg: "var(--role-admin-bg)" },
    teacher: { label: "Guru", color: "var(--role-teacher)", bg: "var(--role-teacher-bg)" },
    student: { label: "Siswa", color: "var(--role-student)", bg: "var(--role-student-bg)" },
};

function RoleBadge({ role }: { role: string }) {
    const r = ROLE_META[role] ?? { label: role, color: "var(--text-muted)", bg: "var(--bg-subtle)" };
    return (
        <span
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ color: r.color, background: r.bg }}
        >
            {r.label}
        </span>
    );
}

function Modal({ title, onClose, children }: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div
                className="w-full max-w-md rounded-2xl overflow-hidden"
                style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-lg)",
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

function FormField({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                {label}
                {optional && <span className="normal-case text-[10px] font-normal ml-1" style={{ color: "var(--text-muted)" }}>(opsional)</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass = "w-full px-3.5 py-2.5 rounded-xl text-sm transition-all";
const inputStyle = {
    background: "var(--bg-canvas)",
    border: "1.5px solid var(--border)",
    color: "var(--text-primary)",
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<RoleTab>("all");
    const [search, setSearch] = useState("");

    const [showCreate, setShowCreate] = useState(false);
    const [createRole, setCreateRole] = useState<"teacher" | "student">("teacher");
    const [form, setForm] = useState({ email: "", password: "", name: "", nis: "", active: true });
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: "", nis: "", active: true });

    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [progressUser, setProgressUser] = useState<User | null>(null);

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
            await fetch(`${API_BASE}/users/${editUser.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name || undefined,
                    nis: editForm.nis || undefined,
                    active: editForm.active,
                }),
            });
            setEditUser(null);
            fetchUsers();
        } catch { }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`${API_BASE}/users/${deleteId}`, { method: "DELETE" });
            setDeleteId(null);
            fetchUsers();
        } catch { }
    };

    const openEdit = (u: User) => {
        setEditUser(u);
        setEditForm({ name: u.name ?? "", nis: u.nis ?? "", active: u.active });
    };

    const tabs: { key: RoleTab; label: string; icon: React.ElementType; count: number }[] = [
        { key: "all", label: "Semua", icon: Users, count: users.length },
        { key: "teacher", label: "Guru (先生)", icon: BookOpen, count: users.filter(u => u.role === "teacher").length },
        { key: "student", label: "Siswa (学生)", icon: GraduationCap, count: users.filter(u => u.role === "student").length },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--accent)" }}>
                        ユーザー管理
                    </p>
                    <h1
                        className="text-2xl font-bold"
                        style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}
                    >
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

            {/* ── Table Card ── */}
            <div
                className="rounded-2xl overflow-hidden"
                style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    boxShadow: "var(--shadow-sm)",
                }}
            >
                {/* Tabs + Search */}
                <div
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                >
                    <div
                        className="flex gap-1 p-1 rounded-xl"
                        style={{ background: "var(--bg-canvas)" }}
                    >
                        {tabs.map(({ key, label, icon: Icon, count }) => (
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
                                {label}
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
                            className="pl-8 pr-4 py-2 rounded-xl text-sm w-52 transition-all"
                            style={{ background: "var(--bg-canvas)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2.5 text-sm" style={{ color: "var(--text-muted)" }}>
                            <div
                                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style={{ borderColor: "var(--accent-border)", borderTopColor: "transparent" }}
                            />
                            Memuat data...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <CircleUserRound size={32} style={{ color: "var(--text-muted)", opacity: 0.4 }} />
                            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Belum ada pengguna</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                    {["Pengguna", "Role", "NIS", "Status", "Bergabung", "Aksi"].map((h) => (
                                        <th
                                            key={h}
                                            className="text-left px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]"
                                            style={{ color: "var(--text-muted)" }}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="transition-colors"
                                        style={{ borderBottom: "1px solid var(--border-subtle)" }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                                                    style={{
                                                        background: ROLE_META[u.role]?.color ?? "var(--text-muted)",
                                                    }}
                                                >
                                                    {(u.name || u.email)[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                                        {u.name || "(Nama belum diatur)"}
                                                    </p>
                                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                                                        {u.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                                            {u.nis || "—"}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                                                style={{
                                                    background: u.active ? "var(--success-bg)" : "var(--bg-subtle)",
                                                    color: u.active ? "var(--success)" : "var(--text-muted)",
                                                }}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full"
                                                    style={{ background: u.active ? "var(--success)" : "var(--text-muted)" }}
                                                />
                                                {u.active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
                                            {new Date(u.created_at).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1">
                                                {u.role === "student" && (
                                                    <button
                                                        onClick={() => setProgressUser(u)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                                        style={{ color: "var(--text-muted)" }}
                                                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#EEF6FF"; (e.currentTarget as HTMLElement).style.color = "#5C5EA6"; }}
                                                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                                                        title="Lihat Progres Nilai"
                                                    >
                                                        <BarChart2 size={13} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                                    style={{ color: "var(--text-muted)" }}
                                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#EFF6FF"; (e.currentTarget as HTMLElement).style.color = "#3B82F6"; }}
                                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(u.id)}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                                    style={{ color: "var(--text-muted)" }}
                                                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--danger-bg)"; (e.currentTarget as HTMLElement).style.color = "var(--danger)"; }}
                                                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={13} />
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
                {!loading && (
                    <div
                        className="px-5 py-3 text-xs"
                        style={{
                            borderTop: "1px solid var(--border-subtle)",
                            color: "var(--text-muted)",
                        }}
                    >
                        Menampilkan{" "}
                        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                            {filteredUsers.length}
                        </span>{" "}
                        dari{" "}
                        <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>
                            {users.length}
                        </span>{" "}
                        pengguna
                    </div>
                )}
            </div>

            {/* ── Create Modal ── */}
            {showCreate && (
                <Modal
                    title={`Tambah ${createRole === "teacher" ? "Guru" : "Siswa"}`}
                    onClose={() => { setShowCreate(false); setFormError(""); }}
                >
                    {/* Role toggle */}
                    <div
                        className="flex gap-1 mb-5 p-1 rounded-xl"
                        style={{ background: "var(--bg-canvas)" }}
                    >
                        {(["teacher", "student"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setCreateRole(r)}
                                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                                style={{
                                    background: createRole === r ? "var(--bg-surface)" : "transparent",
                                    color: createRole === r ? "var(--accent)" : "var(--text-secondary)",
                                    boxShadow: createRole === r ? "var(--shadow-sm)" : "none",
                                }}
                            >
                                {r === "teacher" ? "👨‍🏫 Guru" : "👤 Siswa"}
                            </button>
                        ))}
                    </div>

                    {formError && (
                        <div
                            className="text-xs rounded-xl px-3 py-2.5 mb-4"
                            style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid #F5C5C0" }}
                        >
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <FormField label="Email" >
                            <input
                                type="email"
                                required
                                placeholder="contoh@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </FormField>
                        <FormField label="Password">
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="Min. 6 karakter"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </FormField>
                        <FormField label="Nama Lengkap" optional>
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </FormField>
                        {createRole === "student" && (
                            <FormField label="NIS" optional>
                                <input
                                    type="text"
                                    placeholder="Nomor Induk Siswa"
                                    value={form.nis}
                                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </FormField>
                        )}
                        <div className="flex items-center gap-2.5 pt-1">
                            <input
                                type="checkbox"
                                id="active-create"
                                checked={form.active}
                                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: "var(--accent)" }}
                            />
                            <label htmlFor="active-create" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                Aktifkan akun setelah dibuat
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => { setShowCreate(false); setFormError(""); }}
                                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                                style={{ background: "var(--accent)" }}
                            >
                                {formLoading ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Edit Modal ── */}
            {editUser && (
                <Modal title={`Edit — ${editUser.email}`} onClose={() => setEditUser(null)}>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <FormField label="Nama Lengkap">
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </FormField>
                        <FormField label="NIS">
                            <input
                                type="text"
                                placeholder="Nomor Induk Siswa"
                                value={editForm.nis}
                                onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                                className={inputClass}
                                style={inputStyle}
                            />
                        </FormField>
                        <div className="flex items-center gap-2.5">
                            <input
                                type="checkbox"
                                id="active-edit"
                                checked={editForm.active}
                                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                className="w-4 h-4 rounded"
                                style={{ accentColor: "var(--accent)" }}
                            />
                            <label htmlFor="active-edit" className="text-sm" style={{ color: "var(--text-secondary)" }}>
                                Akun aktif
                            </label>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditUser(null)}
                                className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors"
                                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{ background: "var(--accent)" }}
                            >
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Delete Confirm ── */}
            {deleteId && (
                <Modal title="Hapus Pengguna?" onClose={() => setDeleteId(null)}>
                    <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                        Tindakan ini tidak dapat dibatalkan. Akun pengguna ini akan dihapus secara permanen.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteId(null)}
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
                            Hapus
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Progress Chart Modal ── */}
            {progressUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div
                        className="w-full max-w-lg rounded-2xl overflow-hidden"
                        style={{
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border)",
                            boxShadow: "var(--shadow-lg)",
                            maxHeight: "85vh",
                            overflowY: "auto",
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
                            style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border-subtle)" }}
                        >
                            <div>
                                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                                    Progres Nilai — {progressUser.name || progressUser.email}
                                </h3>
                                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                    Nilai akhir tiap kelas, diurutkan tanggal masuk
                                </p>
                            </div>
                            <button
                                onClick={() => setProgressUser(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                                style={{ color: "var(--text-muted)" }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="p-6">
                            <StudentProgressChart studentId={progressUser.id} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
