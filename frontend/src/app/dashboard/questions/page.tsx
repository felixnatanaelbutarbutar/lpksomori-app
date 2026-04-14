"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Database, Plus, Trash2, X, ChevronLeft, Edit3,
    CheckSquare, AlignLeft, Paperclip, BookOpen, Upload,
    Package, FileText, Search, ChevronRight
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const API = "http://localhost:8080/api/v1";

interface Creator { id: number; name: string; }

interface BankQuestion {
    id: number;
    bank_id: number;
    order_num: number;
    question_type: "multiple_choice" | "essay" | "file_upload";
    text: string;
    points: number;
    options: Array<{ text: string; is_correct: boolean }> | null;
}

interface QuestionBank {
    id: number;
    title: string;
    description: string;
    creator_id: number | null;
    creator?: Creator;
    created_at: string;
    updated_at: string;
    questions: BankQuestion[];
}

interface Exam { id: number; title: string; class_id: number; }
interface ClassModel { id: number; name: string; }

// Note: TYPE_CFG is now dynamic and defined in render (or passed via context) to support t()
type QType = "multiple_choice" | "essay" | "file_upload";
const TYPE_COLORS: Record<string, string> = {
    multiple_choice: "bg-blue-50 text-blue-600 border-blue-100 border",
    essay: "bg-purple-50 text-purple-600 border-purple-100 border",
    file_upload: "bg-amber-50 text-amber-600 border-amber-100 border"
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
    multiple_choice: <CheckSquare size={13} />,
    essay: <AlignLeft size={13} />,
    file_upload: <Paperclip size={13} />
};

const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

// ─── Modal Shell ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
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

// ─── McOptionsEditor ──────────────────────────────────────────────────────────
function McOptionsEditor({ options, onChange, optPh, trueLabel, falseLabel, addBtnLabel }: {
    options: Array<{ text: string; is_correct: boolean }>;
    onChange: (opts: Array<{ text: string; is_correct: boolean }>) => void;
    optPh: string; trueLabel: string; falseLabel: string; addBtnLabel: string;
}) {
    const set = (i: number, key: "text" | "is_correct", val: string | boolean) => {
        const next = options.map((o, j) => j === i ? { ...o, [key]: val } : (key === "is_correct" && val ? { ...o, is_correct: false } : o));
        onChange(next);
    };
    const add = () => onChange([...options, { text: "", is_correct: false }]);
    const remove = (i: number) => onChange(options.filter((_, j) => j !== i));
    return (
        <div className="space-y-2">
            {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">{OPTION_LETTERS[i]}</span>
                    <input
                        className="flex-1 px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white transition-colors"
                        placeholder={`${optPh}${OPTION_LETTERS[i]}`}
                        value={o.text}
                        onChange={e => set(i, "text", e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => set(i, "is_correct", !o.is_correct)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap ${o.is_correct ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"}`}
                    >
                        {o.is_correct ? trueLabel : falseLabel}
                    </button>
                    <button type="button" onClick={() => remove(i)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                        <X size={13} />
                    </button>
                </div>
            ))}
            {options.length < 5 && (
                <button type="button" onClick={add} className="text-[11px] font-semibold text-[#006D77] hover:underline mt-1">
                    {addBtnLabel}
                </button>
            )}
        </div>
    );
}

export default function QuestionBankPage() {
    const { t } = useLanguage();
    // We pass translation strings to McOptionsEditor via closure, or we redefine it inside but we can just use another approach to inject labels if it's already defined outside. Wait, McOptionsEditor is outside! 
    // Let's bring McOptionsEditor inside component so it has access to `t`, or pass labels to it. I'll pass labels to it.
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    // ── State ──────────────────────────────────────────────────────────────────
    const [banks, setBanks]           = useState<QuestionBank[]>([]);
    const [loading, setLoading]       = useState(true);
    const [search, setSearch]         = useState("");
    const [selectedBank, setSelectedBank] = useState<QuestionBank | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Bank modals
    const [showCreateBank, setShowCreateBank]   = useState(false);
    const [bankForm, setBankForm]               = useState({ title: "", description: "" });
    const [bankFormLoading, setBankFormLoading] = useState(false);
    const [bankFormError, setBankFormError]     = useState("");
    const [editBank, setEditBank]               = useState<QuestionBank | null>(null);
    const [deleteBankId, setDeleteBankId]       = useState<number | null>(null);

    // Question modals
    const [showAddQ, setShowAddQ]     = useState(false);
    const [editQ, setEditQ]           = useState<BankQuestion | null>(null);
    const [deleteQId, setDeleteQId]   = useState<number | null>(null);
    const [qForm, setQForm]           = useState({
        question_type: "multiple_choice" as BankQuestion["question_type"],
        text: "",
        points: 1,
        options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }],
    });
    const [qFormLoading, setQFormLoading] = useState(false);
    const [qFormError, setQFormError]     = useState("");

    // Import modal
    const [showImport, setShowImport]       = useState(false);
    const [classes, setClasses]             = useState<ClassModel[]>([]);
    const [selectedImportClass, setSelectedImportClass] = useState<number | null>(null);
    const [exams, setExams]                 = useState<Exam[]>([]);
    const [selectedImportExam, setSelectedImportExam] = useState<number | null>(null);
    const [loadingExams, setLoadingExams]   = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importSuccess, setImportSuccess] = useState("");

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchBanks = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch(`${API}/question-banks`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await r.json();
            setBanks(j.data ?? []);
        } finally { setLoading(false); }
    }, [token]);

    const fetchBankDetail = useCallback(async (id: number) => {
        setLoadingDetail(true);
        try {
            const r = await fetch(`${API}/question-banks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await r.json();
            setSelectedBank(j.data ?? null);
        } finally { setLoadingDetail(false); }
    }, [token]);

    useEffect(() => { fetchBanks(); }, [fetchBanks]);

    // ── Bank CRUD ──────────────────────────────────────────────────────────────
    const handleCreateBank = async (e: React.FormEvent) => {
        e.preventDefault();
        setBankFormLoading(true); setBankFormError("");
        try {
            const r = await fetch(`${API}/question-banks`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(bankForm),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal membuat bank soal");
            setShowCreateBank(false);
            setBankForm({ title: "", description: "" });
            fetchBanks();
        } catch (err: unknown) {
            setBankFormError(err instanceof Error ? err.message : "Error");
        } finally { setBankFormLoading(false); }
    };

    const handleEditBank = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editBank) return;
        setBankFormLoading(true); setBankFormError("");
        try {
            const r = await fetch(`${API}/question-banks/${editBank.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: bankForm.title, description: bankForm.description }),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal mengupdate bank soal");
            setEditBank(null);
            fetchBanks();
            if (selectedBank?.id === editBank.id) fetchBankDetail(editBank.id);
        } catch (err: unknown) {
            setBankFormError(err instanceof Error ? err.message : "Error");
        } finally { setBankFormLoading(false); }
    };

    const handleDeleteBank = async () => {
        if (!deleteBankId) return;
        await fetch(`${API}/question-banks/${deleteBankId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setDeleteBankId(null);
        if (selectedBank?.id === deleteBankId) setSelectedBank(null);
        fetchBanks();
    };

    // ── Question CRUD ──────────────────────────────────────────────────────────
    const openAddQ = () => {
        setQForm({ question_type: "multiple_choice", text: "", points: 1, options: [{ text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }, { text: "", is_correct: false }] });
        setQFormError(""); setShowAddQ(true);
    };

    const openEditQ = (q: BankQuestion) => {
        setQForm({
            question_type: q.question_type,
            text: q.text,
            points: q.points,
            options: q.options ?? [{ text: "", is_correct: false }, { text: "", is_correct: false }],
        });
        setQFormError(""); setEditQ(q);
    };

    const buildPayload = () => {
        const payload: Record<string, unknown> = {
            question_type: qForm.question_type,
            text: qForm.text.trim(),
            points: qForm.points,
        };
        if (qForm.question_type === "multiple_choice") {
            payload.options = qForm.options.filter(o => o.text.trim());
        }
        return payload;
    };

    const handleAddQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBank) return;
        setQFormLoading(true); setQFormError("");
        try {
            const r = await fetch(`${API}/question-banks/${selectedBank.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(buildPayload()),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal menambah soal");
            setShowAddQ(false);
            fetchBankDetail(selectedBank.id);
            fetchBanks();
        } catch (err: unknown) {
            setQFormError(err instanceof Error ? err.message : "Error");
        } finally { setQFormLoading(false); }
    };

    const handleEditQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editQ) return;
        setQFormLoading(true); setQFormError("");
        try {
            const r = await fetch(`${API}/question-banks/questions/${editQ.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(buildPayload()),
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal mengupdate soal");
            setEditQ(null);
            if (selectedBank) fetchBankDetail(selectedBank.id);
        } catch (err: unknown) {
            setQFormError(err instanceof Error ? err.message : "Error");
        } finally { setQFormLoading(false); }
    };

    const handleDeleteQ = async () => {
        if (!deleteQId || !selectedBank) return;
        await fetch(`${API}/question-banks/questions/${deleteQId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
        setDeleteQId(null);
        fetchBankDetail(selectedBank.id);
        fetchBanks();
    };

    // ── Import ─────────────────────────────────────────────────────────────────
    const openImport = async () => {
        setImportSuccess(""); setSelectedImportClass(null); setSelectedImportExam(null); setExams([]);
        setShowImport(true);
        const r = await fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json();
        setClasses(j.data ?? []);
    };

    const fetchExamsForClass = async (classId: number) => {
        setLoadingExams(true); setSelectedImportExam(null); setExams([]);
        try {
            const r = await fetch(`${API}/exams?class_id=${classId}`, { headers: { Authorization: `Bearer ${token}` } });
            const j = await r.json();
            setExams(j.data ?? []);
        } finally { setLoadingExams(false); }
    };

    const handleImport = async () => {
        if (!selectedBank || !selectedImportExam) return;
        setImportLoading(true); setImportSuccess("");
        try {
            const r = await fetch(`${API}/question-banks/${selectedBank.id}/import-to-exam/${selectedImportExam}`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
            const j = await r.json();
            if (!r.ok) throw new Error(j.error ?? "Gagal mengimpor");
            setImportSuccess(j.message ?? "Berhasil diimpor!");
        } catch (err: unknown) {
            setImportSuccess("❌ " + (err instanceof Error ? err.message : "Error"));
        } finally { setImportLoading(false); }
    };

    // ── Filter ─────────────────────────────────────────────────────────────────
    const filtered = banks.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

    // ── Question Form ──────────────────────────────────────────────────────────
    const QForm = ({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) => (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.qTypeLabel")}</label>
                <div className="grid grid-cols-3 gap-2">
                    {(["multiple_choice", "essay", "file_upload"] as QType[]).map(type => {
                        const typeLabel = type === "multiple_choice" ? t("questionBank.typeMc") : type === "essay" ? t("questionBank.typeEssay") : t("questionBank.typeUpload");
                        return (
                            <button
                                key={type} type="button"
                                onClick={() => setQForm(f => ({ ...f, question_type: type }))}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-bold transition-all ${qForm.question_type === type ? "border-[#006D77] bg-[#006D77]/5 text-[#006D77]" : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200"}`}
                            >
                                {TYPE_ICONS[type]}
                                <span className="text-[10px]">{typeLabel}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.qTextLabel")}</label>
                <textarea
                    required rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white transition-colors resize-none"
                    placeholder={t("questionBank.qTextPh")}
                    value={qForm.text}
                    onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
                />
            </div>
            {qForm.question_type === "multiple_choice" && (
                <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.mcLabel")}</label>
                    <McOptionsEditor options={qForm.options} onChange={opts => setQForm(f => ({ ...f, options: opts }))} 
                        optPh={t("questionBank.mcOptPh")} trueLabel={t("questionBank.btnTrue")} falseLabel={t("questionBank.btnFalse")} addBtnLabel={t("questionBank.addOptBtn")}
                    />
                </div>
            )}
            <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.pointsLabel")}</label>
                <input
                    type="number" min={1} max={100}
                    className="w-24 px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white transition-colors"
                    value={qForm.points}
                    onChange={e => setQForm(f => ({ ...f, points: parseInt(e.target.value) || 1 }))}
                />
            </div>
            {qFormError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{qFormError}</p>}
            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddQ(false); setEditQ(null); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t("questionBank.cancel")}</button>
                <button type="submit" disabled={qFormLoading}
                    className="px-5 py-2.5 bg-[#006D77] text-white text-sm font-bold rounded-xl hover:bg-[#005f68] disabled:opacity-50 transition-colors">
                    {qFormLoading ? t("questionBank.saving") : (isEdit ? t("questionBank.saveQBtn") : t("questionBank.createQBtn"))}
                </button>
            </div>
        </form>
    );

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* ── HEADER ── */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <Database size={20} />
                        </div>
                        {t("questionBank.title")}
                    </h1>
                    <p className="text-sm text-gray-400">{t("questionBank.subtitle")}</p>
                </div>
                <button
                    onClick={() => { setBankForm({ title: "", description: "" }); setBankFormError(""); setShowCreateBank(true); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-[#006D77]/20 hover:scale-105 active:scale-95 transition-all bg-[#006D77] shrink-0"
                >
                    <Plus size={18} /> {t("questionBank.createBankBtn")}
                </button>
            </div>

            {/* ── BODY ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* LEFT: Bank List */}
                <div className="lg:col-span-1 space-y-3">
                    {/* Search */}
                    <div className="relative">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                        <input
                            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl bg-white focus:outline-none focus:border-[#006D77] transition-colors"
                            placeholder={t("questionBank.searchPlaceholder")}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center py-12"><div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-2">
                                <Package size={32} className="text-gray-200" />
                                <p className="text-sm text-gray-400 font-semibold">{t("questionBank.noBankTitle")}</p>
                                <p className="text-xs text-gray-300">{t("questionBank.noBankSub")}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {filtered.map(bank => (
                                    <div
                                        key={bank.id}
                                        onClick={() => fetchBankDetail(bank.id)}
                                        className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition-colors group ${selectedBank?.id === bank.id ? "bg-[#006D77]/5 border-l-2 border-[#006D77]" : "hover:bg-gray-50"}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedBank?.id === bank.id ? "bg-[#006D77] text-white" : "bg-gray-50 text-gray-400 group-hover:bg-[#006D77]/10 group-hover:text-[#006D77]"}`}>
                                            <Package size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm truncate ${selectedBank?.id === bank.id ? "text-[#006D77]" : "text-[#0D1B2A]"}`}>{bank.title}</p>
                                            <p className="text-[11px] text-gray-400">{bank.questions?.length ?? 0} {t("questionBank.questions")}</p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={e => { e.stopPropagation(); setBankForm({ title: bank.title, description: bank.description }); setBankFormError(""); setEditBank(bank); }}
                                                className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors"
                                            ><Edit3 size={13} /></button>
                                            <button
                                                onClick={e => { e.stopPropagation(); setDeleteBankId(bank.id); }}
                                                className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                                            ><Trash2 size={13} /></button>
                                        </div>
                                        <ChevronRight size={14} className={`shrink-0 transition-colors ${selectedBank?.id === bank.id ? "text-[#006D77]" : "text-gray-200"}`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: Bank Detail */}
                <div className="lg:col-span-2">
                    {!selectedBank ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-24 gap-3 text-center">
                            <Database size={44} className="text-gray-100" />
                            <p className="font-semibold text-gray-400">{t("questionBank.selectBankTitle")}</p>
                            <p className="text-xs text-gray-300 max-w-xs">{t("questionBank.selectBankSub")}</p>
                        </div>
                    ) : loadingDetail ? (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex justify-center py-24">
                            <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Detail Header */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <button onClick={() => setSelectedBank(null)} className="text-gray-300 hover:text-[#006D77] transition-colors lg:hidden">
                                            <ChevronLeft size={16} />
                                        </button>
                                        <h2 className="font-black text-lg text-[#0D1B2A]">{selectedBank.title}</h2>
                                    </div>
                                    {selectedBank.description && <p className="text-xs text-gray-400">{selectedBank.description}</p>}
                                    <p className="text-xs text-gray-300 mt-1">{selectedBank.questions?.length ?? 0} {t("questionBank.savedQuestions")}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={openImport}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
                                    >
                                        <Upload size={14} /> {t("questionBank.importToExamBtn")}
                                    </button>
                                    <button
                                        onClick={openAddQ}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-[#006D77] text-white font-bold text-xs rounded-xl hover:bg-[#005f68] transition-colors"
                                    >
                                        <Plus size={14} /> {t("questionBank.addQuestionBtn")}
                                    </button>
                                </div>
                            </div>

                            {/* Questions List */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {(selectedBank.questions?.length ?? 0) === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                                        <FileText size={36} className="text-gray-100" />
                                        <p className="font-semibold text-gray-400">{t("questionBank.noQuestions")}</p>
                                        <button onClick={openAddQ} className="text-xs font-bold text-[#006D77] hover:underline">{t("questionBank.addFirstQuestion")}</button>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {selectedBank.questions.map((q, i) => {
                                            const typeLabel = q.question_type === "multiple_choice" ? t("questionBank.typeMc") : q.question_type === "essay" ? t("questionBank.typeEssay") : t("questionBank.typeUpload");
                                            return (
                                                <div key={q.id} className="px-5 py-4 group hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-black text-gray-500 shrink-0 mt-0.5">{i + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${TYPE_COLORS[q.question_type]}`}>
                                                                    {TYPE_ICONS[q.question_type]} {typeLabel}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-medium">{q.points} {t("questionBank.points")}</span>
                                                            </div>
                                                            <p className="text-sm text-[#0D1B2A] font-medium leading-relaxed">{q.text}</p>
                                                            {q.question_type === "multiple_choice" && q.options && (
                                                                <div className="mt-2 space-y-1">
                                                                    {q.options.map((o, j) => (
                                                                        <div key={j} className={`flex items-center gap-2 text-xs py-1 px-2 rounded-lg ${o.is_correct ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-gray-500"}`}>
                                                                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[9px] font-black ${o.is_correct ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{OPTION_LETTERS[j]}</span>
                                                                            {o.text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                            <button onClick={() => openEditQ(q)} className="w-7 h-7 rounded-lg hover:bg-blue-50 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors">
                                                                <Edit3 size={13} />
                                                            </button>
                                                            <button onClick={() => setDeleteQId(q.id)} className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors">
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}

            {/* Create Bank */}
            {showCreateBank && (
                <Modal title={t("questionBank.createBankTitle")} onClose={() => setShowCreateBank(false)}>
                    <form onSubmit={handleCreateBank} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.bankNameLabel")}</label>
                            <input required className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white" placeholder={t("questionBank.bankNamePh")} value={bankForm.title} onChange={e => setBankForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.bankDescLabel")}</label>
                            <textarea rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white resize-none" placeholder={t("questionBank.bankDescPh")} value={bankForm.description} onChange={e => setBankForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        {bankFormError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{bankFormError}</p>}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowCreateBank(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t("questionBank.cancel")}</button>
                            <button type="submit" disabled={bankFormLoading} className="px-5 py-2.5 bg-[#006D77] text-white text-sm font-bold rounded-xl hover:bg-[#005f68] disabled:opacity-50">
                                {bankFormLoading ? t("questionBank.creating") : t("questionBank.createBtn")}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Bank */}
            {editBank && (
                <Modal title={t("questionBank.editBankTitle")} onClose={() => setEditBank(null)}>
                    <form onSubmit={handleEditBank} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.bankNameLabel")}</label>
                            <input required className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white" value={bankForm.title} onChange={e => setBankForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.bankDescLabel")}</label>
                            <textarea rows={3} className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white resize-none" value={bankForm.description} onChange={e => setBankForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        {bankFormError && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl">{bankFormError}</p>}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setEditBank(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t("questionBank.cancel")}</button>
                            <button type="submit" disabled={bankFormLoading} className="px-5 py-2.5 bg-[#006D77] text-white text-sm font-bold rounded-xl hover:bg-[#005f68] disabled:opacity-50">
                                {bankFormLoading ? t("questionBank.saving") : t("questionBank.saveBtn")}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Bank Confirm */}
            {deleteBankId && (
                <Modal title={t("questionBank.deleteBankTitle")} onClose={() => setDeleteBankId(null)}>
                    <div className="text-center space-y-4">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto"><Trash2 size={24} className="text-red-400" /></div>
                        <div>
                            <p className="font-semibold text-[#0D1B2A]">{t("questionBank.deleteBankConfirm")}</p>
                            <p className="text-sm text-gray-400 mt-1">{t("questionBank.deleteBankDesc")}</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setDeleteBankId(null)} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50">{t("questionBank.cancel")}</button>
                            <button onClick={handleDeleteBank} className="px-5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600">{t("questionBank.deleteBtn")}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Question */}
            {showAddQ && (
                <Modal title={t("questionBank.addQTitle")} onClose={() => setShowAddQ(false)} wide>
                    <QForm onSubmit={handleAddQ} />
                </Modal>
            )}

            {/* Edit Question */}
            {editQ && (
                <Modal title={t("questionBank.editQTitle")} onClose={() => setEditQ(null)} wide>
                    <QForm onSubmit={handleEditQ} isEdit />
                </Modal>
            )}

            {/* Delete Question Confirm */}
            {deleteQId && (
                <Modal title={t("questionBank.deleteQTitle")} onClose={() => setDeleteQId(null)}>
                    <div className="text-center space-y-4">
                        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto"><Trash2 size={24} className="text-red-400" /></div>
                        <div>
                            <p className="font-semibold text-[#0D1B2A]">{t("questionBank.deleteQConfirm")}</p>
                            <p className="text-sm text-gray-400 mt-1">{t("questionBank.deleteQDesc")}</p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button onClick={() => setDeleteQId(null)} className="px-5 py-2.5 text-sm text-gray-500 border border-gray-100 rounded-xl hover:bg-gray-50">{t("questionBank.cancel")}</button>
                            <button onClick={handleDeleteQ} className="px-5 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600">{t("questionBank.deleteBtn")}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Import to Exam */}
            {showImport && selectedBank && (
                <Modal title={`${t("questionBank.importModalTitle")} "${selectedBank.title}" ${t("questionBank.importModalTitleSub")}`} onClose={() => setShowImport(false)}>
                    <div className="space-y-4">
                        <div className="bg-[#006D77]/5 rounded-xl p-3 border border-[#006D77]/10">
                            <p className="text-xs text-[#006D77] font-semibold flex items-center gap-1.5">
                                <BookOpen size={13} /> {selectedBank.questions?.length ?? 0}{t("questionBank.importModalInfo")}
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.selectClass")}</label>
                            <select
                                className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-xl bg-gray-50 focus:outline-none focus:border-[#006D77] focus:bg-white"
                                value={selectedImportClass ?? ""}
                                onChange={e => { const v = parseInt(e.target.value); setSelectedImportClass(v); if (v) fetchExamsForClass(v); }}
                            >
                                <option value="">{t("questionBank.classPlaceholder")}</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {selectedImportClass && (
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">{t("questionBank.selectExam")}</label>
                                {loadingExams ? (
                                    <div className="flex justify-center py-4"><div className="w-4 h-4 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>
                                ) : exams.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-3">{t("questionBank.noExams")}</p>
                                ) : (
                                    <div className="space-y-2">
                                        {exams.map(exam => (
                                            <label key={exam.id} className={`flex items-center gap-3 px-3 py-3 rounded-xl border cursor-pointer transition-colors ${selectedImportExam === exam.id ? "border-[#006D77] bg-[#006D77]/5" : "border-gray-100 hover:border-gray-200"}`}>
                                                <input type="radio" name="exam" checked={selectedImportExam === exam.id} onChange={() => setSelectedImportExam(exam.id)} className="accent-[#006D77]" />
                                                <div>
                                                    <p className="text-sm font-semibold text-[#0D1B2A]">{exam.title}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {importSuccess && (
                            <div className={`px-3 py-2.5 rounded-xl text-xs font-semibold ${importSuccess.startsWith("❌") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                                {importSuccess}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t("questionBank.closeBtn")}</button>
                            <button
                                onClick={handleImport}
                                disabled={!selectedImportExam || importLoading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                                <Upload size={15} />
                                {importLoading ? t("questionBank.importing") : t("questionBank.importNow")}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
