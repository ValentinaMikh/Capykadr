/* Справочники CapyKadr.
   Источник: справочник промтов + правки 26.10 (лапы, глаза, ресницы мамы, брюки папы, зелёный клевера).
   draft:true — вариант без эталона-картинки или черновик, требует проверки. */
window.CAPY = (() => {

const PAL = {
  red: "#E0262F", offwhite: "#F3E4E4", beige: "#D9AE88", yellow: "#FFD21F",
  green: "#4CB848",      // кеды сына, зимние узоры, шарф сына
  clover: "#80BA27",     // клевер на кепке и фирменный зелёный
  fur: "#E38A45", muzzle: "#B5562B", cream: "#FFF4E6", peach: "#FBD9A8"
};

/* ---------- внешность (с правками) ---------- */
const EYES = "small round eyes with a warm brown iris, a black pupil, a thin white ring around the iris and a glossy highlight, set high on the sides of the head; a short soft darker-brown eyebrow above each eye";
const PAWS = "medium-length arms ending in small rounded paws with four short chubby fingers, each finger tip with a small darker brown rounded pad";
const FEET = "short legs, small flat rounded feet with short toes and small darker brown toe pads";

const BASE_LOOK = `3D stylized mascot character, anthropomorphic capybara, faithful 3D adaptation of a flat 2D vector cartoon character.
Head: large head with a long, forward-extending, boxy rectangular muzzle with softly rounded corners and a flat front. Small dark brown heart-shaped glossy nose on the top front edge of the muzzle. ${EYES}. Small ears slightly pointed at the tips, pink inner ears. No visible neck. No tail.
Body: rounded, slightly pear-shaped torso with a soft belly, ${PAWS}, ${FEET}.
Fur: short velvety plush-like fur, warm caramel-orange color (${PAL.fur}), darker chocolate-reddish brown patch on the front of the muzzle (${PAL.muzzle}), paws and feet slightly darker orange-brown.
Style: soft toy-like look of modern family 3D animation, rounded shapes, clean simple surfaces, smooth matte materials, subtle subsurface scattering on ears and nose. High detail.`;

const STYLE = "soft toy-like modern family 3D animation, short velvety plush fur, rounded shapes, smooth matte materials, subtle subsurface scattering on ears and nose";

/* ---------- персонажи ---------- */
const CHARS = {
  dad: { name: "Папа", en: "dad", h: 100, order: 1,
    trait: "невозмутимый, надёжный",
    face: `${EYES}`,
    body: "about 3 heads tall, wide chunky almost rectangular torso with a soft round belly and sloped shoulders, the largest and most massive muzzle in the family",
    neg: [] },
  mom: { name: "Мама", en: "mom", h: 88, order: 2,
    trait: "тёплая, смеётся от души",
    face: `${EYES}, plus two small curved black eyelashes at the outer corner of each eye`,
    body: "about 3 heads tall, slightly shorter and about 1.3 times slimmer than dad, soft slightly pear-shaped torso, muzzle slightly shorter and softer than dad's, slender legs with darker lower legs and feet",
    neg: ["long eyelashes", "makeup", "lipstick"] },
  son: { name: "Сын", en: "son", h: 67, order: 3,
    trait: "любопытный, подвижный",
    face: `${EYES}`,
    body: "about 2.5 heads tall, a young kid capybara, head about 40% of total height, compact rounded torso with a small belly, muzzle shorter and rounder than dad's",
    neg: ["skateboard", "backwards cap", "tilted cap"] }
};

/* ---------- сезоны и одежда ----------
   ref — файл эталона в T-позе из папки «Капибары рефы». null = эталона нет. */
const SEASONS = [
  ["base", "Базовый"], ["spring", "Весна"], ["summer", "Лето"], ["autumn", "Осень"], ["winter", "Зима"]
];

const OUTFITS = [
  /* базовые */
  { id: "dad-base", who: "dad", season: "base", name: "Свитер в полоску и брюки", ref: "Rectangle-8.jpg",
    en: `red knitted sweater (${PAL.red}) with wide horizontal off-white stripes (${PAL.offwhite}), ribbed collar and cuffs, covering the hips; loose straight beige chino trousers (${PAL.beige}) with rolled-up cuffs at the ankles and two back patch pockets; barefoot`,
    keep: "sweater, trousers", neg: [] },
  { id: "mom-base", who: "mom", season: "base", name: "Свитер и юбка в полоску", ref: "Rectangle-24.jpg",
    en: `plain red knitted sweater (${PAL.red}) without stripes ending at the hips, short pleated A-line skirt with horizontal red and off-white stripes (${PAL.offwhite}) and a thin light pink trim at the hem, ending above the knees; barefoot`,
    keep: "sweater, skirt", neg: ["trousers", "striped sweater"] },
  { id: "son-base", who: "son", season: "base", name: "Кепка с клевером, футболка, шорты, кеды", ref: "Rectangle-17.jpg",
    en: `bright yellow baseball cap (${PAL.yellow}) worn straight with a green four-leaf clover emblem (${PAL.clover}) on the front panel; red short-sleeve T-shirt (${PAL.red}) with wide white stripes; loose red knee-length shorts; green high-top sneakers (${PAL.green}) with white laces, white toe caps and white soles`,
    keep: "cap, T-shirt, shorts, sneakers", neg: ["sweater", "trousers", "barefoot"] },

  /* весна — черновики, эталонов нет */
  { id: "dad-spring", who: "dad", season: "spring", name: "Кардиган поверх свитера", ref: null, draft: true,
    en: `light off-white knitted cardigan (${PAL.offwhite}) with small red buttons, worn open over the red-and-off-white striped sweater; the same beige chino trousers with rolled-up cuffs; barefoot`,
    keep: "cardigan, sweater, trousers", neg: ["hat", "scarf"] },
  { id: "mom-spring", who: "mom", season: "spring", name: "Жёлтый кардиган и цветок", ref: null, draft: true,
    en: `light yellow knitted cardigan (${PAL.yellow}) worn open over the plain red sweater, the same red-and-off-white striped pleated skirt, a small white flower clip on the head between the ears; barefoot`,
    keep: "cardigan, sweater, skirt, flower clip", neg: ["trousers", "hat"] },
  { id: "son-spring", who: "son", season: "spring", name: "Зелёная ветровка", ref: null, draft: true,
    en: `the yellow baseball cap with the green clover (${PAL.clover}) worn straight, a light green zip-up windbreaker (${PAL.clover}) worn open over the red striped T-shirt, red knee-length shorts, green high-top sneakers (${PAL.green})`,
    keep: "cap, windbreaker, T-shirt, shorts, sneakers", neg: ["sweater", "trousers", "barefoot"] },

  /* лето */
  { id: "dad-summer", who: "dad", season: "summer", name: "Футболка в полоску и жёлтые очки", ref: "Rectangle-67.jpg",
    en: `loose short-sleeve T-shirt with wide horizontal red (${PAL.red}) and off-white (${PAL.offwhite}) stripes covering the hips; yellow sunglasses (${PAL.yellow}) with rounded rectangular frames and dark green tinted lenses on top of the muzzle in front of the eyes; no trousers, bare legs, barefoot`,
    keep: "T-shirt, sunglasses", neg: ["trousers", "chinos", "shorts", "sweater", "black sunglasses"] },
  { id: "mom-summer", who: "mom", season: "summer", name: "Сарафан и соломенная шляпа", ref: "Rectangle-63.jpg",
    en: `sleeveless sundress with a red-and-off-white striped fitted bodice and a light flared red skirt with wide off-white stripes near the hem, ending just below the knees; straw boater hat (${PAL.beige}) with a flat crown, wide flat brim and red band, sitting between the ears; barefoot`,
    keep: "sundress, straw hat", neg: ["trousers", "sweater", "swimsuit", "floppy sun hat"] },
  { id: "son-summer", who: "son", season: "summer", name: "Футболка в полоску", ref: "Rectangle-65.jpg", noCap: true,
    en: `loose short-sleeve T-shirt with wide horizontal red (${PAL.red}) and off-white stripes covering the hips; no cap, no shorts, no sneakers; bare legs, barefoot`,
    keep: "T-shirt", neg: ["baseball cap", "shorts", "sneakers", "sweater", "trousers", "sunglasses"] },

  /* осень — черновики */
  { id: "dad-autumn", who: "dad", season: "autumn", name: "Свитер, брюки и жёлтый шарф", ref: null, draft: true,
    en: `the red-and-off-white striped sweater and beige chino trousers with rolled-up cuffs, plus a long soft yellow knitted scarf (${PAL.yellow}) wrapped once around the neck with one end hanging down the chest; barefoot`,
    keep: "sweater, trousers, scarf", neg: ["hat", "mittens"] },
  { id: "mom-autumn", who: "mom", season: "autumn", name: "Берет и жёлтые сапожки", ref: null, draft: true,
    en: `the plain red sweater and red-and-off-white striped pleated skirt, a soft red knitted beret (${PAL.red}) tilted slightly between the ears, short glossy yellow rubber boots (${PAL.yellow})`,
    keep: "sweater, skirt, beret, boots", neg: ["trousers", "earmuffs"] },
  { id: "son-autumn", who: "son", season: "autumn", name: "Жёлтый дождевик и сапоги", ref: null, draft: true,
    en: `the yellow baseball cap with the green clover (${PAL.clover}) worn straight, a glossy yellow raincoat (${PAL.yellow}) with big round buttons and the hood down, red knee-length shorts, glossy yellow rubber boots`,
    keep: "cap, raincoat, shorts, boots", neg: ["sweater", "trousers", "sneakers"] },

  /* зима */
  { id: "dad-winter", who: "dad", season: "winter", name: "Шапка, шарф, варежки", ref: "Rectangle-54.jpg",
    en: `red knitted Christmas sweater (${PAL.red}) with an off-white chevron band across the chest and sleeves and small green fir-tree motifs (${PAL.green}) on the belly; red knitted beanie with off-white chevron bands and a fluffy red-and-white pompom; long red knitted scarf with off-white chevrons; red knitted mittens with a small off-white snowflake; no trousers, bare legs, barefoot`,
    keep: "sweater, beanie, scarf, mittens", neg: ["trousers", "chinos", "striped sweater", "Santa hat", "gloves with fingers"] },
  { id: "dad-winter-sw", who: "dad", season: "winter", name: "Только свитер", ref: null,
    en: `red knitted Christmas sweater (${PAL.red}) with an off-white chevron band across the chest and sleeves and small green fir-tree motifs (${PAL.green}) on the belly; no hat, no scarf, no mittens; no trousers, bare legs, barefoot`,
    keep: "sweater", neg: ["trousers", "chinos", "striped sweater", "hat", "scarf", "mittens"] },
  { id: "mom-winter", who: "mom", season: "winter", name: "Свитер с сердцами, наушники, шарф", ref: "Rectangle-56.jpg",
    en: `red knitted Christmas sweater (${PAL.red}) with an off-white chevron band and two chevron-knit heart motifs on the chest; the same red-and-off-white striped pleated skirt; fluffy pastel pink earmuffs; long soft pink knitted scarf with a darker pink chevron pattern; barefoot`,
    keep: "sweater, skirt, earmuffs, scarf", neg: ["trousers", "hat", "beanie"] },
  { id: "son-winter", who: "son", season: "winter", name: "Шапка с помпоном и зелёный шарф", ref: "Rectangle-55.jpg", noCap: true,
    en: `red knitted Christmas sweater (${PAL.red}) with large off-white snowflake motifs; red knitted beanie with off-white chevron bands and a fluffy green pompom (${PAL.green}) sitting straight; green knitted scarf (${PAL.green}) with a lighter chevron pattern and scalloped ends; bare legs, barefoot`,
    keep: "sweater, beanie, scarf", neg: ["baseball cap", "T-shirt", "shorts", "sneakers", "trousers", "tilted beanie"] }
];

/* ---------- позы ----------
   who: кто может; outfit: только с этой одеждой; mouth: open/closed; cam: ракурс по умолчанию; ex: пример-картинка */
const CAM = {
  front: "straight-on front view, facing the viewer, camera at chest height",
  q34: "three-quarter view, body turned 45 degrees to the right of the frame, camera at chest height",
  q34sit: "three-quarter view, body turned 45 degrees to the right of the frame, camera at chest height of the seated character",
  q34top: "three-quarter view, body turned 45 degrees to the right of the frame, camera slightly above looking down at about 30 degrees"
};

const POSES = [
  /* базовые для всех */
  { id: "stand", name: "Стоит", who: "*", mouth: "closed", cam: "front", ex: { dad: "Rectangle-41.jpg", mom: "Rectangle-29.jpg", son: "Rectangle-35.jpg" },
    en: "standing straight and relaxed, arms down along the body, legs slightly apart, weight evenly on both feet" },
  { id: "sit", name: "Сидит", who: "*", mouth: "closed", cam: "q34sit", ground: "sit", ex: { dad: "Rectangle-45.jpg", mom: "Rectangle-31.jpg", son: "Rectangle-39.jpg" },
    en: { dad: "sitting on the ground, legs stretched forward and slightly apart, paws resting on the belly, back slightly leaning",
          mom: "sitting on the ground, legs stretched forward and close together, skirt neatly spread, paws resting on her lap, back straight",
          son: "sitting on the ground, legs stretched forward and slightly apart with feet pointing up, paws resting on his knees, back straight" } },
  { id: "lie", name: "Лежит", who: "*", mouth: "closed", cam: "q34top", ground: "lie", ex: { dad: "Rectangle-9.jpg", mom: "Rectangle-33.jpg", son: "Rectangle-37.jpg" },
    en: { dad: "lying on his stomach, propped up on his elbows, chin resting on crossed paws, legs relaxed behind him",
          mom: "lying on her stomach, propped up on her elbows, chin resting on crossed paws, lower legs raised and crossed at the ankles",
          son: "lying on his stomach, propped up on his elbows, chin resting on his paws, lower legs raised and swinging playfully" } },
  /* универсальные */
  { id: "wave", name: "Машет", who: "*", mouth: "closed", cam: "front", en: "standing, one paw raised in a friendly wave to the viewer, the other arm relaxed" },
  { id: "hold", name: "Держит предмет", who: "*", mouth: "closed", cam: "front", needs: "object", en: "standing, holding {object} in both paws in front of the chest, showing it to the viewer" },
  { id: "point", name: "Показывает", who: "*", mouth: "closed", cam: "front", needs: "object", en: "standing, one arm extended pointing at {object}, looking at the viewer" },
  { id: "walk", name: "Идёт", who: "*", mouth: "closed", cam: "q34", en: "walking forward mid-step, arms swinging naturally" },
  { id: "run", name: "Бежит", who: "*", mouth: "open", cam: "q34", en: "running forward joyfully, one leg kicked back and bent at the knee, body leaning forward" },
  { id: "jump", name: "Прыгает", who: "*", mouth: "open", cam: "front", ground: "air", en: "jumping in the air with joy, both arms raised, feet off the ground" },
  { id: "think", name: "Задумался", who: "*", mouth: "closed", cam: "q34", en: "standing, one paw raised to the chin in a thoughtful gesture, looking into the distance" },
  { id: "table", name: "Сидит за столом", who: "*", mouth: "closed", cam: "q34", ground: "sit", en: "sitting at a table, paws resting on the tabletop, upper body upright" },
  /* сюжетные из 2D */
  { id: "hand", name: "Прогулка за руку", who: ["dad", "mom"], mouth: "closed", cam: "q34", ex: { dad: "Rectangle-42.jpg", mom: "Rectangle-28.jpg" },
    en: "walking forward mid-step, one arm extended to the side at hip height with an open paw as if holding someone's hand, the other arm relaxed along the body" },
  { id: "cake-flowers", name: "С тортом и цветами", who: ["dad"], mouth: "closed", cam: "q34", ex: { dad: "Rectangle-43.jpg" },
    en: "walking forward, holding a round white cake decorated with red hearts in both paws in front of his belly, a bouquet of pink tulips wrapped in kraft paper tucked under one arm" },
  { id: "leaves-branch", name: "Осенняя радость", who: ["dad"], mouth: "closed", cam: "q34", ex: { dad: "Rectangle-44.jpg" },
    en: "standing firmly, one arm raised high above the head holding a small branch of yellow and orange autumn leaves, the other arm extended to the side, head slightly lifted" },
  { id: "umbrella", name: "С зонтом", who: ["mom"], mouth: "open", cam: "q34", ex: { mom: "Rectangle-30.jpg" },
    en: "standing, holding an open yellow umbrella over her shoulder by its curved dark brown handle, the other arm reaching forward in a friendly gesture" },
  { id: "skip", name: "Радостно бежит", who: ["mom"], mouth: "open", cam: "q34", ex: { mom: "Rectangle-32.jpg" },
    en: "joyful skipping run, one leg kicked back and bent at the knee, paws clasped together near her chest, body leaning slightly forward" },
  { id: "cake", name: "Несёт торт", who: ["son"], mouth: "closed", cam: "q34", ex: { son: "Rectangle-34.jpg" },
    en: "walking carefully forward, holding a round white cake decorated with red hearts in both paws at chest height" },
  { id: "puddle", name: "Прыгает по луже", who: ["son"], mouth: "open", cam: "q34", ex: { son: "Rectangle-36.jpg" },
    en: "playfully stamping in a small puddle, one foot landing in a small blue water splash, the other leg lifted, one arm forward holding a small white paper boat" },
  { id: "catch-leaves", name: "Ловит листья", who: ["son"], mouth: "open", cam: "q34", ex: { son: "Rectangle-38.jpg" },
    en: "standing on tiptoes, arms spread wide open, head tilted up, looking at orange and yellow autumn leaves falling around him" },
  /* сезонные */
  { id: "snowball", name: "Снежный ком", who: ["dad"], outfit: ["dad-winter"], mouth: "open", cam: "q34", ex: { dad: "Rectangle-60.jpg" },
    en: "running forward joyfully, carrying a big round snowball almost as large as his torso in both mittens against his chest, scarf end and pompom swinging" },
  { id: "garland-dad", name: "С гирляндой", who: ["dad"], outfit: ["dad-winter"], mouth: "closed", cam: "front", ex: { dad: "Rectangle-53.jpg" },
    en: "standing with legs slightly apart, both arms spread wide and raised, holding a string of colorful glossy Christmas light bulbs that hangs in a loose arc in front of his chest" },
  { id: "ornament", name: "Вешает игрушку", who: ["dad"], outfit: ["dad-winter-sw"], mouth: "closed", cam: "q34",
    en: "standing on slightly bent legs, one arm raised at head height holding a golden openwork Christmas ornament by its loop as if hanging it on a branch, looking up at it" },
  { id: "star-mom", name: "Со звездой", who: ["mom"], mouth: "closed", cam: "q34", ex: { mom: "Rectangle-62.jpg" },
    en: "standing, one arm raised at head height holding a small golden openwork star ornament by its loop as if hanging it on a branch, looking up at it with interest" },
  { id: "garland-mom", name: "С гирляндой", who: ["mom"], outfit: ["mom-winter"], mouth: "closed", cam: "q34",
    en: "standing with legs slightly apart, both arms spread wide and raised, holding a string of colorful glossy Christmas light bulbs that hangs in a loose arc in front of her chest, one hip shifted playfully" },
  { id: "slide", name: "Скользит на животе", who: ["son"], outfit: ["son-winter"], mouth: "open", cam: "q34top", ground: "lie", ex: { son: "Rectangle-61.jpg" },
    en: "sliding forward on his belly, body stretched out low, both arms reaching forward, one paw holding a small square postcard, scarf ends and pompom flying back" },
  { id: "paddle", name: "С веслом", who: ["dad"], outfit: ["dad-summer"], mouth: "closed", cam: "q34", ex: { dad: "Rectangle-68.jpg" },
    en: `standing relaxed with weight on one leg, holding a long stand-up paddle diagonally across his body, dark brown shaft and yellow blade (${PAL.yellow}) near his feet` },
  { id: "palm", name: "Ищет пальму", who: ["son"], outfit: ["son-summer"], mouth: "closed", cam: "q34",
    en: "standing on slightly bent legs, one paw raised to his chin, the other arm behind his back, head turned and lifted, looking into the distance as if searching for something" },
  { id: "swimring", name: "В плавательном круге", who: ["son"], mouth: "closed", cam: "q34", ex: { son: "Rectangle-66.jpg" },
    prop: `inflatable swim ring worn around his waist, glossy vinyl, red (${PAL.red}) with four wide off-white segments in a classic lifebuoy pattern, sized snugly for a small kid`,
    en: "standing with legs slightly apart, both arms resting forward on top of the swim ring, paws hanging relaxed over its front edge" },
  { id: "water", name: "Со стаканом воды", who: ["mom"], outfit: ["mom-summer"], mouth: "closed", cam: "q34sit", ground: "sit", ex: { mom: "Rectangle-64.jpg" },
    en: "sitting on the ground leaning back on one arm, legs stretched forward and crossed at the ankles, dress spread around her, the other paw raising a clear glass of water with ice cubes" }
];

/* ---------- эмоции ---------- */
const EMOTIONS = [
  { id: "auto", name: "По позе", en: null },
  { id: "calm", name: "Спокойная полуулыбка", mouth: "closed", en: "calm, kind closed-mouth half-smile, no teeth visible" },
  { id: "happy", name: "Радость", mouth: "closed", en: "happy, cheerful closed-mouth smile, no teeth visible" },
  { id: "laugh", name: "Смех", mouth: "open", en: "laughing, eyes closed in happy arcs, open-mouth smile with two small white front teeth visible" },
  { id: "wow", name: "Удивление", mouth: "open", en: "amazed and delighted, wide eyes, open-mouth smile with two small white front teeth visible" },
  { id: "dream", name: "Мечтательно", mouth: "closed", en: "dreamy, eyes half-closed, gentle closed-mouth smile, no teeth visible" },
  { id: "focus", name: "Сосредоточенно", mouth: "closed", en: "focused, thoughtful closed-mouth smile, no teeth visible" }
];
const DEFAULT_EMO = { dad: "calm", mom: "happy", son: "happy" };
const OPEN_DEFAULT_EMO = "laugh";

/* ---------- локации ---------- */
const LOCATIONS = [
  { id: "white", name: "Белый фон", en: "plain pure white background, no scenery, soft contact shadow under the feet" },
  { id: "green", name: "Фирменный зелёный", en: `plain soft brand-green background (${PAL.clover}) with a subtle lighter gradient in the center, no scenery` },
  { id: "cream", name: "Кремовый", en: `plain warm cream background (${PAL.cream}), clean and minimal, no scenery` },
  { id: "spring", name: "Весна", season: "spring", draft: true, en: "soft spring garden with fresh green grass, blooming apple tree branches with white and pink blossoms, a few tulips, light airy sky, softly blurred background" },
  { id: "meadow", name: "Лето · луг у озера", season: "summer", en: "bright summer meadow by a calm lake with soft green grass, a few daisies and wild strawberries, clear light blue sky" },
  { id: "autumn", name: "Осень", season: "autumn", en: `soft warm cream-to-peach gradient background (${PAL.cream} to ${PAL.peach}) with soft fluffy cream clouds, a few orange, yellow and red autumn leaves gently falling, sparse and not covering faces` },
  { id: "winter", name: "Зима", season: "winter", en: "cozy snowy winter scene with soft snowdrifts, gently falling snowflakes and a decorated fir tree with warm string lights in the soft-focus background" },
  { id: "park", name: "Парк", en: "sunny city park with soft green lawns, rounded trees, a wooden bench and a winding path, softly blurred background" },
  { id: "picnic", name: "Пикник", en: "picnic on soft green grass with a red-and-white checkered blanket, a wicker basket and fruit, sunny day, softly blurred trees" },
  { id: "kitchen", name: "Кухня", en: "cozy bright home kitchen with light wooden cabinets, a round wooden table, a bowl of fruit and warm morning light from the window, softly blurred background" },
  { id: "cafe", name: "Кафе", en: `cozy cafe interior with warm wooden slatted wall panels, a mustard-orange cushioned bench, a round wooden table and a green neon clover sign (${PAL.clover}) on the wall, softly blurred background` },
  { id: "shop", name: "Магазин", en: `bright modern grocery store interior with light wooden shelves, warm lighting, green accents (${PAL.clover}) and green balloons, softly blurred background` }
];

const LIGHTS = [
  { id: "studio", name: "Мягкий студийный", en: "soft even studio lighting, soft contact shadows under the feet" },
  { id: "golden", name: "Тёплый золотой", en: "soft warm golden key light from the upper left, gentle rim light separating the characters from the background, soft contact shadows" },
  { id: "winter", name: "Зимний уютный", en: "soft cool daylight with warm glow from string lights, soft contact shadows" },
  { id: "evening", name: "Вечерний", en: "warm cozy evening light, soft shadows" }
];

const FRAMES = [
  { id: "1:1", name: "Квадрат 1:1", en: "square 1:1 frame" },
  { id: "4:5", name: "Пост 4:5", en: "vertical 4:5 frame" },
  { id: "9:16", name: "Сторис 9:16", en: "vertical 9:16 frame" },
  { id: "16:9", name: "Баннер 16:9", en: "horizontal 16:9 frame" }
];
const CAMERAS = [
  { id: "auto", name: "По позе", en: null },
  { id: "front", name: "Спереди", en: "straight-on front view at the characters' chest height, no wide-angle distortion" },
  { id: "q34", name: "Три четверти", en: "three-quarter view, characters turned about 45 degrees, camera at chest height" },
  { id: "low", name: "Чуть снизу", en: "straight-on view, very slightly from below at chest height" },
  { id: "high", name: "Чуть сверху", en: "three-quarter view, camera slightly above looking down at about 30 degrees" }
];
const TEXTZONE = [
  { id: "none", name: "Нет", en: "" },
  { id: "left", name: "Слева", en: "The left third of the frame is clean empty space for a title." },
  { id: "right", name: "Справа", en: "The right third of the frame is clean empty space for a title." },
  { id: "top", name: "Сверху", en: "The top third of the frame is clean empty space for a title." }
];

/* ---------- действия ---------- */
const ACTIONS = [
  { id: "none", name: "Без общего действия", min: 1, max: 3, en: "" },
  { id: "eat", name: "Едят вместе", min: 2, max: 3, pose: "table", en: "the family sits together at a round table sharing a meal, passing a plate to each other, cozy and warm atmosphere" },
  { id: "cocoa", name: "Пьют какао", min: 2, max: 3, pose: "sit", en: "the characters sit side by side holding mugs of hot cocoa with both paws, steam rising, smiling at each other" },
  { id: "hug", name: "Обнимаются", min: 2, max: 3, en: "the characters hug each other warmly, arms around each other's shoulders, eyes closed in happy arcs" },
  { id: "product", name: "Держат продукт", min: 1, max: 3, pose: "hold", needs: "product", en: "{who} holds {product} in both paws in front of the chest, turned toward the viewer so the package is clearly visible" },
  { id: "gift", name: "Дарят подарок", min: 2, max: 2, en: "{A} hands a wrapped gift box with a red ribbon to {B}, who reaches out with both paws, delighted" },
  { id: "banner", name: "Позируют для баннера", min: 1, max: 3, pose: "stand", en: "the characters stand close together facing the viewer, smiling, one waving" },
  { id: "shoulders", name: "Сын на плечах у папы", only: ["dad", "son"], min: 2, max: 3, offGround: "son",
    override: { dad: "standing firmly, facing the viewer, holding the son on his shoulders, both paws gently holding the son's legs", son: "sitting on dad's shoulders, arms spread wide open in joy, head tilted slightly up" }, en: "dad holds the son on his shoulders, both paws gently holding the son's legs; the son spreads his arms wide in joy" },
  { id: "walkhand", name: "Гуляют за руку", min: 2, max: 3, pose: "walk", en: "the characters walk forward side by side holding paws, mid-step, relaxed and happy" },
  { id: "cook", name: "Готовят на кухне", min: 2, max: 3, en: "the characters cook together at the kitchen table: one stirs a bowl of dough, another adds strawberries, flour on the table" },
  { id: "snowman", name: "Лепят снеговика", min: 2, max: 3, season: "winter", en: "the characters build a small snowman together, one places the head, another adds a scarf" },
  { id: "picnic", name: "Пикник", min: 2, max: 3, pose: "sit", en: "the family sits on a checkered picnic blanket, sharing fruit from a wicker basket" },
  { id: "selfie", name: "Делают селфи", min: 2, max: 3, en: "the characters lean together for a selfie, one holds a phone at arm's length, all smiling at it" },
  { id: "welcome", name: "Встречают у входа", min: 1, max: 3, en: "the characters stand at an open door welcoming the viewer, one waving, warm light from inside" }
];

/* ---------- негативы ---------- */
const NEG_BASE = ["redesigned character", "different face", "different proportions", "changed outfit", "extra clothing", "missing clothing", "extra limbs", "mitten paws without fingers", "claws", "human hands", "long fur", "realistic animal", "photorealistic", "anime eyes", "big eyes", "black bead eyes without iris", "tail", "text", "watermark", "logo"];
const NEG_TEETH = ["visible teeth", "buck teeth", "open mouth"];
const NEG_GROUP = ["swapped outfits", "extra characters", "same height", "perspective distortion", "wide-angle lens"];
const NEG_TPOSE = ["three-quarter view", "dynamic pose", "background scenery"];

const LINEUP_REF = "Rectangle-46.jpg";

const CHECKLIST = [
  "Силуэт и пропорции как у эталона",
  "Морда-кирпичик, нос-сердечко, карие глаза с белым ободком и бровью",
  "Лапы с пальцами и тёмными подушечками",
  "Одежда не поменялась и не потерялась",
  "Зубы видны только при открытом рте",
  "Рост совпадает с семьёй: мама ≈ 88%, сын ≈ 67% от папы"
];

return { PAL, BASE_LOOK, STYLE, CHARS, SEASONS, OUTFITS, CAM, POSES, EMOTIONS, DEFAULT_EMO, OPEN_DEFAULT_EMO,
  LOCATIONS, LIGHTS, FRAMES, CAMERAS, TEXTZONE, ACTIONS, NEG_BASE, NEG_TEETH, NEG_GROUP, NEG_TPOSE, LINEUP_REF, CHECKLIST };
})();
