import OriginalPage from "@/app/live-tests/page";
export const dynamic = "force-dynamic";
export default async function LocalePage() {
  return OriginalPage();
}
