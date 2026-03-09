-- Track monthly API call counts for cost safeguard
create table api_usage (
  month text primary key,       -- format: 'YYYY-MM'
  call_count int not null default 0
);

-- Only accessible via service role key (used by edge functions).
-- No public access.
alter table api_usage enable row level security;
