/**
 * Générateur de la frise de navigation (fichier HTML autonome).
 *
 * @module scripts/frise
 *
 * **Pourquoi ce script existe.** Les pannes de tracé de cette app sont *temporelles* : un
 * `abort` qui tombe entre le départ d'une requête OSRM et sa réponse, une caméra qui s'anime
 * plus vite que les fixes GPS n'arrivent, un premier tracé qui n'arrive jamais. Lues en prose,
 * ces séquences sont invisibles : il faut voir les intervalles. La frise met un événement par
 * voie et l'axe en millisecondes, donc un chevauchement se voit au lieu de se déduire.
 *
 * **Ce que ça ne fait pas.** Aucune lecture réseau, aucune écriture hors de son dossier de
 * sortie. L'entrée est la capture faite depuis le téléphone (voir `AGENTS.md` § « Mesurer sur
 * le téléphone ») :
 *
 * ```bash
 * bun scripts/frise.ts --in=/tmp/trace.json     # → frise-out/frise.html
 * ```
 *
 * La page va dans `frise-out/`, qui porte son propre `.gitignore` à `*` — même convention que
 * `flow-out/` et `archon-out/`. Le dossier est aussi dans `.prettierignore` : un `.html` généré
 * échoue `prettier --check`, donc sans cette ligne le gate rougirait au repos.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DOSSIER_SORTIE = "frise-out";

/** Les voies, dans l'ordre de lecture : la cause en haut, la conséquence en bas. */
const VOIES = [
  "gps:fix",
  "gps:error",
  "cam:jump",
  "cam:ease",
  "route:fetch-start",
  "route:abort",
  "route:osrm",
  "route:osrm-fail",
  "route:stale",
  "route:direct",
] as const;

interface TraceEvent {
  t: number;
  wall: number;
  kind: string;
  payload?: Record<string, unknown>;
}

/**
 * Valide la capture à la main : le format vient de `src/lib/trace.ts`, c'est-à-dire de ce
 * dépôt, et quinze lignes de contrôle valent mieux qu'une dépendance de plus dans une PWA.
 * Un fichier absent, vide ou d'une autre forme s'arrête ici plutôt que de produire une frise
 * vide qu'on lirait comme « rien ne s'est passé ».
 */
function lireTrace(chemin: string): TraceEvent[] {
  if (!existsSync(chemin)) refuser(`fichier introuvable : ${chemin}`);
  const brut: unknown = JSON.parse(readFileSync(chemin, "utf8"));
  if (!Array.isArray(brut) || brut.length === 0) refuser(`capture vide : ${chemin}`);
  return brut.map((e, i) => {
    const ev = e as Partial<TraceEvent>;
    if (typeof ev.t !== "number" || typeof ev.wall !== "number" || typeof ev.kind !== "string")
      refuser(`événement ${i} mal formé : ${JSON.stringify(e)}`);
    return { t: ev.t, wall: ev.wall, kind: ev.kind, payload: ev.payload };
  });
}

/** Sort en nommant la commande de capture : une frise absente doit dire comment l'obtenir. */
function refuser(raison: string): never {
  process.stderr.write(
    `frise : ${raison}\n` +
      "Capturer d'abord, l'onglet encore ouvert :\n" +
      '  await Bun.write("/tmp/trace.json", JSON.stringify(await tab.evaluate(() => window.__trace)));\n' +
      "L'app doit tourner en DEV ou avoir été ouverte avec ?trace=1.\n"
  );
  process.exit(1);
}

function main(): void {
  const argv = process.argv.slice(2);
  const entree = argv.find((a) => a.startsWith("--in="))?.slice(5) ?? "/tmp/trace.json";
  const sortie =
    argv.find((a) => a.startsWith("--out="))?.slice(6) ?? join(DOSSIER_SORTIE, "frise.html");

  const evenements = lireTrace(entree);

  mkdirSync(DOSSIER_SORTIE, { recursive: true });
  const ignore = join(DOSSIER_SORTIE, ".gitignore");
  if (!existsSync(ignore)) writeFileSync(ignore, "*\n", "utf8");

  writeFileSync(
    sortie,
    page({ genereLe: new Date().toISOString(), entree, voies: VOIES, evenements }),
    "utf8"
  );
  process.stdout.write(`${sortie}\n`);
}

/** La page. Autonome : CSS et JS en ligne, aucune requête réseau, ouvrable depuis un `file://`. */
function page(d: unknown): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>new-ggv-gps — frise de navigation</title>
<style>
:root{color-scheme:dark;--bg:#12141a;--carte:#1a1d26;--bord:#2b3040;--txt:#e6e8ef;--doux:#9aa3b8;
--ok:#3fb950;--ko:#f85149;--attn:#d29922;--acc:#58a6ff}
*{box-sizing:border-box}
body{margin:0;padding:24px;background:var(--bg);color:var(--txt);
font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1080px;margin:0 auto}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--doux);
margin:28px 0 10px;font-weight:600}
.meta{color:var(--doux);font-size:13px;margin-bottom:20px}
.grille{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.carte{background:var(--carte);border:1px solid var(--bord);border-radius:10px;padding:14px}
.carte .k{font-size:12px;color:var(--doux);text-transform:uppercase;letter-spacing:.06em}
.carte .v{font-size:24px;font-weight:650;margin-top:4px;font-variant-numeric:tabular-nums}
.carte .s{font-size:12px;color:var(--doux);margin-top:2px}
.curseur{background:var(--carte);border:1px solid var(--bord);border-radius:10px;padding:18px}
input[type=range]{width:100%;accent-color:var(--acc)}
.paliers{display:flex;justify-content:space-between;font-size:12px;color:var(--doux);
font-variant-numeric:tabular-nums;margin-top:6px}
.pill{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:600}
.pill.ok{background:rgba(63,185,80,.16);color:var(--ok)}
.pill.ko{background:rgba(248,81,73,.16);color:var(--ko)}
.pill.attn{background:rgba(210,153,34,.16);color:var(--attn)}
.avert{border-left:3px solid var(--attn);background:rgba(210,153,34,.07);padding:10px 14px;
border-radius:0 8px 8px 0;font-size:14px;margin:10px 0}
.avert.rouge{border-color:var(--ko);background:rgba(248,81,73,.07)}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
pre{background:#0d1017;border:1px solid var(--bord);border-radius:8px;padding:12px;
overflow-x:auto;font-size:13px;margin:0}
button{background:var(--carte);color:var(--txt);border:1px solid var(--bord);border-radius:7px;
padding:6px 12px;font-size:13px;cursor:pointer;margin-top:8px}
button:hover{border-color:var(--acc);color:var(--acc)}
.note{font-size:13px;color:var(--doux);margin-top:4px}
#frise{background:var(--carte);border:1px solid var(--bord);border-radius:10px;width:100%}
#frise text{fill:var(--doux);font-size:11px}
#frise line.axe{stroke:var(--bord)}
#infobulle{position:fixed;pointer-events:none;background:#0d1017;border:1px solid var(--bord);
border-radius:6px;padding:6px 8px;font-size:12px;display:none;max-width:420px}
</style>
</head>
<body>
<main>
<h1>new-ggv-gps — frise de navigation</h1>
<div class="meta" id="meta"></div>

<div class="avert">La frise ne montre que ce qui est instrumenté : neuf points d'appel dans
<code>useMapSetup</code>, <code>useRouting</code> et <code>useCourseUpCamera</code>. Un silence sur
une voie ne dit pas que rien ne s'est produit, seulement qu'aucun de ces neuf points n'a été
franchi. La trace est plafonnée à 2000 événements : au-delà, les plus anciens sont tombés.</div>
<div id="avertBureau"></div>

<div id="chiffres" class="grille"></div>

<h2>Fenêtre</h2>
<div class="curseur">
  <input type="range" id="zoom" min="10" max="100" value="100" step="1">
  <div class="paliers"><span id="debut"></span><span id="fin"></span></div>
</div>

<svg id="frise"></svg>
<div id="infobulle"></div>

<h2>Export</h2>
<button id="copier">Copier le résumé</button>
<div class="note">Rien n'est exécuté depuis cette page.</div>
</main>
<script id="donnees" type="application/json">${JSON.stringify(d)}</script>
<script>
const D = JSON.parse(document.getElementById('donnees').textContent);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const E = D.evenements.slice().sort((a, b) => a.t - b.t);
const t0 = E[0].t;
const duree = E[E.length - 1].t - t0;
const rel = (e) => e.t - t0;
const COULEUR = { 'gps:fix': '#58a6ff', 'gps:error': '#f85149', 'cam:jump': '#d29922',
  'cam:ease': '#3fb950', 'route:fetch-start': '#58a6ff', 'route:abort': '#f85149',
  'route:osrm': '#3fb950', 'route:osrm-fail': '#d29922', 'route:stale': '#d29922',
  'route:direct': '#d29922' };

document.getElementById('meta').textContent =
  'Généré le ' + new Date(D.genereLe).toLocaleString('fr-FR') + ' · ' + D.entree + ' · ' +
  E.length + ' événements sur ' + (duree / 1000).toFixed(1) + ' s · horloge du téléphone ' +
  new Date(E[0].wall).toLocaleTimeString('fr-FR');

const parVoie = (kind) => E.filter((e) => e.kind === kind);

// Intervalle médian entre fixes : c'est la cadence réelle du flux, et tout le reste se lit
// contre elle. Sans flux GPS injecté, un run de bureau en produit zéro ou un.
const fixes = parVoie('gps:fix');
const intervalles = fixes.slice(1).map((e, i) => e.t - fixes[i].t).sort((a, b) => a - b);
const median = intervalles.length ? intervalles[Math.floor(intervalles.length / 2)] : null;

// Un abort tombé pendant qu'une requête est en vol : la régression que cette page existe pour
// montrer. Compté par abort, pas par requête : les requêtes se chevauchent (chaque abort est
// suivi d'un nouveau départ), donc compter par requête additionne plusieurs fois le même abort.
const ISSUES = ['route:osrm', 'route:direct'];
const abortsDedans = E.filter((a) => {
  if (a.kind !== 'route:abort') return false;
  const depart = E.filter((e) => e.kind === 'route:fetch-start' && e.t < a.t).pop();
  if (!depart) return false;
  // En vol si aucune issue n'est arrivée entre ce départ et cet abort.
  return !E.some((e) => ISSUES.includes(e.kind) && e.t > depart.t && e.t < a.t);
}).length;

// Délai avant le premier tracé : ce que l'utilisateur attend en regardant une carte sans ligne.
const premierFix = fixes[0];
const premierTrace = E.find((e) => ISSUES.includes(e.kind));
const delaiTrace = premierFix && premierTrace ? premierTrace.t - premierFix.t : null;

const carte = (k, v, s) => '<div class="carte"><div class="k">' + k + '</div><div class="v">' +
  v + '</div><div class="s">' + s + '</div></div>';
document.getElementById('chiffres').innerHTML = [
  carte('Cadence GPS', median === null ? '—' : Math.round(median) + ' ms',
    fixes.length + ' fixes · intervalle médian'),
  carte('Aborts dans une requête', abortsDedans,
    abortsDedans ? '<span class="pill ko">régression</span>' : '<span class="pill ok">aucun</span>'),
  carte('Premier tracé', delaiTrace === null ? '—' : (delaiTrace / 1000).toFixed(1) + ' s',
    premierTrace ? 'depuis le premier fix, via ' + premierTrace.kind : 'aucun tracé posé'),
  carte('Requêtes OSRM', parVoie('route:fetch-start').length,
    parVoie('route:osrm').length + ' abouties, ' + parVoie('route:osrm-fail').length + ' en échec'),
].join('');

document.getElementById('avertBureau').innerHTML = fixes.length < 5
  ? '<div class="avert rouge">Moins de cinq fixes GPS : cette capture ne reproduit pas la ' +
    'navigation. Un run de bureau sans pilote GPS injecté trace la route sans peine et ne prouve ' +
    '<b>rien</b> — voir <code>AGENTS.md</code> § « Mesurer sur le téléphone ».</div>'
  : '';

const H_VOIE = 26, MARGE_G = 130, MARGE_H = 10, MARGE_B = 24;
const svg = document.getElementById('frise');
const infobulle = document.getElementById('infobulle');

function dessiner(fraction) {
  const fenetre = Math.max(1, duree * fraction);
  const largeur = svg.clientWidth || 900;
  const hauteur = MARGE_H + D.voies.length * H_VOIE + MARGE_B;
  const utile = largeur - MARGE_G - 12;
  const x = (e) => MARGE_G + (rel(e) / fenetre) * utile;

  let s = '';
  D.voies.forEach((voie, i) => {
    const y = MARGE_H + i * H_VOIE + H_VOIE / 2;
    s += '<line class="axe" x1="' + MARGE_G + '" y1="' + y + '" x2="' + (largeur - 12) +
      '" y2="' + y + '"/>';
    s += '<text x="4" y="' + (y + 4) + '">' + voie + '</text>';
    for (const e of E) {
      if (e.kind !== voie || rel(e) > fenetre) continue;
      s += '<circle cx="' + x(e).toFixed(1) + '" cy="' + y + '" r="4" fill="' +
        (COULEUR[voie] || '#9aa3b8') + '" data-i="' + E.indexOf(e) + '"/>';
    }
  });
  // Graduations : une par seconde tant qu'elles restent lisibles.
  const pas = fenetre > 30000 ? 5000 : 1000;
  for (let ms = 0; ms <= fenetre; ms += pas) {
    const px = MARGE_G + (ms / fenetre) * utile;
    s += '<text x="' + px.toFixed(1) + '" y="' + (hauteur - 6) + '">' + (ms / 1000) + 's</text>';
  }
  svg.setAttribute('viewBox', '0 0 ' + largeur + ' ' + hauteur);
  svg.setAttribute('height', hauteur);
  svg.innerHTML = s;
  document.getElementById('debut').textContent = '0 s';
  document.getElementById('fin').textContent = (fenetre / 1000).toFixed(1) + ' s';
}

svg.addEventListener('mousemove', (ev) => {
  const cible = ev.target;
  if (!cible.dataset || cible.dataset.i === undefined) { infobulle.style.display = 'none'; return; }
  const e = E[Number(cible.dataset.i)];
  infobulle.innerHTML = '<b>' + esc(e.kind) + '</b> · ' + Math.round(rel(e)) + ' ms' +
    (e.payload ? '<br>' + esc(JSON.stringify(e.payload)) : '');
  infobulle.style.display = 'block';
  infobulle.style.left = (ev.clientX + 12) + 'px';
  infobulle.style.top = (ev.clientY + 12) + 'px';
});
svg.addEventListener('mouseleave', () => { infobulle.style.display = 'none'; });

const zoom = document.getElementById('zoom');
zoom.oninput = () => dessiner(Number(zoom.value) / 100);
window.addEventListener('resize', () => dessiner(Number(zoom.value) / 100));
dessiner(1);

const resume = [
  '- fixes GPS : ' + fixes.length + (median === null ? '' : ', intervalle médian ' + Math.round(median) + ' ms'),
  '- aborts tombés dans une requête en vol : ' + abortsDedans,
  '- premier tracé : ' + (delaiTrace === null ? 'aucun' : (delaiTrace / 1000).toFixed(1) + ' s après le premier fix'),
  '- requêtes OSRM : ' + parVoie('route:fetch-start').length + ' parties, ' +
    parVoie('route:osrm').length + ' abouties, ' + parVoie('route:direct').length + ' repliées en ligne droite',
].join('\\n');
document.getElementById('copier').onclick = () => navigator.clipboard.writeText(resume);
</script>
</body>
</html>
`;
}

main();
