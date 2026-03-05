-- =============================================================
-- Supabase Database Schema – Daily Expense Management App
-- Run this in the Supabase SQL Editor.
-- =============================================================

-- ────────────────────── PROFILES ──────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  monthly_salary NUMERIC DEFAULT 0,
  currency    TEXT DEFAULT 'CLP',
  alert_sent_month TEXT, -- 'YYYY-MM' for anti-repeat logic
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ────────────────────── FIXED EXPENSES ───────────────────

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('arriendo','luz','agua','internet','otros')),
  label      TEXT,
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  month      DATE NOT NULL, -- first day of month, e.g. '2026-03-01'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own fixed expenses"
  ON fixed_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fixed expenses"
  ON fixed_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fixed expenses"
  ON fixed_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fixed expenses"
  ON fixed_expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────── DAILY EXPENSES ───────────────────

CREATE TABLE IF NOT EXISTS daily_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount      NUMERIC NOT NULL CHECK (amount > 0),
  category    TEXT,
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE daily_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily expenses"
  ON daily_expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily expenses"
  ON daily_expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily expenses"
  ON daily_expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own daily expenses"
  ON daily_expenses FOR DELETE
  USING (auth.uid() = user_id);
