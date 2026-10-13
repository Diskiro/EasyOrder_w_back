-- ==============================================================================
-- Migración 05: Estado Activo/Inactivo en Profiles (Personal)
-- ==============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE profiles SET is_active = TRUE WHERE is_active IS NULL;
