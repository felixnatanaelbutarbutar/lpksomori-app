"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    FileText, Plus, Trash2, X, ChevronRight, BookOpen, Clock, AlertCircle,
    CheckSquare, AlignLeft, Paperclip, ChevronLeft, GraduationCap, Link2, Upload
} from "lucide-react";

const API = "http://localhost:8080/api/v1";

interface ClassModel {
    id: number;
    name: string;
    academic_year_id: number;
    bab_start: number;
    bab_end: number;
    teacher?: { name: string };
}

interface Exam {
    id: number;
    class_id: number;
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

    // Level 1: Class List
    const [classes, setClasses] = useState<ClassModel[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);

    // Level 2: Exam List for Class
    const [selectedClass, setSelectedClass] = useState<ClassModel | null>(null);
    const [exams, setExams] = useState<Exam[]>([]);
    const [loadingExams, setLoadingExams] = useState(false);

    // Modals
    const [showCreateExam, setShowCreateExam] = useState(false);
    const [examForm, setExamForm] = useState({ title: "", description: "", start_time: "", end_time: "", max_attempts: 1 });
    const [examFormLoading, setExamFormLoading] = useState(false);
    const [examFormError, setExamFormError] = useState("");

    const [deleteExamId, setDeleteExamId] = useState<number | null>(null);

    useEffect(() => {
        setLoadingClasses(true);
        fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((j) => setClasses(j.data ?? []))
            .catch(() => { })
            .finally(() => setLoadingClasses(false));
    }, [token]);

    const fetchExams = useCallback(async (classID: number) => {
        setLoadingExams(true);
        try {
            const res = await fetch(`${API}/exams?class_id=${classID}`);
            const json = await res.json();
            setExams(json.data ?? []);
        } finally {
            setLoadingExams(false);
        }
    }, []);

    const router = useRouter();

    const openClass = (c: ClassModel) => {
        setSelectedClass(c);
        fetchExams(c.id);
    };

    const closeClass = () => {
        setSelectedClass(null);
    };

    const openExamDetail = (exam: Exam) => {
        router.push(`/dashboard/admin/exams/${exam.id}`);
    };

    const handleCreateExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass) return;
        setExamFormLoading(true);
        setExamFormError("");
        try {
            const body: Record<string, unknown> = { class_id: selectedClass.id, title: examForm.title, description: examForm.description, max_attempts: examForm.max_attempts };
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
            setExamForm({ title: "", description: "", start_time: "", end_time: "", max_attempts: 1 });
            fetchExams(selectedClass.id);
        } catch (err: unknown) {
            setExamFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setExamFormLoading(false);
        }
    };

    const handleDeleteExam = async () => {
        if (!deleteExamId || !selectedClass) return;
        await fetch(`${API}/exams/${deleteExamId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setDeleteExamId(null);
        fetchExams(selectedClass.id);
    };

    // ── VIEW 1: CLASS LIST ────────────────────────────────────────────────────────
    if (!selectedClass) {
        return (
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div>
                        <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                                <BookOpen size={20} />
                            </div>
                            Manajemen Ujian
                        </h1>
                        <p className="text-sm text-gray-400">Pilih kelas di bawah ini untuk mengelola ujian/kuis secara administratif.</p>
                    </div>
                </div>
                
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-50 bg-gray-50/50">
                                <th className="text-left px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Nama Kelas</th>
                                <th className="text-right px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loadingClasses ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-10 text-center"><div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin mx-auto" /></td>
                                </tr>
                            ) : classes.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="px-6 py-10 text-center text-gray-400">Belum ada kelas terdaftar di tahun ajaran ini.</td>
                                </tr>
                            ) : classes.map(c => (
                                <tr key={c.id} className="hover:bg-[#006D77]/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#006D77] group-hover:bg-white border border-gray-100 transition-colors">
                                                <FileText size={16} />
                                            </div>
                                            <span className="font-bold text-[#0D1B2A]">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => openClass(c)} 
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#006D77]/10 text-[#006D77] font-bold text-xs rounded-xl hover:bg-[#006D77] hover:text-white transition-colors"
                                        >
                                            Kelola Ujian
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }
    // ── VIEW 2: EXAM LIST FOR CLASS ────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <button onClick={closeClass} className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#006D77] transition-colors mb-2">
                <ChevronLeft size={16} /> Kembali ke daftar kelas
            </button>

            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1">
                        Ujian Kelas: <span className="text-[#006D77]">{selectedClass.name}</span>
                    </h1>
                    <p className="text-sm text-gray-400">Buat ujian baru, setting waktu batas, dan edit pertanyaan secara administratif.</p>
                </div>
                <button onClick={() => setShowCreateExam(true)} className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-[#006D77]/20 hover:scale-105 active:scale-95 transition-all bg-[#006D77] w-full sm:w-auto shrink-0">
                    <Plus size={18} /> Buat Ujian Baru
                </button>
            </div>

            {loadingExams ? (
                <div className="flex justify-center py-20"><div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : exams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 flex flex-col items-center">
                    <FileText size={48} className="text-gray-200 mb-4" />
                    <p className="font-semibold text-[#0D1B2A] text-lg">Belum Ada Ujian</p>
                    <p className="text-sm text-gray-500 mt-1 mb-6">Kelas ini belum memiliki ujian atau kuis.</p>
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
                <Modal title={`Buat Ujian Baru di ${selectedClass.name}`} onClose={() => setShowCreateExam(false)} wide>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">Maksimal Akses (Attempt) *</label>
                                <input type="number" min={1} required value={examForm.max_attempts} onChange={e => setExamForm({ ...examForm, max_attempts: parseInt(e.target.value) || 1 })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500" />
                            </div>
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
