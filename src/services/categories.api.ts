import { apiRequest } from "./api";
import type { Category } from "@/types/category";

export function fetchCategories(includeInactive = false): Promise<Category[]> {
  return apiRequest<Category[]>("/api/categories", { query: { includeInactive } });
}

export interface CategoryInput {
  name: string;
  description?: string | null;
}

export function createCategory(input: CategoryInput): Promise<Category> {
  return apiRequest<Category>("/api/categories", { method: "POST", body: input });
}

export function updateCategory(id: number, input: Partial<CategoryInput> & { active?: boolean }): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}`, { method: "PUT", body: input });
}
