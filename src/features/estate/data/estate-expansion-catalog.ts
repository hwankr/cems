import type { EstateExpansionParcelDefinition } from "../domain/types";

export const estateExpansionCatalog: readonly EstateExpansionParcelDefinition[] =
  [
    {
      id: "central-campus",
      nameKey: "estate.parcels.centralCampus",
      cost: 0,
      bounds: { minX: 0, minY: 0, width: 8, height: 8 },
      adjacentParcelIds: ["east-yard", "south-yard", "west-terrace"],
      initial: true,
    },
    {
      id: "east-yard",
      nameKey: "estate.parcels.eastYard",
      cost: 2_000,
      bounds: { minX: 8, minY: 0, width: 4, height: 8 },
      adjacentParcelIds: ["central-campus", "south-east-plaza"],
      initial: false,
    },
    {
      id: "south-yard",
      nameKey: "estate.parcels.southYard",
      cost: 5_000,
      bounds: { minX: 0, minY: 8, width: 8, height: 4 },
      adjacentParcelIds: ["central-campus", "south-east-plaza"],
      initial: false,
    },
    {
      id: "south-east-plaza",
      nameKey: "estate.parcels.southEastPlaza",
      cost: 8_000,
      bounds: { minX: 8, minY: 8, width: 4, height: 4 },
      adjacentParcelIds: ["east-yard", "south-yard"],
      initial: false,
    },
    {
      id: "west-terrace",
      nameKey: "estate.parcels.westTerrace",
      cost: 12_000,
      bounds: { minX: -4, minY: 0, width: 4, height: 8 },
      adjacentParcelIds: ["central-campus"],
      initial: false,
    },
  ];
