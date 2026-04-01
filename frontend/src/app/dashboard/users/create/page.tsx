"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ShieldCheck, X, Eye, EyeOff, Save, KeyRound, UserRound, MapPin, CalendarDays, Contact, Backpack, BookOpen } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

// ─── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 3500);
        return () => clearTimeout(t);
    }, [onClose]);
    return (
        <div
            className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium animate-in fade-in slide-in-from-bottom-5"
            style={{ background: type === "success" ? "var(--success)" : "var(--danger)", boxShadow: `0 8px 24px ${type === "success" ? "rgba(45,125,89,0.35)" : "rgba(192,57,43,0.35)"}` }}
        >
            {type === "success" ? <ShieldCheck size={16} /> : <X size={16} />}
            {message}
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
                <X size={12} />
            </button>
        </div>
    );
}

// ─── Password input ───────────────────────────────────────────────────────────
function PasswordInput({ value, onChange }: { value: string; onChange: (v: string) => void; }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <KeyRound size={16} />
            </div>
            <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#006D77] transition-colors"
                tabIndex={-1}
            >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
        </div>
    );
}

// ─── Main Form Page Component ──────────────────────────────────────────────────
function CreateUserForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleParam = searchParams.get("role") || "student"; // Default to student
    
    const [role, setRole] = useState<string>(roleParam === "teacher" ? "teacher" : "student");
    const [form, setForm] = useState({ 
        email: "", 
        password: "", 
        name: "", 
        nis: "", 
        active: true, 
        place_of_birth: "", 
        date_of_birth: "", 
        gender: "L", 
        phone: "", 
        address: "" 
    });
    
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const isTeacher = role === "teacher";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: form.email,
                    password: form.password,
                    role: role,
                    name: form.name || undefined,
                    nis: form.nis || undefined,
                    active: form.active,
                    place_of_birth: form.place_of_birth || undefined,
                    date_of_birth: form.date_of_birth || undefined,
                    gender: form.gender,
                    phone: form.phone || undefined,
                    address: form.address || undefined,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Gagal mendaftarkan pengguna");
            
            setToast({ message: "Pengguna berhasil ditambahkan!", type: "success" });
            
            // Redirect after brief delay
            setTimeout(() => {
                router.push("/dashboard/users");
            }, 1000);
            
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Terjadi kesalahan");
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/users" className="text-sm text-gray-400 hover:text-[#006D77] flex items-center gap-1 mb-2 transition-colors">
                        <ChevronLeft size={16} /> Kembali ke daftar pengguna
                    </Link>
                    <h1 className="text-3xl font-black text-[#0D1B2A] tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                        Tambah Pengguna Baru
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Daftarkan pengguna dengan profil yang lengkap agar mudah dikelola.
                    </p>
                </div>
                
                {/* Role Switcher */}
                <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner hidden sm:flex">
                    <button 
                        type="button"
                        onClick={() => setRole("teacher")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isTeacher ? "bg-white text-amber-600 shadow-sm" : "text-gray-400 hover:bg-gray-200"}`}
                    >
                        <BookOpen size={16} /> Guru
                    </button>
                    <button 
                        type="button"
                        onClick={() => setRole("student")}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${!isTeacher ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:bg-gray-200"}`}
                    >
                        <Backpack size={16} /> Siswa
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-2xl flex items-start gap-3">
                    <X className="text-red-500 mt-0.5 shrink-0" size={18} />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Section 1: Akun Kredensial */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#0D1B2A]">Informasi Kredensial Akun</h2>
                            <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">Login & Autentikasi</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Alamat Email <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                required
                                placeholder="guru@lpk.com"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Password default <span className="text-red-500">*</span></label>
                            <PasswordInput
                                value={form.password}
                                onChange={(val) => setForm({ ...form, password: val })}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Identitas Diri */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute right-0 top-0 w-32 h-32 bg-[#006D77]/5 rounded-bl-[100px] -z-0"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                    <UserRound size={20} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#0D1B2A]">Identitas Personal</h2>
                                    <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">Biodata Pengguna</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                                <span className={`w-2 h-2 rounded-full ${form.active ? "bg-emerald-500" : "bg-gray-300"}`}></span>
                                <span className="text-xs font-semibold text-gray-600">{form.active ? "Akun Langsung Aktif" : "Akun Nonaktif Sementara"}</span>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, active: !form.active })}
                                    className={`ml-2 relative w-8 h-5 rounded-full transition-all ${form.active ? "bg-emerald-500" : "bg-gray-200"}`}
                                >
                                    <span className={`absolute top-0.5 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? "translate-x-3" : "translate-x-0"}`} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nama Lengkap <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Nama Lengkap dengan Gelar"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    {isTeacher ? "NUPTK / NIP / ID Guru" : "NIS / NISN Siswa"}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={isTeacher ? "Opsional" : "Nomor Induk Siswa"}
                                        value={form.nis}
                                        onChange={(e) => setForm({ ...form, nis: e.target.value })}
                                        className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50"
                                    />
                                    <Contact className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Jenis Kelamin</label>
                                <select 
                                    value={form.gender} 
                                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50 appearance-none"
                                >
                                    <option value="L">👨 Laki-laki</option>
                                    <option value="P">👩 Perempuan</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tempat Lahir</label>
                                    <input
                                        type="text"
                                        placeholder="Kota Kelahiran"
                                        value={form.place_of_birth}
                                        onChange={(e) => setForm({ ...form, place_of_birth: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] transition-all bg-gray-50/50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tanggal Lahir</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={form.date_of_birth}
                                            onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                            className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] transition-all bg-gray-50/50"
                                        />
                                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Kontak & Alamat */}
                <div className="bg-white rounded-[24px] border border-gray-100 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-[#0D1B2A]">Kontak & Domisili</h2>
                            <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">Untuk komunikasi</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">No. Telepon / WhatsApp</label>
                            <input
                                type="text"
                                placeholder="08xx-xxxx-xxxx"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Alamat Lengkap Tempat Tinggal</label>
                            <textarea
                                placeholder="Tuliskan nama jalan, RT/RW, kelurahan, dan kota domisili..."
                                rows={3}
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/10 transition-all bg-gray-50/50 resize-y"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/users")}
                        className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        style={{ background: "linear-gradient(135deg, #0D1B2A, #006D77)" }}
                    >
                        {loading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save size={18} />
                        )}
                        {loading ? "Menyimpan Data..." : "Simpan Pengguna Baru"}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ─── Export with Suspense Wrapper ──────────────────────────────────────────────
export default function Page() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-48 w-full">
                <div className="w-8 h-8 rounded-full border-4 border-[#006D77]/30 border-t-[#006D77] animate-spin"></div>
            </div>
        }>
            <CreateUserForm />
        </Suspense>
    );
}
