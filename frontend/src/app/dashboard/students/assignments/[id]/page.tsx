"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link2, Clock, CheckCircle2, ChevronLeft, Upload, Paperclip, AlertCircle } from "lucide-react";

const API = "http://localhost:8080/api/v1";
const FILE_HOST = "http://localhost:8080";

interface Assignment {
    id: number;
    title: string;
    description: string;
    file_url: string;
    due_date: string | null;
    course: { name: string };
}

interface Submission {
    id: number;
    file_url: string;
    note: string;
    grade: number | null;
    feedback: string;
    submitted_at: string;
}

export default function StudentAssignmentPage() {
    const router = useRouter();
    const { id } = useParams();
    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const [assignment, setAssignment] = useState<Assignment | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null);
    const [loading, setLoading] = useState(true);

    const [note, setNote] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token || !id) return;
        setLoading(true);

        // Fetch Assignment
        fetch(`${API}/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => {
                if (j.data) setAssignment(j.data);
            })
            .catch(() => { });

        // Need to fetch user's own submission. The teacher checks all submissions, student lacks an endpoint to just fetch their own easily unless we use a new one. 
        // Wait, let's create a specialized `/student/assignments/:id/submission` endpoint or just pass student ID.
        // Actually, I'll add `GET /assignments/:id/my_submission`
    }, [id, token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const form = new FormData();
            if (file) form.append("file", file);
            form.append("note", note);

            const res = await fetch(`${API}/assignments/${id}/submissions`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal mengumpulkan tugas");

            setSubmission(json.data);
            alert("Berhasil mengumpulkan tugas!");
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // Temporarily fetching my submission right now by querying all and filtering (if admin allows, actually student can't access `/submissions`)
    // Wait, I will use a separate fetch. Let's fix main.go in the next step to add `/my_submission`. 
    useEffect(() => {
        if (!token || !id) return;
        fetch(`${API}/assignments/${id}/my_submission`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => {
                if (j.data) {
                    setSubmission(j.data);
                    setNote(j.data.note || "");
                }
            }).finally(() => setLoading(false));
    }, [id, token]);


    if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#006D77] border-t-transparent rounded-full" /></div>;
    if (!assignment) return <div className="p-10 text-center">Tugas tidak ditemukan.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <button onClick={() => router.push("/dashboard/students/dashboard")} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#006D77] transition-colors mb-2">
                <ChevronLeft size={16} /> Kembali ke Dashboard
            </button>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 md:p-10 bg-gradient-to-br from-[#f8fafc] to-[#f1f5f9] border-b border-gray-100">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
                        Tugas • {assignment.course?.name || "Mata Pelajaran"}
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#0D1B2A] mb-3">{assignment.title}</h1>
                    {assignment.due_date && (
                        <div className="flex items-center gap-2 text-red-600 font-semibold text-sm">
                            <Clock size={16} /> Tenggat: {new Date(assignment.due_date).toLocaleString("id-ID")}
                        </div>
                    )}
                </div>

                <div className="p-8 md:p-10 space-y-8">
                    <div>
                        <h3 className="text-lg font-bold text-[#0D1B2A] mb-3">Instruksi Guru</h3>
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {assignment.description || "Tidak ada detail instruksi."}
                        </div>
                        {assignment.file_url && (
                            <div className="mt-4">
                                <a href={`${FILE_HOST}${assignment.file_url}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors">
                                    <Paperclip size={18} /> Unduh File Lampiran Guru
                                </a>
                            </div>
                        )}
                    </div>

                    <hr className="border-gray-100" />

                    <div>
                        <h3 className="text-lg font-bold text-[#0D1B2A] mb-4">Pengumpulan Anda</h3>

                        {submission?.grade !== null && submission !== null ? (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-emerald-900">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                    <div>
                                        <p className="font-bold text-lg">Sudah Dinilai!</p>
                                        <p className="text-sm opacity-80">Nilai akhir Anda adalah:</p>
                                    </div>
                                    <div className="ml-auto text-4xl font-black">{submission.grade}</div>
                                </div>
                                {submission.feedback && (
                                    <div className="bg-white/60 p-4 rounded-xl text-sm italic border border-emerald-200/50">
                                        "{submission.feedback}"
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-sm"><AlertCircle size={16} />{error}</div>}
                                {submission && <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-semibold mb-2"><CheckCircle2 size={16} /> Anda sudah mengumpulkan. Submit ulang akan menimpa jawaban lama.</div>}

                                <div>
                                    <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Upload File Jawaban {submission?.file_url && "(Kosongkan jika tidak ingin mengubah file lama)"}</label>
                                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-[#006D77] transition-all bg-gray-50 hover:bg-white group">
                                        <Upload size={32} className="text-gray-400 group-hover:text-[#006D77] mb-3 transition-colors" />
                                        <span className="text-sm font-medium text-gray-700">{file ? file.name : "Klik atau seret file ke sini"}</span>
                                        {submission?.file_url && !file && (
                                            <span className="text-xs text-[#006D77] mt-2 underline">Anda sebelumnya sudah mengupload file.</span>
                                        )}
                                        <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[#0D1B2A] mb-2">Catatan Tambahan (Opsional)</label>
                                    <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Tulis catatan untuk guru..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-[#006D77] text-sm resize-none"></textarea>
                                </div>
                                <button type="submit" disabled={submitting} className="w-full py-4 rounded-xl font-bold text-white transition-opacity disabled:opacity-50" style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                                    {submitting ? "Mengirim..." : (submission ? "Resubmit Perubahan" : "Kumpulkan Tugas")}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
