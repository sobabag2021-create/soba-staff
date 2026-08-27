"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Attendance = {
  id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  employees: {
    full_name: string;
  } | null;
};

export default function AttendancePage() {
  const [attendance, setAttendance] =
    useState<Attendance[]>([]);

  async function loadAttendance() {
    const { data } = await supabase
      .from("attendance")
      .select(`
        id,
        work_date,
        check_in,
        check_out,
        employees (
          full_name
        )
      `)
      .order("work_date", {
        ascending: false,
      });

    setAttendance(
      (data as Attendance[]) || []
    );
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <h1>SOBA<br />STAFF</h1>

        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/employees">Nhân viên</Link>
        <Link href="/admin/schedule">Lịch làm</Link>
        <Link href="/admin/requests">Đơn từ</Link>
        <Link href="/admin/attendance">Chấm công</Link>
        <Link href="/admin/report">Báo cáo</Link>
      </aside>

      <main className="admin-main">
        <h1>Chấm công</h1>

        <section className="list-card">
          {attendance.map((item) => (
            <div
              className="attendance-row"
              key={item.id}
            >
              <strong>
                {item.employees?.full_name ||
                  "Không xác định"}
              </strong>

              <span>
                Ngày: {item.work_date}
              </span>

              <span>
                Check-in:{" "}
                {item.check_in
                  ? new Date(
                      item.check_in
                    ).toLocaleTimeString(
                      "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "--:--"}
              </span>

              <span>
                Check-out:{" "}
                {item.check_out
                  ? new Date(
                      item.check_out
                    ).toLocaleTimeString(
                      "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )
                  : "--:--"}
              </span>
            </div>
          ))}

          {attendance.length === 0 && (
            <p>Chưa có dữ liệu chấm công.</p>
          )}
        </section>
      </main>
    </div>
  );
}
