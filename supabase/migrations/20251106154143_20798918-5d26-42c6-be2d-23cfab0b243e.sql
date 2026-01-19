-- Update JDMO theme colors: swap green and orange
UPDATE public.worlds 
SET theme_colors = '{"primary": "#ed7d31", "accent": "#538135", "neutral": "#d9d9d8"}'
WHERE code = 'JDMO';