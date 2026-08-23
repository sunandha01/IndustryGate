import { Card, PageHeader, formField, inputClass } from "@/components/ui";
import { createIndustryProfile } from "@/app/industry/actions";

export default async function NewIndustryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl">
      <PageHeader title="Add an Industry Contact" />
      <Card>
        <p className="text-sm text-gray-500 mb-4">
          Fill in whatever you know — usually via a faculty member&apos;s existing contact.
        </p>
        {error && (
          <p className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
            {error}
          </p>
        )}
        <form action={createIndustryProfile} className="flex flex-col gap-4">
          {formField("Full name", <input name="full_name" required className={inputClass} />)}
          {formField("Designation", <input name="designation" className={inputClass} placeholder="VP Engineering" />)}
          {formField("Company", <input name="company" className={inputClass} />)}
          {formField("Education", <input name="education" className={inputClass} />)}
          {formField("LinkedIn URL", <input name="linkedin_url" type="url" className={inputClass} />)}
          {formField("Email", <input name="email" type="email" className={inputClass} />)}
          {formField("Phone", <input name="phone" className={inputClass} />)}
          {formField(
            "Domains (comma separated)",
            <input name="domains" className={inputClass} placeholder="AI/ML, Cloud, Product" />
          )}
          {formField(
            "Minimum cost they charge (₹)",
            <input name="min_cost" type="number" min="0" className={inputClass} />
          )}
          {formField("Notes", <textarea name="notes" rows={2} className={inputClass} />)}

          <button
            type="submit"
            className="mt-2 bg-srm-navy text-white font-semibold rounded-md py-2.5 text-sm hover:bg-srm-navy-dark transition-colors"
          >
            Save contact
          </button>
        </form>
      </Card>
    </div>
  );
}
