export async function streamImage(
  url: string,
  body: Record<string, unknown>,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error(await res.text().catch(() => "Falha ao gerar imagem"));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of raw.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const choice = parsed?.choices?.[0];
          const delta = choice?.delta ?? choice?.message ?? {};
          const images = delta?.images;
          if (Array.isArray(images) && images.length > 0) {
            const img = images[0];
            const dataUrl = img?.image_url?.url ?? img?.url;
            if (typeof dataUrl === "string") {
              const isFinal = choice?.finish_reason != null;
              onFrame(dataUrl, isFinal);
            }
          }
        } catch {
          // ignore parse errors on partial events
        }
      }
    }
  }
}