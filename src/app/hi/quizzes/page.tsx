import OriginalPage from "@/app/quizzes/page";
export const dynamic = "force-dynamic";
export default async function LocalePage() {
  return OriginalPage();
}
