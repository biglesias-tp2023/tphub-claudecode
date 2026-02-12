-- ============================================
-- VERIFICATION SCRIPT
-- ============================================
-- Run these queries AFTER executing the migration
-- to verify everything is working correctly
-- ============================================

-- 1. Check Bruno is owner
SELECT
  '1. Bruno as Owner' as check_name,
  CASE
    WHEN role = 'owner' THEN '✅ PASS'
    ELSE '❌ FAIL - Role is: ' || role
  END as result
FROM profiles
WHERE email = 'biglesias@thinkpaladar.com';

-- 2. Check roles constraint exists
SELECT
  '2. Roles Constraint' as check_name,
  CASE
    WHEN pg_get_constraintdef(oid) LIKE '%owner%superadmin%admin%manager%consultant%viewer%'
    THEN '✅ PASS'
    ELSE '❌ FAIL - Constraint: ' || pg_get_constraintdef(oid)
  END as result
FROM pg_constraint
WHERE conname = 'profiles_role_check';

-- 3. Check owner unique index exists
SELECT
  '3. Owner Unique Index' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_owner_unique')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 4. Check protect_owner function exists
SELECT
  '4. protect_owner Function' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'protect_owner')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 5. Check user_invitations table exists
SELECT
  '5. user_invitations Table' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 6. Check invitation_status enum exists
SELECT
  '6. invitation_status Enum' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 7. Check apply_invitation_config function exists
SELECT
  '7. apply_invitation_config Function' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'apply_invitation_config')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 8. Check get_current_user_role function exists (for RLS fix)
SELECT
  '8. get_current_user_role Function' as check_name,
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_user_role')
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result;

-- 9. Check RLS is enabled on user_invitations
SELECT
  '9. RLS on user_invitations' as check_name,
  CASE
    WHEN relrowsecurity = true THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
FROM pg_class
WHERE relname = 'user_invitations';

-- 10. Count RLS policies on profiles
SELECT
  '10. Profiles RLS Policies' as check_name,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS - ' || COUNT(*) || ' policies'
    ELSE '❌ FAIL - Only ' || COUNT(*) || ' policies'
  END as result
FROM pg_policies
WHERE tablename = 'profiles';

-- 11. Count RLS policies on user_invitations
SELECT
  '11. Invitations RLS Policies' as check_name,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS - ' || COUNT(*) || ' policies'
    ELSE '❌ FAIL - Only ' || COUNT(*) || ' policies'
  END as result
FROM pg_policies
WHERE tablename = 'user_invitations';

-- 12. List all users with their roles
SELECT
  '12. All Users & Roles' as info,
  email,
  role,
  array_length(assigned_company_ids, 1) as company_count
FROM profiles
ORDER BY
  CASE role
    WHEN 'owner' THEN 1
    WHEN 'superadmin' THEN 2
    WHEN 'admin' THEN 3
    WHEN 'manager' THEN 4
    WHEN 'consultant' THEN 5
    WHEN 'viewer' THEN 6
    ELSE 7
  END;
