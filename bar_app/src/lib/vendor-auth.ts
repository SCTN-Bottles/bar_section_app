export type VendorRole = "Owner" | "Manager";

export type VendorSession = {
  name: string;
  email: string;
  role: VendorRole;
  venueId: string;
};

const sessionKey = "sectn-demo-vendor-session";

const demoUsers: Array<VendorSession & { password: string }> = [
  {
    name: "Casey Owner",
    email: "owner@myhouse.demo",
    password: "owner123",
    role: "Owner",
    venueId: "venue-1",
  },
  {
    name: "Morgan Manager",
    email: "manager@myhouse.demo",
    password: "manager123",
    role: "Manager",
    venueId: "venue-1",
  },
];

export function loginMockVendor(email: string, password: string): VendorSession | null {
  const user = demoUsers.find(
    (candidate) => candidate.email === email.trim().toLowerCase() && candidate.password === password,
  );
  if (!user) return null;
  const { password: _password, ...session } = user;
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

export function getVendorSession(): VendorSession | null {
  try {
    const stored = window.localStorage.getItem(sessionKey);
    if (!stored) return null;
    const session: unknown = JSON.parse(stored);
    if (
      !session ||
      typeof session !== "object" ||
      !("email" in session) ||
      !("role" in session) ||
      !("venueId" in session)
    ) {
      return null;
    }
    const candidate = session as VendorSession;
    return demoUsers.some(
      (user) =>
        user.email === candidate.email && user.role === candidate.role && user.venueId === candidate.venueId,
    )
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export function logoutMockVendor() {
  window.localStorage.removeItem(sessionKey);
}
