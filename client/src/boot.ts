// 새 진입점(계획 10-3/13): 입력 읽기 → 순수 검증 → source 확정 → 게임 entry 동적 import.
// world/state/main 을 정적 import 하지 않는다(state.ts 가 import 시점에 세이브를 읽기 때문).
// 실패 시 폴백 없이 오류 화면(원인 표시). index.html 연결: <script type="module" src="js/main.js"> → src="js/boot.js" (한 줄)
import {CITY_SOURCE_PATH, type CitySource} from './data/city-schema.js';
import {validateCitySource, type ValidationError} from './data/city-validate.js';
import {setCitySource} from './data/city-source.js';

/** true 가 되면 city.source.json 이 없을 때 오류 화면. 새 도심이 게임에 연결되기 전까지 false(로딩 생략, main 만 실행) */
export const REQUIRE_CITY_SOURCE = false;
export const LOAD_TIMEOUT_MS = 15000;
export const LOCAL_DRAFT_KEY = 'steal-planet.city-draft.v1';

export type BootFailKind = 'not-found' | 'http' | 'network' | 'timeout' | 'invalid-json' | 'unsupported-version' | 'invalid' | 'local-missing';
export type LoadResult =
  | {ok: true; source: CitySource; origin: 'deployed' | 'local'}
  | {ok: false; kind: BootFailKind; message: string; detail?: string; errors?: ValidationError[]};

export interface BootOptions {
  /** 도시 원본 필수 여부(기본 REQUIRE_CITY_SOURCE) */
  require?: boolean;
  /** 쿼리 문자열(기본 location.search). ?city=local 일 때만 편집 초안을 쓴다 */
  search?: string;
  /** 상대 URL 해석 기준(기본 document.baseURI → /steal-an-planet/ 하위 경로 지원) */
  baseURI?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  storage?: Pick<Storage, 'getItem'> | null;
  /** 게임 entry 로더(기본 import('./main.js')). 테스트에서 대체 */
  importMain?: () => Promise<unknown>;
  /** 오류 표시(기본 DOM 오류 화면) */
  showError?: (r: Extract<LoadResult, {ok: false}>) => void;
}

const fail = (kind: BootFailKind, message: string, detail?: string, errors?: ValidationError[]): LoadResult => ({ok: false, kind, message, detail, errors});

/** 문서 base 기준 배포 JSON URL. 앞 슬래시 없는 상대 경로 → 하위 경로에서도 정상 */
export function citySourceUrl(baseURI?: string): string {
  return new URL(CITY_SOURCE_PATH, baseURI ?? document.baseURI).href;
}

/** 파싱된 값을 검증해 LoadResult 로. 아무 것도 저장하지 않는다 */
export function verifySource(raw: unknown, origin: 'deployed' | 'local'): LoadResult {
  const v = validateCitySource(raw);
  if (v.ok) return {ok: true, source: raw as CitySource, origin};
  if (v.errors.some(e => e.code === 'unsupported-version')) return fail('unsupported-version', '지원하지 않는 도시 데이터 버전입니다', v.errors[0].msg, v.errors);
  const first = v.errors[0];
  return fail('invalid', `도시 데이터 검증 실패 (${v.errors.length}건)`, `${first.path}: ${first.msg}`, v.errors);
}

/** 입력 읽기 + 검증. source 는 설정하지 않는다(설정은 bootGame 이 성공 시 한 번만) */
export async function loadCitySource(opt: BootOptions = {}): Promise<LoadResult> {
  const search = opt.search ?? (typeof location !== 'undefined' ? location.search : '');
  if (new URLSearchParams(search).get('city') === 'local') {
    let text: string | null = null;
    try {
      const st = opt.storage === undefined ? localStorage : opt.storage;
      text = st ? st.getItem(LOCAL_DRAFT_KEY) : null;
    } catch (e) {
      return fail('local-missing', '로컬 편집 초안에 접근할 수 없습니다', String(e));
    }
    if (!text) return fail('local-missing', '저장된 로컬 편집 초안이 없습니다', `localStorage["${LOCAL_DRAFT_KEY}"]`);
    let raw: unknown;
    try { raw = JSON.parse(text); } catch (e) { return fail('invalid-json', '로컬 편집 초안이 올바른 JSON 이 아닙니다', String(e)); }
    return verifySource(raw, 'local');
  }
  let url: string;
  try { url = citySourceUrl(opt.baseURI); } catch (e) { return fail('network', '도시 데이터 주소를 만들 수 없습니다', String(e)); }
  const ctl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, opt.timeoutMs ?? LOAD_TIMEOUT_MS);
  try {
    const res = await (opt.fetchImpl ?? fetch)(url, {cache: 'no-cache', signal: ctl.signal});
    if (res.status === 404) return fail('not-found', '도시 데이터 파일을 찾을 수 없습니다 (404)', url);
    if (!res.ok) return fail('http', `도시 데이터를 받지 못했습니다 (HTTP ${res.status})`, url);
    let raw: unknown;
    try { raw = JSON.parse(await res.text()); } catch (e) {
      if (timedOut) throw e;
      return fail('invalid-json', '도시 데이터가 올바른 JSON 이 아닙니다', `${url} — ${String(e)}`);
    }
    return verifySource(raw, 'deployed');
  } catch (e) {
    if (timedOut) return fail('timeout', `도시 데이터를 ${(opt.timeoutMs ?? LOAD_TIMEOUT_MS) / 1000}초 안에 받지 못했습니다`, url);
    return fail('network', '도시 데이터를 받는 중 네트워크 오류가 발생했습니다', `${url} — ${String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}

/** DOM 오류 화면(폴백 없음). 원인과 상세를 한국어로 표시 */
export function showBootError(r: Extract<LoadResult, {ok: false}>): void {
  const box = document.createElement('div');
  box.id = 'boot-error';
  box.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;background:#10131a;color:#f2f4f8;font:16px/1.5 sans-serif;text-align:center';
  const lines = [`게임을 시작하지 못했습니다`, r.message, r.detail ?? '', `오류 종류: ${r.kind}`];
  if (r.errors && r.errors.length > 1) lines.push(`그 밖에 ${r.errors.length - 1}건의 문제가 더 있습니다`);
  lines.forEach((t, i) => {
    if (!t) return;
    const p = document.createElement('div');
    p.textContent = t;
    p.style.cssText = i === 0 ? 'font-size:22px;font-weight:700' : i === 2 ? 'font:13px monospace;opacity:.8;max-width:90vw;word-break:break-all' : 'max-width:90vw';
    box.appendChild(p);
  });
  document.body.appendChild(box);
}

export type BootOutcome = {ok: true; origin: 'deployed' | 'local' | 'skipped'} | Extract<LoadResult, {ok: false}>;

/** 전체 부팅. 성공해야만 source 를 설정하고 main 을 불러온다 */
export async function bootGame(opt: BootOptions = {}): Promise<BootOutcome> {
  const load = opt.importMain ?? (() => import('./main.js'));
  const search = opt.search ?? (typeof location !== 'undefined' ? location.search : '');
  const wantsLocal = new URLSearchParams(search).get('city') === 'local';
  if (!(opt.require ?? REQUIRE_CITY_SOURCE) && !wantsLocal) {
    await load();
    return {ok: true, origin: 'skipped'};
  }
  const r = await loadCitySource(opt);
  if (!r.ok) {
    (opt.showError ?? showBootError)(r);
    return r;
  }
  setCitySource(r.source);
  await load();
  return {ok: true, origin: r.origin};
}

// 자동 실행: 테스트가 import 만 하고 싶을 때 globalThis.__BOOT_NO_AUTORUN__ 를 먼저 true 로 둔다
if (!(globalThis as {__BOOT_NO_AUTORUN__?: boolean}).__BOOT_NO_AUTORUN__) void bootGame();
