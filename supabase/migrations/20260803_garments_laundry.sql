-- "I tvätten": plagg som just nu ligger i tvätten. Bockas i/ur från garderoben
-- och exkluderas från genererade outfits tills de är rena igen.
alter table garments add column if not exists in_laundry boolean not null default false;
