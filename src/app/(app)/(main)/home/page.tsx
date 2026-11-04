import { requireUser } from "@/features/auth/session";

export default async function HomePage() {
  const user = await requireUser();
  return <h1 className="text-3xl font-bold">Hello, {user.name}</h1>;
}
