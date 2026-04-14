"use client";

import { useEffect, useState, useCallback } from "react";
import { 
    BookOpen, Plus, FileText, Video, Link as LinkIcon, 
    Trash2, Search, Filter, AlertCircle, ChevronRight,
    GraduationCap, Download, ExternalLink, MoreVertical, Play
} from "lucide-react";
import Swal from "sweetalert2";
import { useLanguage } from "@/i18n/LanguageContext";

const API = "http://localhost:8080/api/v1";

interface Class {
    id: number;
    name: string;
    name_en?: string;
    name_ja?: string;
    academic_year: { year_range: string };
}

interface Material {
    id: number;
    class_id: number;
    title: string;
    title_en?: string;
    title_ja?: string;
    description: string;
    description_en?: string;
    description_ja?: string;
    type: "pdf" | "video" | "link";
    url: string;
    created_at: string;
    class?: Class;
}

export default function MaterialsManagementPage() {
    const { t, lang } = useLanguage();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    
    // Form state
    const [newMaterial, setNewMaterial] = useState({
        class_id: 0,
        title: "",
        title_en: "",
        title_ja: "",
        description: "",
        description_en: "",
        description_ja: "",
        type: "pdf",
        url: "",
    });

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [matRes, clsRes] = await Promise.all([
                fetch(`${API}/materials`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/classes`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (matRes.ok) {
                const json = await matRes.json();
                setMaterials(json.data || []);
            }
            if (clsRes.ok) {
                const json = await clsRes.json();
                setClasses(json.data || []);
            }
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMaterial.class_id || !newMaterial.title || !newMaterial.url) {
            return Swal.fire("Oops", t("common.error"), "warning");
        }

        try {
            const res = await fetch(`${API}/materials`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(newMaterial),
            });

            if (res.ok) {
                Swal.fire(t("common.success"), t("common.success"), "success");
                setShowAddModal(false);
                setNewMaterial({
                    class_id: 0,
                    title: "",
                    title_en: "",
                    title_ja: "",
                    description: "",
                    description_en: "",
                    description_ja: "",
                    type: "pdf",
                    url: "",
                });
                fetchData();
            }
        } catch {
            Swal.fire("Error", t("common.error"), "error");
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: t("common.confirm"),
            text: t("common.delete"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            confirmButtonText: t("common.yes"),
            cancelButtonText: t("common.no")
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API}/materials/${id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    setMaterials(materials.filter(m => m.id !== id));
                    Swal.fire(t("common.success"), t("common.success"), "success");
                }
            } catch {
                Swal.fire("Error", t("common.error"), "error");
            }
        }
    };

    const filteredMaterials = selectedClassId 
        ? materials.filter(m => m.class_id === parseInt(selectedClassId))
        : materials;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3">
                <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">{t("common.loading")}</span>
            </div>
        );
    }

    const getClassName = (c?: Class) => {
        if (!c) return "Global";
        if (lang === 'en' && c.name_en) return c.name_en;
        if (lang === 'ja' && c.name_ja) return c.name_ja;
        return c.name;
    };

    const getMaterialTitle = (m: Material) => {
        if (lang === 'en' && m.title_en) return m.title_en;
        if (lang === 'ja' && m.title_ja) return m.title_ja;
        return m.title;
    };

    const getMaterialDesc = (m: Material) => {
        if (lang === 'en' && m.description_en) return m.description_en;
        if (lang === 'ja' && m.description_ja) return m.description_ja;
        return m.description;
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.05)] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                    <h1 className="text-3xl font-serif font-black text-[#0D1B2A] mb-1 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <BookOpen size={20} />
                        </div>
                        {t("materials.title")}
                    </h1>
                    <p className="text-sm text-gray-400">{t("materials.subtitle")}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#006D77] text-white font-bold text-sm shadow-lg shadow-[#006D77]/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto shrink-0"
                >
                    <Plus size={18} /> {t("materials.add")}
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder={t("materials.searchPlaceholder")} 
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#006D77] transition-all outline-none"
                    />
                </div>
                <select 
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-sm font-semibold text-gray-700 focus:bg-white focus:border-[#006D77] transition-all outline-none cursor-pointer"
                >
                    <option value="">{t("materials.filterAll")}</option>
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{getClassName(c)} ({c.academic_year.year_range})</option>
                    ))}
                </select>
            </div>

            {/* Materials Grid */}
            {filteredMaterials.length === 0 ? (
                <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-4">
                        <BookOpen size={30} />
                    </div>
                    <p className="text-gray-500 font-medium">{t("materials.noData")}</p>
                    <button onClick={() => setShowAddModal(true)} className="text-[#006D77] text-sm font-bold mt-2 hover:underline">
                        {t("materials.uploadFirst")}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredMaterials.map((m) => (
                        <div key={m.id} className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition-all hover:shadow-md hover:border-[#006D77]/30 flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                    m.type === "pdf" ? "bg-red-50 text-red-500" :
                                    m.type === "video" ? "bg-blue-50 text-blue-500" :
                                    "bg-emerald-50 text-emerald-500"
                                }`}>
                                    {m.type === "pdf" && <FileText size={24} />}
                                    {m.type === "video" && <Video size={24} />}
                                    {m.type === "link" && <LinkIcon size={24} />}
                                </div>
                                <button 
                                    onClick={() => handleDelete(m.id)}
                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] uppercase font-black text-[#006D77] bg-[#006D77]/10 px-2 py-0.5 rounded-full tracking-wider">
                                        {getClassName(m.class)}
                                    </span>
                                    <span className="text-[10px] uppercase font-bold text-gray-400">
                                        {t(`materials.${m.type}`)}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[#0D1B2A] group-hover:text-[#006D77] transition-colors line-clamp-1">{getMaterialTitle(m)}</h3>
                                <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                    {getMaterialDesc(m) || "---"}
                                </p>
                            </div>

                            <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <span className="text-[10px] text-gray-300 font-medium">
                                    {t("materials.createdAt")}: {new Date(m.created_at).toLocaleDateString(lang === 'id' ? "id-ID" : "en-US")}
                                </span>
                                <a 
                                    href={m.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-bold text-[#006D77] hover:underline"
                                >
                                    {t("materials.openFile")}
                                    {m.type === "video" ? <Play size={12} fill="currentColor" /> : <ExternalLink size={12} />}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Add */}
            {showAddModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm shadow-2xl">
                    <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleAdd} className="flex flex-col max-h-[90vh]">
                            <div className="p-6 bg-[#006D77] text-white shrink-0">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-serif font-black">{t("materials.modalTitle")}</h3>
                                        <p className="text-xs text-white/70">{t("materials.modalSub")}</p>
                                    </div>
                                    <button type="button" onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white transition-colors">
                                        <Plus size={24} className="rotate-45" />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-6 overflow-y-auto">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formClass")}</label>
                                    <select 
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77]"
                                        value={newMaterial.class_id}
                                        onChange={(e) => setNewMaterial({...newMaterial, class_id: parseInt(e.target.value)})}
                                        required
                                    >
                                        <option value="">-- {t("materials.formClass")} --</option>
                                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formTitle")} (ID)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77]"
                                            value={newMaterial.title}
                                            onChange={(e) => setNewMaterial({...newMaterial, title: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formTitle")} (EN)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77]"
                                            value={newMaterial.title_en}
                                            onChange={(e) => setNewMaterial({...newMaterial, title_en: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formTitle")} (JA)</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77]"
                                            value={newMaterial.title_ja}
                                            onChange={(e) => setNewMaterial({...newMaterial, title_ja: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formType")}</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {["pdf", "video", "link"].map(tItem => (
                                            <button
                                                key={tItem}
                                                type="button"
                                                onClick={() => setNewMaterial({...newMaterial, type: tItem as any})}
                                                className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                                                    newMaterial.type === tItem 
                                                    ? "bg-[#006D77] text-white shadow-md shadow-[#006D77]/20" 
                                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                }`}
                                            >
                                                {t(`materials.${tItem}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formUrl")}</label>
                                    <input 
                                        type="text" 
                                        placeholder={newMaterial.type === "pdf" ? "/uploads/..." : "https://..."}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77]"
                                        value={newMaterial.url}
                                        onChange={(e) => setNewMaterial({...newMaterial, url: e.target.value})}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formDesc")} (ID)</label>
                                        <textarea 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77] min-h-[80px]"
                                            value={newMaterial.description}
                                            onChange={(e) => setNewMaterial({...newMaterial, description: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formDesc")} (EN)</label>
                                        <textarea 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77] min-h-[80px]"
                                            value={newMaterial.description_en}
                                            onChange={(e) => setNewMaterial({...newMaterial, description_en: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{t("materials.formDesc")} (JA)</label>
                                        <textarea 
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none text-sm font-medium focus:ring-2 focus:ring-[#006D77] min-h-[80px]"
                                            value={newMaterial.description_ja}
                                            onChange={(e) => setNewMaterial({...newMaterial, description_ja: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 flex gap-3 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
                                >
                                    {t("materials.cancel")}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-[#006D77] shadow-lg shadow-[#006D77]/20 hover:scale-105 transition-all"
                                >
                                    {t("materials.saveBtn")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

