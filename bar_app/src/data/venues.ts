import { Venue } from "@/types/venue";

export const venues: Venue[] = [
    {
        id: "venue-1",
        name: "MyHouse",
        venueName: "MyHouse",
        city: "Columbia",
        state: "MO",
        description:
      "Browse available sections, compare capacity, and reserve your space.",
        sections: [
        {
            id: "a1",
            name: "A1",
            capacity: 8,
            minimumSpend: 300,
            deposit: 100,
            status: "available",
            description: "Section near the main floor.",
            mapPosition: {
            x: 80,
            y: 100,
            width: 80,
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
            description: "Larger section with room for up to 10 guests.",
            mapPosition: {
            x: 80,
            y: 200,
            width: 80,
            height: 70,
            },
       },
       {
            id: "b1",
            name: "B1",
            capacity: 8,
            minimumSpend: 350,
            deposit: 100,
            status: "sold",
            description: "Section on the opposite side of the floor.",
            mapPosition: {
            x: 440,
            y: 100,
            width: 80,
            height: 70,
            },
       },
       { 
            id: "b2",
            name: "B2",
            capacity: 10,
            minimumSpend: 450,
            deposit: 125,
            status: "available",
            description: "Premium section near the center.",
            mapPosition: {
            x: 440,
            y: 200,
            width: 80,
            height: 70,
            },
        },
        ],
    },
];