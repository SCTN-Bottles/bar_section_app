export type BookingHistoryRow = {
  booking_id: string;
  reservation_date: string;
  reservation_time: string;
  booking_slot: "day" | "night";
  record_type: "reservation" | "schedule";
  section_name: string;
  section_area: string;
  customer_name: string | null;
  customer_email: string | null;
  section_capacity: number;
  deposit_amount: number;
  minimum_spend_amount: number;
  drink_sign_text: string | null;
  paid_at: string | null;
};

export type BookingHistoryPage = {
  reservations: BookingHistoryRow[];
  total: number;
  page: number;
  years: number[];
};

export function parseHistoryFilters(params: URLSearchParams) {
  const pageText = params.get("page") || "1";
  const yearText = params.get("year") || "";
  const monthText = params.get("month") || "";
  if (!/^[1-9]\d{0,5}$/.test(pageText)) throw new Error("Invalid history page.");
  if (yearText && !/^[1-9]\d{3}$/.test(yearText)) throw new Error("Invalid history year.");
  if (monthText && !/^(?:[1-9]|1[0-2])$/.test(monthText)) throw new Error("Invalid history month.");
  return { page: Number(pageText), year: yearText ? Number(yearText) : null, month: monthText ? Number(monthText) : null };
}
