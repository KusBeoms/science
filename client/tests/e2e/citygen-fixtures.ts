// citygen 시험용 fixture. 순수 데이터(JSON 직렬화 가능). 지형은 specs 로 기술하고 페이지 안에서 cm 배열로 만든다.
type Src = Record<string, any>;

export interface TerrainSpec { kind: 'flat' | 'slopeZ' | 'hillCenter' | 'wallX'; y?: number; slope?: number; cx?: number; cz?: number; h?: number; r?: number }
export const GRID = {cell: 5, x0: -400, z0: -400, cols: 161, rows: 161};

/** 빈 원본 뼈대 */
export function base(over: Src = {}): Src {
  return {
    schemaVersion: 1, cityRevision: 1, generatorVersion: 1, seed: 7,
    bounds: [[-390, -390], [390, -390], [390, 390], [-390, 390]],
    terrain: {grid: {cell: GRID.cell, x0: GRID.x0, z0: GRID.z0, cols: GRID.cols, rows: GRID.rows, encoding: 'delta-cm-b64', ref: 'data/fixture.json'}, edits: []},
    roads: [], nodes: [], ramps: [], zones: [], parcels: [], buildings: [], anchors: [], parking: [], greenery: [], props: [], exceptions: [],
    ...over,
  };
}
const road = (id: string, cls: string, pts: number[][], curve = 'line', extra: Src = {}) => ({id, cls, pts, curve, ...extra});

export const FIXTURES: Record<string, {src: Src; terrain: TerrainSpec}> = {
  /** 평지 십자 교차로 (arterial1 × collector) + 신호 */
  cross: {
    terrain: {kind: 'flat', y: 3},
    src: base({
      roads: [road('ew', 'arterial1', [[-150, 0], [150, 0]]), road('ns', 'collector', [[0, -150], [0, 150]])],
      nodes: [{id: 'nx', kind: 'signal', at: [0, 0], layer: 0, roads: ['ew', 'ns']}],
    }),
  },
  /** 예각(약 35°) T 교차로 + 직교 T */
  tee: {
    terrain: {kind: 'flat', y: 2},
    src: base({
      roads: [road('main', 'arterial2', [[-150, 0], [150, 0]]), road('acute', 'collector', [[60, 0], [140, 56]]), road('side', 'local', [[-60, 100], [-60, 0]])],
    }),
  },
  /** 언덕을 오르는 굽은 도로: 완만한 지형(성공) */
  hillOk: {
    terrain: {kind: 'slopeZ', y: 0, slope: 0.05},
    src: base({roads: [road('h', 'arterial2', [[-100, -100], [-30, -40], [30, 20], [100, 100]], 'catmull')]}),
  },
  /** 가파른 벽 지형을 곧장 오르는 도로 → 지형 추종 한도 초과 거부 */
  hillBad: {
    terrain: {kind: 'slopeZ', y: 0, slope: 0.28},
    src: base({roads: [road('steep', 'arterial2', [[0, -150], [0, 150]])]}),
  },
  /** 명시 높이가 한도를 넘는 도로 → 경사 거부, 정상 도로는 통과 */
  gradeKeys: {
    terrain: {kind: 'flat', y: 0},
    src: base({roads: [
      road('badramp', 'collector', [[-100, 50], [100, 50]], 'line', {segments: [{id: 'bs', from: 0, to: 1, layer: 0, kind: 'ramp', heights: [{s: 0, y: 0}, {s: 100, y: 20}]}]}),
      road('okramp', 'collector', [[-100, -50], [100, -50]], 'line', {segments: [{id: 'os', from: 0, to: 1, layer: 0, kind: 'ramp', heights: [{s: 0, y: 0}, {s: 120, y: 8}, {s: 200, y: 8}]}]}),
    ]}),
  },
  /** 고가도로: 같은 XZ 에서 지상 도로와 교차하지만 층이 달라 합쳐지지 않는다. 램프는 명시 연결 */
  overpass: {
    terrain: {kind: 'flat', y: 0},
    src: base({
      roads: [
        road('gnd', 'arterial2', [[-150, 0], [150, 0]]),
        road('deck', 'arterial1', [[0, -260], [0, 260]], 'line', {segments: [{id: 'dA', from: 0, to: 1, layer: 1, kind: 'bridge', heights: [{s: 0, y: 7}, {s: 520, y: 7}]}]}),
        road('ramp', 'collector', [[-90, 0], [-60, -60], [0, -120]], 'catmull', {segments: [{id: 'rm', from: 0, to: 2, layer: 1, kind: 'ramp', heights: [{s: 0, y: 0}, {s: 150, y: 7}, {s: 200, y: 7}]}]}),
      ],
      nodes: [{id: 'nr0', kind: 'rampEnd', at: [-90, 0], layer: 0, roads: ['gnd']}, {id: 'nr1', kind: 'rampEnd', at: [0, -120], layer: 1, roads: ['deck']}],
      ramps: [{id: 'rp', road: 'ramp', fromNode: 'nr0', toNode: 'nr1'}],
    }),
  },
  /** 회전교차로: 4방향 + 중앙 로터리 */
  round: {
    terrain: {kind: 'flat', y: 1},
    src: base({
      roads: [road('e', 'arterial2', [[0, 0], [150, 0]]), road('w', 'arterial2', [[-150, 0], [0, 0]]), road('n', 'collector', [[0, -150], [0, 0]]), road('s', 'collector', [[0, 0], [0, 150]])],
      nodes: [{id: 'rb', kind: 'roundabout', at: [0, 0], layer: 0, roads: ['e', 'w', 'n', 's']}],
    }),
  },
  /** pad 와 corridor 편집 시험용 */
  edits: {
    terrain: {kind: 'hillCenter', y: 0, cx: 0, cz: 0, h: 12, r: 120},
    src: base({
      roads: [road('c', 'collector', [[-150, 0], [150, 0]])],
      terrain: {grid: {cell: GRID.cell, x0: GRID.x0, z0: GRID.z0, cols: GRID.cols, rows: GRID.rows, encoding: 'delta-cm-b64', ref: 'data/fixture.json'},
        edits: [{kind: 'pad', id: 'p1', x: 0, z: 100, r: 20, y: 4, falloff: 20}, {kind: 'corridor', id: 'cor', roadId: 'c', cut: 2, fill: 2, shoulder: 3},
          {kind: 'brush', id: 'br', mode: 'smooth', r: 15, strength: 0.5, pts: [[-100, -100], [-50, -100]]}]},
    }),
  },
};
