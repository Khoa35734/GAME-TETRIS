-- =========================================================
-- Migration 004: Settings from Database Only (No Hardcoded Values)
-- =========================================================
-- Purpose: Đảm bảo TẤT CẢ settings đều lấy từ database
--          KHÔNG CÓ hardcoded values trong code
--          Single source of truth = DATABASE
-- =========================================================

-- 1. Ensure table has correct default values
ALTER TABLE users_settings 
  ALTER COLUMN das_delay_ms SET DEFAULT 150,
  ALTER COLUMN das_delay_ms SET NOT NULL,
  ALTER COLUMN arr_ms SET DEFAULT 30,
  ALTER COLUMN arr_ms SET NOT NULL,
  ALTER COLUMN soft_drop_rate SET DEFAULT 60,
  ALTER COLUMN soft_drop_rate SET NOT NULL,
  ALTER COLUMN show_next_pieces SET DEFAULT 5,
  ALTER COLUMN show_next_pieces SET NOT NULL,
  ALTER COLUMN sound_enabled SET DEFAULT TRUE,
  ALTER COLUMN sound_enabled SET NOT NULL,
  ALTER COLUMN music_enabled SET DEFAULT TRUE,
  ALTER COLUMN music_enabled SET NOT NULL,
  ALTER COLUMN sound_volume SET DEFAULT 1.00,
  ALTER COLUMN sound_volume SET NOT NULL,
  ALTER COLUMN music_volume SET DEFAULT 0.60,
  ALTER COLUMN music_volume SET NOT NULL,
  ALTER COLUMN theme_preference SET DEFAULT 'default',
  ALTER COLUMN theme_preference SET NOT NULL,
  ALTER COLUMN language_pref SET DEFAULT 'vi',
  ALTER COLUMN language_pref SET NOT NULL,
  ALTER COLUMN key_bindings SET DEFAULT '{
    "moveLeft": "ArrowLeft",
    "moveRight": "ArrowRight",
    "softDrop": "ArrowDown",
    "hardDrop": "Space",
    "rotateClockwise": "ArrowUp",
    "rotateCounterClockwise": "z",
    "rotate180": "a",
    "hold": "c",
    "restart": "r"
  }'::jsonb,
  ALTER COLUMN key_bindings SET NOT NULL;

-- 2. Cập nhật các row hiện tại nếu có giá trị NULL
UPDATE users_settings 
SET 
  das_delay_ms = COALESCE(das_delay_ms, 150),
  arr_ms = COALESCE(arr_ms, 30),
  soft_drop_rate = COALESCE(soft_drop_rate, 60),
  sound_volume = COALESCE(sound_volume, 1.00),
  music_volume = COALESCE(music_volume, 0.60),
  show_next_pieces = COALESCE(show_next_pieces, 5),
  sound_enabled = COALESCE(sound_enabled, TRUE),
  music_enabled = COALESCE(music_enabled, TRUE),
  theme_preference = COALESCE(theme_preference, 'default'),
  language_pref = COALESCE(language_pref, 'vi')
WHERE das_delay_ms IS NULL 
   OR arr_ms IS NULL 
   OR soft_drop_rate IS NULL 
   OR sound_volume IS NULL 
   OR music_volume IS NULL;

-- 3. Cập nhật key_bindings nếu NULL
UPDATE users_settings 
SET key_bindings = '{
  "moveLeft": "ArrowLeft",
  "moveRight": "ArrowRight",
  "softDrop": "ArrowDown",
  "hardDrop": "Space",
  "rotateClockwise": "ArrowUp",
  "rotateCounterClockwise": "z",
  "rotate180": "a",
  "hold": "c",
  "restart": "r"
}'::jsonb
WHERE key_bindings IS NULL;

-- 4. Tạo trigger để tự động tạo settings khi user mới đăng ký
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_settings (
    user_id,
    das_delay_ms,
    arr_ms,
    soft_drop_rate,
    show_next_pieces,
    sound_enabled,
    music_enabled,
    sound_volume,
    music_volume,
    key_bindings,
    theme_preference,
    language_pref
  ) VALUES (
    NEW.user_id,
    150,
    30,
    60,
    5,
    TRUE,
    TRUE,
    1.00,
    0.60,
    '{
      "moveLeft": "ArrowLeft",
      "moveRight": "ArrowRight",
      "softDrop": "ArrowDown",
      "hardDrop": "Space",
      "rotateClockwise": "ArrowUp",
      "rotateCounterClockwise": "z",
      "rotate180": "a",
      "hold": "c",
      "restart": "r"
    }'::jsonb,
    'default',
    'vi'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger nếu đã tồn tại
DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;

-- Tạo trigger mới
CREATE TRIGGER trigger_create_user_settings
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_settings();

-- 5. Verification queries
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 004 completed successfully!';
  RAISE NOTICE 'Updated default values:';
  RAISE NOTICE '  - das_delay_ms: 150ms';
  RAISE NOTICE '  - arr_ms: 30ms';
  RAISE NOTICE '  - soft_drop_rate: 60ms';
  RAISE NOTICE '  - sound_volume: 1.00';
  RAISE NOTICE '  - music_volume: 0.60';
  RAISE NOTICE '';
  RAISE NOTICE 'Total users with settings: %', (SELECT COUNT(*) FROM users_settings);
  RAISE NOTICE 'Total users without settings: %', (
    SELECT COUNT(*) FROM users 
    WHERE user_id NOT IN (SELECT user_id FROM users_settings)
  );
END $$;

-- 6. Kiểm tra data
SELECT 
  'Settings Summary' as info,
  COUNT(*) as total_settings,
  COUNT(CASE WHEN key_bindings IS NOT NULL THEN 1 END) as with_key_bindings,
  AVG(das_delay_ms) as avg_das_delay,
  AVG(arr_ms) as avg_arr,
  AVG(soft_drop_rate) as avg_soft_drop,
  AVG(sound_volume::numeric) as avg_sound_volume,
  AVG(music_volume::numeric) as avg_music_volume
FROM users_settings;

-- =========================================================
-- ROLLBACK SCRIPT (nếu cần)
-- =========================================================
-- ALTER TABLE users_settings 
--   ALTER COLUMN das_delay_ms SET DEFAULT 133,
--   ALTER COLUMN arr_ms SET DEFAULT 10,
--   ALTER COLUMN soft_drop_rate SET DEFAULT 50,
--   ALTER COLUMN sound_volume SET DEFAULT 0.70,
--   ALTER COLUMN music_volume SET DEFAULT 0.50;
-- 
-- DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;
-- DROP FUNCTION IF EXISTS create_default_user_settings();
-- =========================================================
