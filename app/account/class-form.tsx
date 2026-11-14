"use client";
import { useState } from "react";
import { saveClass } from "./classes";

const greetings = [
  "안녕하세요. 우리 학급 안내 챗봇입니다. 학급 일정이나 준비물이 궁금하시면 문의해 주세요.",
  "우리 학급 안내입니다. 궁금한 내용을 입력해 주세요.",
  "안녕하세요, 학부모님. 학급 생활에 관해 궁금한 점을 남겨 주세요. 선생님의 확인이 필요한 문의는 전달해 드릴게요.",
];
const previews = [
  "준비물은 물과 도시락입니다.", "체험학습 준비물은 물과 도시락입니다.",
  "체험학습에는 물과 도시락을 준비해 주세요.", "체험학습 때 물과 도시락을 챙겨 주세요. 준비에 참고해 주세요.",
  "체험학습 준비를 도와드릴게요. 물과 도시락을 챙겨 주세요.",
];

export type Classroom = {
  id: string; name: string; starts_on: string; ends_on: string; official_contact: string;
  greeting: string; tone: number; consultation: Record<string, [string, string]>; published: boolean;
  join_code: string;
};

export function ClassForm({ classroom }: { classroom?: Classroom }) {
  const [greeting, setGreeting] = useState(classroom?.greeting ?? greetings[0]);
  const [tone, setTone] = useState(classroom?.tone ?? 3);
  return (
    <form action={saveClass}>
      {classroom && <input type="hidden" name="id" value={classroom.id} />}
      <p><label>학급명 <input name="name" defaultValue={classroom?.name} maxLength={100} required /></label></p>
      <p><label>시작일 <input type="date" name="starts" defaultValue={classroom?.starts_on} required /></label>
        <label>종료일 <input type="date" name="ends" defaultValue={classroom?.ends_on} required /></label></p>
      <p><label>공식 문의처 <input name="contact" defaultValue={classroom?.official_contact} maxLength={300} /></label></p>
      <fieldset><legend>요일별 상담 시간 (한국 시간)</legend>
        {["일", "월", "화", "수", "목", "금", "토"].map((day, index) => (
          <p key={day}><label>{day}요일 시작 <input type="time" name={"start_" + index} defaultValue={classroom?.consultation[index]?.[0]} /></label>
            <label>종료 <input type="time" name={"end_" + index} defaultValue={classroom?.consultation[index]?.[1]} /></label></p>
        ))}
      </fieldset>
      <p><label>첫인사 템플릿 <select defaultValue="" onChange={event => {
        if (event.target.value) setGreeting(greetings[Number(event.target.value) - 1]);
      }}><option value="">문구 선택</option><option value="1">기본형</option><option value="2">간결형</option><option value="3">환영형</option></select></label></p>
      <p><label>첫인사 <textarea name="greeting" value={greeting} onChange={event => setGreeting(event.target.value)} maxLength={1000} required /></label></p>
      <p><label>말투 <select name="tone" value={tone} onChange={event => setTone(Number(event.target.value))}>
        {["간결", "차분", "기본", "친절", "따뜻"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
      </select></label></p>
      <p aria-live="polite">{previews[tone - 1]}</p>
      <p><label><input type="checkbox" name="published" defaultChecked={classroom?.published} /> 학부모 링크 공개</label></p>
      <button>{classroom ? "학급 설정 저장" : "학급 개설"}</button>
    </form>
  );
}
