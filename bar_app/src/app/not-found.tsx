import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-32 text-center">

      <h1 className="text-4xl font-semibold">
        Page not found
      </h1>

      <p className="mt-4 text-neutral-600">
        That venue or section could
        not be found.
      </p>

      <Link
        href="/MyHouse"
        className="mt-8 inline-block rounded-lg bg-black px-6 py-3 text-white"
      >
        Return to My House
      </Link>

    </main>
  );
}