-- Onboarding "IKEA effect" personalization: the personal identity card style
-- a new user picks in ProfileBuilderScreen before the passkey ceremony
-- (cyan/magenta/amber/emerald - see identityGradients in
-- src/features/mou3amla/constants.ts). Purely cosmetic, unrelated to any
-- linked bank/wallet destination's real provider brand color.
alter table public.profiles
  add column if not exists card_gradient text
  check (card_gradient in ('cyan', 'magenta', 'amber', 'emerald'));

-- Written only by the service-role admin client from
-- setProfileCardGradient (src/features/auth/server/actions.ts), the same
-- pattern every other profiles write already follows - no column grant to
-- `authenticated` needed, consistent with the hardening in
-- 20260719130000_profiles_column_grants_and_nearby_realtime.sql.
