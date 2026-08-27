"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Request = {
  id: string;
  request_type: string;
  request_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: string;
  employees: {
    full_name: string;
  } | null;
};

const requestLabels: Record<
  string,
  string
> = {
  leave: "Xin nghỉ",
  late: "Đi muộn",
  early_leave: "Về sớm",
  overtime: "Tăng ca",
  checkin_missing: "Bổ sung công",
};

export default function RequestsPage() {
  const [requests, setRequests] =
    useState<Request[]>([]);

  async function loadRequests() {
    const { data } = await supabase
      .from("requests")
      .select(`
        *,
        employees (
          full_name
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    setRequests(
      (data as Request[]) || []
    );
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function updateStatus(
    id: string,
    status: string
  ) {
    const { error } = await supabase
      .from("requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadRequests();
  }

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
        <h1>Đơn từ</h1>

        <section className="list-card">
          {requests.map((request) => (
            <div
              key={request.id}
              className="request-row"
            >
              <div>
                <strong>
                  {request.employees?.full_name}
                </strong>

                <p>
                  {
                    requestLabels[
                      request.request_type
                    ]
                  }
                </p>

                <p>
                  Ngày: {request.request_date}
                </p>

                {request.start_time && (
                  <p>
                    Bắt đầu:{" "}
                    {request.start_time.slice(
                      0,
                      5
                    )}
                  </p>
                )}

                {request.end_time && (
                  <p>
                    Kết thúc:{" "}
                    {request.end_time.slice(
                      0,
                      5
                    )}
                  </p>
                )}

                <p>
                  Lý do:{" "}
                  {request.reason || "Không có"}
                </p>
              </div>

              <div>
                <span
                  className={`status ${request.status}`}
                >
                  {request.status === "pending"
                    ? "Chờ duyệt"
                    : request.status ===
                      "approved"
                    ? "Đã duyệt"
                    : "Từ chối"}
                </span>

                {request.status ===
                  "pending" && (
                  <div className="action-buttons">
                    <button
                      onClick={() =>
                        updateStatus(
                          request.id,
                          "approved"
                        )
                      }
                    >
                      Duyệt
                    </button>

                    <button
                      className="danger"
                      onClick={() =>
                        updateStatus(
                          request.id,
                          "rejected"
                        )
                      }
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <p>Chưa có yêu cầu nào.</p>
          )}
        </section>
      </main>
    </div>
  );
}
