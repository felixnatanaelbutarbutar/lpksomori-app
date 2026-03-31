"use client";

import { useEffect, useState } from "react";
import { 
    Settings, Globe, Shield, Bell, 
    Database, Save, RotateCcw, Building,
    MessageSquare, AlertTriangle, Monitor, GraduationCap,
    Star
} from "lucide-react";
import Swal from "sweetalert2";

const API = "http://localhost:8080/api/v1";

interface Setting {
    id: number;
    key: string;
    value: string;
}

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<"general" | "academic" | "security">("general");

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/settings`);
            const json = await res.json();
            if (json.data) {
                const map: Record<string, string> = {};
                json.data.forEach((s: Setting) => {
                    map[s.key] = s.value;
                });
                setSettings(map);
            }
        } catch {
            Swal.fire("Error", "Gagal mengambil data pengaturan", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (!res.ok) throw new Error();
            
            Swal.fire({
                title: "Berhasil! ✅",
                text: "Pengaturan sistem telah diperbarui.",
                icon: "success",
                confirmButtonColor: "#006D77",
            });
        } catch {
            Swal.fire("Error", "Gagal menyimpan pengaturan", "error");
        } finally {
            setSaving(false);
        }
    };

    const updateSetting = (key: string, val: string) => {
        setSettings(prev => ({ ...prev, [key]: val }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#0D1B2A] flex items-center gap-2">
                        <Settings className="text-[#006D77]" /> Pengaturan Sistem
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Konfigurasi global platform LPK SO Mori Centre</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-[#006D77]/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    style={{ background: "#006D77" }}
                >
                    <Save size={18} />
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Navigation */}
                <div className="space-y-2">
                    {[
                        { id: "general", label: "Umum & Profil", icon: Building },
                        { id: "academic", label: "Kebijakan Akademik", icon: GraduationCap },
                        { id: "security", label: "Keamanan & Akses", icon: Shield },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                                activeTab === tab.id 
                                ? "bg-[#006D77] text-white shadow-md" 
                                : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}

                    <div className="pt-8 border-t mt-8 border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">Peralatan</p>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <RotateCcw size={18} /> Bersihkan Cache
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-emerald-50 hover:text-emerald-500 transition-colors">
                            <Database size={18} /> Backup Database
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="lg:col-span-3 space-y-6">
                    {/* General Settings */}
                    {activeTab === "general" && (
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-[#0D1B2A] mb-1">Profil LPK</h3>
                                <p className="text-xs text-gray-400">Informasi dasar yang tampil di dashboard & laporan</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Nama LPK</label>
                                    <input 
                                        type="text" 
                                        value={settings.lpk_name || ""} 
                                        onChange={(e) => updateSetting("lpk_name", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#006D77] transition-all outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Motto LPK</label>
                                    <input 
                                        type="text" 
                                        value={settings.lpk_motto || ""} 
                                        onChange={(e) => updateSetting("lpk_motto", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#006D77] transition-all outline-none text-sm font-medium"
                                    />
                                </div>
                                <div className="sm:col-span-2 space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Alamat Kantor</label>
                                    <textarea 
                                        value={settings.lpk_address || ""} 
                                        onChange={(e) => updateSetting("lpk_address", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#006D77] transition-all outline-none text-sm font-medium min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 ml-1">Telepon / WhatsApp</label>
                                    <input 
                                        type="text" 
                                        value={settings.lpk_phone || ""} 
                                        onChange={(e) => updateSetting("lpk_phone", e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-transparent focus:bg-white focus:border-[#006D77] transition-all outline-none text-sm font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Academic Settings */}
                    {activeTab === "academic" && (
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-[#0D1B2A] mb-1">Standar Akademik</h3>
                                <p className="text-xs text-gray-400">Parameter penilaian untuk kelulusan siswa</p>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-[#006D77]/5 border border-[#006D77]/10">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#006D77]/20 flex items-center justify-center text-[#006D77]">
                                            <Star size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#006D77]">Skor Minimal Lulus</p>
                                            <p className="text-[10px] text-gray-400">Nilai minimal rata-rata untuk status "Lulus"</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={settings.min_pass_score || "70"} 
                                        onChange={(e) => updateSetting("min_pass_score", e.target.value)}
                                        className="w-20 px-3 py-2 rounded-lg bg-white border border-[#006D77]/30 text-center font-bold outline-none"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50 border border-orange-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                            <RotateCcw size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-orange-700">Maksimal Attempt Ujian</p>
                                            <p className="text-[10px] text-orange-600">Default jumlah pengerjaan ulang ujian</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="number" 
                                        value={settings.exam_max_attempt_default || "1"} 
                                        onChange={(e) => updateSetting("exam_max_attempt_default", e.target.value)}
                                        className="w-20 px-3 py-2 rounded-lg bg-white border border-orange-300 text-center font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Settings */}
                    {activeTab === "security" && (
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div>
                                <h3 className="text-lg font-bold text-[#0D1B2A] mb-1">Akses & Keamanan</h3>
                                <p className="text-xs text-gray-400">Kontrol terhadap sistem pendaftaran dan pemeliharaan</p>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                            <Graduate size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-700">Izinkan Registrasi Siswa</p>
                                            <p className="text-[10px] text-gray-400">Siswa dapat membuat akun secara mandiri melalui halaman depan</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.allow_student_register === "true"}
                                        onChange={(e) => updateSetting("allow_student_register", e.target.checked ? "true" : "false")}
                                        className="w-5 h-5 accent-[#006D77] rounded focus:ring-[#006D77]"
                                    />
                                </label>

                                <label className="flex items-center justify-between p-4 rounded-2xl border border-red-50 bg-white hover:bg-red-50 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                            <AlertTriangle size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-red-700">Mode Pemeliharaan (Maintenance Mode)</p>
                                            <p className="text-[10px] text-red-600">Nonaktifkan akses seluruh fitur untuk proses migrasi/maintenance</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        checked={settings.maintenance_mode === "true"}
                                        onChange={(e) => updateSetting("maintenance_mode", e.target.checked ? "true" : "false")}
                                        className="w-5 h-5 accent-red-600 shadow-sm"
                                    />
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Tip card */}
                    <div className="bg-[#001D21] rounded-3xl p-6 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Informasi</p>
                            <p className="text-xs leading-relaxed text-white/80">
                                Perubahan pada <b>Kebijakan Akademik</b> akan langsung berdampak pada perhitungan status kelulusan di halaman rekap nilai untuk semua kelas yang sedang berjalan.
                            </p>
                        </div>
                        <Settings className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 opacity-50" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Graduate(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
        </svg>
    );
}
