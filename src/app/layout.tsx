import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CITE Faculty Attendance",
  description: "Staff sign-in for CITE faculty attendance.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
