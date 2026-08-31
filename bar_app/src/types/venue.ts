export type SectionStatus = "available" | "sold";

export type SectionMapPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Section = {
  id: string;
  name: string;
  capacity: number;
  minimumSpend: number;
  deposit: number;
  status: SectionStatus;
  description: string;
  mapPosition: SectionMapPosition;
};

export type Venue = {
  id: string;
  name: string;
  venueName: string;
  city: string;
  state: string;
  description: string;
  sections: Section[];
};