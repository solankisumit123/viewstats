
-- Agency clients table
CREATE TABLE IF NOT EXISTS agency_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  channel_ids TEXT[],
  contract_value DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enterprise analytics reports
CREATE TABLE IF NOT EXISTS enterprise_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('competitor', 'trend', 'revenue', 'growth', 'custom')),
  report_config JSONB NOT NULL,
  schedule TEXT DEFAULT 'none' CHECK (schedule IN ('none', 'daily', 'weekly', 'monthly')),
  last_generated TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advanced competitor intelligence
CREATE TABLE IF NOT EXISTS competitor_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  competitor_channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('strategy', 'content', 'audience', 'seo', 'monetization')),
  insights JSONB NOT NULL,
  confidence_score DECIMAL(5,2) DEFAULT 0,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit usage tracking
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  action_type TEXT NOT NULL,
  credits_used INTEGER DEFAULT 1,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "agency_clients_select_team" ON agency_clients FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_id = agency_clients.agency_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE id = agency_clients.agency_id AND owner_id = auth.uid())
);
CREATE POLICY "agency_clients_insert_team" ON agency_clients FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE id = agency_clients.agency_id AND owner_id = auth.uid())
);
CREATE POLICY "agency_clients_update_team" ON agency_clients FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams WHERE id = agency_clients.agency_id AND owner_id = auth.uid())
);
CREATE POLICY "agency_clients_delete_team" ON agency_clients FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams WHERE id = agency_clients.agency_id AND owner_id = auth.uid())
);

CREATE POLICY "enterprise_reports_select_team" ON enterprise_reports FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_id = enterprise_reports.team_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE id = enterprise_reports.team_id AND owner_id = auth.uid())
);
CREATE POLICY "enterprise_reports_insert_team" ON enterprise_reports FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE id = enterprise_reports.team_id AND owner_id = auth.uid())
);
CREATE POLICY "enterprise_reports_update_team" ON enterprise_reports FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams WHERE id = enterprise_reports.team_id AND owner_id = auth.uid())
);
CREATE POLICY "enterprise_reports_delete_team" ON enterprise_reports FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM teams WHERE id = enterprise_reports.team_id AND owner_id = auth.uid())
);

CREATE POLICY "competitor_intelligence_select_team" ON competitor_intelligence FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM team_members WHERE team_id = competitor_intelligence.team_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM teams WHERE id = competitor_intelligence.team_id AND owner_id = auth.uid())
);
CREATE POLICY "competitor_intelligence_insert_team" ON competitor_intelligence FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE id = competitor_intelligence.team_id AND owner_id = auth.uid())
);

CREATE POLICY "credit_usage_select_own" ON credit_usage FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "credit_usage_insert_own" ON credit_usage FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Indexes
CREATE INDEX idx_agency_clients_agency_id ON agency_clients(agency_id);
CREATE INDEX idx_enterprise_reports_team_id ON enterprise_reports(team_id);
CREATE INDEX idx_competitor_intelligence_team_id ON competitor_intelligence(team_id);
CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_research_boards_updated_at BEFORE UPDATE ON research_boards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
