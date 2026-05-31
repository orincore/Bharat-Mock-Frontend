import OriginalPage from "@/app/blogs/page";
export const dynamic = "force-dynamic";
export default async function LocalePage() {
  return OriginalPage();
}
