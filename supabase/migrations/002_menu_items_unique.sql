-- Allow upsert of menu_items by restaurant + dish name
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_restaurant_name_unique UNIQUE (restaurant_id, name);
