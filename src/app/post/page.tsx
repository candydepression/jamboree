import { Suspense } from "react";
import PostJamForm from "@/components/PostJamForm";
import { getViewer } from "@/lib/session";
import { canPost } from "@/lib/views";

export default function PostPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Post a jam</h1>
      <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
        <PostGate />
      </Suspense>
    </div>
  );
}

async function PostGate() {
  const viewer = await getViewer();
  if (!viewer) return <p className="text-stone-600">Pick who you are under &ldquo;Viewing as&rdquo; at the top first.</p>;
  if (!canPost(viewer))
    return (
      <p className="rounded-xl border border-stone-200 bg-white p-4 text-stone-700">
        During the beta, posting needs an invite from a member. You can still browse and RSVP to any jam. Ask someone you&rsquo;ve jammed with for an invite.
      </p>
    );
  return <PostJamForm />;
}
