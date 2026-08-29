# Basplaggs-bilder (Snabbstart)

Basplaggs-biblioteket i `utils/basics.ts` visas i Snabbstart-väljaren
(`app/quick-start.tsx`). Varje basplagg behöver en **AI-genererad flatlay-bild**
som vi äger. Tills en bild finns visar väljaren en färgad platshållare, och när
bilden laddas upp till rätt sökväg dyker den upp automatiskt – även på redan
tillagda plagg (ingen kodändring behövs).

## Lagring
- **Bucket:** `garments` (samma publika bucket som plaggbilder).
- **Sökväg:** `basics/{kön}/{id}/{färg-slug}.png` (kön = `women`/`men`).
- **Publik läsning** måste vara på (som för plaggbilder).
- **Färg-slug:** Svart→svart, Vit→vit, Grå→gra, Beige→beige, Brun→brun, Blå→bla.

## Generera bilderna – prompt-mall
Använd samma stil för alla så biblioteket ser enhetligt ut (matchar Skruds
urklippta plagg på transparent/ljus botten):

> *A clean studio product flatlay of a single {FÄRG} {PLAGG} (women's/men's),
> laid flat and centered, front view, no person, no hanger, no props, soft even
> lighting, subtle natural fabric folds, isolated on a plain white background,
> photorealistic, e-commerce catalogue style, square.*

Regler:
- Ett plagg per bild, centrerat, hela plagget synligt.
- Vit/neutral bakgrund (helst transparent PNG – annars ren vit).
- Ingen modell, galge, text eller logga.
- Fyrkantig (t.ex. 1000×1000), spara som **.png**.
- Färgen ska tydligt matcha färgnamnet.

## Filer att skapa (95 st)

### Kvinna (women)

| Plagg | Färg | Filsökväg (garments-bucketen) |
|---|---|---|
| T-shirt | Vit | `basics/women/w-tshirt/vit.png` |
| T-shirt | Svart | `basics/women/w-tshirt/svart.png` |
| T-shirt | Grå | `basics/women/w-tshirt/gra.png` |
| Linne | Vit | `basics/women/w-linne/vit.png` |
| Linne | Svart | `basics/women/w-linne/svart.png` |
| Blus | Vit | `basics/women/w-blus/vit.png` |
| Blus | Svart | `basics/women/w-blus/svart.png` |
| Skjorta | Vit | `basics/women/w-skjorta/vit.png` |
| Skjorta | Blå | `basics/women/w-skjorta/bla.png` |
| Stickad tröja | Beige | `basics/women/w-stickad/beige.png` |
| Stickad tröja | Grå | `basics/women/w-stickad/gra.png` |
| Stickad tröja | Svart | `basics/women/w-stickad/svart.png` |
| Sweatshirt | Grå | `basics/women/w-sweatshirt/gra.png` |
| Sweatshirt | Svart | `basics/women/w-sweatshirt/svart.png` |
| Kofta | Beige | `basics/women/w-kofta/beige.png` |
| Kofta | Svart | `basics/women/w-kofta/svart.png` |
| Jeans | Blå | `basics/women/w-jeans/bla.png` |
| Jeans | Svart | `basics/women/w-jeans/svart.png` |
| Jeans | Grå | `basics/women/w-jeans/gra.png` |
| Jeans | Mörkblå | `basics/women/w-jeans/morkbla.png` |
| Kostymbyxor | Svart | `basics/women/w-kostymbyxor/svart.png` |
| Kostymbyxor | Beige | `basics/women/w-kostymbyxor/beige.png` |
| Chinos | Beige | `basics/women/w-chinos/beige.png` |
| Chinos | Blå | `basics/women/w-chinos/bla.png` |
| Chinos | Mörkblå | `basics/women/w-chinos/morkbla.png` |
| Leggings | Svart | `basics/women/w-leggings/svart.png` |
| Midikjol | Svart | `basics/women/w-midikjol/svart.png` |
| Midikjol | Beige | `basics/women/w-midikjol/beige.png` |
| Vardagsklänning | Svart | `basics/women/w-vardagsklanning/svart.png` |
| Vardagsklänning | Blå | `basics/women/w-vardagsklanning/bla.png` |
| Festklänning | Svart | `basics/women/w-festklanning/svart.png` |
| Blazer | Svart | `basics/women/w-blazer/svart.png` |
| Blazer | Beige | `basics/women/w-blazer/beige.png` |
| Trenchcoat | Beige | `basics/women/w-trenchcoat/beige.png` |
| Kappa | Svart | `basics/women/w-kappa/svart.png` |
| Kappa | Beige | `basics/women/w-kappa/beige.png` |
| Vinterjacka | Svart | `basics/women/w-vinterjacka/svart.png` |
| Läderjacka | Svart | `basics/women/w-laderjacka/svart.png` |
| Sneakers | Vit | `basics/women/w-sneakers/vit.png` |
| Sneakers | Svart | `basics/women/w-sneakers/svart.png` |
| Boots | Svart | `basics/women/w-boots/svart.png` |
| Boots | Brun | `basics/women/w-boots/brun.png` |
| Pumps | Svart | `basics/women/w-pumps/svart.png` |
| Ballerinaskor | Svart | `basics/women/w-ballerina/svart.png` |
| Ballerinaskor | Beige | `basics/women/w-ballerina/beige.png` |
| Handväska | Svart | `basics/women/w-handvaska/svart.png` |
| Handväska | Brun | `basics/women/w-handvaska/brun.png` |
| Halsduk | Grå | `basics/women/w-halsduk/gra.png` |
| Halsduk | Beige | `basics/women/w-halsduk/beige.png` |

### Man (men)

| Plagg | Färg | Filsökväg (garments-bucketen) |
|---|---|---|
| T-shirt | Vit | `basics/men/m-tshirt/vit.png` |
| T-shirt | Svart | `basics/men/m-tshirt/svart.png` |
| T-shirt | Grå | `basics/men/m-tshirt/gra.png` |
| Piké | Vit | `basics/men/m-pike/vit.png` |
| Piké | Blå | `basics/men/m-pike/bla.png` |
| Skjorta | Vit | `basics/men/m-skjorta/vit.png` |
| Skjorta | Blå | `basics/men/m-skjorta/bla.png` |
| Sweatshirt | Grå | `basics/men/m-sweatshirt/gra.png` |
| Sweatshirt | Svart | `basics/men/m-sweatshirt/svart.png` |
| Hoodie | Grå | `basics/men/m-hoodie/gra.png` |
| Hoodie | Svart | `basics/men/m-hoodie/svart.png` |
| Stickad tröja | Beige | `basics/men/m-stickad/beige.png` |
| Stickad tröja | Blå | `basics/men/m-stickad/bla.png` |
| Jeans | Blå | `basics/men/m-jeans/bla.png` |
| Jeans | Svart | `basics/men/m-jeans/svart.png` |
| Jeans | Mörkblå | `basics/men/m-jeans/morkbla.png` |
| Chinos | Beige | `basics/men/m-chinos/beige.png` |
| Chinos | Blå | `basics/men/m-chinos/bla.png` |
| Chinos | Mörkblå | `basics/men/m-chinos/morkbla.png` |
| Kostymbyxor | Svart | `basics/men/m-kostymbyxor/svart.png` |
| Kostymbyxor | Grå | `basics/men/m-kostymbyxor/gra.png` |
| Mjukisbyxor | Grå | `basics/men/m-mjukisbyxor/gra.png` |
| Mjukisbyxor | Svart | `basics/men/m-mjukisbyxor/svart.png` |
| Chinosshorts | Beige | `basics/men/m-shorts/beige.png` |
| Chinosshorts | Blå | `basics/men/m-shorts/bla.png` |
| Kavaj | Svart | `basics/men/m-kavaj/svart.png` |
| Kavaj | Blå | `basics/men/m-kavaj/bla.png` |
| Kostymjacka | Grå | `basics/men/m-kostymjacka/gra.png` |
| Kostymjacka | Svart | `basics/men/m-kostymjacka/svart.png` |
| Trenchcoat | Beige | `basics/men/m-trenchcoat/beige.png` |
| Vinterjacka | Svart | `basics/men/m-vinterjacka/svart.png` |
| Pufferjacka | Svart | `basics/men/m-puffer/svart.png` |
| Läderjacka | Svart | `basics/men/m-laderjacka/svart.png` |
| Läderjacka | Brun | `basics/men/m-laderjacka/brun.png` |
| Sneakers | Vit | `basics/men/m-sneakers/vit.png` |
| Sneakers | Svart | `basics/men/m-sneakers/svart.png` |
| Boots | Brun | `basics/men/m-boots/brun.png` |
| Boots | Svart | `basics/men/m-boots/svart.png` |
| Loafers | Brun | `basics/men/m-loafers/brun.png` |
| Loafers | Svart | `basics/men/m-loafers/svart.png` |
| Ryggsäck | Svart | `basics/men/m-ryggsack/svart.png` |
| Bälte | Brun | `basics/men/m-balte/brun.png` |
| Bälte | Svart | `basics/men/m-balte/svart.png` |
| Keps | Svart | `basics/men/m-keps/svart.png` |
| Mössa | Grå | `basics/men/m-mossa/gra.png` |
| Mössa | Svart | `basics/men/m-mossa/svart.png` |

## Automatiskt via skript (rekommenderat)
`scripts/generate-basics.ts` genererar och laddar upp allt åt dig: Flux
(Replicate) → samma rembg som appen (`cjwbw/rembg`) → uppladdning till
`garments`-bucketen på rätt sökväg. Läser katalogen ur `utils/basics.ts`.

Kör lokalt (inte i appen/CI – de når inte tjänsterna):

```bash
REPLICATE_API_TOKEN=... \
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/generate-basics.ts
```

Flaggor: `--only=women` / `--only=w-tshirt` (filtrera), `--force` (skriv över),
`--dry` (visa bara prompterna), `--model=<path>` (byt Flux-modell),
`--concurrency=<n>`, `--rpm=<n>` (skapade prediktioner/minut; höj när du har Replicate-kredit). Bilder som redan finns hoppas över (om inte `--force`).

Service role-nyckeln är en server-nyckel – kör bara skriptet lokalt och
checka aldrig in den.
