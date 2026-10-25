import { supabase } from "@/lib/supabase";

export type VendorSession = {
  email: string;
  venueId: string;
  venueName: string;
};

export async function getVendorSession(): Promise<VendorSession | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return null;

    const { data: assignment, error: assignmentError } = await supabase
      .schema("sctn-dev")
      .from("venue_managers")
      .select("venue_id")
      .eq("user_id", user.id)
      .order("venue_id")
      .limit(1)
      .maybeSingle();

    if (assignmentError || !assignment) return null;

    const { data: venue, error: venueError } = await supabase
      .schema("sctn-dev")
      .from("venues")
      .select("id, slug")
      .eq("id", assignment.venue_id)
      .single();

    if (venueError) return null;
    return { email: user.email, venueId: venue.id, venueName: venue.slug };
  } catch {
    return null;
  }
}

export async function logoutVendor() {
  return supabase.auth.signOut();
}
