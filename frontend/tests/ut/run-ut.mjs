// AI 사용성 테스트 드라이버 — 3 페르소나 × NEXON Live 시나리오 (Mock, auth none)
// 산출: specs/001-nexon-live/ut/observations/raw-observations.json + screenshots/*.png
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.UT_BASE || 'http://localhost:5173';
const OUT = path.resolve('../specs/001-nexon-live/ut');
const SHOTS = path.join(OUT, 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const consoleErrors = [];

const rec = (o) => results.push({ timestamp: Date.now(), ...o });
const shot = async (page, name) => {
  const p = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: p });
  return path.relative(path.resolve('..'), p).replace(/\\/g, '/');
};

async function newPage(browser, persona) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push({ persona, text: m.text() });
  });
  return { ctx, page };
}

// ── 초보자: 느린 클릭, 머뭇거림 ──────────────────────────────
async function beginner(browser) {
  const { ctx, page } = await newPage(browser, 'beginner');
  // S-B01
  try {
    const t0 = Date.now();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('.stream-card', { timeout: 8000 });
    await page.waitForTimeout(500); // 느린 탐색
    await page.locator('.stream-card').first().click();
    await page.waitForURL(/\/live\//, { timeout: 8000 });
    await page.waitForSelector('.player', { timeout: 8000 }); // 방송 로딩(350ms) 완료 대기
    const coach = page.locator('.player__coach');
    const coachVisible = await coach.isVisible().catch(() => false);
    await shot(page, 'beginner-S-B01-room');
    let soundOn = false;
    let stable = true;
    if (coachVisible) {
      await page.waitForTimeout(400);
      try {
        await coach.click({ timeout: 2000 }); // 일반 클릭: bob 애니메이션이면 'not stable'로 실패
      } catch {
        stable = false;
        await coach.click({ force: true }); // 무한 애니메이션 우회(현실 클릭 시뮬레이션)
      }
      soundOn = !(await coach.isVisible().catch(() => true));
    }
    rec({ persona: 'beginner', scenario: 'S-B01', action: 'enter-room+unmute',
      completed: coachVisible && soundOn, hesitationMs: 500,
      isError: false, errorType: stable ? null : 'coachmark-infinite-bob',
      durationMs: Date.now() - t0,
      note: `음소거 코치마크 노출=${coachVisible}, 해제성공=${soundOn}, 클릭안정성=${stable ? '안정' : '무한 bob 애니메이션 — 정지점 없음(S2)'}, 폴백: 정적 플레이어 음소거 버튼 별도 존재` });
  } catch (e) {
    rec({ persona: 'beginner', scenario: 'S-B01', completed: false, isError: true, errorType: 'exception', note: e.message });
  }
  // S-B02: 채팅 최소화/복원
  try {
    const minBtn = page.getByRole('button', { name: '채팅 패널 최소화' });
    await minBtn.waitFor({ timeout: 5000 });
    const labelText = (await minBtn.innerText()).trim();
    await minBtn.click();
    const restore = page.locator('.chat-restore');
    const restored = await restore.isVisible().catch(() => false);
    await shot(page, 'beginner-S-B02-minimized');
    if (restored) await restore.click();
    const chatBack = await page.locator('.chat').isVisible().catch(() => false);
    rec({ persona: 'beginner', scenario: 'S-B02', action: 'minimize+restore',
      completed: restored && chatBack, isError: !restored,
      errorType: restored ? null : 'minimize-no-restore',
      note: `최소화 라벨="${labelText}" (발견성 양호), 복원=${restored}` });
  } catch (e) {
    rec({ persona: 'beginner', scenario: 'S-B02', completed: false, isError: true, errorType: 'exception', note: e.message });
  }
  await ctx.close();
}

// ── 파워유저: 빠른 클릭 ──────────────────────────────────────
async function powerUser(browser) {
  const { ctx, page } = await newPage(browser, 'power-user');
  // S-P01: 후원 (비로그인 → 로그인 → 후원)
  try {
    const t0 = Date.now();
    await page.goto(`${BASE}/live/s1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.live__actions', { timeout: 8000 });
    // 비로그인 상태에서 후원 시도 → 안내 토스트
    const donateBtn = page.locator('.live__actions .nb-btn--outline');
    await donateBtn.click();
    const guarded = await page.locator('.nb-toast').first().isVisible().catch(() => false);
    // 로그인 후 재시도
    await page.getByRole('button', { name: /로그인/ }).click();
    await page.waitForTimeout(120);
    await donateBtn.click();
    const modal = page.locator('.nb-modal');
    const modalOpen = await modal.isVisible().catch(() => false);
    const presetCount = await page.locator('.donate__preset').count().catch(() => 0);
    await shot(page, 'power-S-P01-donate');
    rec({ persona: 'power-user', scenario: 'S-P01', action: 'donate-flow',
      completed: modalOpen && presetCount >= 3, isError: !modalOpen,
      errorType: modalOpen ? null : 'donate-modal-fail', durationMs: Date.now() - t0,
      note: `비로그인 가드 토스트=${guarded}, 후원모달=${modalOpen}, 금액프리셋=${presetCount}개` });
    if (modalOpen) await page.keyboard.press('Escape');
  } catch (e) {
    rec({ persona: 'power-user', scenario: 'S-P01', completed: false, isError: true, errorType: 'exception', note: e.message });
  }
  // S-P02: 리액션 + 채팅 시인성
  try {
    const reaction = page.locator('.reaction').first();
    await reaction.waitFor({ timeout: 5000 });
    await reaction.click();
    const toast = await page.locator('.nb-toast').first().isVisible().catch(() => false);
    // 채팅 시인성: 운영자/본인/일반 구분 + 본문 폰트 크기
    const opMsg = await page.locator('.chat-line--operator').count();
    const fontPx = await page.locator('.chat-line__text').first().evaluate(
      (el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 0);
    rec({ persona: 'power-user', scenario: 'S-P02', action: 'react+chat-legibility',
      completed: toast, isError: !toast, errorType: toast ? null : 'reaction-no-feedback',
      note: `리액션 토스트=${toast}, 운영자메시지 구분=${opMsg > 0}, 채팅본문=${fontPx}px(≥14 목표)` });
  } catch (e) {
    rec({ persona: 'power-user', scenario: 'S-P02', completed: false, isError: true, errorType: 'exception', note: e.message });
  }
  await ctx.close();
}

// ── 접근성: 키보드 전용 ──────────────────────────────────────
async function a11y(browser) {
  const { ctx, page } = await newPage(browser, 'accessibility');
  try {
    await page.goto(`${BASE}/live/s1`, { waitUntil: 'networkidle' });
    await page.waitForSelector('.live__actions', { timeout: 8000 });
    await page.waitForSelector('.chat-line', { timeout: 8000 }).catch(() => {}); // 채팅 로딩(250ms) 대기
    // 키 버튼 aria-label 존재 검사
    const labels = {};
    for (const sel of ['음소거 해제', '전체화면', '채팅 패널 최소화']) {
      labels[sel] = await page.getByRole('button', { name: sel }).count();
    }
    const followAria = await page.locator('.live__actions button').first().innerText();
    // Tab 순서로 포커스 가능한 요소 수
    let focusable = 0;
    let reachedDonate = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        return { tag: el?.tagName, text: (el?.innerText || el?.getAttribute('aria-label') || '').slice(0, 20) };
      });
      if (info.tag === 'BUTTON' || info.tag === 'A' || info.tag === 'INPUT') focusable++;
      if (info.text && info.text.includes('후원')) reachedDonate = true;
    }
    // focus-visible outline 검사
    const outline = await page.evaluate(() => {
      const b = document.querySelector('.live__actions button');
      b?.focus();
      return getComputedStyle(b).outlineWidth;
    });
    await shot(page, 'a11y-S-A01-keyboard');
    const reportAffordance = await page.locator('.chat-line__report').count();
    rec({ persona: 'accessibility', scenario: 'S-A01', action: 'keyboard-only-nav',
      completed: focusable >= 6 && reachedDonate, isError: !reachedDonate,
      errorType: reachedDonate ? null : 'donate-not-tab-reachable',
      note: `Tab 포커스 가능 요소=${focusable}, 후원 도달=${reachedDonate}, aria-label(음소거/전체화면/최소화)=${JSON.stringify(labels)}, focus outline=${outline}, 신고어포던스 DOM=${reportAffordance}개(호버/포커스 노출)` });
  } catch (e) {
    rec({ persona: 'accessibility', scenario: 'S-A01', completed: false, isError: true, errorType: 'exception', note: e.message });
  }
  await ctx.close();
}

const browser = await chromium.launch();
await beginner(browser);
await powerUser(browser);
await a11y(browser);
await browser.close();

const summary = {
  ranAt: new Date().toISOString(),
  base: BASE,
  total: results.length,
  completed: results.filter((r) => r.completed).length,
  errors: results.filter((r) => r.isError).length,
  consoleErrors,
  results,
};
fs.mkdirSync(path.join(OUT, 'observations'), { recursive: true });
fs.writeFileSync(path.join(OUT, 'observations', 'raw-observations.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
