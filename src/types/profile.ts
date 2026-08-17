export type UserRole = "customer" | "admin";

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
