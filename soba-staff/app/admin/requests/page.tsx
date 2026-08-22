"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type RequestItem = {
  id: string;

  employee_id: string;

  request_type: string;

  request_date: string;

  start_time: string | null;

  end_time: string | null;

  reason: string | null;

  status: string;

  admin_note: string | null;

  created_at: string;

  employee: {
    full_name: string;
  } | null;
};

function requestTypeLabel(type: string) {
  if (type === "leave") {
    return "Xin nghỉ";
  }

  if (type === "late") {
    return "Xin đi muộn";
  }

  if (type === "early_leave") {
    return "Xin về sớm";
  }

  if (type === "overtime") {
    return "Xin tăng ca";
  }

  return type;
}

function statusLabel(status: string) {
  if (status === "pending") {
    return "Chờ duyệt";
  }

  if (status === "approved") {
    return "Đã duyệt";
  }

  if (status === "rejected") {
    return "Từ chối";
  }

  return status;
}

export default function AdminRequestsPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [requests, setRequests] =
    useState<RequestItem[]>([]);

  const [filter, setFilter] =
    useState("pending");

  const [notes, setNotes] =
    useState<
      Record<string, string>
    >({});

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [filter]);

  async function checkAdmin() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");

      return;
    }

    const {
      data: employee,
    } = await supabase
      .from("employees")
      .select("*")
      .eq(
        "auth_user_id",
        user.id
      )
      .single();

    if (
      !employee ||
      employee.role !== "admin"
    ) {
      router.replace("/employee");

      return;
    }

    setLoading(false);
  }

  async function loadRequests() {
    let query = supabase
      .from("requests")
      .select(`
        *,
        employee:employees(
          full_name
        )
      `)
      .order("created_at", {
        ascending: false,
      });

    if (filter !== "all") {
      query = query.eq(
        "status",
        filter
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      console.error(error);

      return;
    }

    setRequests(
      (data || []) as RequestItem[]
    );
  }

  async function updateRequest(
    request: RequestItem,
    status: "approved" | "rejected"
  ) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const {
      data: admin,
    } = await supabase
      .from("employees")
      .select("id")
      .eq(
        "auth_user_id",
        user.id
      )
      .single();

    if (!admin) return;

    const {
      error,
    } = await supabase
      .from("requests")
      .update({
        status,

        admin_note:
          notes[request.id] || null,

        reviewed_by: admin.id,

        reviewed_at:
          new Date().toISOString(),
      })
      .eq("id", request.id);

    if (error) {
      alert(
        `Có lỗi: ${error.message}`
      );

      return;
    }

    await loadRequests();
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Đang tải...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f3",
        padding: "30px",
        fontFamily:
          "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <button
          onClick={() =>
            router.push("/admin")
          }
          style={{
            border: "none",
            background: "#365d4b",
            color: "#ffffff",
            padding: "12px 18px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          ← Quay lại Admin
        </button>

        <h1>
          Quản lý đơn từ
        </h1>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "25px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() =>
              setFilter("pending")
            }
          >
            Chờ duyệt
          </button>

          <button
            onClick={() =>
              setFilter("approved")
            }
          >
            Đã duyệt
          </button>

          <button
            onClick={() =>
              setFilter("rejected")
            }
          >
            Từ chối
          </button>

          <button
            onClick={() =>
              setFilter("all")
            }
          >
            Tất cả
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "18px",
          }}
        >
          {requests.length === 0 && (
            <p>
              Không có đơn nào.
            </p>
          )}

          {requests.map(
            (request) => (
              <div
                key={request.id}
                style={{
                  background:
                    "#ffffff",
                  borderRadius:
                    "18px",
                  padding: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "20px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3>
                      {
                        request.employee
                          ?.full_name
                      }
                    </h3>

                    <p>
                      <strong>
                        Loại đơn:
                      </strong>{" "}
                      {requestTypeLabel(
                        request.request_type
                      )}
                    </p>

                    <p>
                      <strong>
                        Ngày:
                      </strong>{" "}
                      {
                        request.request_date
                      }
                    </p>

                    {request.start_time && (
                      <p>
                        <strong>
                          Bắt đầu:
                        </strong>{" "}
                        {request.start_time.slice(
                          0,
                          5
                        )}
                      </p>
                    )}

                    {request.end_time && (
                      <p>
                        <strong>
                          Kết thúc:
                        </strong>{" "}
                        {request.end_time.slice(
                          0,
                          5
                        )}
                      </p>
                    )}

                    <p>
                      <strong>
                        Lý do:
                      </strong>{" "}
                      {request.reason ||
                        "Không có"}
                    </p>

                    <p>
                      <strong>
                        Trạng thái:
                      </strong>{" "}
                      {statusLabel(
                        request.status
                      )}
                    </p>
                  </div>
                </div>

                {request.status ===
                  "pending" && (
                  <div
                    style={{
                      marginTop:
                        "20px",
                    }}
                  >
                    <textarea
                      placeholder="Ghi chú cho nhân viên..."
                      value={
                        notes[request.id] ||
                        ""
                      }
                      onChange={(e) =>
                        setNotes({
                          ...notes,

                          [request.id]:
                            e.target.value,
                        })
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius:
                          "10px",
                        border:
                          "1px solid #ddd",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop:
                          "12px",
                      }}
                    >
                      <button
                        onClick={() =>
                          updateRequest(
                            request,
                            "approved"
                          )
                        }
                        style={{
                          background:
                            "#2f7d4c",
                          color:
                            "#ffffff",
                          border: "none",
                          padding:
                            "12px 20px",
                          borderRadius:
                            "10px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Duyệt
                      </button>

                      <button
                        onClick={() =>
                          updateRequest(
                            request,
                            "rejected"
                          )
                        }
                        style={{
                          background:
                            "#c0392b",
                          color:
                            "#ffffff",
                          border: "none",
                          padding:
                            "12px 20px",
                          borderRadius:
                            "10px",
                          cursor:
                            "pointer",
                        }}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                )}

                {request.status !==
                  "pending" &&
                  request.admin_note && (
                    <div
                      style={{
                        marginTop:
                          "15px",
                        background:
                          "#f4f4f4",
                        padding: "14px",
                        borderRadius:
                          "10px",
                      }}
                    >
                      <strong>
                        Phản hồi:
                      </strong>

                      <br />

                      {
                        request.admin_note
                      }
                    </div>
                  )}
              </div>
            )
          )}
        </div>
      </div>
    </main>
  );
}
