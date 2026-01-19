-- Create enum for workflow step types
CREATE TYPE workflow_step_type AS ENUM ('action', 'decision', 'document', 'meeting', 'notification');

-- Create enum for workflow progress status
CREATE TYPE workflow_progress_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped', 'blocked');

-- Create enum for comment types
CREATE TYPE dossier_comment_type AS ENUM ('comment', 'status_change', 'step_completed', 'document_added', 'decision_made');

-- Create enum for client types
CREATE TYPE client_type AS ENUM ('locataire', 'proprietaire', 'proprietaire_non_occupant', 'professionnel');

-- Table: workflow_templates
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_id UUID NOT NULL REFERENCES public.worlds(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: workflow_steps
CREATE TABLE public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  step_type workflow_step_type NOT NULL,
  requires_decision BOOLEAN DEFAULT false,
  decision_yes_next_step INT,
  decision_no_next_step INT,
  assigned_role TEXT,
  estimated_duration INTERVAL,
  is_required BOOLEAN DEFAULT true,
  form_fields JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: dossier_client_info
CREATE TABLE public.dossier_client_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE UNIQUE,
  client_type client_type NOT NULL,
  nom TEXT,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  adresse_sinistre TEXT,
  type_sinistre TEXT,
  date_sinistre DATE,
  compagnie_assurance TEXT,
  numero_police TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: dossier_workflow_progress
CREATE TABLE public.dossier_workflow_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
  status workflow_progress_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  decision_taken BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(dossier_id, workflow_step_id)
);

-- Table: dossier_attachments
CREATE TABLE public.dossier_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  workflow_step_id UUID REFERENCES public.workflow_steps(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  document_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  is_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: dossier_comments
CREATE TABLE public.dossier_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment_type dossier_comment_type NOT NULL DEFAULT 'comment',
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add dossier_id to appointments table
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS workflow_step_id UUID REFERENCES public.workflow_steps(id),
ADD COLUMN IF NOT EXISTS appointment_type TEXT;

-- Create storage bucket for dossier attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('dossier-attachments', 'dossier-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_client_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_workflow_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_templates
CREATE POLICY "Users can view workflow templates for their worlds"
ON public.workflow_templates FOR SELECT
USING (has_world_access(auth.uid(), world_id));

-- RLS Policies for workflow_steps
CREATE POLICY "Users can view workflow steps for their worlds"
ON public.workflow_steps FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflow_templates wt
    WHERE wt.id = workflow_steps.workflow_template_id
    AND has_world_access(auth.uid(), wt.world_id)
  )
);

-- RLS Policies for dossier_client_info
CREATE POLICY "Users can view client info for dossiers they can access"
ON public.dossier_client_info FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_client_info.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can insert client info for their dossiers"
ON public.dossier_client_info FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_client_info.dossier_id
    AND d.owner_id = auth.uid()
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can update client info for their dossiers"
ON public.dossier_client_info FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_client_info.dossier_id
    AND d.owner_id = auth.uid()
    AND has_world_access(auth.uid(), d.world_id)
  )
);

-- RLS Policies for dossier_workflow_progress
CREATE POLICY "Users can view workflow progress for accessible dossiers"
ON public.dossier_workflow_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_workflow_progress.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can create workflow progress for their dossiers"
ON public.dossier_workflow_progress FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_workflow_progress.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can update workflow progress for accessible dossiers"
ON public.dossier_workflow_progress FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_workflow_progress.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

-- RLS Policies for dossier_attachments
CREATE POLICY "Users can view attachments for accessible dossiers"
ON public.dossier_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_attachments.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can upload attachments to accessible dossiers"
ON public.dossier_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_attachments.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
  AND uploaded_by = auth.uid()
);

CREATE POLICY "Users can delete their own attachments"
ON public.dossier_attachments FOR DELETE
USING (uploaded_by = auth.uid());

-- RLS Policies for dossier_comments
CREATE POLICY "Users can view comments for accessible dossiers"
ON public.dossier_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_comments.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
);

CREATE POLICY "Users can create comments for accessible dossiers"
ON public.dossier_comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = dossier_comments.dossier_id
    AND has_world_access(auth.uid(), d.world_id)
  )
  AND user_id = auth.uid()
);

-- Storage policies for dossier-attachments bucket
CREATE POLICY "Users can view attachments from their accessible dossiers"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'dossier-attachments' 
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dossier_attachments da
      JOIN public.dossiers d ON d.id = da.dossier_id
      WHERE da.storage_path = storage.objects.name
      AND has_world_access(auth.uid(), d.world_id)
    )
  )
);

CREATE POLICY "Users can upload attachments to accessible dossiers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'dossier-attachments'
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR auth.uid() IS NOT NULL
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'dossier-attachments'
  AND (
    has_role(auth.uid(), 'superadmin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.dossier_attachments da
      WHERE da.storage_path = storage.objects.name
      AND da.uploaded_by = auth.uid()
    )
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dossier_client_info_updated_at
BEFORE UPDATE ON public.dossier_client_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_dossier_workflow_progress_updated_at
BEFORE UPDATE ON public.dossier_workflow_progress
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert JDE Workflow Template
DO $$
DECLARE
  v_world_id UUID;
  v_template_id UUID;
BEGIN
  -- Get JDE world ID
  SELECT id INTO v_world_id FROM public.worlds WHERE code = 'JDE';
  
  -- Create workflow template
  INSERT INTO public.workflow_templates (world_id, name, description, is_active)
  VALUES (
    v_world_id,
    'Processus JDE Standard',
    'Workflow complet pour la gestion des dossiers sinistres JDE',
    true
  ) RETURNING id INTO v_template_id;
  
  -- Insert workflow steps (simplified for MVP - 15 main steps)
  INSERT INTO public.workflow_steps (workflow_template_id, step_number, name, description, step_type, requires_decision, form_fields, metadata) VALUES
  (v_template_id, 1, 'Prise de contact téléphonique', 'Contact initial avec le client pour évaluation rapide', 'action', false, 
   '[{"name":"type_sinistre","label":"Type de sinistre","type":"select","options":["Incendie","Dégât des eaux","Fissures","Tempête","Autre"],"required":true},{"name":"urgence","label":"Niveau d''urgence","type":"select","options":["Faible","Moyen","Élevé"],"required":true}]'::jsonb,
   '{"icon":"phone","color":"blue"}'::jsonb),
   
  (v_template_id, 2, 'Remplissage fiche client', 'Collecte des informations détaillées du client', 'action', false,
   '[{"name":"client_type","label":"Type de client","type":"select","options":["Locataire","Propriétaire","Propriétaire non occupant","Professionnel"],"required":true},{"name":"nom","label":"Nom","type":"text","required":true},{"name":"prenom","label":"Prénom","type":"text","required":true},{"name":"telephone","label":"Téléphone","type":"tel","required":true},{"name":"email","label":"Email","type":"email","required":true}]'::jsonb,
   '{"icon":"user","color":"green"}'::jsonb),
   
  (v_template_id, 3, 'Création Convention & Mandat', 'Génération des documents Convention et Mandat de représentation', 'document', false,
   '[]'::jsonb,
   '{"icon":"file-text","color":"purple","document_types":["convention","mandat"]}'::jsonb),
   
  (v_template_id, 4, 'Envoi pour signature électronique', 'Transmission des documents au client pour signature', 'notification', false,
   '[{"name":"email_client","label":"Email du client","type":"email","required":true},{"name":"message","label":"Message personnalisé","type":"textarea","required":false}]'::jsonb,
   '{"icon":"send","color":"orange"}'::jsonb),
   
  (v_template_id, 5, 'Convention & Mandat signés?', 'Vérification de la signature des documents', 'decision', true,
   '[]'::jsonb,
   '{"icon":"check-circle","color":"yellow"}'::jsonb),
   
  (v_template_id, 6, 'Rendez-vous de reconnaissance', 'Visite terrain pour évaluation des dommages', 'meeting', false,
   '[{"name":"date","label":"Date du RDV","type":"datetime-local","required":true},{"name":"lieu","label":"Lieu","type":"text","required":true},{"name":"participants","label":"Participants","type":"textarea","required":false}]'::jsonb,
   '{"icon":"calendar","color":"blue","appointment_type":"reconnaissance"}'::jsonb),
   
  (v_template_id, 7, 'Compte-rendu de reconnaissance', 'Documentation des observations terrain', 'action', false,
   '[{"name":"observations","label":"Observations","type":"textarea","required":true},{"name":"photos","label":"Photos","type":"file","accept":"image/*","multiple":true,"required":false},{"name":"mesures_urgence","label":"Mesures d''urgence nécessaires?","type":"checkbox","required":false}]'::jsonb,
   '{"icon":"clipboard","color":"green"}'::jsonb),
   
  (v_template_id, 8, 'Rapport contenu mobilier nécessaire?', 'Décision sur la nécessité d''un rapport mobilier', 'decision', true,
   '[]'::jsonb,
   '{"icon":"help-circle","color":"purple"}'::jsonb),
   
  (v_template_id, 9, 'Génération Rapport contenu mobilier', 'Création du rapport EDP CONTENU', 'document', false,
   '[{"name":"liste_biens","label":"Liste des biens endommagés","type":"textarea","required":true},{"name":"estimation_totale","label":"Estimation totale (€)","type":"number","required":true}]'::jsonb,
   '{"icon":"file","color":"orange","document_types":["rapport_mobilier"]}'::jsonb),
   
  (v_template_id, 10, 'Transmission à l''assurance', 'Envoi des documents à la compagnie d''assurance', 'notification', false,
   '[{"name":"compagnie","label":"Compagnie d''assurance","type":"text","required":true},{"name":"email_expert","label":"Email de l''expert","type":"email","required":true},{"name":"documents","label":"Documents transmis","type":"checkbox-group","options":["Convention","Mandat","Rapport reconnaissance","Photos","Rapport mobilier"],"required":true}]'::jsonb,
   '{"icon":"send","color":"blue"}'::jsonb),
   
  (v_template_id, 11, 'Réception RCCI', 'Enregistrement du Rapport Circonstancié et Chiffrage Initial', 'document', false,
   '[{"name":"date_reception","label":"Date de réception","type":"date","required":true},{"name":"numero_rcci","label":"Numéro RCCI","type":"text","required":true}]'::jsonb,
   '{"icon":"inbox","color":"green"}'::jsonb),
   
  (v_template_id, 12, 'Chiffrage des dommages', 'Évaluation détaillée du coût des réparations', 'action', false,
   '[{"name":"montant_materiel","label":"Montant matériel (€)","type":"number","required":true},{"name":"montant_main_oeuvre","label":"Montant main d''œuvre (€)","type":"number","required":true},{"name":"total","label":"Total (€)","type":"number","required":true}]'::jsonb,
   '{"icon":"calculator","color":"purple"}'::jsonb),
   
  (v_template_id, 13, 'RDV de pointage chiffrage', 'Rendez-vous avec l''expert pour validation du chiffrage', 'meeting', false,
   '[{"name":"date","label":"Date du RDV","type":"datetime-local","required":true},{"name":"expert","label":"Nom de l''expert","type":"text","required":true}]'::jsonb,
   '{"icon":"calendar","color":"orange","appointment_type":"pointage_chiffrage"}'::jsonb),
   
  (v_template_id, 14, 'Réception procès-verbal', 'Réception du PV des dommages signé', 'document', false,
   '[{"name":"date_reception","label":"Date de réception","type":"date","required":true},{"name":"montant_accord","label":"Montant accordé (€)","type":"number","required":true}]'::jsonb,
   '{"icon":"file-check","color":"blue"}'::jsonb),
   
  (v_template_id, 15, 'RDV de clôture & Signature', 'Rendez-vous final avec présentation et signature de la lettre d''acceptation', 'meeting', false,
   '[{"name":"date","label":"Date du RDV","type":"datetime-local","required":true},{"name":"montant_final","label":"Montant final (€)","type":"number","required":true},{"name":"signature_obtenue","label":"Signature obtenue","type":"checkbox","required":true}]'::jsonb,
   '{"icon":"check-square","color":"green","appointment_type":"cloture"}'::jsonb);
   
END $$;