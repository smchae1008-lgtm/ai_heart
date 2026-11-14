const originalFetch = globalThis.fetch;

globalThis.fetch = async (url, options) => {
  if (url !== "https://api.openai.com/v1/responses") {
    return originalFetch(url, options);
  }

  const { input } = JSON.parse(options.body);
  const { message, sources } = JSON.parse(input);
  if (message !== "When is the field trip?") {
    return new Response(null, { status: 503 });
  }
  const evidence = sources.find(({ text }) => text.includes("Field trip: November 24"));
  if (!evidence) throw new Error("Uploaded schedule was absent from the model request");

  return Response.json({
    status: "completed",
    output: [{
      content: [{
        type: "output_text",
        text: JSON.stringify({
          category: "simple", priority: "low", summary: "Field trip date",
          evidenceId: evidence.id, quote: "Field trip: November 24",
        }),
      }],
    }],
  });
};
