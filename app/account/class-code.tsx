"use client";

import { useState } from "react";

export function ClassCode({ code }: { code: string }) {
  const [message, setMessage] = useState("");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage("학급 코드를 복사했어요.");
    } catch {
      setMessage("자동으로 복사하지 못했어요. 화면에 보이는 코드를 선택해 복사해 주세요.");
    }
  }

  return (
    <div className="dashboard-class-code">
      <p>학급 코드 <code>{code}</code></p>
      <button type="button" onClick={copyCode}>코드 복사</button>
      <span role="status">{message}</span>
    </div>
  );
}
