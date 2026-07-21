import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold tracking-tight text-white">
            Import<span className="text-sky-400">Lens</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">U.S. import trade intelligence</p>
        </div>
        {children}
      </div>
    </div>
  );
}
