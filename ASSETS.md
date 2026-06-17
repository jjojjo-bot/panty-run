# 빤쓰런 아트 애셋 가이드

AI 이미지 생성으로 이모지 목업을 **한국 이모티콘/웹툰풍** 아트로 교체하기 위한 문서.
정체성: 직장인 웃픈 공감 — "아 ㅅㅂ 진짜 싫다 ㅋㅋ". 캐릭터는 귀엽고 코믹하게, 상황은 처절하게.

## 🔌 사용법 (애셋 1개 교체 흐름)

1. AI로 PNG 생성 (아래 프롬프트) → **투명 배경**, 정사각, 여백 약간.
2. `public/sprites/` 에 파일 저장 (예: `player.png`).
3. `src/game/assets.ts` 의 `SPRITE_MANIFEST` 에 한 줄 추가:
   ```ts
   { key: "tex_player", file: "player.png" },
   ```
4. 끝. 게임이 해당 이모지/절차생성을 자동 대체. **파일이 없거나 깨지면 기존 이모지로 자동 폴백**(게임 안 깨짐) → 하나씩 점진 교체 가능.

> 이미 파이프라인 검증 완료(테스트 PNG로 플레이어 교체 확인). 게임 로직은 건드릴 필요 없음.

---

## 🎨 공통 스타일 가이드 (모든 프롬프트 앞에 붙일 것)

```
Korean webtoon / KakaoTalk emoticon sticker style, thick bold clean black outlines,
flat cel-shaded coloring with soft highlights, cute and comedic, exaggerated expression,
crisp vector-like finish, single centered subject, side view, transparent background,
mobile game sprite, no text, no watermark
```

- **투명 배경 필수** (스프라이트). 생성기가 알파를 못 만들면 → 단색 배경에 뽑고 `remove.bg`/`rembg`로 누끼. (Recraft·Ideogram은 투명 PNG 직접 지원)
- **해상도는 넉넉히**: 캐릭터 **512×512**, 보스 **1024×1024**, 배경 **1600×960**(캔버스 800×480의 2배). 게임이 표시 크기로 줄여 쓰므로 클수록 선명함.
- **팔레트/조명 일관성**: 모든 캐릭터 같은 광원(좌상단), 같은 외곽선 두께. 한 번 만든 주인공을 레퍼런스로 고정(`--cref`/이미지 참조)해서 나머지를 뽑으면 톤이 안 튐.
- **방향**: 횡스크롤이라 **옆모습**(오른쪽 진행). 캐릭터는 살짝 3/4 측면도 OK.

---

## 🩲 캐릭터 디자인 — 주인공 "빤쓰" (`tex_player`, 512px)

**컨셉(확정)**: 주인공은 **팬티 그 자체**. 의인화 금지 — **눈·코·입 없음, 손·발 없음**. 흰 삼각팬티가 **공중에 살짝 뜬 채 바람에 펄럭이며**(천이 휘날림) 오른쪽으로 질주한다. 옷감이 역동적으로 나부끼고 뒤로 속도선이 붙어 "도망치는 빤쓰" 그 자체의 질주감. 귀엽기보단 **날렵하고 코믹한 사물의 질주**.

```
[공통 스타일] + a single pair of white cotton briefs (underwear) by itself as the hero,
NOT anthropomorphic, NO face, no eyes, no nose, no mouth, NO arms, NO legs, no limbs,
floating and hovering slightly in mid-air, the fabric fluttering and rippling
dynamically in the wind as it dashes fast to the right, flowing soft waistband, strong
speed lines and motion streaks behind it, sense of a runaway escape, just the underwear
cloth in motion, clean simple shape
```

- 핵심 negative: **no face / no limbs / not anthropomorphic** (AI가 자꾸 의인화하니 강하게 명시).
- **펄럭임 변주**(선택, 나중): 천이 더 휘날리는 프레임 2~3장을 뽑아 두면 달릴 때 펄럭 애니메이션 가능. 지금은 기본 1장이면 충분.
- ⚠️ **스킨 시스템 주의**: 현재 팬티 스킨 30종은 `drawPanty()` 코드 생성이라, 플레이어를 이미지로 바꾸면 기본 외형만 교체되고 스킨은 별개 작업이 됨. 우선 기본 빤쓰부터, 스킨 이미지화는 이후 논의.

## 📅 보스 "MONDAY" (`tex_boss`, 1024px)

```
[공통 스타일] + a giant menacing wall calendar monster showing "MON", angry villain
face with furrowed brows and a wicked grin, looming and oppressive, red accent,
the embodiment of Monday morning dread, slightly cracked paper texture
```

- 부속: **보스 손**(`tex_hand`, ✋ 휩쓸기) — 거대하고 위협적인 손/팔이 발밑을 쓸어가는 모습.

## 👔 추격자 (`tex_chaser`, 512px) — 월요일 스테이지 = 직장 상사

```
[공통 스타일] + an angry middle-aged boss man in a suit and tie chasing, red-faced,
veins popping, pointing finger forward, comedic rage, "get to work" energy
```

---

## 📦 애셋 목록 (스프라이트)

| 키 | 추천 파일명 | 크기 | 설명 |
|---|---|---|---|
| `tex_player` | player.png | 512 | 주인공 빤쓰 (위 컨셉) |
| `tex_boss` | boss_monday.png | 1024 | 거대 월요일 달력 보스 |
| `tex_hand` | boss_hand.png | 512 | 보스 손 휩쓸기 ✋ |
| `tex_chaser` | chaser_boss.png | 512 | 상사 추격자 👔 |
| `tex_coin` | coin.png | 256 | 🫧 비누방울 (수집 재화) |
| `tex_batk_🏢` | batk_meeting.png | 512 | 보스공격 "긴급회의" 🏢 |
| `tex_batk_📄` | batk_report.png | 512 | 보스공격 "보고서" 📄 |
| `tex_batk_📧` | batk_mail.png | 512 | 보스공격 "전체회신" 📧 |

### 구간 장애물 (`tex_zob_<emoji>`, 384px) — 점프/슬라이드로 회피

| 키 | 파일명 | 구간 | 회피 |
|---|---|---|---|
| `tex_zob_⏰` | ob_alarm.png | 침실 | 점프 |
| `tex_zob_🧦` | ob_sock.png | 침실 | 점프 |
| `tex_zob_👕` | ob_laundry.png | 침실 | 슬라이드 |
| `tex_zob_🛋️` | ob_sofa.png | 거실 | 점프 |
| `tex_zob_📺` | ob_tv.png | 거실 | 슬라이드 |
| `tex_zob_📱` | ob_call.png | 거실 | 투사체(팀장 전화) |
| `tex_zob_💬` | ob_kakao.png | 거실 | 투사체(회사 카톡) |
| `tex_zob_📦` | ob_box.png | 복도 | 점프 |
| `tex_zob_🧑` | ob_neighbor.png | 복도 | 점프 |
| `tex_zob_🛗` | ob_elevator.png | 복도 | 슬라이드 |
| `tex_zob_🚌` | ob_bus.png | 출근길 | 점프 |
| `tex_zob_🚦` | ob_light.png | 출근길 | 슬라이드 |
| `tex_zob_☕` | ob_coffee.png | 출근길 | 투사체(모닝커피) |

장애물 프롬프트 패턴:
```
[공통 스타일] + a <물건> as a cute but annoying obstacle, slightly menacing,
clear silhouette readable at small size
```
예: ⏰ = "a loud ringing alarm clock", 🚌 = "a packed rush-hour city bus front view".

### 능력 아이템 (`tex_item_<kind>`, 256px)

| 키 | 종류 | 효과 | 프롬프트 핵심어 |
|---|---|---|---|
| `tex_item_americano` | ☕ | 멘탈 +10 | iced americano cup |
| `tex_item_vacation` | 🏖️ | 멘탈 +50 | beach parasol, vacation vibe |
| `tex_item_holiday` | 🎌 | 멘탈 풀충전 | festive red-day calendar / holiday |
| `tex_item_angel` | 😇 | 무적 | glowing halo / angelic |
| `tex_item_shield` | 🛡️ | 1회 방어 | sturdy shield |
| `tex_item_gold` | 🥇 | 점수 2배 | gold medal sparkle |
| `tex_item_magnet` | 🧲 | 자석 | horseshoe magnet |
| `tex_item_propeller` | 🪂 | 비행 | parachute / propeller |
| `tex_item_turtle` | 🐢 | 슬로우 | cute turtle |
| `tex_item_rocket` | 🚀 | 폭주 | flaming rocket |
| `tex_item_coffee` | ⚡ | 각성(2단점프) | lightning energy bolt |
| `tex_item_jackpot` | 🧧 | 비누방울+15 | red lucky money envelope |
| `tex_item_mine` | 💩 | 함정 | comedic poop trap |

아이템은 둥근 배지/아이콘풍으로 통일 (`as a glossy rounded game item icon`).

---

## 🏙️ 구간 배경 패럴랙스 (4존 × 4레이어) — 반실사 2.5D

현재 배경은 절차생성 Graphics 5겹(하늘→스카이라인 0.12×→원경 0.4×→중경 0.72×→지면 1×→전경 1.3×).
이걸 **AI 레이어 이미지**로 교체한다. 톤은 캐릭터(스티커풍)와 대비되는 **반실사 페인터리 2.5D**(시네마틱하지만 일러스트풍).

> ⚠️ 챗지피티(gpt-image)는 "완성 씬 한 장"은 잘 뽑지만 **투명 배경·좌우 seamless 타일은 약함**.
> 그래서 존마다 풀씬이 아니라 **레이어별 띠**로 뽑아야 진짜 패럴랙스가 된다.

### 레이어 설계 (코드 매핑)

| 레이어 | 파일 접미사 | 스크롤 | 투명 | 내용 | 대체 대상 |
|---|---|---|---|---|---|
| **Back (하늘+원경)** | `_back` | 0.2× | ❌ 불투명 풀프레임 | 하늘 + 먼 배경 | bgSky+bgSkyline+bgFar |
| **Mid (중경)** | `_mid` | 0.6× | ✅ 투명 PNG | 가까운 건물/가구 띠 | bgMid |
| **Ground (지면)** | `_ground` | 1.0× | ❌ 가로 띠 | 바닥/길 텍스처 | terrain |
| **Fore (전경)** | `_fore` | 1.35× | ✅ 투명 PNG | 플레이어 앞 지나가는 소품 | fgStrip |

- 4겹 × 4존 = 16장. 파일명: `bg_<zone>_<layer>.png` (zone: bedroom/living/hallway/street).
- **사이즈**: 가로형(1536×1024) 권장. 게임 캔버스 800×480이라 가로 띠만 써도 충분, 클수록 선명.
- **용량**: 원본 PNG 그대로 `public/sprites/`에 두면 빌드 시 WebP 변환(불투명=WebP, 투명=알파 WebP, 장당 ~80–150KB).

### 공통 스타일 머리말 ([공통]으로 표기, 모든 배경 프롬프트 앞에 붙임)

```
Semi-realistic painterly side-scroller game background, cinematic atmospheric depth,
Korean webtoon environment art, soft volumetric lighting, subtle film grain,
muted desaturated "tired Monday morning" mood, clean readable shapes,
NO main character, NO people in foreground, NO text, NO UI, NO logos, NO watermark,
horizontal composition, nothing important cropped, leave empty space at far left and far right edges
```

> 마지막 줄(가장자리 비우기)이 핵심 — 코드에서 미러-타일링으로 이음새를 숨기므로 좌우 끝에 중요한 물체 금지.

### 🛏️ 침실 (bedroom) — 새벽 6시 인디고

```
[공통] + Back layer: dim bedroom interior at 6am, deep indigo pre-dawn light bleeding
through a window with sheer curtains, far wall, the faint glow of a digital alarm clock,
soft bokeh, heavy sleepy "forced awake on Monday" atmosphere, opaque full frame
```
```
[공통] + Mid layer (transparent background above the furniture line): a side-on horizontal row
of bedroom furniture silhouettes — an unmade bed with a rumpled blanket, a nightstand, a tall
wardrobe — cool indigo tones, empty transparent sky above
```
```
[공통] + Ground strip: seamless side-view wooden bedroom floor, a few scattered socks and
crumpled laundry, dim indigo dawn lighting, designed to tile horizontally
```
```
[공통] + Foreground layer (transparent, bottom-anchored): blurry passing bedroom clutter —
edge of a blanket, a pillow, a dangling phone charger cable — dark cool silhouettes
```

### 🛋️ 거실 (living) — 와인/적갈, TV 불빛

```
[공통] + Back layer: cozy dim living room before dawn, warm wine-red and amber glow from a
flickering TV, far wall with a round clock, soft warm bokeh, guilty pre-work comfort,
desaturated warm shadows, opaque full frame
```
```
[공통] + Mid layer (transparent above): a side-on row of living-room furniture silhouettes —
a big sofa, a low TV stand with a glowing screen, a bookshelf, a floor lamp — warm reddish tones
```
```
[공통] + Ground strip: seamless living-room floor, a rug edge over warm laminate flooring,
soft reddish TV light reflection, tiles horizontally
```
```
[공통] + Foreground layer (transparent, bottom-anchored): passing props — corner of a coffee
table, a TV remote, a snack bag, a few plant leaves — dark warm silhouettes
```

### 🚪 복도 (hallway) — 청록 형광등

```
[공통] + Back layer: a long apartment corridor receding into perspective, cold cyan-green
fluorescent lighting, a far row of identical numbered doors, liminal oppressive vibe,
bare concrete walls, faint flickering glare, opaque full frame
```
```
[공통] + Mid layer (transparent above): a side-on row of hallway elements — numbered apartment
doors, a red fire extinguisher, a mailbox unit, exposed ceiling pipes — cold teal fluorescent tone
```
```
[공통] + Ground strip: seamless corridor floor, speckled granite or linoleum tiles with cold
reflective fluorescent glare, tiles horizontally
```
```
[공통] + Foreground layer (transparent, bottom-anchored): passing hallway clutter — stacked
delivery cardboard boxes, a potted plant, a tied trash bag — cold cyan-tinted silhouettes
```

### 🚏 출근길 (street) — 여명 푸른 하늘  ← 패럴랙스 효과 제일 잘 보임, 파이프라인 검증 1순위

```
[공통] + Back layer: a city street at dawn, cool blue morning sky with soft clouds, a distant
skyline of apartment towers and office buildings with a few lit windows, hazy atmospheric
perspective, quiet commuting dread, opaque full frame
```
```
[공통] + Mid layer (transparent above): a side-on row of street-side low-rise shops with
shutters, a bus-stop shelter, a traffic light, telephone poles with sagging wires — cool blue dawn tone
```
```
[공통] + Ground strip: seamless city sidewalk meeting asphalt road, a crosswalk hint, a manhole
cover, cold wet morning sheen, tiles horizontally
```
```
[공통] + Foreground layer (transparent, bottom-anchored): passing street elements — a bus-stop
sign post, a roadside tree, a parked scooter, a guardrail — blue-tinted silhouettes
```

### 챗지피티 실전 팁

- **투명**: `_back`/`_ground`는 불투명 OK. `_mid`/`_fore`는 "transparent background" 명시 → 안 먹으면 rembg/remove.bg로 누끼.
- **톤 통일**: 한 존의 첫 장(`_back`)을 뽑은 뒤 **그 이미지를 레퍼런스로 첨부**해 나머지 3겹·다음 존을 생성 → 색/조명 안 튐.
- **이음새**: seamless 완벽은 기대 말고 "가장자리 비우기"만 지키면 코드 미러-타일로 가림.
- 배경 통합 시 **패럴랙스 렌더링 코드(TileSprite 레이어 + 스크롤 배수)** 추가 필요 → 이미지 없으면 현 절차생성으로 자동 폴백.

---

## ✅ 우선순위 (실감 임팩트 순)

1. **주인공 빤쓰** `tex_player` — 가장 자주 보임, 게임의 얼굴.
2. **보스 MONDAY** `tex_boss` + 손 — 클라이맥스 임팩트.
3. **구간 배경 4종** — "실감"을 가장 크게 끌어올림(배경 코드 통합 동반).
4. **장애물 13종** — 구간 정체성.
5. **아이템 13종** — 가장 덜 급함(작게 보임).

처음엔 **1~2개만 생성해서 톤을 확정**한 뒤(주인공·보스), 그 톤을 레퍼런스로 나머지를 일괄 생성하는 걸 권장. 톤 확정되면 나머지는 빠릅니다.
