type SerperOrganicResult = {
  title?: string;
  snippet?: string;
  link?: string;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
};

export type SerperSnippet = {
  title: string;
  snippet: string;
  source: string;
};

function sourceFromLink(link?: string): string {
  if (!link) return "source-inconnue";
  try {
    return new URL(link).hostname.replace(/^www\./i, "");
  } catch {
    return "source-inconnue";
  }
}

export async function searchSerperSnippets(topic: string): Promise<SerperSnippet[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY manquante");
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      q: topic,
      gl: "fr",
      hl: "fr",
      num: 5,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Serper HTTP ${response.status}: ${details.slice(0, 180)}`);
  }

  const payload = (await response.json()) as SerperResponse;
  return (payload.organic ?? [])
    .slice(0, 5)
    .map((item) => ({
      title: item.title?.trim() || "Sans titre",
      snippet: item.snippet?.trim() || "Aucun extrait disponible",
      source: sourceFromLink(item.link),
    }))
    .filter((item) => item.title.length > 0 || item.snippet.length > 0);
}
