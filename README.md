# CRM M2BPO

CRM sur-mesure pour M2BPO — éditeur d'un outil de veille marchés publics pour architectes.

## Stack
- HTML / CSS / JS vanilla (pas de framework)
- Supabase (Postgres + Auth + Row Level Security)

## Lancer en local
```bash
npx serve .
```
Puis ouvrir http://localhost:3000

## Structure
```
├── index.html          # Shell SPA
├── css/                # Design tokens + layout
├── js/                 # Modules JS (1 fichier par module)
├── pages/              # Pages partielles chargées par le router
├── sql/                # Scripts SQL Supabase
└── data/               # Templates d'import
```
