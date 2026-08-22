const { data: employee, error: employeeError } = await supabase
  .from("employees")
  .select("role")
  .eq("auth_user_id", data.user.id)
  .single();

if (employeeError || !employee) {
  alert("Không tìm thấy thông tin nhân viên.");
  await supabase.auth.signOut();
  return;
}

if (employee.role === "admin") {
  window.location.href = "/admin";
} else {
  window.location.href = "/employee";
}
