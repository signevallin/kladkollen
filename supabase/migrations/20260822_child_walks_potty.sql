-- Två uttryckliga egenskaper per barn som tidigare gissades eller saknades helt.
--
-- walks: går barnet själv? Avgör om outfiten ska innehålla skor. Gissades förut
-- på ålder (<18 mån = bebis), men barn börjar gå mellan ca 9 och 18 månader – en
-- tidig gångare fick därför inga skor i upp till ett halvår. NULL = inte angivet,
-- då används åldersgissningen precis som förut. Nullable med flit: en default
-- hade tvingat ett svar på alla befintliga barn.
alter table people add column if not exists walks boolean;

-- potty_training: barnet ska kunna dra ner plagget själv. Utesluter hängselbyxor,
-- knappgylf, bodys och onesies. false är ofarligt som default – ingen extra regel.
alter table people add column if not exists potty_training boolean not null default false;

comment on column people.walks is 'NULL = okänt (åldersgissning), true/false = uttryckligt val. Styr om skor krävs.';
comment on column people.potty_training is 'Barnet potttränar – välj plagg det kan dra ner själv.';
