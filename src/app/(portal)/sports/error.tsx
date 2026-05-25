"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type SportsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function SportsError({ error, reset }: SportsErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
