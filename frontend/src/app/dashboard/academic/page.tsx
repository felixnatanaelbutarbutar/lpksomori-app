"use client";

import { useEffect, useState, useCallback } from "react";
import {
    CalendarDays,
    Plus,
    CheckCircle2,
    Trash2,
    X,
    Star,
    BookOpen,
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface AcademicYear {
    id: number;
    year_range: string;
    is_active: boolean;
    created_at: string;
    classes?: Class[];
}

interface Class {
    id: number;
    name: string;
    level: number;
    academic_year_id: number;
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#0D1B2A] text-base">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function AcademicPage() {
    const [years, setYears] = useState<AcademicYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ year_range: "", set_active: false });
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [activating, setActivating] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchYears = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/academic-years`);
            const json = await res.json();
            setYears(json.data ?? []);
        } catch {
            setYears([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);
        try {
            const res = await fetch(`${API}/academic-years`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat tahun ajaran");
            setShowCreate(false);
            setForm({ year_range: "", set_active: false });
            fetchYears();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleActivate = async (id: number) => {
        setActivating(id);
        try {
            await fetch(`${API}/academic-years/${id}/activate`, { method: "PATCH" });
            fetchYears();
        } finally {
            setActivating(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            const res = await fetch(`${API}/academic-years/${deleteId}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setDeleteId(null);
            fetchYears();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal menghapus");
        }
    };

    const activeYear = years.find((y) => y.is_active);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        Tahun Ajaran
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Kelola tahun ajaran — hanya satu yang boleh aktif sekaligus
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#006D77]/25"
                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                >
                    <Plus size={16} />
                    Tambah Tahun Ajaran
                </button>
            </div>

            {/* Active year banner */}
            {activeYear && (
                <div
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl border text-white"
                    style={{
                        background: "linear-gradient(135deg, #006D77 0%, #004f54 100%)",
                        borderColor: "transparent",
                    }}
                >
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                        <Star size={18} className="text-[#E9C46A]" fill="#E9C46A" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-white/60">Tahun Ajaran Aktif</p>
                        <p className="text-lg font-bold font-serif">{activeYear.year_range}</p>
                    </div>
                    <div className="ml-auto text-xs text-white/50">
                        {activeYear.classes?.length ?? 0} kelas terdaftar
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                        <div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        Memuat data...
                    </div>
                ) : years.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <CalendarDays size={36} className="text-gray-200" />
                        <p className="text-gray-400 text-sm">Belum ada tahun ajaran</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-50">
                                {["Tahun Ajaran", "Status", "Kelas", "Dibuat", "Aksi"].map(
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
                            {years.map((y) => (
                                <>
                                    <tr
                                        key={y.id}
                                        className={`hover:bg-gray-50/50 transition-colors ${y.is_active ? "bg-[#006D77]/3" : ""}`}
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${y.is_active ? "bg-[#006D77]" : "bg-gray-100"
                                                        }`}
                                                >
                                                    <CalendarDays
                                                        size={15}
                                                        className={y.is_active ? "text-white" : "text-gray-400"}
                                                    />
                                                </div>
                                                <span className="font-semibold text-[#0D1B2A]">
                                                    {y.year_range}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {y.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    Aktif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-400">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                    Tidak Aktif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() =>
                                                    setExpandedId(expandedId === y.id ? null : y.id)
                                                }
                                                className="flex items-center gap-1.5 text-xs text-[#006D77] hover:underline"
                                            >
                                                <BookOpen size={13} />
                                                {y.classes?.length ?? 0} kelas
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-gray-400 text-xs">
                                            {new Date(y.created_at).toLocaleDateString("id-ID", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                {!y.is_active && (
                                                    <button
                                                        onClick={() => handleActivate(y.id)}
                                                        disabled={activating === y.id}
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#006D77] bg-[#006D77]/8 hover:bg-[#006D77]/15 transition-colors disabled:opacity-50"
                                                        title="Aktifkan"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        {activating === y.id ? "..." : "Aktifkan"}
                                                    </button>
                                                )}
                                                {!y.is_active && (
                                                    <button
                                                        onClick={() => setDeleteId(y.id)}
                                                        className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors group"
                                                        title="Hapus"
                                                    >
                                                        <Trash2
                                                            size={13}
                                                            className="text-gray-300 group-hover:text-red-500"
                                                        />
                                                    </button>
                                                )}
                                                {y.is_active && (
                                                    <span className="text-xs text-gray-300 italic">
                                                        Sedang aktif
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded: show classes */}
                                    {expandedId === y.id && y.classes && y.classes.length > 0 && (
                                        <tr key={`${y.id}-classes`}>
                                            <td colSpan={5} className="px-5 pb-4 pt-0 bg-gray-50/50">
                                                <div className="flex flex-wrap gap-2 pt-2">
                                                    {y.classes.map((cls) => (
                                                        <span
                                                            key={cls.id}
                                                            className="px-3 py-1 rounded-xl text-xs font-medium bg-white border border-gray-100 text-gray-600 shadow-xs"
                                                        >
                                                            {cls.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <Modal
                    title="Tambah Tahun Ajaran"
                    onClose={() => {
                        setShowCreate(false);
                        setFormError("");
                    }}
                >
                    {formError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                            {formError}
                        </p>
                    )}
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Tahun Ajaran <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: 2025/2026"
                                value={form.year_range}
                                onChange={(e) => setForm({ ...form, year_range: e.target.value })}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Format: YYYY/YYYY (contoh: 2025/2026)
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex items-start gap-3">
                            <input
                                type="checkbox"
                                id="set_active"
                                checked={form.set_active}
                                onChange={(e) => setForm({ ...form, set_active: e.target.checked })}
                                className="mt-0.5 w-4 h-4 rounded accent-[#006D77]"
                            />
                            <div>
                                <label htmlFor="set_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                                    Jadikan tahun ajaran aktif
                                </label>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Jika dicentang, tahun ajaran lain akan otomatis dinonaktifkan
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                            ✨ Sistem akan otomatis membuat <strong>Kelas 1–5</strong> untuk tahun ajaran ini
                        </p>

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreate(false);
                                    setFormError("");
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                            >
                                {formLoading ? "Menyimpan..." : "Buat Tahun Ajaran"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Confirm */}
            {deleteId && (
                <Modal title="Hapus Tahun Ajaran?" onClose={() => setDeleteId(null)}>
                    <p className="text-sm text-gray-600 mb-6">
                        Semua kelas yang terhubung ke tahun ajaran ini juga akan ikut terhapus.
                        Pastikan tidak ada data penting yang masih digunakan.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeleteId(null)}
                            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2"
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
