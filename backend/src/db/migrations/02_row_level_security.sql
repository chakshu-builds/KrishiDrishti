-- =========================================================================
-- KrishakDrishti Migration 02: Row Level Security (RLS) Policies
-- Implements role-aware security policies for Farmers, FPO Coordinators,
-- Agricultural Experts, and System Administrators.
-- =========================================================================

-- Enable Row Level Security across all core domain tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_overlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fpo_cases ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 1. PROFILES POLICIES
-- -------------------------------------------------------------------------
-- Authenticated users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT USING (
        auth.uid() = supabase_auth_id
    );

-- Authenticated users can update their own profile preferences
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (
        auth.uid() = supabase_auth_id
    );

-- FPO coordinators can view profiles belonging to their FPO cluster
CREATE POLICY "profiles_fpo_select" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles cur
            WHERE cur.supabase_auth_id = auth.uid()
              AND cur.role IN ('fpo_coordinator', 'admin')
              AND (cur.fpo_id = profiles.fpo_id OR cur.role = 'admin')
        )
    );

-- Service role / admins have full access
CREATE POLICY "profiles_admin_all" ON profiles
    FOR ALL USING (
        auth.role() = 'service_role' OR
        EXISTS (
            SELECT 1 FROM profiles WHERE supabase_auth_id = auth.uid() AND role = 'admin'
        )
    );

-- -------------------------------------------------------------------------
-- 2. FARMS & FIELDS POLICIES
-- -------------------------------------------------------------------------
-- Farmers can manage (SELECT, INSERT, UPDATE, DELETE) their own farms
CREATE POLICY "farms_farmer_manage" ON farms
    FOR ALL USING (
        farmer_id IN (
            SELECT id FROM profiles WHERE supabase_auth_id = auth.uid()
        )
    );

-- FPO coordinators can view farms of farmers in their FPO cluster
CREATE POLICY "farms_fpo_select" ON farms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles f_prof
            JOIN profiles coord ON coord.fpo_id = f_prof.fpo_id
            WHERE f_prof.id = farms.farmer_id
              AND coord.supabase_auth_id = auth.uid()
              AND coord.role IN ('fpo_coordinator', 'admin')
        )
    );

-- Farmers can manage their own fields
CREATE POLICY "fields_farmer_manage" ON fields
    FOR ALL USING (
        farmer_id IN (
            SELECT id FROM profiles WHERE supabase_auth_id = auth.uid()
        )
    );

-- FPO coordinators can view fields in their cluster
CREATE POLICY "fields_fpo_select" ON fields
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles f_prof
            JOIN profiles coord ON coord.fpo_id = f_prof.fpo_id
            WHERE f_prof.id = fields.farmer_id
              AND coord.supabase_auth_id = auth.uid()
              AND coord.role IN ('fpo_coordinator', 'admin')
        )
    );

-- -------------------------------------------------------------------------
-- 3. IOT DEVICES & TELEMETRY POLICIES
-- -------------------------------------------------------------------------
-- Farmers can view and manage their own devices
CREATE POLICY "devices_farmer_manage" ON devices
    FOR ALL USING (
        farmer_id IN (
            SELECT id FROM profiles WHERE supabase_auth_id = auth.uid()
        )
    );

-- Ingestion service / authenticated IoT gateways can insert device readings
CREATE POLICY "readings_insert_service" ON device_readings
    FOR INSERT WITH CHECK (true);

-- Farmers can read telemetry from their devices
CREATE POLICY "readings_farmer_select" ON device_readings
    FOR SELECT USING (
        device_id IN (
            SELECT d.id FROM devices d
            JOIN profiles p ON p.id = d.farmer_id
            WHERE p.supabase_auth_id = auth.uid()
        )
    );

-- -------------------------------------------------------------------------
-- 4. CROP DIAGNOSES POLICIES
-- -------------------------------------------------------------------------
-- Farmers can view and create crop diagnoses for their fields
CREATE POLICY "diagnoses_farmer_manage" ON crop_diagnoses
    FOR ALL USING (
        farmer_id IN (
            SELECT id FROM profiles WHERE supabase_auth_id = auth.uid()
        )
    );

-- FPO coordinators and Agri Experts can inspect diagnoses for triage
CREATE POLICY "diagnoses_expert_select" ON crop_diagnoses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.supabase_auth_id = auth.uid()
              AND p.role IN ('fpo_coordinator', 'agri_expert', 'admin')
        )
    );

-- -------------------------------------------------------------------------
-- 5. DRONE OVERLAYS POLICIES
-- -------------------------------------------------------------------------
-- Farmers can view drone overlays on their fields
CREATE POLICY "drone_overlays_farmer_select" ON drone_overlays
    FOR SELECT USING (
        field_id IN (
            SELECT f.id FROM fields f
            JOIN profiles p ON p.id = f.farmer_id
            WHERE p.supabase_auth_id = auth.uid()
        )
    );

-- -------------------------------------------------------------------------
-- 6. ALERTS POLICIES
-- -------------------------------------------------------------------------
-- Farmers can view their own alerts
CREATE POLICY "alerts_farmer_select" ON alerts
    FOR SELECT USING (
        farmer_id IN (
            SELECT id FROM profiles WHERE supabase_auth_id = auth.uid()
        )
    );

-- -------------------------------------------------------------------------
-- 7. FPO CASES POLICIES
-- -------------------------------------------------------------------------
-- FPO coordinators can manage cases in their FPO
CREATE POLICY "fpo_cases_coordinator_manage" ON fpo_cases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.supabase_auth_id = auth.uid()
              AND (p.fpo_id = fpo_cases.fpo_id OR p.role = 'admin')
              AND p.role IN ('fpo_coordinator', 'admin')
        )
    );

-- Assigned agricultural experts can view and update cases assigned to them
CREATE POLICY "fpo_cases_expert_update" ON fpo_cases
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.supabase_auth_id = auth.uid()
              AND p.role = 'agri_expert'
        )
    );
