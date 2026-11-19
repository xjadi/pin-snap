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
          title: string | null;
          visited_at: string | null;
          tags: string | null;
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
          title?: string | null;
          visited_at?: string | null;
          tags?: string | null;
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
          title?: string | null;
          visited_at?: string | null;
          tags?: string | null;
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
      join_me_posts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          city: string;
          country: string;
          lat: number;
          lng: number;
          start_date: string;
          end_date: string | null;
          schedule_note: string;
          details: string;
          status: "open" | "closed";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          city: string;
          country?: string;
          lat: number;
          lng: number;
          start_date: string;
          end_date?: string | null;
          schedule_note?: string;
          details?: string;
          status?: "open" | "closed";
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          city?: string;
          country?: string;
          lat?: number;
          lng?: number;
          start_date?: string;
          end_date?: string | null;
          schedule_note?: string;
          details?: string;
          status?: "open" | "closed";
        };
        Relationships: [
          {
            foreignKeyName: "join_me_posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      join_me_replies: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          body: string;
          intent: "join" | "reply";
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          body: string;
          intent?: "join" | "reply";
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          body?: string;
          intent?: "join" | "reply";
        };
        Relationships: [
          {
            foreignKeyName: "join_me_replies_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "join_me_posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "join_me_replies_user_id_fkey";
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