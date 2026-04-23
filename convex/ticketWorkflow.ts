import { TICKET_STATUSES, TicketStatus } from "./schema";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG: "Backlog",
  TEST_CASE: "TestCase",
  PLANNING: "Planning",
  CODE_GENERATION: "Code Generation",
  COMPLETED: "Completed",
};

export function nextStatus(current: TicketStatus): TicketStatus | null {
  const i = TICKET_STATUSES.indexOf(current);
  const nextIndex = i + 1;
  if (i === -1 || nextIndex >= TICKET_STATUSES.length) {
    return null;
  }
  const next = TICKET_STATUSES[nextIndex];
  return next === undefined ? null : next;
}

export function prevStatus(current: TicketStatus): TicketStatus | null {
  const i = TICKET_STATUSES.indexOf(current);
  const prevIndex = i - 1;
  if (i <= 0) {
    return null;
  }
  const prev = TICKET_STATUSES[prevIndex];
  return prev === undefined ? null : prev;
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}
