-- Nya profilfält för den omstrukturerade profilvyn:
-- kön, födelsedag och en fritextruta för sådant användaren vill undvika
-- (som outfit-AI:n tar hänsyn till).
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists birthday text;      -- lagras som 'ÅÅÅÅ-MM-DD'
alter table profiles add column if not exists avoid_note text;
