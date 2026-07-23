-- "Låna & Matcha": markera plagg som får lånas av partnern.
alter table garments add column if not exists lendable boolean default false;
