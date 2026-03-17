"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ShareCohortButton({ href }: { href: string }) {
  const { toast } = useToast();

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(href);
          toast({
            title: "Link copied",
            variant: "success",
          });
        } catch {
          toast({
            title: "Could not copy link",
          });
        }
      }}
    >
      Share this page
    </Button>
  );
}
