"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type MemberRoleActionsProps = {
  userId: string;
  fullName: string;
  currentRole: "member" | "admin";
  isSelf: boolean;
};

export function MemberRoleActions({
  userId,
  fullName,
  currentRole,
  isSelf,
}: MemberRoleActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isBusy, setBusy] = useState(false);
  const [confirmDemote, setConfirmDemote] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);

  const isAdmin = currentRole === "admin";

  async function updateRole(nextRole: "member" | "admin") {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(body?.message ?? "Could not update role.");
      }

      toast({
        title:
          nextRole === "admin"
            ? `${fullName} is now an admin`
            : `${fullName} is no longer an admin`,
        description:
          "They'll see the change after their next sign-in or page refresh.",
        variant: "success",
      });
      setConfirmDemote(false);
      setConfirmPromote(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Role update failed",
        description: error instanceof Error ? error.message : "Please retry.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-[var(--r-md)] bg-[var(--surface)] px-3 py-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-3)]">
            Current role
          </p>
          <p className="mt-0.5 text-sm font-medium text-[var(--navy-900)]">
            {isAdmin ? "Administrator" : "Member"}
          </p>
        </div>
        <Badge variant={isAdmin ? "gold" : "outline"}>
          {isAdmin ? "Admin" : "Member"}
        </Badge>
      </div>

      {isAdmin ? (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full text-[var(--error)] hover:text-[var(--error)]"
            disabled={isSelf || isBusy}
            onClick={() => setConfirmDemote(true)}
          >
            <UserMinus className="size-4" /> Revoke admin access
          </Button>
          {isSelf ? (
            <p className="text-xs text-[var(--text-3)]">
              You can&apos;t demote your own account. Ask another admin.
            </p>
          ) : null}
        </>
      ) : (
        <Button
          type="button"
          variant="navy"
          className="w-full"
          disabled={isBusy}
          onClick={() => setConfirmPromote(true)}
        >
          <ShieldCheck className="size-4" /> Promote to admin
        </Button>
      )}

      <Dialog open={confirmPromote} onOpenChange={setConfirmPromote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote {fullName} to admin?</DialogTitle>
            <DialogDescription>
              They&apos;ll be able to manage members, events, elections,
              announcements, and every other admin surface. The change takes
              effect on their next sign-in or page refresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmPromote(false)}
            >
              Cancel
            </Button>
            <Button
              variant="navy"
              type="button"
              isLoading={isBusy}
              onClick={() => void updateRole("admin")}
            >
              <ShieldCheck className="size-4" /> Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDemote} onOpenChange={setConfirmDemote}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke admin access for {fullName}?</DialogTitle>
            <DialogDescription>
              They&apos;ll lose access to all admin surfaces and the admin
              navigation group. They&apos;ll still have a regular member
              account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmDemote(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              type="button"
              className="text-[var(--error)] hover:text-[var(--error)]"
              isLoading={isBusy}
              onClick={() => void updateRole("member")}
            >
              <UserMinus className="size-4" /> Revoke admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
