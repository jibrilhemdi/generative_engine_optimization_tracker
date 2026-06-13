export function buildMockResponse(
  _brand: string,
  query: string,
  provider: string
): string {
  const demoTone = provider === "local" ? "local" : "mock";

  return [
    `(${demoTone} response from ${provider})`,
    `For "${query}", results can vary depending on location, freshness, source quality, and user intent. A useful answer should compare relevant options, cite concrete evidence where possible, and avoid forcing any specific brand unless it is clearly the best fit.`
  ].join(" ");
}
