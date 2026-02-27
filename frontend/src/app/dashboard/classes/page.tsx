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
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface AcademicYear {
    id: number;
    year_range: string;
    is_active: boolean;
}

interface Class {
    id: number;
    name: string;
    level: number;
    academic_year_id: number;
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
    const [createForm, setCreateForm] = useState({ name: "", level: "" });
    const [createError, setCreateError] = useState("");
    const [createLoading, setCreateLoading] = useState(false);

    // Edit (rename)
    const [editClass, setEditClass] = useState<Class | null>(null);
    const [editName, setEditName] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    // Delete
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Enrollment panel
    const [enrollClass, setEnrollClass] = useState<Class | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [enrollLoading, setEnrollLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [classRes, yearRes] = await Promise.all([
                fetch(`${API}/classes`),
                fetch(`${API}/academic-years/active`),
            ]);
            const classJson = await classRes.json();
            setClasses(classJson.data ?? []);
            if (yearRes.ok) {
                const yearJson = await yearRes.json();
                setActiveYear(yearJson.data);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

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
                    level: parseInt(createForm.level),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat kelas");
            setShowCreate(false);
            setCreateForm({ name: "", level: "" });
            fetchAll();
        } catch (err: unknown) {
            setCreateError(err instanceof Error ? err.message : "Error");
        } finally {
            setCreateLoading(false);
        }
    };

    // ── Rename ──────────────────────────────────────────────────────────────────
    const handleRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editClass) return;
        setEditLoading(true);
        try {
            const res = await fetch(`${API}/classes/${editClass.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: editName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEditClass(null);
            fetchAll();
            // Also refresh enrollments panel if same class is open
            if (enrollClass?.id === editClass.id) {
                setEnrollClass({ ...enrollClass, name: editName });
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal mengubah nama");
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
            if (enrollClass?.id === deleteId) setEnrollClass(null);
            fetchAll();
        } catch { }
    };

    // ── Enrollment Panel ─────────────────────────────────────────────────────────
    const openEnrollPanel = async (cls: Class) => {
        setEnrollClass(cls);
        setEnrollLoading(true);
        setStudentSearch("");
        try {
            const [envRes, stuRes] = await Promise.all([
                fetch(`${API}/classes/${cls.id}/enrollments`),
                fetch(`${API}/users?role=student`),
            ]);
            const envJson = await envRes.json();
            const stuJson = await stuRes.json();
            setEnrollments(envJson.data ?? []);
            setAllStudents(stuJson.data ?? []);
        } finally {
            setEnrollLoading(false);
        }
    };

    const enrollStudent = async (studentID: number) => {
        if (!enrollClass) return;
        try {
            const res = await fetch(`${API}/classes/${enrollClass.id}/enrollments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: studentID }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            // Refresh enrollment list only
            const envRes = await fetch(`${API}/classes/${enrollClass.id}/enrollments`);
            const envJson = await envRes.json();
            setEnrollments(envJson.data ?? []);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal mendaftarkan");
        }
    };

    const unenrollStudent = async (userID: number) => {
        if (!enrollClass) return;
        try {
            await fetch(`${API}/classes/${enrollClass.id}/enrollments/${userID}`, {
                method: "DELETE",
            });
            setEnrollments((prev) => prev.filter((e) => e.user_id !== userID));
        } catch { }
    };

    const enrolledIDs = new Set(enrollments.map((e) => e.user_id));
    const filteredStudents = allStudents.filter(
        (s) =>
            !enrolledIDs.has(s.id) &&
            (s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.nis?.includes(studentSearch))
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        Manajemen Kelas
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Tambah, edit nama, dan kelola siswa per kelas
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#006D77]/25"
                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                >
                    <Plus size={16} />
                    Tambah Kelas
                </button>
            </div>

            {/* Active year */}
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
                                    "Level",
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
                                .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                                .map((cls) => {
                                    const isActive = activeYear?.id === cls.academic_year_id;
                                    const isOpen = enrollClass?.id === cls.id;
                                    return (
                                        <tr
                                            key={cls.id}
                                            className={`hover:bg-gray-50/50 transition-colors ${isOpen ? "bg-[#006D77]/3" : ""
                                                }`}
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #006D77, #4ECDC4)",
                                                        }}
                                                    >
                                                        {cls.level}
                                                    </div>
                                                    <span className="font-semibold text-[#0D1B2A]">
                                                        {cls.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    Level {cls.level}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive
                                                            ? "bg-emerald-50 text-emerald-600"
                                                            : "bg-gray-100 text-gray-400"
                                                        }`}
                                                >
                                                    {isActive
                                                        ? `✓ ${activeYear?.year_range}`
                                                        : `TA #${cls.academic_year_id}`}
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
                                                    <button
                                                        onClick={() => {
                                                            setEditClass(cls);
                                                            setEditName(cls.name);
                                                        }}
                                                        className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center group"
                                                        title="Edit nama kelas"
                                                    >
                                                        <Pencil
                                                            size={13}
                                                            className="text-gray-300 group-hover:text-blue-500"
                                                        />
                                                    </button>
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
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Enrollment Slide Panel ── */}
            {enrollClass && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 bg-[#006D77]/4">
                        <div className="flex items-center gap-3">
                            <Users size={16} className="text-[#006D77]" />
                            <div>
                                <h3 className="font-semibold text-[#0D1B2A] text-sm">
                                    Kelola Siswa — {enrollClass.name}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {enrollments.length} siswa terdaftar
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setEnrollClass(null)}
                            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                        >
                            <X size={15} className="text-gray-400" />
                        </button>
                    </div>

                    {enrollLoading ? (
                        <div className="flex items-center justify-center py-10 gap-2 text-gray-400 text-sm">
                            <div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-50">
                            {/* Enrolled students */}
                            <div className="p-5">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Siswa Terdaftar ({enrollments.length})
                                </h4>
                                {enrollments.length === 0 ? (
                                    <div className="flex flex-col items-center py-8 gap-2">
                                        <Users size={28} className="text-gray-200" />
                                        <p className="text-xs text-gray-400">
                                            Belum ada siswa di kelas ini
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {enrollments.map((e) => (
                                            <div
                                                key={e.id}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #7B5EA7, #5a3d85)",
                                                        }}
                                                    >
                                                        {(e.user?.name || e.user?.email || "?")[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-700">
                                                            {e.user?.name || "(Belum diisi)"}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {e.user?.nis ? `NIS: ${e.user.nis}` : e.user?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => unenrollStudent(e.user_id)}
                                                    className="w-6 h-6 rounded-lg hover:bg-red-100 flex items-center justify-center group"
                                                    title="Keluarkan dari kelas"
                                                >
                                                    <UserMinus
                                                        size={12}
                                                        className="text-gray-300 group-hover:text-red-500"
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Available students to enroll */}
                            <div className="p-5">
                                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                    Tambah Siswa
                                </h4>
                                {/* Search */}
                                <div className="relative mb-3">
                                    <Search
                                        size={13}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Cari nama, email, atau NIS..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20"
                                    />
                                </div>

                                {filteredStudents.length === 0 ? (
                                    <div className="flex flex-col items-center py-8 gap-2">
                                        <Users size={24} className="text-gray-200" />
                                        <p className="text-xs text-gray-400">
                                            {allStudents.length === 0
                                                ? "Belum ada akun siswa"
                                                : studentSearch
                                                    ? "Tidak ada siswa yang cocok"
                                                    : "Semua siswa sudah terdaftar di kelas ini"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                        {filteredStudents.map((s) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #7B5EA7, #5a3d85)",
                                                        }}
                                                    >
                                                        {(s.name || s.email)[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-700">
                                                            {s.name || "(Belum diisi)"}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {s.nis ? `NIS: ${s.nis}` : s.email}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => enrollStudent(s.id)}
                                                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[#006D77] bg-[#006D77]/8 hover:bg-[#006D77]/15 transition-colors"
                                                >
                                                    <UserPlus size={11} />
                                                    Daftar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Level <span className="text-red-400">*</span>
                            </label>
                            <select
                                required
                                value={createForm.level}
                                onChange={(e) =>
                                    setCreateForm({ ...createForm, level: e.target.value })
                                }
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] bg-white"
                            >
                                <option value="">Pilih level</option>
                                {[1, 2, 3, 4, 5, 6].map((l) => (
                                    <option key={l} value={l}>
                                        Level {l}
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
            )}

            {/* ── Edit / Rename Modal ── */}
            {editClass && (
                <Modal
                    title={`Edit Nama Kelas`}
                    onClose={() => setEditClass(null)}
                >
                    <form onSubmit={handleRename} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Baru <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Nama saat ini:{" "}
                                <span className="font-medium text-gray-600">{editClass.name}</span>
                            </p>
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
            )}

            {/* ── Delete Confirm ── */}
            {deleteId && (
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
            )}
        </div>
    );
}
