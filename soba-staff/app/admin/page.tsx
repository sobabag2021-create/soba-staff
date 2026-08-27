"use client";

import { useEffect, useState } from "react";
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

const getLocalISOString = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${date}`;
};

const FULL_TIME_SHIFTS = (() => {
  const shifts: string[] = ["Chọn ca", "Nghỉ"];
  let start = 4 * 60 + 30;
  const endLimit = 11 * 60;

  while (start <= endLimit) {
    const sH = String(Math.floor(start / 60)).padStart(2, "0");
    const sM = String(start % 60).padStart(2, "0");
    const endMinutes = start + 10 * 60;
    const eH = String(Math.floor(endMinutes / 60)).padStart(2, "0");
    const eM = String(endMinutes % 60).padStart(2, "0");

    shifts.push(`${sH}:${sM} - ${eH}:${eM}`);
    start += 30;
  }
  return shifts;
})();

export default function AdminPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scheduleState, setScheduleState] = useState<{ [key: string]: { start: string; end: string } }>({});

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

  useEffect(() => {
    loadAdminData();
  }, [currentWeekStart]);

  async function loadAdminData() {
    setLoading(true);
    try {
      const { data: empData } = await supabase
        .from("employees")
        .select("*")
        .order("full_name");

      setEmployees(empData || []);

      const startDateStr = getLocalISOString(weekDays[0]);
      const endDateStr = getLocalISOString(weekDays[6]);

      const { data: schedData } = await supabase
        .from("schedules")
        .select("*")
        .gte("work_date", startDateStr)
        .lte("work_date", endDateStr);

      const map: { [key: string]: { start: string; end: string } } = {};
      schedData?.forEach((item: ScheduleRecord) => {
        map[`${item.user_id}_${item.work_date}`] = {
          start: item.start_time || "",
          end: item.end_time || "",
        };
      });

      setScheduleState(map);
    } catch (err) {
      console.error(err);
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

  const handlePartTimeChange = (userId: string, dateStr: string, field: "start" | "end", val: string) => {
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
      alert("Vui lòng chọn ca làm việc!");
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

    if (error) alert("Lỗi lưu: " + error.message);
    else alert("Đã lưu thành công!");
  };

  const changeWeek = (days: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + days);
    setCurrentWeekStart(newStart);
  };

  return (
    <div style={{ padding: "20px", fontFamily: "system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header điều hướng */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#0f172a", margin: 0 }}>
          Quản Lý Lịch Làm Việc (Admin)
        </h1>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button onClick={() => changeWeek(-7)} style={btnNavStyle}>
            ← Tuần trước
          </button>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#334155" }}>
            {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1}/{weekDays[0].getFullYear()} -{" "}
            {weekDays[6].getDate()}/{weekDays[6].getMonth() + 1}/{weekDays[6].getFullYear()}
          </span>
          <button onClick={() => changeWeek(7)} style={btnNavStyle}>
            Tuần sau →
          </button>
        </div>
      </div>

      {/* Khung chứa bảng */}
      <div style={{ background: "#ffffff", borderRadius: "8px", border: "1px solid #cbd5e1", overflowX: "auto" }}>
        <div style={{ minWidth: "1100px" }}>
          <div style={{ display: "flex", background: "#f1f5f9", borderBottom: "2px solid #cbd5e1", padding: "12px 0" }}>
            <div style={{ width: "180px", paddingLeft: "16px", fontWeight: "bold", color: "#475569" }}>Nhân viên</div>
            {weekDays.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#475569" }}>
                <div>{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}</div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "normal" }}>
                  {d.getDate()}/{d.getMonth() + 1}
                </div>
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Đang tải danh sách...</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#64748b" }}>Chưa có nhân viên nào.</div>
          ) : (
            employees.map((emp) => (
              <div
                key={emp.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #e2e8f0",
                  padding: "10px 0",
                  background: "#fff",
                }}
              >
                <div style={{ width: "180px", paddingLeft: "16px" }}>
                  <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "14px" }}>{emp.full_name}</div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    {emp.type === "full_time" ? "Full-time" : "Part-time"}
                  </div>
                </div>

                {weekDays.map((d, i) => {
                  const dateStr = getLocalISOString(d);
                  const key = `${emp.user_id}_${dateStr}`;
                  const currentData = scheduleState[key] || { start: "", end: "" };

                  const selectedVal =
                    currentData.start === "OFF"
                      ? "Nghỉ"
                      : currentData.start && currentData.end
                      ? `${currentData.start} - ${currentData.end}`
                      : "Chọn ca";

                  return (
                    <div key={i} style={{ flex: 1, padding: "0 4px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {emp.type === "full_time" ? (
                        <select
                          value={selectedVal}
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
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <input
                            type="time"
                            value={currentData.start === "OFF" ? "" : currentData.start || ""}
                            onChange={(e) => handlePartTimeChange(emp.user_id, dateStr, "start", e.target.value)}
                            style={inputStyle}
                          />
                          <input
                            type="time"
                            value={currentData.start === "OFF" ? "" : currentData.end || ""}
                            onChange={(e) => handlePartTimeChange(emp.user_id, dateStr, "end", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                      )}

                      <button onClick={() => handleSaveShift(emp.user_id, dateStr)} style={btnSaveStyle}>
                        Lưu
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const btnNavStyle = {
  background: "#e2e8f0",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "bold" as const,
  cursor: "pointer",
  color: "#334155",
};

const selectStyle = {
  width: "100%",
  height: "30px",
  borderRadius: "4px",
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  background: "#fff",
  outline: "none",
};

const inputStyle = {
  width: "100%",
  height: "26px",
  borderRadius: "4px",
  border: "1px solid #cbd5e1",
  fontSize: "11px",
  padding: "0 4px",
  boxSizing: "border-box" as const,
  outline: "none",
};

const btnSaveStyle = {
  width: "100%",
  height: "26px",
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
  fontWeight: "bold" as const,
};
