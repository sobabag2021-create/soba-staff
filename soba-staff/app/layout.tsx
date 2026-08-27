import "./globals.css";

export const metadata = {
  title: "SOBA STAFF",
  description: "Quản lý nhân viên",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
