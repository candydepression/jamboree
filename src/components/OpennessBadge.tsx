import type { Openness } from "@/lib/types";
import { OPENNESS_LABEL } from "@/lib/views";

const STYLE: Record<Openness, string> = {
  public: "bg-amber-100 text-amber-800",
  rsvp: "bg-sky-100 text-sky-800",
  approval: "bg-violet-100 text-violet-800",
};

export default function OpennessBadge({ openness }: { openness: Openness }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLE[openness]}`}>{OPENNESS_LABEL[openness]}</span>;
}
