"use client";

import { useEffect, useState, useCallback } from "react";
import {
    GraduationCap,
    BookOpen,
    Plus,
    Pencil,
    Trash2,
    X,
    ChevronRight,
    User,
    Lock,
} from "lucide-react";
import { parseRole, type Role } from "../../../lib/roleHelper";

const API = "http://localhost:8080/api/v1";

interface Class {
    id: number;
    name: string;
    level: number;
    academic_year_id: number;
}

interface Teacher {
    id: number;
    name: string;
    email: string;
}

interface Course {
    id: number;
    class_id: number;
    name: string;
    teacher_id: number | null;
    teacher?: Teacher;
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

export default function CoursesPage() {
    const [role, setRole] = useState<Role>("student");
    const [token, setToken] = useState<string>("");
    const [userID, setUserID] = useState<number>(0);

    const [classes, setClasses] = useState<Class[]>([]);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);

    const [loadingClasses, setLoadingClasses] = useState(true);
    const [loadingCourses, setLoadingCourses] = useState(false);

    // Create
    const [showCreate, setShowCreate] = useState(false);
    const [formName, setFormName] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    // Edit
    const [editCourse, setEditCourse] = useState<Course | null>(null);
    const [editName, setEditName] = useState("");

    // Delete
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Read role/token from localStorage
    useEffect(() => {
        const rawRole = localStorage.getItem("mori_role");
        const parsedRole = parseRole(rawRole);
        setRole(parsedRole);
        setToken(localStorage.getItem("mori_token") ?? "");
        try {
            const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
            setUserID(u.id ?? 0);
        } catch { }
    }, []);

    const fetchClasses = useCallback(async () => {
        setLoadingClasses(true);
        try {
            const res = await fetch(`${API}/classes`);
            const json = await res.json();
            setClasses(json.data ?? []);
        } finally {
            setLoadingClasses(false);
        }
    }, []);

    const fetchCourses = useCallback(async (classID: number) => {
        setLoadingCourses(true);
        try {
            const res = await fetch(`${API}/courses?class_id=${classID}`);
            const json = await res.json();
            setCourses(json.data ?? []);
        } finally {
            setLoadingCourses(false);
        }
    }, []);

    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    const selectClass = (cls: Class) => {
        setSelectedClass(cls);
        fetchCourses(cls.id);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass) return;
        setFormError("");
        setFormLoading(true);
        try {
            const res = await fetch(`${API}/courses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ class_id: selectedClass.id, name: formName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal menambahkan");
            setShowCreate(false);
            setFormName("");
            fetchCourses(selectedClass.id);
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editCourse || !selectedClass) return;
        try {
            const res = await fetch(`${API}/courses/${editCourse.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name: editName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setEditCourse(null);
            fetchCourses(selectedClass.id);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal mengubah");
        }
    };

    const handleDelete = async () => {
        if (!deleteId || !selectedClass) return;
        try {
            await fetch(`${API}/courses/${deleteId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            setDeleteId(null);
            fetchCourses(selectedClass.id);
        } catch { }
    };

    const isTeacher = role === "teacher";
    // A teacher can only edit/delete courses they own
    const canModify = (course: Course) =>
        isTeacher && course.teacher_id === userID;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        Mata Pelajaran
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Pilih kelas untuk melihat dan mengelola mata pelajaran
                    </p>
                </div>

                {/* Role notice */}
                {!isTeacher && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <Lock size={13} />
                        Hanya Guru yang bisa menambahkan mata pelajaran
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left: Class Picker ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50">
                        <h3 className="font-semibold text-[#0D1B2A] text-sm">Daftar Kelas</h3>
                        <p className="text-gray-400 text-xs mt-0.5">Pilih kelas untuk melihat mata pelajaran</p>
                    </div>

                    {loadingClasses ? (
                        <div className="flex items-center justify-center py-10 text-gray-300 text-sm gap-2">
                            <div className="w-3 h-3 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="flex flex-col items-center py-10 gap-2">
                            <BookOpen size={28} className="text-gray-200" />
                            <p className="text-gray-400 text-xs">Belum ada kelas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {[...classes]
                                .sort((a, b) => a.level - b.level)
                                .map((cls) => {
                                    const active = selectedClass?.id === cls.id;
                                    return (
                                        <button
                                            key={cls.id}
                                            onClick={() => selectClass(cls)}
                                            className={`w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors ${active
                                                    ? "bg-[#006D77]/6 text-[#006D77]"
                                                    : "hover:bg-gray-50/80 text-gray-700"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${active
                                                            ? "bg-[#006D77] text-white"
                                                            : "bg-gray-100 text-gray-500"
                                                        }`}
                                                >
                                                    {cls.level}
                                                </div>
                                                <span className="text-sm font-medium">{cls.name}</span>
                                            </div>
                                            {active && (
                                                <ChevronRight size={14} className="text-[#006D77]" />
                                            )}
                                        </button>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* ── Right: Courses ── */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div>
                            <h3 className="font-semibold text-[#0D1B2A] text-sm">
                                {selectedClass
                                    ? `Mata Pelajaran — ${selectedClass.name}`
                                    : "Mata Pelajaran"}
                            </h3>
                            {selectedClass && (
                                <p className="text-gray-400 text-xs mt-0.5">
                                    {courses.length} mata pelajaran terdaftar
                                </p>
                            )}
                        </div>

                        {/* Add button — only for teacher */}
                        {isTeacher && selectedClass && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-md shadow-[#006D77]/20 transition-all"
                                style={{
                                    background: "linear-gradient(135deg, #006D77, #004f54)",
                                }}
                            >
                                <Plus size={13} />
                                Tambah
                            </button>
                        )}
                    </div>

                    {/* Body */}
                    {!selectedClass ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <GraduationCap size={40} className="text-gray-200" />
                            <p className="text-gray-400 text-sm">
                                Pilih kelas di sebelah kiri untuk memulai
                            </p>
                        </div>
                    ) : loadingCourses ? (
                        <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
                            <div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                            Memuat...
                        </div>
                    ) : courses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2">
                            <BookOpen size={32} className="text-gray-200" />
                            <p className="text-gray-400 text-sm">
                                Belum ada mata pelajaran di kelas ini
                            </p>
                            {isTeacher && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                                    style={{
                                        background: "linear-gradient(135deg, #006D77, #004f54)",
                                    }}
                                >
                                    + Tambah sekarang
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    {["Mata Pelajaran", "Guru Pengampu", "Aksi"].map((h) => (
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
                                {courses.map((course) => (
                                    <tr
                                        key={course.id}
                                        className="hover:bg-gray-50/50 transition-colors"
                                    >
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-[#006D77]/8 flex items-center justify-center">
                                                    <BookOpen size={14} className="text-[#006D77]" />
                                                </div>
                                                <span className="font-semibold text-[#0D1B2A]">
                                                    {course.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {course.teacher ? (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                        style={{
                                                            background:
                                                                "linear-gradient(135deg, #E9A800, #c98a00)",
                                                        }}
                                                    >
                                                        {(course.teacher.name || course.teacher.email)[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-700">
                                                            {course.teacher.name || "(Belum diisi)"}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {course.teacher.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-gray-300">
                                                    <User size={13} />
                                                    <span className="text-xs">Belum ada guru</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                {canModify(course) ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditCourse(course);
                                                                setEditName(course.name);
                                                            }}
                                                            className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center group"
                                                        >
                                                            <Pencil
                                                                size={13}
                                                                className="text-gray-300 group-hover:text-blue-500"
                                                            />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(course.id)}
                                                            className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center group"
                                                        >
                                                            <Trash2
                                                                size={13}
                                                                className="text-gray-300 group-hover:text-red-500"
                                                            />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-200 italic">—</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── Create Modal ── */}
            {showCreate && (
                <Modal
                    title={`Tambah Mata Pelajaran — ${selectedClass?.name}`}
                    onClose={() => {
                        setShowCreate(false);
                        setFormError("");
                        setFormName("");
                    }}
                >
                    {/* Teacher auto-fill notice */}
                    <div className="flex items-center gap-2 bg-[#006D77]/6 border border-[#006D77]/15 rounded-lg px-3 py-2 mb-4">
                        <User size={13} className="text-[#006D77] shrink-0" />
                        <p className="text-xs text-[#006D77]">
                            Kolom Guru akan otomatis diisi dengan akun Anda
                        </p>
                    </div>

                    {formError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                            {formError}
                        </p>
                    )}

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Mata Pelajaran <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                placeholder="Contoh: Bahasa Jepang N5, Matematika Dasar..."
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                            />
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreate(false);
                                    setFormError("");
                                    setFormName("");
                                }}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={formLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                                style={{
                                    background: "linear-gradient(135deg, #006D77, #004f54)",
                                }}
                            >
                                {formLoading ? "Menyimpan..." : "Tambah"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Edit Modal ── */}
            {editCourse && (
                <Modal
                    title="Ubah Nama Mata Pelajaran"
                    onClose={() => setEditCourse(null)}
                >
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Baru
                            </label>
                            <input
                                type="text"
                                required
                                autoFocus
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button
                                type="button"
                                onClick={() => setEditCourse(null)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{
                                    background: "linear-gradient(135deg, #006D77, #004f54)",
                                }}
                            >
                                Simpan
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Delete Confirm ── */}
            {deleteId && (
                <Modal title="Hapus Mata Pelajaran?" onClose={() => setDeleteId(null)}>
                    <p className="text-sm text-gray-600 mb-6">
                        Mata pelajaran ini dan semua aktivitas di dalamnya akan dihapus
                        permanen.
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
