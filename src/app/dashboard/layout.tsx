import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={session.user} />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">{children}</main>
    </div>
  );
}
