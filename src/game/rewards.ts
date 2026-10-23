import type {EnemyKind} from './levels';
/** Enemy identity determines reward; later-stage HP growth does not change it. */
export const enemyCoinReward=(kind:EnemyKind):number=>({crawler:2,bat:2,husk:5,slime:5,bloom:5,billy:5,mindflayer:40,vecna:80})[kind];
