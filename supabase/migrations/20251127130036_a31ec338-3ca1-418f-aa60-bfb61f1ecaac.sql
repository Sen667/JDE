-- Add DELETE policy for dossiers to allow users to delete their own dossiers
CREATE POLICY "Users can delete their own dossiers"
ON public.dossiers
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id AND has_world_access(auth.uid(), world_id));