"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Employee = {
  id: string;
  user_id: string;
  full_name: string;
  type: "full_time" | "part_time";
};

type ScheduleRecord = {
  id?: string;
  user_id: string;
  work_date: string;
  start_time: string;
  end_time: string;
};

const generateFullTimeShifts = () => {
  const shifts: string[] = ["Chọn ca", "Nghỉ"];
  let startMinutes = 4 * 60 + 30; // 04:30
  const endLimitMinutes = 11 * 60; // 11:00

  while (startMinutes <= endLimitMinutes) {
    const startH = Math.floor(startMinutes / 60);
    const startM = startMinutes % 60;

    const endMinutes = startMinutes + 10 * 60; // +10 tiếng
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    shifts.push(`${formatTime(startH, startM)} - ${formatTime(endH, endM)}`);
    startMinutes += 30;
  }

  return shifts;
};

const FULL_TIME_SHIFTS = generateFullTimeShifts();

export default function AdminPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scheduleState, setScheduleState] = useState<{
    [key: string]: { start: string; end: string };
  }>({});

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    fetchEmployeesAndSchedules();
  }, [currentWeekStart]);

  async function fetchEmployeesAndSchedules() {
    setLoading(true);
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");

      setEmployees(empData || []);

      const startDateStr = formatDate(weekDays[0]);
      const endDateStr = formatDate(weekDays[6]);

      const { data: schedData } = await supabase
        .from("schedules")
        .select("*")
        .gte("work_date", startDateStr)
        .lte("work_date", endDateStr);

      const initialMap: { [key: string]: { start: string; end: string } } = {};
      schedData?.forEach((item: ScheduleRecord) => {
        const key = `${item.user_id}_${item.work_date}`;
        initialMap[key] = {
          start: item.start_time || "",
          end: item.end_time || "",
        };
      });

      setScheduleState(initialMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleFullTimeChange = (userId: string, dateStr: string, val: string) => {
    const key = `${userId}_${dateStr}`;
    if (val === "Chọn ca" || val === "Nghỉ") {
      setScheduleState((prev) => ({
        ...prev,
        [key]: { start: val === "Nghỉ" ? "OFF" : "", end: "" },
      }));
    } else {
      const [start, end] = val.split(" - ");
      setScheduleState((prev) => ({
        ...prev,
        [key]: { start: start || "", end: end || "" },
      }));
    }
  };

  const handlePartTimeChange = (
    userId: string,
    dateStr: string,
    field: "start" | "end",
    val: string
  ) => {
    const key = `${userId}_${dateStr}`;
    setScheduleState((prev) => ({
      ...prev,
      [key]: {
        start: field === "start" ? val : prev[key]?.start || "",
        end: field === "end" ? val : prev[key]?.end || "",
      },
    }));
  };

  const handleSaveShift = async (userId: string, dateStr: string) => {
    const key = `${userId}_${dateStr}`;
    const shift = scheduleState[key];

    if (!shift || (!shift.start && !shift.end)) {
      alert("Vui lòng chọn hoặc nhập ca làm!");
      return;
    }

    const payload = {
      user_id: userId,
      work_date: dateStr,
      start_time: shift.start === "OFF" ? "Nghỉ" : shift.start,
      end_time: shift.start === "OFF" ? "Nghỉ" : shift.end,
    };

    const { error } = await supabase
      .from("schedules")
      .upsert(payload, { onConflict: "user_id,work_date" });

    if (error) alert("Lỗi: " + error.message);
    else alert("Đã lưu thành công!");
  };

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", background: "#f5f6f8", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "24px", color: "#1a1a1a" }}>Quản Lý Lịch Làm Việc (Admin)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))}
            style={navBtnStyle}
          >
            ← Tuần trước
          </button>
          <span style={{ fontWeight: "bold", fontSize: "14px" }}>
            {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1}/{weekDays[0].getFullYear()} -{" "}
            {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}/{weekDays[6].getFullYear()}
          </span>
          <button
            onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))}
            style={navBtnStyle}
          >
            Tuần sau →
          </button>
        </div>
      </div>

      {/* Bảng dữ liệu khung cứng */}
      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>Đang tải dữ liệu...</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "1200px" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "14px", width: "180px", textAlign: "left", color: "#475569" }}>Nhân viên</th>
                {weekDays.map((d, i) => (
                  <th key={i} style={{ padding: "12px", width: "140px", textAlign: "center", color: "#475569" }}>
                    <div>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: "normal" }}>
                      {d.getDate()}/{d.getMonth() + 1}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {/* Cột tên */}
                  <td style={{ padding: "14px" }}>
                    <div style={{ fontWeight: "bold", color: "#1e293b", fontSize: "14px" }}>{emp.full_name}</div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                      {emp.type === "full_time" ? "Full-time" : "Part-time"}
                    </div>
                  </td>

                  {/* Cột các ngày */}
                  {weekDays.map((d, i) => {
                    const dateStr = formatDate(d);
                    const key = `${emp.user_id}_${dateStr}`;
                    const currentData = scheduleState[key] || { start: "", end: "" };

                    const selectedValue =
                      currentData.start === "OFF"
                        ? "Nghỉ"
                        : currentData.start && currentData.end
                        ? `${currentData.start} - ${currentData.end}`
                        : "Chọn ca";

                    return (
                      <td key={i} style={{ padding: "10px", textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {emp.type === "full_time" ? (
                            <select
                              value={selectedValue}
                              onChange={(e) => handleFullTimeChange(emp.user_id, dateStr, e.target.value)}
                              style={selectStyle}
                            >
                              {FULL_TIME_SHIFTS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <input
                                type="time"
                                value={currentData.start === "OFF" ? "" : currentData.start || ""}
                                onChange={(e) => handlePartTimeChange(emp.user_id, dateStr, "start", e.target.value)}
                                style={inputTimeStyle}
                              />
                              <input
                                type="time"
                                value={currentData.start === "OFF" ? "" : currentData.end || ""}
                                onChange={(e) => handlePartTimeChange(emp.user_id, dateStr, "end", e.target.value)}
                                style={inputTimeStyle}
                              />
                            </div>
                          )}

                          <button onClick={() => handleSaveShift(emp.user_id, dateStr)} style={saveBtnStyle}>
                            Lưu
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Inline Styles cố định kích thước
const navBtnStyle = {
  background: "#e2e8f0",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "13px",
};

const selectStyle = {
  width: "100%",
  height: "36px",
  padding: "0 8px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "13px",
  background: "#fff",
  cursor: "pointer",
  outline: "none",
};

const inputTimeStyle = {
  width: "100%",
  height: "32px",
  padding: "0 6px",
  borderRadius: "6px",
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box" as const,
};

const saveBtnStyle = {
  width: "100%",
  height: "32px",
  background: "#2d5240",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "12px",
};
