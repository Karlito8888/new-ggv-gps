/**
 * Trace d'événements horodatés, pour la frise (`scripts/frise.ts`).
 *
 * **Pourquoi.** La classe de bug qui tue la navigation est *temporelle* : un `abort` qui tombe
 * entre le départ d'une requête OSRM et sa réponse, une caméra qui s'anime plus vite que les
 * fixes GPS n'arrivent. Un log en prose ne la montre pas — il faut voir les intervalles. Cette
 * trace enregistre l'instant de chaque événement, et la frise les met en voies parallèles.
 *
 * **Inerte par défaut.** `trace()` sort à la première ligne tant que `startTrace()` n'a pas été
 * appelé. Le web l'appelle en DEV ou avec `?trace=1` (`apps/web/src/main.tsx`), et expose le
 * tableau sur `window.__trace`.
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

/** Au-delà, les plus vieux événements tombent : une session de navigation en produit ~10/s. */
const MAX = 2000;

let events: TraceEvent[] | null = null;

/** Active l'enregistrement et renvoie le tableau vivant (idempotent). */
export function startTrace(): TraceEvent[] {
  events ??= [];
  return events;
}

/** Enregistre un événement. Sans effet tant que `startTrace()` n'a pas été appelé. */
export function trace(kind: string, payload?: Record<string, unknown>): void {
  if (!events) return;
  if (events.length >= MAX) events.shift();
  events.push({ t: performance.now(), wall: Date.now(), kind, payload });
}
