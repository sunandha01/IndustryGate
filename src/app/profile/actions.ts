"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name")),
      linkedin_url: (formData.get("linkedin_url") as string) || null,
      phone: (formData.get("phone") as string) || null,
      domain: (formData.get("domain") as string) || null,
      department: (formData.get("department") as string) || null,
      experience: (formData.get("experience") as string) || null,
    })
    .eq("id", user.id);

  if (error) {
    redirect("/profile/edit?error=" + encodeURIComponent(error.message));
  }

  redirect("/profile");
}
