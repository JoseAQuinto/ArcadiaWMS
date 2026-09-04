import { eq } from "drizzle-orm";
import { db } from "../db";
import { categories } from "../db/schema";
import { ApiError } from "../utils/errors";
import { mapUniqueViolation } from "../utils/db-errors";
import type { CreateCategoryInput, UpdateCategoryInput } from "../validators/categories";

export async function listCategories(includeInactive = false) {
  const whereClause = includeInactive ? undefined : eq(categories.active, true);
  return db.select().from(categories).where(whereClause).orderBy(categories.name);
}

export async function createCategory(input: CreateCategoryInput) {
  try {
    const [row] = await db
      .insert(categories)
      .values({ name: input.name, description: input.description ?? null })
      .returning();
    return row;
  } catch (error) {
    mapUniqueViolation(error, "Ya existe una categoría con ese nombre.");
  }
}

export async function updateCategory(id: number, input: UpdateCategoryInput) {
  // See updateLocation: an empty payload would produce an UPDATE with no SET.
  if (Object.keys(input).length === 0) {
    throw ApiError.badRequest("No has indicado ningún cambio.");
  }
  try {
    const [row] = await db.update(categories).set(input).where(eq(categories.id, id)).returning();
    if (!row) throw ApiError.notFound("Categoría no encontrada.");
    return row;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    mapUniqueViolation(error, "Ya existe una categoría con ese nombre.");
  }
}
