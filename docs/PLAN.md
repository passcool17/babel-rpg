# Plan bref
1. Données et logique pures : `data.js`, `combat.js`, `game.js` (état, quête, dialogues), `world.js` (carte), `save.js`, `perf.js` + tests Node.
2. Simulation : test qui joue le chapitre du début à la fin (quête + combats auto) sur 30 graines.
3. Rendu : `sprites.js` (pixel art canvas), `render.js` (décor three.js, caméra, scène de combat, qualité).
4. Interface : `ui.js` (dialogues, menus, combat, HUD, tactile), `input.js`, `main.js` (boucle, états).
5. `tools/stamp.mjs`, workflow Pages, README/GAME.
6. Captures Chrome headless 360×800 et bureau ; revue de code ; corrections ; publication ; vérification en ligne (200 + hashes).
