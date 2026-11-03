// Small helpers every feature's data hooks share.

/**
 * Supabase hands back { data, error }; screens want a value or a thrown, readable error.
 * Without an error, data is present (or null on purpose, for maybeSingle and writes).
 */
export function must<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const DAY_MS = 86_400_000;
