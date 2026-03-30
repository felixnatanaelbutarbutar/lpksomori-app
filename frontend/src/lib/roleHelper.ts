/**
 * Role-based permission system for LPK SO Mori Centre
 * Inspired by the Laravel RoleHelper pattern.
 *
 * Three roles:
 *  - admin   → Super Admin, full access
 *  - teacher → Guru / 先生, manages own classes & courses
 *  - student → Siswa / 学生, limited to taking exams & viewing results
 */

export type Role = "admin" | "teacher" | "student";

export type Feature =
    | "dashboard"
    | "student_dashboard"
    | "announcements"
    | "users"
    | "academic_years"
    | "classes"
    | "teacher_assignments"
    | "teacher_exams"
    | "admin_exams"
    | "exams"
    | "question_bank"
    | "my_results"
    | "notifications"
    | "reports"
    | "settings"
    | "my_class"
    | "student_assignments"
    | "student_recap";

type PermissionMap = Record<Feature, boolean>;

const PERMISSIONS: Record<Role, PermissionMap> = {
    admin: {
        dashboard: true,
        student_dashboard: false,
        announcements: true,
        users: true,
        academic_years: true,
        classes: true,
        teacher_assignments: false,
        teacher_exams: false,
        admin_exams: true,
        exams: false,
        question_bank: true,
        my_results: false,
        notifications: true,
        reports: true,
        settings: true,
        my_class: false,
        student_assignments: false,
        student_recap: false,
    },
    teacher: {
        dashboard: true,
        student_dashboard: false,
        announcements: true,
        users: false,
        academic_years: false,
        classes: true,
        teacher_assignments: true,
        teacher_exams: true,
        admin_exams: false,
        exams: false,
        question_bank: false,
        my_results: false,
        notifications: true,
        reports: true,
        settings: false,
        my_class: false,
        student_assignments: false,
        student_recap: false,
    },
    student: {
        dashboard: false,
        student_dashboard: true,
        announcements: true,
        users: false,
        academic_years: false,
        classes: false,
        teacher_assignments: false,
        teacher_exams: false,
        admin_exams: false,
        exams: false,            // accessed via my-class, not sidebar
        question_bank: false,
        my_results: false,       // replaced by student_recap
        notifications: true,
        reports: false,
        settings: false,
        my_class: true,
        student_assignments: false, // accessed via my-class, not sidebar
        student_recap: true,
    },
};

/** Returns the full permission map for a role */
export function getRolePermissions(role: Role): PermissionMap {
    return PERMISSIONS[role] ?? PERMISSIONS.student;
}

/** Returns true if the role has access to a feature */
export function hasPermission(role: Role, feature: Feature): boolean {
    return getRolePermissions(role)[feature] === true;
}

/** Returns a safe Role from a raw string (defaults to "student") */
export function parseRole(raw: string | null | undefined): Role {
    if (raw === "admin" || raw === "teacher" || raw === "student") return raw;
    return "student";
}

// ─── Navigation Menu ──────────────────────────────────────────────────────────

export interface NavItem {
    name: string;
    nameJa?: string;
    href: string;
    icon: string; // Lucide icon name
    feature: Feature;
}

export const ALL_NAV_ITEMS: NavItem[] = [
    {
        name: "Dashboard",
        nameJa: "ダッシュボード",
        href: "/dashboard",
        icon: "LayoutDashboard",
        feature: "dashboard",
    },
    {
        name: "Dashboard",
        nameJa: "ダッシュボード",
        href: "/dashboard/students/dashboard",
        icon: "LayoutDashboard",
        feature: "student_dashboard",
    },
    {
        name: "Pengumuman",
        nameJa: "お知らせ",
        href: "/dashboard/announcements",
        icon: "Megaphone",
        feature: "announcements",
    },
    {
        name: "Manajemen Pengguna",
        nameJa: "ユーザー管理",
        href: "/dashboard/users",
        icon: "Users",
        feature: "users",
    },
    {
        name: "Tahun Ajaran",
        nameJa: "年度管理",
        href: "/dashboard/academic",
        icon: "CalendarDays",
        feature: "academic_years",
    },
    {
        name: "Kelas",
        nameJa: "クラス管理",
        href: "/dashboard/classes",
        icon: "BookOpen",
        feature: "classes",
    },
    {
        name: "Manajemen Tugas",
        nameJa: "課題管理",
        href: "/dashboard/teacher/assignments",
        icon: "ClipboardList",
        feature: "teacher_assignments",
    },
    {
        name: "Manajemen Ujian",
        nameJa: "試験管理",
        href: "/dashboard/teacher/exams",
        icon: "FileText",
        feature: "teacher_exams",
    },
    {
        name: "Manajemen Ujian",
        nameJa: "試験管理",
        href: "/dashboard/admin/exams",
        icon: "FileText",
        feature: "admin_exams",
    },
    {
        name: "Bank Soal",
        nameJa: "問題集",
        href: "/dashboard/questions",
        icon: "Database",
        feature: "question_bank",
    },

    {
        name: "Rekap Nilai Saya",
        nameJa: "成績確認",
        href: "/dashboard/students/my-recap",
        icon: "BarChart2",
        feature: "student_recap",
    },
    {
        name: "Kelas Saya",
        nameJa: "マイクラス",
        href: "/dashboard/students/my-class",
        icon: "GraduationCap",
        feature: "my_class",
    },
    {
        name: "Notifikasi",
        nameJa: "通知",
        href: "/dashboard/notifications",
        icon: "Bell",
        feature: "notifications",
    },
    {
        name: "Rekap Nilai",
        nameJa: "成績確認",
        href: "/dashboard/teacher/recap",
        icon: "PieChart",
        feature: "reports",
    },
    {
        name: "Pengaturan",
        nameJa: "設定",
        href: "/dashboard/settings",
        icon: "Settings",
        feature: "settings",
    },
    {
        name: "Tugas Siswa",
        href: "/dashboard/students/assignments",
        icon: "ClipboardList",
        feature: "student_assignments",
    },
    {
        name: "Ujian Siswa",
        href: "/dashboard/students/exams",
        icon: "FileText",
        feature: "exams",
    },
];

/** Returns only the nav items the given role can access */
export function getNavigationMenu(role: Role): NavItem[] {
    const permissions = getRolePermissions(role);
    return ALL_NAV_ITEMS.filter((item) => permissions[item.feature] === true);
}

// ─── Role Meta ────────────────────────────────────────────────────────────────

export const ROLE_META: Record<
    Role,
    { label: string; labelJa: string; color: string; bg: string }
> = {
    admin: {
        label: "Super Admin",
        labelJa: "管理者",
        color: "#0D7A6F",
        bg: "#E5F4F2",
    },
    teacher: {
        label: "Guru",
        labelJa: "先生",
        color: "#B07D3A",
        bg: "#F5EDD9",
    },
    student: {
        label: "Siswa",
        labelJa: "学生",
        color: "#5C5EA6",
        bg: "#EEEEF8",
    },
};
