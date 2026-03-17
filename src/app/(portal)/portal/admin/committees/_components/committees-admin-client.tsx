"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { advanceCommitteeStatusAction, createCommitteeAction } from "@/app/actions/committees";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type CommitteeRow = {
  id: string;
  name: string;
  purpose: string;
  status: "draft" | "nominations_open" | "nominations_closed" | "active" | "dissolved";
  nominationOpens: Date;
  nominationCloses: Date;
  maxMembers: number | null;
  nominationCount: number;
  confirmedCount: number;
  appointedCount: number;
};

const createCommitteeSchema = z
  .object({
    name: z.string().trim().min(3),
    purpose: z.string().trim().min(10),
    maxMembers: z.string().trim().optional(),
    nominationOpens: z.string().min(1),
    nominationCloses: z.string().min(1),
    status: z.enum(["draft", "nominations_open"]),
  })
  .refine((value) => new Date(value.nominationCloses) > new Date(value.nominationOpens), {
    message: "Nomination close must be after open.",
    path: ["nominationCloses"],
  });

function statusVariant(status: CommitteeRow["status"]) {
  if (status === "nominations_open") return "navy";
  if (status === "active") return "success";
  if (status === "dissolved") return "error";
  return "outline";
}

export function CommitteesAdminClient(props: { committees: CommitteeRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyStatusId, setBusyStatusId] = React.useState<string | null>(null);
  const [isCreateBusy, setIsCreateBusy] = React.useState(false);

  const form = useForm<z.infer<typeof createCommitteeSchema>>({
    resolver: zodResolver(createCommitteeSchema),
    defaultValues: {
      name: "",
      purpose: "",
      maxMembers: "",
      nominationOpens: "",
      nominationCloses: "",
      status: "draft",
    },
  });

  async function onCreate(values: z.infer<typeof createCommitteeSchema>) {
    setIsCreateBusy(true);
    const parsedMax = values.maxMembers && values.maxMembers.length > 0 ? Number(values.maxMembers) : null;
    const result = await createCommitteeAction({
      name: values.name,
      purpose: values.purpose,
      maxMembers: Number.isFinite(parsedMax) ? parsedMax : null,
      nominationOpens: values.nominationOpens,
      nominationCloses: values.nominationCloses,
      status: values.status,
    });
    setIsCreateBusy(false);
    if (!result.ok) {
      toast({ title: "Could not create committee", description: result.message });
      return;
    }
    toast({ title: "Committee created", description: result.message, variant: "success" });
    form.reset();
    router.refresh();
  }

  async function onAdvance(committeeId: string) {
    setBusyStatusId(committeeId);
    const result = await advanceCommitteeStatusAction(committeeId);
    setBusyStatusId(null);
    if (!result.ok) {
      toast({ title: "Could not advance status", description: result.message });
      return;
    }
    toast({ title: "Status advanced", variant: "success" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Create Committee</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={form.handleSubmit(onCreate)}>
          <input className="rounded-(--r-md) border border-border px-3 py-2 text-sm" placeholder="Name" {...form.register("name")} />
          <input
            className="rounded-(--r-md) border border-border px-3 py-2 text-sm"
            placeholder="Max members (optional)"
            {...form.register("maxMembers")}
          />
          <textarea
            className="min-h-28 rounded-(--r-md) border border-border px-3 py-2 text-sm md:col-span-2"
            placeholder="Purpose / Mandate"
            {...form.register("purpose")}
          />
          <label className="text-sm text-(--text-2)">
            Nomination opens
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
              {...form.register("nominationOpens")}
            />
          </label>
          <label className="text-sm text-(--text-2)">
            Nomination closes
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm"
              {...form.register("nominationCloses")}
            />
          </label>
          <label className="text-sm text-(--text-2)">
            Initial status
            <select className="mt-1 w-full rounded-(--r-md) border border-border px-3 py-2 text-sm" {...form.register("status")}>
              <option value="draft">draft</option>
              <option value="nominations_open">nominations_open</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <Button type="submit" variant="gold" isLoading={isCreateBusy}>
              Create Committee
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Committee List</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-(--navy-900) text-(--white)">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Nominations</th>
                <th className="px-3 py-2 text-left font-medium">Confirmed</th>
                <th className="px-3 py-2 text-left font-medium">Dates</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {props.committees.map((committee) => (
                <tr key={committee.id} className="border-b border-border bg-(--white)">
                  <td className="px-3 py-2">
                    <p className="font-medium text-(--text-1)">{committee.name}</p>
                    <p className="line-clamp-1 text-xs text-(--text-3)">{committee.purpose}</p>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant(committee.status)}>{committee.status.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="px-3 py-2">{committee.nominationCount}</td>
                  <td className="px-3 py-2">{committee.confirmedCount}</td>
                  <td className="px-3 py-2 text-xs text-(--text-3)">
                    {new Date(committee.nominationOpens).toLocaleDateString()} -{" "}
                    {new Date(committee.nominationCloses).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/committees/${committee.id}/nominations`}>View Nominations</Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void onAdvance(committee.id)}
                        isLoading={busyStatusId === committee.id}
                      >
                        Advance Status
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
