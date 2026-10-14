// The status of the stock of a material, in ONE place. The requirements have no minimum
// level; it is an optional addition: a material may have a `minLevel`. Then, by the total of all its lots:
//   Out     the total is 0
//   Low     the total is at or below the minimum level
//   Normal  the total is above it
// A material without a minimum level has no status (null): the system does not guess one.

export const STOCK_STATUSES = ["Normal", "Low", "Out"];

export const totalOf = (material) => Math.round(material.lots.reduce((sum, lot) => sum + lot.quantity, 0) * 1000) / 1000;

export function stockStatusOf(material) {
  if (material.minLevel === null || material.minLevel === undefined) return null;
  const total = totalOf(material);
  if (total === 0) return "Out";
  return total <= material.minLevel ? "Low" : "Normal";
}

/** A material as the app sees it: its record with the total of its lots and its stock status. */
export const materialView = (material) => ({ ...material, total: totalOf(material), stockStatus: stockStatusOf(material) });
