-- Låt föräldern bestämma om barnet får bära ett steg större.
--
-- childSizeFits godkände bara nuvarande storlek och ett steg NER. Ett plagg som
-- köpts att växa i var därmed osynligt för outfitgenereringen tills barnet nått
-- storleken – för ett barn i 62 föll allt i 68 bort, vilket kunde vara en femtedel
-- av garderoben. Samtidigt är den strikta regeln rätt för många: fönstret
-- skärptes en gång just för att familjeskärmen märkte samma plagg som
-- "Om ~3 mån", och appen sa emot sig själv.
--
-- Det är alltså ingen bugg utan en smaksak, och den varierar mellan barn i samma
-- familj. Därför en inställning per barn i stället för en global regel.
--
-- Påverkar INTE storlekspåminnelserna: de handlar om när ett plagg börjar passa,
-- vilket är en annan fråga än vad barnet får bära idag.

alter table people add column if not exists allow_larger_size boolean not null default false;

comment on column people.allow_larger_size is
  'Får barnet bära ett steg större? Öppnar storleksfönstret uppåt i outfitgenerering, familjeoutfits och resepackning. Påverkar inte storlekspåminnelserna.';
