"use client";

import { useEffect, useRef, useState } from "react";
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Save,
    FileDown,
    Camera,
    GraduationCap,
    BookOpen,
    Award,
    Edit3,
    X,
    Globe,
    Users,
    Loader2,
} from "lucide-react";
import Swal from "sweetalert2";
import { StudentProgressChart } from "../../../../components/StudentProgressChart";

const API = "http://localhost:8080/api/v1";

interface UserProfile {
    id: number;
    name: string;
    email: string;
    role: string;
    nis: string;
    photo: string;
    active: boolean;
    place_of_birth: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    address: string;
    created_at: string;
}

interface EnrolledClass {
    class_id: number;
    class_name: string;
    academic_year: string;
    course_count: number;
}

interface GradeRecap {
    id: number;
    class_id: number;
    class_name?: string;
    assignment_avg: number;
    exam_score: number;
    final_score: number;
    status: string;
}

export default function StudentProfilePage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
    const [recaps, setRecaps] = useState<GradeRecap[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState(false);
    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        address: "",
        place_of_birth: "",
        date_of_birth: "",
        gender: "",
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("mori_token") ?? "" : "";

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const userJson = localStorage.getItem("mori_user");
            if (!userJson) return;
            const user = JSON.parse(userJson);
            const userId = user.id || user.ID;

            const res = await fetch(`${API}/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            const data: UserProfile = json.data || json;
            setProfile(data);
            setForm({
                name: data.name || "",
                phone: data.phone || "",
                address: data.address || "",
                place_of_birth: data.place_of_birth || "",
                date_of_birth: data.date_of_birth ? data.date_of_birth.substring(0, 10) : "",
                gender: data.gender || "",
            });
        } catch {
            Swal.fire("Error", "Gagal memuat profil", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchAcademicData = async () => {
        try {
            const res = await fetch(`${API}/student/dashboard`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.data?.enrollments) setEnrollments(json.data.enrollments);
        } catch { }

        try {
            const res = await fetch(`${API}/student/grade-recap`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (json.data) setRecaps(json.data);
        } catch { }
    };

    useEffect(() => {
        fetchProfile();
        fetchAcademicData();
    }, []);

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            const res = await fetch(`${API}/users/${profile.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name || undefined,
                    phone: form.phone || undefined,
                    address: form.address || undefined,
                    place_of_birth: form.place_of_birth || undefined,
                    date_of_birth: form.date_of_birth || undefined,
                    gender: form.gender || undefined,
                }),
            });
            if (!res.ok) throw new Error();

            // Update localStorage
            const userJson = localStorage.getItem("mori_user");
            if (userJson) {
                const user = JSON.parse(userJson);
                localStorage.setItem("mori_user", JSON.stringify({ ...user, name: form.name }));
            }

            await fetchProfile();
            setEditing(false);
            Swal.fire({
                title: "Berhasil! ✅",
                text: "Profil kamu telah diperbarui.",
                icon: "success",
                confirmButtonColor: "#006D77",
                timer: 2000,
                showConfirmButton: false,
            });
        } catch {
            Swal.fire("Error", "Gagal menyimpan profil", "error");
        } finally {
            setSaving(false);
        }
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !profile) return;
        setUploadingPhoto(true);
        try {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch(`${API}/users/${profile.id}/photo`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                const updatedUser = { ...profile, photo: data.data.Photo || data.data.photo };
                localStorage.setItem("mori_user", JSON.stringify(updatedUser));
                setProfile(updatedUser);
            } else {
                throw new Error(data.error || "Gagal mengunggah foto");
            }
        } catch (err: any) {
            Swal.fire("Error", err.message || "Gagal mengunggah foto profil", "error");
        } finally {
            setUploadingPhoto(false);
        }
    };

    const exportCV = async () => {
        if (!profile) return;
        setGeneratingPDF(true);

        try {
            // Dynamic import for client-side only
            const jsPDF = (await import("jspdf")).default;
            const html2canvas = (await import("html2canvas")).default;

            const element = document.getElementById("cv-preview");
            if (!element) throw new Error("CV element not found");

            // Show CV preview temporarily
            element.style.display = "block";
            await new Promise((r) => setTimeout(r, 300));

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            element.style.display = "none";

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * pageWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const fileName = `CV_${(profile.name || "Siswa").replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`;
            pdf.save(fileName);

            Swal.fire({
                title: "CV Berhasil Diunduh! 📄",
                text: `File disimpan sebagai ${fileName}`,
                icon: "success",
                confirmButtonColor: "#006D77",
                timer: 3000,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Gagal membuat PDF, coba lagi.", "error");
        } finally {
            setGeneratingPDF(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        } catch {
            return dateStr;
        }
    };

    const getAge = (dateStr: string) => {
        if (!dateStr) return null;
        const diff = Date.now() - new Date(dateStr).getTime();
        const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        return age > 0 ? age : null;
    };

    const passedClasses = recaps.filter((r) => r.status === "Passed");
    const avgScore =
        recaps.length > 0
            ? (recaps.reduce((a, r) => a + r.final_score, 0) / recaps.length).toFixed(1)
            : "0";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 gap-3">
                <div className="w-5 h-5 border-2 border-[#006D77] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">Memuat profil...</span>
            </div>
        );
    }

    if (!profile) return null;

    const photoUrl = profile.photo ? `${API.replace("/api/v1", "")}${profile.photo}` : null;
    const initials = (profile.name || profile.email || "?")
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-16">
            {/* ── Header ── */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: "var(--accent)" }}>
                        プロフィール
                    </p>
                    <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)", letterSpacing: "-0.02em" }}>
                        Profil Saya
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                        Kelola data diri dan ekspor ke CV PDF
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {editing ? (
                        <>
                            <button
                                onClick={() => { setEditing(false); fetchProfile(); }}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors"
                                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                            >
                                <X size={14} /> Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                                style={{ background: "var(--accent)" }}
                            >
                                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:bg-gray-50"
                                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
                            >
                                <Edit3 size={14} /> Edit Profil
                            </button>
                            <button
                                onClick={exportCV}
                                disabled={generatingPDF}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-60 shadow-lg"
                                style={{ background: "linear-gradient(135deg, #006D77, #0A9396)", boxShadow: "0 4px 14px rgba(0,109,119,0.35)" }}
                            >
                                {generatingPDF ? (
                                    <><Loader2 size={15} className="animate-spin" /> Membuat PDF...</>
                                ) : (
                                    <><FileDown size={15} /> Ekspor CV PDF</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Left Column: Avatar + Stats ── */}
                <div className="space-y-4">
                    {/* Avatar Card */}
                    <div
                        className="rounded-2xl overflow-hidden text-center"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                    >
                        {/* Background gradient */}
                        <div className="h-24 bg-gradient-to-br from-[#006D77] to-[#0A9396] relative">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                        </div>
                        <div className="px-6 pb-6 -mt-12">
                            <div className="relative inline-block">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-[#5C5EA6] to-[#9999cc] flex items-center justify-center text-white text-2xl font-bold">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <label className={`absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110 ${uploadingPhoto ? "opacity-50 pointer-events-none" : ""}`} style={{ background: "var(--accent)", color: "white" }} title="Ubah foto">
                                    {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                                </label>
                            </div>
                            <h2 className="font-bold text-lg mt-3" style={{ color: "var(--text-primary)" }}>{profile.name || "—"}</h2>
                            <p className="text-xs font-medium mt-1 px-3 py-1.5 inline-block rounded-full" style={{ color: "#5C5EA6", background: "#EEEEF8" }}>
                                Siswa · 学生
                            </p>
                            {profile.nis && (
                                <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>NIS: <span className="font-semibold">{profile.nis}</span></p>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div
                        className="rounded-2xl p-5 space-y-4"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Statistik Akademik</p>
                        {[
                            { icon: GraduationCap, label: "Kelas Diikuti", value: enrollments.length, color: "#006D77", bg: "#E5F4F2" },
                            { icon: Award, label: "Kelas Lulus", value: passedClasses.length, color: "#2D6A4F", bg: "#D8F3DC" },
                            { icon: BookOpen, label: "Rata-rata Nilai", value: avgScore, color: "#B07D3A", bg: "#F5EDD9" },
                        ].map((s) => (
                            <div key={s.label} className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}>
                                    <s.icon size={16} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                                    <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{s.value}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Right Column: Form ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Personal Info Card */}
                    <div
                        className="rounded-2xl p-6"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                    >
                        <div className="flex items-center gap-2 mb-5">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E5F4F2", color: "#006D77" }}>
                                <User size={15} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Data Diri</h3>
                                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Informasi pribadi kamu</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ProfileField
                                label="Nama Lengkap"
                                icon={User}
                                editing={editing}
                                value={form.name}
                                displayValue={profile.name || "—"}
                                onChange={(v) => setForm({ ...form, name: v })}
                                placeholder="Nama lengkap"
                            />
                            <ProfileField
                                label="Email"
                                icon={Mail}
                                editing={false}
                                value={profile.email}
                                displayValue={profile.email || "—"}
                                onChange={() => {}}
                                disabled
                            />
                            <ProfileField
                                label="Nomor HP / WhatsApp"
                                icon={Phone}
                                editing={editing}
                                value={form.phone}
                                displayValue={profile.phone || "—"}
                                onChange={(v) => setForm({ ...form, phone: v })}
                                placeholder="+62 812 3456 7890"
                            />
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                                    Jenis Kelamin
                                </label>
                                {editing ? (
                                    <select
                                        value={form.gender}
                                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
                                        style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                                    >
                                        <option value="">— Pilih —</option>
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                ) : (
                                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                                        <Users size={14} style={{ color: "var(--text-muted)" }} />
                                        {profile.gender === "L" ? "Laki-laki" : profile.gender === "P" ? "Perempuan" : "—"}
                                    </div>
                                )}
                            </div>
                            <ProfileField
                                label="Tempat Lahir"
                                icon={Globe}
                                editing={editing}
                                value={form.place_of_birth}
                                displayValue={profile.place_of_birth || "—"}
                                onChange={(v) => setForm({ ...form, place_of_birth: v })}
                                placeholder="Kota kelahiran"
                            />
                            <div>
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                                    Tanggal Lahir
                                </label>
                                {editing ? (
                                    <input
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
                                        style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                                        <Calendar size={14} style={{ color: "var(--text-muted)" }} />
                                        <span>
                                            {formatDate(profile.date_of_birth)}
                                            {getAge(profile.date_of_birth) && (
                                                <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "#E5F4F2", color: "#006D77" }}>
                                                    {getAge(profile.date_of_birth)} tahun
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                                    Alamat Lengkap
                                </label>
                                {editing ? (
                                    <textarea
                                        value={form.address}
                                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                                        rows={3}
                                        placeholder="Alamat lengkap kamu..."
                                        className="w-full px-3.5 py-2.5 rounded-xl text-sm resize-none transition-all"
                                        style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                                    />
                                ) : (
                                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border-subtle)", color: "var(--text-primary)" }}>
                                        <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                                        <span className="leading-relaxed">{profile.address || "—"}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Enrolled Classes */}
                    {enrollments.length > 0 && (
                        <div
                            className="rounded-2xl p-6"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#D8F3DC", color: "#2D6A4F" }}>
                                    <GraduationCap size={15} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Riwayat Kelas</h3>
                                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{enrollments.length} kelas yang diikuti</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                {enrollments.map((cls) => {
                                    const recap = recaps.find((r) => r.class_id === cls.class_id);
                                    return (
                                        <div key={cls.class_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--bg-canvas)", border: "1px solid var(--border-subtle)" }}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                                                    <BookOpen size={13} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{cls.class_name}</p>
                                                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{cls.academic_year}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {recap ? (
                                                    <>
                                                        <span className="text-sm font-bold" style={{ color: recap.status === "Passed" ? "#2D6A4F" : recap.status === "Failed" ? "#E63946" : "var(--text-muted)" }}>
                                                            {recap.final_score.toFixed(1)}
                                                        </span>
                                                        <p className="text-[10px]" style={{ color: recap.status === "Passed" ? "#2D6A4F" : recap.status === "Failed" ? "#E63946" : "var(--text-muted)" }}>
                                                            {recap.status === "Passed" ? "✓ Lulus" : recap.status === "Failed" ? "✗ Tidak Lulus" : "In Progress"}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: "#E5F4F2", color: "#006D77" }}>Aktif</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Progress Chart ── */}
            <div
                className="rounded-2xl p-6"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EEF6FF", color: "#5C5EA6" }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Progres Nilai Akhir</h3>
                        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Diurutkan berdasarkan tanggal masuk kelas pertama</p>
                    </div>
                </div>
                <StudentProgressChart studentId={profile.id} />
            </div>

            {/* ── CV Preview (hidden, used for PDF export) ── */}
            <div id="cv-preview" style={{ display: "none", position: "fixed", left: "-9999px", top: 0, zIndex: -1, width: "794px" }}>
                <CVTemplate profile={profile} enrollments={enrollments} recaps={recaps} />
            </div>
        </div>
    );
}

// ── Helper Components ──────────────────────────────────────────────────────────

function ProfileField({
    label,
    icon: Icon,
    editing,
    value,
    displayValue,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    icon: React.ElementType;
    editing: boolean;
    value: string;
    displayValue: string;
    onChange: (v: string) => void;
    placeholder?: string;
    disabled?: boolean;
}) {
    return (
        <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5" style={{ color: "var(--text-muted)" }}>
                {label}
            </label>
            {editing && !disabled ? (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border)", color: "var(--text-primary)" }}
                />
            ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm" style={{ background: "var(--bg-canvas)", border: "1.5px solid var(--border-subtle)", color: "var(--text-primary)", opacity: disabled ? 0.7 : 1 }}>
                    <Icon size={14} style={{ color: "var(--text-muted)" }} />
                    {displayValue}
                </div>
            )}
        </div>
    );
}

// ── CV Template (for PDF Export) ──────────────────────────────────────────────

function CVTemplate({
    profile,
    enrollments,
    recaps,
}: {
    profile: UserProfile;
    enrollments: EnrolledClass[];
    recaps: GradeRecap[];
}) {
    const photoUrl = profile.photo ? `${API.replace("/api/v1", "")}${profile.photo}` : null;
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        try {
            return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
        } catch { return dateStr; }
    };
    const passedClasses = recaps.filter((r) => r.status === "Passed");
    const avgScore = recaps.length > 0 ? (recaps.reduce((a, r) => a + r.final_score, 0) / recaps.length).toFixed(1) : "0";

    return (
        <div style={{ fontFamily: "'Segoe UI', sans-serif", background: "#fff", color: "#0D1B2A", width: "794px", minHeight: "1123px" }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg, #006D77 0%, #0A9396 100%)", padding: "40px 48px", color: "white", display: "flex", alignItems: "center", gap: "28px" }}>
                {/* Avatar */}
                <div style={{ width: "96px", height: "96px", borderRadius: "50%", overflow: "hidden", border: "3px solid rgba(255,255,255,0.4)", background: "#5C5EA6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: "bold", color: "white", flexShrink: 0 }}>
                    {photoUrl ? (
                        <img src={photoUrl} alt="Photo" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                        (profile.name || "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                    )}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8, marginBottom: "4px" }}>Curriculum Vitae</div>
                    <div style={{ fontSize: "28px", fontWeight: 800, lineHeight: 1.2, marginBottom: "6px" }}>{profile.name || "—"}</div>
                    <div style={{ fontSize: "13px", opacity: 0.85, marginBottom: "4px" }}>Siswa LPK SO Mori Centre</div>
                    {profile.nis && <div style={{ fontSize: "12px", opacity: 0.7 }}>NIS: {profile.nis}</div>}
                </div>
                <div style={{ textAlign: "right", fontSize: "11px", opacity: 0.8 }}>
                    <div>Diterbitkan</div>
                    <div style={{ fontWeight: 700 }}>{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                </div>
            </div>

            <div style={{ padding: "36px 48px", display: "grid", gridTemplateColumns: "260px 1fr", gap: "36px" }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* Contact Info */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#006D77", borderBottom: "2px solid #006D77", paddingBottom: "6px", marginBottom: "14px" }}>
                            Informasi Kontak
                        </div>
                        {[
                            { label: "Email", value: profile.email },
                            { label: "Telepon", value: profile.phone || "—" },
                            { label: "Alamat", value: profile.address || "—" },
                        ].map((item) => (
                            <div key={item.label} style={{ marginBottom: "10px" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                                <div style={{ fontSize: "12px", color: "#0D1B2A", marginTop: "2px", lineHeight: 1.4 }}>{item.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Personal Data */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#006D77", borderBottom: "2px solid #006D77", paddingBottom: "6px", marginBottom: "14px" }}>
                            Data Pribadi
                        </div>
                        {[
                            { label: "Tempat Lahir", value: profile.place_of_birth || "—" },
                            { label: "Tanggal Lahir", value: formatDate(profile.date_of_birth) },
                            { label: "Jenis Kelamin", value: profile.gender === "L" ? "Laki-laki" : profile.gender === "P" ? "Perempuan" : "—" },
                        ].map((item) => (
                            <div key={item.label} style={{ marginBottom: "10px" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</div>
                                <div style={{ fontSize: "12px", color: "#0D1B2A", marginTop: "2px" }}>{item.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Stats */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#006D77", borderBottom: "2px solid #006D77", paddingBottom: "6px", marginBottom: "14px" }}>
                            Ringkasan
                        </div>
                        {[
                            { label: "Kelas Diikuti", value: enrollments.length },
                            { label: "Kelas Lulus", value: passedClasses.length },
                            { label: "Rata-rata Nilai", value: avgScore },
                        ].map((item) => (
                            <div key={item.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", padding: "6px 10px", background: "#F0FAFA", borderRadius: "6px" }}>
                                <span style={{ fontSize: "11px", color: "#444" }}>{item.label}</span>
                                <span style={{ fontSize: "11px", fontWeight: 700, color: "#006D77" }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    {/* About */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#006D77", borderBottom: "2px solid #006D77", paddingBottom: "6px", marginBottom: "14px" }}>
                            Tentang
                        </div>
                        <p style={{ fontSize: "12px", color: "#444", lineHeight: 1.7 }}>
                            Saya adalah siswa aktif di LPK SO Mori Centre, sebuah lembaga pelatihan kerja yang mempersiapkan tenaga kerja untuk bekerja di Jepang. Saya berdedikasi dalam mengikuti program pelatihan bahasa Jepang dan budaya kerja yang diajarkan di lembaga ini.
                        </p>
                    </div>

                    {/* Education / Kelas */}
                    <div>
                        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#006D77", borderBottom: "2px solid #006D77", paddingBottom: "6px", marginBottom: "14px" }}>
                            Riwayat Pendidikan / Pelatihan
                        </div>
                        {enrollments.length > 0 ? enrollments.map((cls) => {
                            const recap = recaps.find((r) => r.class_id === cls.class_id);
                            return (
                                <div key={cls.class_id} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: "1px dashed #E0E0E0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0D1B2A" }}>{cls.class_name}</div>
                                            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>LPK SO Mori Centre · {cls.academic_year}</div>
                                        </div>
                                        {recap && (
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: "14px", fontWeight: 800, color: recap.status === "Passed" ? "#2D6A4F" : recap.status === "Failed" ? "#E63946" : "#666" }}>
                                                    {recap.final_score.toFixed(1)}
                                                </div>
                                                <div style={{ fontSize: "10px", color: recap.status === "Passed" ? "#2D6A4F" : recap.status === "Failed" ? "#E63946" : "#888", fontWeight: 600 }}>
                                                    {recap.status === "Passed" ? "Lulus" : recap.status === "Failed" ? "Tidak Lulus" : "In Progress"}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {recap && (
                                        <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
                                            <div style={{ fontSize: "10px", color: "#666" }}>Tugas: <strong>{recap.assignment_avg.toFixed(1)}</strong></div>
                                            <div style={{ fontSize: "10px", color: "#666" }}>Ujian: <strong>{recap.exam_score.toFixed(1)}</strong></div>
                                            <div style={{ fontSize: "10px", color: "#666" }}>Final: <strong>{recap.final_score.toFixed(1)}</strong></div>
                                        </div>
                                    )}
                                </div>
                            );
                        }) : (
                            <p style={{ fontSize: "12px", color: "#999" }}>Belum ada data kelas.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ background: "#F8FAFA", borderTop: "1px solid #E0ECEC", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "10px", color: "#888" }}>Dokumen ini dibuat secara otomatis oleh LPK SO Mori Centre</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#006D77" }}>LPK SO Mori Centre</div>
            </div>
        </div>
    );
}
