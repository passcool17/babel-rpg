# Babel — Chapitre 1 « Le village de départ » — Spécification

Approuvé par Pascal le 9 nov. 2026 : « Oui, j'approuve le plan du chapitre 1 en 2.5D. Construis-le, publie-le sur GitHub Pages et vérifie-le en ligne. »

## Expérience
- RPG web dans l'esprit des Final Fantasy classiques, 20 à 30 minutes, en français québécois, ton respectueux.
- Asher, jeune berger d'un village au bord de l'Euphrate. Les soldats de Nimrod réquisitionnent les gens pour bâtir une grande ville et emmènent son frère Yonah.
- Asher part avec Tamar (guérisseuse) et Eber (vieux sage). Fin aux portes des plaines de Shinar : « À suivre : les plaines de Shinar ».
- Narration inspirée de Genèse 10-11 et de l'article « Through the Word: Nimrod and Babel » (kingdom777). Les citations bibliques sont marquées « Écrit » ; les spéculations de l'article sont présentées comme des « Légendes du jeu », jamais comme des faits.

## Jeu
- Exploration continue d'une carte en tuiles : village, champs, berge (roseaux), sentier du canyon, porte de Shinar.
- PNJ et dialogues ; quête : rapporter 3 herbes de baume à Tamar, convaincre Eber, passer le vieux Lavan, vaincre le contremaître Kish.
- Combats au tour par tour (ordre par vitesse) : Attaquer, Magie (Asher : Fronde ; Tamar : Soin, Baume ; Eber : Éclair, Tempête de sable), Objets (dattes, eau de source, sel de réveil), Fuir (impossible contre le boss).
- Rencontres aléatoires dans les blés, les roseaux et le canyon. Boss visible : le contremaître Kish.
- XP et niveaux (XP complète pour chaque membre vivant), cuivre, petit inventaire, jarres à ouvrir, marchand.
- Défaite : réveil au puits du village, PV/PM pleins, XP conservée, 25 % du cuivre perdu (jamais bloquant).
- Puits du village et source du canyon : soin complet.

## Look 2.5D
- Décor three.js r170 low-poly : maisons de briques crues, palmiers, blés, roseaux, rivière animée, falaises, ziggourat au loin, porte émaillée.
- Personnages et ennemis : sprites pixel art générés par code (canvas), filtrage nearest, billboards. Aucun asset externe sous copyright.
- Caméra inclinée qui suit Asher. Palette ocre, sable, turquoise.

## Performance (Samsung S20)
- Niveaux de qualité 0-3 (pixel ratio, ombres, densité du décor). Mode Auto : baisse si FPS moyen < 48, remonte prudemment si > 58 longtemps. Réglage manuel dans Options.

## Contrôles
- Clavier : WASD/flèches, E/Entrée/Espace interagir/valider, Échap menu/retour.
- Mobile : joystick tactile, bouton A, bouton ☰.

## Technique
- Sans build : modules ES, three.js vendorisé via import map ; `tools/stamp.mjs` ajoute `?v=<hash>` à chaque module dans l'import map.
- Sauvegarde automatique `localStorage` clé `babel.save`, champ `v` (version 1), lecture tolérante.
- Tests Node (`node --test`) : combat, quête, sauvegarde, carte (accessibilité), simulation du chapitre complet, qualité auto.
- Déploiement : GitHub Actions → GitHub Pages (tests puis déploiement).
- Raccourcis de vérification : `?test=combat`, `?test=boss`, `?test=fin`.
