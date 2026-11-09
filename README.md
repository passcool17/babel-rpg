# Babel — Chapitre 1 : Le village de départ

RPG web 2.5D dans l'esprit des Final Fantasy classiques, en français québécois. Sprites pixel art générés par code dans un décor three.js low-poly.

**Jouer :** https://passcool17.github.io/babel-rpg/

## Lancer en local
```bash
python3 -m http.server 8080   # puis http://localhost:8080
npm test                      # tests Node (combat, quête, sauvegarde, carte, simulation du chapitre)
npm run stamp                 # met à jour les ?v=<hash> de l'import map après une modification
```
Aucune étape de build : modules ES et three.js r170 vendorisé (`vendor/`, licence MIT).

## Raccourcis de vérification
- `?test=combat` : équipe de 3 au niveau 3, combat immédiat (chacal + serpent).
- `?test=boss` : équipe au niveau 5 devant le camp de Kish ; avance vers le nord pour lancer le boss.
- `?test=fin` : écran de fin.
- `?test=canyon` : à l'entrée du canyon, Lavan déjà tassé.
- `?q=0..3` : force un niveau de qualité (0 minimale, 3 haute).
Les modes `?test=` ne sauvegardent pas.

## Structure
- `js/data.js` données (personnages, ennemis, sorts, objets, PNJ, légendes) · `js/combat.js` combat pur · `js/game.js` état, quête, dialogues · `js/world.js` carte et collisions · `js/save.js` sauvegarde versionnée · `js/perf.js` qualité auto
- `js/sprites.js` pixel art canvas · `js/render.js` rendu three.js · `js/ui.js` interface · `js/input.js` clavier/tactile · `js/main.js` boucle et états
- `tools/stamp.mjs` anti-cache · `docs/SPEC.md` spécification · `docs/PLAN.md` plan · `GAME.md` concept et état

## Sources
Narration inspirée de Genèse 10-11 (citations d'après Louis Segond 1910, domaine public) et de l'article « Through the Word: Nimrod and Babel » (kingdom777.wordpress.com). Les spéculations sont présentées comme des légendes du jeu, pas comme des faits. Tous les visuels sont originaux.
