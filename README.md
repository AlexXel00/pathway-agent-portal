# Pathway Agent Portal

Die eigene Web-App fuer die Pathway Real Estate Agents. Laeuft komplett unabhaengig,
mit echter Datenbank-Sicherheit (Supabase) und kostenlosem Hosting (GitHub Pages).

## Was hier drinsteckt

- Listings: Karten-Galerie aller Grundstuecke/Condos mit Fotos, Preis, Details
- Jeder Agent kann direkt in einem Listing eintragen: beworben (und wo), potenzieller
  Kaeufer vorhanden, gezeigt - nur diese drei Felder, sonst nichts
- My Activity: eigene Verkaufszahlen, Provision, Aktivitaets-Log
- Agents: Rangliste aller Agents nach Anzahl Verkaeufen
- Company Info: Werte, Services, FAQ fuer Kaeufer, Marketing-Guide (Farben, Fonts, Logo)
- Nur Admins (aktuell Alexander, Aya, Jent) koennen neue Listings anlegen und Agents
  verwalten - technisch in der Datenbank erzwungen, nicht nur versteckt in der Oberflaeche

## Schritt fuer Schritt: Auf GitHub Pages veroeffentlichen (einmalig, kostenlos)

1. Gehe auf https://github.com und logge dich ein (oder erstelle ein kostenloses Konto).
2. Klicke oben rechts auf das "+" und dann "New repository".
3. Name z.B. `pathway-agent-portal`, Sichtbarkeit "Private" oder "Public" (beides geht),
   dann "Create repository".
4. Lade den kompletten Ordner-Inhalt aus dieser Lieferung in das neue Repository hoch:
   entweder per "uploading an existing file" im Browser (ganzen Ordnerinhalt reinziehen),
   oder falls du Git installiert hast:
   ```
   cd pathway-agent-portal
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/DEIN-BENUTZERNAME/pathway-agent-portal.git
   git push -u origin main
   ```
5. Im Repository: "Settings" -> "Secrets and variables" -> "Actions" -> "New repository secret".
   Lege zwei Secrets an (Werte stehen in der Datei `.env.example` aus dieser Lieferung):
   - Name `VITE_SUPABASE_URL`, Wert die Supabase-Projekt-URL
   - Name `VITE_SUPABASE_ANON_KEY`, Wert der Supabase anon/publishable Key
6. Im Repository: "Settings" -> "Pages" -> bei "Build and deployment" -> "Source" ->
   "GitHub Actions" auswaehlen.
7. Im Repository: "Actions" Tab -> der Workflow "Deploy to GitHub Pages" sollte automatisch
   laufen (er startet bei jedem Push auf `main`). Warte bis er gruen ist (ca. 1-2 Minuten).
8. Deine Live-URL steht danach unter "Settings" -> "Pages" ganz oben, z.B.
   `https://dein-benutzername.github.io/pathway-agent-portal/`.

Ab jetzt: jede Aenderung, die du (oder ich in einer spaeteren Session) am Code machst und
nach `main` pushst, wird automatisch neu veroeffentlicht - kein manuelles Hosting-Setup mehr noetig.

## Schritt fuer Schritt: Erstes Login anlegen

1. Oeffne die Live-URL.
2. Klicke auf "Noch kein Konto? Erstelle eins mit deiner Agent-Email".
3. Trage die Email ein, mit der du in der Datenbank als Admin hinterlegt bist
   (Alexander: riedl.alexander@outlook.de), waehle ein Passwort, klicke "Konto erstellen".
4. Du bist danach automatisch eingeloggt und siehst dein Admin-Menue (+ New Listing,
   Manage Agents).

Aya und Jent muessen zuerst unter "Manage Agents" mit ihrer echten Email eingetragen
werden (durch dich oder untereinander, da alle drei Admin-Rechte haben) - danach koennen
sie sich mit genau dieser Email selbst ein Konto anlegen. Ohne vorherigen Eintrag lehnt
das System die Registrierung ab (Sicherheitsmechanismus gegen fremde Anmeldungen).

## Lokale Entwicklung (optional, nur falls du selbst am Code weiterarbeiten willst)

```
npm install
cp .env.example .env
npm run dev
```

## Technischer Hintergrund

- Frontend: React + Vite, gehostet als statische Seite auf GitHub Pages (kostenlos)
- Backend/Datenbank: Supabase (Postgres + Auth + Storage), kostenloser Plan
- Zugriffsregeln (Row Level Security) werden direkt in der Datenbank durchgesetzt,
  nicht nur im sichtbaren Code - ein Agent kann die Regeln also nicht durch Anschauen
  des Quellcodes umgehen
- Fotos werden beim Hochladen automatisch in den Supabase Storage geladen
