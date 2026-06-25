import type { EstateExpansionParcelDefinition } from "../domain/types";

// A 16x16 free central core surrounded by eight lockable 16x16 parcels, forming
// a 48x48 map centered on the core (x and y span -16..31). Edges (N/E/S/W)
// unlock directly from the core; corners (NE/SE/SW/NW) require an adjacent edge
// first, so the estate grows outward in stages. From the start the whole locked
// frame is visible, conveying how much room there is to expand.
export const estateExpansionCatalog: readonly EstateExpansionParcelDefinition[] =
  [
    {
      id: "central-campus",
      nameKey: "estate.parcels.centralCampus",
      cost: 0,
      bounds: { minX: 0, minY: 0, width: 16, height: 16 },
      adjacentParcelIds: ["north", "east", "south", "west"],
      initial: true,
    },
    {
      id: "north",
      nameKey: "estate.parcels.north",
      cost: 3_000,
      bounds: { minX: 0, minY: -16, width: 16, height: 16 },
      adjacentParcelIds: ["central-campus", "north-east", "north-west"],
      initial: false,
    },
    {
      id: "east",
      nameKey: "estate.parcels.east",
      cost: 4_000,
      bounds: { minX: 16, minY: 0, width: 16, height: 16 },
      adjacentParcelIds: ["central-campus", "north-east", "south-east"],
      initial: false,
    },
    {
      id: "south",
      nameKey: "estate.parcels.south",
      cost: 6_000,
      bounds: { minX: 0, minY: 16, width: 16, height: 16 },
      adjacentParcelIds: ["central-campus", "south-east", "south-west"],
      initial: false,
    },
    {
      id: "west",
      nameKey: "estate.parcels.west",
      cost: 8_000,
      bounds: { minX: -16, minY: 0, width: 16, height: 16 },
      adjacentParcelIds: ["central-campus", "north-west", "south-west"],
      initial: false,
    },
    {
      id: "north-east",
      nameKey: "estate.parcels.northEast",
      cost: 12_000,
      bounds: { minX: 16, minY: -16, width: 16, height: 16 },
      adjacentParcelIds: ["north", "east"],
      initial: false,
    },
    {
      id: "south-east",
      nameKey: "estate.parcels.southEast",
      cost: 15_000,
      bounds: { minX: 16, minY: 16, width: 16, height: 16 },
      adjacentParcelIds: ["east", "south"],
      initial: false,
    },
    {
      id: "south-west",
      nameKey: "estate.parcels.southWest",
      cost: 18_000,
      bounds: { minX: -16, minY: 16, width: 16, height: 16 },
      adjacentParcelIds: ["south", "west"],
      initial: false,
    },
    {
      id: "north-west",
      nameKey: "estate.parcels.northWest",
      cost: 22_000,
      bounds: { minX: -16, minY: -16, width: 16, height: 16 },
      adjacentParcelIds: ["north", "west"],
      initial: false,
    },
  ];
