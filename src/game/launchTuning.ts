// #4 빤쓰 발사 (하이브리드: 새총 발사 + 공중 비행조작) 튜닝값.
// Phaser 미import 순수 객체 → 씬과 React 슬라이더 공유, 실시간 반영.
export const LAUNCH_TUNING = {
  // 발사
  power: 5, // 당긴 거리 → 발사 속도 배수
  maxPull: 240, // 최대 당김 거리 (px)

  // 공중
  gravity: 1300, // 낙하 중력 (px/s^2)
  flutterThrust: 2200, // 공중 꾹 = 펄럭 상승 가속 (px/s^2)
  fuelMax: 1.2, // 펄럭 연료(기류) 최대 (초)
  fuelDrain: 1.0, // 연료 소모 (/s)

  // 공중 아이템 (먹으면 기류 회복 → 비행 이어가기)
  itemFuel: 0.5, // 아이템 1개당 기류 회복 (초)
  itemGap: 220, // 공중 아이템 간격 (px, 랜덤워크 폴백용)

  // 음악 차트
  musicPxPerSec: 320, // 곡 1초 = 가로 px (클수록 트레일 듬성/길게 펴짐)
};
