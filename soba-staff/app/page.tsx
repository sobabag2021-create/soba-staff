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

// 1. Tự động sinh danh sách mốc ca Full-time từ 04:30 đến 11:00 (+10 tiếng)
const generateFullTimeShifts = () => {
  const shifts: string[] = ["Chọn ca", "Nghỉ"];
  let startMinutes = 4 * 60 + 30; // 04:30
  const endLimitMinutes = 11 * 60; // 11:00

  while (startMinutes <= endLimitMinutes) {
    const startH = Math.floor(startMinutes / 60);
    const startM = startMinutes % 60;

    const endMinutes = startMinutes + 10 * 60; // Cộng thêm 10 tiếng
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const formatTime = (h: number, m: number) =>
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

    shifts.push(`${formatTime(startH, startM)} - ${formatTime(endH, endM)}`);
    startMinutes += 30; // Mỗi ca cách nhau 30 phút
  }

  return shifts;
};

const FULL_TIME_SHIFTS = generateFullTimeShifts();

export default function AdminPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Thứ 2 làm đầu tuần
    return new Date(d.setDate(diff));
  });

  // Lưu trữ lịch đã chọn trên giao diện dạng matrix: [user_id_date]: { start, end }
  const [scheduleState, setScheduleState] = useState<{
    [key: string]: { start: string; end: string };
  }>({});

  useEffect(() => {
    fetchEmployeesAndSchedules();
  }, [currentWeekStart]);

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();

  async function fetchEmployeesAndSchedules() {
    // 1. Tải danh sách nhân viên
    const { data: empData, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .order("full_name");

    if (empErr) {
      console.error("Lỗi lấy danh sách nhân viên:", empErr);
      return;
    }
    setEmployees(empData || []);

    // 2. Tải lịch làm việc trong tuần hiện tại
    const startDateStr = weekDays[0].toISOString().split("T")[0];
    const endDateStr = weekDays[6].toISOString().split("T")[0];

    const { data: schedData, error: schedErr } = await supabase
      .from("schedules")
      .select("*")
      .gte("work_date", startDateStr)
      .lte("work_date", endDateStr);

    if (schedErr) {
      console.error("Lỗi lấy lịch làm việc:", schedErr);
      return;
    }

    const initialMap: { [key: string]: { start: string; end: string } } = {};
    schedData?.forEach((item: ScheduleRecord) => {
      const key = `${item.user_id}_${item.work_date}`;
      initialMap[key] = {
        start: item.start_time || "",
        end: item.end_time || "",
      };
    });

    setScheduleState(initialMap);
  }

  // Chuyển đổi ca chọn từ dropdown Full-time
  const handleFullTimeChange = (
    userId: string,
    dateStr: string,
    val: string
  ) => {
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
        [key]: { start, end },
      }));
    }
  };

  // Cập nhật giờ bắt đầu/kết thúc cho Part-time
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

  // Lưu lịch làm việc xuống cơ sở dữ liệu Supabase
  const handleSaveShift = async (userId: string, dateStr: string) => {
    const key = `${userId}_${dateStr}`;
    const shift = scheduleState[key];

    if (!shift || (!shift.start && !shift.end)) {
      alert("Vui lòng chọn hoặc nhập thời gian ca làm!");
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

    if (error) {
      alert("Lưu thất bại: " + error.message);
    } else {
      alert("Đã lưu lịch làm việc thành công!");
    }
  };

  const handlePrevWeek = () => {
    const p = new Date(currentWeekStart);
    p.setDate(p.getDate() - 7);
    setCurrentWeekStart(p);
  };

  const handleNextWeek = () => {
    const n = new Date(currentWeekStart);
    n.setDate(n.getDate() + 7);
    setCurrentWeekStart(n);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "sans-serif", background: "#f8f9fa" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>Quản Lý Lịch Làm Việc (Admin)</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button onClick={handlePrevWeek} style={btnStyle}>← Tuần trước</button>
          <strong>
            {weekDays[0].toLocaleDateString("vi-VN")} - {weekDays[6].toLocaleDateString("vi-VN")}
          </strong>
          <button onClick={handleNextWeek} style={btnStyle}>Tuần sau →</button>
        </div>
      </div>

      <div style={{ overflowX: "auto", background: "#fff", borderRadius: "8px", padding: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ padding: "12px", minWidth: "160px" }}>Nhân viên</th>
              {weekDays.map((d, i) => (
                <th key={i} style={{ padding: "12px", minWidth: "140px", textAlign: "center" }}>
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"][i]}
                  <br />
                  <span style={{ fontSize: "12px", color: "#666" }}>
                    {d.getDate()}/{d.getMonth() + 1}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>
                  <strong>{emp.full_name}</strong>
                  <div style={{ fontSize: "12px", color: "#666" }}>
                    {emp.type === "full_time" ? "Full-time" : "Part-time"}
                  </div>
                </td>

                {weekDays.map((d, i) => {
                  const dateStr = d.toISOString().split("T")[0];
                  const key = `${emp.user_id}_${dateStr}`;
                  const currentData = scheduleState[key] || { start: "", end: "" };

                  return (
                    <td key={i} style={{ padding: "8px", textAlign: "center" }}>
                      {emp.type === "full_time" ? (
                        /* Giao diện dành cho Full-time */
                        <div>
                          <select
                            value={
                              currentData.start === "OFF"
                                ? "Nghỉ"
                                : currentData.start && currentData.end
                                ? `${currentData.start} - ${currentData.end}`
                                : "Chọn ca"
                            }
                            onChange={(e) =>
                              handleFullTimeChange(emp.user_id, dateStr, e.target.value)
                            }
                            style={inputStyle}
                          >
                            {FULL_TIME_SHIFTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        /* Giao diện dành cho Part-time */
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <input
                            type="time"
                            value={currentData.start || ""}
                            onChange={(e) =>
                              handlePartTimeChange(emp.user_id, dateStr, "start", e.target.value)
                            }
                            style={inputStyle}
                          />
                          <input
                            type="time"
                            value={currentData.end || ""}
                            onChange={(e) =>
                              handlePartTimeChange(emp.user_id, dateStr, "end", e.target.value)
                            }
                            style={inputStyle}
                          />
                        </div>
                      )}

                      <button
                        onClick={() => handleSaveShift(emp.user_id, dateStr)}
                        style={saveBtnStyle}
                      >
                        Lưu
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnStyle = {
  background: "#e8ece9",
  border: "none",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "bold" as const,
};

const inputStyle = {
  width: "100%",
  padding: "6px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  marginBottom: "4px",
  boxSizing: "border-box" as const,
  fontSize: "13px",
};

const saveBtnStyle = {
  width: "100%",
  background: "#2d5240",
  color: "#fff",
  border: "none",
  padding: "6px",
  borderRadius: "4px",
  cursor: "pointer",
  fontWeight: "bold" as const,
  fontSize: "12px",
};
