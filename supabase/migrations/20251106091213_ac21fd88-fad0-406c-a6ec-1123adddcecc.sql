-- Insert superadmin role for user Téo
INSERT INTO public.user_roles (user_id, role_id)
VALUES ('b858bc0e-4c2f-4389-b690-3a5f2f160455', 'd707c0cd-409a-4cce-93af-cfc0027d2c7c')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Grant access to all three worlds with correct IDs
INSERT INTO public.user_world_access (user_id, world_id)
VALUES 
  ('b858bc0e-4c2f-4389-b690-3a5f2f160455', 'dadfb2f2-f8a7-482f-9e79-706703836a88'), -- JDE
  ('b858bc0e-4c2f-4389-b690-3a5f2f160455', 'b3c336fb-8031-4750-9e04-3eca3656ba49'), -- JDMO
  ('b858bc0e-4c2f-4389-b690-3a5f2f160455', '161506e6-8c9b-47fe-95fa-c7c7d4796f6b')  -- DBCS
ON CONFLICT (user_id, world_id) DO NOTHING;