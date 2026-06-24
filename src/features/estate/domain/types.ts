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
  kind: "purchase-item" | "purchase-ground" | "unlock-parcel";
  pointDelta: number;
  itemDefinitionId?: string;
  parcelId?: string;
  createdAt: string;
};

export type EstateSnapshot = {
  schemaVersion: 1;
  subjectId: string;
  unlockedParcelIds: string[];
  items: EstateItemInstance[];
  inventory: EstateInventoryEntry[];
  groundTiles: EstateGroundTile[];
  transactions: EstateTransaction[];
  updatedAt: string;
};

export type EstateCommandFailureReason =
  | "insufficient-points"
  | "out-of-bounds"
  | "collision"
  | "missing-inventory"
  | "parcel-not-adjacent"
  | "already-unlocked"
  | "invalid-definition";

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

export type EstateExpansionParcelDefinition = {
  id: string;
  nameKey: string;
  cost: number;
  bounds?: EstateRectBounds;
  cells?: EstateGridCell[];
  isDefault?: boolean;
};

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

export type EstateRemoveItemCommand = {
  type: "remove-item";
  instanceId: string;
};

export type EstateUnlockParcelCommand = {
  type: "unlock-parcel";
  parcelId: string;
};

export type EstateCommand =
  | EstatePurchaseItemCommand
  | EstatePlaceItemCommand
  | EstatePaintGroundCommand
  | EstateRemoveItemCommand
  | EstateUnlockParcelCommand;

export type EstateParseResult =
  | { ok: true; snapshot: EstateSnapshot }
  | {
      ok: false;
      reason: "invalid-json" | "invalid-shape" | "unsupported-schema-version";
    };
