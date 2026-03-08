"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Save, Pin, Languages, Globe, Eye,
    Megaphone, Loader2, X,
} from "lucide-react";

const RichEditor = dynamic(() => import("@/components/RichEditor"), {
    ssr: false,
    loading: () => (
        <div className="flex items-center justify-center h-72 rounded-2xl border border-gray-200 bg-gray-50">
            <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
    ),
});

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

function LangTab({ active, lang, label, onClick }: { active: boolean; lang: string; label: string; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all ${active ? "bg-white text-[#006D77] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {lang === "id" ? <Globe size={13} /> : <Languages size={13} />}
            {label}
        </button>
    );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 w-full">
            <div className={`relative w-10 h-6 rounded-full transition-all ${checked ? "bg-[#006D77]" : "bg-gray-200"}`}>
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm text-gray-700 font-medium">{label}</span>
        </button>
    );
}

export default function EditAnnouncementPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [lang, setLang] = useState<"id" | "ja">("id");
    const [titleId, setTitleId] = useState("");
    const [titleJa, setTitleJa] = useState("");
    const [contentId, setContentId] = useState("");
    const [contentJa, setContentJa] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [role, setRole] = useState("student");
    const [token, setToken] = useState("");
    const [userId, setUserId] = useState(0);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setRole(localStorage.getItem("mori_role") ?? "student");
            setToken(localStorage.getItem("mori_token") ?? "");
            try { const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}"); setUserId(u.id ?? u.ID ?? 0); } catch { }
        }
    }, []);

    useEffect(() => {
        fetch(`${API_BASE}/announcements/${id}`)
            .then((r) => r.json())
            .then((j) => {
                const a = j.data;
                if (!a) { router.replace("/dashboard/announcements"); return; }
                setTitleId(a.title ?? "");
                setTitleJa(a.title_ja ?? "");
                setContentId(a.content ?? "");
                setContentJa(a.content_ja ?? "");
                setIsPinned(a.is_pinned ?? false);
            })
            .finally(() => setLoading(false));
    }, [id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titleId.trim()) { setError("Judul wajib diisi"); return; }
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/announcements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title: titleId, title_ja: titleJa,
                    content: contentId, content_ja: contentJa,
                }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan");
            router.push(`/dashboard/announcements/${id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error");
            setSaving(false);
        }
    };

    const wordCount = (contentId + contentJa).replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 size={24} className="animate-spin text-[#006D77]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F2F4F7]">
            {/* Sticky toolbar */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
                    <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#006D77] transition-colors font-medium">
                        <ArrowLeft size={15} /> Kembali
                    </button>

                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 truncate">
                        <Megaphone size={15} className="text-[#006D77] shrink-0" />
                        <span className="truncate">Edit: {titleId || "Pengumuman"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setPreviewMode(!previewMode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${previewMode ? "bg-purple-50 border-purple-200 text-purple-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                            <Eye size={13} />
                            {previewMode ? "Edit" : "Preview"}
                        </button>
                        <button type="submit" form="edit-form" disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white shadow-md shadow-[#006D77]/20 disabled:opacity-60 transition-all"
                            style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? "Menyimpan..." : "Simpan Perubahan"}
                        </button>
                    </div>
                </div>
            </div>

            <form id="edit-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {error && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600">
                        <X size={13} className="shrink-0" /> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Editor */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Language tabs */}
                        <div className="flex items-center gap-1 bg-gray-100/80 rounded-2xl p-1 self-start w-fit">
                            <LangTab active={lang === "id"} lang="id" label="Bahasa Indonesia" onClick={() => setLang("id")} />
                            <LangTab active={lang === "ja"} lang="ja" label="日本語" onClick={() => setLang("ja")} />
                        </div>

                        {/* Title */}
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                            <input type="text"
                                placeholder={lang === "id" ? "Judul pengumuman..." : "タイトルを入力してください..."}
                                value={lang === "id" ? titleId : titleJa}
                                onChange={(e) => lang === "id" ? setTitleId(e.target.value) : setTitleJa(e.target.value)}
                                className="w-full px-6 py-4 text-xl font-serif font-bold text-[#0D1B2A] placeholder-gray-200 focus:outline-none bg-transparent"
                            />
                            {lang === "id" && titleJa && (
                                <div className="px-6 pb-3 text-sm text-gray-400 flex items-center gap-1.5 border-t border-gray-50">
                                    <Languages size={11} /><span className="font-medium">{titleJa}</span>
                                </div>
                            )}
                            {lang === "ja" && titleId && (
                                <div className="px-6 pb-3 text-sm text-gray-400 flex items-center gap-1.5 border-t border-gray-50">
                                    <Globe size={11} /><span className="font-medium">{titleId}</span>
                                </div>
                            )}
                        </div>

                        {/* Editor / Preview */}
                        {previewMode ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-purple-50/50">
                                    <Eye size={13} className="text-purple-500" />
                                    <span className="text-xs font-semibold text-purple-600">Preview — {lang === "id" ? "Indonesia" : "日本語"}</span>
                                </div>
                                <div className="px-8 py-6 rich-content min-h-64"
                                    dangerouslySetInnerHTML={{ __html: lang === "id" ? (contentId || "<p class='text-gray-300'>Belum ada konten</p>") : (contentJa || "<p class='text-gray-300'>コンテンツなし</p>") }} />
                            </div>
                        ) : (
                            <RichEditor
                                key={lang}
                                value={lang === "id" ? contentId : contentJa}
                                onChange={lang === "id" ? setContentId : setContentJa}
                                placeholder={lang === "id" ? "Tulis isi pengumuman di sini..." : "ここにお知らせの内容を入力してください..."}
                                minHeight="400px"
                            />
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Ctrl+B bold · Ctrl+I italic · Ctrl+U underline</span>
                            <span>{wordCount} kata</span>
                        </div>
                    </div>

                    {/* Settings panel */}
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pengaturan</p>
                            </div>
                            <div className="p-5 space-y-5">
                                {role === "admin" && (
                                    <>
                                        <ToggleSwitch checked={isPinned} onChange={setIsPinned} label="Sematkan di atas" />
                                        {isPinned && <p className="text-xs text-amber-600 flex items-center gap-1"><Pin size={10} /> Muncul paling atas</p>}
                                        <div className="h-px bg-gray-100" />
                                    </>
                                )}
                                <button type="submit" form="edit-form" disabled={saving}
                                    className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-md disabled:opacity-60 transition-all hover:-translate-y-0.5"
                                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}>
                                    {saving ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Menyimpan...</span> : "💾 Simpan Perubahan"}
                                </button>
                            </div>
                        </div>

                        {/* Bilingual status */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Bilingual</p>
                            </div>
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm"><Globe size={13} className="text-[#006D77]" /><span className="font-medium text-gray-700">Bahasa Indonesia</span></div>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${titleId && contentId.replace(/<[^>]*>/g, "").trim() ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                                        {titleId && contentId.replace(/<[^>]*>/g, "").trim() ? "✓" : "—"}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm"><Languages size={13} className="text-purple-500" /><span className="font-medium text-gray-700">日本語</span><span className="text-[10px] text-gray-400">任意</span></div>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${titleJa && contentJa.replace(/<[^>]*>/g, "").trim() ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                                        {titleJa && contentJa.replace(/<[^>]*>/g, "").trim() ? "✓" : "○"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
