/**
 * Trace d'événements horodatés, pour la frise (`scripts/frise.ts`).
 *
 * **Pourquoi.** La classe de bug qui tue la navigation est *temporelle* : un `abort` qui tombe
 * entre le départ d'une requête OSRM et sa réponse, une caméra qui s'anime plus vite que les
 * fixes GPS n'arrivent. Un log en prose ne la montre pas — il faut voir les intervalles. Cette
 * trace enregistre l'instant de chaque événement, et la frise les met en voies parallèles.
 *
 * **Inerte en production.** N'enregistre que si `import.meta.env.DEV` ou `?trace=1` : dans le
 * bundle servi aux utilisateurs, `trace()` sort à la première ligne.
 *
 * Capture, l'onglet encore ouvert (protocole complet dans `AGENTS.md` § « Mesurer sur le
 * téléphone ») :
 *
 * ```js
 * await Bun.write("/tmp/trace.json", JSON.stringify(await tab.evaluate(() => window.__trace)));
 * ```
 */
export interface TraceEvent {
  /** `performance.now()` : millisecondes depuis le chargement de la page. */
  t: number;
  /** `Date.now()` : de quoi recaler la frise sur l'horloge du téléphone. */
  wall: number;
  kind: string;
  payload?: Record<string, unknown>;
}

declare global {
  /** Lu par la capture CDP : `tab.evaluate(() => window.__trace)`. */
  interface Window {
    __trace?: TraceEvent[];
  }
}

/** Au-delà, les plus vieux événements tombent : une session de navigation en produit ~10/s. */
const MAX = 2000;

const events: TraceEvent[] = [];

const actif =
  import.meta.env.DEV || (typeof location !== "undefined" && location.search.includes("trace=1"));

if (actif && typeof window !== "undefined") {
  window.__trace = events;
}

/** Enregistre un événement. Sans effet hors DEV et hors `?trace=1`. */
export function trace(kind: string, payload?: Record<string, unknown>): void {
  if (!actif) return;
  if (events.length >= MAX) events.shift();
  events.push({ t: performance.now(), wall: Date.now(), kind, payload });
}
