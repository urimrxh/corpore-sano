-- Optional per-banner title/subtitle text colours (hex). Empty string = use default CSS.
alter table public.hero_banners
  add column if not exists title_color text not null default '';

alter table public.hero_banners
  add column if not exists subtitle_color text not null default '';
