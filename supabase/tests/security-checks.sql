-- Manuelle, transaktionale Sicherheitsprüfung im Supabase SQL Editor.
-- Alle erzeugten Testdaten werden am Ende zurückgerollt.
begin;

do $$
begin
  if has_table_privilege('anon', 'public.reader_feedback', 'select')
     or has_table_privilege('anon', 'public.reader_feedback', 'insert')
     or has_table_privilege('anon', 'public.reader_feedback', 'update')
     or has_table_privilege('anon', 'public.reader_feedback', 'delete') then
    raise exception 'anon has an unexpected reader_feedback privilege';
  end if;
  if has_table_privilege('authenticated', 'public.reader_feedback', 'insert') then
    raise exception 'authenticated unexpectedly has direct feedback INSERT';
  end if;
  if has_table_privilege('anon', 'public.feedback_rate_limits', 'select')
     or has_table_privilege('anon', 'public.feedback_rate_limits', 'insert') then
    raise exception 'anon has access to feedback rate-limit data';
  end if;
  if not exists (
    select 1 from cron.job where jobname = 'purge-feedback-rate-limits'
  ) then
    raise exception 'automatic rate-limit cleanup job is missing';
  end if;
end;
$$;

-- Ein legitimer serverseitiger Eintrag funktioniert.
select public.submit_reader_feedback(
  repeat('a', 64),
  'Allgemeiner Eindruck',
  'Automatischer Sicherheitstest mit ausreichend langem Text.',
  '999.1'
);

-- Ein unmittelbar folgender Eintrag desselben Clients muss scheitern.
do $$
begin
  perform public.submit_reader_feedback(
    repeat('a', 64),
    'Allgemeiner Eindruck',
    'Dieser zweite Testeintrag muss durch das Zeitlimit abgewiesen werden.',
    '999.1'
  );
  raise exception 'rate limit did not reject the second submission';
exception
  when raise_exception then
    if sqlerrm = 'rate limit did not reject the second submission' then
      raise;
    end if;
end;
$$;

-- Die Admin-Policies müssen weiterhin Allowlist und AAL2 verwenden.
do $$
declare
  policy_text text;
begin
  select coalesce(string_agg(coalesce(qual, '') || coalesce(with_check, ''), ' '), '')
  into policy_text
  from pg_policies
  where (schemaname in ('public', 'storage') and policyname like 'Story admins may%')
     or (schemaname = 'public' and policyname = 'Admins may update current release');

  if position('is_story_admin' in policy_text) = 0 then
    raise exception 'admin policies do not call is_story_admin';
  end if;
  if position('aal2' in pg_get_functiondef('public.is_story_admin()'::regprocedure)) = 0 then
    raise exception 'is_story_admin does not require AAL2';
  end if;
end;
$$;

rollback;

-- Erwartetes Ergebnis: "Success. No rows returned" und kein Fehler.
