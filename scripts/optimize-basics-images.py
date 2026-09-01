#!/usr/bin/env python3
"""
Komprimerar basplaggs-bilderna i garments-bucketen (prefixet basics/).

Bilderna genererades som PNG i full upplösning och laddades upp som de var:
95 filer, 64 MB, i snitt 689 kB styck. Eftersom ALLA bilder i appen hämtas med
format:'origin' (se CLAUDE.md – server-transformen togs medvetet bort av
kostnadsskäl) laddas de originalen ner rakt av. Snabbstartsväljaren, som ska
vara det LÄTTASTE första steget, drar därmed ~17 MB på mobildata.

Åtgärden är WebP i stället för PNG. Vid visningsstorlek är skillnaden inte
synlig – verifierat mot bibliotekets största fil.

Skriver till SAMMA .png-sökvägar med Content-Type image/webp. Det är avsiktligt:
sökvägen är deterministisk i utils/basics.ts (basicImagePath) och redan
inbäddad i utgivna appbyggen samt i garments.image_url för plagg användare
redan bockat i. Att byta filändelse hade krävt ett nytt appbygge och lämnat
befintliga rader trasiga. Webbläsare och expo-image går på Content-Type,
inte på filändelsen.

KÖRS I TORRLÄGE SOM STANDARD.

  python3 scripts/optimize-basics-images.py                          # mät, ändra inget
  python3 scripts/optimize-basics-images.py --backup ../basics-orig   # bara kopia
  python3 scripts/optimize-basics-images.py --backup ../basics-orig --apply --yes

Kräver SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY i miljön, samt Pillow.
Pillow är inte ett projektberoende – kör i en venv:
  python3 -m venv /tmp/pil && /tmp/pil/bin/pip install Pillow
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... /tmp/pil/bin/python scripts/...
"""
import io, json, os, sys, urllib.request, urllib.error
from pathlib import Path

BUCKET = 'garments'
PREFIX = 'basics/'
MAX_PX = 768
QUALITY = 88

URL = os.environ.get('SUPABASE_URL') or os.environ.get('EXPO_PUBLIC_SUPABASE_URL')
KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not URL or not KEY:
    sys.exit('Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY.')

args = sys.argv[1:]
APPLY = '--apply' in args
CONFIRMED = '--yes' in args
BACKUP = args[args.index('--backup') + 1] if '--backup' in args else None


def api(method, path, body=None, headers=None, raw=False):
    req = urllib.request.Request(f'{URL}{path}', method=method)
    req.add_header('Authorization', f'Bearer {KEY}')
    req.add_header('apikey', KEY)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    data = None
    if body is not None:
        if raw:
            data = body
        else:
            data = json.dumps(body).encode()
            req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, data) as r:
        return r.read()


def lista(prefix=PREFIX):
    """
    Alla objekt under prefixet, rekursivt. Storage-API:t listar bara EN nivå och
    ger max 100 poster utan explicit limit – strukturen är basics/{kön}/{id}/{färg}.png,
    alltså tre nivåer. Mappar saknar id i svaret; det är så de skiljs från filer.
    """
    filer, mappar, offset = [], [], 0
    while True:
        svar = json.loads(api('POST', f'/storage/v1/object/list/{BUCKET}',
                              {'prefix': prefix, 'limit': 1000, 'offset': offset,
                               'sortBy': {'column': 'name', 'order': 'asc'}}))
        if not svar:
            break
        for e in svar:
            vag = prefix + e['name']
            (filer if e.get('id') else mappar).append(vag)
        if len(svar) < 1000:
            break
        offset += 1000
    for m in mappar:
        filer += lista(m + '/')
    return filer


def main():
    from PIL import Image

    print('Listar basics/ …')
    vagar = lista()
    print(f'  {len(vagar)} objekt\n')
    if not vagar:
        sys.exit('Inga objekt under basics/ – avbryter.')

    if BACKUP:
        Path(BACKUP).mkdir(parents=True, exist_ok=True)

    fore = efter = 0
    sakerhetskopierade = []
    resultat = []

    for i, vag in enumerate(vagar, 1):
        orig = api('GET', f'/storage/v1/object/{BUCKET}/{vag}')
        fore += len(orig)

        if BACKUP:
            mal = Path(BACKUP) / vag
            mal.parent.mkdir(parents=True, exist_ok=True)
            mal.write_bytes(orig)
            sakerhetskopierade.append(vag)

        im = Image.open(io.BytesIO(orig)).convert('RGBA')
        im.thumbnail((MAX_PX, MAX_PX), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format='WEBP', quality=QUALITY, method=6)
        ny_data = buf.getvalue()
        efter += len(ny_data)
        resultat.append((vag, len(orig), len(ny_data), ny_data))

        if i % 20 == 0 or i == len(vagar):
            print(f'  bearbetade {i}/{len(vagar)}')

    print(f'\nFöre:  {fore/1024/1024:6.1f} MB')
    print(f'Efter: {efter/1024/1024:6.1f} MB  ({fore/efter:.0f}x mindre)\n')

    if BACKUP:
        print(f'{len(sakerhetskopierade)} filer säkerhetskopierade till {BACKUP}\n')

    if not APPLY:
        varst = sorted(resultat, key=lambda r: -r[2])[:5]
        print('Störst efter komprimering:')
        for vag, f, e, _ in varst:
            print(f'  {vag:<44} {f//1024:>5} kB → {e//1024:>4} kB')
        print('\nTorrläge – ingenting laddades upp. Kör med --apply --yes.')
        return

    if not CONFIRMED:
        sys.exit('--apply kräver även --yes. Originalen skrivs över.')
    if not BACKUP:
        sys.exit('--apply kräver --backup. Bilderna är AI-genererade och går inte att återskapa exakt.')
    if len(sakerhetskopierade) != len(vagar):
        sys.exit('Alla filer kunde inte säkerhetskopieras – avbryter.')

    print('Laddar upp …')
    for i, (vag, _, _, data) in enumerate(resultat, 1):
        # 30 dygn, samma horisont som de signerade URL:erna. Ett år hade varit
        # billigare i egress men låst en omgenererad bild i klientcachen lika länge.
        api('PUT', f'/storage/v1/object/{BUCKET}/{vag}', data, raw=True,
            headers={'Content-Type': 'image/webp', 'x-upsert': 'true',
                     'cache-control': 'public, max-age=2592000'})
        if i % 20 == 0 or i == len(resultat):
            print(f'  laddade upp {i}/{len(resultat)}')
    print('\nKlart.')


if __name__ == '__main__':
    main()
