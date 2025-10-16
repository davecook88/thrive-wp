import type { DataSource } from "typeorm";

interface InsertResultMaybeArray {
  insertId?: number;
}

export async function execInsert(
  ds: DataSource,
  sql: string,
  params: unknown[],
): Promise<number> {
  const result = (await ds.query(sql, params)) as unknown;
  if (Array.isArray(result)) {
    const first = result[0] as InsertResultMaybeArray | undefined;
    if (first && typeof first.insertId === "number") return first.insertId;
  } else if (
    result &&
    typeof (result as InsertResultMaybeArray).insertId === "number"
  ) {
    return (result as InsertResultMaybeArray).insertId as number;
  }
  throw new Error("execInsert: insertId not found");
}
