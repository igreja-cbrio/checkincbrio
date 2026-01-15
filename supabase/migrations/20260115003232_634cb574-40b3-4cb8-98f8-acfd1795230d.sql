-- Create role enum for user types
CREATE TYPE public.user_role AS ENUM ('volunteer', 'leader');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  planning_center_id TEXT,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'volunteer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create services table (synced from Planning Center)
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_center_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  service_type_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create schedules table (which volunteers are scheduled for which services)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  volunteer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  planning_center_person_id TEXT NOT NULL,
  volunteer_name TEXT NOT NULL,
  team_name TEXT,
  position_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create check_ins table
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('qr_code', 'manual'))
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Leaders can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'leader'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Leaders can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'leader'));

-- RLS Policies for services (everyone authenticated can view)
CREATE POLICY "Authenticated users can view services"
  ON public.services FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Leaders can manage services"
  ON public.services FOR ALL
  USING (public.has_role(auth.uid(), 'leader'));

-- RLS Policies for schedules
CREATE POLICY "Users can view their own schedules"
  ON public.schedules FOR SELECT
  USING (volunteer_id = auth.uid());

CREATE POLICY "Leaders can view all schedules"
  ON public.schedules FOR SELECT
  USING (public.has_role(auth.uid(), 'leader'));

CREATE POLICY "Leaders can manage schedules"
  ON public.schedules FOR ALL
  USING (public.has_role(auth.uid(), 'leader'));

-- RLS Policies for check_ins
CREATE POLICY "Users can view their own check-ins"
  ON public.check_ins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.schedules s
    WHERE s.id = schedule_id AND s.volunteer_id = auth.uid()
  ));

CREATE POLICY "Leaders can view all check-ins"
  ON public.check_ins FOR SELECT
  USING (public.has_role(auth.uid(), 'leader'));

CREATE POLICY "Leaders can create check-ins"
  ON public.check_ins FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'leader'));

-- Function to auto-create profile and role on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, planning_center_id, qr_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data ->> 'planning_center_id',
    encode(gen_random_bytes(16), 'hex')
  );
  
  -- Assign default volunteer role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'volunteer');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();