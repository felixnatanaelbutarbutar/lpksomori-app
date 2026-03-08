"use client";

import { useEffect, useState, useCallback } from "react";
import {
    GraduationCap,
    BookOpen,
    Plus,
    Pencil,
    Trash2,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Lock,
    LayoutGrid,
    LayoutList,
    CheckCircle2,
    Users,
} from "lucide-react";
import { parseRole, type Role } from "../../../lib/roleHelper";

const API = "http://localhost:8080/api/v1";

const CARD_COLORS = [
    { bg: "from-[#006D77] to-[#4ECDC4]", light: "bg-[#006D77]/10 text-[#006D77]" },
    { bg: "from-[#7B5EA7] to-[#b18fe0]", light: "bg-purple-100 text-purple-700" },
    { bg: "from-[#E9A800] to-[#f7c948]", light: "bg-amber-100 text-amber-700" },
    { bg: "from-[#E63946] to-[#f7887e]", light: "bg-red-100 text-red-600" },
    { bg: "from-[#2D6A4F] to-[#52b788]", light: "bg-emerald-100 text-emerald-700" },
];

interface AcademicYear {
    id: number;
    year_range: string;
    is_active: boolean;
}
interface Class {
    id: number;
    name: string;
    level: number;
    academic_year?: AcademicYear;
    academic_year_id?: number;
}
interface Teacher { id: number; name: string; email: string; }
interface Course {
    id: number;
    class_id: number;
    name: string;
    teacher_id: number | null;
    teacher?: Teacher;
}

function getAuthState(): { role: Role; token: string; userID: number } {
    if (typeof window === "undefined") return { role: "student", token: "", userID: 0 };
    const rawRole = localStorage.getItem("mori_role") ?? "";
    const role = parseRole(rawRole);
    const token = localStorage.getItem("mori_token") ?? "";
    let userID = 0;
    try {
        const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
        userID = Number(u.id || u.ID || 0);
    } catch { /* ignore */ }
    return { role, token, userID };
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h3 className="font-semibold text-[#0D1B2A] text-base">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// ─────────────────────────────── VIEW 1: CLASS LIST ───────────────────────────
function ClassListView({ classes, loading, onSelect, role }: {
    classes: Class[];
    loading: boolean;
    onSelect: (cls: Class) => void;
    role: Role;
}) {
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">Mata Pelajaran</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Pilih kelas untuk melihat daftar mata pelajaran di dalamnya.
                    </p>
                </div>
                {role !== "teacher" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700 shrink-0">
                        <Lock size={13} />
                        Hanya Guru yang bisa menambahkan mata pelajaran
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-24">
                    <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : classes.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center py-24 gap-3">
                    <GraduationCap size={48} className="text-gray-200" />
                    <p className="font-semibold text-[#0D1B2A]">Belum Ada Kelas</p>
                    <p className="text-sm text-gray-400">Admin belum membuat kelas apapun.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...classes].sort((a, b) => a.level - b.level).map((cls, i) => {
                        const col = CARD_COLORS[i % CARD_COLORS.length];
                        return (
                            <div
                                key={cls.id}
                                onClick={() => onSelect(cls)}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                            >
                                <div className={`h-24 bg-gradient-to-br ${col.bg} p-5 flex flex-col justify-between relative overflow-hidden`}>
                                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-sm">
                                        {cls.level}
                                    </div>
                                    <h2 className="font-bold text-white text-xl relative z-10">{cls.name}</h2>
                                    <GraduationCap size={80} className="absolute -right-5 -bottom-5 text-white/10 rotate-6" />
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-xs text-gray-400 font-medium">Tahun Ajaran</p>
                                        <p className="text-sm font-semibold text-[#0D1B2A]">
                                            {cls.academic_year?.year_range ?? "—"}
                                            {cls.academic_year?.is_active && (
                                                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Aktif</span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-[#006D77] group-hover:border-transparent group-hover:text-white transition-all text-gray-400">
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─────────────────────── VIEW 2: COURSE LIST FOR A CLASS ──────────────────────
function CourseListView({ cls, role, userID, token, onBack }: {
    cls: Class;
    role: Role;
    userID: number;
    token: string;
    onBack: () => void;
}) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<"card" | "list">("card");

    const [showCreate, setShowCreate] = useState(false);
    const [formName, setFormName] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const [editCourse, setEditCourse] = useState<Course | null>(null);
    const [editName, setEditName] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/courses?class_id=${cls.id}`);
            const json = await res.json();
            setCourses(json.data ?? []);
        } finally {
            setLoading(false);
        }
    }, [cls.id]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const isTeacher = role === "teacher";
    // A teacher can only edit/delete courses they own
    const canModify = (c: Course) => isTeacher && Number(c.teacher_id) === Number(userID);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        setFormLoading(true);
        try {
            const res = await fetch(`${API}/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ class_id: cls.id, name: formName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal menambahkan");
            setShowCreate(false);
            setFormName("");
            fetchCourses();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Error tidak diketahui");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editCourse) return;
        setEditLoading(true);
        try {
            const res = await fetch(`${API}/courses/${editCourse.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ name: editName }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal mengubah");
            setEditCourse(null);
            fetchCourses();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Gagal mengubah");
        } finally {
            setEditLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        await fetch(`${API}/courses/${deleteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        setDeleteId(null);
        fetchCourses();
    };

    const myCourses = courses.filter(c => Number(c.teacher_id) === Number(userID));
    const otherCourses = courses.filter(c => Number(c.teacher_id) !== Number(userID));

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#006D77] transition-colors mb-2">
                        <ChevronLeft size={16} /> Kembali ke daftar kelas
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">{cls.name}</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        {courses.length} mata pelajaran terdaftar
                        {cls.academic_year && (
                            <span className="ml-2 text-xs font-medium text-[#006D77] bg-[#006D77]/10 px-2 py-0.5 rounded-full">
                                TA {cls.academic_year.year_range}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
                        <button
                            onClick={() => setViewMode("card")}
                            className={`px-3 py-2 transition-colors ${viewMode === "card" ? "bg-[#006D77] text-white" : "text-gray-400 hover:text-gray-600"}`}
                            title="Tampilan Kartu"
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-2 transition-colors ${viewMode === "list" ? "bg-[#006D77] text-white" : "text-gray-400 hover:text-gray-600"}`}
                            title="Tampilan Daftar"
                        >
                            <LayoutList size={16} />
                        </button>
                    </div>

                    {isTeacher && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#006D77]/25 hover:scale-105 transition-transform"
                            style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                        >
                            <Plus size={16} /> Tambah Mata Pelajaran
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-24">
                    <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : courses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-24 flex flex-col items-center gap-3">
                    <BookOpen size={48} className="text-gray-200" />
                    <p className="font-semibold text-[#0D1B2A]">Belum Ada Mata Pelajaran</p>
                    <p className="text-sm text-gray-400">Kelas ini belum memiliki mata pelajaran.</p>
                    {isTeacher && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                            style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                        >
                            + Tambah Sekarang
                        </button>
                    )}
                </div>
            ) : viewMode === "card" ? (
                /* ── CARD VIEW ── */
                <div className="space-y-8">
                    {isTeacher && myCourses.length > 0 && (
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-[#006D77]" /> Mata Pelajaran Saya
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {myCourses.map((c, i) => {
                                    const col = CARD_COLORS[i % CARD_COLORS.length];
                                    return (
                                        <div key={c.id} className="bg-white rounded-2xl border-2 border-[#006D77]/20 shadow-sm hover:shadow-md transition-all overflow-hidden group relative">
                                            <div className={`h-2 bg-gradient-to-r ${col.bg}`} />
                                            <div className="p-5">
                                                <div className="flex items-start justify-between gap-2 mb-3">
                                                    <div className={`w-10 h-10 rounded-xl ${col.light} flex items-center justify-center`}>
                                                        <BookOpen size={18} />
                                                    </div>
                                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setEditCourse(c); setEditName(c.name); }}
                                                            className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center"
                                                        >
                                                            <Pencil size={14} className="text-blue-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteId(c.id)}
                                                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center"
                                                        >
                                                            <Trash2 size={14} className="text-red-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-[#0D1B2A] mb-1">{c.name}</h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <User size={11} />
                                                    <span>{c.teacher?.name || "Anda"}</span>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006D77]/10 text-[#006D77]">Mata Pelajaran Saya</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {(isTeacher ? otherCourses : courses).length > 0 && (
                        <div>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Users size={14} className="text-gray-400" />
                                {isTeacher ? "Mata Pelajaran Guru Lain" : "Semua Mata Pelajaran"}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {(isTeacher ? otherCourses : courses).map((c, i) => {
                                    const col = CARD_COLORS[(i + 2) % CARD_COLORS.length];
                                    return (
                                        <div key={c.id} className="bg-gray-50 rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                            <div className={`h-2 bg-gradient-to-r ${col.bg} opacity-40`} />
                                            <div className="p-5">
                                                <div className="flex items-start gap-3 mb-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-200/60 flex items-center justify-center text-gray-400">
                                                        <BookOpen size={18} />
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-[#0D1B2A] mb-1">{c.name}</h3>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <User size={11} />
                                                    <span>{c.teacher?.name || "—"}</span>
                                                </div>
                                                {isTeacher && (
                                                    <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                                                        <Lock size={10} /> Tidak dapat diedit
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ── LIST VIEW ── */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-gray-50/70 border-b border-gray-100">
                                {["#", "Nama Mata Pelajaran", "Guru Pengampu", "Status", "Aksi"].map(h => (
                                    <th key={h} className="text-left px-5 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {courses.map((c, i) => {
                                const owned = canModify(c);
                                return (
                                    <tr key={c.id} className={`transition-colors hover:bg-gray-50/60 ${owned ? "" : "opacity-80"}`}>
                                        <td className="px-5 py-4 text-gray-400 text-xs font-mono">{i + 1}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${owned ? "bg-[#006D77]/10 text-[#006D77]" : "bg-gray-100 text-gray-400"}`}>
                                                    <BookOpen size={14} />
                                                </div>
                                                <span className="font-semibold text-[#0D1B2A]">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            {c.teacher ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                        {(c.teacher.name || c.teacher.email)[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-700">{c.teacher.name || "(Belum diisi)"}</p>
                                                        <p className="text-[10px] text-gray-400">{c.teacher.email}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-300 italic">—</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            {owned ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#006D77]/10 text-[#006D77]">
                                                    <CheckCircle2 size={10} /> Punya Saya
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                                                    <Lock size={10} /> Guru Lain
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            {owned ? (
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => { setEditCourse(c); setEditName(c.name); }} className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center group">
                                                        <Pencil size={13} className="text-gray-300 group-hover:text-blue-500" />
                                                    </button>
                                                    <button onClick={() => setDeleteId(c.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center group">
                                                        <Trash2 size={13} className="text-gray-300 group-hover:text-red-500" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-200 italic">—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Create Modal ── */}
            {showCreate && (
                <Modal title={`Tambah Mata Pelajaran — ${cls.name}`} onClose={() => { setShowCreate(false); setFormError(""); setFormName(""); }}>
                    <div className="flex items-center gap-2 bg-[#006D77]/6 border border-[#006D77]/15 rounded-xl px-3 py-2.5 mb-4">
                        <User size={13} className="text-[#006D77] shrink-0" />
                        <p className="text-xs text-[#006D77]">Kolom Guru akan otomatis diisi dengan akun Anda</p>
                    </div>
                    {formError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">{formError}</p>
                    )}
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Nama Mata Pelajaran <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text" required autoFocus
                                placeholder="Contoh: Bahasa Jepang N5, Matematika Dasar..."
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => { setShowCreate(false); setFormError(""); setFormName(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={formLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                                {formLoading ? "Menyimpan..." : "Tambah"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Edit Modal ── */}
            {editCourse && (
                <Modal title="Ubah Nama Mata Pelajaran" onClose={() => setEditCourse(null)}>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nama Baru</label>
                            <input type="text" required autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77]" />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setEditCourse(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={editLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                                {editLoading ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ── Delete Confirm ── */}
            {deleteId && (
                <Modal title="Hapus Mata Pelajaran?" onClose={() => setDeleteId(null)}>
                    <p className="text-sm text-gray-600 mb-6">Mata pelajaran ini dan semua aktivitas di dalamnya akan dihapus permanen.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                        <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2">
                            <Trash2 size={14} /> Hapus
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

// ─────────────────────────────── ROOT PAGE ────────────────────────────────────
export default function CoursesPage() {
    const [authState, setAuthState] = useState<{ role: Role; token: string; userID: number }>({ role: "student", token: "", userID: 0 });
    const [classes, setClasses] = useState<Class[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);

    useEffect(() => {
        setAuthState(getAuthState());
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

    useEffect(() => { fetchClasses(); }, [fetchClasses]);

    if (selectedClass) {
        return (
            <CourseListView
                cls={selectedClass}
                role={authState.role}
                userID={authState.userID}
                token={authState.token}
                onBack={() => setSelectedClass(null)}
            />
        );
    }

    return (
        <ClassListView
            classes={classes}
            loading={loadingClasses}
            onSelect={setSelectedClass}
            role={authState.role}
        />
    );
}
