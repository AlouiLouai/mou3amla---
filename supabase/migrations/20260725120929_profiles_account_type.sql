-- Foreign visitors (tourists) entering Tunisia have a real send-side need
-- (pay a merchant/split a bill using their own foreign card/wallet) but no
-- Tunisian bank/wallet destination to ever receive into - Mou3amla's whole
-- receive model routes to a real Tunisian provider (Flouci, D17, a RIB,
-- etc.), which a visiting tourist won't have. `account_type` lets the app
-- distinguish that at onboarding and restrict the receive side accordingly
-- (see ProfileBuilderScreen, home-screen.tsx, bottom-nav's smart scan tab).
alter table public.profiles
  add column if not exists account_type text
  not null default 'resident'
  check (account_type in ('resident', 'tourist'));
