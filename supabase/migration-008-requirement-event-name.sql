-- Migration 008 — requirements get an event name
--
-- Until now a requirement was only a domain ("ai") plus a free-text description,
-- so the feed titled every post by its domain. The name is what people actually
-- recognise ("Smart India Hackathon"), and it is what goes in the invitation
-- email subject. Older rows have no name and fall back to showing the domain.
alter table requirements add column if not exists event_name text;
