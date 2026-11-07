import { adminClient, errorResponse, sendReservationEmail } from "@/lib/server/reservation-payments";

export async function POST(request: Request) {
  try {
    const { id, reservation, slot } = await request.json();
    const { error } = await adminClient().schema("sctn-dev").rpc("submit_reservation", {
      p_id: id, p_venue_id: reservation.venueId, p_section_id: reservation.sectionId,
      p_date: reservation.reservationDate, p_slot: slot,
      p_name: reservation.customerName, p_email: reservation.customerEmail,
      p_guests: reservation.guestCount, p_sign: reservation.drinkSignText ?? "",
      p_beverages: reservation.beverages,
    });
    if (error) throw new Error(error.message);
    try {
      await sendReservationEmail(id, false);
      return Response.json({ id });
    } catch {
      return Response.json({ id, warning: "Your reservation was saved, but the review email could not be delivered. Keep your reservation number." });
    }
  } catch (error) { return errorResponse(error); }
}
