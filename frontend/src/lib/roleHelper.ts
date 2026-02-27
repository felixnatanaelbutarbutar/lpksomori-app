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
    | "users"
    | "academic_years"
    | "classes"
    | "courses"
    | "exams"
    | "question_bank"
    | "my_courses"
    | "my_results"
    | "reports"
    | "settings";

type PermissionMap = Record<Feature, boolean>;

const PERMISSIONS: Record<Role, PermissionMap> = {
    admin: {
        dashboard: true,
        users: true,          // Manage teacher & student accounts
        academic_years: true, // Create / manage academic years
        classes: true,        // View & manage all classes
        courses: true,        // Manage all courses
        exams: true,          // Create & manage exams / quizzes
        question_bank: true,  // Full question bank access
        my_courses: false,    // N/A for admin
        my_results: false,    // N/A for admin
        reports: true,        // View all reports & analytics
        settings: true,       // System settings
    },
    teacher: {
        dashboard: true,
        users: false,         // Cannot manage accounts
        academic_years: false, // Read-only via dashboard
        classes: true,         // View own classes
        courses: true,         // Manage own courses
        exams: true,           // Create exams for own courses
        question_bank: true,   // Create & manage own questions
        my_courses: false,
        my_results: false,
        reports: true,         // View reports for own classes
        settings: false,
    },
    student: {
        dashboard: true,
        users: false,
        academic_years: false,
        classes: false,
        courses: false,
        exams: false,
        question_bank: false,
        my_courses: true,   // View enrolled courses
        my_results: true,   // View own exam results
        reports: false,
        settings: false,
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

const ALL_NAV_ITEMS: NavItem[] = [
    {
        name: "Dashboard",
        nameJa: "ダッシュボード",
        href: "/dashboard",
        icon: "LayoutDashboard",
        feature: "dashboard",
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
        name: "Mata Pelajaran",
        nameJa: "科目管理",
        href: "/dashboard/courses",
        icon: "GraduationCap",
        feature: "courses",
    },
    {
        name: "Ujian & Kuis",
        nameJa: "試験管理",
        href: "/dashboard/exams",
        icon: "FileText",
        feature: "exams",
    },
    {
        name: "Bank Soal",
        nameJa: "問題集",
        href: "/dashboard/questions",
        icon: "Database",
        feature: "question_bank",
    },
    {
        name: "Pelajaran Saya",
        nameJa: "マイコース",
        href: "/dashboard/my-courses",
        icon: "BookMarked",
        feature: "my_courses",
    },
    {
        name: "Hasil Ujian",
        nameJa: "成績確認",
        href: "/dashboard/my-results",
        icon: "BarChart2",
        feature: "my_results",
    },
    {
        name: "Laporan",
        nameJa: "レポート",
        href: "/dashboard/reports",
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
        color: "#006D77",
        bg: "#006D7714",
    },
    teacher: {
        label: "Guru",
        labelJa: "先生",
        color: "#E9A800",
        bg: "#E9A80014",
    },
    student: {
        label: "Siswa",
        labelJa: "学生",
        color: "#7B5EA7",
        bg: "#7B5EA714",
    },
};
