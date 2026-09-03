import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="text-xl font-bold tracking-[0.2em]"
        >
          SECTN
        </Link>

        <nav className="flex items-center gap-8 text-sm">
          <Link
            href="/venues"
            className="text-neutral-600 hover:text-black"
          >
            Explore
          </Link>

          <span className="text-neutral-400">
            For Venues
          </span>
        </nav>
      </div>
    </header>
  );
}