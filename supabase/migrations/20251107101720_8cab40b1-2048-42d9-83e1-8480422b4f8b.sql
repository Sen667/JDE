-- Mise à jour des descriptions des worlds
UPDATE public.worlds 
SET name = 'JD Expertise',
    description = 'Expertise bâtiment & sinistres - Expert d''assuré intervenant auprès des particuliers et professionnels'
WHERE code = 'JDE';

UPDATE public.worlds 
SET name = 'JDMO',
    description = 'Maîtrise d''œuvre & conception technique - Bureau d''études pilotant les projets de construction'
WHERE code = 'JDMO';

UPDATE public.worlds 
SET name = 'DBCS',
    description = 'Réparation & travaux bâtiment - Entreprise de travaux et rénovation'
WHERE code = 'DBCS';

-- Suppression des anciens dossiers de démo
DELETE FROM public.dossiers;

-- Insertion des nouveaux dossiers pour JDE (Expertise bâtiment)
INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Expertise sinistre incendie - 12 Rue Pasteur Somain',
    'en_cours',
    w.id,
    p.id,
    ARRAY['urgent', 'incendie', 'expertise']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDE'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Dégât des eaux - Appartement Lille Centre',
    'en_cours',
    w.id,
    p.id,
    ARRAY['dégât des eaux', 'appartement']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDE'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Fissures pavillon - Catastrophe naturelle Douai',
    'nouveau',
    w.id,
    p.id,
    ARRAY['fissures', 'catastrophe naturelle']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDE'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Contre-expertise assurance - Maison individuelle',
    'nouveau',
    w.id,
    p.id,
    ARRAY['contre-expertise', 'négociation']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDE'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Rapport technique inondation - Commerce Valenciennes',
    'cloture',
    w.id,
    p.id,
    ARRAY['inondation', 'commerce']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDE'
LIMIT 1;

-- Insertion des nouveaux dossiers pour JDMO (Maîtrise d'œuvre)
INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Extension maison - Somain',
    'en_cours',
    w.id,
    p.id,
    ARRAY['extension', 'permis', 'suivi']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDMO'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Rénovation énergétique - Immeuble Lille',
    'en_cours',
    w.id,
    p.id,
    ARRAY['rénovation', 'énergétique', 'immeuble']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDMO'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Permis de construire - Villa moderne',
    'nouveau',
    w.id,
    p.id,
    ARRAY['permis', 'villa', 'mairie']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDMO'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Suivi chantier - Complexe bureaux',
    'en_cours',
    w.id,
    p.id,
    ARRAY['suivi', 'coordination', 'bureaux']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDMO'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Coordination métiers - Centre commercial',
    'nouveau',
    w.id,
    p.id,
    ARRAY['coordination', 'centre commercial']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'JDMO'
LIMIT 1;

-- Insertion des nouveaux dossiers pour DBCS (Travaux)
INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Réparation fissures - Façade immeuble',
    'en_cours',
    w.id,
    p.id,
    ARRAY['réparation', 'fissures', 'façade']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'DBCS'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Maçonnerie - Reprise fondations',
    'en_cours',
    w.id,
    p.id,
    ARRAY['maçonnerie', 'fondations', 'urgent']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'DBCS'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Réfection après sinistre - Pavillon Somain',
    'nouveau',
    w.id,
    p.id,
    ARRAY['réfection', 'sinistre', 'pavillon']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'DBCS'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Travaux plâtrerie - Appartements neufs',
    'en_cours',
    w.id,
    p.id,
    ARRAY['plâtrerie', 'appartements']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'DBCS'
LIMIT 1;

INSERT INTO public.dossiers (title, status, world_id, owner_id, tags)
SELECT 
    'Rénovation énergétique - Isolation combles',
    'nouveau',
    w.id,
    p.id,
    ARRAY['rénovation', 'isolation', 'énergétique']
FROM public.worlds w
CROSS JOIN public.profiles p
WHERE w.code = 'DBCS'
LIMIT 1;

-- Mise à jour des tâches existantes - Utilisation de sous-requêtes pour éviter LIMIT dans UPDATE
UPDATE public.tasks
SET title = 'Rédiger rapport d''expertise - Sinistre incendie Somain',
    description = 'Établir le rapport technique complet du sinistre avec photos et évaluation des dommages',
    priority = 'high'
WHERE id IN (
    SELECT id FROM public.tasks 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'JDE')
    LIMIT 1
);

UPDATE public.tasks
SET title = 'Plans architecturaux - Extension maison',
    description = 'Finaliser les plans d''architecture pour l''extension de 30m² avec vue 3D',
    priority = 'medium'
WHERE id IN (
    SELECT id FROM public.tasks 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'JDMO')
    LIMIT 1
);

UPDATE public.tasks
SET title = 'Chantier maçonnerie - Reprise fondations',
    description = 'Intervention urgente pour reprise de fondations suite à expertise technique',
    priority = 'high'
WHERE id IN (
    SELECT id FROM public.tasks 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'DBCS')
    LIMIT 1
);

-- Mise à jour des rendez-vous existants
UPDATE public.appointments
SET title = 'Visite expertise - Sinistre incendie',
    description = 'Rendez-vous avec l''assuré pour évaluation complète des dommages suite à l''incendie'
WHERE id IN (
    SELECT id FROM public.appointments 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'JDE')
    LIMIT 1
);

UPDATE public.appointments
SET title = 'Présentation projet - Maître d''ouvrage',
    description = 'Présentation des plans et du planning du projet d''extension'
WHERE id IN (
    SELECT id FROM public.appointments 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'JDMO')
    LIMIT 1
);

UPDATE public.appointments
SET title = 'Visite chantier - État des lieux',
    description = 'Inspection du chantier et validation de l''avancement des travaux de maçonnerie'
WHERE id IN (
    SELECT id FROM public.appointments 
    WHERE world_id IN (SELECT id FROM public.worlds WHERE code = 'DBCS')
    LIMIT 1
);