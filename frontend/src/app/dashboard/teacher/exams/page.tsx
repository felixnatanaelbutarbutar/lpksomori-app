"use client";

import { useEffect, useState, useCallback } from "react";
import {
    FileText, Plus, Trash2, X, ChevronRight, BookOpen, Clock, AlertCircle,
    CheckSquare, AlignLeft, Paperclip, ChevronLeft, GraduationCap, Link2, Upload
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface Course {
    id: number;
    name: string;
    teacher?: { name: string };
}

interface Exam {
    id: number;
    course_id: number;
    title: string;
    description: string;
    start_time: string | null;
    end_time: string | null;
    created_at: string;
}

interface McOption { text: string; is_correct: boolean; }

interface ExamQuestion {
    id: number;
    exam_id: number;
    order_num: number;
    question_type: "multiple_choice" | "essay" | "file_upload";
    text: string;
    points: number;
    options: McOption[] | null;
}

interface ExamDetail extends Exam {
    questions: ExamQuestion[];
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    multiple_choice: { label: "Pilihan Ganda", icon: <CheckSquare size={13} />, color: "bg-blue-50 text-blue-600 border-blue-100" },
    essay: { label: "Essay", icon: <AlignLeft size={13} />, color: "bg-purple-50 text-purple-600 border-purple-100" },
    file_upload: { label: "Upload File", icon: <Paperclip size={13} />, color: "bg-amber-50 text-amber-600 border-amber-100" },
};

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className={`bg-white rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto w-full ${wide ? "max-w-2xl" : "max-w-md"}`}>
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

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getUserID() {
    if (typeof window === "undefined") return 0;
    try {
        const u = JSON.parse(localStorage.getItem("mori_user") || "{}");
        return u.ID || u.id || 0;
    } catch { return 0; }
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

export default function TeacherExamsPage() {
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";
    const myID = getUserID();

    // Level 1: Course List
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);

    // Level 2: Exam List for Course
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);

    // Level 3: Exam Detail & Questions
    const [openExam, setOpenExam] = useState<ExamDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Modals
    const [showCreateExam, setShowCreateExam] = useState(false);
    const [examForm, setExamForm] = useState({ title: "", description: "", start_time: "", end_time: "" });
    const [examFormLoading, setExamFormLoading] = useState(false);
    const [examFormError, setExamFormError] = useState("");

    const [deleteExamId, setDeleteExamId] = useState<number | null>(null);

    const [showAddQ, setShowAddQ] = useState(false);
    const [qType, setQType] = useState<"multiple_choice" | "essay" | "file_upload">("multiple_choice");
    const [qText, setQText] = useState("");
    const [qPoints, setQPoints] = useState(1);
    const [mcOptions, setMcOptions] = useState<McOption[]>([
        { text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false },
    ]);
    const [addQLoading, setAddQLoading] = useState(false);
    const [addQError, setAddQError] = useState("");

    useEffect(() => {
        if (!myID) return;
        setLoadingCourses(true);
        fetch(`${API}/courses?teacher_id=${myID}`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((j) => setCourses(j.data ?? []))
            .catch(() => { })
            .finally(() => setLoadingCourses(false));
    }, [token, myID]);

    const fetchExams = useCallback(async (courseID: number) => {
        setLoadingExams(true);
        try {
            const res = await fetch(`${API}/exams?course_id=${courseID}`);
            const json = await res.json();
            setExams(json.data ?? []);
        } finally {
            setLoadingExams(false);
        }
    }, []);

    const openCourse = (c: Course) => {
        setSelectedCourse(c);
        setOpenExam(null);
        fetchExams(c.id);
    };

    const closeCourse = () => {
        setSelectedCourse(null);
        setOpenExam(null);
    };

    const openExamDetail = async (exam: Exam) => {
        setOpenExam({ ...exam, questions: [] });
        setLoadingDetail(true);
        try {
            const res = await fetch(`${API}/exams/${exam.id}`);
            const json = await res.json();
            setOpenExam(json.data);
        } finally {
            setLoadingDetail(false);
        }
    };

    const closeExamDetail = () => {
        setOpenExam(null);
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        setExamFormLoading(true);
        setExamFormError("");
        try {
            const body: Record<string, unknown> = { course_id: selectedCourse.id, title: examForm.title, description: examForm.description };
            if (examForm.start_time) body.start_time = new Date(examForm.start_time).toISOString();
            if (examForm.end_time) body.end_time = new Date(examForm.end_time).toISOString();

            const res = await fetch(`${API}/exams`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal membuat ujian");
            setShowCreateExam(false);
            setExamForm({ title: "", description: "", start_time: "", end_time: "" });
            fetchExams(selectedCourse.id);
        } catch (err: unknown) {
            setExamFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setExamFormLoading(false);
        }
    };

    const handleDeleteExam = async () => {
        if (!deleteExamId || !selectedCourse) return;
        await fetch(`${API}/exams/${deleteExamId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setDeleteExamId(null);
        if (openExam?.id === deleteExamId) setOpenExam(null);
        fetchExams(selectedCourse.id);
    };

    const handleAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!openExam) return;
        setAddQLoading(true);
        setAddQError("");
        try {
            const body: Record<string, unknown> = { question_type: qType, text: qText, points: qPoints };
            if (qType === "multiple_choice") body.options = mcOptions.filter((o) => o.text.trim());

            const res = await fetch(`${API}/exams/${openExam.id}/questions`, {
                method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal menambah soal");

            setShowAddQ(false);
            setQText(""); setQPoints(1); setQType("multiple_choice");
            setMcOptions([{ text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]);
            openExamDetail(openExam);
        } catch (err: unknown) {
            setAddQError(err instanceof Error ? err.message : "Error");
        } finally {
            setAddQLoading(false);
        }
    };

    const handleDeleteQuestion = async (qID: number) => {
        if (!openExam) return;
        await fetch(`${API}/exams/questions/${qID}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        openExamDetail(openExam);
    };

    // ── VIEW 1: COURSE LIST ────────────────────────────────────────────────────────
    if (!selectedCourse) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">Mata Pelajaran Anda</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Pilih mata pelajaran yang Anda ampu untuk membuat ujian.</p>
                </div>
                {loadingCourses ? (
                    <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-[#7B5EA7] border-t-transparent rounded-full animate-spin" /></div>
                ) : courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm gap-3">
                        <BookOpen size={40} className="text-gray-200" />
                        <div className="text-center">
                            <p className="text-[#0D1B2A] font-semibold">Belum Ada Mata Pelajaran</p>
                            <p className="text-sm text-gray-500 mt-1">Anda belum ditugaskan untuk mengajar.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.map((c, i) => {
                            const bg = ["from-[#7B5EA7] to-[#b18fe0]", "from-[#2D6A4F] to-[#52b788]", "from-[#E9A800] to-[#f7c948]"][i % 3];
                            return (
                                <div key={c.id} onClick={() => openCourse(c)}
                                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all group">
                                    <div className={`h-20 bg-gradient-to-r ${bg} p-4 flex items-end relative overflow-hidden`}>
                                        <h3 className="font-bold text-white text-lg relative z-10">{c.name}</h3>
                                        <GraduationCap size={60} className="absolute -right-4 -bottom-4 text-white/10 rotate-12" />
                                    </div>
                                    <div className="p-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-[#0D1B2A]">Kelola Ujian</span>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 group-hover:bg-[#7B5EA7] group-hover:text-white transition-colors">
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

    // ── VIEW 3: EXAM DETAILS & MANAGE QUESTIONS ──────────────────────────────────────
    if (openExam) {
        const totalPoints = (openExam.questions ?? []).reduce((s, q) => s + q.points, 0);
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <button onClick={closeExamDetail} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7B5EA7] transition-colors">
                    <ChevronLeft size={16} /> Kembali ke daftar ujian {selectedCourse.name}
                </button>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="relative overflow-hidden bg-gradient-to-br from-[#1a0f2e] to-[#2d1b4e] p-6 lg:p-8">
                        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold uppercase tracking-wider mb-4">
                                    <FileText size={14} /> SOAL UJIAN
                                </span>
                                <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">{openExam.title}</h1>
                                <p className="text-white/60 text-sm max-w-xl">{openExam.description || "Tanpa deskripsi."}</p>

                                <div className="flex gap-4 mt-6">
                                    <div className="flex flex-col">
                                        <span className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Mulai</span>
                                        <span className="text-white text-sm font-medium">{openExam.start_time ? formatDate(openExam.start_time) : "Bebas"}</span>
                                    </div>
                                    <div className="w-px bg-white/10" />
                                    <div className="flex flex-col">
                                        <span className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Selesai</span>
                                        <span className="text-white text-sm font-medium">{openExam.end_time ? formatDate(openExam.end_time) : "Bebas"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 shrink-0">
                                <div className="bg-white/5 rounded-xl px-5 py-4 border border-white/10 text-center backdrop-blur-md">
                                    <span className="block text-3xl font-bold text-white">{openExam.questions?.length ?? 0}</span>
                                    <span className="text-xs text-white/50 uppercase font-semibold">Butir Soal</span>
                                </div>
                                <div className="bg-white/5 rounded-xl px-5 py-4 border border-white/10 text-center backdrop-blur-md">
                                    <span className="block text-3xl font-bold text-white">{totalPoints}</span>
                                    <span className="text-xs text-white/50 uppercase font-semibold">Poin Total</span>
                                </div>
                            </div>
                        </div>

                        {/* Decorative Background */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10">
                            <FileText size={180} />
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-[#0D1B2A]">Soal-soal Ujian</h2>
                            <button onClick={() => setShowAddQ(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-500/20" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>
                                <Plus size={16} /> Tambah Soal
                            </button>
                        </div>

                        {loadingDetail ? (
                            <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : !openExam.questions || openExam.questions.length === 0 ? (
                            <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
                                <Plus size={32} className="text-gray-300 mx-auto mb-3" />
                                <p className="text-[#0D1B2A] font-semibold">Ujian ini belum memiliki soal</p>
                                <p className="text-gray-500 text-sm">Klik tombol "Tambah Soal" untuk memulai.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {openExam.questions.map((q, i) => {
                                    const typeMeta = TYPE_LABELS[q.question_type];
                                    const opts: McOption[] = q.options ? (typeof q.options === "string" ? JSON.parse(q.options) : q.options) : [];
                                    return (
                                        <div key={q.id} className="p-5 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-sm transition-all relative group bg-white">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
                                                    {i + 1}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${typeMeta.color}`}>
                                                            {typeMeta.label}
                                                        </span>
                                                        <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">{q.points} Poin</span>
                                                    </div>
                                                    <p className="text-[#0D1B2A] font-medium leading-relaxed whitespace-pre-wrap">{q.text}</p>

                                                    {q.question_type === "multiple_choice" && opts.length > 0 && (
                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {opts.map((opt, oi) => (
                                                                <div key={oi} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${opt.is_correct ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium" : "bg-white border-gray-100 text-gray-700"}`}>
                                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${opt.is_correct ? "bg-emerald-500 text-white" : "border border-gray-300 text-gray-400"}`}>
                                                                        {OPTION_LETTERS[oi]}
                                                                    </div>
                                                                    <span className="flex-1 truncate">{opt.text}</span>
                                                                    {opt.is_correct && <CheckSquare size={14} className="text-emerald-500" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {q.question_type === "essay" && (
                                                        <div className="mt-3 bg-gray-50 border border-gray-100 border-dashed rounded-xl p-4 text-center">
                                                            <p className="text-xs tracking-wide uppercase font-semibold text-gray-400 flex justify-center items-center gap-2"><AlignLeft size={14} /> Area Jawaban Teks</p>
                                                        </div>
                                                    )}
                                                    {q.question_type === "file_upload" && (
                                                        <div className="mt-3 bg-gray-50 border border-gray-100 border-dashed rounded-xl p-4 text-center">
                                                            <p className="text-xs tracking-wide uppercase font-semibold text-gray-400 flex justify-center items-center gap-2"><Upload size={14} /> Area Upload File Siswa</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-5 right-5 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-gray-300">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Add Question Modal ── */}
                {showAddQ && openExam && (
                    <Modal title="Tambah Soal Ujian" onClose={() => { setShowAddQ(false); setAddQError(""); }} wide>
                        {addQError && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{addQError}</div>}
                        <form onSubmit={handleAddQuestion} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Tipe Soal</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["multiple_choice", "essay", "file_upload"] as const).map((t) => {
                                        const m = TYPE_LABELS[t];
                                        return (
                                            <button key={t} type="button" onClick={() => setQType(t)}
                                                className={`flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-semibold transition-all ${qType === t ? "border-purple-400 bg-purple-50 text-purple-700 shadow-sm" : "border-gray-200 text-gray-500 hover:border-purple-200"}`}>
                                                {m.icon} {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-1.5">
                                    <label className="block text-sm font-semibold text-[#0D1B2A]">Pertanyaan</label>
                                    <label className="block text-sm font-semibold text-[#0D1B2A] flex items-center gap-2">Poin Nilai:
                                        <input type="number" min={1} max={100} value={qPoints} onChange={(e) => setQPoints(parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center" />
                                    </label>
                                </div>
                                <textarea required rows={4} placeholder="Tulis teks pertanyaan di sini..." value={qText} onChange={(e) => setQText(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 resize-y" />
                            </div>

                            {qType === "multiple_choice" && (
                                <div className="space-y-3">
                                    <label className="block text-sm font-semibold text-[#0D1B2A]">Opsi Pilihan Ganda (Tandai yang benar)</label>
                                    {mcOptions.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <button type="button" onClick={() => setMcOptions(prev => prev.map((o, idx) => ({ ...o, is_correct: idx === i })))}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.is_correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 text-transparent"}`}>
                                                <CheckSquare size={14} className={opt.is_correct ? "text-white" : "text-transparent"} />
                                            </button>
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex justify-center items-center font-bold text-gray-500">{OPTION_LETTERS[i]}</div>
                                            <input type="text" placeholder={`Teks opsi ${OPTION_LETTERS[i]}...`} value={opt.text} onChange={(e) => setMcOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)))}
                                                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                                            {mcOptions.length > 2 && (
                                                <button type="button" onClick={() => setMcOptions(prev => prev.filter((_, idx) => idx !== i))} className="w-8 h-8 flex justify-center items-center hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-300"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    ))}
                                    {mcOptions.length < 5 && (
                                        <button type="button" onClick={() => setMcOptions(prev => [...prev, { text: "", is_correct: false }])} className="text-sm font-semibold text-purple-600 pl-[4.5rem] mt-2">+ Tambah Opsi</button>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-3 pt-6 border-t border-gray-100">
                                <button type="button" onClick={() => setShowAddQ(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                                <button type="submit" disabled={addQLoading} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>{addQLoading ? "Menyimpan..." : "Simpan Soal"}</button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        );
    }

    // ── VIEW 2: EXAM LIST FOR COURSE ────────────────────────────────────────────────
    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <button onClick={closeCourse} className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-700 transition-colors mb-2">
                        <ChevronLeft size={16} /> Kembali ke daftar mata pelajaran
                    </button>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">{selectedCourse.name}</h1>
                    <p className="text-gray-400 text-sm mt-0.5">Kelola ujian untuk mata pelajaran ini.</p>
                </div>
                <button onClick={() => setShowCreateExam(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>
                    <Plus size={18} /> Buat Ujian Baru
                </button>
            </div>

            {loadingExams ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : exams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center">
                    <FileText size={48} className="text-gray-200 mb-4" />
                    <p className="font-semibold text-[#0D1B2A] text-lg">Belum Ada Ujian</p>
                    <p className="text-sm text-gray-500 mt-1 mb-6">Mata pelajaran ini belum memiliki ujian atau kuis.</p>
                    <button onClick={() => setShowCreateExam(true)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors">
                        + Buat Ujian Pertama
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {exams.map(exam => (
                        <div key={exam.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:border-purple-200 hover:shadow-md transition-all group flex flex-col">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                    <FileText size={22} />
                                </div>
                                <button onClick={() => setDeleteExamId(exam.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <h3 className="font-bold text-[#0D1B2A] text-xl mb-1 truncate">{exam.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px] mb-4">{exam.description || "Tanpa deskripsi"}</p>

                            <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2 text-xs font-medium text-gray-600 border border-gray-100 mb-4">
                                <div className="flex items-center gap-2"><Clock size={12} className="text-gray-400" /> Mulai: {exam.start_time ? formatDate(exam.start_time) : "Bebas"}</div>
                                <div className="flex items-center gap-2"><Clock size={12} className="text-gray-400" /> Selesai: {exam.end_time ? formatDate(exam.end_time) : "Bebas"}</div>
                            </div>

                            <button onClick={() => openExamDetail(exam)} className="mt-auto w-full py-3 rounded-xl text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-600 hover:text-white transition-colors border border-purple-100 flex justify-center items-center gap-2">
                                Susun / Kelola Soal <ChevronRight size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* CREATE EXAM MODAL */}
            {showCreateExam && (
                <Modal title={`Buat Ujian Baru di ${selectedCourse.name}`} onClose={() => setShowCreateExam(false)} wide>
                    {examFormError && (<div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-4"><AlertCircle size={16} className="inline mr-2" />{examFormError}</div>)}
                    <form onSubmit={handleCreateExam} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Judul Ujian *</label>
                            <input type="text" required value={examForm.title} onChange={e => setExamForm({ ...examForm, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500" placeholder="Contoh: Ujian Tengah Semester..." />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Deskripsi / Peraturan</label>
                            <textarea rows={3} value={examForm.description} onChange={e => setExamForm({ ...examForm, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 resize-none" placeholder="Tulis instruksi pengerjaan jika ada..." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Waktu Mulai (Opsional)</label>
                                <input type="datetime-local" value={examForm.start_time} onChange={e => setExamForm({ ...examForm, start_time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Waktu Selesai (Opsional)</label>
                                <input type="datetime-local" value={examForm.end_time} onChange={e => setExamForm({ ...examForm, end_time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 bg-white" />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setShowCreateExam(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={examFormLoading} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">Buat Ujian & Lanjut Bikin Soal</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* DELETE MODAL */}
            {deleteExamId && (
                <Modal title="Hapus Ujian?" onClose={() => setDeleteExamId(null)}>
                    <p className="text-sm text-gray-600 mb-6">Ujian beserta semua soal di dalamnya akan dihapus. Perubahan ini permanen.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setDeleteExamId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Batal</button>
                        <button onClick={handleDeleteExam} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Hapus Ujian</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
