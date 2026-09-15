# Backup av Skrud

Supabases gratisplan har inga automatiska backuper. Det här ersätter dem.

| Vad | Hur | Behålls |
|---|---|---|
| Databas (`auth`, `public`, `storage`, `supabase_migrations`) | `pg_dump`, custom format | 14 dygn, aldrig färre än 3 |
| Bilder (`garments`-bucketen) | inkrementell spegel | raderas aldrig lokalt |

Allt hamnar i `~/Backups/skrud` – **inte** i `~/Documents`, som synkas till iCloud.
FileVault krypterar disken.

## Installera (en gång)

1. Klientverktyg: `brew install libpq` (pg_dump måste vara ≥ serverns version, 17).
2. Lägg hemligheterna i Nyckelringen. Kopiera värdet till urklipp före respektive
   rad – skalhistoriken sparar då bara `$(pbpaste)`, inte hemligheten:
   ```
   security add-generic-password -U -a postgres     -s skrud-db-backup    -w "$(pbpaste)"
   security add-generic-password -U -a service-role -s skrud-service-role -w "$(pbpaste)"
   pbcopy < /dev/null
   ```
   **Använd inte den interaktiva frågan** (`-w` utan värde). Den klipper tyst
   efter 128 tecken; service role-nyckeln är 219 och blev oanvändbar.
   Databaslösenordet: Supabase → Project Settings → Database.
3. Aktivera schemat:
   ```
   cp scripts/backup/se.skrud.backup.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/se.skrud.backup.plist
   ```

## Gotchas

- **Databasen nås bara över IPv6.** Direktadressen `db.<ref>.supabase.co` saknar
  A-post. Använd session-poolern `aws-1-eu-west-1.pooler.supabase.com:5432`
  (inte `aws-0` – den svarar "tenant not found" för det här projektet – och inte
  port 6543, transaction mode fungerar inte med pg_dump).
- **pg_dump tar inte med bilderna**, bara `storage.objects`-raderna. Därför speglingen.
- **launchd kör inte om datorn är avstängd** vid 03:30 (bara om den sover). Titta i
  `~/Backups/skrud/logs/` – en saknad dagslogg betyder en saknad backup.

## Återställa

```
pg_restore --list ~/Backups/skrud/db/skrud-<datum>.dump     # innehåll
scripts/backup/restore-test.sh ~/Backups/skrud/db/skrud-<datum>.dump
```

`restore-test.sh` återställer till ett tillfälligt lokalt Postgres 17-kluster
(`brew install postgresql@17`), skriver radantal per tabell och raderar klustret
efteråt. Jämför antalen mot produktionen. Två fällor som redan bitit: `initdb`
faller tyst med svensk locale (skriptet sätter `LC_ALL`), och unix-socketens
sökväg får vara högst 103 byte – lägg aldrig klustret i en djup katalog.

En backup som aldrig återställts är inte bevisad. Prova mot en tom databas
då och då.
