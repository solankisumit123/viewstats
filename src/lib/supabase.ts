import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseKey)

export type Database = {
  public: {
    Tables: {
      channels: any
      videos: any
      analytics_snapshots: any
      video_analytics_snapshots: any
      viral_videos: any
      outlier_scores: any
      category_stats: any
      country_stats: any
      trend_tracking: any
      thumbnail_analysis: any
      revenue_estimates: any
      projections: any
      collections: any
      collection_items: any
      collection_folders: any
      competitors: any
      ab_tests: any
      ab_test_thumbnails: any
      alerts: any
      alert_logs: any
      saved_searches: any
      ideas: any
      research_boards: any
      research_board_items: any
      niche_tracking: any
      teams: any
      team_members: any
      profiles: any
      agency_clients: any
      enterprise_reports: any
      competitor_intelligence: any
      credit_usage: any
      chrome_extension_data: any
    }
  }
}
