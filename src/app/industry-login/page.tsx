import Image from "next/image";
import Link from "next/link";
import { sendIndustryMagicLink } from "@/lib/actions/auth";
import { inputClass } from "@/components/ui";

export default async function IndustryLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-card border border-card-border rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image
            src="/srm-logo.png"
            alt="SRM Institute of Science & Technology"
            width={230}
            height={77}
          />
          <h1 className="text-xl font-semibold text-srm-navy text-center">
            Industry Professional Sign In
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Use the email address SRM has on file for you.
          </p>
        </div>

        {sent && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md p-3">
            Magic link sent to {sent}. Check your inbox.
          </p>
        )}
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}

        <form action={sendIndustryMagicLink} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input name="full_name" type="text" required placeholder="Jane Doe" className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Send magic link
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          SRM student or faculty?{" "}
          <Link href="/login" className="text-srm-navy underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
