"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const mentorshipRequestSchema = z.object({
  field: z.string().trim().min(2, "Field/topic is required."),
  message: z
    .string()
    .trim()
    .min(140, "Message must be at least 140 characters.")
    .max(280, "Message must be at most 280 characters."),
});

type MentorshipRequestValues = z.infer<typeof mentorshipRequestSchema>;

type RequestMentorFormProps = {
  mentorId: string;
};

export function RequestMentorForm({ mentorId }: RequestMentorFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MentorshipRequestValues>({
    resolver: zodResolver(mentorshipRequestSchema),
    defaultValues: {
      field: "",
      message: "",
    },
  });

  const message = watch("message");

  async function onSubmit(values: MentorshipRequestValues) {
    const response = await fetch("/api/mentorship", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        mentorId,
        field: values.field,
        message: values.message,
      }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(body?.message ?? "Failed to send mentorship request.");
      return;
    }

    toast.success("Mentorship request sent.");
    router.push("/mentorship/my-requests");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Field or topic you want mentorship in"
        placeholder="e.g. Career transition to product management"
        {...register("field")}
        error={errors.field?.message}
      />
      <Textarea
        label="Message to mentor"
        placeholder="Share your background, what you want to learn, and what support you are requesting."
        maxLength={280}
        {...register("message")}
        error={errors.message?.message}
        helperText={`${message.length}/280`}
      />
      <Button type="submit" variant="navy" isLoading={isSubmitting}>
        Send Request
      </Button>
    </form>
  );
}
