export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          title: string | null;
          type: string;
          email: string | null;
          phone: string | null;
          linkedin: string | null;
          referral_source_id: string | null;
          birthday: string | null;
          family_notes: string | null;
          interests: string | null;
          personality_notes: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["contacts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
      };
      matters: {
        Row: {
          id: string;
          title: string;
          client_id: string;
          type: string;
          status: string;
          stage: string | null;
          description: string | null;
          estimated_fees: number | null;
          fees_billed: number | null;
          fees_collected: number | null;
          opened_date: string | null;
          closed_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["matters"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["matters"]["Insert"]>;
      };
      activities: {
        Row: {
          id: string;
          contact_id: string | null;
          matter_id: string | null;
          type: string;
          subject: string;
          notes: string | null;
          activity_date: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activities"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          contact_id: string | null;
          matter_id: string | null;
          title: string;
          description: string | null;
          due_date: string | null;
          status: string;
          priority: string;
          recurring: boolean;
          recurrence_pattern: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      invoices: {
        Row: {
          id: string;
          matter_id: string;
          invoice_number: string | null;
          amount_billed: number;
          amount_collected: number;
          invoice_date: string;
          due_date: string;
          status: string;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["invoices"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
      };
    };
  };
};
