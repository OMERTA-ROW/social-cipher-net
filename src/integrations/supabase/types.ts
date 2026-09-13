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
      ad_advertisers: {
        Row: {
          company_name: string
          contact_email: string | null
          created_at: string
          id: string
          status: string
          user_id: string
          website: string | null
        }
        Insert: {
          company_name: string
          contact_email?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id: string
          website?: string | null
        }
        Update: {
          company_name?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          status?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_id: string
          budget_cents: number
          cpc_cents: number
          cpm_cents: number
          created_at: string
          ends_at: string | null
          id: string
          interests: string[]
          min_audience: number
          name: string
          placements: string[]
          spent_cents: number
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          budget_cents?: number
          cpc_cents?: number
          cpm_cents?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          interests?: string[]
          min_audience?: number
          name: string
          placements?: string[]
          spent_cents?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          budget_cents?: number
          cpc_cents?: number
          cpm_cents?: number
          created_at?: string
          ends_at?: string | null
          id?: string
          interests?: string[]
          min_audience?: number
          name?: string
          placements?: string[]
          spent_cents?: number
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "ad_advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          campaign_id: string
          created_at: string
          creative_id: string
          id: string
          placement: string
          viewer_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creative_id: string
          id?: string
          placement?: string
          viewer_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creative_id?: string
          id?: string
          placement?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_clicks_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          body: string | null
          campaign_id: string
          created_at: string
          cta_label: string
          cta_url: string
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
        }
        Insert: {
          body?: string | null
          campaign_id: string
          created_at?: string
          cta_label?: string
          cta_url: string
          headline: string
          id?: string
          image_url?: string | null
          is_active?: boolean
        }
        Update: {
          body?: string | null
          campaign_id?: string
          created_at?: string
          cta_label?: string
          cta_url?: string
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          campaign_id: string
          created_at: string
          creative_id: string
          id: string
          placement: string
          viewer_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creative_id: string
          id?: string
          placement?: string
          viewer_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creative_id?: string
          id?: string
          placement?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_impressions_creative_id_fkey"
            columns: ["creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_conversions: {
        Row: {
          commission_amount: number
          created_at: string
          currency: string
          external_id: string | null
          gross_amount: number
          id: string
          link_id: string
          net_amount: number
          occurred_at: string
          platform_fee: number
          source: string
          status: string
          user_id: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          gross_amount?: number
          id?: string
          link_id: string
          net_amount?: number
          occurred_at?: string
          platform_fee?: number
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          currency?: string
          external_id?: string | null
          gross_amount?: number
          id?: string
          link_id?: string
          net_amount?: number
          occurred_at?: string
          platform_fee?: number
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_conversions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "external_affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
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
      affiliate_network_secrets: {
        Row: {
          api_key_encrypted: string
          created_at: string
          network_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          network_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          network_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_network_secrets_network_id_fkey"
            columns: ["network_id"]
            isOneToOne: true
            referencedRelation: "affiliate_networks"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_networks: {
        Row: {
          account_label: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          network: string
          status: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          network: string
          status?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          network?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_secrets: {
        Row: {
          created_at: string
          encrypted: boolean
          id: string
          owner_id: string
          owner_type: string
          secret_type: string
          secret_value: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted?: boolean
          id?: string
          owner_id: string
          owner_type: string
          secret_type: string
          secret_value: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted?: boolean
          id?: string
          owner_id?: string
          owner_type?: string
          secret_type?: string
          secret_value?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_agents: {
        Row: {
          created_at: string
          id: string
          is_terminal_agent: boolean
          key_hint: string | null
          label: string
          last_checked_at: string | null
          last_error: string | null
          mcp_server_id: string | null
          model: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_terminal_agent?: boolean
          key_hint?: string | null
          label: string
          last_checked_at?: string | null
          last_error?: string | null
          mcp_server_id?: string | null
          model?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_terminal_agent?: boolean
          key_hint?: string | null
          label?: string
          last_checked_at?: string | null
          last_error?: string | null
          mcp_server_id?: string | null
          model?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agents_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_campaigns: {
        Row: {
          brand_name: string
          brand_user_id: string
          budget: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          min_followers: number
          niche: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_name: string
          brand_user_id: string
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          min_followers?: number
          niche?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          brand_user_id?: string
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          min_followers?: number
          niche?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brand_deals: {
        Row: {
          amount: number
          brand_name: string
          brand_user_id: string | null
          campaign_id: string | null
          created_at: string
          creator_id: string
          currency: string
          id: string
          net_amount: number
          notes: string | null
          paid_at: string | null
          platform_fee: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          brand_name: string
          brand_user_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          platform_fee?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          brand_name?: string
          brand_user_id?: string | null
          campaign_id?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          net_amount?: number
          notes?: string | null
          paid_at?: string | null
          platform_fee?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_deals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_applications: {
        Row: {
          campaign_id: string
          created_at: string
          creator_id: string
          id: string
          message: string | null
          proposed_rate: number | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_id: string
          id?: string
          message?: string | null
          proposed_rate?: number | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          message?: string | null
          proposed_rate?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_applications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "brand_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      connection_secrets: {
        Row: {
          connection_id: string
          created_at: string
          encrypted: boolean
          expires_at: string | null
          id: string
          secret_type: string
          secret_value: string
          user_id: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          encrypted?: boolean
          expires_at?: string | null
          id?: string
          secret_type: string
          secret_value: string
          user_id: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          encrypted?: boolean
          expires_at?: string | null
          id?: string
          secret_type?: string
          secret_value?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connection_secrets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_audit_log: {
        Row: {
          action: string
          connection_id: string | null
          created_at: string
          detail: string | null
          http_status: number | null
          id: string
          service_id: string
          status: string
          user_id: string
        }
        Insert: {
          action: string
          connection_id?: string | null
          created_at?: string
          detail?: string | null
          http_status?: number | null
          id?: string
          service_id: string
          status: string
          user_id: string
        }
        Update: {
          action?: string
          connection_id?: string | null
          created_at?: string
          detail?: string | null
          http_status?: number | null
          id?: string
          service_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connector_audit_log_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_definitions: {
        Row: {
          availability: string
          blurb: string
          capabilities: string[]
          category: string
          constraints: Json
          created_at: string
          docs_url: string | null
          enabled: boolean
          fields: Json
          glyph: string
          id: string
          methods: string[]
          name: string
          oauth_provider: string | null
          rate_policy: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          availability?: string
          blurb?: string
          capabilities?: string[]
          category: string
          constraints?: Json
          created_at?: string
          docs_url?: string | null
          enabled?: boolean
          fields?: Json
          glyph?: string
          id: string
          methods?: string[]
          name: string
          oauth_provider?: string | null
          rate_policy?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          availability?: string
          blurb?: string
          capabilities?: string[]
          category?: string
          constraints?: Json
          created_at?: string
          docs_url?: string | null
          enabled?: boolean
          fields?: Json
          glyph?: string
          id?: string
          methods?: string[]
          name?: string
          oauth_provider?: string | null
          rate_policy?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      connector_rate_state: {
        Row: {
          blocked_until: string | null
          bucket: string
          connection_id: string
          id: string
          refilled_at: string
          tokens: number
        }
        Insert: {
          blocked_until?: string | null
          bucket?: string
          connection_id: string
          id?: string
          refilled_at?: string
          tokens?: number
        }
        Update: {
          blocked_until?: string | null
          bucket?: string
          connection_id?: string
          id?: string
          refilled_at?: string
          tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "connector_rate_state_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections"
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
          currency: string
          earning_type: string
          gross_amount: number
          id: string
          net_amount: number
          platform_fee: number
          post_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id: string
          currency?: string
          earning_type: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          post_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string
          currency?: string
          earning_type?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          platform_fee?: number
          post_id?: string | null
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
      creator_media_kits: {
        Row: {
          bio: string | null
          contact_email: string | null
          created_at: string
          headline: string | null
          id: string
          is_public: boolean
          niche: string | null
          rate_card: Json
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_public?: boolean
          niche?: string | null
          rate_card?: Json
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          created_at?: string
          headline?: string | null
          id?: string
          is_public?: boolean
          niche?: string | null
          rate_card?: Json
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      dm_messages: {
        Row: {
          attachments: Json
          body: string
          created_at: string
          external_message_id: string | null
          filter_reason: string | null
          id: string
          is_filtered: boolean
          sender_id: string | null
          sender_label: string | null
          source_platform: string
          thread_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          created_at?: string
          external_message_id?: string | null
          filter_reason?: string | null
          id?: string
          is_filtered?: boolean
          sender_id?: string | null
          sender_label?: string | null
          source_platform?: string
          thread_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          created_at?: string
          external_message_id?: string | null
          filter_reason?: string | null
          id?: string
          is_filtered?: boolean
          sender_id?: string | null
          sender_label?: string | null
          source_platform?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_participants: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          is_private: boolean
          last_read_at: string
          tags: string[]
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_private?: boolean
          last_read_at?: string
          tags?: string[]
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          is_private?: boolean
          last_read_at?: string
          tags?: string[]
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          created_by: string
          external_thread_id: string | null
          id: string
          last_message_at: string
          source_platform: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          source_platform?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          source_platform?: string
          title?: string | null
          updated_at?: string
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
          conversion_count: number
          created_at: string | null
          description: string | null
          earnings: number
          id: string
          is_active: boolean | null
          link_name: string
          link_type: string
          merchant_name: string
          network: string | null
          post_id: string | null
          product_id: string | null
          short_code: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          affiliate_url: string
          click_count?: number | null
          conversion_count?: number
          created_at?: string | null
          description?: string | null
          earnings?: number
          id?: string
          is_active?: boolean | null
          link_name: string
          link_type?: string
          merchant_name: string
          network?: string | null
          post_id?: string | null
          product_id?: string | null
          short_code?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          affiliate_url?: string
          click_count?: number | null
          conversion_count?: number
          created_at?: string | null
          description?: string | null
          earnings?: number
          id?: string
          is_active?: boolean | null
          link_name?: string
          link_type?: string
          merchant_name?: string
          network?: string | null
          post_id?: string | null
          product_id?: string | null
          short_code?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_affiliate_links_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      link_previews: {
        Row: {
          created_at: string
          description: string | null
          embed_url: string | null
          fetched_at: string
          id: string
          image_url: string | null
          media_kind: string
          site_name: string | null
          title: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          embed_url?: string | null
          fetched_at?: string
          id?: string
          image_url?: string | null
          media_kind?: string
          site_name?: string | null
          title?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          embed_url?: string | null
          fetched_at?: string
          id?: string
          image_url?: string | null
          media_kind?: string
          site_name?: string | null
          title?: string | null
          updated_at?: string
          url?: string
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
          section: string
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
          section?: string
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
          section?: string
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
      mcp_servers: {
        Row: {
          auth_type: string
          created_at: string
          id: string
          label: string
          last_checked_at: string | null
          last_error: string | null
          status: string
          tool_count: number
          transport: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          auth_type?: string
          created_at?: string
          id?: string
          label: string
          last_checked_at?: string | null
          last_error?: string | null
          status?: string
          tool_count?: number
          transport?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          auth_type?: string
          created_at?: string
          id?: string
          label?: string
          last_checked_at?: string | null
          last_error?: string | null
          status?: string
          tool_count?: number
          transport?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_tools: {
        Row: {
          created_at: string
          description: string | null
          id: string
          input_schema: Json
          is_enabled: boolean
          name: string
          server_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json
          is_enabled?: boolean
          name: string
          server_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          input_schema?: Json
          is_enabled?: boolean
          name?: string
          server_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tools_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
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
      moderation_reviews: {
        Row: {
          created_at: string
          details: Json
          id: string
          reason: string
          reported_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          severity: string
          status: string
          subject_id: string | null
          subject_type: string
          subject_user_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          reason: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          severity?: string
          status?: string
          subject_id?: string | null
          subject_type: string
          subject_user_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          reason?: string
          reported_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          severity?: string
          status?: string
          subject_id?: string | null
          subject_type?: string
          subject_user_id?: string | null
          updated_at?: string
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
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          seller_id: string
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          seller_id: string
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          seller_id?: string
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          shipping_address: Json | null
          status: string
          stripe_session_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          total_amount?: number
          updated_at?: string
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
      platform_fee_rates: {
        Row: {
          percent: number
          revenue_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          percent?: number
          revenue_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          percent?: number
          revenue_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_revenue: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          platform_fee: number | null
          reference_id: string | null
          reference_type: string | null
          source: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          platform_fee?: number | null
          reference_id?: string | null
          reference_type?: string | null
          source: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          platform_fee?: number | null
          reference_id?: string | null
          reference_type?: string | null
          source?: string
        }
        Relationships: []
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
      post_products: {
        Row: {
          created_at: string
          display_order: number
          id: string
          post_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          post_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          post_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_products_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reposts: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reposts_post_id_fkey"
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
          affiliate_link_id: string | null
          click_count: number | null
          community_slug: string | null
          content: string
          created_at: string | null
          id: string
          is_demo: boolean
          is_sponsored: boolean
          like_count: number
          media_type: string | null
          media_url: string | null
          monetization_type: string | null
          parent_post_id: string | null
          price: number | null
          reply_count: number | null
          repost_count: number
          section: string
          sponsor_name: string | null
          subject_id: string | null
          subject_type: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          affiliate_link_id?: string | null
          click_count?: number | null
          community_slug?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          is_sponsored?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          parent_post_id?: string | null
          price?: number | null
          reply_count?: number | null
          repost_count?: number
          section?: string
          sponsor_name?: string | null
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          affiliate_link_id?: string | null
          click_count?: number | null
          community_slug?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_demo?: boolean
          is_sponsored?: boolean
          like_count?: number
          media_type?: string | null
          media_url?: string | null
          monetization_type?: string | null
          parent_post_id?: string | null
          price?: number | null
          reply_count?: number | null
          repost_count?: number
          section?: string
          sponsor_name?: string | null
          subject_id?: string | null
          subject_type?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "external_affiliate_links"
            referencedColumns: ["id"]
          },
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
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          product_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          product_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      product_variants: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          options: Json
          price: number
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          options?: Json
          price?: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          options?: Json
          price?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
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
      profile_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_media: {
        Row: {
          album_id: string | null
          caption: string | null
          created_at: string
          display_order: number
          id: string
          media_type: string
          media_url: string
          user_id: string
        }
        Insert: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          media_url: string
          user_id: string
        }
        Update: {
          album_id?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          media_type?: string
          media_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_media_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "profile_albums"
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
      profile_radio: {
        Row: {
          created_at: string
          embed_url: string | null
          id: string
          is_enabled: boolean
          playlist_url: string | null
          provider: string
          route_to_stream: boolean
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          embed_url?: string | null
          id?: string
          is_enabled?: boolean
          playlist_url?: string | null
          provider?: string
          route_to_stream?: boolean
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          embed_url?: string | null
          id?: string
          is_enabled?: boolean
          playlist_url?: string | null
          provider?: string
          route_to_stream?: boolean
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_radio_playlists: {
        Row: {
          created_at: string
          embed_url: string
          id: string
          playlist_url: string
          provider: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          embed_url: string
          id?: string
          playlist_url: string
          provider: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          embed_url?: string
          id?: string
          playlist_url?: string
          provider?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_mode: string
          avatar_original_url: string | null
          avatar_standing_position: Json
          avatar_standing_url: string | null
          avatar_transform: Json
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
          avatar_mode?: string
          avatar_original_url?: string | null
          avatar_standing_position?: Json
          avatar_standing_url?: string | null
          avatar_transform?: Json
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
          avatar_mode?: string
          avatar_original_url?: string | null
          avatar_standing_position?: Json
          avatar_standing_url?: string | null
          avatar_transform?: Json
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
      provider_health_events: {
        Row: {
          action: string
          created_at: string
          fallback_provider: string | null
          id: string
          message: string | null
          provider: string
          status: string
          symbol: string | null
          timeframe: string | null
        }
        Insert: {
          action: string
          created_at?: string
          fallback_provider?: string | null
          id?: string
          message?: string | null
          provider: string
          status: string
          symbol?: string | null
          timeframe?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          fallback_provider?: string | null
          id?: string
          message?: string | null
          provider?: string
          status?: string
          symbol?: string | null
          timeframe?: string | null
        }
        Relationships: []
      }
      publish_batches: {
        Row: {
          body: string
          created_at: string
          id: string
          media: Json
          metadata: Json
          scheduled_for: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          media?: Json
          metadata?: Json
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          media?: Json
          metadata?: Json
          scheduled_for?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      publish_targets: {
        Row: {
          attempts: number
          batch_id: string
          connection_id: string | null
          created_at: string
          error: string | null
          id: string
          overrides: Json
          permalink: string | null
          provider_item_id: string | null
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          batch_id: string
          connection_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          overrides?: Json
          permalink?: string | null
          provider_item_id?: string | null
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          batch_id?: string
          connection_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          overrides?: Json
          permalink?: string | null
          provider_item_id?: string | null
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_targets_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "publish_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_targets_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections"
            referencedColumns: ["id"]
          },
        ]
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
          banner_url: string | null
          business_description: string | null
          business_name: string
          commission_rate: number | null
          created_at: string | null
          id: string
          logo_url: string | null
          slug: string | null
          status: string | null
          tagline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          business_description?: string | null
          business_name: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          banner_url?: string | null
          business_description?: string | null
          business_name?: string
          commission_rate?: number | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          slug?: string | null
          status?: string | null
          tagline?: string | null
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
      stream_ingest: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string | null
          last_source: string | null
          status: string
          stream_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          last_source?: string | null
          status?: string
          stream_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          last_source?: string | null
          status?: string
          stream_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          id: string
          processed_at: string
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          id?: string
          processed_at?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
      studio_assets: {
        Row: {
          asset_type: string
          created_at: string
          duration_seconds: number | null
          id: string
          metadata: Json
          name: string
          source: string
          url: string
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          name: string
          source?: string
          url: string
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          metadata?: Json
          name?: string
          source?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      studio_projects: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          created_at: string
          description: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean
          is_addon: boolean
          key: string
          name: string
          price_cents: number
          price_cents_year: number | null
          rank: number
          stripe_price_id_month: string | null
          stripe_price_id_year: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_addon?: boolean
          key: string
          name: string
          price_cents?: number
          price_cents_year?: number | null
          rank?: number
          stripe_price_id_month?: string | null
          stripe_price_id_year?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          is_addon?: boolean
          key?: string
          name?: string
          price_cents?: number
          price_cents_year?: number | null
          rank?: number
          stripe_price_id_month?: string | null
          stripe_price_id_year?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
      sync_jobs: {
        Row: {
          attempts: number
          connection_id: string | null
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          payload: Json
          priority: number
          result: Json | null
          run_after: string
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          connection_id?: string | null
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          priority?: number
          result?: Json | null
          run_after?: string
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "user_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      terminal_commands: {
        Row: {
          args: Json
          command: string
          created_at: string
          id: string
          output: string | null
          status: string
          user_id: string
        }
        Insert: {
          args?: Json
          command: string
          created_at?: string
          id?: string
          output?: string | null
          status?: string
          user_id: string
        }
        Update: {
          args?: Json
          command?: string
          created_at?: string
          id?: string
          output?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      theater_chat: {
        Row: {
          created_at: string
          event_id: string
          id: string
          message: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          message: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          message?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "theater_chat_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "theater_events"
            referencedColumns: ["id"]
          },
        ]
      }
      theater_event_catalog: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          format: string | null
          host_id: string
          id: string
          is_live: boolean
          is_open: boolean
          poster_url: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at: string
          description?: string | null
          format?: string | null
          host_id: string
          id: string
          is_live: boolean
          is_open?: boolean
          poster_url?: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          format?: string | null
          host_id?: string
          id?: string
          is_live?: boolean
          is_open?: boolean
          poster_url?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theater_event_catalog_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "theater_events"
            referencedColumns: ["id"]
          },
        ]
      }
      theater_events: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          format: string
          host_id: string
          id: string
          is_live: boolean
          is_open: boolean
          poster_url: string | null
          starts_at: string
          status: string
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          format?: string
          host_id: string
          id?: string
          is_live?: boolean
          is_open?: boolean
          poster_url?: string | null
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          format?: string
          host_id?: string
          id?: string
          is_live?: boolean
          is_open?: boolean
          poster_url?: string | null
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      theater_participants: {
        Row: {
          event_id: string
          joined_at: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "theater_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "theater_events"
            referencedColumns: ["id"]
          },
        ]
      }
      theater_playback_state: {
        Row: {
          event_id: string
          is_playing: boolean
          position_seconds: number
          updated_at: string
        }
        Insert: {
          event_id: string
          is_playing?: boolean
          position_seconds?: number
          updated_at?: string
        }
        Update: {
          event_id?: string
          is_playing?: boolean
          position_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "theater_playback_state_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "theater_events"
            referencedColumns: ["id"]
          },
        ]
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
      trading_audit_log: {
        Row: {
          action: string
          category: string
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: string
          category?: string
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_layouts: {
        Row: {
          created_at: string
          grid: number
          id: string
          is_default: boolean
          name: string
          panes: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grid?: number
          id?: string
          is_default?: boolean
          name: string
          panes?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          grid?: number
          id?: string
          is_default?: boolean
          name?: string
          panes?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          symbols: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbols?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbols?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      user_connections: {
        Row: {
          account_handle: string | null
          account_name: string | null
          connected_at: string
          expires_at: string | null
          failure_count: number
          health: string
          id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          method: string
          scopes: string[] | null
          service_id: string
          show_on_profile: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_handle?: string | null
          account_name?: string | null
          connected_at?: string
          expires_at?: string | null
          failure_count?: number
          health?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          method?: string
          scopes?: string[] | null
          service_id: string
          show_on_profile?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_handle?: string | null
          account_name?: string | null
          connected_at?: string
          expires_at?: string | null
          failure_count?: number
          health?: string
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          method?: string
          scopes?: string[] | null
          service_id?: string
          show_on_profile?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          source: string
          status: string
          tier_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          source?: string
          status?: string
          tier_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          source?: string
          status?: string
          tier_key?: string
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
      fulfill_paid_order: { Args: { _order_id: string }; Returns: boolean }
      get_follow_counts: {
        Args: { target_user: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_follower_count: { Args: { user_uuid: string }; Returns: number }
      get_ranked_feed: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          post_id: string
          score: number
        }[]
      }
      get_total_views: { Args: { user_uuid: string }; Returns: number }
      has_entitlement: {
        Args: { _tier_key: string; _user_id: string }
        Returns: boolean
      }
      has_paid_plan: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _a: string; _b: string }; Returns: boolean }
      is_dm_member: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      is_stream_admin: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_stream_owner: {
        Args: { _stream_id: string; _user_id: string }
        Returns: boolean
      }
      is_theater_member: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_adult: { Args: { user_uuid: string }; Returns: boolean }
      log_security_event: {
        Args: {
          _event_type: string
          _metadata: Json
          _severity: string
          _user_id: string
        }
        Returns: undefined
      }
      platform_fee_percent: { Args: { _revenue_type: string }; Returns: number }
      profile_connections: {
        Args: { _user: string }
        Returns: {
          account_handle: string
          account_name: string
          health: string
          service_id: string
        }[]
      }
      record_failed_login: {
        Args: { p_email: string }
        Returns: {
          attempts: number
          is_locked: boolean
          unlock_time: string
        }[]
      }
      start_dm_thread: { Args: { _peer: string }; Returns: string }
      user_id_for_email: { Args: { _email: string }; Returns: string }
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
