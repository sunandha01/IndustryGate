import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export default async function Home() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  redirect(viewer.kind === "industry" ? "/mentor" : "/dashboard");
}
