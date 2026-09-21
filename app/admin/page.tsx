import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!(await verifySessionToken(token))) redirect("/admin/login");
  return <AdminDashboard />;
}
