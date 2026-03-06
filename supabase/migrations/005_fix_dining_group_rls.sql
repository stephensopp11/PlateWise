-- Fix infinite recursion in dining_groups / dining_group_members RLS policies.
-- The original policies formed a cycle:
--   dining_groups SELECT → queries dining_group_members
--   dining_group_members SELECT → queries dining_groups
-- Solution: security definer helper functions bypass RLS when they execute,
-- breaking the recursive chain.

-- Drop the recursive policies
drop policy if exists "Group members can read dining_groups"            on public.dining_groups;
drop policy if exists "Members can read dining_group_members"           on public.dining_group_members;
drop policy if exists "Creator can add dining_group_members"            on public.dining_group_members;
drop policy if exists "Creator or member can delete dining_group_members row" on public.dining_group_members;

-- ── Helper functions (security definer = run as table owner, bypassing RLS) ──

create or replace function public.current_user_is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.dining_group_members
    where group_id = gid and user_id = auth.uid()
  )
$$;

create or replace function public.current_user_is_group_creator(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.dining_groups
    where id = gid and created_by = auth.uid()
  )
$$;

-- ── Recreated policies (no cross-table RLS chain) ─────────────────────────────

create policy "Group members can read dining_groups" on public.dining_groups
  for select using (
    auth.uid() = created_by or
    public.current_user_is_group_member(id)
  );

create policy "Members can read dining_group_members" on public.dining_group_members
  for select using (
    user_id = auth.uid() or
    public.current_user_is_group_creator(group_id)
  );

create policy "Creator can add dining_group_members" on public.dining_group_members
  for insert with check (public.current_user_is_group_creator(group_id));

create policy "Creator or member can delete dining_group_members row" on public.dining_group_members
  for delete using (
    user_id = auth.uid() or
    public.current_user_is_group_creator(group_id)
  );
