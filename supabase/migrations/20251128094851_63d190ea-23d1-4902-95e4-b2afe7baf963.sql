-- Permettre aux utilisateurs de modifier leurs propres commentaires
CREATE POLICY "Users can update their own comments"
ON dossier_comments FOR UPDATE
USING (user_id = auth.uid());

-- Permettre aux utilisateurs de supprimer leurs propres commentaires
CREATE POLICY "Users can delete their own comments"
ON dossier_comments FOR DELETE
USING (user_id = auth.uid());

-- Permettre aux utilisateurs de supprimer les tâches qu'ils ont créées ou les superadmins
CREATE POLICY "Users can delete tasks in their worlds"
ON tasks FOR DELETE
USING (
  has_world_access(auth.uid(), world_id) 
  AND (auth.uid() = created_by OR has_role(auth.uid(), 'superadmin'::app_role))
);

-- Permettre aux utilisateurs de modifier leurs propres pièces jointes (metadata)
CREATE POLICY "Users can update their own attachments"
ON dossier_attachments FOR UPDATE
USING (uploaded_by = auth.uid());