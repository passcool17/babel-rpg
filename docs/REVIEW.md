# Revue de code — Babel chapitre 1

Revue unique, faite avant la publication avec la grille du skill *requesting-code-review* (alignement au plan, qualité, architecture, tests, prêt pour la production). Faute d'outil de sous-agent dans cet environnement (et sans Cursor, à la demande de Pascal), la revue a été faite par le même agent, en relisant le code de `21aecff` de bout en bout ; elle n'est donc pas « indépendante » au sens strict.

## Points forts
- Logique pure séparée du rendu (`combat.js`, `game.js`, `world.js`, `save.js`, `perf.js`) et testée en Node, y compris une simulation complète du chapitre sur 140 graines.
- Carte générée de façon déterministe, avec un test d'accessibilité (BFS) avant et après Lavan.
- Écrits bibliques et légendes du jeu séparés dans les données et l'interface.

## Problèmes trouvés
### Critiques
- Aucun.

### Importants (corrigés)
1. `js/input.js` — Entrée/Espace sur un bouton ayant le focus pouvait déclencher à la fois le gestionnaire clavier et le clic natif (double choix). Corrigé : `preventDefault()` quand l'interface consomme la touche, et sur Entrée.
2. `js/save.js` — une sauvegarde avec une étape de quête hors bornes ou un personnage inconnu faisait planter `objective()`. Corrigé : validation des bornes et des identifiants, cuivre négatif ramené à 0. Test ajouté.
3. `js/render.js` — chaque combat recréait sprites, textures et décor sans les libérer (mémoire GPU qui grossit pendant 30 min sur téléphone). Corrigé : `disposeTree()` au début de chaque combat, ressources partagées marquées `userData.shared` (ombre, ziggourat clonée).

### Mineurs
- `js/render.js` — allocations de `Vector3` à chaque image (caméra, suiveurs). Corrigé (vecteurs réutilisés).
- `js/main.js` — le journal de combat affichait l'action précédente pendant le choix du joueur. Corrigé : « Au tour de … ».
- Le premier toucher du bouton A peut finir instantanément le texte de la première réplique (le doigt se relève sur la boîte de dialogue). Laissé tel quel : sans effet sur la progression.
- Pas de sons. Noté dans GAME.md.

## Verdict
Prêt à publier avec les corrections ci-dessus (32 tests Node verts, parcours navigateur headless vert).

## Après la première publication
- **Important (corrigé)** — `tools/stamp.mjs` remplaçait la première occurrence de `js/main.js?v=`, qui est dans l'import map : la balise `<script>` gardait `?v=__MAIN__`, donc le script principal n'était jamais versionné (risque de vieux cache). Corrigé en ciblant `src="./js/main.js?v=…"`, avec un test (`tests/stamp.test.js`) qui vérifie tous les hashes de `index.html`.
