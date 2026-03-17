"use client";

import * as React from "react";
import { formatDistanceStrict } from "date-fns";

type CountdownTextProps = {
  to: Date;
  prefix?: string;
  className?: string;
};

export function CountdownText({ to, prefix = "Closes in", className }: CountdownTextProps) {
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000 * 30);
    return () => window.clearInterval(interval);
  }, []);

  const targetMs = to.getTime();
  const label =
    targetMs <= now ? "Closed" : `${prefix} ${formatDistanceStrict(targetMs, now, { addSuffix: true })}`;

  return <p className={className}>{label}</p>;
}
