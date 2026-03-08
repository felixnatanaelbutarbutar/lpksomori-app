"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Pin,
    PinOff,
    Pencil,
    Trash2,
    X,
    Shield,
    BookOpen,
    Clock,
    Languages,
    Calendar,
    User,
    Globe,
    Megaphone,
    Sparkles,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface Creator {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Announcement {
    id: number;
    title: string;
    title_ja: string;
    content: string;
    content_ja: string;
    creator_id: number;
    creator: Creator;
    creator_role: string;
    is_pinned: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

const ROLE_CONFIG = {
    admin: {
        label: "Admin", labelJa: "管理者",
        gradient: "from-[#006D77] to-[#004f54]",
        accent: "#006D77", accentLight: "#006D7710",
        badge: "bg-[#006D77]/10 text-[#006D77] border-[#006D77]/20",
        headerBg: "from-[#006D77]/5 to-transparent",
        icon: Shield,
    },
    teacher: {
        label: "Guru", labelJa: "先生",
        gradient: "from-[#B45309] to-[#92400E]",
        accent: "#B45309", accentLight: "#FEF3C710",
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        headerBg: "from-amber-50 to-transparent",
        icon: BookOpen,
    },
};

function timeAgo(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "Baru saja";
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-4">
                <div className="flex items-start justify-between px-7 py-5 border-b border-gray-100">
                    <div>
                        <h3 className="font-bold text-[#0D1B2A] text-base">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors mt-0.5 ml-4 shrink-0">
                        <X size={15} className="text-gray-500" />
                    </button>
                </div>
                <div className="p-7 max-h-[75vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all placeholder:text-gray-300";
const textareaCls = `${inputCls} resize-none`;

function Field({ label, labelJa, required, children }: { label: string; labelJa?: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {label}
                {labelJa && <span className="text-gray-300 font-normal normal-case text-[11px]">{labelJa}</span>}
                {required && <span className="text-red-400">*</span>}
            </label>
            {children}
        </div>
    );
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium ${type === "success" ? "bg-emerald-600" : "bg-red-500"}`}>
            {type === "success" ? <Sparkles size={15} /> : <X size={15} />}
            {message}
        </div>
    );
}

export default function AnnouncementDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [ann, setAnn] = useState<Announcement | null>(null);
    const [loading, setLoading] = useState(true);
    const [langJa, setLangJa] = useState(false);
    const [role, setRole] = useState("student");
    const [userId, setUserId] = useState(0);
    const [token, setToken] = useState("");
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    // Edit state
    const [showEdit, setShowEdit] = useState(false);
    const [form, setForm] = useState({ title: "", title_ja: "", content: "", content_ja: "", is_pinned: false });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState("");

    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setRole(localStorage.getItem("mori_role") ?? "student");
            setToken(localStorage.getItem("mori_token") ?? "");
            try {
                const u = JSON.parse(localStorage.getItem("mori_user") ?? "{}");
                setUserId(u.id ?? u.ID ?? 0);
            } catch { }
        }
    }, []);

    useEffect(() => {
        fetch(`${API_BASE}/announcements/${id}`)
            .then((r) => r.json())
            .then((j) => setAnn(j.data ?? null))
            .catch(() => setAnn(null))
            .finally(() => setLoading(false));
    }, [id]);

    const refresh = async () => {
        const r = await fetch(`${API_BASE}/announcements/${id}`);
        const j = await r.json();
        setAnn(j.data ?? null);
    };

    const openEdit = () => {
        if (!ann) return;
        setForm({ title: ann.title, title_ja: ann.title_ja ?? "", content: ann.content, content_ja: ann.content_ja ?? "", is_pinned: ann.is_pinned });
        setFormError("");
        setShowEdit(true);
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError("");
        try {
            const res = await fetch(`${API_BASE}/announcements/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan");
            setShowEdit(false);
            setToast({ message: "Pengumuman berhasil diperbarui!", type: "success" });
            await refresh();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Error");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await fetch(`${API_BASE}/announcements/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });
            router.push("/dashboard/announcements");
        } catch {
            setToast({ message: "Gagal menghapus", type: "error" });
        }
    };

    const handleTogglePin = async () => {
        if (!ann) return;
        await fetch(`${API_BASE}/announcements/${id}/pin`, {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
        });
        await refresh();
        setToast({ message: ann.is_pinned ? "Sematan dilepas" : "Disematkan! 📌", type: "success" });
    };

    if (loading) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
                <div className="h-8 w-48 bg-gray-100 rounded-xl" />
                <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
                    <div className="h-8 w-3/4 bg-gray-100 rounded-xl" />
                    <div className="h-4 w-1/2 bg-gray-50 rounded" />
                    <div className="h-40 w-full bg-gray-50 rounded-xl" />
                </div>
            </div>
        );
    }

    if (!ann) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <Megaphone size={28} className="text-gray-200" />
                </div>
                <p className="text-gray-500 font-medium">Pengumuman tidak ditemukan</p>
                <button onClick={() => router.push("/dashboard/announcements")} className="text-[#006D77] text-sm hover:underline">
                    ← Kembali ke daftar
                </button>
            </div>
        );
    }

    const cfg = ROLE_CONFIG[ann.creator_role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.teacher;
    const RoleIcon = cfg.icon;
    const canEdit = role === "admin" || userId === ann.creator_id;
    const hasJa = !!(ann.title_ja || ann.content_ja);

    const displayTitle = langJa && ann.title_ja ? ann.title_ja : ann.title;
    const displayContent = langJa && ann.content_ja ? ann.content_ja : ann.content;

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Back + actions */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.push("/dashboard/announcements")}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#006D77] transition-colors font-medium"
                >
                    <ArrowLeft size={15} />
                    Kembali ke Pengumuman
                </button>

                {canEdit && (
                    <div className="flex items-center gap-2">
                        {role === "admin" && (
                            <button
                                onClick={handleTogglePin}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${ann.is_pinned ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100" : "bg-gray-50 border-gray-200 text-gray-500 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50"}`}
                            >
                                {ann.is_pinned ? <PinOff size={12} /> : <Pin size={12} />}
                                {ann.is_pinned ? "Lepas Sematan" : "Sematkan"}
                            </button>
                        )}
                        <button
                            onClick={openEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 border border-blue-100 text-blue-600 hover:bg-blue-100 transition-all"
                        >
                            <Pencil size={12} /> Edit
                        </button>
                        <button
                            onClick={() => setShowDelete(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 border border-red-100 text-red-500 hover:bg-red-100 transition-all"
                        >
                            <Trash2 size={12} /> Hapus
                        </button>
                    </div>
                )}
            </div>

            {/* Main card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Colored header band */}
                <div
                    className={`px-8 pt-8 pb-6 bg-gradient-to-br ${cfg.headerBg}`}
                    style={{ borderTop: `4px solid ${cfg.accent}` }}
                >
                    {/* Pinned badge */}
                    {ann.is_pinned && (
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-600 text-xs font-bold px-3 py-1 rounded-full mb-4">
                            <Pin size={11} />
                            Disematkan · ピン留め
                        </div>
                    )}

                    {/* Language toggle */}
                    {hasJa && (
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex bg-white/80 border border-gray-100 rounded-xl p-0.5 shadow-sm">
                                <button
                                    onClick={() => setLangJa(false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!langJa ? "bg-[#006D77] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <Globe size={11} /> Bahasa Indonesia
                                </button>
                                <button
                                    onClick={() => setLangJa(true)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${langJa ? "bg-[#006D77] text-white shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
                                >
                                    <Languages size={11} /> 日本語
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A] leading-tight mb-2">
                        {displayTitle}
                    </h1>
                    {!langJa && ann.title_ja && (
                        <p className="text-base text-gray-400 font-medium mb-4">{ann.title_ja}</p>
                    )}
                    {langJa && ann.title && (
                        <p className="text-base text-gray-400 font-medium mb-4">{ann.title}</p>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                                style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}90)` }}
                            >
                                <RoleIcon size={13} />
                            </div>
                            <div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badge} mr-1`}>
                                    {cfg.label} · {cfg.labelJa}
                                </span>
                                <span className="font-medium text-gray-600">{ann.creator?.name || ann.creator?.email || "—"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar size={11} />
                            {new Date(ann.created_at).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={11} />
                            {timeAgo(ann.created_at)}
                        </div>
                    </div>
                </div>

                {/* Content body */}
                <div className="px-8 py-7">
                    <div
                        className="rich-content"
                        dangerouslySetInnerHTML={{ __html: displayContent }}
                    />
                </div>

                {/* Footer metadata */}
                <div className="px-8 py-4 border-t border-gray-50 flex items-center justify-between text-xs text-gray-400 bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <User size={10} />
                            {ann.creator?.email}
                        </span>
                    </div>
                    <span>
                        Diperbarui: {new Date(ann.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                </div>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <Modal title="Edit Pengumuman" subtitle={ann.title} onClose={() => setShowEdit(false)}>
                    {formError && (
                        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                            <X size={13} className="shrink-0" />{formError}
                        </div>
                    )}
                    <form onSubmit={handleEdit} className="space-y-6">

                        {/* ── Bagian Indonesia (Wajib) ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0" style={{ fontSize: 14, lineHeight: "20px", textAlign: "center" }}>🇮🇩</div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Bahasa Indonesia <span className="text-red-400 normal-case font-normal tracking-normal">· Wajib</span></p>
                            </div>
                            <Field label="Judul" required>
                                <input type="text" required placeholder="Judul pengumuman" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
                            </Field>
                            <Field label="Isi Pengumuman" required>
                                <textarea required rows={5} placeholder="Isi pengumuman..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={textareaCls} />
                            </Field>
                        </div>

                        <div className="h-px bg-gray-100" />

                        {/* ── Bagian Jepang (Opsional) ── */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden shrink-0" style={{ fontSize: 14, lineHeight: "20px", textAlign: "center" }}>🇯🇵</div>
                                <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">
                                    日本語 <span className="normal-case font-normal tracking-normal text-gray-400">· Opsional — Pembaca bisa beralih ke versi ini</span>
                                </p>
                            </div>
                            <div
                                className="rounded-xl p-4 space-y-4"
                                style={{ background: "#FAFAFA", border: "1px solid #F0F0F0" }}
                            >
                                <Field label="タイトル (Judul Jepang)">
                                    <input type="text" placeholder="タイトルを入力してください" value={form.title_ja} onChange={(e) => setForm({ ...form, title_ja: e.target.value })} className={inputCls} />
                                </Field>
                                <Field label="内容 (Isi Jepang)">
                                    <textarea rows={5} placeholder="ここにお知らせの内容を入力してください" value={form.content_ja} onChange={(e) => setForm({ ...form, content_ja: e.target.value })} className={textareaCls} />
                                </Field>
                                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                    <Languages size={11} />
                                    Setelah diisi, pembaca akan melihat tombol switch 🇮🇩 ↔ 🇯🇵 di halaman pengumuman
                                </p>
                            </div>
                        </div>

                        {/* Pin toggle (admin only) */}
                        {role === "admin" && (
                            <>
                                <div className="h-px bg-gray-100" />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, is_pinned: !form.is_pinned })}
                                    className="flex items-center gap-3 w-full"
                                >
                                    <div className={`relative w-10 h-6 rounded-full transition-all ${form.is_pinned ? "bg-amber-400" : "bg-gray-200"}`}>
                                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_pinned ? "translate-x-4" : ""}`} />
                                    </div>
                                    <span className="text-sm text-gray-700 font-medium">Sematkan di atas 📌</span>
                                </button>
                            </>
                        )}

                        <div className="flex gap-3 pt-1">
                            <button type="button" onClick={() => setShowEdit(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                            <button type="submit" disabled={formLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60" style={{ background: "linear-gradient(135deg, #0D7A6F, #094f48)" }}>
                                {formLoading ? <span className="flex items-center justify-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</span> : "Simpan Perubahan"}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete confirm */}
            {showDelete && (
                <Modal title="Hapus Pengumuman?" onClose={() => setShowDelete(false)}>
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5">
                        <p className="font-semibold text-red-800 text-sm">{ann.title}</p>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Pengumuman ini akan dihapus permanen dan tidak dapat dipulihkan.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDelete(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
                        <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2">
                            <Trash2 size={14} />Hapus Permanen
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
