"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, AlertCircle, BarChart2 } from "lucide-react";

const API = "http://localhost:8080/api/v1";

export interface ProgressPoint {
    class_id: number;
    class_name: string;
    academic_year: string;
    enrolled_at: string;
    final_score: number | null;
    status: string;
}

interface StudentProgressChartProps {
    studentId: number;
    compact?: boolean; // compact mode for modals
}

export function StudentProgressChart({ studentId, compact = false }: StudentProgressChartProps) {
    const [data, setData] = useState<ProgressPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        setError(null);
        const token = localStorage.getItem("mori_token") ?? "";
        fetch(`${API}/users/${studentId}/progress`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((json) => {
                setData(json.data ?? []);
            })
            .catch(() => setError("Gagal memuat data progres"))
            .finally(() => setLoading(false));
    }, [studentId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2" style={{ height: compact ? "120px" : "200px", color: "var(--text-muted)" }}>
                <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-border)", borderTopColor: "transparent" }} />
                <span className="text-xs">Memuat chart...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center gap-2" style={{ height: compact ? "120px" : "200px", color: "var(--text-muted)" }}>
                <AlertCircle size={16} />
                <span className="text-xs">{error}</span>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-2" style={{ height: compact ? "120px" : "200px", color: "var(--text-muted)" }}>
                <BarChart2 size={24} style={{ opacity: 0.3 }} />
                <span className="text-xs">Belum ada data kelas</span>
            </div>
        );
    }

    // Points that have scores (for the line)
    const scored = data.filter((d) => d.final_score !== null);
    const scores = scored.map((d) => d.final_score as number);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const best = scores.length > 0 ? Math.max(...scores) : 0;
    const trend =
        scored.length >= 2
            ? scored[scored.length - 1].final_score! - scored[0].final_score!
            : 0;

    // SVG chart dimensions
    const W = 100;
    const H = compact ? 55 : 70;
    const PAD_L = 6;
    const PAD_R = 6;
    const PAD_T = 8;
    const PAD_B = 12;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const minScore = 0;
    const maxScore = 100;

    const getX = (i: number, total: number) => {
        if (total <= 1) return PAD_L + chartW / 2;
        return PAD_L + (i / (total - 1)) * chartW;
    };

    const getY = (score: number) => {
        return PAD_T + chartH - ((score - minScore) / (maxScore - minScore)) * chartH;
    };

    // Build polyline points for scored items only, but with their actual index in `data`
    const linePoints: { x: number; y: number; point: ProgressPoint; dataIdx: number }[] = [];
    data.forEach((pt, dataIdx) => {
        if (pt.final_score !== null) {
            const x = getX(dataIdx, data.length);
            const y = getY(pt.final_score);
            linePoints.push({ x, y, point: pt, dataIdx });
        }
    });

    const polyline = linePoints.map((p) => `${p.x},${p.y}`).join(" ");

    // Reference lines (70 = pass threshold)
    const refY70 = getY(70);

    const statusColor = (status: string) => {
        if (status === "Passed") return "#2D6A4F";
        if (status === "Failed") return "#E63946";
        return "#888";
    };

    const height = compact ? 180 : 260;

    return (
        <div className="space-y-3">
            {/* Stats row */}
            {!compact && (
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {
                            label: "Rata-rata",
                            value: `${avg.toFixed(1)}`,
                            sub: "nilai akhir",
                            color: "#006D77",
                            bg: "#E5F4F2",
                        },
                        {
                            label: "Terbaik",
                            value: `${best.toFixed(1)}`,
                            sub: "nilai tertinggi",
                            color: "#2D6A4F",
                            bg: "#D8F3DC",
                        },
                        {
                            label: "Tren",
                            value: trend > 0 ? `+${trend.toFixed(1)}` : trend < 0 ? trend.toFixed(1) : "±0",
                            sub: trend > 0 ? "meningkat" : trend < 0 ? "menurun" : "stabil",
                            color: trend > 0 ? "#2D6A4F" : trend < 0 ? "#E63946" : "#888",
                            bg: trend > 0 ? "#D8F3DC" : trend < 0 ? "#FDECEA" : "#F5F5F5",
                            icon: trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus,
                        },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="rounded-xl p-3 flex items-center gap-2.5"
                            style={{ background: s.bg }}
                        >
                            {s.icon && <s.icon size={16} style={{ color: s.color, flexShrink: 0 }} />}
                            <div>
                                <p className="text-xs font-bold leading-tight" style={{ color: s.color }}>
                                    {s.value}
                                </p>
                                <p className="text-[10px]" style={{ color: s.color, opacity: 0.7 }}>
                                    {s.label} · {s.sub}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* SVG Chart */}
            <div
                className="relative rounded-2xl overflow-hidden"
                style={{
                    background: "var(--bg-canvas)",
                    border: "1px solid var(--border-subtle)",
                    padding: compact ? "12px 12px 8px" : "16px 16px 10px",
                }}
            >
                {!compact && (
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
                        Progres Nilai Akhir Per Kelas (diurutkan tanggal masuk)
                    </p>
                )}
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full"
                    style={{ height: compact ? "80px" : "130px" }}
                    onMouseLeave={() => setHoveredIdx(null)}
                >
                    {/* Gradient fill */}
                    <defs>
                        <linearGradient id={`grad-${studentId}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#006D77" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#006D77" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {/* Reference line at 70 (pass threshold) */}
                    {!compact && (
                        <>
                            <line
                                x1={PAD_L}
                                y1={refY70}
                                x2={W - PAD_R}
                                y2={refY70}
                                stroke="#E63946"
                                strokeWidth="0.4"
                                strokeDasharray="1.5,1.5"
                                opacity="0.5"
                            />
                            <text x={W - PAD_R - 0.5} y={refY70 - 1.5} fontSize="2.8" fill="#E63946" textAnchor="end" opacity="0.6">
                                Lulus
                            </text>
                        </>
                    )}

                    {/* Horizontal axis */}
                    <line
                        x1={PAD_L}
                        y1={H - PAD_B}
                        x2={W - PAD_R}
                        y2={H - PAD_B}
                        stroke="var(--border)"
                        strokeWidth="0.4"
                        opacity="0.5"
                    />

                    {/* Fill area under line */}
                    {linePoints.length >= 2 && (
                        <polygon
                            points={`${linePoints.map((p) => `${p.x},${p.y}`).join(" ")} ${linePoints[linePoints.length - 1].x},${H - PAD_B} ${linePoints[0].x},${H - PAD_B}`}
                            fill={`url(#grad-${studentId})`}
                        />
                    )}

                    {/* Line */}
                    {linePoints.length >= 2 && (
                        <polyline
                            points={polyline}
                            fill="none"
                            stroke="#006D77"
                            strokeWidth="1.2"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Dots for ALL data points (black = no score yet, colored = scored) */}
                    {data.map((pt, i) => {
                        const x = getX(i, data.length);
                        const hasScore = pt.final_score !== null;
                        const y = hasScore ? getY(pt.final_score!) : H - PAD_B;
                        const isHovered = hoveredIdx === i;

                        return (
                            <g key={pt.class_id}>
                                {/* Invisible hit area */}
                                <rect
                                    x={x - 4}
                                    y={PAD_T}
                                    width={8}
                                    height={chartH + 4}
                                    fill="transparent"
                                    onMouseEnter={() => setHoveredIdx(i)}
                                    style={{ cursor: "pointer" }}
                                />

                                {/* Vertical guide line on hover */}
                                {isHovered && (
                                    <line
                                        x1={x}
                                        y1={PAD_T}
                                        x2={x}
                                        y2={H - PAD_B}
                                        stroke="#006D77"
                                        strokeWidth="0.5"
                                        strokeDasharray="1,1"
                                        opacity="0.5"
                                    />
                                )}

                                {/* Dot */}
                                {hasScore && (
                                    <>
                                        {/* Glow on hover */}
                                        {isHovered && (
                                            <circle cx={x} cy={y} r="3" fill="#006D77" opacity="0.2" />
                                        )}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={isHovered ? "2" : "1.5"}
                                            fill="white"
                                            stroke={statusColor(pt.status)}
                                            strokeWidth="1"
                                        />
                                    </>
                                )}

                                {/* Circle for no-score (in-progress) */}
                                {!hasScore && !compact && (
                                    <circle
                                        cx={x}
                                        cy={H - PAD_B}
                                        r="1.2"
                                        fill="#ccc"
                                        onMouseEnter={() => setHoveredIdx(i)}
                                        style={{ cursor: "pointer" }}
                                    />
                                )}

                                {/* X-axis label */}
                                {!compact && (
                                    <text
                                        x={x}
                                        y={H - 1}
                                        fontSize="2.2"
                                        fill={isHovered ? "#006D77" : "var(--text-muted, #888)"}
                                        textAnchor="middle"
                                        style={{ fontWeight: isHovered ? "bold" : "normal" }}
                                    >
                                        {pt.class_name.length > 8 ? pt.class_name.slice(0, 8) + "…" : pt.class_name}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredIdx !== null && data[hoveredIdx] && (() => {
                    const pt = data[hoveredIdx];
                    return (
                        <div
                            className="absolute pointer-events-none z-10 rounded-xl shadow-lg px-3 py-2"
                            style={{
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border)",
                                boxShadow: "var(--shadow-lg)",
                                top: "12px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                minWidth: "140px",
                                maxWidth: "200px",
                            }}
                        >
                            <p className="text-xs font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                                {pt.class_name}
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                                {pt.academic_year} · {new Date(pt.enrolled_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>Nilai Akhir</span>
                                {pt.final_score !== null ? (
                                    <span
                                        className="text-sm font-black"
                                        style={{ color: statusColor(pt.status) }}
                                    >
                                        {pt.final_score.toFixed(1)}
                                    </span>
                                ) : (
                                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Belum ada</span>
                                )}
                            </div>
                            <div className="mt-0.5 flex justify-end">
                                <span
                                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                    style={{
                                        color: statusColor(pt.status),
                                        background: pt.status === "Passed" ? "#D8F3DC" : pt.status === "Failed" ? "#FDECEA" : "#F0F0F0",
                                    }}
                                >
                                    {pt.status === "Passed" ? "Lulus" : pt.status === "Failed" ? "Tidak Lulus" : "In Progress"}
                                </span>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Class legend / list */}
            {!compact && (
                <div className="space-y-1.5">
                    {data.map((pt, i) => (
                        <div
                            key={pt.class_id}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl transition-colors"
                            style={{
                                background: hoveredIdx === i ? "var(--bg-subtle)" : "transparent",
                                border: "1px solid transparent",
                                cursor: "default",
                            }}
                            onMouseEnter={() => setHoveredIdx(i)}
                            onMouseLeave={() => setHoveredIdx(null)}
                        >
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ background: statusColor(pt.status) }}
                            >
                                {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                                    {pt.class_name}
                                </p>
                                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                                    {pt.academic_year} · Masuk{" "}
                                    {new Date(pt.enrolled_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                {pt.final_score !== null ? (
                                    <>
                                        <p className="text-sm font-black" style={{ color: statusColor(pt.status) }}>
                                            {pt.final_score.toFixed(1)}
                                        </p>
                                        <p className="text-[9px] font-semibold" style={{ color: statusColor(pt.status), opacity: 0.8 }}>
                                            {pt.status === "Passed" ? "Lulus" : pt.status === "Failed" ? "Tidak Lulus" : "—"}
                                        </p>
                                    </>
                                ) : (
                                    <span
                                        className="text-[10px] px-2 py-0.5 rounded-full"
                                        style={{ background: "#F0F4FF", color: "#5C5EA6" }}
                                    >
                                        In Progress
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
