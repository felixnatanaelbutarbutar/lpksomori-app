import { Users, GraduationCap, CalendarDays, CheckCircle2, TrendingUp } from "lucide-react";

const stats = [
    {
        name: "Siswa Aktif",
        nameJa: "在籍学生数",
        value: "420",
        change: "+12 bulan ini",
        icon: Users,
        accent: "#006D77",
        bg: "bg-[#006D77]/8",
    },
    {
        name: "Total Kelas",
        nameJa: "総クラス数",
        value: "15",
        change: "3 tahun ajaran",
        icon: GraduationCap,
        accent: "#E9C46A",
        bg: "bg-[#E9C46A]/10",
    },
    {
        name: "Tahun Aktif",
        nameJa: "現年度",
        value: "2025/2026",
        change: "Sedang berjalan",
        icon: CalendarDays,
        accent: "#4ECDC4",
        bg: "bg-[#4ECDC4]/10",
    },
    {
        name: "Ujian Selesai",
        nameJa: "完了試験数",
        value: "1,234",
        change: "+48 minggu ini",
        icon: CheckCircle2,
        accent: "#9B5DE5",
        bg: "bg-[#9B5DE5]/10",
    },
];

const recentActivities = [
    { text: "Quiz JLPT N4 berhasil diselesaikan oleh Kelas 3", time: "2 jam lalu", dot: "#006D77" },
    { text: "Tahun Ajaran 2025/2026 diinisialisasi dengan 5 kelas default", time: "1 hari lalu", dot: "#E9C46A" },
    { text: "Kelas 2 menambahkan Aktivitas Listening (聴解)", time: "2 hari lalu", dot: "#4ECDC4" },
    { text: "20 akun siswa baru berhasil didaftarkan oleh Admin", time: "3 hari lalu", dot: "#9B5DE5" },
];

const quickActions = [
    { label: "Buat Ujian", labelJa: "試験を作成", accent: "#006D77", emoji: "📝" },
    { label: "Tahun Ajaran Baru", labelJa: "新年度", accent: "#E9C46A", emoji: "📅" },
    { label: "Tambah Siswa", labelJa: "学生追加", accent: "#4ECDC4", emoji: "👤" },
    { label: "Bank Soal", labelJa: "問題集", accent: "#9B5DE5", emoji: "📚" },
];

export default function DashboardPage() {
    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-[#0D1B2A]">
                        Selamat Datang 👋
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5">
                        LPK SO Mori Centre — Portal Akademik Tahun 2025/2026
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm w-fit">
                    <TrendingUp size={13} className="text-[#006D77]" />
                    Data ter-update: Hari ini, 10:15 WIB
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {stats.map((stat) => (
                    <div
                        key={stat.name}
                        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 relative overflow-hidden group"
                    >
                        {/* Left accent border */}
                        <div
                            className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full"
                            style={{ background: stat.accent }}
                        />

                        <div className="flex items-start justify-between mb-4">
                            <div className={`${stat.bg} w-10 h-10 rounded-xl flex items-center justify-center`}>
                                <stat.icon size={18} style={{ color: stat.accent }} />
                            </div>
                        </div>

                        <p className="text-2xl font-bold text-[#0D1B2A] mb-1">{stat.value}</p>
                        <p className="text-sm font-medium text-gray-700">{stat.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{stat.nameJa}</p>
                        <div className="mt-3 pt-3 border-t border-gray-50">
                            <p className="text-xs text-gray-400">{stat.change}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent Activities — 3/5 */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
                        <h3 className="font-semibold text-[#0D1B2A] text-sm">Aktivitas Terbaru</h3>
                        <span className="text-xs text-[#006D77] font-medium cursor-pointer hover:underline">
                            Lihat semua →
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {recentActivities.map((a, i) => (
                            <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="mt-1.5 flex-shrink-0">
                                    <div className="w-2 h-2 rounded-full" style={{ background: a.dot }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-700 leading-snug">{a.text}</p>
                                    <p className="text-xs text-gray-400 mt-1">{a.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions — 2/5 */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-50">
                        <h3 className="font-semibold text-[#0D1B2A] text-sm">Aksi Cepat</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-3">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm bg-gray-50/50 hover:bg-white transition-all duration-150 group text-center"
                            >
                                <span className="text-2xl">{action.emoji}</span>
                                <div>
                                    <p className="text-xs font-semibold text-[#0D1B2A] group-hover:text-[#006D77] transition-colors">
                                        {action.label}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">{action.labelJa}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Branding mini-card */}
                    <div
                        className="mx-4 mb-4 rounded-xl p-4 text-white"
                        style={{
                            background: "linear-gradient(135deg, #006D77 0%, #004f54 100%)",
                        }}
                    >
                        <p className="text-xs font-semibold mb-1">森センター</p>
                        <p className="text-xs opacity-70 leading-relaxed">
                            日本語職業訓練センター<br />Academic Year 2025/2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
