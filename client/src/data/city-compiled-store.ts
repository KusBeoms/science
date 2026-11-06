// 빌드 결과(city.compiled.json)의 단일 보관소와 로더. boot.ts 가 source 검증 뒤 한 번 채우고, 렌더(render/citygen)는 getCityCompiled() 로 읽는다.
// 이 모듈은 타입과 상수만 import 한다(도시·월드 모듈을 실행시키지 않음).
//
// boot.ts 연결 방법(boot.ts 는 이 작업이 수정하지 않는다):
//   import {loadCompiled} from './data/city-compiled-store.js';
//   import {setCityCompiled} from './data/city-compiled-store.js';
//   ... loadCitySource 성공 뒤 setCitySource(r.source) 직후:
//   const c = await loadCompiled({expectSourceHash: <원본 해시가 있으면>});
//   if (!c.ok) { showError(c); return c; }       // 폴백 없음: 같은 오류 화면에 kind/message/detail 을 그대로 쓴다
//   setCityCompiled(c.compiled);
//   await load();                                  // main.js
//   게임이 장면을 만들 때: buildCityFromCompiled(getCityCompiled(), G.scene)  (render/citygen/index.ts)
import {CITY_COMPILED_PATH, SUPPORTED_SCHEMA_VERSIONS} from './city-schema.js';
import {CITY_COMPILED_VERSION, type CityCompiled} from './city-compiled.js';

export const COMPILED_LOAD_TIMEOUT_MS = 20000;

export type CompiledFailKind = 'not-found' | 'http' | 'network' | 'timeout' | 'invalid-json' | 'unsupported-version' | 'invalid' | 'stale';
export type CompiledLoad =
  | {ok: true; compiled: CityCompiled}
  | {ok: false; kind: CompiledFailKind; message: string; detail?: string};

const fail = (kind: CompiledFailKind, message: string, detail?: string): CompiledLoad => ({ok: false, kind, message, detail});

let current: CityCompiled | null = null;

/** 한 번만 설정 가능(부분 갱신 금지). 이미 있으면 던진다 */
export function setCityCompiled(c: CityCompiled): void {
  if (current) throw new Error('city compiled 는 이미 설정되었습니다');
  const v = checkCompiled(c);
  if (!v.ok) throw new Error('city compiled 검증 실패: ' + v.message + (v.detail ? ' — ' + v.detail : ''));
  current = c;
}
export const hasCityCompiled = (): boolean => current !== null;
export function getCityCompiled(): CityCompiled {
  if (!current) throw new Error('city compiled 가 아직 로드되지 않았습니다 (boot.ts 를 거치지 않음)');
  return current;
}
/** 테스트 전용 초기화 */
export function resetCityCompiledForTest(): void {
  current = null;
}

const isArr = (v: unknown) => Array.isArray(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** 헤더(버전 3종·chunkSize)와 필수 배열의 존재만 확인한다. 내부 값의 정밀 검증은 렌더가 청크 단위로 하며 불량은 통계(bad*)로 남긴다 */
export function checkCompiled(raw: unknown): {ok: true} | {ok: false; kind: CompiledFailKind; message: string; detail?: string} {
  if (!isObj(raw)) return {ok: false, kind: 'invalid', message: '빌드 결과가 객체가 아닙니다'};
  const h = raw.header;
  if (!isObj(h)) return {ok: false, kind: 'invalid', message: '헤더(header)가 없습니다'};
  if (h.compiledVersion !== CITY_COMPILED_VERSION)
    return {ok: false, kind: 'unsupported-version', message: '지원하지 않는 빌드 결과 버전입니다', detail: `compiledVersion=${String(h.compiledVersion)} (지원 ${CITY_COMPILED_VERSION})`};
  if (typeof h.schemaVersion !== 'number' || !SUPPORTED_SCHEMA_VERSIONS.includes(h.schemaVersion))
    return {ok: false, kind: 'unsupported-version', message: '지원하지 않는 원본 스키마 버전입니다', detail: `schemaVersion=${String(h.schemaVersion)}`};
  if (typeof h.chunkSize !== 'number' || !Number.isFinite(h.chunkSize) || h.chunkSize <= 0)
    return {ok: false, kind: 'invalid', message: 'header.chunkSize 가 올바르지 않습니다', detail: String(h.chunkSize)};
  for (const k of ['ribbons', 'placements', 'colliders', 'roads'])
    if (!isArr(raw[k])) return {ok: false, kind: 'invalid', message: `필수 배열 ${k} 가 없습니다`};
  return {ok: true};
}

export interface LoadCompiledOptions {
  /** 기본 CITY_COMPILED_PATH (문서 base 기준 상대 경로) */
  path?: string;
  /** 상대 URL 해석 기준(기본 document.baseURI → /steal-an-planet/ 하위 경로 지원) */
  baseURI?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  /** 원본(source) 해시. 주어지고 header.sourceHash 와 다르면 'stale' (다시 빌드해야 함) */
  expectSourceHash?: string;
}

/** 배포된 city.compiled.json 을 받아 검증한다. 저장은 하지 않는다(setCityCompiled 는 호출자가). 오류 분류는 boot.ts 와 같다 */
export async function loadCompiled(opt: LoadCompiledOptions = {}): Promise<CompiledLoad> {
  let url: string;
  try {
    url = new URL(opt.path ?? CITY_COMPILED_PATH, opt.baseURI ?? document.baseURI).href;
  } catch (e) {
    return fail('network', '빌드 결과 주소를 만들 수 없습니다', String(e));
  }
  const ctl = new AbortController();
  let timedOut = false;
  const ms = opt.timeoutMs ?? COMPILED_LOAD_TIMEOUT_MS;
  const timer = setTimeout(() => ((timedOut = true), ctl.abort()), ms);
  try {
    const res = await (opt.fetchImpl ?? fetch)(url, {cache: 'no-cache', signal: ctl.signal});
    if (res.status === 404) return fail('not-found', '도시 빌드 결과 파일을 찾을 수 없습니다 (404)', url);
    if (!res.ok) return fail('http', `도시 빌드 결과를 받지 못했습니다 (HTTP ${res.status})`, url);
    let raw: unknown;
    try {
      raw = JSON.parse(await res.text());
    } catch (e) {
      if (timedOut) throw e;
      return fail('invalid-json', '도시 빌드 결과가 올바른 JSON 이 아닙니다', `${url} — ${String(e)}`);
    }
    const v = checkCompiled(raw);
    if (!v.ok) return fail(v.kind, v.message, v.detail ?? url);
    const c = raw as CityCompiled;
    if (opt.expectSourceHash !== undefined && c.header.sourceHash !== opt.expectSourceHash)
      return fail('stale', '빌드 결과가 원본과 맞지 않습니다 (다시 빌드 필요)', `header.sourceHash=${c.header.sourceHash} ≠ ${opt.expectSourceHash}`);
    return {ok: true, compiled: c};
  } catch (e) {
    if (timedOut) return fail('timeout', `도시 빌드 결과를 ${ms / 1000}초 안에 받지 못했습니다`, url);
    return fail('network', '도시 빌드 결과를 받는 중 네트워크 오류가 발생했습니다', `${url} — ${String(e)}`);
  } finally {
    clearTimeout(timer);
  }
}
