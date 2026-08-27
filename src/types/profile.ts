/**
 * `instructor` は認定インストラクター。利用者より広い情報（使い分け指針・禁忌）を見られるが、
 * 内部配合比率は見られない。開示範囲の判定は `@/lib/disclosure` を参照。
 */
export type UserRole = "customer" | "instructor" | "admin";

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  favorite_types?: string[];
  frequent_times?: string[];
};
