"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
    ArrowLeft, Send, Pin, Eye,
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

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 w-full">
            <div
                className="relative w-10 h-6 rounded-full transition-all"
                style={{ background: checked ? "var(--accent)" : "var(--border)" }}
            >
                <span
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: checked ? "translateX(16px)" : "translateX(0)" }}
                />
            </div>
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </button>
    );
}

export default function NewAnnouncementPage() {
    const router = useRouter();
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [role, setRole] = useState("student");
    const [token, setToken] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const r = localStorage.getItem("mori_role") ?? "student";
            setRole(r);
            setToken(localStorage.getItem("mori_token") ?? "");
            if (r !== "admin" && r !== "teacher") router.replace("/dashboard/announcements");
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Judul pengumuman wajib diisi"); return; }
        const stripped = content.replace(/<[^>]*>/g, "").trim();
        if (!stripped) { setError("Isi pengumuman wajib diisi"); return; }
        setSaving(true);
        setError("");
        try {
            const res = await fetch(`${API_BASE}/announcements`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    title,
                    title_ja: "",     // Bahasa Jepang bisa diisi nanti melalui Edit
                    content,
                    content_ja: "",   // Bahasa Jepang bisa diisi nanti melalui Edit
                    is_pinned: isPinned,
                }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan");
            router.push("/dashboard/announcements");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error");
            setSaving(false);
        }
    };

    const wordCount = content.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;

    return (
        <div className="min-h-screen" style={{ background: "var(--bg-canvas)" }}>
            {/* ── Top toolbar ── */}
            <div
                className="sticky top-0 z-20 border-b"
                style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
            >
                <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
                    >
                        <ArrowLeft size={15} /> Kembali
                    </button>

                    <div className="flex items-center gap-2 text-sm font-semibold truncate" style={{ color: "var(--text-secondary)" }}>
                        <Megaphone size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
                        <span className="truncate">{title || "Pengumuman Baru"}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPreviewMode(!previewMode)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                            style={{
                                background: previewMode ? "#F5F0FF" : "transparent",
                                borderColor: previewMode ? "#C4B5FD" : "var(--border)",
                                color: previewMode ? "#7C3AED" : "var(--text-muted)",
                            }}
                        >
                            <Eye size={13} />
                            {previewMode ? "Edit" : "Preview"}
                        </button>
                        <button
                            type="submit"
                            form="ann-form"
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
                            style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(13,122,111,0.25)" }}
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {saving ? "Mengirim..." : "Kirim Pengumuman"}
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <form id="ann-form" onSubmit={handleSubmit} className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {error && (
                    <div
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
                        style={{ background: "var(--danger-bg)", border: "1px solid #F5C5C0", color: "var(--danger)" }}
                    >
                        <X size={13} className="shrink-0" /> {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Left: Editor ── */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Title */}
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                boxShadow: "var(--shadow-sm)",
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Judul pengumuman..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-6 py-4 text-xl font-bold focus:outline-none bg-transparent"
                                style={{
                                    fontFamily: "var(--font-serif)",
                                    color: "var(--text-primary)",
                                }}
                            />
                        </div>

                        {/* Rich editor / Preview */}
                        {previewMode ? (
                            <div
                                className="rounded-2xl overflow-hidden"
                                style={{
                                    background: "var(--bg-surface)",
                                    border: "1px solid var(--border)",
                                }}
                            >
                                <div
                                    className="flex items-center gap-2 px-6 py-3 border-b"
                                    style={{ background: "#F5F0FF", borderColor: "#C4B5FD" }}
                                >
                                    <Eye size={13} style={{ color: "#7C3AED" }} />
                                    <span className="text-xs font-semibold" style={{ color: "#7C3AED" }}>
                                        Mode Preview
                                    </span>
                                </div>
                                <div
                                    className="px-8 py-6 rich-content min-h-64"
                                    dangerouslySetInnerHTML={{
                                        __html: content || "<p class='text-gray-300'>Belum ada konten...</p>",
                                    }}
                                />
                            </div>
                        ) : (
                            <RichEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Tulis isi pengumuman di sini...&#10;&#10;Gunakan toolbar di atas untuk memformat teks: Bold, Italic, Heading, Daftar, dan lain-lain."
                                minHeight="400px"
                            />
                        )}

                        <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                            <span>Tips: Ctrl+B bold · Ctrl+I italic · Ctrl+U underline</span>
                            <span>{wordCount} kata</span>
                        </div>
                    </div>

                    {/* ── Right: Settings ── */}
                    <div className="space-y-4">
                        {/* Publish card */}
                        <div
                            className="rounded-2xl overflow-hidden"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                boxShadow: "var(--shadow-sm)",
                            }}
                        >
                            <div
                                className="px-5 py-3.5 border-b"
                                style={{ background: "var(--bg-subtle)", borderColor: "var(--border-subtle)" }}
                            >
                                <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--text-muted)" }}>
                                    Pengaturan Publikasi
                                </p>
                            </div>
                            <div className="p-5 space-y-5">
                                {/* Role badge */}
                                <div>
                                    <p className="text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>Dipublikasikan sebagai</p>
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                                        style={{
                                            background: role === "admin" ? "var(--accent-soft)" : "var(--gold-soft)",
                                            color: role === "admin" ? "var(--accent)" : "var(--gold)",
                                        }}
                                    >
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ background: role === "admin" ? "var(--accent)" : "var(--gold)" }}
                                        />
                                        {role === "admin" ? "Admin · 管理者" : "Guru · 先生"}
                                    </div>
                                </div>

                                <div className="h-px" style={{ background: "var(--border-subtle)" }} />

                                {/* Pin (admin only) */}
                                {role === "admin" && (
                                    <div>
                                        <ToggleSwitch
                                            checked={isPinned}
                                            onChange={setIsPinned}
                                            label="Sematkan di atas"
                                        />
                                        {isPinned && (
                                            <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "var(--gold)" }}>
                                                <Pin size={10} />
                                                Akan muncul paling atas
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    form="ann-form"
                                    disabled={saving}
                                    className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
                                    style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(13,122,111,0.2)" }}
                                >
                                    {saving ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <Loader2 size={14} className="animate-spin" /> Mengirim...
                                        </span>
                                    ) : "📣 Kirim Pengumuman"}
                                </button>
                                <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
                                    Notifikasi akan dikirim ke semua pengguna
                                </p>
                            </div>
                        </div>

                        {/* Tips card */}
                        <div
                            className="rounded-2xl p-5"
                            style={{
                                background: "var(--accent-soft)",
                                border: "1px solid var(--accent-border)",
                            }}
                        >
                            <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: "var(--accent)" }}>
                                💡 Tips
                            </p>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--accent)" }}>
                                Setelah pengumuman dipublikasikan, Anda dapat menambahkan <strong>terjemahan Bahasa Jepang (日本語)</strong> melalui tombol <strong>Edit</strong> di halaman detail.
                            </p>
                            <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--accent)" }}>
                                Pembaca dapat beralih antara Bahasa Indonesia dan 日本語 dengan satu klik.
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
