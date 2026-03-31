"use client";

import { useEffect, useState, useCallback } from "react";
import {
    GraduationCap,
    Users,
    ClipboardList,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    FileText,
    Calendar,
    User,
    Search,
    X,
    Filter,
    BookOpen,
    Video,
    Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

const API = "http://localhost:8080/api/v1";

interface EnrolledClassInfo {
    class_id: number;
    class_name: string;
    academic_year: string;
}

interface PendingTask {
    type: "assignment" | "exam";
    id: number;
    title: string;
    class_name: string;
    due_date: string | null;
    is_submitted: boolean;
}

interface StudentDashboard {
    enrollments: EnrolledClassInfo[];
    pending_tasks: PendingTask[];
}

interface ClassDetail {
    id: number;
    name: string;
    bab_start: number;
    bab_end: number;
    teacher?: {
        name: string;
        photo: string;
    };
    academic_year: {
        year_range: string;
    };
}

interface Enrollment {
    id: number;
    user: {
        id: number;
        name: string;
        email: string;
        nis: string;
        photo: string;
    };
}

interface Material {
    id: number;
    title: string;
    description: string;
    type: "pdf" | "video" | "link";
    url: string;
}

function formatDue(due: string | null): string {
    if (!due) return "Tidak ada batas waktu";
    const d = new Date(due);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / 1000 / 60 / 60;
    if (diff < 0) return "⚠️ Sudah lewat";
    if (diff < 24) return `🔴 ${Math.floor(diff)}j lagi`;
    if (diff < 48) return `🟡 Besok`;
    return `🟢 ${d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function urgencyClass(due: string | null): string {
    if (!due) return "bg-gray-50 text-gray-500";
    const diff = (new Date(due).getTime() - Date.now()) / 1000 / 60 / 60;
    if (diff < 0) return "bg-red-50 text-red-600 border-red-100";
    if (diff < 24) return "bg-red-50 text-red-600 border-red-100";
    if (diff < 48) return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
}

function MaterialCard({ m }: { m: Material }) {
    const isVideo = m.type === "video";
    const isPdf = m.type === "pdf";

    return (
        <a 
            href={m.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#4ECDC4]/50 hover:shadow-sm transition-all group"
        >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                isPdf ? "bg-red-50 text-red-500" :
                isVideo ? "bg-blue-50 text-blue-500" :
                "bg-emerald-50 text-emerald-500"
            }`}>
                {isPdf ? <FileText size={24} /> : isVideo ? <Video size={24} /> : <LinkIcon size={24} />}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 text-sm group-hover:text-[#006D77] transition-colors truncate">{m.title}</h4>
                <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{m.description || "Klik untuk membuka materi ini."}</p>
            </div>
            <div className="self-center">
                 <ChevronRight size={16} className="text-gray-300 group-hover:text-[#006D77]" />
            </div>
        </a>
    );
}

export default function MyClassPage() {
    const [dashboardData, setDashboardData] = useState<StudentDashboard | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
    const [classDetail, setClassDetail] = useState<ClassDetail | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showSiswaModal, setShowSiswaModal] = useState(false);
    const [siswaSearch, setSiswaSearch] = useState("");

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchDashboard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/student/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            const data: StudentDashboard = json.data;
            setDashboardData(data);
            
            if (data.enrollments && data.enrollments.length > 0) {
                setSelectedClassId(data.enrollments[0].class_id);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard", error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchClassDetail = useCallback(async (id: number) => {
        setDetailLoading(true);
        try {
            const [detRes, envRes] = await Promise.all([
                fetch(`${API}/classes/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API}/classes/${id}/enrollments`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            
            if (detRes.ok) {
                const json = await detRes.json();
                setClassDetail(json.data);
            }
            if (envRes.ok) {
                const json = await envRes.json();
                setEnrollments(json.data ?? []);
            }

            const matRes = await fetch(`${API}/materials?class_id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (matRes.ok) {
                const json = await matRes.json();
                setMaterials(json.data ?? []);
            }
        } catch (error) {
            console.error("Failed to fetch class detail", error);
        } finally {
            setDetailLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useEffect(() => {
        if (selectedClassId) {
            fetchClassDetail(selectedClassId);
        }
    }, [selectedClassId, fetchClassDetail]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3">
                <div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Memuat data kelas...</span>
            </div>
        );
    }

    if (!dashboardData?.enrollments || dashboardData.enrollments.length === 0) {
        return (
            <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500">
                    <AlertCircle size={40} />
                </div>
                <h1 className="text-xl font-bold text-gray-800">Belum Ada Kelas</h1>
                <p className="text-gray-500 text-sm">
                    Kamu belum didaftarkan ke kelas manapun di tahun ajaran ini. 
                    Silakan hubungi bagian akademik atau admin untuk pendaftaran kelas.
                </p>
            </div>
        );
    }

    const tasks = dashboardData.pending_tasks.filter(t => t.class_name === classDetail?.name);
    const filteredEnrollments = enrollments.filter(e => 
        e.user.name.toLowerCase().includes(siswaSearch.toLowerCase()) || 
        e.user.nis.includes(siswaSearch) ||
        e.user.email.toLowerCase().includes(siswaSearch.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* ── Class Header Card ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#006D77] to-[#4ECDC4] p-6 text-white relative">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    {classDetail?.academic_year.year_range}
                                </span>
                            </div>
                            <h1 className="text-3xl font-serif font-black">{classDetail?.name || "Memuat..."}</h1>
                            <p className="text-white/80 font-medium mt-1">
                                Bab {classDetail?.bab_start} — {classDetail?.bab_end}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setShowSiswaModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#006D77] font-bold text-sm shadow-lg hover:bg-gray-50 transition-all border border-transparent"
                            >
                                <Users size={18} />
                                Lihat Siswa Kelas
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-5 flex flex-wrap items-center gap-6 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                            {classDetail?.teacher?.photo ? (
                                <img src={`http://localhost:8080${classDetail.teacher.photo}`} alt="guru" className="w-full h-full object-cover" />
                            ) : (
                                <User className="text-gray-400" size={20} />
                            )}
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Guru Pengajar</p>
                            <p className="text-sm font-bold text-gray-800">{classDetail?.teacher?.name || "Belum ditentukan"}</p>
                        </div>
                    </div>
                    
                    <div className="h-8 w-px bg-gray-100 hidden sm:block" />
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">Jumlah Siswa</p>
                            <p className="text-sm font-bold text-gray-800">{enrollments.length} Siswa</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Materials Module ── */}
            {materials.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#4ECDC4]/10 flex items-center justify-center text-[#006D77]">
                            <BookOpen size={18} />
                        </div>
                        <h2 className="text-xl font-serif font-black text-[#0D1B2A]">Materi Pembelajaran</h2>
                        <span className="text-[10px] font-bold text-white bg-[#006D77] px-2 py-0.5 rounded-full">{materials.length} Baru</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {materials.map(m => <MaterialCard key={m.id} m={m} />)}
                    </div>
                </div>
            )}

            {/* ── Assignment Section ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#006D77]/10 flex items-center justify-center text-[#006D77]">
                            <ClipboardList size={18} />
                        </div>
                        <h2 className="text-xl font-serif font-black text-[#0D1B2A]">Daftar Tugas & Ujian</h2>
                    </div>
                </div>

                {detailLoading ? (
                    <div className="py-20 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-gray-400">Memperbarui daftar...</span>
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300 mb-4">
                            <CheckCircle2 size={32} />
                        </div>
                        <p className="text-gray-500 font-medium">Belum ada tugas atau ujian di kelas ini 🎉</p>
                        <p className="text-xs text-gray-400 mt-1">Silakan nikmati waktu luangmu atau pelajari materi selanjutnya.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tasks.map((task, idx) => {
                            const isExam = task.type === "exam";
                            const linkHref = `/dashboard/students/${isExam ? "exams" : "assignments"}/${task.id}`;
                            const isSubmitted = task.is_submitted;
                            
                            return (
                                <Link
                                    key={`${task.type}-${task.id}-${idx}`}
                                    href={linkHref}
                                    onClick={(e) => {
                                        if (isSubmitted) {
                                            e.preventDefault();
                                            alert("Anda sudah mengerjakan ujian/tugas ini!");
                                        }
                                    }}
                                    className={`group bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md hover:border-[#006D77]/30 ${
                                        isSubmitted ? "border-emerald-100 opacity-60" : "border-gray-100"
                                    }`}
                                >
                                    <div className="flex gap-4">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0">
                                            {isExam ? (
                                                <img src="/icons/exams.png" alt="Ujian" className="w-10 h-10 object-contain drop-shadow-md transition-transform group-hover:scale-110" />
                                            ) : (
                                                <img src="/icons/task.png" alt="Tugas" className="w-10 h-10 object-contain drop-shadow-md transition-transform group-hover:scale-110" />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="font-bold text-gray-800 truncate group-hover:text-[#006D77] transition-colors leading-tight">
                                                    {task.title}
                                                </h3>
                                                {isSubmitted && (
                                                    <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                                                        <CheckCircle2 size={10} />
                                                        DIKIRIM
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                                                <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-lg border ${
                                                    isSubmitted ? "bg-gray-50 text-gray-400 border-gray-100" : urgencyClass(task.due_date)
                                                }`}>
                                                    <Clock size={12} />
                                                    {isSubmitted ? "Terkumpul" : formatDue(task.due_date)}
                                                </div>
                                                
                                                <div className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                                    isExam ? "text-purple-600 bg-purple-50" : "text-blue-600 bg-blue-50"
                                                }`}>
                                                    {isExam ? "Ujian" : "Tugas"}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="self-center">
                                            <ChevronRight size={20} className="text-gray-300 group-hover:text-[#006D77] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Siswa Modal ── */}
            {showSiswaModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-[#006D77] text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users size={24} />
                                <div>
                                    <h3 className="font-serif font-black text-xl">Daftar Teman Sekelas</h3>
                                    <p className="text-xs text-white/70">Total {enrollments.length} siswa di {classDetail?.name}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowSiswaModal(false)}
                                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-100 flex gap-2">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Cari teman sekelas..."
                                    value={siswaSearch}
                                    onChange={(e) => setSiswaSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#006D77] transition-all outline-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/30">
                            {filteredEnrollments.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 italic">
                                    Tidak ada teman sekelas yang ditemukan.
                                </div>
                            ) : (
                                filteredEnrollments.map((en) => (
                                    <div key={en.id} className="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-2xl hover:border-[#006D77]/20 transition-all hover:shadow-sm">
                                        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0">
                                            {en.user.photo ? (
                                                <img src={`http://localhost:8080${en.user.photo}`} alt="ava" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-lg font-bold text-[#006D77]">{en.user.name[0]?.toUpperCase()}</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 text-sm">{en.user.name}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{en.user.email}</p>
                                        </div>
                                        <div className="text-right">
                                            {en.user.nis && (
                                                <p className="text-[10px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg border border-gray-200 inline-block font-bold">
                                                    NIS {en.user.nis}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
