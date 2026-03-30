"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Users,
    UserPlus,
    UserMinus,
    Search,
    X,
    Filter,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
    : "http://localhost:8080/api/v1";

interface Student {
    id: number;
    name: string;
    email: string;
    nis: string;
    photo: string;
    created_at: string;
}

interface Enrollment {
    id: number;
    class_id: number;
    user_id: number;
    enrolled_at: string;
    user: Student;
}

interface ClassData {
    id: number;
    name: string;
    bab_start: number;
    bab_end: number;
    academic_year?: {
        is_active: boolean;
        year_range: string;
    };
}

export default function ClassEnrollmentPage({ params }: { params: Promise<{ id: string }> }) {
    const defaultParams = use(params);
    const classIdStr = defaultParams.id;
    const router = useRouter();

    const [classData, setClassData] = useState<ClassData | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [allStudents, setAllStudents] = useState<Student[]>([]);

    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Sort & Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "created_at">("name");

    // Selection state for bulk Add
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [clsRes, envRes, stuRes] = await Promise.all([
                fetch(`${API_BASE}/classes/${classIdStr}`),
                fetch(`${API_BASE}/classes/${classIdStr}/enrollments`),
                fetch(`${API_BASE}/users?role=student`),
            ]);

            if (clsRes.ok) {
                const json = await clsRes.json();
                setClassData(json.data);
            }
            if (envRes.ok) {
                const json = await envRes.json();
                setEnrollments(json.data ?? []);
            }
            if (stuRes.ok) {
                const json = await stuRes.json();
                setAllStudents(json.data ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [classIdStr]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUnenroll = async (userID: number) => {
        try {
            await fetch(`${API_BASE}/classes/${classIdStr}/enrollments/${userID}`, {
                method: "DELETE",
            });
            setEnrollments((prev) => prev.filter((e) => e.user_id !== userID));
        } catch (error) {
            console.error("Gagal mengeluarkan siswa", error);
        }
    };

    const handleBulkEnroll = async () => {
        if (selectedStudentIds.size === 0) return;
        setBulkLoading(true);
        try {
            const res = await fetch(`${API_BASE}/classes/${classIdStr}/enrollments/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_ids: Array.from(selectedStudentIds) }),
            });
            if (res.ok) {
                setShowAddModal(false);
                setSelectedStudentIds(new Set());
                fetchData();
            } else {
                alert("Gagal menambahkan siswa");
            }
        } catch (error) {
            console.error(error);
            alert("Kesalahan jaringan saat mendaftarkan siswa");
        } finally {
            setBulkLoading(false);
        }
    };

    const enrolledIDs = new Set(enrollments.map((e) => e.user_id));

    // Filter available students and apply search/sort
    let availableStudents = allStudents.filter(s => !enrolledIDs.has(s.id));

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        availableStudents = availableStudents.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q) ||
            s.nis?.includes(q)
        );
    }

    availableStudents.sort((a, b) => {
        if (sortBy === "name") {
            return (a.name || a.email).localeCompare(b.name || b.email);
        } else {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Newest first
        }
    });

    const isAllSelected = availableStudents.length > 0 && availableStudents.every(s => selectedStudentIds.has(s.id));
    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedStudentIds(new Set());
        } else {
            const newSet = new Set(selectedStudentIds);
            availableStudents.forEach(s => newSet.add(s.id));
            setSelectedStudentIds(newSet);
        }
    };

    const toggleStudent = (id: number) => {
        const newSet = new Set(selectedStudentIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedStudentIds(newSet);
    };

    const renderAvatar = (user: Student) => {
        if (user.photo) {
            return <img src={`http://localhost:8080${user.photo}`} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200" />;
        }
        const letter = (user.name || user.email)[0].toUpperCase();
        return (
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-[#7C3AED] to-[#5b21b6] font-bold shrink-0">
                {letter}
            </div>
        );
    };

    if (loading && !classData) {
        return <div className="flex justify-center py-20"><div className="w-6 h-6 border-4 border-[#006D77] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const isActive = classData?.academic_year?.is_active ?? false;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <button onClick={() => router.push('/dashboard/classes')} className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors">
                    <ArrowLeft size={20} className="text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        {classData?.name || "Memuat..."}
                    </h1>
                    <p className="text-gray-400 text-sm mt-0.5">
                        Kelola data siswa yang terdaftar di kelas ini
                    </p>
                </div>
                <div className="ml-auto">
                    {isActive ? (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-[#006D77]/25 shadow-lg transition-transform hover:scale-105"
                            style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                        >
                            <UserPlus size={16} />
                            Tambah Siswa Baru
                        </button>
                    ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                            TA Tidak Aktif, Terkunci
                        </span>
                    )}
                </div>
            </div>

            {/* Enrolled List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 bg-[#006D77]/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#006D77]">
                        <Users size={18} />
                        <span className="font-semibold text-sm">Siswa Terdaftar ({enrollments.length})</span>
                    </div>
                </div>

                {enrollments.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                        <Users size={48} className="text-gray-200 mb-3" />
                        <p>Belum ada siswa terdaftar di kelas ini.</p>
                        {isActive && (
                            <button onClick={() => setShowAddModal(true)} className="mt-4 text-[#006D77] font-medium hover:underline text-sm">Tambah Siswa Sekarang</button>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {enrollments.map((e) => (
                            <div key={e.id} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    {renderAvatar(e.user)}
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">{e.user.name || "-"}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                            <span>{e.user.email}</span>
                                            {e.user.nis && (
                                                <>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">NIS: {e.user.nis}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isActive && (
                                    <button
                                        onClick={() => handleUnenroll(e.user_id)}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-xs font-medium"
                                    >
                                        <UserMinus size={14} />
                                        Keluarkan
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bulk Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h3 className="font-semibold text-gray-900">Tambahkan Siswa ke {classData?.name}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Pilih siswa yang ingin didaftarkan secara massal.</p>
                            </div>
                            <button onClick={() => { setShowAddModal(false); setSelectedStudentIds(new Set()); }} className="w-8 h-8 rounded-lg hover:bg-gray-200 flex items-center justify-center text-gray-500">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Cari nama, email, atau NIS..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/20 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as "name" | "created_at")}
                                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#006D77]"
                                >
                                    <option value="name">Urutkan: Nama</option>
                                    <option value="created_at">Urutkan: Tgl Daftar (Terbaru)</option>
                                </select>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50">
                            {availableStudents.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-sm">
                                    Tidak ada siswa yang ditemukan.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {/* Select All Row */}
                                    <div className="px-4 py-3 flex items-center gap-3 hover:bg-gray-100 rounded-lg cursor-pointer" onClick={toggleSelectAll}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isAllSelected ? "bg-[#006D77] border-[#006D77]" : "border-gray-300 bg-white"}`}>
                                            {isAllSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                        </div>
                                        <span className="text-sm font-semibold text-gray-700">Pilih Semua ({availableStudents.length} Tersedia)</span>
                                    </div>

                                    {/* Student Rows */}
                                    {availableStudents.map(student => {
                                        const isSelected = selectedStudentIds.has(student.id);
                                        return (
                                            <div key={student.id} onClick={() => toggleStudent(student.id)} className={`px-4 py-3 flex items-center gap-4 cursor-pointer rounded-xl transition-all ${isSelected ? "bg-[#006D77]/5 border border-[#006D77]/20" : "hover:bg-gray-50 border border-transparent"}`}>
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? "bg-[#006D77] border-[#006D77]" : "border-gray-300 bg-white"}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                                                </div>
                                                {renderAvatar(student)}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm text-gray-900 truncate">{student.name || "(Belum diisi)"}</p>
                                                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{student.nis || "No NIS"}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Daftar: {new Date(student.created_at).toLocaleDateString('id-ID')}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 bg-white flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                <span className="font-semibold text-[#006D77]">{selectedStudentIds.size}</span> siswa dipilih
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => { setShowAddModal(false); setSelectedStudentIds(new Set()); }} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                                    Batal
                                </button>
                                <button
                                    onClick={handleBulkEnroll}
                                    disabled={selectedStudentIds.size === 0 || bulkLoading}
                                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm flex items-center gap-2"
                                    style={{ background: "linear-gradient(135deg, #006D77, #004f54)" }}
                                >
                                    {bulkLoading ? (
                                        <><span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Mendaftarkan...</>
                                    ) : (
                                        <>Tambahkan ke Kelas</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
