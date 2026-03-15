"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root className={cn("flex flex-col gap-3", className)} {...props} />;
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-[var(--r-full)] bg-[var(--surface-2)] p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "rounded-[var(--r-full)] px-3 py-1.5 text-sm font-medium text-[var(--text-2)] transition-colors data-active:bg-[var(--white)] data-active:text-[var(--text-1)] data-active:shadow-[var(--shadow-sm)]",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel className={cn("text-sm text-[var(--text-1)]", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
