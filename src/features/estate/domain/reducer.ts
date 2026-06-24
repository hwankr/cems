import { reduceEstateCommand } from "./commands";
import type {
  EstateCommand,
  EstateCommandContext,
  EstateCommandResult,
  EstateSnapshot,
} from "./types";

export function estateReducer(
  snapshot: EstateSnapshot,
  command: EstateCommand,
  context: EstateCommandContext,
): EstateCommandResult {
  return reduceEstateCommand(snapshot, command, context);
}
