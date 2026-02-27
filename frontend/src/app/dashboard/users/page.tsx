"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Users,
    Plus,
    Pencil,
    Trash2,
    X,
    Check,
    Search,
    GraduationCap,
    BookOpen,
    CircleUserRound,
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

const ROLE_LABEL: Record<string, { label: string; color: string; bg: string }> = {
    admin: { label: "Admin", color: "#006D77", bg: "#006D7715" },
    teacher: { label: "Guru", color: "#E9A800", bg: "#E9A80015" },
    student: { label: "Siswa", color: "#7B5EA7", bg: "#7B5EA715" },
};

function RoleBadge({ role }: { role: string }) {
    const r = ROLE_LABEL[role] ?? { label: role, color: "#888", bg: "#88881a" };
    return (
        <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: r.color, background: r.bg }}
        >
            {r.label}
        </span>
    );
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#0D1B2A] text-base">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<RoleTab>("all");
    const [search, setSearch] = useState("");

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [createRole, setCreateRole] = useState<"teacher" | "student">("teacher");
    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        nis: "",
        active: true,
    });
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Edit modal state
    const [editUser, setEditUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: "", nis: "", active: true });

    // Delete confirm
    const [deleteId, setDeleteId] = useState<number | null>(null);

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

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

    const tabs: { key: RoleTab; label: string; icon: React.ElementType }[] = [
        { key: "all", label: "Semua", icon: Users },
        { key: "teacher", label: "Guru (先生)", icon: BookOpen },
        { key: "student", label: "Siswa (学生)", icon: GraduationCap },
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        Manajemen Pengguna
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Kelola akun Guru dan Siswa di platform
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#006D77]/25 transition-all"
                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                >
                    <Plus size={16} />
                    Tambah Pengguna
                </button>
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs + Search */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-50">
                    <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                        {tabs.map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === key
                                    ? "bg-white text-[#006D77] shadow-sm"
                                    : "text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        ))}
                    </div>

                    <div className="relative">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                        />
                        <input
                            type="text"
                            placeholder="Cari nama, email, NIS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 w-56 transition-all"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                            <div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                            Memuat data...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                            <CircleUserRound size={36} className="text-gray-200" />
                            <p className="text-gray-400 text-sm">Belum ada pengguna</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    {["Pengguna", "Role", "NIS", "Status", "Bergabung", "Aksi"].map(
                                        (h) => (
                                            <th
                                                key={h}
                                                className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                            >
                                                {h}
                                            </th>
                                        )
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredUsers.map((u) => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#006D77] to-[#4ECDC4] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                                    {(u.name || u.email)[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[#0D1B2A]">
                                                        {u.name || "(Nama belum diatur)"}
                                                    </p>
                                                    <p className="text-gray-400 text-xs">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <RoleBadge role={u.role} />
                                        </td>
                                        <td className="px-5 py-4 text-gray-500 text-xs">
                                            {u.nis || "—"}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${u.active
                                                    ? "bg-emerald-50 text-emerald-600"
                                                    : "bg-gray-100 text-gray-400"
                                                    }`}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-gray-300"
                                                        }`}
                                                />
                                                {u.active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-gray-400 text-xs">
                                            {new Date(u.created_at).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openEdit(u)}
                                                    className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors group"
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} className="text-gray-300 group-hover:text-blue-500" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(u.id)}
                                                    className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={13} className="text-gray-300 group-hover:text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer count */}
                {!loading && (
                    <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
                        Menampilkan {filteredUsers.length} dari {users.length} pengguna
                    </div>
                )}
            </div>

            {/* ── Create User Modal ── */}
            {showCreate && (
                <Modal
                    title={`Tambah ${createRole === "teacher" ? "Guru" : "Siswa"}`}
                    onClose={() => { setShowCreate(false); setFormError(""); }}
                >
                    {/* Role toggle inside modal */}
                    <div className="flex gap-2 mb-5 bg-gray-100 p-1 rounded-xl">
                        {(["teacher", "student"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setCreateRole(r)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${createRole === r
                                    ? "bg-white text-[#006D77] shadow-sm"
                                    : "text-gray-400"
                                    }`}
                            >
                                {r === "teacher" ? "👨‍🏫 Guru" : "👤 Siswa"}
                            </button>
                        ))}
                    </div>

                    {formError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                            {formError}
                        </p>
                    )}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Email <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="contoh@email.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Password <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                placeholder="Min. 6 karakter"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Lengkap <span className="text-gray-300 font-normal">(opsional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        {createRole === "student" && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    NIS <span className="text-gray-300 font-normal">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Nomor Induk Siswa"
                                    value={form.nis}
                                    onChange={(e) => setForm({ ...form, nis: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                />
                            </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="active-create"
                                checked={form.active}
                                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                                className="w-4 h-4 rounded accent-[#006D77]"
                            />
                            <label htmlFor="active-create" className="text-sm text-gray-600">
                                Aktifkan akun setelah dibuat
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
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
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                            >
                                {formLoading ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Edit Modal ── */}
            {editUser && (
                <Modal
                    title={`Edit Pengguna — ${editUser.email}`}
                    onClose={() => setEditUser(null)}
                >
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Lengkap
                            </label>
                            <input
                                type="text"
                                placeholder="Nama lengkap"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                NIS
                            </label>
                            <input
                                type="text"
                                placeholder="Nomor Induk Siswa"
                                value={editForm.nis}
                                onChange={(e) => setEditForm({ ...editForm, nis: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active-edit"
                                checked={editForm.active}
                                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                                className="w-4 h-4 rounded accent-[#006D77]"
                            />
                            <label htmlFor="active-edit" className="text-sm text-gray-600">
                                Akun aktif
                            </label>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setEditUser(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
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
                    <p className="text-sm text-gray-600 mb-6">
                        Tindakan ini tidak dapat dibatalkan. Akun pengguna ini akan dihapus secara permanen.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            Hapus
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
