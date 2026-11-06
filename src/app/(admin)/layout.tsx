import { Metadata } from "next";
import { AdminLayout } from "@/components/admin/admin-layout";

export const metadata: Metadata = {
  title: "Admin Command Center | MYSTERY NETWORK",
  description: "Global Collaborative Detective Platform Administrative Control Center",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
