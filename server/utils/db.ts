/**
 * Unwraps the first row of a query result that is guaranteed by the query
 * itself to return exactly one row (an INSERT ... RETURNING, or an
 * aggregate like COUNT/SUM which always returns one row). Needed because
 * TypeScript's noUncheckedIndexedAccess otherwise types array access as
 * possibly undefined.
 */
export function firstRow<T>(rows: T[]): T {
  const row = rows[0];
  if (row === undefined) {
    throw new Error("Expected the database to return at least one row, got none.");
  }
  return row;
}
