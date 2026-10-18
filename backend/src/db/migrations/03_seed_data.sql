-- =========================================================================
-- KrishakDrishti Migration 03: Seed Data
-- Provides verified agricultural records for Indian farmers, farms, and fields
-- =========================================================================

-- Profiles
INSERT INTO profiles (id, full_name, phone_number, preferred_language, role, location_consent, alert_sms_consent, alert_voice_consent, alert_whatsapp_consent)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Gurpreet Singh', '+919876543210', 'pa', 'farmer', true, true, true, true),
    ('22222222-2222-2222-2222-222222222222', 'Rameshwar Patil', '+919812345678', 'mr', 'farmer', true, true, false, true),
    ('33333333-3333-3333-3333-333333333333', 'Sunita Sharma (FPO Lead)', '+919899001122', 'hi', 'fpo_coordinator', true, true, true, true),
    ('44444444-4444-4444-4444-444444444444', 'Dr. Virender K. Ahluwalia', '+919844332211', 'en', 'agri_expert', true, false, false, true)
ON CONFLICT (id) DO NOTHING;

-- Farms
INSERT INTO farms (id, farmer_id, name, state, district, sub_district, village, pincode, total_area_acres, center_lat, center_lng, irrigation_source, soil_type)
VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Green Horizon Acreage', 'Punjab', 'Ludhiana', 'Jagraon', 'Sidhwan Bet', '142024', 14.50, 30.901000, 75.857300, 'Solar Tube Well & Canal Siphon', 'Fertile Alluvial Loam'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Sahyadri Organic Orchard & Cash Farms', 'Maharashtra', 'Nashik', 'Niphad', 'Pimpalgaon Baswant', '422209', 8.20, 20.176400, 74.053100, 'Drip Micro-Irrigation & Farm Pond', 'Medium Black Loamy Soil')
ON CONFLICT (id) DO NOTHING;

-- Fields
INSERT INTO fields (id, farm_id, farmer_id, name, crop_name, crop_variety, sowing_date, expected_harvest_date, growth_stage, area_acres, health_status, boundary_geojson)
VALUES
    ('f1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'North Wheat Basin (Kanal 1-8)', 'Wheat (गेहूं / ਕਣਕ)', 'HD-3226 (Pusa Yashasvi)', '2026-11-10', '2026-04-15', 'Grain Filling', 6.20, 'Watch', '{"type":"Polygon","coordinates":[[[75.854,30.902],[75.859,30.903],[75.858,30.898],[75.853,30.899],[75.854,30.902]]]}'),
    ('f2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'South Mustard & Pulses Strip', 'Mustard (सरसों / ਸਰ੍ਹੋਂ)', 'Pusa Bold', '2026-10-25', '2026-03-20', 'Maturity', 4.30, 'Optimal', '{"type":"Polygon","coordinates":[[[75.853,30.898],[75.858,30.897],[75.857,30.893],[75.852,30.894],[75.853,30.898]]]}'),
    ('f3333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Nashik Red Onion Plot A', 'Onion (कांदा / प्याज)', 'Bhima Super', '2026-08-15', '2026-12-10', 'Vegetative', 3.50, 'At Risk', '{"type":"Polygon","coordinates":[[[74.051,20.177],[74.055,20.178],[74.056,20.174],[74.052,20.173],[74.051,20.177]]]}')
ON CONFLICT (id) DO NOTHING;
