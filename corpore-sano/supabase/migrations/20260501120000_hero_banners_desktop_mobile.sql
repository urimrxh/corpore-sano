-- Optional per-viewport hero images. When null, image_url / image_path remain the fallback for that viewport.
alter table public.hero_banners
  add column if not exists desktop_image_url text;

alter table public.hero_banners
  add column if not exists desktop_image_path text;

alter table public.hero_banners
  add column if not exists mobile_image_url text;

alter table public.hero_banners
  add column if not exists mobile_image_path text;
