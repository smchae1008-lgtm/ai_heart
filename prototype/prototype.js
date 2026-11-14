(() => {
  const root = document.getElementById("maeumi-flow");
  const find = selector => root.querySelector(selector);
  const messageForm = find("#mf-message-form");
  const history = find("#mf-conversation");
  const inbox = find("#mf-inbox-list");
  const scenarios = {
    simple: {
      title: "체험학습 일정 문의",
      summary: "체험학습 날짜를 확인해 달라는 문의입니다.",
      priority: "하"
    },
    normal: {
      title: "체험학습 준비물 추가 문의",
      summary: "학부모가 체험학습 때 여벌 옷을 챙겨야 하는지 문의했습니다.",
      priority: "하"
    },
    urgent: {
      title: "학생 안전 확인 요청",
      summary: "학부모가 학생이 다쳤다고 전하며 즉시 안전 확인을 요청했습니다.",
      priority: "상"
    },
    abuse: {
      title: "교사 개인 연락처 요구",
      summary: "학부모가 교사의 개인 연락처를 요청했습니다. 공식 문의처를 안내했습니다.",
      priority: "중",
      caution: true
    }
  };
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const koreaClock = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  let warningCount = 0;

  function withinConsultation() {
    const time = Object.fromEntries(koreaClock.formatToParts().map(part => [part.type, part.value]));
    const day = dayOrder.indexOf(time.weekday);
    const checkedDays = root.querySelectorAll(".mf-days input");
    const [start, end] = root.querySelectorAll('input[type="time"]');
    const hhmm = time.hour + ":" + time.minute;
    return day >= 0 && checkedDays[day].checked && hhmm >= start.value && hhmm < end.value;
  }

  function node(tag, value, className) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function addCase(scenario, question, immediately) {
    const item = document.createElement("li");
    const state = ["긴급도 " + scenario.priority];
    if (scenario.caution) state.push("주의");
    state.push(immediately ? "즉시 알림" : "다음 상담 시간에 알림");
    const detail = document.createElement("details");
    detail.append(node("summary", "문의 원문 보기"), node("p", question));
    item.append(
      node("strong", scenario.title),
      node("small", state.join(" · "), scenario.caution ? "mf-caution" : scenario.priority === "상" ? "mf-urgent" : ""),
      node("p", scenario.summary),
      detail
    );
    inbox.prepend(item);
    find("#mf-empty-inbox").hidden = true;
  }

  function chatLine(speaker, text) {
    const line = document.createElement("div");
    line.className = "mf-chat-line";
    line.append(node("small", speaker), node("p", text));
    history.append(line);
  }

  find('[data-action="parent"]').addEventListener("submit", () => {
    if (!find("[data-parent-chat]").hidden) find("#mf-member-count").textContent = "1";
  });

  messageForm.addEventListener("submit", event => {
    event.preventDefault();
    const choice = messageForm.elements.scenario;
    const kind = choice.value;
    const question = choice.selectedOptions[0].textContent;
    chatLine("학부모", question);
    if (kind === "simple" && find("[data-upload]").disabled) {
      chatLine("AI 마음이", "학사일정에 따르면 11월 20일에 체험학습을 진행합니다. 근거 · 학사일정_11월.pdf");
      return;
    }

    const inHours = withinConsultation();
    addCase(scenarios[kind], question, kind === "urgent" || inHours);
    if (kind === "abuse") {
      warningCount += 1;
      const contact = find("#mf-contact-summary").textContent;
      if (warningCount === 1) {
        chatLine("AI 마음이", "욕설이나 교사의 사생활을 침해하는 표현, 개인 연락처 요청에는 답변할 수 없습니다. 문의 내용을 정중하게 다시 작성해 주세요. 학교의 확인이 필요한 경우 아래 공식 문의처를 이용해 주세요.");
      } else {
        chatLine("AI 마음이", "이 대화는 종료되었습니다. 학교의 확인이 필요한 경우 아래 공식 문의처를 이용해 주세요.");
        messageForm.hidden = true;
      }
      chatLine("학교 공식 문의처", contact);
      return;
    }
    chatLine("AI 마음이", inHours
      ? "선생님께 문의를 전달했습니다."
      : "선생님께 문의를 전달했습니다. 다음 상담 시간에 확인하실 수 있습니다.");
  });
})();
