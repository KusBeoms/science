// 시스템·상호작용 등록 단일 진입점. 새 기능은 모듈을 만들고 여기에 import + register 한 줄씩 추가한다 (호출 순서 = 등록 순서)
import {registerSystem} from './registry.js';
import {registerInteractable} from '../game/interactables.js';
import {CORE_INTERACTABLES} from '../game/interact-core.js';
import {portalIt, portalSystem} from '../game/portal.js';
import {hazardSystem} from './hazards.js';
import {rivalSystem} from './rival.js';

CORE_INTERACTABLES.forEach(registerInteractable);
registerInteractable(portalIt);

registerSystem(hazardSystem);
registerSystem(rivalSystem);
registerSystem(portalSystem);
