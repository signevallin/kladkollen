-- Atomisk uppräkning/nedräkning av plaggens användningsstatistik.
-- Tidigare gjordes läs+skriv per plagg från klienten (ingen transaktion) – ett
-- avbrott halvvägs kunde korrumpera times_worn. Detta gör hela justeringen i
-- EN mängdbaserad SQL-sats. Security invoker → vanlig RLS gäller (bara egna plagg),
-- och user_id-filtret är bälte-och-hängslen.
create or replace function adjust_garment_wear(p_ids uuid[], p_delta int, p_date date default null)
returns void
language sql
set search_path = public as $$
  update garments g
  set times_worn = greatest(0, coalesce(g.times_worn, 0) + p_delta),
      last_worn = case
        when p_delta > 0 and p_date is not null and (g.last_worn is null or p_date > g.last_worn)
          then p_date
        else g.last_worn
      end
  where g.user_id = auth.uid()
    and g.id = any(p_ids)
$$;

grant execute on function adjust_garment_wear(uuid[], int, date) to authenticated;
revoke execute on function adjust_garment_wear(uuid[], int, date) from anon;
