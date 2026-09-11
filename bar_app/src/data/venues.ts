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
        bookingCalendar: {
          availableWeekdays: [0, 2, 4, 5, 6],
          placeholderTime: "8:00 PM",
        },
        sections: [
      {
        id: "indoor-a1",
        name: "A1",
        area: "indoor",
        capacity: 8,
        minimumSpend: 300,
        deposit: 100,
        status: "sold",
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
        id: "indoor-a2",
        name: "A2",
        area: "indoor",
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
        id: "cabana-1",
        name: "Cabana 1",
        area: "cabanas",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "sold",
        description:
          "Cabana positioned beside the main floor.",

        mapPosition: {
          x: 65,
          y: 145,
          width: 110,
          height: 70,
        },
      },

      {
        id: "indoor-b1",
        name: "B1",
        area: "indoor",
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
        id: "indoor-b2",
        name: "B2",
        area: "indoor",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "available",
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
        id: "cabana-2",
        name: "Cabana 2",
        area: "cabanas",
        capacity: 8,
        minimumSpend: 350,
        deposit: 100,
        status: "available",
        description:
          "Cabana centered beside the main floor.",

        mapPosition: {
          x: 245,
          y: 145,
          width: 110,
          height: 70,
       },
      },
      { id: "cabana-3", name: "Cabana 3", area: "cabanas", capacity: 10, minimumSpend: 350, deposit: 100, status: "available", description: "Cabana positioned beside the main floor.", mapPosition: { x: 425, y: 145, width: 110, height: 70 } },
      { id: "attic-1", name: "T1", area: "attic", capacity: 8, minimumSpend: 325, deposit: 100, status: "sold", description: "Attic section on the left side of the dance floor.", mapPosition: { x: 50, y: 125, width: 100, height: 70 } },
      { id: "attic-2", name: "T2", area: "attic", capacity: 8, minimumSpend: 325, deposit: 100, status: "available", description: "Attic section on the right side of the dance floor.", mapPosition: { x: 450, y: 125, width: 100, height: 70 } },
      { id: "attic-3", name: "T3", area: "attic", capacity: 10, minimumSpend: 375, deposit: 125, status: "available", description: "Attic section beside the lower bar.", mapPosition: { x: 450, y: 245, width: 100, height: 70 } },
      { id: "bar-1", name: "B1", area: "bar", capacity: 8, minimumSpend: 275, deposit: 100, status: "sold", description: "Couches section to the right of the bar.", mapPosition: { x: 370, y: 110, width: 110, height: 70 } },
      { id: "bar-2", name: "B2", area: "bar", capacity: 8, minimumSpend: 275, deposit: 100, status: "available", description: "Couches section to the right of the bar.", mapPosition: { x: 370, y: 220, width: 110, height: 70 } },
     ],
    },
];
