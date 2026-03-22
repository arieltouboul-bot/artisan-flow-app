/**
 * Smart parsing for natural-language commands (appointments, projects, invoice filters).
 * No external API — deterministic regex + date math.
 */

const DAY_FR: Record<string, number> = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const DAY_EN: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export type ParsedAppointment = {
  clientName: string;
  hour: number;
  minute: number;
  start: Date;
  end: Date;
};

/** Same algorithm as legacy assistant: next occurrence of weekday, roll +7 days if already passed. */
export function buildAppointmentWindow(
  targetDay: number,
  hour: number,
  minute: number
): { start: Date; end: Date } {
  const now = new Date();
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, minute, 0, 0);
  if (d <= now) {
    d.setDate(d.getDate() + 7);
  }
  const end = new Date(d);
  end.setHours(end.getHours() + 1, 0, 0, 0);
  return { start: d, end };
}

/**
 * French: "Prends rendez-vous avec Client X lundi prochain à 14h"
 * English: "Schedule appointment with Client X next Monday at 2pm"
 */
export function parseAppointmentCommand(raw: string): ParsedAppointment | null {
  const text = raw.trim();
  const lower = text.toLowerCase();

  // Short FR: "RDV lundi à 14h" / "RDV lundi à 14h avec Martin"
  const shortFr =
    /^(?:rdv|rendez-vous)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?\s+(?:à\s+)?(\d{1,2})h?(?::(\d{2}))?(?:\s*[,.]?\s*(?:avec|pour)\s+(.+))?$/i.exec(
      text
    );
  if (shortFr) {
    const dayName = shortFr[1].toLowerCase();
    const wd = DAY_FR[dayName];
    if (wd !== undefined) {
      const hour = parseInt(shortFr[2], 10);
      const minute = shortFr[3] ? parseInt(shortFr[3], 10) : 0;
      let clientPart = (shortFr[4] ?? "").trim().replace(/[.,]$/, "");
      if (!clientPart) clientPart = "Client";
      const { start, end } = buildAppointmentWindow(wd, hour, minute);
      return { clientName: clientPart, hour, minute, start, end };
    }
  }

  // Short EN: "RDV Monday at 2pm" / "appointment Tuesday at 9am with John"
  const shortEn =
    /^(?:rdv|appointment)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|p\.m\.|a\.m\.)?(?:\s*[,.]?\s*(?:with|for)\s+(.+))?$/i.exec(
      text
    );
  if (shortEn) {
    const dayKey = shortEn[1].toLowerCase() as keyof typeof DAY_EN;
    const wd = DAY_EN[dayKey];
    if (wd !== undefined) {
      let hour = parseInt(shortEn[2], 10);
      const minute = shortEn[3] ? parseInt(shortEn[3], 10) : 0;
      const ampm = (shortEn[4] || "").toLowerCase();
      if (ampm === "pm" || ampm === "p.m.") {
        if (hour < 12) hour += 12;
      }
      if ((ampm === "am" || ampm === "a.m.") && hour === 12) hour = 0;
      let clientPart = (shortEn[5] ?? "").trim().replace(/[.,]$/, "");
      if (!clientPart) clientPart = "Client";
      const { start, end } = buildAppointmentWindow(wd, hour, minute);
      return { clientName: clientPart, hour, minute, start, end };
    }
  }

  // English — "Schedule / book an appointment with X on Monday at 2pm"
  let en =
    /(?:schedule|book)\s+(?:an\s+)?appointment\s+with\s+(.+?)\s+(?:on\s+)?(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|p\.m\.|a\.m\.)?/i.exec(
      text
    );
  if (!en) {
    en =
      /(?:make|create)\s+(?:an\s+)?appointment\s+with\s+(.+?)\s+(?:on\s+)?(?:next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|p\.m\.|a\.m\.)?/i.exec(
        text
      );
  }
  if (en) {
    const clientName = en[1].trim().replace(/[.,]$/, "");
    const dayKey = en[2].toLowerCase() as keyof typeof DAY_EN;
    const wd = DAY_EN[dayKey];
    if (wd === undefined) return null;
    let hour = parseInt(en[3], 10);
    const minute = en[4] ? parseInt(en[4], 10) : 0;
    const ampm = (en[5] || "").toLowerCase();
    if (ampm === "pm" || ampm === "p.m.") {
      if (hour < 12) hour += 12;
    }
    if ((ampm === "am" || ampm === "a.m.") && hour === 12) hour = 0;
    const { start, end } = buildAppointmentWindow(wd, hour, minute);
    return { clientName, hour, minute, start, end };
  }

  // French: "… avec Client X lundi prochain à 14h" or "… lundi à 14h"
  const fr = /(?:prends?(?:-moi)?\s+)?(?:un\s+)?rendez-vous\s+(?:avec\s+)?(?:le\s+client\s+)?(.+?)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?\s+(?:à\s+)?(\d{1,2})h?(?::(\d{2}))?/i.exec(
    text
  );
  if (fr) {
    let clientPart = fr[1].trim().replace(/[.,]$/, "");
    const dayName = fr[2].toLowerCase();
    const wd = DAY_FR[dayName];
    if (wd === undefined) return null;
    const hour = parseInt(fr[3], 10);
    const minute = fr[4] ? parseInt(fr[4], 10) : 0;
    clientPart = clientPart.replace(/\s+(?:mardi|lundi|mercredi|jeudi|vendredi|samedi|dimanche).*$/i, "").trim();
    const { start, end } = buildAppointmentWindow(wd, hour, minute);
    return { clientName: clientPart || "Client", hour, minute, start, end };
  }

  return null;
}

export type WeeklyRecurrenceParsed = {
  weekday: number;
  hour: number;
  minute: number;
  taskTitle: string;
};

/**
 * "Every Monday at 8am, remind me to check the inventory"
 * "Chaque lundi à 8h, rappelle-moi de vérifier le stock"
 */
export function parseWeeklyRecurrenceCommand(raw: string): WeeklyRecurrenceParsed | null {
  const text = raw.trim();

  const enRemindFirst =
    /remind\s+me\s+(?:every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\s*(?:to\s+)?(.+)/i.exec(
      text
    );
  if (enRemindFirst) {
    const dayKey = enRemindFirst[1].toLowerCase() as keyof typeof DAY_EN;
    const wd = DAY_EN[dayKey];
    if (wd === undefined) return null;
    let hour = parseInt(enRemindFirst[2], 10);
    const minute = enRemindFirst[3] ? parseInt(enRemindFirst[3], 10) : 0;
    const ampm = (enRemindFirst[4] || "").toLowerCase();
    if (ampm === "pm" || ampm === "p.m.") {
      if (hour < 12) hour += 12;
    }
    if ((ampm === "am" || ampm === "a.m.") && hour === 12) hour = 0;
    let taskTitle = (enRemindFirst[5] || "").trim().replace(/[.,]$/, "");
    if (taskTitle.length < 2) taskTitle = "Weekly reminder";
    return { weekday: wd, hour, minute, taskTitle };
  }

  const en =
    /(?:every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?[^.]*(?:remind me(?:\s+to)?\s+)?(.+)/i.exec(
      text
    );
  if (en) {
    const dayKey = en[1].toLowerCase() as keyof typeof DAY_EN;
    const wd = DAY_EN[dayKey];
    if (wd === undefined) return null;
    let hour = parseInt(en[2], 10);
    const minute = en[3] ? parseInt(en[3], 10) : 0;
    const ampm = (en[4] || "").toLowerCase();
    if (ampm === "pm" || ampm === "p.m.") {
      if (hour < 12) hour += 12;
    }
    if ((ampm === "am" || ampm === "a.m.") && hour === 12) hour = 0;
    let taskTitle = (en[5] || "").trim().replace(/[.,]$/, "");
    taskTitle = taskTitle.replace(/^(?:to\s+)/i, "").trim();
    if (taskTitle.length < 2) taskTitle = "Weekly reminder";
    return { weekday: wd, hour, minute, taskTitle };
  }

  const fr =
    /chaque\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(?:à\s+)?(\d{1,2})h(?::(\d{2}))?[\s,]*(.+)/i.exec(
      text
    );
  if (fr) {
    const dayName = fr[1].toLowerCase();
    const wd = DAY_FR[dayName];
    if (wd === undefined) return null;
    const hour = parseInt(fr[2], 10);
    const minute = fr[3] ? parseInt(fr[3], 10) : 0;
    let taskPart = fr[4].trim();
    taskPart = taskPart
      .replace(/^(?:rappelle(?:-moi)?|pense)\s+(?:à\s+)?(?:de\s+)?/i, "")
      .trim();
    const taskTitle = taskPart.replace(/[.,]$/, "").trim() || "Rappel hebdomadaire";
    return { weekday: wd, hour, minute, taskTitle };
  }

  return null;
}

/** Next `count` occurrences of weekday at hour:minute, each 30 min long. */
export function buildWeeklySeriesDates(
  weekday: number,
  hour: number,
  minute: number,
  count: number,
  durationMinutes = 30
): { start: Date; end: Date }[] {
  const first = buildAppointmentWindow(weekday, hour, minute);
  const out: { start: Date; end: Date }[] = [];
  let s = new Date(first.start);
  for (let i = 0; i < count; i++) {
    const start = new Date(s);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    out.push({ start, end });
    s.setDate(s.getDate() + 7);
  }
  return out;
}

export type ParsedProjectBudget = {
  name: string;
  budget: number;
};

/** "Ajoute le projet Rénovation Cuisine avec un budget de 5000€" / "Add project Kitchen Reno with budget 5000" */
export function parseProjectWithBudget(raw: string): ParsedProjectBudget | null {
  const t = raw.trim();
  const fr = /(?:ajoute|crée|cree|nouveau)\s+(?:le\s+)?projet\s+(.+?)\s+(?:avec\s+)?(?:un\s+)?(?:budget\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*€?/i.exec(t);
  if (fr) {
    const name = fr[1].trim().replace(/[.,]$/, "");
    const budget = parseFloat(fr[2].replace(",", "."));
    if (name.length >= 2 && !Number.isNaN(budget) && budget > 0) return { name, budget };
  }
  const en =
    /(?:add|create)\s+(?:a\s+)?(?:new\s+)?project\s+(.+?)\s+(?:with\s+)?(?:a\s+)?(?:budget\s+)?(?:of\s+)?(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?)?/i.exec(t);
  if (en) {
    const name = en[1].trim().replace(/[.,]$/, "");
    const budget = parseFloat(en[2].replace(",", "."));
    if (name.length >= 2 && !Number.isNaN(budget) && budget > 0) return { name, budget };
  }
  return null;
}

export type NewProjectRevenueParsed = {
  amount: number;
  projectName: string;
};

/**
 * "Add 2000€ for a new project Villa Herzliya"
 * "Ajoute 2000€ pour un nouveau projet Villa Herzliya"
 */
export function parseNewProjectRevenueCommand(raw: string): NewProjectRevenueParsed | null {
  const text = raw.trim();

  const fr =
    /^(?:ajoute|ajouter|enregistre)\s+(\d+(?:[.,]\d+)?)\s*€?\s+pour\s+(?:un\s+)?(?:nouveau\s+)?(?:projet\s+)?(.+)$/i.exec(
      text
    );
  if (fr) {
    const amount = parseFloat(fr[1].replace(",", "."));
    const projectName = fr[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(amount) && amount > 0 && projectName.length >= 2) return { amount, projectName };
  }

  const en =
    /^(?:add|record)\s+(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?)?\s+for\s+(?:a\s+)?(?:new\s+)?(?:project\s+)?(.+)$/i.exec(
      text
    );
  if (en) {
    const amount = parseFloat(en[1].replace(",", "."));
    const projectName = en[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(amount) && amount > 0 && projectName.length >= 2) return { amount, projectName };
  }

  return null;
}

/** "Add 1500€ revenue for Villa Cohen" / "Ajoute 1500€ de revenu pour Villa Cohen" */
export function parseExistingProjectRevenueCommand(raw: string): NewProjectRevenueParsed | null {
  const text = raw.trim();
  const en =
    /^(?:add|record)\s+(\d+(?:[.,]\d+)?)\s*(?:€|eur|euros?)?\s+revenue\s+for\s+(.+)$/i.exec(text);
  if (en) {
    const amount = parseFloat(en[1].replace(",", "."));
    const projectName = en[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(amount) && amount > 0 && projectName.length >= 2) return { amount, projectName };
  }
  const fr =
    /^(?:ajoute|ajouter|enregistre)\s+(\d+(?:[.,]\d+)?)\s*€?\s+(?:de\s+)?revenu\s+pour\s+(.+)$/i.exec(text);
  if (fr) {
    const amount = parseFloat(fr[1].replace(",", "."));
    const projectName = fr[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(amount) && amount > 0 && projectName.length >= 2) return { amount, projectName };
  }
  return null;
}

export function parseTotalRevenueThisMonthIntent(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (!/(this\s+month|ce\s+mois|cette\s+mois-ci|du\s+mois)/i.test(lower)) return false;
  if (!/(revenue|revenu|revenues|ca\b|chiffre|turnover|sales|total|encais)/i.test(lower)) return false;
  if (!/(what|quel|combien|how|total|my|mon|ma\s+|is\s+my|de\s+mon)/i.test(lower)) return false;
  return true;
}

export function parseShowActiveProjectsIntent(raw: string): boolean {
  const lower = raw.toLowerCase();
  if (!/(project|projet|chantier)/i.test(lower)) return false;
  if (!/(show|liste|list|affiche|montre|display|see|give)/i.test(lower)) return false;
  if (!/(active|actifs?|actives?|en\s+cours|current|ongoing|ouverts?)/i.test(lower)) return false;
  return true;
}

export type CreateProjectForClientParsed = { clientName: string };

/** "Create a new project for Client X" / "Crée un projet pour Martin" */
export function parseCreateProjectForClientCommand(raw: string): CreateProjectForClientParsed | null {
  const text = raw.trim();
  const en1 = /^create\s+a\s+new\s+project\s+for\s+(.+)$/i.exec(text);
  if (en1) {
    const clientName = en1[1].trim().replace(/[.,]$/, "");
    if (clientName.length >= 2) return { clientName };
  }
  const en =
    /^(?:create|make|add)\s+(?:a\s+)?(?:new\s+)?(?:project|chantier)\s+(?:for|with)\s+(.+)$/i.exec(text);
  if (en) {
    const clientName = en[1].trim().replace(/[.,]$/, "");
    if (clientName.length >= 2) return { clientName };
  }
  const fr =
    /^(?:crée|cree|créer)\s+(?:un\s+)?(?:nouveau\s+)?projet\s+pour\s+(?:le\s+)?(?:client\s+)?(.+)$/i.exec(text);
  if (fr) {
    const clientName = fr[1].trim().replace(/[.,]$/, "");
    if (clientName.length >= 2) return { clientName };
  }
  return null;
}

/** "Schedule a meeting tomorrow at 10am" / "RDV demain à 10h" */
export function buildTomorrowAt(hour: number, minute: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export function parseTomorrowMeetingCommand(raw: string): { hour: number; minute: number } | null {
  const lower = raw.toLowerCase();
  if (!/(tomorrow|demain)/.test(lower)) return null;
  if (!/(meeting|appointment|rendez|schedule|réunion|rdv|book)/.test(lower)) return null;
  const en = /(?:at|@)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i.exec(raw);
  if (en) {
    let hour = parseInt(en[1], 10);
    const minute = en[2] ? parseInt(en[2], 10) : 0;
    const ampm = (en[3] || "").toLowerCase();
    if (ampm === "pm" || ampm === "p.m.") {
      if (hour < 12) hour += 12;
    }
    if ((ampm === "am" || ampm === "a.m.") && hour === 12) hour = 0;
    return { hour, minute };
  }
  const fr = /(?:à\s+)?(\d{1,2})h(?::(\d{2}))?/i.exec(raw);
  if (fr) {
    return { hour: parseInt(fr[1], 10), minute: fr[2] ? parseInt(fr[2], 10) : 0 };
  }
  return null;
}

export type InvoiceFilterIntent = {
  vendor: string;
  month: "current" | "previous" | "all";
};

/** "Montre-moi les factures de Castorama de ce mois" / "Show invoices from Castorama this month" */
export function parseInvoiceFilterIntent(raw: string): InvoiceFilterIntent | null {
  const lower = raw.toLowerCase();
  if (!/(facture|invoice|dépense|expense)/i.test(raw)) return null;
  if (!/(montre|show|liste|filter|filtre|voir|display)/i.test(lower) && !/factures?\s+de/i.test(lower)) {
    return null;
  }

  let month: InvoiceFilterIntent["month"] = "all";
  if (/(ce\s+mois|this\s+month|cette\s+mois)/i.test(lower)) month = "current";
  if (/(mois\s+dernier|last\s+month|previous\s+month)/i.test(lower)) month = "previous";

  let vendor = "";
  const mVendor =
    /(?:les\s+)?(?:factures?|invoices?)\s+(?:de|from|for)\s+([A-Za-zÀ-ÿ0-9'’\-\s]{2,48}?)(?:\s+(?:de|du|this|ce|for|the))?/i.exec(
      raw
    );
  if (mVendor) {
    vendor = mVendor[1].trim();
  } else {
    const m2 = /(?:de|from|chez)\s+([A-Za-zÀ-ÿ0-9'’][A-Za-zÀ-ÿ0-9'’\-\s]{1,46})(?:\s+(?:de\s+ce|this|ce|du)\s+mois)?/i.exec(raw);
    vendor = m2 ? m2[1].trim() : "";
  }
  vendor = vendor.replace(/\s+(de|du|this|ce|the)\s+mois.*$/i, "").trim();
  if (vendor.length < 2) return null;

  return { vendor, month };
}
