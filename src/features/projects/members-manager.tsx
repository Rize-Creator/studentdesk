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
import { safeCall } from "@/lib/action-result";
import { canViewHistory, ROLE_LABELS, type ProjectRole } from "@/lib/permissions";

export type MemberRow = {
  userId: string;
  name: string;
  email: string;
  role: ProjectRole;
  committeeCategoryId: string | null;
  committeeTitle: string | null;
};

const ROLES: ProjectRole[] = ["LEAD", "MEMBER", "ADVISER"];

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
        <select aria-label={`Role of ${member.name}`} className={selectClass} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
          {ROLES.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
        </select>
      </TableCell>
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
          variant="ghost"
          size="sm"
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
    <section className="flex max-w-xl flex-col gap-3">
      <h2 className="text-xl font-bold">Add a person</h2>
      <p className="text-sm text-muted-foreground">People appear here after they&apos;ve signed in to StudentDesk at least once.</p>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field id="find-person" label="Find a person">
          <Input id="find-person" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email or LMS ID" />
        </Field>
        <Field id="new-role" label="Add as">
          <select id="new-role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as ProjectRole)}>
            {ROLES.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
          </select>
        </Field>
      </div>
      {query.trim().length >= 2 && shown.length === 0 && <p className="text-sm text-muted-foreground">Nobody found.</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((person) => (
          <li key={person.id}>
            <Button variant="outline" onClick={() => add(person.id)}>Add {person.name}</Button>
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
  viewerId,
  viewerRole,
}: {
  projectId: string;
  members: MemberRow[];
  canManage: boolean;
  viewerId: string;
  viewerRole: ProjectRole;
}) {
  return (
    <main className="flex flex-col gap-8">
      {canManage ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <EditableRow key={member.userId} projectId={projectId} member={member} />
            ))}
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.userId}>
                <TableCell className="font-bold">
                  {canViewHistory(viewerRole, viewerId, member.userId) ? (
                    <Link href={`/projects/${projectId}/members/${member.userId}`} className="underline-offset-4 hover:underline">{member.name}</Link>
                  ) : (
                    member.name
                  )}
                </TableCell>
                <TableCell>{ROLE_LABELS[member.role]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {canManage && <AddPerson projectId={projectId} />}
    </main>
  );
}
