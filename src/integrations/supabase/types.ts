export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      affiliate_links: {
        Row: {
          affiliate_code: string
          affiliate_user_id: string
          clicks: number | null
          created_at: string | null
          id: string
          product_id: string
        }
        Insert: {
          affiliate_code: string
          affiliate_user_id: string
          clicks?: number | null
          created_at?: string | null
          id?: string
          product_id: string
        }
        Update: {
          affiliate_code?: string
          affiliate_user_id?: string
          clicks?: number | null
          created_at?: string | null
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      content_moderation: {
        Row: {
          content_id: string
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          flagged_reasons: string[] | null
          id: string
          is_adult_content: boolean
          moderation_score: Json | null
          reviewed_at: string | null
          reviewed_by_ai: boolean | null
          reviewed_by_human: boolean | null
        }
        Insert: {
          content_id: string
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          flagged_reasons?: string[] | null
          id?: string
          is_adult_content?: boolean
          moderation_score?: Json | null
          reviewed_at?: string | null
          reviewed_by_ai?: boolean | null
          reviewed_by_human?: boolean | null
        }
        Update: {
          content_id?: string
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          flagged_reasons?: string[] | null
          id?: string
          is_adult_content?: boolean
          moderation_score?: Json | null
          reviewed_at?: string | null
          reviewed_by_ai?: boolean | null
          reviewed_by_human?: boolean | null
        }
        Relationships: []
      }
      creator_earnings: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string
          earning_type: string
          id: string
          post_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          earning_type: string
          id?: string
          post_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          earning_type?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_earnings_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      external_affiliate_clicks: {
        Row: {
          clicker_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          link_id: string
        }
        Insert: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_id: string
        }
        Update: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "external_affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      external_affiliate_links: {
        Row: {
          affiliate_url: string
          click_count: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          link_name: string
          link_type: string
          merchant_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_url: string
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link_name: string
          link_type?: string
          merchant_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_url?: string
          click_count?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          link_name?: string
          link_type?: string
          merchant_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      identity_verification: {
        Row: {
          created_at: string | null
          document_type: string
          document_url: string
          id: string
          metadata: Json | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          verification_status: string
        }
        Insert: {
          created_at?: string | null
          document_type: string
          document_url: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          verification_status?: string
        }
        Update: {
          created_at?: string | null
          document_type?: string
          document_url?: string
          id?: string
          metadata?: Json | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verification_status?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          is_live: boolean | null
          metadata: Json | null
          platforms: string[] | null
          started_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          metadata?: Json | null
          platforms?: string[] | null
          started_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          is_live?: boolean | null
          metadata?: Json | null
          platforms?: string[] | null
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      platform_connections: {
        Row: {
          access_token: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          rtmp_url: string | null
          stream_key: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          rtmp_url?: string | null
          stream_key?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          rtmp_url?: string | null
          stream_key?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_earnings: {
        Row: {
          amount: number
          commission_rate: number
          created_at: string | null
          id: string
          sale_id: string | null
        }
        Insert: {
          amount: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          sale_id?: string | null
        }
        Update: {
          amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_earnings_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      post_clicks: {
        Row: {
          clicker_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          post_id: string
        }
        Insert: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id: string
        }
        Update: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_clicks_clicker_id_fkey"
            columns: ["clicker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_clicks_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payer_id: string
          payment_type: string
          post_id: string
          status: string | null
          stripe_payment_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          payer_id: string
          payment_type: string
          post_id: string
          status?: string | null
          stripe_payment_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payer_id?: string
          payment_type?: string
          post_id?: string
          status?: string | null
          stripe_payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_payments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          post_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          post_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          click_count: number | null
          content: string
          created_at: string | null
          id: string
          media_type: string | null
          media_url: string | null
          monetization_type: string | null
          price: number | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          click_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          price?: number | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          click_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          price?: number | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_settings: {
        Row: {
          allow_messages: boolean | null
          allow_tags: boolean | null
          created_at: string | null
          id: string
          show_activity: boolean | null
          show_email: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allow_messages?: boolean | null
          allow_tags?: boolean | null
          created_at?: string | null
          id?: string
          show_activity?: boolean | null
          show_email?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allow_messages?: boolean | null
          allow_tags?: boolean | null
          created_at?: string | null
          id?: string
          show_activity?: boolean | null
          show_email?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          rating: number
          review_text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          rating: number
          review_text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          blocked_reason: string | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_blocked: boolean | null
          moderation_score: Json | null
          price: number
          seller_id: string
          shipping_cost: number | null
          status: string | null
          stock_quantity: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          blocked_reason?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean | null
          moderation_score?: Json | null
          price: number
          seller_id: string
          shipping_cost?: number | null
          status?: string | null
          stock_quantity?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          blocked_reason?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_blocked?: boolean | null
          moderation_score?: Json | null
          price?: number
          seller_id?: string
          shipping_cost?: number | null
          status?: string | null
          stock_quantity?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_private: boolean | null
          is_verified: boolean | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string | null
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_private?: boolean | null
          is_verified?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_private?: boolean | null
          is_verified?: boolean | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      sales: {
        Row: {
          affiliate_commission: number | null
          affiliate_id: string | null
          amount: number
          buyer_email: string
          created_at: string | null
          id: string
          platform_commission: number | null
          platform_commission_rate: number | null
          product_id: string
          seller_commission: number | null
          seller_id: string
          shipping_cost: number | null
          status: string | null
        }
        Insert: {
          affiliate_commission?: number | null
          affiliate_id?: string | null
          amount: number
          buyer_email: string
          created_at?: string | null
          id?: string
          platform_commission?: number | null
          platform_commission_rate?: number | null
          product_id: string
          seller_commission?: number | null
          seller_id: string
          shipping_cost?: number | null
          status?: string | null
        }
        Update: {
          affiliate_commission?: number | null
          affiliate_id?: string | null
          amount?: number
          buyer_email?: string
          created_at?: string | null
          id?: string
          platform_commission?: number | null
          platform_commission_rate?: number | null
          product_id?: string
          seller_commission?: number | null
          seller_id?: string
          shipping_cost?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_profiles: {
        Row: {
          business_description: string | null
          business_name: string
          commission_rate: number | null
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_description?: string | null
          business_name: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_description?: string | null
          business_name?: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stream_chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          platform: string
          platform_message_id: string | null
          stream_id: string | null
          user_avatar: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          platform: string
          platform_message_id?: string | null
          stream_id?: string | null
          user_avatar?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          platform?: string
          platform_message_id?: string | null
          stream_id?: string | null
          user_avatar?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_chat_messages_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string | null
          id: string
          status: string
          stripe_payment_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_id: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          stripe_payment_id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_follower_count: { Args: { user_uuid: string }; Returns: number }
      get_total_views: { Args: { user_uuid: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_adult: { Args: { user_uuid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "seller" | "affiliate" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "affiliate", "user"],
    },
  },
} as const
