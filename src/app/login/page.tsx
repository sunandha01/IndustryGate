import Image from "next/image";
import { sendMagicLink } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-card border border-card-border rounded-xl shadow-sm p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image src="/srm-logo.png" alt="SRM Institute of Science & Technology" width={230} height={77} />
          <h1 className="text-xl font-semibold text-srm-navy text-center">
            SRM Industry Mentor Portal
          </h1>
          <p className="text-sm text-gray-500 text-center">
            Sign in with your @srmist.edu.in email to continue.
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

        <form action={sendMagicLink} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-srm-navy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SRM email</label>
            <input
              name="email"
              type="email"
              required
              pattern=".+@srmist\.edu\.in"
              title="Use your @srmist.edu.in email address"
              placeholder="you@srmist.edu.in"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-srm-navy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I am a</label>
            <select
              name="role"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-srm-navy"
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Send magic link
          </button>
        </form>
      </div>
    </div>
  );
}
