"use client";

import { useEffect, useState, useCallback } from "react";
import {
    BookOpen,
    Plus,
    Trash2,
    X,
    AlertCircle,
    GraduationCap,
    Pencil,
    UserPlus,
    UserMinus,
    Users,
    ChevronRight,
    Search,
    Lock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

const API = "http://localhost:8080/api/v1";

interface AcademicYear {
    id: number;
    year_range: string;
    is_active: boolean;
}

interface Class {
    id: number;
    name: string;
    bab_start: number;
    bab_end: number;
    teacher_id: number | null;
    teacher?: {
        name: string;
    };
    academic_year_id: number;
}

interface Teacher {
    id: number;
    name: string;
}

interface Student {
    id: number;
    name: string;
    email: string;
    nis: string;
}

interface Enrollment {
    id: number;
    class_id: number;
    user_id: number;
    enrolled_at: string;
    user: Student;
}

function Modal({
    title,
    onClose,
    children,
    wide,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    wide?: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div
                className={`bg-white rounded-2xl shadow-2xl mx-4 ${wide ? "w-full max-w-2xl" : "w-full max-w-md"
                    }`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-[#0D1B2A] text-base">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function ClassesPage() {
    const [classes, setClasses] = useState<Class[]>([]);
    const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
    const [loading, setLoading] = useState(true);

    // Create
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: "", bab_start: "", bab_end: "", teacher_id: "" });
    const [createError, setCreateError] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    // Edit (rename & update module/teacher)
    const [editClass, setEditClass] = useState<Class | null>(null);
    const [editForm, setEditForm] = useState({ name: "", bab_start: "", bab_end: "", teacher_id: "" });
    const [editLoading, setEditLoading] = useState(false);

    // Teachers
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    // Delete
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Enrollment panel
    const [enrollClass, setEnrollClass] = useState<Class | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");

    const router = useRouter();

    const [allYears, setAllYears] = useState<AcademicYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<number | "all">("all");
    const [initialLoaded, setInitialLoaded] = useState(false);

    // Initial load: fetch years, set default filter to active year
    useEffect(() => {
        const loadInitial = async () => {
            try {
                // Fetch academic years
                const yearRes = await fetch(`${API}/academic-years`, {
                    headers: { Authorization: `Bearer ${Cookies.get("token")}` }
                });
                const yearJson = await yearRes.json();
                const years: AcademicYear[] = yearJson.data || [];
                setAllYears(years);
                const active = years.find((y) => y.is_active);
                setActiveYear(active || null);
                if (active) setSelectedYearId(active.id);

                // Fetch teachers
                const tRes = await fetch(`${API}/users`, {
                    headers: { Authorization: `Bearer ${Cookies.get("token")}` }
                });
                if (tRes.ok) {
                    const tJson = await tRes.json();
                    if (tJson.data) {
                        setTeachers(tJson.data.filter((u: any) => u.role === "teacher"));
                    }
                }
            } finally {
                setInitialLoaded(true);
            }
        };
        loadInitial();
    }, []);

    const fetchClasses = useCallback(async () => {
        if (!initialLoaded) return;
        setLoading(true);
        try {
            const url = selectedYearId !== "all" ? `${API}/classes?academic_year_id=${selectedYearId}` : `${API}/classes`;
            const classRes = await fetch(url, { headers: { Authorization: `Bearer ${Cookies.get("token")}` } });
            const classJson = await classRes.json();
            setClasses(classJson.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [initialLoaded, selectedYearId]);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    // ── Create ──────────────────────────────────────────────────────────────────
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError("");
        setCreateLoading(true);
        try {
            const res = await fetch(`${API}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: createForm.name,
                    bab_start: parseInt(createForm.bab_start),
                    bab_end: parseInt(createForm.bab_end),
                    teacher_id: createForm.teacher_id ? parseInt(createForm.teacher_id) : null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat kelas");
            setShowCreate(false);
            setCreateForm({ name: "", bab_start: "", bab_end: "", teacher_id: "" });
            fetchClasses();
        } catch (err: unknown) {
            setCreateError(err instanceof Error ? err.message : "Error");
        } finally {
            setCreateLoading(false);
        }
    };

    // ── Update ──────────────────────────────────────────────────────────────────
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editClass) return;
        setEditLoading(true);
        try {
            const res = await fetch(`${API}/classes/${editClass.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editForm.name,
                    bab_start: parseInt(editForm.bab_start),
                    bab_end: parseInt(editForm.bab_end),
                    teacher_id: editForm.teacher_id ? parseInt(editForm.teacher_id) : null,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEditClass(null);
            fetchClasses();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal mengubah kelas");
        } finally {
            setEditLoading(false);
        }
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await fetch(`${API}/classes/${deleteId}`, { method: "DELETE" });
            setDeleteId(null);
            fetchClasses();
        } catch { }
    };

    // ── Navigation to Details  ──────────────────────────────────────────────────
    const openEnrollPanel = (cls: Class) => {
        router.push(`/dashboard/classes/${cls.id}`);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <BookOpen size={20} />
                        </div>
                        Manajemen Kelas
                    </h1>
                    <p className="text-sm text-gray-400">Tambah, edit nama, konfigurasi guru pengajar, dan kelola pendaftaran siswa per kelas.</p>
                </div>
                {activeYear && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#006D77] text-white font-bold text-sm shadow-lg shadow-[#006D77]/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto shrink-0"
                    >
                        <Plus size={18} /> Tambah Kelas
                    </button>
                )}
            </div>

            {/* Active year */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {activeYear ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#006D77]/6 border border-[#006D77]/15">
                        <GraduationCap size={16} className="text-[#006D77]" />
                        <p className="text-sm text-[#006D77] font-medium">
                            Tahun Ajaran Aktif:{" "}
                            <span className="font-bold">{activeYear.year_range}</span>
                        </p>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                        <AlertCircle size={16} className="text-amber-500" />
                        <p className="text-sm text-amber-700">
                            Belum ada tahun ajaran aktif. Aktifkan tahun ajaran terlebih dahulu.
                        </p>
                    </div>
                )}

                {/* Filter */}
                <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-gray-500">Filter Tahun:</label>
                    <select
                        value={selectedYearId}
                        onChange={(e) => setSelectedYearId(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                        className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] bg-white min-w-[200px]"
                    >
                        <option value="all">Semua Tahun Ajaran</option>
                        {allYears.map(y => (
                            <option key={y.id} value={y.id}>{y.year_range} {y.is_active ? "(Aktif)" : ""}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
                        <div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        Memuat data...
                    </div>
                ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <BookOpen size={36} className="text-gray-200" />
                        <p className="text-gray-400 text-sm">Belum ada kelas</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-50">
                                {[
                                    "Nama Kelas",
                                    "Cakupan Bab",
                                    "Guru",
                                    "Tahun Ajaran",
                                    "Siswa",
                                    "Aksi",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[...classes]
                                .sort((a, b) => a.bab_start - b.bab_start || a.name.localeCompare(b.name))
                                .map((cls) => {
                                    const clsYear = allYears.find(y => y.id === cls.academic_year_id);
                                    const isActive = clsYear?.is_active;
                                    return (
                                        <tr
                                            key={cls.id}
                                            className="hover:bg-gray-50/50 transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-[#006D77] bg-[#006D77]/10"
                                                    >
                                                        {cls.bab_start}-{cls.bab_end}
                                                    </div>
                                                    <span className="font-semibold text-[#0D1B2A]">
                                                        {cls.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Bab {cls.bab_start} - {cls.bab_end}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-xs text-gray-700">
                                                    {cls.teacher?.name || <span className="text-gray-400 italic">Belum ditentukan</span>}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive
                                                        ? "bg-emerald-50 text-emerald-600"
                                                        : "bg-gray-100 text-gray-500"
                                                        }`}
                                                >
                                                    {isActive
                                                        ? `✓ ${clsYear?.year_range}`
                                                        : `${clsYear?.year_range || "TA #" + cls.academic_year_id}`}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <button
                                                    onClick={() => openEnrollPanel(cls)}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-[#006D77] hover:underline"
                                                >
                                                    <Users size={13} />
                                                    Lihat siswa
                                                    <ChevronRight size={11} />
                                                </button>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1">
                                                    {/* Edit name */}
                                                    {isActive && (
                                                        <button
                                                            onClick={() => {
                                                                setEditClass(cls);
                                                                setEditForm({
                                                                    name: cls.name,
                                                                    bab_start: String(cls.bab_start),
                                                                    bab_end: String(cls.bab_end),
                                                                    teacher_id: cls.teacher_id ? String(cls.teacher_id) : "",
                                                                });
                                                            }}
                                                            className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center group"
                                                            title="Edit nama kelas"
                                                        >
                                                            <Pencil
                                                                size={13}
                                                                className="text-gray-300 group-hover:text-blue-500"
                                                            />
                                                        </button>
                                                    )}
                                                    {/* Assign siswa */}
                                                    <button
                                                        onClick={() => openEnrollPanel(cls)}
                                                        className="w-7 h-7 rounded-lg hover:bg-[#006D77]/10 flex items-center justify-center group"
                                                        title="Kelola siswa"
                                                    >
                                                        <UserPlus
                                                            size={13}
                                                            className="text-gray-300 group-hover:text-[#006D77]"
                                                        />
                                                    </button>
                                                    {/* Delete */}
                                                    {isActive && (
                                                        <button
                                                            onClick={() => setDeleteId(cls.id)}
                                                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center group"
                                                            title="Hapus kelas"
                                                        >
                                                            <Trash2
                                                                size={13}
                                                                className="text-gray-300 group-hover:text-red-500"
                                                            />
                                                        </button>
                                                    )}
                                                    {!isActive && (
                                                        <div className="ml-2 flex flex-col items-center justify-center text-gray-400" title="Terkunci (TA Tidak Aktif)">
                                                            <Lock size={13} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Create Modal ── */}
            {showCreate && (
                <Modal title="Tambah Kelas" onClose={() => setShowCreate(false)}>
                    {!activeYear && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                            <AlertCircle size={14} className="text-amber-500 shrink-0" />
                            <p className="text-xs text-amber-700">
                                Tidak ada tahun ajaran aktif.
                            </p>
                        </div>
                    )}
                    {activeYear && (
                        <div className="flex items-center gap-2 bg-[#006D77]/6 border border-[#006D77]/15 rounded-lg px-3 py-2 mb-4">
                            <GraduationCap size={14} className="text-[#006D77] shrink-0" />
                            <p className="text-xs text-[#006D77]">
                                Akan ditambahkan ke:{" "}
                                <span className="font-bold">{activeYear.year_range}</span>
                            </p>
                        </div>
                    )}
                    {createError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                            {createError}
                        </p>
                    )}
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Kelas <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: Kelas 6A"
                                value={createForm.name}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, name: e.target.value })
                                }
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Bab Awal <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    required
                                    value={createForm.bab_start}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, bab_start: e.target.value })
                                    }
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Bab Akhir <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    required
                                    value={createForm.bab_end}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, bab_end: e.target.value })
                                    }
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Guru Pengajar
                            </label>
                            <select
                                value={createForm.teacher_id}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, teacher_id: e.target.value })
                                }
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] bg-white"
                            >
                                <option value="">Pilih guru (Bisa nanti)</option>
                                {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={createLoading || !activeYear}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                            >
                                {createLoading ? "Menyimpan..." : "Tambah Kelas"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )
            }

            {/* ── Edit / Rename Modal ── */}
            {
                editClass && (
                    <Modal
                        title={`Edit Kelas`}
                        onClose={() => setEditClass(null)}
                    >
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Nama Kelas <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20"
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Bab Awal <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        required
                                        value={editForm.bab_start}
                                        onChange={(e) => setEditForm({ ...editForm, bab_start: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                        Bab Akhir <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        required
                                        value={editForm.bab_end}
                                        onChange={(e) => setEditForm({ ...editForm, bab_end: e.target.value })}
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                    Guru Pengajar
                                </label>
                                <select
                                    value={editForm.teacher_id}
                                    onChange={(e) => setEditForm({ ...editForm, teacher_id: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] bg-white"
                                >
                                    <option value="">Pilih guru (Bisa nanti)</option>
                                    {teachers.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setEditClass(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                                >
                                    {editLoading ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )
            }

            {/* ── Delete Confirm ── */}
            {
                deleteId && (
                    <Modal title="Hapus Kelas?" onClose={() => setDeleteId(null)}>
                        <p className="text-sm text-gray-600 mb-6">
                            Kelas ini dan semua data terkait (mata pelajaran, pendaftaran siswa)
                            akan dihapus permanen.
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
                )
            }
        </div >
    );
}
