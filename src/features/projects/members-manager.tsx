"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Field, selectClass } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { addMember, findPeople, removeMember, updateMember } from "@/features/projects/members";
import { teamCounts } from "@/features/projects/page-summaries";
import { WORKLOAD_LIMIT } from "@/features/recommendations/engine";
import { safeCall } from "@/lib/action-result";
import { canViewHistory, ROLE_LABELS, type ProjectRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export type MemberRow = {
  userId: string;
  name: string;
  role: ProjectRole;
  committeeCategoryId: string | null;
  committeeTitle: string | null;
  // Left out for members, who can't see each other's records.
  active: number | null;
  finished: number | null;
};

const ROLES: ProjectRole[] = ["LEAD", "MEMBER", "ADVISER"];

function WorkCells({ member }: { member: MemberRow }) {
  // Advisers don't get tasks, so their numbers would only ever be zero.
  if (member.role === "ADVISER") {
    return (
      <>
        <TableCell className="text-right text-muted-foreground">-</TableCell>
        <TableCell className="text-right text-muted-foreground">-</TableCell>
      </>
    );
  }
  const atLimit = (member.active ?? 0) >= WORKLOAD_LIMIT;
  return (
    <>
      <TableCell className={cn("text-right tabular-nums", atLimit && "font-bold text-brand-red")}>{member.active}</TableCell>
      <TableCell className="text-right tabular-nums">{member.finished}</TableCell>
    </>
  );
}

function EditableRow({ projectId, member }: { projectId: string; member: MemberRow }) {
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [pending, setPending] = useState(false);
  const dirty = role !== member.role;

  async function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) {
    setPending(true);
    const result = await action();
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      setRole(member.role);
      return;
    }
    toast.success(done);
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell className="font-bold">
        <Link href={`/projects/${projectId}/members/${member.userId}`} className="underline-offset-4 hover:underline">{member.name}</Link>
      </TableCell>
      <TableCell>
        <select aria-label={`Role of ${member.name}`} className={cn(selectClass, "w-32")} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
          {ROLES.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
        </select>
      </TableCell>
      <WorkCells member={member} />
      <TableCell className="text-right whitespace-nowrap">
        {dirty && (
          <Button
            size="sm"
            disabled={pending}
            // Keeps any committee already saved, because suggestions use it.
            onClick={() => run(() => safeCall(() => updateMember(projectId, { userId: member.userId, role, committeeCategoryId: member.committeeCategoryId ?? "", committeeTitle: member.committeeTitle ?? "" })), "Member saved")}
          >
            Save
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          className="ml-1"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Remove ${member.name} from this project? Their unfinished tasks become unassigned.`)) {
              run(() => safeCall(() => removeMember(projectId, member.userId)), "Member removed");
            }
          }}
        >
          Remove
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddPerson({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<ProjectRole>("MEMBER");
  const [results, setResults] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await safeCall(() => findPeople(projectId, query));
      if (!cancelled && result.ok) setResults(result.data);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, query]);

  const shown = query.trim().length < 2 ? [] : results;

  async function add(userId: string) {
    const result = await safeCall(() => addMember(projectId, { userId, role }));
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Member added");
    setQuery("");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 self-start rounded-xl bg-muted p-4">
      <h2 className="text-lg font-bold">Add a person</h2>
      <p className="text-sm text-muted-foreground">People appear here after they&apos;ve signed in to StudentDesk at least once.</p>
      <Field id="find-person" label="Find a person">
        <Input id="find-person" className="bg-card" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or LMS ID" />
      </Field>
      <Field id="new-role" label="Add as">
        <select id="new-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
          {ROLES.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
        </select>
      </Field>
      {query.trim().length >= 2 && shown.length === 0 && <p className="text-sm text-muted-foreground">Nobody found.</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((person) => (
          <li key={person.id}>
            <Button variant="outline" className="w-full" onClick={() => add(person.id)}>Add {person.name}</Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function MembersManager({
  projectId,
  members,
  canManage,
  showWork,
  viewerId,
  viewerRole,
}: {
  projectId: string;
  members: MemberRow[];
  canManage: boolean;
  showWork: boolean;
  viewerId: string;
  viewerRole: ProjectRole;
}) {
  return (
    <main className="flex flex-col gap-4">
      <p className="font-semibold">{teamCounts(members.map((member) => member.role))}</p>
      <div className={cn("grid gap-8", canManage && "lg:grid-cols-[minmax(0,1fr)_20rem]")}>
        <div className="flex min-w-0 flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                {showWork && <TableHead className="text-right">Active tasks</TableHead>}
                {showWork && <TableHead className="text-right">Finished</TableHead>}
                {canManage && <TableHead><span className="sr-only">Actions</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) =>
                canManage ? (
                  <EditableRow key={member.userId} projectId={projectId} member={member} />
                ) : (
                  <TableRow key={member.userId}>
                    <TableCell className="font-bold">
                      {canViewHistory(viewerRole, viewerId, member.userId) ? (
                        <Link href={`/projects/${projectId}/members/${member.userId}`} className="underline-offset-4 hover:underline">{member.name}</Link>
                      ) : (
                        member.name
                      )}
                    </TableCell>
                    <TableCell>{ROLE_LABELS[member.role]}</TableCell>
                    {showWork && <WorkCells member={member} />}
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
          {showWork && (
            <p className="text-sm text-muted-foreground">
              These numbers cover all of a person&apos;s projects. Suggestions hold back anyone with {WORKLOAD_LIMIT} or more active tasks.
            </p>
          )}
        </div>
        {canManage && <AddPerson projectId={projectId} />}
      </div>
    </main>
  );
}
