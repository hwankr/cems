export type QuarterTurn = 0 | 1 | 2 | 3;

export type EstatePointAccount = {
  earnedPoints: number;
  spentPoints: number;
  availablePoints: number;
};

export type EstateItemCategory =
  | "landmark"
  | "nature"
  | "furniture"
  | "energy"
  | "generator"
  | "facility"
  | "ground";

export type EstatePlacementRule = "land" | "ground" | "edge";

export type EstateItemDefinition = {
  id: string;
  nameKey: string;
  descriptionKey: string;
  category: EstateItemCategory;
  cost: number;
  footprintWidth: number;
  footprintHeight: number;
  canRotate: boolean;
  assetId: string;
  placementRule: EstatePlacementRule;
  /** Which currency buys this item. Defaults to "points" when unset. */
  currency?: "points" | "eco";
  /** Eco-credits generated per hour while this item is placed (generators only). */
  ecoRatePerHour?: number;
};

export type EstateItemInstance = {
  id: string;
  definitionId: string;
  x: number;
  y: number;
  rotation: QuarterTurn;
  placedAt: string;
};

export type EstateInventoryEntry = {
  definitionId: string;
  quantity: number;
};

export type EstateGroundTile = {
  x: number;
  y: number;
  definitionId: string;
};

export type EstateTransaction = {
  id: string;
  kind: "purchase-item" | "purchase-ground" | "unlock-parcel" | "upgrade-building";
  pointDelta: number;
  itemDefinitionId?: string;
  parcelId?: string;
  createdAt: string;
};

export type EstateSnapshot = {
  schemaVersion: 3;
  subjectId: string;
  mainBuildingLevel: number;
  unlockedParcelIds: string[];
  items: EstateItemInstance[];
  inventory: EstateInventoryEntry[];
  groundTiles: EstateGroundTile[];
  transactions: EstateTransaction[];
  /** Banked eco-credits (excludes uncollected pending accrual). */
  ecoCredits: number;
  /** ISO timestamp the eco-credit accrual was last banked from. */
  ecoCollectedAt: string;
  updatedAt: string;
};

export type EstateCommandFailureReason =
  | "insufficient-points"
  | "insufficient-eco"
  | "out-of-bounds"
  | "locked-cell"
  | "collision"
  | "missing-inventory"
  | "parcel-not-adjacent"
  | "already-unlocked"
  | "protected-item"
  | "invalid-definition"
  | "building-max-level"
  | "edge-required";

export type EstateCommandResult =
  | { ok: true; snapshot: EstateSnapshot }
  | {
      ok: false;
      snapshot: EstateSnapshot;
      reason: EstateCommandFailureReason;
    };

export type EstateGridCell = {
  x: number;
  y: number;
};

export type EstateRectBounds = EstateGridCell & {
  width: number;
  height: number;
};

export type EstateParcelBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

export type EstateParcelDefinition = {
  id: string;
  nameKey?: string;
  bounds: EstateParcelBounds;
  cost: number;
  adjacentParcelIds: string[];
  initial: boolean;
};

export type EstateExpansionParcelDefinition = EstateParcelDefinition;

export type EstateClock = () => string;
export type EstateIdFactory = () => string;

export type EstateCommandContext = {
  earnedPoints: number;
  itemDefinitions: readonly EstateItemDefinition[];
  parcelDefinitions: readonly EstateExpansionParcelDefinition[];
  createId: EstateIdFactory;
  now: EstateClock;
};

export type EstatePlacementInput = {
  definitionId: string;
  x: number;
  y: number;
  rotation: QuarterTurn;
};

export type EstatePurchaseItemCommand = {
  type: "purchase-item";
  definitionId: string;
};

export type EstatePlaceItemCommand = {
  type: "place-item";
} & EstatePlacementInput;

export type EstatePaintGroundCommand = {
  type: "paint-ground";
  definitionId: string;
  x: number;
  y: number;
};

export type EstatePaintGroundCellsCommand = {
  type: "paint-ground-cells";
  definitionId: string;
  cells: EstateGridCell[];
};

export type EstateMoveItemCommand = {
  type: "move-item";
  instanceId: string;
  x: number;
  y: number;
  rotation: QuarterTurn;
};

export type EstateRemoveItemCommand = {
  type: "remove-item";
  instanceId: string;
};

export type EstateUnlockParcelCommand = {
  type: "unlock-parcel";
  parcelId: string;
};

export type EstateUpgradeMainBuildingCommand = {
  type: "upgrade-main-building";
};

export type EstateCommand =
  | EstatePurchaseItemCommand
  | EstatePlaceItemCommand
  | EstatePaintGroundCommand
  | EstatePaintGroundCellsCommand
  | EstateMoveItemCommand
  | EstateRemoveItemCommand
  | EstateUnlockParcelCommand
  | EstateUpgradeMainBuildingCommand;

export type EstateGroundPaintCommandResult =
  | {
      ok: true;
      snapshot: EstateSnapshot;
      paintedCells: EstateGridCell[];
      skippedCells: EstateGridCell[];
      stoppedReason?: "insufficient-points";
    }
  | {
      ok: false;
      snapshot: EstateSnapshot;
      reason: EstateCommandFailureReason;
      paintedCells: EstateGridCell[];
      skippedCells: EstateGridCell[];
    };

export type EstateParseResult =
  | { ok: true; snapshot: EstateSnapshot }
  | {
      ok: false;
      reason: "invalid-json" | "invalid-shape" | "unsupported-schema-version";
    };
