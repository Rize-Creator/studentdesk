import { requireUser } from "@/features/auth/session";
import { ProjectForm } from "@/features/projects/project-form";

export default async function NewProjectPage() {
  await requireUser();
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">New project</h1>
      <ProjectForm />
    </main>
  );
}
