-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'editor', 'viewer');

-- Create world_code enum
CREATE TYPE public.world_code AS ENUM ('JDE', 'JDMO', 'DBCS');

-- Create dossier_status enum
CREATE TYPE public.dossier_status AS ENUM ('nouveau', 'en_cours', 'cloture');

-- Users table (profiles linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roles table
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name app_role NOT NULL UNIQUE,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles junction table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Worlds table
CREATE TABLE public.worlds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code world_code NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  theme_colors JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User world access junction table
CREATE TABLE public.user_world_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, world_id)
);

-- Permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- World permissions (which permissions are available per world)
CREATE TABLE public.world_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(world_id, permission_id)
);

-- User world permissions (granular permissions per user per world)
CREATE TABLE public.user_world_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, world_id, permission_id)
);

-- Dossiers table
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status dossier_status NOT NULL DEFAULT 'nouveau',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  world_code world_code,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_world_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.world_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_world_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = _user_id AND r.name = _role
  )
$$;

-- Function to check if user has access to a world
CREATE OR REPLACE FUNCTION public.has_world_access(_user_id UUID, _world_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_world_access
    WHERE user_id = _user_id AND world_id = _world_id
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Superadmins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for roles (read-only for all authenticated)
CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for worlds
CREATE POLICY "Users can view worlds they have access to"
  ON public.worlds FOR SELECT
  USING (
    public.has_role(auth.uid(), 'superadmin') OR
    EXISTS (
      SELECT 1 FROM public.user_world_access
      WHERE user_id = auth.uid() AND world_id = worlds.id
    )
  );

-- RLS Policies for user_world_access
CREATE POLICY "Users can view their own world access"
  ON public.user_world_access FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all world access"
  ON public.user_world_access FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for permissions
CREATE POLICY "Authenticated users can view permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for world_permissions
CREATE POLICY "Authenticated users can view world permissions"
  ON public.world_permissions FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for user_world_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_world_permissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Superadmins can manage all user permissions"
  ON public.user_world_permissions FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- RLS Policies for dossiers
CREATE POLICY "Users can view dossiers from worlds they have access to"
  ON public.dossiers FOR SELECT
  USING (public.has_world_access(auth.uid(), world_id));

CREATE POLICY "Users can create dossiers in worlds they have access to"
  ON public.dossiers FOR INSERT
  WITH CHECK (public.has_world_access(auth.uid(), world_id) AND auth.uid() = owner_id);

CREATE POLICY "Users can update their own dossiers"
  ON public.dossiers FOR UPDATE
  USING (auth.uid() = owner_id AND public.has_world_access(auth.uid(), world_id));

-- RLS Policies for audit_logs
CREATE POLICY "Superadmins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dossiers_updated_at
  BEFORE UPDATE ON public.dossiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default roles
INSERT INTO public.roles (name, label) VALUES
  ('superadmin', 'Super Administrateur'),
  ('admin', 'Administrateur'),
  ('editor', 'Éditeur'),
  ('viewer', 'Lecteur');

-- Insert worlds with theme colors
INSERT INTO public.worlds (code, name, description, theme_colors) VALUES
  ('JDE', 'JDE', 'Journal des Entreprises', '{"primary": "#538135", "accent": "#ed7d31", "neutral": "#d9d9d8"}'),
  ('JDMO', 'JDMO', 'Journal des Marches et Opérations', '{"primary": "#538135", "accent": "#ed7d31", "neutral": "#d9d9d8"}'),
  ('DBCS', 'DBCS', 'Database Consultation System', '{"primary": "#CE2A2B", "accent": "#F7972E", "neutral": "#d9d9d8"}');

-- Insert default permissions
INSERT INTO public.permissions (key, label, description) VALUES
  ('dossier.read', 'Lire les dossiers', 'Permet de consulter les dossiers'),
  ('dossier.create', 'Créer des dossiers', 'Permet de créer de nouveaux dossiers'),
  ('dossier.update', 'Modifier des dossiers', 'Permet de modifier les dossiers existants'),
  ('dossier.delete', 'Supprimer des dossiers', 'Permet de supprimer des dossiers'),
  ('export.csv', 'Exporter en CSV', 'Permet d''exporter les données en CSV'),
  ('settings.access', 'Accès aux paramètres', 'Permet d''accéder aux paramètres du monde');

-- Link permissions to all worlds
INSERT INTO public.world_permissions (world_id, permission_id)
SELECT w.id, p.id
FROM public.worlds w
CROSS JOIN public.permissions p;