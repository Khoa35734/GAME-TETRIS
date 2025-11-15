-- =========================================================
-- TEST SCRIPT: Settings Database Persistence
-- =========================================================
-- Mục đích: Kiểm tra tất cả thay đổi settings đều lưu vào DB
-- =========================================================

-- 1. Kiểm tra schema hiện tại
\d users_settings

-- 2. Xem tất cả settings hiện có
SELECT 
  user_id,
  das_delay_ms,
  arr_ms,
  soft_drop_rate,
  sound_volume,
  music_volume,
  key_bindings->>'hardDrop' as hard_drop_key,
  theme_preference,
  language_pref
FROM users_settings
ORDER BY user_id;

-- 3. Kiểm tra default values
SELECT 
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_name = 'users_settings'
  AND column_name IN ('das_delay_ms', 'arr_ms', 'soft_drop_rate', 'sound_volume', 'music_volume')
ORDER BY ordinal_position;

-- 4. Kiểm tra trigger tồn tại
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_user_settings';

-- 5. Test trigger: Tạo user mới
DO $$
DECLARE
  new_user_id BIGINT;
BEGIN
  -- Tạo user test
  INSERT INTO users (user_name, email, password_hash, role)
  VALUES ('test_settings_' || floor(random() * 1000), 
          'test_' || floor(random() * 1000) || '@test.com', 
          'test_hash', 
          'player')
  RETURNING user_id INTO new_user_id;

  RAISE NOTICE '✅ Created test user with ID: %', new_user_id;

  -- Kiểm tra settings tự động tạo
  IF EXISTS (SELECT 1 FROM users_settings WHERE user_id = new_user_id) THEN
    RAISE NOTICE '✅ Trigger worked! Settings auto-created for user %', new_user_id;
    
    -- Hiển thị settings
    SELECT 
      das_delay_ms,
      arr_ms,
      soft_drop_rate,
      sound_volume,
      music_volume
    FROM users_settings
    WHERE user_id = new_user_id;
  ELSE
    RAISE WARNING '❌ Trigger FAILED! No settings for user %', new_user_id;
  END IF;

  -- Cleanup
  DELETE FROM users_settings WHERE user_id = new_user_id;
  DELETE FROM users WHERE user_id = new_user_id;
  RAISE NOTICE '🧹 Cleaned up test user';
END $$;

-- 6. Test update: Thay đổi settings
DO $$
DECLARE
  test_user_id BIGINT;
  old_das INTEGER;
  new_das INTEGER;
BEGIN
  -- Lấy user_id đầu tiên
  SELECT user_id INTO test_user_id 
  FROM users_settings 
  LIMIT 1;

  IF test_user_id IS NULL THEN
    RAISE WARNING '❌ No users found with settings';
    RETURN;
  END IF;

  -- Lưu giá trị cũ
  SELECT das_delay_ms INTO old_das 
  FROM users_settings 
  WHERE user_id = test_user_id;

  RAISE NOTICE 'Testing update for user_id: %', test_user_id;
  RAISE NOTICE 'Old das_delay_ms: %', old_das;

  -- Cập nhật
  UPDATE users_settings 
  SET das_delay_ms = 999 
  WHERE user_id = test_user_id;

  -- Kiểm tra
  SELECT das_delay_ms INTO new_das 
  FROM users_settings 
  WHERE user_id = test_user_id;

  IF new_das = 999 THEN
    RAISE NOTICE '✅ Update successful! New value: %', new_das;
  ELSE
    RAISE WARNING '❌ Update FAILED! Value is still: %', new_das;
  END IF;

  -- Khôi phục
  UPDATE users_settings 
  SET das_delay_ms = old_das 
  WHERE user_id = test_user_id;

  RAISE NOTICE '🔄 Restored old value: %', old_das;
END $$;

-- 7. Kiểm tra mỗi user có settings khác nhau
WITH settings_counts AS (
  SELECT 
    das_delay_ms,
    COUNT(*) as user_count
  FROM users_settings
  GROUP BY das_delay_ms
)
SELECT 
  'Unique DAS values' as metric,
  COUNT(*) as unique_values,
  SUM(user_count) as total_users
FROM settings_counts;

-- 8. Kiểm tra user nào chưa có settings
SELECT 
  u.user_id,
  u.user_name,
  u.email,
  u.created_at,
  CASE 
    WHEN s.user_id IS NULL THEN '❌ NO SETTINGS'
    ELSE '✅ HAS SETTINGS'
  END as status
FROM users u
LEFT JOIN users_settings s ON u.user_id = s.user_id
WHERE s.user_id IS NULL
ORDER BY u.created_at DESC;

-- 9. Statistics
SELECT 
  '📊 SETTINGS STATISTICS' as section,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users_settings) as total_settings,
  (SELECT COUNT(*) FROM users WHERE user_id NOT IN (SELECT user_id FROM users_settings)) as users_without_settings,
  ROUND(AVG(das_delay_ms), 2) as avg_das_delay,
  ROUND(AVG(arr_ms), 2) as avg_arr,
  ROUND(AVG(soft_drop_rate), 2) as avg_soft_drop,
  ROUND(AVG(sound_volume::numeric), 2) as avg_sound_volume,
  ROUND(AVG(music_volume::numeric), 2) as avg_music_volume
FROM users_settings;

-- 10. Test key bindings JSONB
SELECT 
  user_id,
  key_bindings->>'moveLeft' as move_left,
  key_bindings->>'hardDrop' as hard_drop,
  key_bindings->>'rotate180' as rotate_180,
  JSONB_ARRAY_LENGTH(JSONB_OBJECT_KEYS(key_bindings)::jsonb) as total_keys
FROM users_settings
WHERE key_bindings IS NOT NULL
LIMIT 5;

-- 11. Final summary
SELECT 
  '✅ TEST COMPLETE' as status,
  NOW() as tested_at;

-- =========================================================
-- EXPECTED RESULTS:
-- =========================================================
-- 1. Schema: 12 columns, das_delay_ms NOT NULL DEFAULT 150
-- 2. Settings: Mỗi user có 1 row riêng
-- 3. Default values: 150, 30, 60, 1.00, 0.60
-- 4. Trigger: EXISTS và ACTIVE
-- 5. Trigger test: ✅ Auto-create settings
-- 6. Update test: ✅ Value changed to 999, then restored
-- 7. Unique values: Có nhiều giá trị khác nhau (không phải tất cả đều 150)
-- 8. No settings: 0 users (trigger đã tạo cho tất cả)
-- 9. Statistics: total_users = total_settings
-- 10. Key bindings: JSON hợp lệ với 9 keys
-- =========================================================
