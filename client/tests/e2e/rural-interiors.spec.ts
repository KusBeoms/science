// Rendered rural/fringe houses reuse the lazy city interior with their real porch/deck elevation.
import {test, expect, unexpected} from './fixtures';

test('every rendered rural/fringe home has a registered, walkable entrance and stable city prefix', async ({game}) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  const r = await game.page.evaluate(async () => {
    const E = await import('/js/data/interiors.js'), R = await import('/js/data/rural-entries.js'),
      T = await import('/js/core/terrain.js'), V = await import('/js/systems/vehicle.js'), C = await import('/js/data/city.js');
    const {G} = (window as any).__game;
    // Architectural access is checked separately from temporary parked-car obstruction below.
    V.VEH.slice().forEach(V.removeVeh);
    const fails: any[] = [];
    for (const s of R.RURAL_ENTRIES) {
      if (!E.ENTERABLES.some(e => e.id === s.id && e.rural === s)) fails.push({id: s.id, reason: 'not registered'});
      let prev = s.landing;
      for (let i = 0; i <= 40; i++) {
        const f = i / 40, x = s.landing.x + (s.door.x - s.landing.x) * f, z = s.landing.z + (s.door.z - s.landing.z) * f,
          y = T.groundH(x, z, prev.y);
        if (!Number.isFinite(y) || T.solidAt(x, z, .42, y) || !T.walkable(prev.x, prev.z, prev.y, x, z)) {
          fails.push({id: s.id, reason: 'approach', x, y, z}); break;
        }
        prev = {x, y, z};
      }
      if (Math.abs(prev.y - s.door.y) > .05) fails.push({id: s.id, reason: 'door datum'});
    }
    const counts = Object.fromEntries(['rural-house', 'mountain-lodge', 'fringe'].map(k => [k, R.RURAL_ENTRIES.filter(s => s.group === k).length]));
    return {fails, counts, cottages: G.scene.getObjectByName('rural-landscape').userData.counts.cottages,
      fringe: G.scene.getObjectByName('city-fringe').userData.buildings,
      cityPreserved: C.CITY_BUILDINGS.every((b, i) => E.ENTERABLES[i].id === b.id),
      unique: new Set(E.ENTERABLES.map(e => e.id)).size === E.ENTERABLES.length};
  });
  expect(r.fails).toEqual([]);
  expect(r.counts['rural-house']).toBe(r.cottages);
  expect(r.counts['rural-house']).toBeGreaterThanOrEqual(44);
  expect(r.counts['mountain-lodge']).toBe(1);
  expect(r.counts.fringe).toBe(r.fringe);
  expect(r.counts.fringe).toBeGreaterThanOrEqual(90);
  expect(r.cityPreserved && r.unique).toBe(true);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('all accepted houses create one room lazily, return to the actual porch, and release room geometry', async ({game}) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  const r = await game.page.evaluate(async () => {
    const E = await import('/js/data/interiors.js'), B = await import('/js/game/interior.js'), T = await import('/js/core/terrain.js'),
      V = await import('/js/systems/vehicle.js'), X = await import('/js/core/exit-position.js'), Runtime = await import('/js/core/runtime.js');
    const {G} = (window as any).__game;
    V.VEH.slice().forEach(V.removeVeh);
    const count = G.scene.children.length, fails: any[] = [];
    let visited = 0;
    for (let i = E.CITY_ENTERABLE_COUNT; i < E.ENTERABLES.length; i++) {
      const e = E.ENTERABLES[i];
      G.me.pos.set(e.door.x, e.door.y, e.door.z);
      const target = B.enterIt.find(G.me);
      if (!target || (target as any).i !== i) { fails.push({id: e.id, reason: 'prompt'}); continue; }
      B.enterBuilding(i);
      const inside = G.inside, geometry = new Set<any>();
      if (!inside || G.scene.children.length !== count + 1) { fails.push({id: e.id, reason: 'room count'}); continue; }
      let disposed = 0;
      inside.grp.traverse((o: any) => { if (o.geometry) geometry.add(o.geometry); });
      geometry.forEach(g => g.addEventListener('dispose', () => disposed++));
      const left = B.leaveBuilding();
      if (!left || G.inside || inside.grp.parent || disposed !== geometry.size || G.scene.children.length !== count ||
          Math.abs(G.me.pos.y - e.door.y) > .05 || !X.walkingExit(G.me.pos.x, G.me.pos.z, G.me.pos.y) || Runtime.paused()) {
        fails.push({id: e.id, reason: 'exit', pos: G.me.pos.toArray()});
      }
      visited++;
    }
    return {fails, visited, total: E.ENTERABLES.length - E.CITY_ENTERABLE_COUNT};
  });
  expect(r.fails).toEqual([]);
  expect(r.visited).toBe(r.total);
  expect(r.visited).toBeGreaterThanOrEqual(135);
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});

test('a car blocking the porch uses a free exit, and a fully blocked exit keeps the room intact', async ({game}) => {
  await game.open('?debug=1');
  await game.page.click('#mstart');
  const r = await game.page.evaluate(async () => {
    const E = await import('/js/data/interiors.js'), B = await import('/js/game/interior.js'), T = await import('/js/core/terrain.js'),
      V = await import('/js/systems/vehicle.js'), Runtime = await import('/js/core/runtime.js'), M = await import('/js/systems/move.js');
    const {G} = (window as any).__game;
    V.VEH.slice().forEach(V.removeVeh);
    const i = E.ENTERABLES.findIndex(e => e.rural?.group === 'rural-house'), e = E.ENTERABLES[i];
    const car = V.spawnVeh({t: 'sedan', x: e.door.x, z: e.door.z, own: -1});
    car.y = e.door.y; V.placeMesh(car); V.syncSolid(car);
    G.me.pos.set(e.door.x, e.door.y, e.door.z); B.enterBuilding(i);
    const left = B.leaveBuilding(), free = !T.solidAt(G.me.pos.x, G.me.pos.z, .42, G.me.pos.y);
    const from = G.me.pos.clone();
    for (let a = 0; a < 16; a++) {
      const angle = a * Math.PI / 8, x = from.x + Math.cos(angle) * 1.2, z = from.z + Math.sin(angle) * 1.2;
      if (T.solidAt(x, z, .42, from.y) || !T.walkable(from.x, from.z, from.y, x, z)) continue;
      G.yaw = Math.atan2(-Math.cos(angle), -Math.sin(angle)); G.keys.KeyW = true;
      for (let step = 0; step < 10; step++) M.movePlayer(.02, step * .02);
      G.keys.KeyW = false;
      if (G.me.pos.distanceTo(from) > .3) break;
    }
    const moved = G.me.pos.distanceTo(from) > .3, pause = Runtime.paused();
    V.removeVeh(car);
    G.me.pos.set(e.door.x, e.door.y, e.door.z); B.enterBuilding(i);
    const room = G.inside.grp;
    const block = T.addDynSolid(e.door.x - 12, e.door.z - 12, e.door.x + 12, e.door.z + 12);
    const refused = !B.leaveBuilding(), intact = G.inside?.grp === room && room.parent === G.scene && T.groundH(G.me.pos.x, G.me.pos.z) === 0;
    T.dropDynSolid(block);
    const retry = B.leaveBuilding();
    return {left, free, moved, pause, refused, intact, retry, outside: !G.inside};
  });
  expect(r).toEqual({left: true, free: true, moved: true, pause: false, refused: true, intact: true, retry: true, outside: true});
  expect(unexpected(game.problems).pageerrors).toEqual([]);
});
