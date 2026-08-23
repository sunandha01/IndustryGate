import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-semibold text-srm-navy">{title}</h1>
      {action}
    </div>
  );
}

export function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="bg-srm-navy text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-srm-navy-dark transition-colors"
    >
      {label}
    </Link>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card border border-card-border rounded-xl shadow-sm p-5">{children}</div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block bg-srm-gold/20 text-srm-gold-dark text-xs font-semibold px-2 py-1 rounded-full">
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center text-gray-500 text-sm py-16 border border-dashed border-card-border rounded-xl">
      {message}
    </div>
  );
}

export function money(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    value
  );
}

export function formField(label: string, input: ReactNode) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {input}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-srm-navy";
