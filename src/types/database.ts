import type { AromaRecord, MoodCategory } from "./aroma";
import type { Profile } from "./profile";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
        Relationships: [];
      };
      aroma_records: {
        Row: Omit<AromaRecord, "ingredients">;
        Insert: Partial<Omit<AromaRecord, "ingredients">>;
        Update: Partial<Omit<AromaRecord, "ingredients">>;
        Relationships: [];
      };
      aroma_ingredients: {
        Row: AromaRecord["ingredients"][number];
        Insert: Partial<AromaRecord["ingredients"][number]>;
        Update: Partial<AromaRecord["ingredients"][number]>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          aroma_record_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          aroma_record_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          aroma_record_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      mood_categories: {
        Row: MoodCategory;
        Insert: Partial<MoodCategory>;
        Update: Partial<MoodCategory>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
