import { ShieldAlert } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-glow">
        <ShieldAlert size={30} />
      </span>
      <h1 className="text-2xl font-extrabold text-midnight dark:text-white">Unauthorized access</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400 dark:text-slate-500">
        You don't have permission to view this area. Only admins and security guards can access the
        admin panel.
      </p>
    </div>
  );
}