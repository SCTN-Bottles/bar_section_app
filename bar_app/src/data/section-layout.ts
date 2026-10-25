import type { SectionMapPosition } from "@/types/venue";

// The database owns section details. These coordinates belong to the current map artwork.
const positions: Record<string, SectionMapPosition> = {
  // Indoor
  "eba82d1b-3be2-4e5b-8ceb-89b85c409f67": { x: 70, y: 100, width: 85, height: 70 }, // A1
  "eee98f55-b78d-4bb2-b25a-7c39d4947ec3": { x: 70, y: 210, width: 85, height: 70 }, // A2
  "d7e8cf92-4970-44d2-9e07-535e2e2e005d": { x: 445, y: 100, width: 85, height: 70 }, // B1
  "be4039af-77ae-4ed2-aba8-764ea5543f73": { x: 445, y: 210, width: 85, height: 70 }, // B2
  // Cabanas
  "43b401e2-1372-4882-bed5-0d7b8245c2fe": { x: 65, y: 30, width: 110, height: 70 }, // Cabana 1
  "5aeac0c2-1874-481e-84d3-163c77a71930": { x: 245, y: 30, width: 110, height: 70 }, // Cabana 2
  "9d51f2ef-d59e-4fdf-8f84-727979037adf": { x: 425, y: 30, width: 110, height: 70 }, // Cabana 3
  // Attic
  "b480e3c0-f846-446f-9b4b-92d753bdcee9": { x: 50, y: 125, width: 100, height: 70 }, // T1
  "937f855f-1ec9-41fc-aa89-0190764ff440": { x: 450, y: 125, width: 100, height: 70 }, // T2
  "07d48b93-1f0e-4de6-b8b3-7cf2716c7614": { x: 450, y: 245, width: 100, height: 70 }, // T3
  // Bar couches
  "8887f3a6-cb51-4bdb-ba9f-591af0fc6f06": { x: 370, y: 110, width: 110, height: 70 }, // B1
  "e903d879-29f5-41f3-a23c-11c56adfea30": { x: 370, y: 220, width: 110, height: 70 }, // B2
};

export function getSectionMapPosition(sectionId: string): SectionMapPosition {
  const position = positions[sectionId];
  if (!position) throw new Error(`No map position is configured for section ${sectionId}`);
  return position;
}
