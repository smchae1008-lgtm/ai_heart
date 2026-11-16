import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const endpoint = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(endpoint, "http://127.0.0.1:54321");
const admin = createClient(endpoint, process.env.SUPABASE_SECRET_KEY);
const origin = "http://127.0.0.1:3000";

function result(response) {
  if (response.error) throw response.error;
  return response.data;
}

async function checkTeacherLayout(teacher, content) {
  for (const width of [390, 1440]) {
    await teacher.setViewportSize({ width, height: 900 });
    await content.waitFor();
    const overflow = await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, `Teacher dashboard fits a ${width}px viewport`);
  }
}

async function login(browser, email, next = "/account", fromHome = false) {
  const page = await browser.newPage();
  if (fromHome) {
    await page.goto(origin);
    assert.equal(await page.locator("iframe").count(), 0, "Service home does not embed the prototype");
    await page.getByRole("link", { name: "대시보드 열기" }).click();
    await page.waitForURL(origin + "/login");
  } else {
    await page.goto(origin + "/login?next=" + encodeURIComponent(next));
  }
  await page.locator('[name=email]').fill(email);
  await page.getByRole("button", { name: "인증 코드 받기" }).click();
  await page.locator('[name=token]').waitFor({ timeout: 15000 });
  let token;
  for (let attempt = 0; attempt < 20 && !token; attempt++) {
    const list = await (await fetch("http://127.0.0.1:54324/api/v1/messages")).json();
    const item = list.messages?.find(message => message.To.some(recipient => recipient.Address === email));
    if (item) {
      const mail = await (await fetch("http://127.0.0.1:54324/api/v1/message/" + item.ID)).json();
      token = mail.HTML?.match(/<strong>(\d{6,8})<\/strong>/)?.[1];
    }
    if (!token) await delay(500);
  }
  assert.ok(token, "Mailpit delivered the OTP");
  await page.locator('[name=token]').fill(token);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await page.waitForURL(origin + next);
  return page;
}

function syntheticSchedule() {
  const stream = "BT /F1 12 Tf 72 720 Td (Field trip: November 24) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = pdf.length;
    pdf += (index + 1) + " 0 obj\n" + object + "\nendobj\n";
    return String(offset).padStart(10, "0") + " 00000 n \n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n" + offsets.join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(pdf);
}

const operatorEmail = "operator@example.com";
result(await admin.auth.admin.createUser({
  email: operatorEmail, email_confirm: true, app_metadata: { maeumi_role: "operator" },
}));

const browser = await chromium.launch();
try {
  const teacher = await login(browser, "teacher@example.com", "/account", true);
  const operator = await login(browser, operatorEmail);
  assert.equal(await teacher.getByText("새 학급 개설", { exact: true }).count(), 0);
  await teacher.goto(origin + "/operations");
  await teacher.waitForURL(origin + "/account");
  const certificate = { name: "synthetic.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n% synthetic certificate") };
  const bucket = admin.storage.from("teacher-certificates");
  for (const decision of ["반려", "승인"]) {
    await teacher.locator('[name=certificate]').setInputFiles(certificate);
    await teacher.getByRole("button", { name: /인증 신청|다시 신청/ }).click();
    await teacher.getByText("운영팀 검토 중입니다.").waitFor();
    const pending = result(await admin.from("teacher_verifications")
      .select("id,certificate_path").eq("status", "pending").single());
    assert.ok(result(await bucket.download(pending.certificate_path)));
    await operator.goto(origin + "/operations");
    const href = await operator.getByRole("link", { name: "교원증명서 다운로드" }).getAttribute("href");
    assert.equal((await operator.request.get(origin + href)).status(), 200);
    assert.notEqual((await teacher.request.get(origin + href, { maxRedirects: 0 })).status(), 200);
    if (decision === "반려") await operator.getByLabel("반려 사유").fill("가상 검수 사유");
    await operator.getByRole("button", { name: decision, exact: true }).click();
    await operator.getByText("검토 대기 중인 신청이 없습니다.").waitFor();
    const reviewed = result(await admin.from("teacher_verifications")
      .select("certificate_path,status").eq("id", pending.id).single());
    assert.equal(reviewed.status, decision === "승인" ? "approved" : "rejected");
    assert.equal(reviewed.certificate_path, null);
    assert.ok((await bucket.download(pending.certificate_path)).error);
    await teacher.reload();
    await teacher.getByText(decision === "승인" ? "교원 인증이 승인됐습니다." : "반려 사유 가상 검수 사유").waitFor();
  }
  await teacher.getByText("새 학급 개설", { exact: true }).click();
  await checkTeacherLayout(teacher, teacher.locator('[name=name]'));
  await teacher.locator('[name=name]').fill("가상 학급");
  await teacher.locator('[name=starts]').fill("2020-01-01");
  await teacher.locator('[name=ends]').fill("2099-12-31");
  await teacher.locator('[name=contact]').fill("가상 학교 행정실");
  await teacher.locator('[name=published]').check();
  await teacher.getByRole("button", { name: "학급 개설", exact: true }).click();
  const classLink = teacher.getByRole("link", { name: "학부모 링크 열기" });
  await classLink.waitFor();
  const path = await classLink.getAttribute("href");
  const code = await teacher.locator("code").innerText();
  const classId = path.split("/").at(-1);
  await teacher.getByText("학사일정 PDF", { exact: true }).first().click();
  await checkTeacherLayout(teacher, teacher.getByRole("button", { name: "PDF 등록" }));
  await teacher.locator('[name=material]').setInputFiles({
    name: "schedule.pdf", mimeType: "application/pdf", buffer: syntheticSchedule(),
  });
  await teacher.getByRole("button", { name: "PDF 등록" }).click();
  await teacher.getByText("schedule.pdf").waitFor({ state: "attached" });
  const material = result(await admin.from("classroom_materials")
    .select("storage_path,pages").eq("classroom_id", classId).single());
  assert.equal(material.pages[0].number, 1);
  assert.match(material.pages[0].text, /Field trip: November 24/);
  const materials = admin.storage.from("classroom-materials");
  assert.ok(result(await materials.download(material.storage_path)));
  const parent = await login(browser, "parent@example.com", path);
  await parent.getByLabel("학급 코드").fill(code);
  await parent.getByRole("button", { name: "입장", exact: true }).click();
  await parent.getByLabel("문의 내용").fill("When is the field trip?");
  await parent.getByRole("button", { name: "문의 보내기" }).click();
  await parent.getByText(/Field trip: November 24/).waitFor();
  await parent.getByText(/schedule\.pdf 1쪽/).waitFor();
  await parent.getByLabel("문의 내용").fill("가상 학교 행사 문의");
  await parent.getByRole("button", { name: "문의 보내기" }).click();
  await parent.getByText(/선생님께 문의를 전달했습니다/).waitFor();
  await teacher.reload();
  await teacher.getByText("현재 코드 입장 계정 1").waitFor();
  await checkTeacherLayout(teacher, teacher.getByRole("link", { name: "문의 원문 보기" }));
  await teacher.getByRole("link", { name: "문의 원문 보기" }).click();
  await teacher.getByText("가상 학교 행사 문의").waitFor();
  const original = teacher.url();
  assert.equal((await parent.request.get(original)).status(), 404);
  await teacher.getByRole("link", { name: "받은함으로 돌아가기" }).click();
  await teacher.getByText("학급 삭제", { exact: true }).click();
  await teacher.locator('[name=confirm]').check();
  await teacher.getByRole("button", { name: "학급 데이터 삭제" }).click();
  await teacher.getByRole("heading", { name: "가상 학급" }).waitFor({ state: "detached" });
  assert.ok((await materials.download(material.storage_path)).error);
  assert.equal(result(await admin.from("classroom_inquiries").select("id").eq("classroom_id", classId)).length, 0);
  assert.equal((await parent.request.get(origin + path)).status(), 404);
  console.log("PASS: browser OTP, certificate review and deletion, class admission, teacher inbox, PDF upload and classroom deletion");
} finally {
  await browser.close();
}
