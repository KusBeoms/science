// 도구(스위트 아님): WORLDMAP=1 로만 돌아가 월드 전체를 위에서 찍는다 → tests/out/worldmap-top.png
import {test, OUT} from './fixtures';
import fs from 'node:fs';
import path from 'node:path';
import {mapReview} from './map-review';
test.skip(!process.env.WORLDMAP, 'tool');
test('worldmap top-down', async ({game}) => {
  test.setTimeout(300_000);
  const {page} = game;
  const X0 = -1400, X1 = 1500, Z0 = -1300, Z1 = 2050, PX = 0.4; // W6: 섬 12개 + 도시 + 야생지 (화면은 0.4 배)
  await page.setViewportSize({width: Math.round((X1 - X0) * PX), height: Math.round((Z1 - Z0) * PX)});
  await game.open('?debug=1');
  await page.click('#mstart');
  await page.evaluate(() => { const g = (window as any).__game; g.unlockAll(); g.G.cycT = 100; g.G.night = 0; });
  const image = await mapReview(page, [X0,X1,Z0,Z1], Math.round((X1-X0)*PX), 5, true);
  fs.writeFileSync(`${OUT}/worldmap-top.png`,Buffer.from(image.split(',')[1],'base64'));
  const data = await page.evaluate(async () => {
    const P = await import('/js/data/places.js'), S = await import('/js/data/sectors.js'), C = await import('/js/data/city.js');
    const {G}=(window as any).__game;
    return {places: P.PLACES.map((p: any) => ({id: p.id, icon: p.icon, name: p.name, x: p.x, z: p.z})), sectors: S.SECTORS.map((s: any, i: number) => ({n: i + 1, icon: s.icon, name: s.name, x: s.center.x, z: s.center.z})), art:{cityBuildings:C.CITY_BUILDINGS.length,fringeBuildings:G.scene.getObjectByName('city-fringe').userData.buildings,rural:G.scene.getObjectByName('rural-landscape').userData.counts}};
  });
  fs.writeFileSync(`${OUT}/worldmap-stats.json`,JSON.stringify(data.art,null,2));
  console.log('map art',JSON.stringify(data.art));
  const b64 = fs.readFileSync(`${OUT}/worldmap-top.png`).toString('base64');
  const html = posterHtml(b64, data, {X0, X1, Z0, Z1});
  const pg = await page.context().newPage();
  await pg.setViewportSize({width: 2000, height: 2600});
  await pg.setContent(html);
  await pg.waitForTimeout(500);
  const h = await pg.evaluate(() => document.getElementById('poster')!.getBoundingClientRect().height);
  await pg.setViewportSize({width: 2000, height: Math.ceil(h)});
  const out = path.resolve(__dirname, '../../../docs/assets/world-map.jpg');
  await pg.screenshot({path: out, type: 'jpeg', quality: 92, clip: {x: 0, y: 0, width: 2000, height: Math.ceil(h)}});
  console.log('saved', out);
});

const DESC: Record<string, string> = {
  base: '내 기지 — 훔친 행성을 키우는 집', plaza: '중앙 광장 — 분수와 만남의 장소', port: '우주항 — 우주선 출발, 구역 이동', market: '암시장 — 수상한 물건을 사고파는 곳',
  hangar: '정비소·딜러 — 차량 구경과 튜닝', hall: '시청 — 도시의 중심 건물', mall: '쇼핑몰 — 옷·잡화 쇼핑', tv: '전망 타워 — 도시 전체가 한눈에', museum: '박물관 — 전시 구경',
  cinema: '영화관 — 영화 한 편', stadium: '축구 경기장 — FC 온라인 규격 105×68, 7대7 10분 경기', ferris: '대관람차 — 놀이동산의 상징', theme: '테마파크 — 놀이기구와 미니게임',
  park: '중앙 공원 — 산책·피크닉·체스', aqua: '수족관 — 바다 생물 구경', light: '등대 — 해안의 불빛', nightmkt: '야시장 광장 — 푸드트럭과 먹거리', leisure: '레저 광장 — 농구·스케이트·클라이밍',
  playground: '놀이터 — 동네 아이들의 쉼터', harbor: '항구 — 부두와 크레인', seaside: '해수욕장 — 파라솔과 서핑', beach: '해변 — 남쪽 모래사장', shopst: '상가 골목 — 자동차 대리점·자전거·옷·편의점·펫샵·꽃집·빵집·전자제품·서점·약국·주유소·세차장',
  bridge: '남쪽 다리 — 도시에서 야생지로', plains: '평야 — 탁 트인 들판', farm: '시골 마을 — 농장·풍차·동물들', lake: '호수 — 낚시와 수영, 둘레 도로', desert: '사막 — 모래 언덕',
  mount: '등산로 입구 — 정상에 깃발이 있다', prison: '교도소 — 잡히면 갇히지만 탈출구가 있다',
};
const CITY = ['base', 'plaza', 'port', 'market', 'hangar', 'hall', 'mall', 'tv', 'museum', 'cinema', 'stadium', 'ferris', 'theme', 'park', 'aqua', 'light', 'nightmkt', 'leisure', 'playground', 'harbor', 'seaside', 'beach', 'shopst'],
  WILD = ['bridge', 'plains', 'farm', 'lake', 'desert', 'mount', 'prison'];
function posterHtml(b64: string, data: any, v: {X0: number; X1: number; Z0: number; Z1: number}) {
  const W = 1300, sc = W / (v.X1 - v.X0), H = Math.round((v.Z1 - v.Z0) * sc);
  const at = (x: number, z: number) => `left:${((x - v.X0) * sc).toFixed(0)}px;top:${((z - v.Z0) * sc).toFixed(0)}px`;
  const P = (id: string) => data.places.find((p: any) => p.id === id);
  const icon = (p: any) => (p.id === 'shopst' ? '🛒' : p.icon);
  const pins = [...CITY, ...WILD].map(P).filter(Boolean).map((p: any) => `<div class="pin" style="${at(p.x, p.z)}"><b>${icon(p)}</b><i>${p.name.split(' ')[0]}</i></div>`).join('');
  const secs = data.sectors.map((s: any) => `<div class="sec" style="${at(s.x, s.z)}"><b>${s.icon}</b><i>${s.n}. ${s.name}</i></div>`).join('');
  const li = (ids: string[]) => ids.map(P).filter(Boolean).map((p: any) => `<li><b>${icon(p)}</b><span>${DESC[p.id] ?? p.name}</span></li>`).join('');
  const secList = data.sectors.map((s: any) => `<li><b>${s.icon}</b><span><em>${s.n}</em> ${s.name}</span></li>`).join('');
  return `<!doctype html><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f4e6c1;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#3b2a14}
  #poster{width:2000px;padding:40px;background:linear-gradient(#f9efd0,#f1dfae);border:14px solid #c8531d;border-radius:36px}
  h1{margin:0;text-align:center;font-size:76px;letter-spacing:4px;color:#fff;background:#e5483f;border-radius:24px;padding:18px;box-shadow:0 8px 0 #9e2a23;text-shadow:0 4px 0 #9e2a23}
  .sub{text-align:center;font-size:28px;margin:18px 0 26px;color:#7a5a2a}
  .row{display:flex;gap:30px;align-items:flex-start}
  .map{position:relative;width:${W}px;height:${H}px;border:10px solid #3b2a14;border-radius:26px;overflow:hidden;flex:none;background:#2d5a8c}
  .map img{width:100%;height:100%;display:block}
  .pin{position:absolute;transform:translate(-50%,-50%);text-align:center}
  .pin b{display:block;width:44px;height:44px;line-height:40px;font-size:26px;font-weight:400;background:#fff;border:3px solid #e5483f;border-radius:50%;margin:auto;box-shadow:0 3px 6px #0008}
  .pin i{display:block;font-style:normal;font-size:19px;font-weight:800;color:#fff;text-shadow:0 0 4px #000,0 0 4px #000,0 0 6px #000;white-space:nowrap;margin-top:2px}
  .sec{position:absolute;transform:translate(-50%,-50%);text-align:center;background:#000a;border-radius:18px;padding:6px 14px;color:#fff;border:3px solid #ffd24a}
  .sec b{font-size:38px;font-weight:400;display:block}.sec i{font-style:normal;font-size:22px;font-weight:800;white-space:nowrap}
  .side{flex:1;min-width:0}
  .card{background:#fffaf0;border:5px solid #3b2a14;border-radius:22px;padding:16px 20px;margin-bottom:22px;box-shadow:0 6px 0 #0003}
  .card h2{margin:0 0 10px;font-size:34px;color:#c8531d}
  ul{list-style:none;margin:0;padding:0}li{display:flex;gap:12px;align-items:flex-start;padding:6px 0;border-bottom:2px dashed #d9c18a;font-size:22px;line-height:1.3}
  li:last-child{border:0}li b{font-size:30px;font-weight:400;width:38px;flex:none;text-align:center}li em{display:inline-block;min-width:26px;background:#3b2a14;color:#ffd24a;border-radius:12px;text-align:center;font-style:normal;font-weight:800;margin-right:6px}
  .compass{position:absolute;right:20px;top:20px;width:92px;height:92px;border-radius:50%;background:#fffaf0e8;border:5px solid #3b2a14;text-align:center;font-weight:900;font-size:34px;line-height:1}
  .compass span{display:block;margin-top:6px}.compass small{display:block;font-size:42px;color:#e5483f}
  .tip{font-size:21px;line-height:1.5}
  </style><div id="poster"><h1>🪐 행성을 훔치다 · 전체 지도</h1><div class="sub">달에서 시작해 도시를 지나 야생지·우주 12구역까지 — 위에서 내려다본 세계</div>
  <div class="row"><div class="map"><img src="data:image/png;base64,${b64}"/>${secs}${pins}<div class="compass"><span>북</span><small>▲</small></div></div>
  <div class="side">
   <div class="card"><h2>🏙️ 중앙 도시</h2><ul>${li(CITY)}</ul></div>
   <div class="card"><h2>🌄 야생지 (남쪽 다리 건너)</h2><ul>${li(WILD)}</ul></div>
   <div class="card"><h2>🪐 우주 12구역 (해금 순서)</h2><ul>${secList}</ul></div>
   <div class="card tip">🚗 차를 몰다 박으면 찌그러지고, 호수·바다에 들어가면 고장 나요<br>⚽ 축구장에서 E를 누르면 경기 시작 (10분)<br>📱 P 키 — 휴대폰: 지도·택시·인터넷·시계<br>🌞 낮 12분 · 🌙 밤 4분</div>
  </div></div></div>`;
}
