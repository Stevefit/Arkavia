import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, validSession } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";
export default async function Page() {
  if (!(await validSession((await cookies()).get(COOKIE)?.value)))
    redirect("/admin/login");
  return <Dashboard />;
}
