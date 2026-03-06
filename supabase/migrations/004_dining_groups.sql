-- ─── Dining Groups ────────────────────────────────────────────────────────────

create table public.dining_groups (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.dining_group_members (
  id         uuid primary key default uuid_generate_v4(),
  group_id   uuid not null references public.dining_groups(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  status     text default 'invited' check (status in ('invited', 'joined', 'declined')),
  invited_at timestamptz default now(),
  joined_at  timestamptz,
  unique (group_id, user_id)
);

alter table public.dining_groups enable row level security;
alter table public.dining_group_members enable row level security;

-- dining_groups: creator can manage; any member can read
create policy "Group members can read dining_groups" on public.dining_groups
  for select using (
    auth.uid() = created_by or
    exists (
      select 1 from public.dining_group_members
      where group_id = id and user_id = auth.uid()
    )
  );
create policy "Creator manages dining_groups" on public.dining_groups
  for all using (auth.uid() = created_by);

-- dining_group_members: read if member or creator; insert if creator; update own row; delete if own row or creator
create policy "Members can read dining_group_members" on public.dining_group_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.dining_groups
      where id = group_id and created_by = auth.uid()
    )
  );
create policy "Creator can add dining_group_members" on public.dining_group_members
  for insert with check (
    exists (
      select 1 from public.dining_groups
      where id = group_id and created_by = auth.uid()
    )
  );
create policy "Member manages own dining_group_members row" on public.dining_group_members
  for update using (user_id = auth.uid());
create policy "Creator or member can delete dining_group_members row" on public.dining_group_members
  for delete using (
    user_id = auth.uid() or
    exists (
      select 1 from public.dining_groups
      where id = group_id and created_by = auth.uid()
    )
  );
