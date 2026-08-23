-- En body är barnets ÖVERDEL, inte underkläder.
--
-- "Body" finns som underkategori under BÅDE Toppar och Underkläder i
-- utils/constants.ts, så AI:ns klassificering blev inkonsekvent: fem bodys
-- hamnade under Toppar och en under Underkläder. Skillnaden är inte kosmetisk –
-- Underkläder saknas med flit i categoryMap (buildGroupedGarmentList), så en
-- body som klassats som underkläder är helt osynlig för outfitgenereringen.
-- För en bebis, vars garderob till stor del ÄR bodys, blev det märkbart.
--
-- Nya plagg normaliseras i klienten (categoryForChildGarment i utils/outfit.ts)
-- vid alla tre skapandevägar: add-garment, import-purchases och import-email.
-- Den här migrationen rättar det som redan finns.
--
-- Gäller bara plagg kopplade till ett barn. På en vuxen kan en body mycket väl
-- vara underkläder, och den bedömningen lämnas orörd.

update garments
set category = 'Toppar'
where person_id is not null
  and category = 'Underkläder'
  and (subcategory ~* '\ybody\y|bodysuit' or name ~* '\ybody\y|bodysuit');
