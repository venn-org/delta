"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/Button";
import type { EditableProfile, UpdateProfileResult } from "@/server/profile";

type Field = keyof EditableProfile;

/**
 * The identity fields on /profile/edit. Errors come back per field from the
 * server's validation, which is the one that counts; the input attributes
 * here only make the keyboard right.
 */
export function EditProfileForm({
  initial,
  action,
}: {
  initial: EditableProfile;
  action: (input: Record<Field, string>) => Promise<UpdateProfileResult>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function submit(form: FormData) {
    const input = {
      displayName: String(form.get("displayName") ?? ""),
      age: String(form.get("age") ?? ""),
      occupation: String(form.get("occupation") ?? ""),
      employer: String(form.get("employer") ?? ""),
      idealSunday: String(form.get("idealSunday") ?? ""),
    };
    setErrors({});
    setFormError(null);
    startTransition(async () => {
      const result = await action(input);
      if (result.ok) {
        router.push("/profile");
        return;
      }
      setErrors(result.errors);
      setFormError(result.error ?? null);
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <TextField
        name="displayName"
        label="Name"
        hint="What your matches see."
        defaultValue={initial.displayName}
        error={errors.displayName}
        autoComplete="given-name"
        required
      />
      <TextField
        name="age"
        label="Age"
        defaultValue={initial.age?.toString() ?? ""}
        error={errors.age}
        inputMode="numeric"
      />
      <TextField
        name="occupation"
        label="What you do"
        placeholder="SDE intern"
        defaultValue={initial.occupation ?? ""}
        error={errors.occupation}
      />
      <TextField
        name="employer"
        label="Where"
        placeholder="TCS"
        defaultValue={initial.employer ?? ""}
        error={errors.employer}
        autoComplete="organization"
      />
      <TextField
        name="idealSunday"
        label="Your ideal Sunday"
        placeholder="Brunch, then a long walk by the lake"
        defaultValue={initial.idealSunday ?? ""}
        error={errors.idealSunday}
        multiline
      />

      {formError && (
        <p role="alert" className="text-[14px] text-danger">
          {formError}
        </p>
      )}

      <Button type="submit" block disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

function TextField({
  name,
  label,
  hint,
  error,
  multiline = false,
  ...props
}: {
  name: Field;
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: "numeric";
}) {
  const id = `field-${name}`;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const classes =
    "w-full rounded-field border-[1.5px] bg-white px-4 py-3 text-[15px] text-ink outline-none placeholder:text-slate/60 focus:border-blue " +
    (error ? "border-danger" : "border-mist");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-mono text-[11px] tracking-[0.12em] text-slate uppercase">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${classes} resize-none`}
          {...props}
        />
      ) : (
        <input
          id={id}
          name={name}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`${classes} min-h-11`}
          {...props}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[13px] text-slate">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
