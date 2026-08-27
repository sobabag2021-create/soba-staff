"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Shift = {
  dayName: string;
  dateStr: string;
  time: string;
  isToday?: boolean;
};

type RequestItem = {
  id: string;
  type: string;
  date: string;
  timeRange?: string;
  reason?: string;
  status: "Đã duyệt" | "Chờ duyệt" | "Từ chối";
};

export default function EmployeePage() {
  const router = useRouter();

  const [employeeName, setEmployeeName] = useState("test");
  const [employeeType, setEmployeeType] = useState("full_time");

  // State Chấm công
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);

  // State Yêu cầu
  const [requestType, setRequestType] = useState("Xin nghỉ");
  const [requestDate, setRequestDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [myRequests, setMyRequests] = useState<RequestItem[]>([]);

  // State quản lý ngày bắt đầu tuần (Thứ 2)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  const [scheduleList, setScheduleList] = useState<Shift[]>([]);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    fetchScheduleForWeek(currentWeekStart);
  }, [currentWeekStart]);

  async function loadEmployeeData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: emp } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (emp) {
      setEmployeeName(emp.full_name || "Nhân viên");
      setEmployeeType(emp.type || "full_time");
    }
  }

  // Chuyển sang tuần trước
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekStart);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekStart(prev);
  };

  // Chuyển sang tuần sau
  const handleNextWeek = () => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + 7);
    setCurrentWeekStart(next);
  };

  // Hiển thị dải ngày Tuần
  const getWeekRangeLabel = () => {
    const end = new Date(currentWeekStart);
    end.setDate(end.getDate() + 6);

    const format = (d: Date) =>
      `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    return `${format(currentWeekStart)} - ${format(end)}`;
  };

  // Tải dữ liệu lịch từ Supabase theo tuần
  async function fetchScheduleForWeek(startDate: Date) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: shifts } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user.id)
      .gte("work_date", startStr)
      .lte("work_date", endStr);

    const daysOfWeek = [
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
      "Chủ nhật",
    ];
    const todayStr = new Date().toISOString().split("T")[0];

    const days: Shift[] = daysOfWeek.map((dayName, index) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + index);
      const dateIso = d.toISOString().split("T")[0];
      const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

      const matchedShift = shifts?.find((s: any) => s.work_date === dateIso);

      return {
        dayName,
        dateStr: dateFormatted,
        time: matchedShift
          ? `${matchedShift.start_time} - ${matchedShift.end_time}`
          : "Nghỉ",
        isToday: dateIso === todayStr,
      };
    });

    setScheduleList(days);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleCheckIn() {
    const now = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setCheckInTime(now);
  }

  async function handleCheckOut() {
    const now = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setCheckOutTime(now);
  }

  async function handleSubmitRequest() {
    if (!reason) {
      alert("Vui lòng nhập lý do");
      return;
    }

    const newReq: RequestItem = {
      id: Date.now().toString(),
      type: requestType,
      date: requestDate,
      reason: reason,
      status: "Chờ duyệt",
    };

    setMyRequests([newReq, ...myRequests]);
    setReason("");
    alert("Đã gửi yêu cầu thành công!");
  }

  return (
    <div
      style={{
        background: "#f4f4f0",
        minHeight: "100vh",
        padding: "20px 0 60px 0",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 16px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                margin: 0,
                color: "#1e1e1e",
              }}
            >
              SOBA STAFF
            </h1>
            <span style={{ fontSize: "14px", color: "#666" }}>
              Giao diện nhân viên
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: "#2d5240",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "500",
            }}
          >
            Đăng xuất
          </button>
        </div>

        {/* Thông tin nhân viên */}
        <div
          style={{
            background: "#2d5240",
            color: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "14px", opacity: 0.9 }}>Xin chào</div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              margin: "6px 0",
            }}
          >
            {employeeName}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.8 }}>{employeeType}</div>
        </div>

        {/* Chấm công hôm nay */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Chấm công hôm nay
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                background: "#f2f2f2",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "8px",
                }}
              >
                Check-in
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: checkInTime ? "#2d5240" : "#1e1e1e",
                }}
              >
                {checkInTime || "--:--"}
              </div>
            </div>

            <div
              style={{
                background: "#f2f2f2",
                borderRadius: "12px",
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                  marginBottom: "8px",
                }}
              >
                Check-out
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: checkOutTime ? "#2d5240" : "#1e1e1e",
                }}
              >
                {checkOutTime || "--:--"}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <button
              onClick={handleCheckIn}
              disabled={!!checkInTime}
              style={{
                background: checkInTime ? "#8fa398" : "#2d5240",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "14px",
                fontWeight: "bold",
                cursor: checkInTime ? "not-allowed" : "pointer",
              }}
            >
              CHECK-IN
            </button>
            <button
              onClick={handleCheckOut}
              disabled={!checkInTime || !!checkOutTime}
              style={{
                background: checkOutTime || !checkInTime ? "#c8d1cc" : "#2d5240",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "14px",
                fontWeight: "bold",
                cursor: checkOutTime || !checkInTime ? "not-allowed" : "pointer",
              }}
            >
              CHECK-OUT
            </button>
          </div>
        </div>

        {/* Lịch làm việc */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
              Lịch làm việc
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              <button
                onClick={handlePrevWeek}
                style={{
                  border: "none",
                  background: "#e8ece9",
                  color: "#2d5240",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                ← Tuần trước
              </button>
              <span>{getWeekRangeLabel()}</span>
              <button
                onClick={handleNextWeek}
                style={{
                  border: "none",
                  background: "#e8ece9",
                  color: "#2d5240",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Tuần sau →
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            {scheduleList.map((item, idx) => (
              <div
                key={idx}
                style={{
                  border: item.isToday
                    ? "2px solid #2d5240"
                    : "1px solid #eaeaea",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "#fff",
                }}
              >
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  {item.dayName}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#888",
                    marginBottom: "12px",
                  }}
                >
                  {item.dateStr}
                </div>
                <div
                  style={{
                    background: item.time === "Nghỉ" ? "transparent" : "#eef2ef",
                    color: item.time === "Nghỉ" ? "#888" : "#1e1e1e",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    textAlign: "center",
                    fontWeight: "bold",
                    fontSize: "14px",
                  }}
                >
                  {item.time}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gửi yêu cầu */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "20px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Gửi yêu cầu
          </h2>

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "16px",
            }}
          >
            {[
              "Xin nghỉ",
              "Đi muộn",
              "Về sớm",
              "Tăng ca",
              "Bổ sung công",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setRequestType(tab)}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border:
                    requestType === tab
                      ? "2px solid #2d5240"
                      : "1px solid #ccc",
                  background: requestType === tab ? "#eef2ef" : "#fff",
                  color: "#1e1e1e",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <input
            type="date"
            value={requestDate}
            onChange={(e) => setRequestDate(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "16px",
              boxSizing: "border-box",
              fontSize: "14px",
            }}
          />

          <textarea
            placeholder="Nhập lý do..."
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginBottom: "16px",
              boxSizing: "border-box",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />

          <button
            onClick={handleSubmitRequest}
            style={{
              width: "100%",
              background: "#2d5240",
              color: "#fff",
              padding: "14px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            Gửi yêu cầu
          </button>
        </div>

        {/* Yêu cầu của tôi */}
        <div
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
          }}
        >
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "bold",
              marginTop: 0,
              marginBottom: "20px",
            }}
          >
            Yêu cầu của tôi
          </h2>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {/* Dữ liệu mẫu tĩnh */}
            <div
              style={{
                border: "1px solid #eaeaea",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  Bổ sung công
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    margin: "4px 0",
                  }}
                >
                  Ngày: 22/8/2026
                </div>
                <div style={{ fontSize: "13px", fontWeight: "bold" }}>
                  Thời gian: 08:00 - 19:00
                </div>
              </div>
              <span
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Đã duyệt
              </span>
            </div>

            <div
              style={{
                border: "1px solid #eaeaea",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                  Xin về sớm
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    margin: "4px 0",
                  }}
                >
                  Ngày: 23/8/2026
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  Thời gian: --:-- - 07:00
                </div>
                <div style={{ fontSize: "13px", color: "#444" }}>
                  <strong>Lý do:</strong> c HÀ yc
                </div>
              </div>
              <span
                style={{
                  background: "#e8f5e9",
                  color: "#2e7d32",
                  padding: "4px 12px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Đã duyệt
              </span>
            </div>

            {/* Các yêu cầu mới */}
            {myRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: "1px solid #eaeaea",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    {req.type}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#666",
                      margin: "4px 0",
                    }}
                  >
                    Ngày: {req.date}
                  </div>
                  <div style={{ fontSize: "13px", color: "#444" }}>
                    <strong>Lý do:</strong> {req.reason}
                  </div>
                </div>
                <span
                  style={{
                    background: "#fff3e0",
                    color: "#e65100",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
