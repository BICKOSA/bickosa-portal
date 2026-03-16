"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectField,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type PaymentMethod = "mtn_momo" | "airtel_money" | "visa" | "mastercard" | "bank_transfer";

type DonationModalCampaign = {
  id: string;
  title: string;
  slug: string;
};

type DonationModalProps = {
  campaigns: DonationModalCampaign[];
  defaultCampaignSlug?: string;
  triggerLabel?: string;
  triggerVariant?: "navy" | "gold";
  triggerClassName?: string;
  donor: {
    userId: string;
    name: string;
    email: string;
    isVerified: boolean;
    showOnDonorWall: boolean;
  };
};

const PRESET_AMOUNTS = [50_000, 100_000, 250_000, 500_000, 1_000_000] as const;

function formatAmountLabel(value: number): string {
  if (value >= 1_000_000) {
    return `${value / 1_000_000}M`;
  }
  return `${value / 1_000}K`;
}

function formatUgx(value: number): string {
  return `UGX ${value.toLocaleString("en-UG")}`;
}

export function DonationModal({
  campaigns,
  defaultCampaignSlug,
  triggerLabel = "Donate Now",
  triggerVariant = "navy",
  triggerClassName,
  donor,
}: DonationModalProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialCampaignId =
    campaigns.find((campaign) => campaign.slug === defaultCampaignSlug)?.id ?? campaigns[0]?.id ?? "";

  const [selectedAmount, setSelectedAmount] = useState<number>(PRESET_AMOUNTS[1]);
  const [isOtherAmount, setIsOtherAmount] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showOnDonorWall, setShowOnDonorWall] = useState(donor.showOnDonorWall);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mtn_momo");

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === campaignId) ?? null,
    [campaignId, campaigns],
  );

  const resolvedAmount = isOtherAmount
    ? Number.parseInt(customAmount.replace(/,/g, ""), 10) || 0
    : selectedAmount;

  function resetState() {
    setStep(1);
    setSelectedAmount(PRESET_AMOUNTS[1]);
    setIsOtherAmount(false);
    setCustomAmount("");
    setCampaignId(initialCampaignId);
    setIsAnonymous(false);
    setShowOnDonorWall(donor.showOnDonorWall);
    setPhoneNumber("");
    setPaymentMethod("mtn_momo");
    setIsSubmitting(false);
  }

  function validateCurrentStep(): string | null {
    if (step === 1) {
      if (!campaignId) {
        return "Please select a campaign.";
      }
      if (isOtherAmount && resolvedAmount < 5_000) {
        return "Custom amount must be at least UGX 5,000.";
      }
      if (!isOtherAmount && selectedAmount < 5_000) {
        return "Amount must be at least UGX 5,000.";
      }
    }
    if (step === 2 && phoneNumber.trim().length < 10) {
      return "Please provide a valid phone number for mobile money.";
    }
    return null;
  }

  async function handleConfirmDonation() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/donations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          campaignId,
          amount: resolvedAmount,
          paymentMethod,
          isAnonymous,
          showOnDonorWall,
          phoneNumber,
          simulateSuccess: true,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { donationId?: string; email?: string; message?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to process donation.");
      }

      toast({
        title: "🙏 Donation received!",
        description: `Receipt sent to ${payload?.email ?? donor.email}`,
        variant: "success",
      });
      setOpen(false);
      resetState();
    } catch (error) {
      toast({
        title: "Donation could not be completed",
        description: error instanceof Error ? error.message : "Please try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function nextStep() {
    const error = validateCurrentStep();
    if (error) {
      toast({
        title: "Check required details",
        description: error,
      });
      return;
    }
    setStep((previous) => Math.min(4, previous + 1));
  }

  function previousStep() {
    setStep((previous) => Math.max(1, previous - 1));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetState();
        }
      }}
    >
      <DialogTrigger
        render={
          <Button variant={triggerVariant} className={triggerClassName}>
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="w-[min(96vw,44rem)]">
        <DialogHeader>
          <DialogTitle>Support BICKOSA Campaigns</DialogTitle>
          <DialogDescription>
            Step {step} of 4 — secure donation flow
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className={cn(
                "h-1.5 rounded-full",
                item <= step ? "bg-[var(--gold-500)]" : "bg-[var(--navy-100)]",
              )}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-[var(--text-1)]">Select an amount</p>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      setSelectedAmount(amount);
                      setIsOtherAmount(false);
                    }}
                    className={cn(
                      "rounded-[var(--r-md)] border px-3 py-2 text-sm font-semibold",
                      !isOtherAmount && selectedAmount === amount
                        ? "border-[var(--navy-700)] bg-[var(--navy-50)] text-[var(--navy-900)]"
                        : "border-[var(--border)] bg-[var(--white)] text-[var(--text-2)]",
                    )}
                  >
                    {formatAmountLabel(amount)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsOtherAmount(true)}
                  className={cn(
                    "rounded-[var(--r-md)] border px-3 py-2 text-sm font-semibold",
                    isOtherAmount
                      ? "border-[var(--navy-700)] bg-[var(--navy-50)] text-[var(--navy-900)]"
                      : "border-[var(--border)] bg-[var(--white)] text-[var(--text-2)]",
                  )}
                >
                  Other
                </button>
              </div>
              {isOtherAmount ? (
                <Input
                  className="mt-3"
                  label="Custom amount (UGX)"
                  placeholder="5000"
                  value={customAmount}
                  onChange={(event) => setCustomAmount(event.target.value)}
                />
              ) : null}
            </div>

            <SelectField label="Campaign">
              <Select value={campaignId} onValueChange={(value) => setCampaignId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectField>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            {donor.isVerified ? (
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
                Donating as <span className="font-semibold text-[var(--text-1)]">{donor.name}</span>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))}
              />
              <Label>Donate anonymously</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={showOnDonorWall}
                onCheckedChange={(checked) => setShowOnDonorWall(Boolean(checked))}
              />
              <Label>Show my name on donor wall</Label>
            </div>
            <Input
              label="Phone number"
              placeholder="+256 7XX XXX XXX"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <SelectField label="Payment method">
              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn_momo">MTN Mobile Money</SelectItem>
                  <SelectItem value="airtel_money">Airtel Money</SelectItem>
                  <SelectItem value="visa">Visa / Mastercard</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </SelectField>

            {(paymentMethod === "mtn_momo" || paymentMethod === "airtel_money") && (
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
                You will receive a prompt on <strong>{phoneNumber || "your phone"}</strong> to authorize
                payment.
              </div>
            )}

            {(paymentMethod === "visa" || paymentMethod === "mastercard") && (
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
                Card gateway integration (DPO Group / Flutterwave) is planned. Using mock completion for
                now.
              </div>
            )}

            {paymentMethod === "bank_transfer" && (
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-2)]">
                <p>Bank: Stanbic Bank Uganda</p>
                <p>Account Name: BICKOSA Alumni Association</p>
                <p>Account Number: 012345678901</p>
                <p>Reference: Your email + campaign title</p>
              </div>
            )}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Amount</span>
              <span className="font-semibold text-[var(--text-1)]">{formatUgx(resolvedAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Campaign</span>
              <span className="font-semibold text-[var(--text-1)]">
                {selectedCampaign?.title ?? "Not selected"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Payment Method</span>
              <span className="font-semibold text-[var(--text-1)]">{paymentMethod.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-3)]">Donor visibility</span>
              <span className="font-semibold text-[var(--text-1)]">
                {isAnonymous ? "Anonymous" : donor.name}
              </span>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={previousStep} disabled={step === 1 || isSubmitting}>
            Back
          </Button>
          {step < 4 ? (
            <Button type="button" variant="navy" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button type="button" variant="gold" onClick={handleConfirmDonation} isLoading={isSubmitting}>
              Confirm Donation
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
