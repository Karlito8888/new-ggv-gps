/**
 * Every user-visible string of the app, English with a short Tagalog gloss (the audience is
 * Filipino residents of Garden Grove Village). Keys are `<screen>.<role>`.
 *
 * Markup stays with each renderer; the words live here. Navigation instructions are the
 * exception: they are `TURN_LABELS` in routing.ts, keyed on the OSRM `modifier`.
 */

export interface Bilingual {
  en: string;
  tl?: string;
}

/** Button-label form: the gloss goes inline in parentheses, `Navigate (Mag-navigate)`. */
export function inline(c: Required<Bilingual>): string {
  return `${c.en} (${c.tl})`;
}

export const COPY = {
  gps: {
    aria: { en: "Enable GPS Location" },
    title: { en: "Enable Location", tl: "I-enable ang Lokasyon" },
    description: {
      en: "MyGGV GPS needs your location to guide you through the village.",
      tl: "Kailangan ng MyGGV GPS ang iyong lokasyon para gabayan ka sa village.",
    },
    retry: { en: "Please try again", tl: "Subukan muli" },
    wait: { en: "Please wait, map is loading...", tl: "Naglo-load ang mapa..." },
    requesting: { en: "Requesting...", tl: "Humihiling..." },
    enable: { en: "Enable GPS", tl: "I-enable ang GPS" },
    openSettings: { en: "Open Settings", tl: "Buksan ang Settings" },
  },
  welcome: {
    aria: { en: "Choose Destination" },
    title: { en: "Choose Destination", tl: "Pumili ng Destinasyon" },
    selectBlockLabel: { en: "Select Block" },
    selectLotLabel: { en: "Select Lot" },
    noConnection: { en: "No connection", tl: "Walang koneksyon" },
    loading: { en: "Loading...", tl: "Nag-lo-load..." },
    selectBlock: { en: "Select Block", tl: "Pumili ng Block" },
    noLots: { en: "No lots available", tl: "Walang available na Lot" },
    selectLot: { en: "Select Lot", tl: "Pumili ng Lot" },
    offlineMessage: {
      en: "No connection to the village map data. Check your signal, then reload.",
      tl: "Walang koneksyon sa datos ng village. Tingnan ang signal, pagkatapos i-reload.",
    },
    reload: { en: "Reload", tl: "I-reload" },
    navigate: { en: "Navigate", tl: "Mag-navigate" },
    block: (block: string) => `Block ${block}`,
    lot: (lot: string) => `Lot ${lot}`,
    destinationName: (block: string, lot: string) => `Block ${block}, Lot ${lot}`,
  },
  nav: {
    infoAria: { en: "Navigation info" },
    cancelAria: { en: "Cancel navigation" },
    destinationAria: (name?: string) => `Destination info${name ? `: navigating to ${name}` : ""}`,
    recalculating: { en: "Recalculating...", tl: "Kinakalkula muli..." },
    headToward: { en: "Head toward destination", tl: "Tumungo sa destinasyon" },
    navigating: { en: "Navigating..." },
  },
  arrived: {
    aria: { en: "You have arrived at your destination" },
    title: { en: "You've Arrived!", tl: "Nakarating ka na!" },
    reached: { en: "You have reached", tl: "Nakarating ka na sa" },
    yourDestination: { en: "your destination", tl: "iyong destinasyon" },
    again: { en: "Navigate Somewhere Else", tl: "Sa ibang lugar" },
    exit: { en: "Exit Village", tl: "Lumabas sa Village" },
  },
  exit: {
    aria: { en: "You have exited the village" },
    /** Shown as the destination while navigating to the gate; names carry no gloss. */
    name: { en: "Village Exit" },
    title: { en: "Safe Travels!", tl: "Ingat sa byahe!" },
    exited: {
      en: "You have exited Garden Grove Village.",
      tl: "Lumabas ka na sa Garden Grove Village.",
    },
    thanks: {
      en: "Thank you for using MyGGV GPS!",
      tl: "Salamat sa paggamit ng MyGGV GPS!",
    },
  },
  error: {
    title: { en: "Something went wrong", tl: "May nangyaring error" },
    unexpected: { en: "MyGGV GPS encountered an unexpected error." },
    reloadPrompt: {
      en: "Please reload the app.",
      tl: "May nangyaring hindi inaasahan. I-reload ang app.",
    },
    details: { en: "Error details" },
    reload: { en: "Reload App", tl: "I-reload ang App" },
    retry: { en: "Try again", tl: "Subukan muli" },
  },
  update: {
    ready: { en: "App ready to work offline", tl: "Handa na offline" },
    ok: { en: "OK", tl: "Sige" },
  },
} as const;
