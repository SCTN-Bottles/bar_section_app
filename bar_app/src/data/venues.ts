import { Venue } from "@/types/venue";

export const venues: Venue[] = [
    {
        id: "venue-1",
        name: "MyHouse",
        venueName: "MyHouse",
        city: "Columbia",
        state: "MO",
        description:
      "Browse available sections and reserve your space for the night.",
        sections: [
      {
        id: "a1",
        name: "A1",
        capacity: 8,
        minimumSpend: 300,
        deposit: 100,
        status: "available",
        description:
          "Section located near the main floor.",

        mapPosition: {
          x: 70,
          y: 100,
          width: 85,
          height: 70,
        },
      },

      {
        id: "a2",
        name: "A2",
        capacity: 10,
        minimumSpend: 400,
        deposit: 100,
        status: "available",
        description:
          "Larger section with room for up to 10 guests.",

        mapPosition: {
          x: 70,
          y: 210,
          width: 85,
          height: 70,
        },
      },

      {
        id: "a3",
        name: "A3",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "available",
        description:
          "Section positioned toward the lower side of the floor.",

        mapPosition: {
          x: 70,
          y: 320,
          width: 85,
          height: 70,
        },
      },

      {
        id: "b1",
        name: "B1",
        capacity: 10,
        minimumSpend: 450,
        deposit: 125,
        status: "available",
        description:
          "Larger section across from the A sections.",

        mapPosition: {
          x: 445,
          y: 100,
          width: 85,
          height: 70,
        },
      },

      {
        id: "b2",
        name: "B2",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "sold",
        description:
          "Mid-sized section near the center floor.",

        mapPosition: {
          x: 445,
          y: 210,
          width: 85,
          height: 70,
        },
      },

      {
        id: "b3",
        name: "B3",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "available",
        description:
          "Section located toward the lower floor.",

        mapPosition: {
          x: 445,
          y: 320,
          width: 85,
          height: 70,
       },
      },
     ],
    },
];