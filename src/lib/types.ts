export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string;
          bio: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string;
          bio?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string;
          bio?: string;
        };
        Relationships: [];
      };
      pins: {
        Row: {
          id: string;
          user_id: string;
          photo_url: string;
          lat: number;
          lng: number;
          city: string;
          country: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          photo_url: string;
          lat: number;
          lng: number;
          city?: string;
          country?: string;
          notes?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          photo_url?: string;
          lat?: number;
          lng?: number;
          city?: string;
          country?: string;
          notes?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pins_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [key: string]: never };
    Functions: { [key: string]: never };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
}