"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Employee = {
  id: string;
  full_name: string;
};

type Attendance = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  late_minutes: number | null;
  makeup_minutes: number | null;
  penalty_amount: number | null;
  status: string;
};

const WORK_START_HOUR = 8;
const WORK_START_MINUTE = 0;

// Làm đủ 9 tiếng
const WORK_DURATION_HOURS = 9;

// Phạt 5.000đ mỗi phút đi muộn
const PENALTY_PER_MINUTE = 5000;

function getVietnamDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatTime(dateString: string | null) {
  if (!dateString) return "--:--";

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatMoney(amount: number | null) {
  const value = Number(amount || 0);

  return `${value.toLocaleString("vi-VN")}đ`;
}

function getMinimumCheckout(checkIn: string | null) {
  if (!checkIn) return "--:--";

  const checkInDate = new Date(checkIn);

  const minimumCheckout = new Date(
    checkInDate.getTime() +
      WORK_DURATION_HOURS * 60 * 60 * 1000
  );

  return formatTime(minimumCheckout.toISOString());
}

export default function Home() {
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);

  async function loadData() {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        window.location.href = "/login";
        return;
      }

      const { data: employeeData, error: employeeError } =
        await supabase
          .from("employees")
          .select("id, full_name")
          .eq("auth_user_id", user.id)
          .single();

      if (employeeError || !employeeData) {
        alert(
          "Không tìm thấy thông tin nhân viên. Vui lòng kiểm tra bảng employees."
        );
        return;
      }

      setEmployee(employeeData);

      const today = getVietnamDateString();

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select(`
          id,
          employee_id,
          work_date,
          check_in,
          check_out,
          late_minutes,
          makeup_minutes,
          penalty_amount,
          status
        `)
        .eq("employee_id", employeeData.id)
        .eq("work_date", today)
        .maybeSingle();

      if (attendanceError) {
        console.error(attendanceError);
      }

      setAttendance(attendanceData || null);
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCheckIn() {
    if (!employee) return;

    if (attendance?.check_in) {
      alert("Bạn đã check-in hôm nay rồi.");
      return;
    }

    setProcessing(true);

    try {
      const now = new Date();

      const vietnamNow = new Date(
        now.toLocaleString("en-US", {
          timeZone: "Asia/Ho_Chi_Minh",
        })
      );

      const workStart = new Date(vietnamNow);

      workStart.setHours(
        WORK_START_HOUR,
        WORK_START_MINUTE,
        0,
        0
      );

      const lateMinutes = Math.max(
        0,
        Math.floor(
          (vietnamNow.getTime() - workStart.getTime()) /
            60000
        )
      );

      const penaltyAmount =
        lateMinutes * PENALTY_PER_MINUTE;

      const today = getVietnamDateString();

      const { error } = await supabase
        .from("attendance")
        .insert({
          employee_id: employee.id,
          work_date: today,
          check_in: now.toISOString(),
          check_out: null,
          late_minutes: lateMinutes,
          makeup_minutes: 0,
          penalty_amount: penaltyAmount,
          status: "checked_in",
        });

      if (error) {
        console.error(error);
        alert(`Không thể check-in: ${error.message}`);
        return;
      }

      alert("Check-in thành công.");

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi check-in.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleCheckOut() {
    if (!attendance) {
      alert("Bạn chưa check-in.");
      return;
    }

    if (!attendance.check_in) {
      alert("Bạn chưa check-in.");
      return;
    }

    if (attendance.check_out) {
      alert("Bạn đã check-out hôm nay rồi.");
      return;
    }

    setProcessing(true);

    try {
      const now = new Date();

      const minimumCheckoutTime =
        new Date(attendance.check_in).getTime() +
        WORK_DURATION_HOURS * 60 * 60 * 1000;

      // Không cho checkout trước khi đủ 9 tiếng
      if (now.getTime() < minimumCheckoutTime) {
        alert(
          `Bạn chưa đủ giờ làm. Check out tối thiểu lúc ${getMinimumCheckout(
            attendance.check_in
          )}`
        );

        return;
      }

      const { error } = await supabase
        .from("attendance")
        .update({
          check_out: now.toISOString(),
          status: "checked_out",
        })
        .eq("id", attendance.id);

      if (error) {
        console.error(error);
        alert(`Không thể check-out: ${error.message}`);
        return;
      }

      alert("Check-out thành công.");

      await loadData();
    } catch (error) {
      console.error(error);
      alert("Có lỗi khi check-out.");
    } finally {
      setProcessing(false);
    }
  }

  const lateMinutes =
    Number(attendance?.late_minutes || 0);

  const penaltyAmount =
    Number(attendance?.penalty_amount || 0);

  const checkedIn =
    Boolean(attendance?.check_in);

  const checkedOut =
    Boolean(attendance?.check_out);

  return (
    <main
      style={{
        maxWidth: "650px",
        margin: "0 auto",
        padding: "30px 20px 60px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "34px",
          marginBottom: "30px",
          letterSpacing: "1px",
        }}
      >
        SOBA STAFF
      </h1>

      {loading ? (
        <p>Đang tải...</p>
      ) : (
        <>
          <section
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "20px",
              padding: "28px",
              marginBottom: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "26px",
                marginTop: 0,
                marginBottom: "25px",
              }}
            >
              Xin chào,{" "}
              {employee?.full_name || "Nhân viên"} 👋
            </h2>

            <div style={rowStyle}>
              <span>Ca làm hôm nay</span>
              <b>08:00 - 17:00</b>
            </div>

            <div style={rowStyle}>
              <span>Trạng thái</span>
              <b>
                {checkedOut
                  ? "Đã check-out"
                  : checkedIn
                  ? "Đã check-in"
                  : "Chưa check-in"}
              </b>
            </div>

            {checkedIn && (
              <>
                <div style={rowStyle}>
                  <span>Check in</span>
                  <b>
                    {formatTime(
                      attendance?.check_in || null
                    )}
                  </b>
                </div>

                <div style={rowStyle}>
                  <span>Đi muộn</span>
                  <b>
                    {lateMinutes > 0
                      ? `${lateMinutes} phút`
                      : "Không muộn"}
                  </b>
                </div>

                <div style={rowStyle}>
                  <span>Phạt</span>
                  <b>{formatMoney(penaltyAmount)}</b>
                </div>

                <div style={rowStyle}>
                  <span>Check out tối thiểu</span>
                  <b>
                    {getMinimumCheckout(
                      attendance?.check_in || null
                    )}
                  </b>
                </div>
              </>
            )}

            {checkedOut && (
              <div style={rowStyle}>
                <span>Check out thực tế</span>
                <b>
                  {formatTime(
                    attendance?.check_out || null
                  )}
                </b>
              </div>
            )}
          </section>

          <button
            onClick={handleCheckIn}
            disabled={
              processing ||
              checkedIn
            }
            style={{
              width: "100%",
              padding: "17px",
              border: "none",
              borderRadius: "14px",
              background:
                checkedIn ? "#999" : "#236b46",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "16px",
              cursor:
                checkedIn || processing
                  ? "not-allowed"
                  : "pointer",
              marginBottom: "16px",
            }}
          >
            {processing
              ? "ĐANG XỬ LÝ..."
              : checkedIn
              ? "ĐÃ CHECK IN"
              : "CHECK IN"}
          </button>

          <section
            style={{
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "20px",
              padding: "28px",
            }}
          >
            <button
              onClick={handleCheckOut}
              disabled={
                processing ||
                !checkedIn ||
                checkedOut
              }
              style={{
                width: "100%",
                padding: "17px",
                border: "none",
                borderRadius: "14px",
                background:
                  !checkedIn || checkedOut
                    ? "#999"
                    : "#236b46",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "16px",
                cursor:
                  !checkedIn ||
                  checkedOut ||
                  processing
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {processing
                ? "ĐANG XỬ LÝ..."
                : checkedOut
                ? "ĐÃ CHECK OUT"
                : "CHECK OUT"}
            </button>

            <p
              style={{
                marginBottom: 0,
                marginTop: "18px",
                fontSize: "15px",
              }}
            >
              {checkedOut
                ? "Bạn đã hoàn thành check-out hôm nay."
                : checkedIn
                ? `Bạn có thể check-out từ ${getMinimumCheckout(
                    attendance?.check_in || null
                  )}.`
                : "Check-in để bắt đầu ghi nhận thời gian làm việc."}
            </p>
          </section>
        </>
      )}
    </main>
  );
}

const rowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "20px",
  padding: "12px 0",
  borderBottom: "1px solid #eee",
  fontSize: "16px",
};
