-- Automatisk tvätt: plagg hamnar i tvätten av sig själva efter ett visst antal
-- användningar. Avstängt som standard – det ändrar hur garderoben beter sig.
alter table profiles add column if not exists auto_laundry boolean not null default false;
alter table profiles add column if not exists wash_after_wears int not null default 2;

-- Räknare sedan senaste tvätt. times_worn är kumulativ och får inte nollställas.
alter table garments add column if not exists wears_since_wash int not null default 0;

-- Nollställ räknaren när plagget kommer UT ur tvätten. Som trigger och inte i
-- anropande kod: in_laundry sätts på flera ställen, och en invariant som den här
-- ska inte bero på att varje anropare minns den.
create or replace function reset_wears_on_wash()
returns trigger language plpgsql as $$
begin
  if old.in_laundry is true and new.in_laundry is false then
    new.wears_since_wash := 0;
  end if;
  return new;
end $$;

drop trigger if exists trg_reset_wears_on_wash on garments;
create trigger trg_reset_wears_on_wash
  before update of in_laundry on garments
  for each row execute function reset_wears_on_wash();

-- Undantag: plagg utan tvättikon (skor, väskor, smycken, accessoarer), plus
-- Ytterkläder och Kavajer som tvättas sällan, plus sjal och halsduk. De två
-- sista BEHÅLLER sin tvättikon och kan tvättas för hand – de ska bara inte åka
-- in av sig själva. isWashable är alltså inte samma mängd som den här: manuell
-- och automatisk tvätt är två olika frågor.
create or replace function adjust_garment_wear(p_ids uuid[], p_delta integer, p_date date default null::date)
returns void
language sql set search_path to 'public' as $function$
  with settings as (
    select coalesce(auto_laundry, false) as auto_on,
           greatest(1, coalesce(wash_after_wears, 2)) as limit_wears
    from profiles where id = auth.uid()
  )
  update garments g
  set times_worn = greatest(0, coalesce(g.times_worn, 0) + p_delta),
      wears_since_wash = greatest(0, coalesce(g.wears_since_wash, 0) + p_delta),
      last_worn = case
        when p_delta > 0 and p_date is not null and (g.last_worn is null or p_date > g.last_worn)
          then p_date
        else g.last_worn
      end,
      in_laundry = case
        when p_delta > 0
         and (select auto_on from settings)
         and greatest(0, coalesce(g.wears_since_wash, 0) + p_delta) >= (select limit_wears from settings)
          and g.category not in ('Skor', 'Smycken', 'Väskor', 'Accessoarer', 'Ytterkläder', 'Kavajer')
         and coalesce(g.subcategory, '') not in ('Halsduk', 'Sjal')
          then true
        else g.in_laundry
      end
  where g.user_id = auth.uid()
    and g.id = any(p_ids)
$function$;
