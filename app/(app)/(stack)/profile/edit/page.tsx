import { SubpageHeader } from "@/components/SubpageHeader";
import { EditProfileForm } from "@/components/profile/EditProfileForm";
import { requireStage } from "@/server/auth";
import { getEditableProfile } from "@/server/profile";
import { updateProfileAction } from "../actions";

/** /profile/edit — name, age, work and ideal Sunday. */
export const instant = false;

export default async function EditProfilePage() {
  await requireStage("app");
  const profile = await getEditableProfile();
  if (!profile) return null;

  return (
    <div className="relative min-h-full bg-canvas">
      <SubpageHeader backHref="/profile" backLabel="Back to profile" title="Edit profile" />
      <div className="px-gutter pt-2 pb-8">
        <EditProfileForm initial={profile} action={updateProfileAction} />
      </div>
    </div>
  );
}
