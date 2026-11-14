"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { QuickReplyChips } from "@/components/QuickReplyChips";
import type { QuestionOption } from "@/lib/answers";
import type { FlatDraft } from "@/lib/flat";

export type { FlatDraft };

const AMENITIES: QuestionOption[] = [
  { value: "2bhk", label: "2BHK" },
  { value: "3bhk", label: "3BHK" },
  { value: "furnished", label: "Furnished" },
  { value: "own_bathroom", label: "Own bathroom" },
  { value: "balcony", label: "Balcony" },
];

/**
 * Flat-details step, shown only on the "I have a flat" branch.
 *
 * Rupee inputs are converted to PAISE here, because `flats.rent_share_paise`
 * is an integer column — money never becomes a float anywhere in this app
 * (§4.8).
 *
 * Room photos are not wired yet: they need the private Storage buckets and
 * signed-URL route from §6.3, which phase 4 builds. The rest of the draft is
 * saved now and photos can be added from the profile later.
 */
export function FlatDetailsForm({
  areas,
  onDone,
  disabled,
}: {
  areas: QuestionOption[];
  onDone: (draft: FlatDraft) => void;
  disabled?: boolean;
}) {
  const [area, setArea] = useState<string | null>(null);
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [availableFrom, setAvailableFrom] = useState("");

  const valid = area !== null && rent !== "";

  return (
    <div className="flex flex-col gap-4 px-5 pb-4">
      <div className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-bubble">
        <Field label="Area">
          <QuickReplyChips
            options={areas}
            selected={area}
            onSelect={setArea}
            disabled={disabled}
          />
        </Field>

        <div className="flex gap-2">
          <Field label="Rent share / mo">
            <MoneyInput value={rent} onChange={setRent} placeholder="18000" disabled={disabled} />
          </Field>
          <Field label="Deposit">
            <MoneyInput value={deposit} onChange={setDeposit} placeholder="50000" disabled={disabled} />
          </Field>
        </div>

        <Field label="The place">
          <QuickReplyChips
            multi
            options={AMENITIES}
            selected={amenities}
            disabled={disabled}
            onSelect={(v) =>
              setAmenities((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
              )
            }
          />
        </Field>

        <Field label="Available from">
          <input
            type="date"
            value={availableFrom}
            disabled={disabled}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="w-full rounded-field border-[1.5px] border-mist bg-white px-3 py-2.5 text-ink outline-none focus:border-blue"
          />
        </Field>
      </div>

      <Button
        block
        disabled={disabled || !valid}
        onClick={() =>
          onDone({
            area_slug: area,
            rent_share_paise: rent ? Number(rent) * 100 : null,
            deposit_paise: deposit ? Number(deposit) * 100 : null,
            bhk: amenities.find((a) => a.endsWith("bhk")) ?? null,
            amenities: amenities.filter((a) => !a.endsWith("bhk")),
            available_from: availableFrom || null,
          })
        }
      >
        {valid ? "Looks good →" : "Add an area and rent"}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1.5 py-1.5">
      <span className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <span className="flex items-center gap-1 rounded-field border-[1.5px] border-mist bg-white px-3 focus-within:border-blue">
      <span className="text-slate">₹</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full bg-transparent py-2.5 text-ink outline-none placeholder:text-slate/60"
      />
    </span>
  );
}
