export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            KG Inventory
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Inventory Management
          </h2>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-600">
          Welcome, Admin
        </div>
      </div>
    </header>
  );
}
