export interface SessionBookingCount {
  bookedCount: number;
  waitlistCount: number;
}

export function sessionCountKey(scheduleId: string, sessionDate: string): string {
  return `${scheduleId}_${sessionDate}`;
}

type BatchFetchResult<T> =
  | { data: T; ok: true }
  | { data: null; ok: false; status: number; message: string };

/**
 * Live booking counts for multiple scheduleId+date pairs in one request.
 */
export async function fetchSessionBookingCountsBatch(
  sessions: Array<{ scheduleId: string; sessionDate: string }>,
  fetchFn: (url: string, options?: RequestInit) => Promise<BatchFetchResult<{ counts: Record<string, SessionBookingCount> }>>
): Promise<Record<string, SessionBookingCount>> {
  if (sessions.length === 0) return {};

  const res = await fetchFn("/api/session-bookings/batch", {
    method: "POST",
    body: JSON.stringify({
      sessions: sessions.map((s) => ({
        scheduleId: s.scheduleId,
        date: s.sessionDate,
      })),
    }),
  });

  if (!res.ok || !res.data?.counts) {
    return {};
  }

  return res.data.counts;
}
