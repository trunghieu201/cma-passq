"use client";

import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Clock, Zap, TrendingUp } from "lucide-react";

interface ChartPoint {
  week: string;
  plannedCumulative: number;
  actualCumulative: number | null;
  plannedWeekly: number;
  actualWeekly: number | null;
}

interface StudyHoursChartProps {
  data: ChartPoint[];
  thisWeekHours: number;
  thisWeekTarget: number;
  averageSpeed: number;
  statusMessage: string;
}

export function StudyHoursChart({
  data,
  thisWeekHours,
  thisWeekTarget,
  averageSpeed,
  statusMessage,
}: StudyHoursChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  // Chart Dimensions
  const svgWidth = 760;
  const svgHeight = 260;
  const paddingLeft = 45;
  const paddingRight = 35;
  const paddingTop = 25;
  const paddingBottom = 40;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Scaling calculations
  const maxHours = Math.max(
    ...data.map((d) => Math.max(d.plannedCumulative, d.actualCumulative || 0)),
    60
  );

  const getX = (index: number) =>
    paddingLeft + (index / (data.length - 1)) * plotWidth;
  const getY = (hours: number) =>
    paddingTop + plotHeight - (hours / maxHours) * plotHeight;

  // SVG Paths
  const plannedPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.plannedCumulative)}`)
    .join(" ");

  const actualDataPoints = data.filter((d) => d.actualCumulative !== null);
  const actualPath = actualDataPoints
    .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d.actualCumulative!)}`)
    .join(" ");

  const actualAreaPath =
    actualDataPoints.length > 0
      ? `${actualPath} L ${getX(actualDataPoints.length - 1)} ${
          paddingTop + plotHeight
        } L ${getX(0)} ${paddingTop + plotHeight} Z`
      : "";

  // Grid steps (4 horizontal lines)
  const gridSteps = [0, maxHours * 0.33, maxHours * 0.66, maxHours];

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <Card
      data-testid="study-curve-chart"
      className="w-full border-border shadow-sm"
    >
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp className="size-5 text-brand-600" />
              Tiến độ học tập theo tuần (Cộng dồn)
            </CardTitle>
            <CardDescription className="text-xs text-ink-600">
              So sánh thời gian học thực tế với kế hoạch để đảm bảo hoàn thành trước ngày thi.
            </CardDescription>
          </div>
          {/* Chart Legend */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#dc2626]" />
              <span className="text-ink-600">Kế hoạch (cộng dồn)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-1 bg-[#1f6fb2] rounded-full" />
              <span className="text-ink-900 font-semibold">Đã học thật</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Responsive SVG Chart */}
        <div className="relative w-full aspect-[760/260] select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f6fb2" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#1f6fb2" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis Labels */}
            {gridSteps.map((step, idx) => {
              const y = getY(step);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#eceaf0"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#948b94"
                    fontFamily="inherit"
                  >
                    {Math.round(step)}h
                  </text>
                </g>
              );
            })}

            {/* X-Axis Labels */}
            {data.map((d, i) => (
              <text
                key={i}
                x={getX(i)}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize="11"
                fill={i === hoverIndex ? "#dc2626" : "#6e5c61"}
                fontWeight={i === hoverIndex ? "bold" : "normal"}
                fontFamily="inherit"
              >
                {d.week}
              </text>
            ))}

            {/* Actual Logged Hours Area */}
            {actualAreaPath && (
              <path d={actualAreaPath} fill="url(#actualGradient)" />
            )}

            {/* Planned Target Curve (Dashed Red) */}
            <path
              d={plannedPath}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />

            {/* Actual Logged Curve (Solid Blue) */}
            <path
              d={actualPath}
              fill="none"
              stroke="#1f6fb2"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Data Point Circles and Invisible Hover Targets */}
            {data.map((d, i) => {
              const cx = getX(i);
              const cyPlanned = getY(d.plannedCumulative);
              const cyActual =
                d.actualCumulative !== null ? getY(d.actualCumulative) : null;
              const isHovered = hoverIndex === i;

              return (
                <g key={i}>
                  {/* Planned Point */}
                  <circle
                    cx={cx}
                    cy={cyPlanned}
                    r={isHovered ? 4.5 : 3}
                    fill="#dc2626"
                  />

                  {/* Actual Point */}
                  {cyActual !== null && (
                    <circle
                      cx={cx}
                      cy={cyActual}
                      r={isHovered ? 6 : 4.5}
                      fill="#1f6fb2"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  )}

                  {/* Large Invisible Hover Target */}
                  <rect
                    x={cx - plotWidth / (data.length * 2)}
                    y={paddingTop}
                    width={plotWidth / data.length}
                    height={plotHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(i)}
                    onMouseLeave={() => setHoverIndex(null)}
                  />
                </g>
              );
            })}
          </svg>

          {/* Floating Hover Tooltip */}
          {activePoint && hoverIndex !== null && (
            <div
              className="absolute z-20 pointer-events-none bg-ink-900/95 text-white text-xs rounded-lg p-2.5 shadow-xl backdrop-blur-sm -translate-x-1/2 -translate-y-full transition-all duration-150"
              style={{
                left: `${(getX(hoverIndex) / svgWidth) * 100}%`,
                top: `${
                  (getY(
                    activePoint.actualCumulative ?? activePoint.plannedCumulative
                  ) /
                    svgHeight) *
                    100 -
                  4
                }%`,
              }}
            >
              <div className="font-bold border-b border-white/20 pb-1 mb-1.5 flex justify-between gap-3">
                <span>{activePoint.week}</span>
                <span className="text-brand-300">
                  {activePoint.actualCumulative !== null
                    ? "Đã ghi nhận"
                    : "Dự kiến"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px] text-gray-300">
                <span>Kế hoạch:</span>
                <span className="font-mono font-bold text-red-400">
                  {activePoint.plannedCumulative.toFixed(1)}h
                </span>
              </div>
              {activePoint.actualCumulative !== null && (
                <>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-gray-300">
                    <span>Thực tế:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {activePoint.actualCumulative.toFixed(1)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] pt-1 mt-1 border-t border-white/10 font-medium">
                    <span>Chênh lệch:</span>
                    <span
                      className={`font-mono font-bold ${
                        activePoint.actualCumulative >=
                        activePoint.plannedCumulative
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {activePoint.actualCumulative >=
                      activePoint.plannedCumulative
                        ? "+"
                        : ""}
                      {(
                        activePoint.actualCumulative -
                        activePoint.plannedCumulative
                      ).toFixed(1)}
                      h
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Metrics Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-2 border-t border-ink-100 text-xs">
          <div className="flex items-center gap-2 text-ink-700">
            <Clock className="size-4 text-brand-600 shrink-0" />
            <span>
              Tuần này: <strong>{thisWeekHours}</strong> / {thisWeekTarget} giờ (
              {Math.min(
                100,
                Math.round((thisWeekHours / (thisWeekTarget || 1)) * 100)
              )}
              %)
            </span>
          </div>
          <div className="flex items-center gap-2 text-ink-700">
            <Zap className="size-4 text-blue-600 shrink-0" />
            <span>
              Tốc độ trung bình: <strong>{averageSpeed}</strong> phút/câu
            </span>
          </div>
          <div className="flex items-center sm:justify-end text-ink-700 font-medium">
            <span>{statusMessage}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
