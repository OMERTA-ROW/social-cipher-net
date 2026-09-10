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
    PostgrestVersion: "14.5"
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
      crypto_transactions: {
        Row: {
          chain: string
          confirmations: number | null
          created_at: string | null
          crypto_amount: number
          crypto_currency: string
          id: string
          metadata: Json | null
          status: string
          transaction_hash: string
          transaction_type: string
          usd_value: number
          user_id: string
          wallet_address: string
        }
        Insert: {
          chain: string
          confirmations?: number | null
          created_at?: string | null
          crypto_amount: number
          crypto_currency: string
          id?: string
          metadata?: Json | null
          status?: string
          transaction_hash: string
          transaction_type: string
          usd_value: number
          user_id: string
          wallet_address: string
        }
        Update: {
          chain?: string
          confirmations?: number | null
          created_at?: string | null
          crypto_amount?: number
          crypto_currency?: string
          id?: string
          metadata?: Json | null
          status?: string
          transaction_hash?: string
          transaction_type?: string
          usd_value?: number
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      crypto_wallets: {
        Row: {
          chain: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          user_id: string
          wallet_address: string
        }
        Insert: {
          chain: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id: string
          wallet_address: string
        }
        Update: {
          chain?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      external_affiliate_clicks: {
        Row: {
          clicker_id: string | null
          created_at: string | null
          id: string
          ip_hash: string | null
          link_id: string
        }
        Insert: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          link_id: string
        }
        Update: {
          clicker_id?: string | null
          created_at?: string | null
          id?: string
          ip_hash?: string | null
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
      external_mining_accounts: {
        Row: {
          account_name: string
          account_type: string
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          mining_type: string
          optimization_level: string
          platform: string
          updated_at: string
          user_id: string
          wallet_address: string | null
        }
        Insert: {
          account_name: string
          account_type: string
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mining_type: string
          optimization_level?: string
          platform: string
          updated_at?: string
          user_id: string
          wallet_address?: string | null
        }
        Update: {
          account_name?: string
          account_type?: string
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          mining_type?: string
          optimization_level?: string
          platform?: string
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      favorite_pov_views: {
        Row: {
          created_at: string
          custom_name: string | null
          id: string
          metadata: Json | null
          pov_index: number
          pov_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_name?: string | null
          id?: string
          metadata?: Json | null
          pov_index: number
          pov_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_name?: string | null
          id?: string
          metadata?: Json | null
          pov_index?: number
          pov_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_pov_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      gifts: {
        Row: {
          animation_type: string
          created_at: string | null
          description: string | null
          icon_url: string | null
          id: string
          name: string
          price: number
        }
        Insert: {
          animation_type?: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          price: number
        }
        Update: {
          animation_type?: string
          created_at?: string | null
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          price?: number
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
      live_stream_invitations: {
        Row: {
          created_at: string | null
          id: string
          invitee_id: string
          inviter_id: string
          responded_at: string | null
          status: string | null
          stream_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invitee_id: string
          inviter_id: string
          responded_at?: string | null
          status?: string | null
          stream_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invitee_id?: string
          inviter_id?: string
          responded_at?: string | null
          status?: string | null
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_invitations_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_stream_participants: {
        Row: {
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_admin: boolean | null
          is_blocked: boolean | null
          is_host: boolean | null
          is_muted: boolean | null
          joined_at: string | null
          left_at: string | null
          muted_at: string | null
          muted_by: string | null
          stream_id: string
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_host?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          muted_at?: string | null
          muted_by?: string | null
          stream_id: string
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_admin?: boolean | null
          is_blocked?: boolean | null
          is_host?: boolean | null
          is_muted?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          muted_at?: string | null
          muted_by?: string | null
          stream_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_stream_participants_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
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
      login_attempts: {
        Row: {
          attempt_count: number
          created_at: string
          email: string
          id: string
          last_attempt_at: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email: string
          id?: string
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email?: string
          id?: string
          last_attempt_at?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          created_at: string | null
          id: string
          mentioned_user_id: string
          mentioner_user_id: string
          post_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentioned_user_id: string
          mentioner_user_id: string
          post_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentioned_user_id?: string
          mentioner_user_id?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mentions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_earnings: {
        Row: {
          amount_mined: number
          created_at: string | null
          id: string
          mining_date: string
          mining_type: string
          session_id: string
          user_id: string
        }
        Insert: {
          amount_mined: number
          created_at?: string | null
          id?: string
          mining_date?: string
          mining_type: string
          session_id: string
          user_id: string
        }
        Update: {
          amount_mined?: number
          created_at?: string | null
          id?: string
          mining_date?: string
          mining_type?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mining_earnings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mining_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mining_sessions: {
        Row: {
          created_at: string | null
          days_duration: number
          end_date: string
          id: string
          mining_type: string
          performance_multiplier: number
          start_date: string
          status: string
          tokens_paid: number
          total_mined: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_duration: number
          end_date: string
          id?: string
          mining_type: string
          performance_multiplier?: number
          start_date?: string
          status?: string
          tokens_paid: number
          total_mined?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_duration?: number
          end_date?: string
          id?: string
          mining_type?: string
          performance_multiplier?: number
          start_date?: string
          status?: string
          tokens_paid?: number
          total_mined?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_updates: boolean
          id: string
          notify_follows: boolean
          notify_likes: boolean
          notify_mentions: boolean
          notify_replies: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_updates?: boolean
          id?: string
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_replies?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_updates?: boolean
          id?: string
          notify_follows?: boolean
          notify_likes?: boolean
          notify_mentions?: boolean
          notify_replies?: boolean
          updated_at?: string
          user_id?: string
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
      pool_consent: {
        Row: {
          consent_given: boolean
          consent_type: string
          created_at: string | null
          id: string
          pool_id: string
          user_id: string
          verification_data: Json | null
          verified_at: string | null
        }
        Insert: {
          consent_given?: boolean
          consent_type: string
          created_at?: string | null
          id?: string
          pool_id: string
          user_id: string
          verification_data?: Json | null
          verified_at?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_type?: string
          created_at?: string | null
          id?: string
          pool_id?: string
          user_id?: string
          verification_data?: Json | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_consent_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "token_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_participants: {
        Row: {
          entry_paid: number
          id: string
          joined_at: string | null
          pool_id: string
          position: number | null
          score: number | null
          user_id: string
        }
        Insert: {
          entry_paid: number
          id?: string
          joined_at?: string | null
          pool_id: string
          position?: number | null
          score?: number | null
          user_id: string
        }
        Update: {
          entry_paid?: number
          id?: string
          joined_at?: string | null
          pool_id?: string
          position?: number | null
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_participants_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "token_pools"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          pool_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          pool_id: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          pool_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_transactions_pool_id_fkey"
            columns: ["pool_id"]
            isOneToOne: false
            referencedRelation: "token_pools"
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
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          post_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          media_type: string
          media_url: string
          post_id: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
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
          is_demo: boolean
          like_count: number
          media_type: string | null
          media_url: string | null
          monetization_type: string | null
          parent_post_id: string | null
          price: number | null
          reply_count: number | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          click_count?: number | null
          content: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          parent_post_id?: string | null
          price?: number | null
          reply_count?: number | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          click_count?: number | null
          content?: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          parent_post_id?: string | null
          price?: number | null
          reply_count?: number | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
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
      profile_private: {
        Row: {
          birthdate: string | null
          created_at: string
          two_factor_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          birthdate?: string | null
          created_at?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          birthdate?: string | null
          created_at?: string
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          is_demo: boolean
          is_private: boolean | null
          is_verified: boolean | null
          updated_at: string | null
          username: string | null
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          is_demo?: boolean
          is_private?: boolean | null
          is_verified?: boolean | null
          updated_at?: string | null
          username?: string | null
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_demo?: boolean
          is_private?: boolean | null
          is_verified?: boolean | null
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
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          severity?: string | null
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
      skytech_affiliate_programs: {
        Row: {
          api_config: Json | null
          auto_enabled: boolean
          categories: string[] | null
          commission_rate: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          metadata: Json | null
          network_name: string | null
          program_name: string
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          api_config?: Json | null
          auto_enabled?: boolean
          categories?: string[] | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json | null
          network_name?: string | null
          program_name: string
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          api_config?: Json | null
          auto_enabled?: boolean
          categories?: string[] | null
          commission_rate?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          metadata?: Json | null
          network_name?: string | null
          program_name?: string
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      skytech_app_updates: {
        Row: {
          applied_at: string | null
          auto_apply: boolean
          changes: Json
          created_at: string
          description: string | null
          id: string
          is_applied: boolean
          title: string
          update_type: string
          version: string
        }
        Insert: {
          applied_at?: string | null
          auto_apply?: boolean
          changes: Json
          created_at?: string
          description?: string | null
          id?: string
          is_applied?: boolean
          title: string
          update_type: string
          version: string
        }
        Update: {
          applied_at?: string | null
          auto_apply?: boolean
          changes?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_applied?: boolean
          title?: string
          update_type?: string
          version?: string
        }
        Relationships: []
      }
      skytech_platform_configs: {
        Row: {
          api_config: Json | null
          auto_enabled: boolean
          created_at: string
          description: string | null
          display_name: string
          icon_url: string | null
          id: string
          is_active: boolean
          metadata: Json | null
          oauth_config: Json | null
          platform_name: string
          platform_type: string
          required_scopes: string[] | null
          updated_at: string
        }
        Insert: {
          api_config?: Json | null
          auto_enabled?: boolean
          created_at?: string
          description?: string | null
          display_name: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          oauth_config?: Json | null
          platform_name: string
          platform_type: string
          required_scopes?: string[] | null
          updated_at?: string
        }
        Update: {
          api_config?: Json | null
          auto_enabled?: boolean
          created_at?: string
          description?: string | null
          display_name?: string
          icon_url?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json | null
          oauth_config?: Json | null
          platform_name?: string
          platform_type?: string
          required_scopes?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      snipe_hits: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          impact_x: number
          impact_y: number
          seed: number
          sender_avatar: string | null
          sender_id: string
          sender_name: string | null
          stream_id: string | null
          target_user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          impact_x?: number
          impact_y?: number
          seed?: number
          sender_avatar?: string | null
          sender_id: string
          sender_name?: string | null
          stream_id?: string | null
          target_user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          impact_x?: number
          impact_y?: number
          seed?: number
          sender_avatar?: string | null
          sender_id?: string
          sender_name?: string | null
          stream_id?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snipe_hits_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
          view_count?: number | null
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
      stream_gifts: {
        Row: {
          created_at: string | null
          gift_id: string
          id: string
          message: string | null
          receiver_id: string
          sender_id: string
          stream_id: string
        }
        Insert: {
          created_at?: string | null
          gift_id: string
          id?: string
          message?: string | null
          receiver_id: string
          sender_id: string
          stream_id: string
        }
        Update: {
          created_at?: string | null
          gift_id?: string
          id?: string
          message?: string | null
          receiver_id?: string
          sender_id?: string
          stream_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_gifts_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_gifts_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "live_streams"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_unlocks: {
        Row: {
          created_at: string | null
          feature_unlocked: string
          id: string
          message_sent: boolean | null
          subscription_type: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_unlocked: string
          id?: string
          message_sent?: boolean | null
          subscription_type: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_unlocked?: string
          id?: string
          message_sent?: boolean | null
          subscription_type?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      token_pools: {
        Row: {
          commission_rate: number
          completed_at: string | null
          created_at: string | null
          creator_id: string
          current_participants: number | null
          entry_fee: number
          game_type: string
          id: string
          max_participants: number | null
          metadata: Json | null
          pool_name: string
          started_at: string | null
          status: string
          total_pool: number
          winner_id: string | null
        }
        Insert: {
          commission_rate?: number
          completed_at?: string | null
          created_at?: string | null
          creator_id: string
          current_participants?: number | null
          entry_fee?: number
          game_type: string
          id?: string
          max_participants?: number | null
          metadata?: Json | null
          pool_name: string
          started_at?: string | null
          status?: string
          total_pool?: number
          winner_id?: string | null
        }
        Update: {
          commission_rate?: number
          completed_at?: string | null
          created_at?: string | null
          creator_id?: string
          current_participants?: number | null
          entry_fee?: number
          game_type?: string
          id?: string
          max_participants?: number | null
          metadata?: Json | null
          pool_name?: string
          started_at?: string | null
          status?: string
          total_pool?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      trading_accounts: {
        Row: {
          account_username: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          metadata: Json | null
          platform_name: string
          platform_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_username?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform_name: string
          platform_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_username?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          metadata?: Json | null
          platform_name?: string
          platform_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_saved_tabs: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          tab_name: string
          tab_type: string
          tab_url: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          tab_name: string
          tab_type?: string
          tab_url: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          tab_name?: string
          tab_type?: string
          tab_url?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          created_at: string | null
          crypto_balance: Json | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          crypto_balance?: Json | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          crypto_balance?: Json | null
          id?: string
          updated_at?: string | null
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          status: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          amount: number
          created_at: string | null
          crypto_address: string | null
          crypto_chain: string | null
          crypto_currency: string | null
          id: string
          payment_details: Json | null
          payment_method: string
          processed_at: string | null
          rejection_reason: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          crypto_address?: string | null
          crypto_chain?: string | null
          crypto_currency?: string | null
          id?: string
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          crypto_address?: string | null
          crypto_chain?: string | null
          crypto_currency?: string | null
          id?: string
          payment_details?: Json | null
          payment_method?: string
          processed_at?: string | null
          rejection_reason?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_mining_multiplier: {
        Args: { tokens_paid: number }
        Returns: number
      }
      check_account_locked: {
        Args: { p_email: string }
        Returns: {
          attempts: number
          is_locked: boolean
          unlock_time: string
        }[]
      }
      clear_login_attempts: { Args: { p_email: string }; Returns: undefined }
      detect_suspicious_activity: {
        Args: { _event_type: string; _time_window?: string; _user_id: string }
        Returns: boolean
      }
      get_follow_counts: {
        Args: { target_user: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_follower_count: { Args: { user_uuid: string }; Returns: number }
      get_total_views: { Args: { user_uuid: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_stream_admin: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_adult: { Args: { user_uuid: string }; Returns: boolean }
      record_failed_login: {
        Args: { p_email: string }
        Returns: {
          attempts: number
          is_locked: boolean
          unlock_time: string
        }[]
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
