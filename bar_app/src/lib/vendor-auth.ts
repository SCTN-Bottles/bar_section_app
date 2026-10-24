import { supabase } from "@/lib/supabase";

export type VendorSession = {
  email: string;
  venueId: string;
};

const currentVenueId = "venue-1";

export async function getVendorSession(): Promise<VendorSession | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email) return null;

    return { email: user.email, venueId: currentVenueId };
  } catch {
    return null;
  }
}

export async function logoutVendor() {
  return supabase.auth.signOut();
}
