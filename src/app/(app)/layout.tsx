import { requireUser } from "../../lib/auth";
import { Nav } from "../../components/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <Nav userName={user.name} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-600">
        ImportLens — built on CBP AMS vessel manifest data (sample dataset)
      </footer>
    </div>
  );
}
