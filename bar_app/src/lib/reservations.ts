import type { Reservation } from "@/types/venue";

export async function submitReservation(
  id: string,
  reservation: Omit<Reservation, "id" | "createdAt">,
  slot: "day" | "night",
) {
  const response = await fetch("/api/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, reservation, slot }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not submit reservation.");
  return result.warning as string | undefined;
}
