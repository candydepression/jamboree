import { switchViewer } from "@/app/actions";
import { getViewer } from "@/lib/session";
import { getUsers } from "@/lib/store";
import AutoSubmitSelect from "./AutoSubmitSelect";

/** Prototype stand-in for sign-in: pick which demo person you are. */
export default async function ViewerSwitcher() {
  const viewer = await getViewer();
  return (
    <form action={switchViewer} className="flex items-center gap-2 text-sm">
      <label htmlFor="viewer" className="text-stone-500">
        Viewing as
      </label>
      <AutoSubmitSelect id="viewer" name="userId" defaultValue={viewer?.id ?? ""} className="rounded-md border border-stone-300 bg-white px-2 py-1">
        <option value="">Not signed in</option>
        {getUsers().map((u) => (
          <option key={u.id} value={u.id}>
            {u.name} ({u.instruments.join(", ")})
          </option>
        ))}
      </AutoSubmitSelect>
    </form>
  );
}
