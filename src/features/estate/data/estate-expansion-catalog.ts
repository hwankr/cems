import type { EstateExpansionParcelDefinition } from "../domain/types";

export const estateExpansionCatalog: readonly EstateExpansionParcelDefinition[] =
  [
    {
      id: "central-campus",
      nameKey: "estate.parcels.centralCampus",
      cost: 0,
      bounds: { x: 0, y: 0, width: 8, height: 8 },
      isDefault: true,
    },
    {
      id: "east-yard",
      nameKey: "estate.parcels.eastYard",
      cost: 800,
      bounds: { x: 8, y: 0, width: 4, height: 8 },
    },
    {
      id: "south-yard",
      nameKey: "estate.parcels.southYard",
      cost: 1_000,
      bounds: { x: 0, y: 8, width: 8, height: 4 },
    },
    {
      id: "north-garden",
      nameKey: "estate.parcels.northGarden",
      cost: 1_400,
      bounds: { x: 0, y: -4, width: 8, height: 4 },
    },
    {
      id: "remote-island",
      nameKey: "estate.parcels.remoteIsland",
      cost: 2_400,
      bounds: { x: 30, y: 30, width: 4, height: 4 },
    },
  ];
