import { AuthForm } from "@/components/AuthForm";

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={typeof next === "string" ? next : undefined} />;
}
