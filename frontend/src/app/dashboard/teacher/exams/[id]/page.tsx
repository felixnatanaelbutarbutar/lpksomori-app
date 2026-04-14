"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    FileText, Plus, Trash2, X, ChevronLeft, Clock, AlertCircle,
    CheckSquare, AlignLeft, Paperclip, Users, Settings, Save, Edit3, CheckCircle,
    Database, Upload, Package
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const API = "http://localhost:8080/api/v1";

interface McOption { text: string; is_correct: boolean; }

interface ExamQuestion {
    id: number;
    exam_id: number;
    order_num: number;
    question_type: "multiple_choice" | "essay" | "file_upload";
    text: string;
    points: number;
    options: string | McOption[] | null;
}

interface ExamDetail {
    id: number;
    class_id: number;
    title: string;
    description: string;
    start_time: string | null;
    end_time: string | null;
    max_attempts: number;
    created_at: string;
    questions?: ExamQuestion[];
}

interface Student {
    id: number;
    name: string;
    nis: string;
}

interface ExamAnswer {
    id: number;
    question_id: number;
    student_id: number;
    answer_text: string;
    file_url: string;
    score: number | null;
    question: ExamQuestion;
}

// Note: TYPE_LABELS will be dynamically resolved in render to support t()
type QType = "multiple_choice" | "essay" | "file_upload";
const ICONS: Record<string, React.ReactNode> = {
    multiple_choice: <CheckSquare size={13} />,
    essay: <AlignLeft size={13} />,
    file_upload: <Paperclip size={13} />
};
const COLORS: Record<string, string> = {
    multiple_choice: "bg-blue-50 text-blue-600 border-blue-100",
    essay: "bg-purple-50 text-purple-600 border-purple-100",
    file_upload: "bg-amber-50 text-amber-600 border-amber-100"
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

function formatDateToInput(iso: string | null) {
    if (!iso) return "";
    return new Date(iso).toISOString().slice(0, 16);
}

function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ExamManagePage() {
    const { t } = useLanguage();
    const router = useRouter();
    const { id } = useParams();
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const [exam, setExam] = useState<ExamDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState<"soal" | "penilaian" | "pengaturan">("soal");

    // Modal Add / Edit Soal
    const [showAddQ, setShowAddQ] = useState(false);
    const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);

    const [qType, setQType] = useState<"multiple_choice" | "essay" | "file_upload">("multiple_choice");
    const [qText, setQText] = useState("");
    const [qPoints, setQPoints] = useState(1);
    const [mcOptions, setMcOptions] = useState<McOption[]>([
        { text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false },
    ]);
    const [addQLoading, setAddQLoading] = useState(false);
    
    // Modal Bulk Add Soal PG
    const [showBulkAdd, setShowBulkAdd] = useState(false);
    const [bulkCount, setBulkCount] = useState(5);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Pengaturan
    const [editForm, setEditForm] = useState({ title: "", description: "", start_time: "", end_time: "", max_attempts: 1 });
    const [editLoading, setEditLoading] = useState(false);

    // Penilaian
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentAnswers, setStudentAnswers] = useState<ExamAnswer[]>([]);
    const [gradingLoading, setGradingLoading] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Import from Bank Soal
    const [showImportBank, setShowImportBank] = useState(false);
    interface QuestionBankItem { id: number; title: string; description: string; questions: unknown[] }
    const [banks, setBanks] = useState<QuestionBankItem[]>([]);
    const [loadingBanks, setLoadingBanks] = useState(false);
    const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
    const [importingBank, setImportingBank] = useState(false);
    const [importResult, setImportResult] = useState("");

    const fetchExam = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/exams/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            if (json.data) {
                setExam(json.data);
                setEditForm({
                    title: json.data.title,
                    description: json.data.description,
                    start_time: formatDateToInput(json.data.start_time),
                    end_time: formatDateToInput(json.data.end_time),
                    max_attempts: json.data.max_attempts || 1,
                });
            }
        } finally {
            setLoading(false);
        }
    }, [id, token]);

    useEffect(() => {
        if (id && token) fetchExam();
    }, [fetchExam, id, token]);

    useEffect(() => {
        if (activeTab === "penilaian" && id && token) {
            setLoadingStudents(true);
            fetch(`${API}/exams/${id}/students`, { headers: { Authorization: `Bearer ${token}` } })
                .then(r => r.json())
                .then(j => setStudents(j.data || []))
                .finally(() => setLoadingStudents(false));
        }
    }, [activeTab, id, token]);

    const handleSaveQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddQLoading(true);
        try {
            const body: Record<string, unknown> = { question_type: qType, text: qText, points: qPoints };
            if (qType === "multiple_choice") body.options = mcOptions.filter((o) => o.text.trim());

            if (editingQuestionId) {
                await fetch(`${API}/exams/questions/${editingQuestionId}`, {
                    method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                });
            } else {
                await fetch(`${API}/exams/${id}/questions`, {
                    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                });
            }
            
            setShowAddQ(false);
            setEditingQuestionId(null);
            setQText(""); setQPoints(1); setQType("multiple_choice");
            setMcOptions([{ text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]);
            fetchExam();
        } finally {
            setAddQLoading(false);
        }
    };

    const openEditQuestion = (q: ExamQuestion) => {
        setEditingQuestionId(q.id);
        setQType(q.question_type);
        setQText(q.text);
        setQPoints(q.points);
        if (q.question_type === "multiple_choice" && q.options) {
            let opts: McOption[] = [];
            if (typeof q.options === "string") {
                try { opts = JSON.parse(q.options); } catch { opts = []; }
            } else {
                 opts = q.options as McOption[];
            }
            if (opts.length === 0) {
                 setMcOptions([{ text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]);
            } else {
                 setMcOptions(opts);
            }
        }
        setShowAddQ(true);
    };

    const handleBulkAddQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setBulkLoading(true);
        try {
            for (let i = 0; i < bulkCount; i++) {
                const body = {
                    question_type: "multiple_choice",
                    text: `Pertanyaan Baru ${i+1} (Edit Nanti)`,
                    points: 1,
                    options: [
                        { text: "Opsi A", is_correct: true },
                        { text: "Opsi B", is_correct: false },
                        { text: "Opsi C", is_correct: false },
                        { text: "Opsi D", is_correct: false },
                    ]
                };
                await fetch(`${API}/exams/${id}/questions`, {
                    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify(body),
                });
            }
            setShowBulkAdd(false);
            fetchExam();
        } finally {
            setBulkLoading(false);
        }
    };

    const handleDeleteQuestion = async (qID: number) => {
        if (!confirm(t("examDetail.deleteConfirm"))) return;
        await fetch(`${API}/exams/questions/${qID}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        fetchExam();
    };

    const handleEditExam = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditLoading(true);
        try {
            const body: Record<string, unknown> = { title: editForm.title, description: editForm.description, max_attempts: editForm.max_attempts };
            if (editForm.start_time) body.start_time = new Date(editForm.start_time).toISOString();
            if (editForm.end_time) body.end_time = new Date(editForm.end_time).toISOString();

            await fetch(`${API}/exams/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            alert("Pengaturan ujian tersimpan!");
            fetchExam();
        } finally {
            setEditLoading(false);
        }
    };

    const fetchStudentAnswers = async (studentId: number) => {
        const doc = students.find(s => s.id === studentId);
        if (doc) setSelectedStudent(doc);
        setGradingLoading(true);
        try {
            const res = await fetch(`${API}/exams/${id}/students/${studentId}/answers`, { headers: { Authorization: `Bearer ${token}` } });
            const json = await res.json();
            setStudentAnswers(json.data || []);
        } finally {
            setGradingLoading(false);
        }
    };

    const saveScore = async (answerId: number, score: number) => {
        await fetch(`${API}/exams/answers/${answerId}/score`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ score }),
        });
        if (selectedStudent) fetchStudentAnswers(selectedStudent.id);
    };

    const openImportBank = async () => {
        setImportResult(""); setSelectedBankId(null);
        setShowImportBank(true);
        setLoadingBanks(true);
        try {
            const r = await fetch(`${API}/question-banks`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await r.json();
            setBanks(j.data ?? []);
        } finally { setLoadingBanks(false); }
    };

    const handleImportBank = async () => {
        if (!selectedBankId || !id) return;
        setImportingBank(true); setImportResult("");
        try {
            const r = await fetch(`${API}/question-banks/${selectedBankId}/import-to-exam/${id}`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal mengimpor");
            setImportResult(j.message ?? "Berhasil diimpor!");
            fetchExam();
        } catch (err: unknown) {
            setImportResult("❌ " + (err instanceof Error ? err.message : "Error"));
        } finally { setImportingBank(false); }
    };

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>;
    if (!exam) return <div className="p-10 text-center">{t("examDetail.notFound")}</div>;

    const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => {
                    const role = localStorage.getItem("mori_role");
                    router.push(role === "admin" ? "/dashboard/admin/exams" : "/dashboard/teacher/exams");
                }} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-purple-700 transition-colors shadow-sm">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">{exam.title}</h1>
                    <p className="text-sm text-gray-500">{t("examDetail.subtitle")}</p>
                </div>
            </div>

            <div className="flex gap-4 border-b border-gray-200">
                <button onClick={() => setActiveTab("soal")} className={`px-4 py-3 border-b-2 font-semibold transition-colors ${activeTab === "soal" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t("examDetail.tabQuestions")} ({(exam.questions||[]).length})
                </button>
                <button onClick={() => setActiveTab("penilaian")} className={`px-4 py-3 border-b-2 font-semibold transition-colors ${activeTab === "penilaian" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t("examDetail.tabGrading")}
                </button>
                <button onClick={() => setActiveTab("pengaturan")} className={`px-4 py-3 border-b-2 font-semibold transition-colors ${activeTab === "pengaturan" ? "border-purple-600 text-purple-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                    {t("examDetail.tabSettings")}
                </button>
            </div>

            {/* TAB: SOAL */}
            {activeTab === "soal" && (
                <div className="space-y-6">
                    <div className="flex flex-wrap gap-3">
                        <button onClick={() => {
                            setEditingQuestionId(null);
                            setQText(""); setQPoints(1); setQType("multiple_choice");
                            setMcOptions([{ text: "", is_correct: true }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }]);
                            setShowAddQ(true);
                        }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-md hover:scale-105 transition-transform" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>
                            <Plus size={18} /> {t("examDetail.addQuestionBtn")}
                        </button>
                        <button onClick={() => setShowBulkAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-[#7B5EA7] text-[#7B5EA7] bg-white hover:bg-purple-50 transition-colors shadow-sm">
                            <Plus size={18} /> {t("examDetail.bulkAddBtn")}
                        </button>
                        <button onClick={openImportBank} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
                            <Database size={16} /> {t("examDetail.importBankBtn")}
                        </button>
                    </div>

                    {(exam.questions || []).length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center shadow-sm">
                            <p className="text-gray-500 font-medium">{t("examDetail.noQuestions")}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {(exam.questions || []).map((q, i) => {
                                const typeLabel = q.question_type === "multiple_choice" ? t("examDetail.typeMc") : q.question_type === "essay" ? t("examDetail.typeEssay") : t("examDetail.typeUpload");
                                const opts: McOption[] = (() => {
                                    if (!q.options) return [];
                                    if (typeof q.options === "string") {
                                        try { return JSON.parse(q.options); } catch { return []; }
                                    }
                                    return q.options as McOption[];
                                })();
                                return (
                                    <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative group">
                                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                            <button onClick={() => openEditQuestion(q)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 flex items-center justify-center">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteQuestion(q.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex justify-center items-center font-bold">{i + 1}</div>
                                            <div className="flex-1">
                                                <div className="flex gap-2 mb-2">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border flex items-center gap-1.5 ${COLORS[q.question_type]}`}>{ICONS[q.question_type]} {typeLabel}</span>
                                                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border bg-gray-50 text-gray-500 border-gray-200">{q.points} {t("examDetail.points")}</span>
                                                </div>
                                                <p className="text-gray-800 font-medium leading-relaxed mb-4 whitespace-pre-wrap">{q.text}</p>
                                                {q.question_type === "multiple_choice" && opts.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                                                        {opts.map((opt, idx) => (
                                                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${opt.is_correct ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-100"}`}>
                                                                <div className={`w-6 h-6 rounded-md flex shrink-0 items-center justify-center text-xs font-bold leading-none ${opt.is_correct ? "bg-emerald-500 text-white" : "bg-white border text-gray-400"}`}>{OPTION_LETTERS[idx]}</div>
                                                                <span className={`text-sm leading-tight ${opt.is_correct ? "text-emerald-800 font-semibold" : "text-gray-600"}`}>{opt.text}</span>
                                                                {opt.is_correct && <CheckCircle className="ml-auto text-emerald-500 shrink-0" size={16} />}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: PENILAIAN */}
            {activeTab === "penilaian" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 font-semibold text-[#0D1B2A] flex items-center gap-2"><Users size={18} /> {t("examDetail.studentList")} ({students.length})</div>
                        {loadingStudents ? <div className="p-5 text-center text-sm text-gray-500">{t("examDetail.loadingStudents")}</div> : (
                            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                                {students.map(s => (
                                    <button key={s.id} onClick={() => fetchStudentAnswers(s.id)} className={`w-full text-left px-5 py-4 hover:bg-purple-50 transition-colors flex justify-between items-center ${selectedStudent?.id === s.id ? "bg-purple-50" : ""}`}>
                                        <div>
                                            <div className={`font-semibold text-sm ${selectedStudent?.id === s.id ? "text-purple-700" : "text-[#0D1B2A]"}`}>{s.name}</div>
                                            <div className="text-xs text-gray-400">{s.nis || t("examDetail.nisEmpty")}</div>
                                        </div>
                                        <ChevronLeft size={16} className={`text-gray-300 transform rotate-180 transition-transform ${selectedStudent?.id === s.id ? "translate-x-1 text-purple-400" : ""}`} />
                                    </button>
                                ))}
                                {students.length === 0 && <div className="p-5 text-center text-sm text-gray-500">{t("examDetail.noStudents")}</div>}
                            </div>
                        )}
                    </div>

                    <div className="md:col-span-2">
                        {!selectedStudent ? (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex flex-col items-center justify-center text-center">
                                <FileText size={48} className="text-gray-200 mb-4" />
                                <h3 className="text-[#0D1B2A] font-semibold text-lg">{t("examDetail.selectStudent")}</h3>
                                <p className="text-sm text-gray-500">{t("examDetail.selectStudentSub")}</p>
                            </div>
                        ) : gradingLoading ? (
                             <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex bg-white rounded-2xl p-4 shadow-sm border border-purple-100 font-semibold text-purple-900 justify-between items-center">
                                    <span>{t("examDetail.gradingResult")}{selectedStudent.name}</span>
                                    {/* count total score */}
                                    <span className="text-2xl font-black text-purple-600">
                                        {t("examDetail.scoreTotal")}: {studentAnswers.reduce((acc, curr) => acc + (curr.score || 0), 0)}
                                    </span>
                                </div>
                                {studentAnswers.map((ans, i) => (
                                    <div key={ans.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start gap-4">
                                            <div className="flex gap-3">
                                                <div className="font-bold text-gray-400 bg-gray-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">{i+1}</div>
                                                <div className="text-sm text-gray-800 font-medium pt-1 whitespace-pre-wrap">{ans.question?.text}</div>
                                            </div>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                                <input type="number" defaultValue={ans.score ?? ""} placeholder="Nilai" 
                                                    disabled={ans.question?.question_type === "multiple_choice"}
                                                    onBlur={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        if (!isNaN(val) && val !== ans.score) saveScore(ans.id, val);
                                                    }}
                                                    className={`w-20 px-3 py-1.5 border rounded-lg text-sm font-bold text-center outline-none focus:ring-2 focus:ring-purple-500 ${ans.question?.question_type === "multiple_choice" ? "bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed" : "border-purple-200 text-purple-700 bg-white"}`} />
                                                                <span className="text-xs text-gray-400 font-bold">/ {ans.question?.points} {t("examDetail.points")}</span>
                                                {ans.question?.question_type === "multiple_choice" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold ml-1">{t("examDetail.auto")}</span>}
                                            </div>
                                        </div>
                                        <div className="pl-11 pr-5 pb-2">
                                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 border-b pb-1 inline-block">{t("examDetail.studentAnswersLabel")}</div>
                                            
                                            {ans.question?.question_type === "multiple_choice" ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                                    {(typeof ans.question.options === "string" ? JSON.parse(ans.question.options) : ans.question.options || []).map((opt: any, idx: number) => {
                                                        const isSelected = opt.text === ans.answer_text;
                                                        const isCorrect = opt.is_correct;
                                                        
                                                        let ringClass = "border-gray-100 bg-gray-50 text-gray-600";
                                                        if (isCorrect && isSelected) ringClass = "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold";
                                                        else if (isCorrect) ringClass = "border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold";
                                                        else if (isSelected) ringClass = "border-red-200 bg-red-50 text-red-800 font-semibold";

                                                        return (
                                                            <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border ${ringClass}`}>
                                                                <div className={`w-6 h-6 rounded-md flex shrink-0 items-center justify-center text-xs font-bold leading-none ${isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-white border text-gray-400"}`}>
                                                                    {["A", "B", "C", "D", "E"][idx] || idx}
                                                                </div>
                                                                <span className="text-sm leading-tight pt-0.5">{opt.text}</span>
                                                                <div className="ml-auto flex gap-1">
                                                                    {isCorrect && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{t("examDetail.keyOpt")}</span>}
                                                                    {isSelected && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">{t("examDetail.selectedOpt")}</span>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <>
                                                    {ans.answer_text ? (
                                                        <p className="text-sm text-gray-700 bg-purple-50 p-3 rounded-xl border border-purple-100 whitespace-pre-wrap">{ans.answer_text}</p>
                                                    ) : (
                                                        <p className="text-sm text-gray-400 italic">{t("examDetail.emptyAns")}</p>
                                                    )}
                                                    {ans.file_url && (
                                                        <a href={ans.file_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg font-medium hover:bg-blue-100">
                                                            <Paperclip size={14} /> {t("examDetail.viewFile")}
                                                        </a>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: PENGATURAN */}
            {activeTab === "pengaturan" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl">
                    <h2 className="text-lg font-bold text-[#0D1B2A] flex items-center gap-2 border-b pb-4 mb-6"><Settings size={20} className="text-purple-600"/> {t("examDetail.editDetail")}</h2>
                    <form onSubmit={handleEditExam} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">{t("teacherExams.formTitle")}</label>
                            <input type="text" required value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">{t("teacherExams.formDesc")}</label>
                            <textarea rows={3} value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 resize-none" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5 flex items-center gap-2">{t("teacherExams.formLimit")}</label>
                                <input type="number" min={1} value={editForm.max_attempts} onChange={e => setEditForm(p => ({ ...p, max_attempts: parseInt(e.target.value) || 1 }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5 flex items-center gap-2"><Clock size={14} className="text-purple-500" /> {t("teacherExams.start")}</label>
                                <input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 bg-white" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5 flex items-center gap-2"><Clock size={14} className="text-red-400" /> {t("teacherExams.end")}</label>
                                <input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500 bg-white" />
                            </div>
                        </div>
                        <div className="pt-6">
                            <button disabled={editLoading} type="submit" className="w-full py-3.5 rounded-xl font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex justify-center items-center gap-2">
                                <Save size={18} /> {t("examDetail.saveChanges")}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODALS */}
            {showBulkAdd && (
                <Modal title={t("examDetail.bulkModalTitle")} onClose={() => setShowBulkAdd(false)}>
                    <form onSubmit={handleBulkAddQuestion} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-1.5">{t("examDetail.bulkModalCount")}</label>
                            <input type="number" min={1} max={50} value={bulkCount} onChange={e => setBulkCount(parseInt(e.target.value) || 1)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-purple-500" />
                            <p className="text-xs text-gray-500 mt-2">{t("examDetail.bulkModalHelp")}</p>
                        </div>
                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setShowBulkAdd(false)} className="flex-1 py-3 items-center rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{t("examDetail.cancel")}</button>
                            <button type="submit" disabled={bulkLoading} className="flex-1 py-3 flex justify-center items-center rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50">
                                {t("examDetail.generateBtn")}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {showAddQ && (
                <Modal title={editingQuestionId ? t("examDetail.editQModalTitle") : t("examDetail.addQModalTitle")} onClose={() => setShowAddQ(false)} wide>
                    <form onSubmit={handleSaveQuestion} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#0D1B2A] mb-3">{t("examDetail.qTypeLabel")}</label>
                            <div className="grid grid-cols-3 gap-3">
                                {(["multiple_choice", "essay", "file_upload"] as QType[]).map((type) => {
                                    const typeLabel = type === "multiple_choice" ? t("examDetail.typeMc") : type === "essay" ? t("examDetail.typeEssay") : t("examDetail.typeUpload");
                                    return (
                                        <button key={type} type="button" onClick={() => setQType(type)}
                                            className={`flex flex-col items-center gap-2 py-4 rounded-xl border text-sm font-semibold transition-all ${qType === type ? "border-purple-400 bg-purple-50 text-purple-700 shadow-sm" : "border-gray-200 text-gray-500 hover:border-purple-200"}`}>
                                            {ICONS[type]} {typeLabel}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-1.5">
                                <label className="block text-sm font-semibold text-[#0D1B2A]">{t("examDetail.qTextLabel")}</label>
                                <label className="block text-sm font-semibold text-[#0D1B2A] flex items-center gap-2">{t("examDetail.pointsLabel")}
                                    <input type="number" min={1} max={100} value={qPoints} onChange={(e) => setQPoints(parseInt(e.target.value) || 1)} className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-center" />
                                </label>
                            </div>
                            <textarea required rows={4} placeholder={t("examDetail.qTextPlaceholder")} value={qText} onChange={(e) => setQText(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 resize-y" />
                        </div>

                        {qType === "multiple_choice" && (
                            <div className="space-y-3">
                                <label className="block text-sm font-semibold text-[#0D1B2A]">{t("examDetail.mcLabel")}</label>
                                {mcOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <button type="button" onClick={() => setMcOptions(prev => prev.map((o, idx) => ({ ...o, is_correct: idx === i })))}
                                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${opt.is_correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 text-transparent"}`}>
                                            <CheckSquare size={14} className={opt.is_correct ? "text-white" : "text-transparent"} />
                                        </button>
                                        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex justify-center items-center font-bold text-gray-500">{OPTION_LETTERS[i]}</div>
                                        <input type="text" placeholder={`${t("examDetail.optPlaceholder")} ${OPTION_LETTERS[i]}...`} value={opt.text} onChange={(e) => setMcOptions(prev => prev.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)))}
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500" />
                                        {mcOptions.length > 2 && (
                                            <button type="button" onClick={() => setMcOptions(prev => prev.filter((_, idx) => idx !== i))} className="w-8 h-8 flex justify-center items-center hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-300"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                ))}
                                {mcOptions.length < 5 && (
                                    <button type="button" onClick={() => setMcOptions(prev => [...prev, { text: "", is_correct: false }])} className="text-sm font-semibold text-purple-600 pl-[4.5rem] mt-2">{t("examDetail.addOptBtn")}</button>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-6 border-t border-gray-100">
                            <button type="button" onClick={() => setShowAddQ(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">{t("examDetail.cancel")}</button>
                            <button type="submit" disabled={addQLoading} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>{addQLoading ? t("examDetail.saving") : t("examDetail.saveQBtn")}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* IMPORT FROM BANK SOAL MODAL */}
            {showImportBank && (
                <Modal title={t("examDetail.importModalTitle")} onClose={() => setShowImportBank(false)}>
                    <div className="space-y-4">
                        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                                <Database size={13} /> {t("examDetail.importModalHelp")}
                            </p>
                        </div>
                        {loadingBanks ? (
                            <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
                        ) : banks.length === 0 ? (
                            <div className="text-center py-8 text-sm text-gray-400">
                                <Package size={32} className="mx-auto mb-2 text-gray-200" />
                                {t("examDetail.noBanks")}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {banks.map(bank => (
                                    <label key={bank.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${selectedBankId === bank.id ? "border-emerald-400 bg-emerald-50" : "border-gray-100 hover:border-gray-200 bg-white"}`}>
                                        <input type="radio" name="bank" checked={selectedBankId === bank.id} onChange={() => setSelectedBankId(bank.id)} className="accent-emerald-600" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-sm text-[#0D1B2A]">{bank.title}</p>
                                            {bank.description && <p className="text-xs text-gray-400 truncate">{bank.description}</p>}
                                        </div>
                                        <span className="text-xs text-gray-400 shrink-0">{bank.questions?.length ?? 0} {t("examDetail.tabQuestions").split(' ')[0]}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {importResult && (
                            <div className={`px-3 py-2.5 rounded-xl text-xs font-semibold ${importResult.startsWith("❌") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                                {importResult}
                            </div>
                        )}
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setShowImportBank(false)} className="px-4 py-2.5 text-sm text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50">{t("examDetail.closeBtn")}</button>
                            <button
                                onClick={handleImportBank}
                                disabled={!selectedBankId || importingBank}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                <Upload size={15} />
                                {importingBank ? t("examDetail.importing") : t("examDetail.importBtn")}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
}
