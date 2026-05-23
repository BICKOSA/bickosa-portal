import { redirect } from "next/navigation";

type RegisterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const raw = params.returnTo;
  const returnTo = Array.isArray(raw) ? raw[0] : raw;

  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    redirect(`/join?returnTo=${encodeURIComponent(returnTo)}`);
  }

  redirect("/join");
}
