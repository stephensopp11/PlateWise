-- Add explicit meal date so users can backdate historic meals
ALTER TABLE public.meals
  ADD COLUMN meal_date date NOT NULL DEFAULT CURRENT_DATE;
