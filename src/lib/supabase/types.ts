export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      automations: {
        Row: {
          action_type: string
          created_at: string
          id: string
          last_run: string | null
          leads: number
          message: string
          name: string
          require_follow: boolean
          status: string
          trigger_keyword: string | null
          trigger_type: string
          triggered: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          last_run?: string | null
          leads?: number
          message?: string
          name: string
          require_follow?: boolean
          status?: string
          trigger_keyword?: string | null
          trigger_type: string
          triggered?: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          last_run?: string | null
          leads?: number
          message?: string
          name?: string
          require_follow?: boolean
          status?: string
          trigger_keyword?: string | null
          trigger_type?: string
          triggered?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          assigned_date: string
          completed_at: string | null
          created_at: string
          day_label: string
          description: string
          done: boolean
          id: string
          milestone_id: string
          user_id: string
        }
        Insert: {
          assigned_date: string
          completed_at?: string | null
          created_at?: string
          day_label: string
          description: string
          done?: boolean
          id?: string
          milestone_id: string
          user_id: string
        }
        Update: {
          assigned_date?: string
          completed_at?: string | null
          created_at?: string
          day_label?: string
          description?: string
          done?: boolean
          id?: string
          milestone_id?: string
          user_id?: string
        }
        Relationships: []
      }
      dreams: {
        Row: {
          created_at: string
          emoji: string
          id: string
          target_date: string
          timeframe: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          target_date: string
          timeframe?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          target_date?: string
          timeframe?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          dream_id: string
          id: string
          name: string
          target_date: string
          timeframe: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dream_id: string
          id?: string
          name: string
          target_date: string
          timeframe?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dream_id?: string
          id?: string
          name?: string
          target_date?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          handle: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          score: number
          source: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          handle?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          score?: number
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          handle?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          score?: number
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          name: string
          target_date: string
          timeframe: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          name: string
          target_date: string
          timeframe?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          name?: string
          target_date?: string
          timeframe?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url:                   string | null
          created_at:                   string
          full_name:                    string | null
          id:                           string
          plan:                         string
          updated_at:                   string
          instagram_user_id:            string | null
          instagram_username:           string | null
          instagram_page_id:            string | null
          instagram_access_token:       string | null
          instagram_token_expires_at:   string | null
          instagram_followers:          number | null
          instagram_profile_pic:        string | null
        }
        Insert: {
          avatar_url?:                  string | null
          created_at?:                  string
          full_name?:                   string | null
          id:                           string
          plan?:                        string
          updated_at?:                  string
          instagram_user_id?:           string | null
          instagram_username?:          string | null
          instagram_page_id?:           string | null
          instagram_access_token?:      string | null
          instagram_token_expires_at?:  string | null
          instagram_followers?:         number | null
          instagram_profile_pic?:       string | null
        }
        Update: {
          avatar_url?:                  string | null
          created_at?:                  string
          full_name?:                   string | null
          id?:                          string
          plan?:                        string
          updated_at?:                  string
          instagram_user_id?:           string | null
          instagram_username?:          string | null
          instagram_page_id?:           string | null
          instagram_access_token?:      string | null
          instagram_token_expires_at?:  string | null
          instagram_followers?:         number | null
          instagram_profile_pic?:       string | null
        }
        Relationships: []
      }
      quick_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          done: boolean
          id: string
          priority: string
          tag: string | null
          time: string | null
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date: string
          done?: boolean
          id?: string
          priority?: string
          tag?: string | null
          time?: string | null
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          priority?: string
          tag?: string | null
          time?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          date: string
          done: boolean
          id: string
          routine_id: string
          user_id: string
        }
        Insert: {
          date: string
          done?: boolean
          id?: string
          routine_id: string
          user_id: string
        }
        Update: {
          date?: string
          done?: boolean
          id?: string
          routine_id?: string
          user_id?: string
        }
        Relationships: []
      }
      routines: {
        Row: {
          color: string
          created_at: string
          days_of_week: number[]
          description: string | null
          id: string
          name: string
          time: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          id?: string
          name: string
          time?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          days_of_week?: number[]
          description?: string | null
          id?: string
          name?: string
          time?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          caption: string
          comments: number | null
          created_at: string
          emoji: string
          hashtags: string
          id: string
          likes: number | null
          media_url: string | null
          platform: string
          reach: number | null
          scheduled_date: string
          scheduled_time: string
          status: string
          thumbnail: string
          type: string
          user_id: string
        }
        Insert: {
          caption?: string
          comments?: number | null
          created_at?: string
          emoji?: string
          hashtags?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          platform?: string
          reach?: number | null
          scheduled_date: string
          scheduled_time?: string
          status?: string
          thumbnail?: string
          type?: string
          user_id: string
        }
        Update: {
          caption?: string
          comments?: number | null
          created_at?: string
          emoji?: string
          hashtags?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          platform?: string
          reach?: number | null
          scheduled_date?: string
          scheduled_time?: string
          status?: string
          thumbnail?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      cal_events: {
        Row: {
          id: string
          user_id: string
          title: string
          date: string
          start_hour: number
          start_min: number
          end_hour: number
          end_min: number
          color: string
          tag: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          date: string
          start_hour?: number
          start_min?: number
          end_hour?: number
          end_min?: number
          color?: string
          tag?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          date?: string
          start_hour?: number
          start_min?: number
          end_hour?: number
          end_min?: number
          color?: string
          tag?: string | null
          description?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reels: {
        Row: {
          id: string
          user_id: string
          name: string
          gradient: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          gradient?: string
          emoji?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          gradient?: string
          emoji?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"]
