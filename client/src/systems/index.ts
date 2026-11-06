// 시스템·상호작용 등록 단일 진입점. 새 기능은 모듈을 만들고 여기에 import + register 한 줄씩 추가한다 (호출 순서 = 등록 순서)
import {registerSystem} from './registry.js';
import {registerInteractable} from '../game/interactables.js';
import {CORE_INTERACTABLES} from '../game/interact-core.js';
import {benchIt} from '../game/bench.js';
import {portalIt, portalSystem} from '../game/portal.js';
import {hazardSystem} from './hazards.js';
import {rivalSystem} from './rival.js';
import {audioSystem} from './audio.js';
import {cutsceneSystem} from './cutscene.js';
import {crowdSystem} from './crowd.js';
import {citySystem} from '../render/city/index.js';
import {overpassSystem} from '../render/overpass.js';
import {bridgeSystem} from '../render/bridge.js';
import '../game/goal.js';
import {enterIt, roomIt, interiorSystem} from '../game/interior.js';
import {carIt, carExitIt} from '../game/cars.js';
import {policeSystem} from './police.js';
import {brickIt, jailSystem} from './jail.js';
import {policeAirSystem} from './police-air.js';
import {animalIt, fishIt, wildlifeSystem} from './wildlife.js';
import {messengerSystem} from '../game/messenger.js';
import {estateSystem} from '../game/estate.js';
import '../game/phone.js';
import {summitIt, wildSystem} from './wild.js';
import {soccerIt, soccerSystem} from './soccer.js';
import {vehicleSystem} from './vehicle.js';
import {vehicleStreamSystem} from './vehicle-stream.js';
import {vehicleDamageSystem} from './vehicle-damage.js';
import '../game/car-hud.js';
import {addHudLine} from '../game/hud.js';
import {S} from '../core/state.js';
import {G} from '../core/runtime.js';
import {weatherSystem} from '../render/weather.js';
import {funIt, funPlaySystem} from '../game/fun.js';
import {funSystem} from '../render/city/fun.js';
import {downtownSystem} from '../render/city/downtown.js';
import {shops2System} from '../game/shops2.js';
import {ridesSystem} from '../game/rides.js';
import {petIt, petsSystem} from '../game/pets.js';
import {shopStreetSystem} from '../render/city/shopstreet.js';

CORE_INTERACTABLES.forEach(registerInteractable);
registerInteractable(portalIt);
registerInteractable(benchIt);
registerInteractable(enterIt);
registerInteractable(roomIt);
registerInteractable(carIt);
registerInteractable(carExitIt);
registerInteractable(soccerIt);
registerInteractable(brickIt);
registerInteractable(summitIt);
registerInteractable(animalIt);
registerInteractable(fishIt);
registerInteractable(funIt); // W5 FUN
registerInteractable(petIt);

registerSystem(hazardSystem);
registerSystem(rivalSystem);
registerSystem(portalSystem);
registerSystem(audioSystem);
registerSystem(cutsceneSystem);
registerSystem(crowdSystem);
registerSystem(citySystem);
registerSystem(overpassSystem);
registerSystem(bridgeSystem);
registerSystem(weatherSystem);
registerSystem(interiorSystem);
registerSystem(vehicleSystem);
registerSystem(vehicleStreamSystem); // W8 VEH: 길가 차 거리 스트리밍
registerSystem(vehicleDamageSystem);
addHudLine(() => (G.drive ? `🚗 ${Math.round(Math.abs(G.drive.v) * 3.6)} km/h` : null));
registerSystem(soccerSystem);
registerSystem(policeSystem);
registerSystem(jailSystem);
registerSystem(wildSystem);
registerSystem(estateSystem);
registerSystem(policeAirSystem);
registerSystem(wildlifeSystem);
registerSystem(messengerSystem);
registerSystem(shops2System);
registerSystem(ridesSystem);
registerSystem(petsSystem);
registerSystem(shopStreetSystem);
registerSystem(funSystem); // W5 FUN: 놀이기구·오리 애니메이션
registerSystem(downtownSystem); // W6 DOWNTOWN: 단지 소품 밤 조명
registerSystem(funPlaySystem); // W5 FUN: 미니게임·탑승
