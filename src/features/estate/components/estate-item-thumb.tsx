import {
  estateAssetManifest,
  type EstateAssetManifest,
} from "../data/estate-asset-manifest";
import type { EstateItemDefinition } from "../domain/types";
import styles from "./estate-shell.module.css";

/**
 * Isometric preview thumbnail shared by the estate inventory and the shop page.
 * Item sprites float over a grass tile; ground items fill the frame with their
 * own tile texture.
 */
export function ItemThumb({ definition }: { definition: EstateItemDefinition }) {
  const sizing = "h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16";
  const manifest: EstateAssetManifest = estateAssetManifest;
  const itemAsset = manifest.items[definition.assetId];

  if (itemAsset) {
    return (
      <div className={`${styles.thumb} ${sizing}`} aria-hidden="true">
        <span
          className={styles.thumbSprite}
          style={{ backgroundImage: `url("${itemAsset.src}")` }}
        />
      </div>
    );
  }

  const groundAsset = manifest.ground[definition.assetId];

  if (groundAsset) {
    return (
      <div
        className={`${styles.thumbGround} ${sizing}`}
        style={{ backgroundImage: `url("${groundAsset.src}")` }}
        aria-hidden="true"
      />
    );
  }

  return <div className={`${styles.thumb} ${sizing}`} aria-hidden="true" />;
}

export default ItemThumb;
