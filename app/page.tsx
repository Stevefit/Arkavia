import PublicExperience from "@/components/PublicExperience";

export default async function Home({ searchParams }: { searchParams: Promise<{ name?: string | string[] }> }) {
  const { name } = await searchParams;
  const slug = typeof name === "string" ? name.trim() : Array.isArray(name) ? name[0]?.trim() || "" : "";
  return <PublicExperience slug={slug} />;
}
