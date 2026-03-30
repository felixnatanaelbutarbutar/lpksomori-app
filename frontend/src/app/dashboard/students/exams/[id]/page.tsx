"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, CheckSquare, AlignLeft, Paperclip, Upload, ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import Swal from "sweetalert2";

const API = "http://localhost:8080/api/v1";

interface McOption { text: string; is_correct: boolean; }

interface ExamQuestion {
    id: number;
    question_type: "multiple_choice" | "essay" | "file_upload";
    text: string;
    points: number;
    options: string | McOption[];
}

interface Exam {
    id: number;
    title: string;
    description: string;
    start_time: string | null;
    end_time: string | null;
    questions?: ExamQuestion[];
}

// Map question ID to string (for essay/mcq) or File (for file_upload)
type AnswersState = Record<number, { text?: string, file?: File }>;

export default function StudentExamPage() {
    const router = useRouter();
    const { id } = useParams();
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<AnswersState>({});
    const [submitting, setSubmitting] = useState(false);
    const [isDone, setIsDone] = useState(false);
    const [scoreData, setScoreData] = useState<{total_score: number, max_score: number, score_100: number} | null>(null);

    useEffect(() => {
        if (!token || !id) return;
        setLoading(true);
        fetch(`${API}/exams/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => {
                if (j.data) setExam(j.data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [id, token]);

    const handleAnswerChange = (qId: number, val: { text?: string, file?: File }) => {
        setAnswers(prev => ({ ...prev, [qId]: { ...prev[qId], ...val } }));
    };

    const handleSubmit = async () => {
        const res = await Swal.fire({
            title: "Kumpulkan Ujian?",
            html: "<p>Pastikan semua soal sudah dijawab.<br/>Setelah dikumpulkan, <b>jawaban tidak bisa diubah lagi</b>.</p>",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#006D77",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Ya, Kumpulkan! 🚀",
            cancelButtonText: "Cek Dulu"
        });
        if (!res.isConfirmed) return;
        setSubmitting(true);
        try {
            for (const q of (exam?.questions || [])) {
                const ans = answers[q.id];
                if (!ans && q.question_type !== 'file_upload') continue;

                const form = new FormData();
                form.append("answer_text", ans?.text || "");
                if (ans?.file) form.append("file", ans.file);

                await fetch(`${API}/exams/questions/${q.id}/answers`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                    body: form
                });
            }

            // After all answers submitted, finalize the attempt
            const res = await fetch(`${API}/exams/${id}/submit`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                setScoreData(json);
            }

            setIsDone(true);
        } catch (err) {
            Swal.fire({
                title: "Terjadi Kesalahan!",
                text: "Gagal mengumpulkan jawaban. Pastikan koneksimu stabil dan coba lagi.",
                icon: "error",
                confirmButtonColor: "#006D77"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        if (!exam?.end_time) return;
        const iv = setInterval(() => {
            const end = new Date(exam.end_time!).getTime();
            const now = Date.now();
            const diff = end - now;
            if (diff <= 0) {
                setTimeLeft("Waktu Habis!");
                clearInterval(iv);
            } else {
                const h = Math.floor(diff / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${h}j ${m}m ${s}s`);
            }
        }, 1000);
        return () => clearInterval(iv);
    }, [exam]);

    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full" /></div>;
    if (!exam) return <div className="p-10 text-center">Ujian tidak ditemukan.</div>;

    if (isDone) {
        return (
            <div className="max-w-2xl mx-auto py-20 text-center space-y-4">
                <CheckCircle2 size={80} className="text-emerald-500 mx-auto" />
                <h1 className="text-3xl font-bold text-[#0D1B2A]">Selesai!</h1>
                <p className="text-gray-500">Jawaban Anda berhasil dikirim.</p>
                {scoreData && (
                    <div className="bg-white border-2 border-emerald-100 shadow-md rounded-2xl p-6 mt-6 inline-block text-center space-y-2">
                        <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Nilai Pilihan Ganda Anda</p>
                        <h2 className="text-5xl font-black text-[#0D1B2A]">{scoreData.score_100.toFixed(0)}</h2>
                        <p className="text-sm text-gray-400 font-medium">({scoreData.total_score} benar dari total {scoreData.max_score} poin opsional)</p>
                        <p className="text-xs text-amber-500 mt-2 italic">*Nilai essay/upload akan menyusul setelah dinilai guru</p>
                    </div>
                )}
                <div className="pt-6">
                    <button onClick={() => router.push("/dashboard/students/dashboard")} className="px-6 py-3 rounded-xl bg-[#0D1B2A] text-white font-semibold hover:bg-[#1a2a3a]">
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-700 transition-colors mb-2">
                <ChevronLeft size={16} /> Kembali
            </button>

            <div className="bg-[#1a0f2e] rounded-3xl p-8 relative overflow-hidden shadow-lg border border-purple-900/30">
                <div className="relative z-10 flex flex-col md:flex-row gap-6 justify-between items-start">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">{exam.title}</h1>
                        <p className="text-white/70 max-w-2xl text-sm leading-relaxed">{exam.description || "Selamat mengerjakan. Kerjakan dengan jujur."}</p>
                    </div>
                    {(exam.start_time || exam.end_time) && (
                        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0 text-white flex flex-col gap-2 min-w-[200px]">
                            {exam.start_time && <div className="flex items-center gap-2 text-xs"><Clock size={14} className="text-purple-300" /> Mulai: {new Date(exam.start_time).toLocaleString("id-ID")}</div>}
                            {exam.end_time && (
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs text-red-300"><Clock size={14} /> Selesai: {new Date(exam.end_time).toLocaleString("id-ID")}</div>
                                    {timeLeft && <div className="text-xl font-mono font-bold text-red-400 mt-1">{timeLeft} tersisa</div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-10 pointer-events-none"><AlignLeft size={200} /></div>
            </div>

            <div className="space-y-6">
                {(exam.questions || []).map((q, i) => {
                    const opts: McOption[] = (() => {
                        if (!q.options) return [];
                        if (typeof q.options === "string") {
                            try { return JSON.parse(q.options); } catch { return []; }
                        }
                        return q.options as McOption[];
                    })();
                    return (
                        <div key={q.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8 relative">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-100 rounded-l-2xl" />
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-lg shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex gap-2 items-center mb-3">
                                        <span className="text-xs font-bold px-2 py-0.5 rounded border border-gray-100 bg-gray-50 text-gray-500 uppercase tracking-wider">{q.points} Poin</span>
                                        <span className="text-xs font-bold text-purple-400 capitalize flex items-center gap-1">{q.question_type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="text-lg text-[#0D1B2A] font-medium leading-relaxed whitespace-pre-wrap mb-6">
                                        {q.text}
                                    </div>

                                    {/* Multiple Choice Map */}
                                    {q.question_type === 'multiple_choice' && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {opts.map((opt, oi) => {
                                                const isSelected = answers[q.id]?.text === opt.text;
                                                return (
                                                    <label key={oi} className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? "border-purple-600 bg-purple-50" : "border-gray-100 hover:border-purple-200"}`}>
                                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-purple-600" : "border-gray-300"}`}>
                                                            {isSelected && <div className="w-3 h-3 bg-purple-600 rounded-full" />}
                                                        </div>
                                                        <span className={`text-base font-medium ${isSelected ? "text-purple-900" : "text-gray-700"}`}>{opt.text}</span>
                                                        <input type="radio" name={`q_${q.id}`} className="hidden" checked={isSelected} onChange={() => handleAnswerChange(q.id, { text: opt.text })} />
                                                    </label>
                                                )
                                            })}
                                        </div>
                                    )}

                                    {/* Essay Map */}
                                    {q.question_type === 'essay' && (
                                        <textarea rows={5} value={answers[q.id]?.text || ""} onChange={e => handleAnswerChange(q.id, { text: e.target.value })} placeholder="Ketik jawaban Anda di sini..."
                                            className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-gray-700 bg-gray-50 focus:bg-white transition-colors resize-y" />
                                    )}

                                    {/* File Upload Map */}
                                    {q.question_type === 'file_upload' && (
                                        <label className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all bg-gray-50 hover:bg-white group ${answers[q.id]?.file ? "border-purple-500" : "border-gray-200 hover:border-purple-400"}`}>
                                            <Upload size={32} className={`${answers[q.id]?.file ? "text-purple-500" : "text-gray-400 group-hover:text-purple-400"} mb-3 transition-colors`} />
                                            <span className="text-sm font-semibold text-gray-700">{answers[q.id]?.file ? answers[q.id]?.file?.name : "Pilih File"}</span>
                                            <input type="file" className="hidden" onChange={e => handleAnswerChange(q.id, { file: e.target.files?.[0] ?? undefined })} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                <div className="pt-8 flex justify-end">
                    <button onClick={handleSubmit} disabled={submitting} className="flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-bold text-white transition-opacity disabled:opacity-50 shadow-xl shadow-purple-500/20" style={{ background: "linear-gradient(135deg, #7B5EA7, #5a3d85)" }}>
                        {submitting ? "Memproses..." : <><Send size={20} /> Kumpulkan Semua Jawaban</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
