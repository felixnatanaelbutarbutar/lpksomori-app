"use client";

import { useEffect, useState, useCallback } from "react";
import {
    ClipboardList,
    Plus,
    Trash2,
    X,
    Upload,
    Clock,
    FileText,
    ChevronRight,
    User,
    CheckCircle2,
    Star,
    MessageSquare,
    Paperclip,
    Eye,
    BookOpen,
    AlertCircle,
    ArrowLeft,
    GraduationCap
} from "lucide-react";

const API = "http://localhost:8080/api/v1";
const FILE_HOST = "http://localhost:8080";

interface Course {
    id: number;
    name: string;
    class_id: number;
    teacher?: { name: string };
}

interface Assignment {
    id: number;
    course_id: number;
    title: string;
    description: string;
    file_url: string;
    due_date: string | null;
    created_at: string;
}

interface Submission {
    id: number;
    assignment_id: number;
    student_id: number;
    file_url: string;
    note: string;
    grade: number | null;
    feedback: string;
    submitted_at: string;
    student: { id: number; name: string; email: string; nis: string };
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
                className={`bg-white rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto ${wide ? "w-full max-w-3xl" : "w-full max-w-md"
                    }`}
            >
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

function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getUserID() {
    if (typeof window === "undefined") return 0;
    try {
        const u = JSON.parse(localStorage.getItem("mori_user") || "{}");
        return u.ID || u.id || 0;
    } catch {
        return 0;
    }
}

export default function TeacherAssignmentsPage() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";
    const myID = getUserID();

    // 1. Level 1: Course List
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    // 2. Level 2: Specific Course Assignments
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loadingAssign, setLoadingAssign] = useState(false);

    // 3. Level 3: View Submissions
    const [viewAssignment, setViewAssignment] = useState<Assignment | null>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loadingSubs, setLoadingSubs] = useState(false);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ title: "", description: "", due_date: "" });
    const [createFile, setCreateFile] = useState<File | null>(null);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState("");

    const [gradeSub, setGradeSub] = useState<Submission | null>(null);
    const [gradeValue, setGradeValue] = useState("");
    const [gradeFeedback, setGradeFeedback] = useState("");
    const [gradeLoading, setGradeLoading] = useState(false);

    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Fetch only courses taught by me
    useEffect(() => {
        if (!myID) return;
        setLoadingCourses(true);
        fetch(`${API}/courses?teacher_id=${myID}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((j) => setCourses(j.data ?? []))
            .catch(() => { })
            .finally(() => setLoadingCourses(false));
    }, [token, myID]);

    const fetchAssignments = useCallback(async (courseID: number) => {
        setLoadingAssign(true);
        try {
            const res = await fetch(`${API}/assignments?course_id=${courseID}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const json = await res.json();
            setAssignments(json.data ?? []);
        } finally {
            setLoadingAssign(false);
        }
    }, [token]);

    const openCourse = (c: Course) => {
        setSelectedCourse(c);
        setViewAssignment(null);
        fetchAssignments(c.id);
    };

    const closeCourse = () => {
        setSelectedCourse(null);
        setViewAssignment(null);
    };

    const openSubmissions = async (a: Assignment) => {
        setViewAssignment(a);
        setLoadingSubs(true);
        try {
            const res = await fetch(`${API}/assignments/${a.id}/submissions`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            setSubmissions(json.data ?? []);
        } finally {
            setLoadingSubs(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setCreateLoading(true);
        setCreateError("");
        try {
            const form = new FormData();
            form.append("course_id", String(selectedCourse.id));
            form.append("title", createForm.title);
            form.append("description", createForm.description);
            if (createForm.due_date) form.append("due_date", new Date(createForm.due_date).toISOString());
            if (createFile) form.append("file", createFile);

            const res = await fetch(`${API}/assignments`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form,
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat tugas");

            setShowCreate(false);
            setCreateForm({ title: "", description: "", due_date: "" });
            setCreateFile(null);
            fetchAssignments(selectedCourse.id);
        } catch (err: unknown) {
            setCreateError(err instanceof Error ? err.message : "Error");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId || !selectedCourse) return;
        await fetch(`${API}/assignments/${deleteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        setDeleteId(null);
        if (viewAssignment?.id === deleteId) setViewAssignment(null);
        fetchAssignments(selectedCourse.id);
    };

    const handleGrade = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!gradeSub || !viewAssignment) return;
        setGradeLoading(true);
        try {
            const res = await fetch(
                `${API}/assignments/${viewAssignment.id}/submissions/${gradeSub.id}/grade`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ grade: parseFloat(gradeValue), feedback: gradeFeedback }),
                }
            );
            if (!res.ok) throw new Error("Gagal menyimpan nilai");
            setGradeSub(null);
            openSubmissions(viewAssignment);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Error");
        } finally {
            setGradeLoading(false);
        }
    };


    // ── VIEW 1: COURSE LIST ──────────────────────────────────────────────────────────
    if (!selectedCourse) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">Mata Pelajaran Anda</h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Pilih mata pelajaran yang Anda ampu untuk mengelola tugas.
                    </p>
                </div>

                {loadingCourses ? (
                    <div className="flex justify-center py-20">
                        <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3">
                        <BookOpen size={40} className="text-gray-200" />
                        <div className="text-center">
                            <p className="text-[#0D1B2A] font-semibold">Belum Ada Mata Pelajaran</p>
                            <p className="text-sm text-gray-500 mt-1 max-w-sm">Anda belum ditugaskan untuk mengajar mata pelajaran apapun. Silakan hubungi admin.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.map((c, i) => {
                            const colors = ["from-[#006D77] to-[#4ECDC4]", "from-[#7B5EA7] to-[#b18fe0]", "from-[#E9A800] to-[#f7c948]", "from-[#E63946] to-[#f7887e]"];
                            const bg = colors[i % colors.length];
                            return (
                                <div key={c.id}
                                    onClick={() => openCourse(c)}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all group">
                                    <div className={`h-20 bg-gradient-to-r ${bg} p-4 flex items-end relative overflow-hidden`}>
                                        <h3 className="font-bold text-white text-lg relative z-10">{c.name}</h3>
                                        <GraduationCap size={60} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#0D1B2A] font-bold text-xs">
                                                {c.teacher?.name ? c.teacher.name[0].toUpperCase() : "G"}
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Pengajar</p>
                                                <p className="text-sm font-semibold text-[#0D1B2A]">{c.teacher?.name || "Anda"}</p>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-[#006D77] group-hover:text-white transition-colors">
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

    // ── VIEW 2: SUBMISSIONS DETAILS ──────────────────────────────────────────────────
    if (viewAssignment) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <button onClick={() => setViewAssignment(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#006D77] transition-colors">
                    <ArrowLeft size={16} /> Kembali ke daftar tugas
                </button>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-[#006D77] text-sm font-semibold mb-1">
                                <ClipboardList size={16} /> TUGAS
                            </div>
                            <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">{viewAssignment.title}</h1>
                            <p className="text-gray-500 text-sm mt-2">{viewAssignment.description || "Tidak ada deskripsi."}</p>

                            <div className="flex gap-4 mt-4">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-600">
                                    <Clock size={14} className="text-gray-400" />
                                    Tenggat: {viewAssignment.due_date ? formatDate(viewAssignment.due_date) : "Tidak ada batas waktu"}
                                </div>
                                {viewAssignment.file_url && (
                                    <a href={`${FILE_HOST}${viewAssignment.file_url}`} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006D77]/10 border border-[#006D77]/20 rounded-lg text-sm font-medium text-[#006D77] hover:bg-[#006D77]/20 transition-colors">
                                        <Paperclip size={14} /> Lihat File Lampiran Anda
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="text-center bg-gray-50 rounded-xl px-6 py-4 border border-gray-100">
                            <span className="block text-2xl font-bold text-[#0D1B2A]">{submissions.length}</span>
                            <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">Pengumpulan</span>
                        </div>
                    </div>
                </div>

                <h2 className="text-lg font-bold text-[#0D1B2A] px-1">Daftar Pengumpulan Siswa</h2>

                {loadingSubs ? (
                    <div className="flex justify-center py-10"><div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
                ) : submissions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center">
                        <FileText size={40} className="text-gray-200 mb-3" />
                        <p className="font-semibold text-[#0D1B2A]">Belum Ada Pengumpulan</p>
                        <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">Siswa belum mengumpulkan jawaban untuk tugas ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {submissions.map((sub) => (
                            <div key={sub.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7B5EA7] to-[#5a3d85] flex items-center justify-center text-white font-bold">
                                            {(sub.student?.name || sub.student?.email || "?")[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-[#0D1B2A]">{sub.student?.name || "(Tanpa Nama)"}</p>
                                            <p className="text-xs text-gray-400">{sub.student?.nis ? `NIS: ${sub.student.nis}` : sub.student?.email}</p>
                                        </div>
                                    </div>

                                    {sub.grade !== null ? (
                                        <div className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1">
                                            <Star size={12} /> {sub.grade}
                                        </div>
                                    ) : (
                                        <div className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">
                                            Perlu dinilai
                                        </div>
                                    )}
                                </div>

                                <div className="text-xs text-gray-500 mb-3 flex-1">
                                    Dikumpulkan: <span className="font-medium text-gray-700">{formatDate(sub.submitted_at)}</span>
                                    {sub.note && (
                                        <div className="mt-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-gray-600 italic">
                                            "{sub.note}"
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                                    {sub.file_url && (
                                        <a href={`${FILE_HOST}${sub.file_url}`} target="_blank" rel="noopener noreferrer"
                                            className="flex-1 flex justify-center items-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors">
                                            <Paperclip size={14} /> Lihat File
                                        </a>
                                    )}
                                    <button onClick={() => { setGradeSub(sub); setGradeValue(sub.grade !== null ? String(sub.grade) : ""); setGradeFeedback(sub.feedback ?? ""); }}
                                        className="flex-1 flex justify-center items-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                                        style={{ background: sub.grade !== null ? "linear-gradient(135deg, #0D1B2A, #1a2a3a)" : "linear-gradient(135deg, #006D77, #004f54)" }}>
                                        {sub.grade !== null ? <><Star size={14} /> Edit Nilai</> : <><CheckCircle2 size={14} /> Beri Nilai</>}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Grade Modal */}
                {gradeSub && (
                    <Modal title={`Nilai — ${gradeSub.student?.name}`} onClose={() => setGradeSub(null)}>
                        <form onSubmit={handleGrade} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Nilai (0 – 100) *</label>
                                <input type="number" required min={0} max={100} step={0.5} placeholder="85"
                                    value={gradeValue} onChange={(e) => setGradeValue(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Feedback / Komentar (opsional)</label>
                                <textarea rows={3} placeholder="Tulis masukan di sini..."
                                    value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] resize-none" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setGradeSub(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                                <button type="submit" disabled={gradeLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#006D77]">Simpan Nilai</button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        );
    }

    // ── VIEW 3: ASSIGNMENT LIST FOR A COURSE ─────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <button onClick={closeCourse} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#006D77] transition-colors mb-2">
                        <ArrowLeft size={16} /> Kembali ke daftar mata pelajaran
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">{selectedCourse.name}</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Kelola tugas untuk mata pelajaran ini.</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-[#006D77]/20 hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                    <Plus size={18} /> Buat Tugas Baru
                </button>
            </div>

            {loadingAssign ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
            ) : assignments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center">
                    <ClipboardList size={48} className="text-gray-200 mb-4" />
                    <p className="font-semibold text-[#0D1B2A] text-lg">Belum Ada Tugas</p>
                    <p className="text-sm text-gray-500 mt-1 mb-6">Mata pelajaran ini belum memiliki tugas.</p>
                    <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#006D77] bg-[#006D77]/10 hover:bg-[#006D77]/20 transition-colors">
                        + Buat Tugas Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {assignments.map(a => (
                        <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center hover:border-[#006D77]/30 transition-colors group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <ClipboardList size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-[#0D1B2A] text-lg truncate">{a.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{a.description || "Tanpa deskripsi"}</p>
                                <div className="flex items-center gap-4 mt-3">
                                    <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-gray-50 text-gray-600 border border-gray-100">
                                        <Clock size={12} className="text-gray-400" />
                                        Tenggat: {a.due_date ? formatDate(a.due_date) : "Tidak ada batas"}
                                    </span>
                                    {a.file_url && (
                                        <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                                            <Paperclip size={12} /> Terlampir file
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex w-full sm:w-auto gap-2 shrink-0">
                                <button onClick={() => openSubmissions(a)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-[#006D77] bg-[#006D77]/10 hover:bg-[#006D77]/20 transition-colors">
                                    <Eye size={16} /> Lihat Pengumpulan
                                </button>
                                <button onClick={() => setDeleteId(a.id)} className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE MODAL */}
            {showCreate && (
                <Modal title={`Tugas Baru di ${selectedCourse.name}`} onClose={() => setShowCreate(false)} wide>
                    {createError && (
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4"><AlertCircle size={16} />{createError}</div>
                    )}
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Judul Tugas *</label>
                            <input type="text" required value={createForm.title} onChange={e => setCreateForm({ ...createForm, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006D77]" placeholder="Masukkan judul..." />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Instruksi Tugas</label>
                            <textarea rows={3} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006D77] resize-none" placeholder="Jelaskan apa yang harus dilakukan siswa..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Tenggat Waktu</label>
                                <input type="datetime-local" value={createForm.due_date} onChange={e => setCreateForm({ ...createForm, due_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#006D77] bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">File Lampiran (Opsional)</label>
                                <label className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-[#006D77] transition-colors bg-gray-50/50">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><Upload size={14} /></div>
                                    <span className="text-sm text-gray-500 truncate">{createFile ? createFile.name : "Klik untuk upload PDF/Doc/Gambar"}</span>
                                    <input type="file" className="hidden" onChange={e => setCreateFile(e.target.files?.[0] ?? null)} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={createLoading} className="flex-1 py-3 rounded-xl border border-transparent text-sm font-semibold text-white bg-[#006D77] hover:bg-[#005f6b] disabled:opacity-50">Simpan Tugas</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE MODAL */}
            {deleteId && (
                <Modal title="Hapus Tugas?" onClose={() => setDeleteId(null)}>
                    <p className="text-sm text-gray-600 mb-6">Tugas ini dan semua file pengumpulan siswa akan dihapus permanen. Lanjutkan?</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Batal</button>
                        <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Ya, Hapus</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
