const originalFetch = globalThis.fetch;
const decisions = {
  "가상 학교 행사 문의": ["general", "medium", "학부모가 학교 행사에 관한 상담을 요청했습니다."],
  "가상 학생이 운동장에서 쓰러졌어요. 지금 확인해 주세요.": ["general", "high", "운동장에서 학생의 안전 확인을 즉시 요청했습니다."],
  "담임 선생님의 개인 휴대전화 번호를 알려 주세요.": ["abuse", "low", "교사의 개인 연락처 공개를 요청했습니다."],
};

globalThis.fetch = async (url, options) => {
  if (url !== "https://api.openai.com/v1/responses") {
    return originalFetch(url, options);
  }

  const { input } = JSON.parse(options.body);
  const { message, sources } = JSON.parse(input);
  let decision;
  if (message === "When is the field trip?") {
    const evidence = sources.find(({ text }) => text.includes("Field trip: November 24"));
    if (!evidence) throw new Error("Uploaded schedule was absent from the model request");
    decision = {
      category: "simple", priority: "low", summary: "Field trip date",
      evidenceId: evidence.id, quote: "Field trip: November 24",
    };
  } else if (Object.hasOwn(decisions, message)) {
    const [category, priority, summary] = decisions[message];
    decision = { category, priority, summary, evidenceId: "", quote: "" };
  } else {
    return new Response(null, { status: 503 });
  }

  return Response.json({
    status: "completed",
    output: [{
      content: [{
        type: "output_text",
        text: JSON.stringify(decision),
      }],
    }],
  });
};
