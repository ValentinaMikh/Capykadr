-- =====================================================================
--  Конструктор капибар КуулКлевер — настройка базы Supabase
--  Запускать один раз: Supabase → SQL Editor → New query → вставить → Run.
--  Перед запуском заполните 2 строки в самом конце файла (пароль и почта).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- закрытая схема: пароль команды ----------
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists private.settings (
  id int primary key default 1 check (id = 1),
  team_password_hash text not null
);

-- ---------- админы ----------
create table if not exists public.admins (
  email text primary key
);
alter table public.admins enable row level security;
-- политик нет: таблицу читает только функция is_admin()

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.email = lower(auth.jwt() ->> 'email'));
$$;
grant execute on function public.is_admin() to authenticated;

-- ---------- профили ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  role text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- проверка пароля команды при регистрации ----------
create or replace function private.before_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  pw text := new.raw_user_meta_data ->> 'team_password';
  h  text;
begin
  select team_password_hash into h from private.settings where id = 1;
  if pw is null or h is null or extensions.crypt(pw, h) <> h then
    raise exception 'TEAM_PASSWORD_INVALID';
  end if;
  new.raw_user_meta_data := new.raw_user_meta_data - 'team_password';  -- пароль не сохраняется
  return new;
end $$;

create or replace function private.after_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, lower(new.email),
          nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
          nullif(trim(new.raw_user_meta_data ->> 'role'), ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists capy_before_signup on auth.users;
create trigger capy_before_signup before insert on auth.users
  for each row execute function private.before_signup();
drop trigger if exists capy_after_signup on auth.users;
create trigger capy_after_signup after insert on auth.users
  for each row execute function private.after_signup();

-- смена пароля команды (только админ, из интерфейса)
create or replace function public.set_team_password(new_password text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'NOT_ADMIN'; end if;
  if length(coalesce(new_password, '')) < 8 then raise exception 'PASSWORD_TOO_SHORT'; end if;
  update private.settings set team_password_hash = extensions.crypt(new_password, extensions.gen_salt('bf')) where id = 1;
end $$;
revoke all on function public.set_team_password(text) from public, anon;
grant execute on function public.set_team_password(text) to authenticated;

-- ---------- «Мои промты» ----------
create table if not exists public.prompt_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  state jsonb not null,
  prompt text not null,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);
alter table public.prompt_history enable row level security;
drop policy if exists "history own" on public.prompt_history;
create policy "history own" on public.prompt_history for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create index if not exists prompt_history_user on public.prompt_history (user_id, created_at desc);

-- ---------- галерея ----------
create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  history_id uuid references public.prompt_history (id) on delete set null,
  title text,
  note text,
  image_path text not null,           -- путь в хранилище works
  state jsonb not null,
  prompt text not null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.publications enable row level security;
drop policy if exists "pubs read" on public.publications;
create policy "pubs read" on public.publications for select to authenticated
  using (not hidden or user_id = auth.uid() or public.is_admin());
drop policy if exists "pubs insert" on public.publications;
create policy "pubs insert" on public.publications for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "pubs update" on public.publications;
create policy "pubs update" on public.publications for update to authenticated
  using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "pubs delete" on public.publications;
create policy "pubs delete" on public.publications for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
create index if not exists publications_created on public.publications (created_at desc);

create table if not exists public.publication_likes (
  pub_id uuid not null references public.publications (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (pub_id, user_id)
);
alter table public.publication_likes enable row level security;
drop policy if exists "likes read" on public.publication_likes;
create policy "likes read" on public.publication_likes for select to authenticated using (true);
drop policy if exists "likes own" on public.publication_likes;
create policy "likes own" on public.publication_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "likes delete own" on public.publication_likes;
create policy "likes delete own" on public.publication_likes for delete to authenticated using (user_id = auth.uid());

-- ---------- аналитика ----------
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,                 -- copy_prompt, copy_reference, publish …
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "events insert own" on public.events;
create policy "events insert own" on public.events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "events admin read" on public.events;
create policy "events admin read" on public.events for select to authenticated using (public.is_admin());
create index if not exists events_created on public.events (created_at desc);

-- ---------- обратная связь ----------
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  text text not null,
  image_path text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "fb insert own" on public.feedback;
create policy "fb insert own" on public.feedback for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "fb read" on public.feedback;
create policy "fb read" on public.feedback for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "fb admin update" on public.feedback;
create policy "fb admin update" on public.feedback for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- эталоны маскота (картинки грузит админ) ----------
create table if not exists public.ref_images (
  id text primary key,                -- id одежды из справочника (dad-base, mom-winter …) или 'lineup'
  image_path text not null,           -- путь в хранилище refs
  updated_at timestamptz not null default now()
);
alter table public.ref_images enable row level security;
drop policy if exists "refs read" on public.ref_images;
create policy "refs read" on public.ref_images for select to authenticated using (true);
drop policy if exists "refs admin write" on public.ref_images;
create policy "refs admin write" on public.ref_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- хранилище файлов (закрытое, только для вошедших) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('works',    'works',    false, 15728640, array['image/png', 'image/jpeg', 'image/webp']),
  ('refs',     'refs',     false, 15728640, array['image/png', 'image/jpeg', 'image/webp']),
  ('feedback', 'feedback', false,  5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "works read" on storage.objects;
create policy "works read" on storage.objects for select to authenticated
  using (bucket_id = 'works');
drop policy if exists "works upload own" on storage.objects;
create policy "works upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'works' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "works delete own" on storage.objects;
create policy "works delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'works' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "refs read" on storage.objects;
create policy "refs read" on storage.objects for select to authenticated
  using (bucket_id = 'refs');
drop policy if exists "refs admin write" on storage.objects;
create policy "refs admin write" on storage.objects for all to authenticated
  using (bucket_id = 'refs' and public.is_admin()) with check (bucket_id = 'refs' and public.is_admin());

drop policy if exists "fb files upload own" on storage.objects;
create policy "fb files upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "fb files read" on storage.objects;
create policy "fb files read" on storage.objects for select to authenticated
  using (bucket_id = 'feedback' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- =====================================================================
--  ЗАПОЛНИТЕ ДВЕ СТРОКИ НИЖЕ, затем нажмите Run.
--  Пароль команды — не короче 8 символов. Почта — та, с которой вы
--  зарегистрируетесь в сервисе (станете админом).
-- =====================================================================
insert into private.settings (id, team_password_hash)
values (1, extensions.crypt('ВПИШИТЕ_ПАРОЛЬ_КОМАНДЫ', extensions.gen_salt('bf')))
on conflict (id) do update set team_password_hash = excluded.team_password_hash;

insert into public.admins (email) values (lower('ВПИШИТЕ_ВАШУ_ПОЧТУ@example.com'))
on conflict do nothing;
