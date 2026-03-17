"use client";

import { PortalErrorState } from "@/components/layout/portal-error-state";

type MentorshipErrorProps = {
  error: Error;
  reset: () => void;
};

export default function MentorshipError({ error, reset }: MentorshipErrorProps) {
  return <PortalErrorState error={error} reset={reset} />;
}
