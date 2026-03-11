-- =============================================================
-- Supabase Database Schema – Gestión de Gastos
-- Este script es re-ejecutable (IDEMPOTENTE). 
-- =============================================================

-- 1. Extensiones Necesarias
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ────────────────────── PROFILES ──────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  monthly_salary NUMERIC DEFAULT 0,
  currency    TEXT DEFAULT 'CLP',
  alert_threshold NUMERIC DEFAULT 75,
  alert_email TEXT,
  alert_sent_month TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de Profiles (Borrar y crear para evitar error 42710)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
    CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
END $$;

-- Trigger para perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- ────────────────────── FIXED EXPENSES ───────────────────

CREATE TABLE IF NOT EXISTS fixed_expenses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('arriendo','luz','agua','internet','otros')),
  label      TEXT,
  amount     NUMERIC NOT NULL CHECK (amount > 0),
  month      DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columnas nuevas (Phase 15)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fixed_expenses' AND column_name='due_day') THEN
        ALTER TABLE fixed_expenses ADD COLUMN due_day INTEGER CHECK (due_day >= 1 AND due_day <= 31);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fixed_expenses' AND column_name='is_paid') THEN
        ALTER TABLE fixed_expenses ADD COLUMN is_paid BOOLEAN DEFAULT false;
    END IF;
END $$;

ALTER TABLE fixed_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own fixed expenses" ON fixed_expenses;
    CREATE POLICY "Users can view own fixed expenses" ON fixed_expenses FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own fixed expenses" ON fixed_expenses;
    CREATE POLICY "Users can insert own fixed expenses" ON fixed_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own fixed expenses" ON fixed_expenses;
    CREATE POLICY "Users can update own fixed expenses" ON fixed_expenses FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete own fixed expenses" ON fixed_expenses;
    CREATE POLICY "Users can delete own fixed expenses" ON fixed_expenses FOR DELETE USING (auth.uid() = user_id);
END $$;

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

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view own daily expenses" ON daily_expenses;
    CREATE POLICY "Users can view own daily expenses" ON daily_expenses FOR SELECT USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can insert own daily expenses" ON daily_expenses;
    CREATE POLICY "Users can insert own daily expenses" ON daily_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can update own daily expenses" ON daily_expenses;
    CREATE POLICY "Users can update own daily expenses" ON daily_expenses FOR UPDATE USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete own daily expenses" ON daily_expenses;
    CREATE POLICY "Users can delete own daily expenses" ON daily_expenses FOR DELETE USING (auth.uid() = user_id);
END $$;

-- ────────────────────── AUTOMATION (CRON) ───────────────────
-- Nota: Para activar remmplazar [TU-PROYECTO] y [TU-SERVICE-ROLE-KEY] 
-- en el comando cron.schedule al final del despliegue.
