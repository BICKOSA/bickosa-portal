"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  submitPeerNomination,
  submitSelfNomination,
} from "@/app/actions/committees";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

const nominationSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(50, "Minimum 50 characters.")
    .max(500, "Maximum 500 characters."),
});

const peerSchema = nominationSchema.extend({
  nomineeId: z.string().uuid("Select a nominee from search results."),
});

type SearchResult = {
  userId: string;
  name: string;
  yearOfCompletion: number | null;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong while submitting this nomination.";
}

export function CommitteeDetailClient(props: {
  committeeId: string;
  committeeName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSelfBusy, setIsSelfBusy] = React.useState(false);
  const [isPeerBusy, setIsPeerBusy] = React.useState(false);
  const [openPeerDialog, setOpenPeerDialog] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const selfForm = useForm<z.infer<typeof nominationSchema>>({
    resolver: zodResolver(nominationSchema),
    defaultValues: { reason: "" },
  });
  const peerForm = useForm<z.infer<typeof peerSchema>>({
    resolver: zodResolver(peerSchema),
    defaultValues: { nomineeId: "", reason: "" },
  });

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/committees/alumni-search?q=${encodeURIComponent(query.trim())}`,
          {
            signal: controller.signal,
          },
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const payload = (await response.json()) as { results: SearchResult[] };
        setResults(payload.results);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  async function onSubmitSelf(values: z.infer<typeof nominationSchema>) {
    setIsSelfBusy(true);
    try {
      const result = await submitSelfNomination(
        props.committeeId,
        values.reason,
      );
      if (!result.ok) {
        toast({
          title: "Could not submit self-nomination",
          description: result.message,
        });
        return;
      }
      toast({
        title: "Self-nomination submitted",
        description: result.message,
        variant: "success",
      });
      selfForm.reset();
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not submit self-nomination",
        description: getErrorMessage(error),
      });
    } finally {
      setIsSelfBusy(false);
    }
  }

  async function onSubmitPeer(values: z.infer<typeof peerSchema>) {
    setIsPeerBusy(true);
    try {
      const result = await submitPeerNomination(
        props.committeeId,
        values.nomineeId,
        values.reason,
      );
      if (!result.ok) {
        toast({
          title: "Could not submit peer nomination",
          description: result.message,
        });
        return;
      }
      toast({
        title: "Peer nomination submitted",
        description: result.message,
        variant: "success",
      });
      peerForm.reset();
      setQuery("");
      setResults([]);
      setOpenPeerDialog(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Could not submit peer nomination",
        description: getErrorMessage(error),
      });
    } finally {
      setIsPeerBusy(false);
    }
  }

  function onInvalidNomination() {
    toast({
      title: "Nomination details needed",
      description: "Please fix the highlighted fields and try again.",
    });
  }

  return (
    <div className="space-y-4">
      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">
          Nominate Yourself
        </h3>
        <p className="mt-1 text-sm text-(--text-3)">
          Explain why you are a strong fit for {props.committeeName}.
        </p>
        <form
          onSubmit={selfForm.handleSubmit(onSubmitSelf, onInvalidNomination)}
          className="mt-3 space-y-3"
        >
          <Textarea
            label="Nomination reason"
            rows={5}
            placeholder="Why are you a good fit for this committee?"
            {...selfForm.register("reason")}
            error={selfForm.formState.errors.reason?.message}
            helperText={`${selfForm.watch("reason")?.length ?? 0}/500 characters. Minimum 50.`}
          />
          <Button type="submit" variant="navy" isLoading={isSelfBusy}>
            Nominate Yourself
          </Button>
        </form>
      </div>

      <div className="border-border rounded-(--r-lg) border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">
          Nominate Someone Else
        </h3>
        <p className="mt-1 text-sm text-(--text-3)">
          Submit a peer nomination and we will email the nominee to accept or
          decline.
        </p>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => setOpenPeerDialog(true)}
        >
          Nominate Someone
        </Button>
      </div>

      <Dialog open={openPeerDialog} onOpenChange={setOpenPeerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate a Fellow Alumnus</DialogTitle>
            <DialogDescription>
              Search verified alumni, pick one nominee, and provide your reason.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={peerForm.handleSubmit(onSubmitPeer, onInvalidNomination)}
          >
            <label className="block text-sm font-medium text-(--text-2)">
              Search alumni
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="border-border mt-1 w-full rounded-(--r-md) border px-3 py-2 text-sm"
                placeholder="Start typing a name..."
              />
            </label>
            <div className="border-border max-h-48 space-y-2 overflow-y-auto rounded-(--r-md) border p-2">
              {searching ? (
                <p className="text-xs text-(--text-3)">Searching...</p>
              ) : null}
              {results.map((result) => (
                <button
                  key={result.userId}
                  type="button"
                  onClick={() =>
                    peerForm.setValue("nomineeId", result.userId, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    })
                  }
                  className={`flex w-full items-center justify-between rounded-(--r-md) px-2 py-1.5 text-left text-sm ${
                    peerForm.watch("nomineeId") === result.userId
                      ? "bg-(--navy-50) text-(--navy-900)"
                      : "hover:bg-(--surface)"
                  }`}
                >
                  <span>{result.name}</span>
                  <Badge variant="outline">
                    {result.yearOfCompletion ?? "Year -"}
                  </Badge>
                </button>
              ))}
              {!searching && results.length === 0 ? (
                <p className="text-xs text-(--text-3)">
                  No verified alumni found for your search.
                </p>
              ) : null}
            </div>
            {peerForm.formState.errors.nomineeId?.message ? (
              <p className="text-xs text-(--error)">
                {peerForm.formState.errors.nomineeId.message}
              </p>
            ) : null}
            <Textarea
              label="Nomination reason"
              rows={5}
              placeholder="Why is this nominee a strong fit?"
              {...peerForm.register("reason")}
              error={peerForm.formState.errors.reason?.message}
              helperText={`${peerForm.watch("reason")?.length ?? 0}/500 characters. Minimum 50.`}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenPeerDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="navy" isLoading={isPeerBusy}>
                Submit Nomination
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
