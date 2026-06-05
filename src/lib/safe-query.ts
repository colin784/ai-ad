/**
 * Run a DB query, returning a fallback instead of throwing. Keeps build-time
 * prerendering and runtime rendering resilient: a transient/unavailable DB
 * yields empty UI (and the error boundary / next revalidation) rather than a
 * failed deploy or a white screen.
 */
export async function safe<T>(p: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[db] query failed:", e);
    return fallback;
  }
}
