
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";

import ActionButton from "@/components/ui/ActionButton";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-32 text-center">

      <Heading level={1} className="display-heading">
        Page not found
      </Heading>

      <Text as="p" type="inherit" color="inherit" className="mt-4 text-neutral-600">
        That venue or section could
        not be found.
      </Text>

      <ActionButton
        href="/MyHouse"
        variant="primary"
        label="Return to My House"
        className="mt-8"
      />

    </main>
  );
}
