/* Seasonal stories for constructor version 2. The legacy prompt engine stays frozen. */
window.CapyScenes = (() => {
  const item = (id, name, location, en, tasks, solo) => ({
    id,
    name,
    location,
    en,
    tasks,
    solo,
    light: ["winter", "newyear"].includes(location)
      ? "winter"
      : ["kitchen", "cafe", "bakery", "home"].includes(location)
        ? "evening"
        : "golden",
  });
  const catalog = {
    spring: [
      item(
        "walk",
        "Весенняя прогулка",
        "spring",
        "A winding garden path beneath flowering apple trees, fresh grass and a few pale pink petals drifting slowly through the air. A small puddle reflects the bright sky; keep blossoms behind the characters, never across their faces. Capture an unhurried moment of enjoying the first warm day.",
        [
          "walks forward mid-step, looking at a flowering branch",
          "walks alongside and points at fresh blossoms with an open paw",
          "takes a small lively step and watches a drifting petal",
        ],
      ),
      item(
        "flowers",
        "Букет тюльпанов",
        "spring",
        "A spring flower stall with buckets of red, yellow and pale pink tulips. Show one neatly wrapped bouquet in kraft paper, a spool of ribbon and a low wooden counter. Focus on the bouquet and the small exchange of gestures, with the remaining flowers softly blurred in the background.",
        [
          "holds a bouquet of tulips at belly height with both paws",
          "gently straightens the paper around the bouquet",
          "chooses one yellow tulip from a low bucket",
        ],
      ),
      item(
        "seedlings",
        "Сажают рассаду",
        "spring",
        "A low garden worktable with terracotta pots, a tray of green seedlings, a small hand trowel and a watering can. Dark soil is contained on the work surface; a few fresh leaves catch the light. Depict one clear planting action rather than a crowded collection of tools.",
        [
          "carefully places a seedling into a pot with both paws",
          "adds a little soil around the roots using a small trowel",
          "holds a watering can tilted slightly toward a completed pot",
        ],
      ),
      item(
        "paperboats",
        "Бумажные кораблики",
        "spring",
        "A shallow clear puddle beside a spring garden path after light rain. Two little folded paper boats float near the edge; small ripples reflect the clouds and fresh green branches. Keep the characters on the dry path, with their whole bodies and clothing unobstructed.",
        [
          "bends slightly and sets a small paper boat at the water's edge",
          "points toward the ripples while holding another folded boat",
          "crouches beside the puddle and follows a boat with a curious gaze",
        ],
      ),
      item(
        "bubbles",
        "Мыльные пузыри",
        "spring",
        "A sunny spring lawn with a few translucent soap bubbles floating at different depths. Include a small bubble wand and a plain bottle on a low stool. Use delicate iridescent highlights, not opaque spheres, and leave clear space around the eyes, muzzle and ears.",
        [
          "holds a bubble wand near the muzzle and gently blows small bubbles",
          "reaches out with one open paw toward a drifting bubble",
          "stands on tiptoes and watches a bubble float upward",
        ],
      ),
      item(
        "spring-picnic",
        "Пикник под цветущим деревом",
        "picnic",
        "A red-and-white picnic blanket beneath a flowering apple tree, with a wicker basket, a small loaf, berries and cups of lemonade. A few petals rest on the blanket. Keep the food in one tidy central cluster and show a relaxed pause in the spring sunshine.",
        [
          "sits beside the blanket and opens a wicker picnic basket",
          "places a small plate of berries on the blanket",
          "offers a piece of bread on a napkin toward the center",
        ],
      ),
      item(
        "cafe",
        "Кафе и круассаны",
        "cafe",
        "A cozy cafe interior with a round wooden table by a bright spring window. Place flaky croissants on a small plate, plain cups and one little vase with tulips. Gentle steam and crumbs suggest a fresh breakfast; keep the tabletop low enough to preserve the characters' faces and silhouettes.",
        [
          "sits at the table and holds a plain cup with both paws",
          "slides a plate of croissants toward the center",
          "carefully breaks off a small piece of croissant over a napkin",
        ],
      ),
      item(
        "coffee",
        "Кофе на прогулке",
        "park",
        "A spring park path with soft green trees, a wooden bench and dappled light. Use plain kraft takeaway coffee cups with white lids and subtle wisps of steam. Include a small paper bag with a pastry on the bench; no cafe staff or unrelated passersby are visible.",
        [
          "holds a takeaway coffee cup near the chest while taking a relaxed step",
          "holds another cup with one paw and a small pastry bag with the other",
          "carries a small closed cup of warm cocoa with both paws",
        ],
      ),
      item(
        "cake",
        "Покупка весеннего торта",
        "bakery",
        "A welcoming bakery counter displaying a round white cake decorated with strawberries and tiny cream flowers. An open cake box rests on the customer's side, beside a plain payment terminal. The cake must remain intact and neatly supported; no additional shop assistant appears in the frame.",
        [
          "supports the cake box on the counter with both paws and looks at the cake",
          "holds a blank payment card near the terminal",
          "looks excitedly at the strawberries and points with one open paw",
        ],
      ),
      item(
        "berry-tart",
        "Пекут ягодный тарт",
        "kitchen",
        "A bright home kitchen worktable with a small tart shell, a bowl of cream, fresh berries and a wooden spatula. Separate the clean pastry area from the bowl of ingredients. Show the delicate final assembly of the tart, with soft window light and no clutter blocking the characters.",
        [
          "spreads cream inside the tart shell using a small spatula",
          "places strawberries around the tart's edge",
          "arranges a few blueberries in the center using a gentle paw gesture",
        ],
      ),
    ],
    summer: [
      item(
        "walk",
        "Летняя прогулка",
        "meadow",
        "A sunny path beside a calm lake, with daisies, green reeds and a soft blue sky. A light breeze gently moves the grass. Keep the foreground simple and dry, leaving enough negative space around the selected characters to make their outfits and gestures clear.",
        [
          "walks along the path and looks toward the lake",
          "walks alongside with a relaxed open-paw gesture",
          "takes a small energetic step while looking at a dragonfly near the reeds",
        ],
      ),
      item(
        "pool-game",
        "Игра у бассейна",
        "pool",
        "A bright poolside terrace with turquoise water, a low sun umbrella and a colorful soft beach ball. Keep all characters on the dry deck; water sparkles remain in the background. Capture a playful ball exchange, with a clear arc between paws and no extra players.",
        [
          "gently tosses a soft beach ball toward {next} with both paws",
          "raises both paws to catch the beach ball",
          "stands to the side and follows the ball with a cheerful gaze",
        ],
        "stands on the dry pool deck holding a colorful beach ball with both paws, ready to bounce it",
      ),
      item(
        "swim-ring",
        "Надувной круг",
        "pool",
        "A shallow turquoise pool beside a sunlit terrace, with one striped inflatable swim ring and a neatly folded towel. Keep the ring's opening visible and the characters' heads, paws and outfits clear. Stage the scene at the pool edge so no character is hidden behind deep water or pool furniture.",
        [
          "holds a striped inflatable ring upright beside the pool",
          "steadies the opposite side of the ring with one paw",
          "peeks through the open center of the ring without hiding the face",
        ],
      ),
      item(
        "beach",
        "Песочный замок",
        "beach",
        "A warm sandy beach beside a gentle blue sea, with a small sandcastle, a yellow bucket and a short toy shovel. The castle has simple turrets and a few seashells near its base. Show active building on the dry sand, with a softly blurred parasol behind the selected characters.",
        [
          "kneels beside a small sandcastle and shapes a turret with a toy shovel",
          "holds a small bucket beside the castle",
          "presses a seashell gently into the castle wall",
        ],
      ),
      item(
        "picnic",
        "Летний пикник",
        "picnic",
        "A shaded picnic blanket under a leafy tree, with a wicker basket, fresh peaches, sandwiches and a clear lemonade jug. Sunlight filters through leaves and highlights the fruit. Show a simple shared meal with separate plates, natural paw placement and no oversized piles of food.",
        [
          "sits beside the blanket and opens a basket of sandwiches",
          "pours lemonade from a small jug into a cup on the blanket",
          "holds a peach above a small plate and looks toward the others",
        ],
      ),
      item(
        "icecream",
        "Мороженое",
        "beach",
        "A seaside promenade with a low ice-cream stand blurred in the distance. Use neatly formed scoops in plain waffle cones, with a single tiny melting drop and soft summer light. Focus on the cones and delighted, relaxed expressions; do not add an unselected vendor or extra characters.",
        [
          "holds a vanilla ice-cream cone upright near the chest",
          "holds a strawberry cone slightly forward for comparison",
          "carefully holds a small chocolate cone with both paws",
        ],
      ),
      item(
        "lemonade",
        "Готовят лимонад",
        "kitchen",
        "A summer kitchen table with a transparent lemonade jug, lemon slices, mint leaves and a bowl of ice. Place a few clear glasses in a neat row and keep the preparation area clean. Condensation and soft reflections should make the drinks feel cool and fresh without obscuring the paws.",
        [
          "gently stirs lemonade inside a clear jug using a long wooden spoon",
          "adds a lemon slice to a glass resting on the table",
          "places a small mint sprig beside a prepared glass",
        ],
      ),
      item(
        "summer-fruit",
        "Арбуз и ягоды",
        "picnic",
        "A garden picnic table with triangular watermelon slices, a bowl of strawberries and a red-and-white cloth. Keep the fruit bright and juicy with a few natural droplets. Show a small tasting break, leaving room between the table and each character so their hands and clothing remain readable.",
        [
          "holds a watermelon slice above a plate with both paws",
          "places a bowl of strawberries at the center of the table",
          "holds a small watermelon slice and looks at its bright red flesh",
        ],
      ),
      item(
        "grill",
        "Овощи на гриле",
        "meadow",
        "A tidy outdoor cooking area with a small closed-sided grill, a tray of colorful vegetable skewers and a wooden serving board. Show only gentle heat shimmer and a little steam, with no dramatic flames. Keep the selected outfits unchanged and the food preparation tools clearly separated from the characters' bodies.",
        [
          "holds kitchen tongs above a vegetable skewer on the grill",
          "arranges cooked vegetable skewers on a wooden serving board",
          "places a small bowl of tomatoes beside the serving board",
        ],
      ),
      item(
        "cafe",
        "Летняя веранда кафе",
        "cafe",
        "A cozy cafe interior opening onto a shaded summer terrace, with a round table and leafy plants. Place iced coffee in plain transparent cups, a small berry pastry and linen napkins on the table. Keep the atmosphere airy, with bright reflected daylight and a softly blurred background.",
        [
          "holds a plain cup of iced coffee near the tabletop",
          "moves a small plate with a berry pastry toward the center",
          "looks at the pastry while holding a closed cup of fruit drink",
        ],
      ),
    ],
    autumn: [
      item(
        "walk",
        "Прогулка",
        "autumn",
        "A quiet autumn park path covered with a thin layer of golden leaves. Soft amber sunlight passes through orange tree crowns, while distant benches remain blurred. Show an easy walking rhythm with clear gaps between the selected figures; falling leaves must never hide faces or clothing.",
        [
          "walks forward through a few scattered leaves",
          "walks alongside and looks at a golden tree branch",
          "takes a small playful step beside a crisp maple leaf",
        ],
      ),
      item(
        "leaves",
        "Игра с листьями",
        "autumn",
        "A small clearing with colorful fallen autumn leaves in red, orange and yellow. A handful of leaves rises in a gentle arc, with only a few pieces suspended near the paws. Keep the action readable and the ground uncluttered, capturing a playful autumn moment without covering the muzzles or eyes.",
        [
          "gently tosses a small handful of dry leaves upward",
          "reaches toward a falling maple leaf with an open paw",
          "looks up and catches one golden leaf near chest height",
        ],
      ),
      item(
        "tea",
        "Согревающий чай",
        "cafe",
        "A cozy cafe window overlooking an autumn park, with a low wooden table, a small teapot and plain cups of amber tea. A lemon slice, honey jar and folded napkin form a tidy still life. Include delicate steam curls and warm reflections, keeping the table below the characters' faces.",
        [
          "holds a warm cup of tea with both paws",
          "pours tea from a small teapot into a cup on the table",
          "holds a small cup of warm fruit tea and watches the steam",
        ],
      ),
      item(
        "apples",
        "Урожай яблок",
        "orchard",
        "A sunlit apple orchard with low branches carrying ripe red apples. A wicker basket rests on the grass beside a small wooden crate. Show careful fruit picking, with only a few apples in the foreground and a soft golden background; the tree branches should frame rather than conceal the figures.",
        [
          "gently picks a ripe red apple from a low branch",
          "holds a wicker basket open beneath the apples",
          "carefully places one apple into a small wooden crate",
        ],
      ),
      item(
        "pie",
        "Домашний пирог",
        "kitchen",
        "A cozy kitchen worktable with a round apple pie, thin apple slices, a wooden rolling pin and a small bowl of cinnamon. A folded towel rests near the pie dish and warm light comes from the window. Stage one clear baking moment with uncooked dough and finished pastry kept on separate dishes.",
        [
          "arranges thin apple slices inside a pie dish",
          "places a neat strip of dough across the pie",
          "sprinkles a little cinnamon from a small spoon above the work area",
        ],
      ),
      item(
        "cafe",
        "Посиделки в кафе",
        "cafe",
        "A cozy cafe interior with a round wooden table, an upholstered bench and an autumn park visible through the window. Set down plain cups of tea, a small pastry plate and a napkin. Show a calm conversation, gentle steam and comfortable spacing so the bodies remain visible around the low table.",
        [
          "sits at the table and holds a cup with both paws",
          "slides a plate of pastries toward the center",
          "sits beside the table and looks at a small pastry on a napkin",
        ],
      ),
      item(
        "cake",
        "Покупка торта",
        "bakery",
        "A bakery counter with a round white cake decorated with red berries, a plain cardboard cake box and a small payment terminal. Keep the selected figures on the customer's side and the cake supported by the counter. The shop interior is softly blurred; no additional cashier, readable price tags or branded packaging is visible.",
        [
          "steadies an open cake box on the counter with both paws",
          "holds a blank payment card close to the terminal",
          "points toward a berry on the cake while keeping the other paw near the body",
        ],
      ),
      item(
        "coffee",
        "Стаканчики с кофе",
        "park",
        "An autumn park bench beside a path of golden leaves, with plain kraft takeaway cups and a small paper pastry bag. Use white lids, subtle steam and warm side light. Focus on the pause during a walk, with the cups held securely and the silhouettes clearly separated from the trees.",
        [
          "holds a takeaway coffee cup near the chest",
          "carries a second cup and a small pastry bag",
          "holds a small closed cup of warm cocoa with both paws",
        ],
      ),
      item(
        "gingerbread",
        "Пекут пряники",
        "kitchen",
        "A warm kitchen worktable with rolled gingerbread dough, simple star and heart cutters, a tray of baked cookies and a small piping bag. Keep raw dough on a wooden board and finished cookies on a separate cooling tray. A closed oven glows softly in the background, with no extra cooking clothes added.",
        [
          "presses a star-shaped cutter into gingerbread dough",
          "lifts a cut cookie carefully onto a baking tray",
          "adds a small icing dot to an already cooled cookie",
        ],
      ),
      item(
        "pumpkin-soup",
        "Тыквенный суп",
        "kitchen",
        "A cozy autumn kitchen table with a pot of creamy pumpkin soup, a ladle, ceramic bowls and a few pumpkin wedges on a separate board. Include a soft wisp of steam and a small piece of bread beside each bowl. Keep the preparation area simple and the warm orange soup clearly visible.",
        [
          "uses a ladle to serve pumpkin soup into a bowl on the table",
          "places a small piece of bread beside a filled bowl",
          "holds a small empty bowl with both paws, waiting beside the table",
        ],
      ),
    ],
    winter: [
      item(
        "walk",
        "Зимняя прогулка",
        "winter",
        "A snowy park path with soft footprints, snow-covered fir branches and cool blue distance. A few sparse snowflakes drift behind the figures, while warm reflected light separates them from the snow. Show a relaxed winter walk with all selected characters fully visible and no scarves or props hiding their faces.",
        [
          "walks forward along the snowy path",
          "walks alongside and gestures toward a snow-covered branch",
          "takes a small step into a shallow footprint in the snow",
        ],
      ),
      item(
        "snowman",
        "Лепят снеговика",
        "winter",
        "A small snowy clearing with an unfinished three-ball snowman, a carrot and a few smooth dark stones on a wooden tray. Show one clear stage of building the snowman, with compact snowballs and a few paw marks. Keep the selected characters beside the snowman rather than hidden behind it.",
        [
          "steadies the snowman's middle snowball with both paws",
          "gently places a carrot nose on the snowman's head",
          "holds two small dark stones ready for the snowman's buttons",
        ],
      ),
      item(
        "snowballs",
        "Игра в снежки",
        "winter",
        "A soft snow-covered lawn with a few small loosely packed snowballs and low snow mounds. Capture a gentle playful exchange, with a clear trajectory and no impact against a face. Keep the characters well separated and show paw positions and expressions clearly against the calm winter background.",
        [
          "gently tosses a small loose snowball toward {next}",
          "raises both paws to catch the soft snowball",
          "forms a small snowball close to the ground",
        ],
        "forms a small loose snowball between both paws, preparing for a playful throw",
      ),
      item(
        "sled",
        "Катание на санках",
        "winter",
        "A gentle snowy slope with a small wooden sled, red runners and a simple pull rope. Show a slow, playful ride on soft snow, with a few short tracks behind the sled. Use a side-front view that preserves the selected figures' relative heights and keeps faces, paws and the sled visible.",
        [
          "holds the sled rope and takes a slow step forward",
          "sits on the sled with both paws resting on its sides",
          "stands beside the sled and watches its tracks",
        ],
        "sits on a small wooden sled at the top of a gentle slope, holding the rope loosely with both paws",
      ),
      item(
        "ice-lantern",
        "Ледяные фонарики",
        "winter",
        "A winter garden at dusk with small translucent ice lanterns resting on a low wooden bench. Warm battery-light points glow inside the ice, surrounded by a few pine sprigs and berries. Focus on the contrast between cool translucent ice and warm light, with no open flames or additional figures.",
        [
          "sets a small glowing ice lantern carefully on the bench",
          "arranges a pine sprig beside another lantern",
          "leans forward slightly to look at the light inside the ice",
        ],
      ),
      item(
        "cocoa",
        "Какао и зефир",
        "home",
        "A cozy room beside a winter window, with a low table, plain ceramic mugs of cocoa and a small bowl of marshmallows. A knitted blanket rests on the chair behind the figures, never over their outfits. Include soft steam and golden window reflections, creating a quiet warming-up moment.",
        [
          "holds a mug of cocoa with both paws near the chest",
          "adds a marshmallow to a mug on the low table",
          "carefully holds a smaller mug of cocoa while watching the steam",
        ],
      ),
      item(
        "winter-picnic",
        "Зимний пикник",
        "winter",
        "A sheltered snowy park bench with a checked blanket, a closed thermos, a few plain cups and a small paper bag of pastries. Pine branches and snow mounds softly frame the background. Show a short warm-drink break, with the food kept on the bench and all selected outfits unchanged.",
        [
          "pours a warm drink from a thermos into a cup resting on the bench",
          "places pastries on a folded paper napkin",
          "holds a small plain cup with both paws beside the bench",
        ],
      ),
      item(
        "gingerbread",
        "Пряники и глазурь",
        "kitchen",
        "A warm winter kitchen with a board of gingerbread dough, snowflake and star cutters, a baking tray and cooled cookies. Separate the baking and decorating areas on the table. Include thin white icing lines, a few crumbs and a softly glowing closed oven, avoiding piles of tools or extra aprons.",
        [
          "cuts a star shape from the rolled gingerbread dough",
          "moves a shaped cookie carefully onto the baking tray",
          "draws a simple white icing line on a cooled gingerbread cookie",
        ],
      ),
      item(
        "cake",
        "Торт из кондитерской",
        "bakery",
        "A warmly lit bakery window facing a snowy street. A white cake with red berries rests in an open plain cake box on the customer's counter beside a payment terminal. Keep the counter low, the cake intact and all selected faces visible; no additional shop assistant or readable labels appears.",
        [
          "holds the cake box steady on the counter with both paws",
          "presents a blank payment card toward the terminal",
          "looks into the cake box with a delighted, closed-mouth smile",
        ],
      ),
      item(
        "coffee",
        "Горячий кофе навынос",
        "cafe",
        "A cafe doorway overlooking a snowy park, with plain kraft takeaway cups, white lids and a folded pastry bag. Use visible but delicate steam and warm light from the doorway. Show the selected figures pausing before their walk, with the cups below the face and no unselected customers in the background.",
        [
          "holds a hot takeaway coffee cup near the chest",
          "steadies a second cup in one paw and carries a pastry bag in the other",
          "holds a small closed cup of warm cocoa with both paws",
        ],
      ),
    ],
    newyear: [
      item(
        "walk",
        "Новогодняя прогулка",
        "newyear",
        "A festive winter path with soft snow, warm fairy lights on fir trees and a few red ornaments in the distance. A small decorated tree forms a gentle background accent rather than covering the figures. Capture a quiet holiday walk with clear silhouettes, subtle snowfall and no crowds or readable signs.",
        [
          "walks along the festive path while looking at the warm lights",
          "walks alongside and gestures gently toward a decorated fir tree",
          "takes a small cheerful step and watches a slowly falling snowflake",
        ],
      ),
      item(
        "open-gifts",
        "Открывают подарки",
        "home",
        "A cozy living room beside a decorated Christmas tree, with one partly opened gift box, loosened red ribbon and a few neat pieces of wrapping paper. The surprise inside is a simple plush toy partly visible in the box. Capture the exact moment of lifting the lid, with clear paws and curious expressions.",
        [
          "lifts the lid of a gift box resting on a low table",
          "holds the loosened ribbon and looks into the box",
          "leans forward slightly to see the surprise inside the box",
        ],
      ),
      item(
        "give-gifts",
        "Дарят подарки",
        "home",
        "A decorated Christmas tree with warm golden fairy lights forms a soft background. One carefully wrapped red gift box with a wide green ribbon is the main prop. Capture a warm handover at belly height, with both sides of the box supported and the selected characters' faces unobstructed.",
        [
          "offers a wrapped gift box toward {next} with both paws",
          "reaches forward with both paws to receive the gift box",
          "holds a second smaller wrapped parcel and watches the exchange",
        ],
        "holds one wrapped gift box forward toward the viewer with both paws, presenting it without an additional recipient in frame",
      ),
      item(
        "gift-card",
        "Дарят подарочную карту",
        "home",
        "A festive living room with a decorated fir tree and a small gift envelope on a low table. The central prop is a clearly rectangular blank gift card in a simple red-and-gold sleeve, large enough to read as a card rather than money. Show the card's plain front surface with no text, numbers, logos, barcode or QR code.",
        [
          "presents a blank gift card in its red-and-gold sleeve toward {next}",
          "accepts the gift-card sleeve carefully with one paw while holding its small envelope with the other",
          "holds a small ribbon bow and watches the gift-card exchange",
        ],
        "holds a blank gift card in a red-and-gold sleeve facing the viewer at chest height, with its envelope resting on the table",
      ),
      item(
        "decorate-tree",
        "Наряжают ёлку",
        "home",
        "A medium-sized fir tree with warm fairy lights, a few red baubles and a golden star ornament rests beside a low box of decorations. Show reachable branches around the characters' shoulder height, keeping the main faces clear of foliage. Capture the careful placement of one ornament rather than a crowded tree or tangled decorations.",
        [
          "hangs a red bauble by its loop on a reachable fir branch",
          "holds a small box of ornaments open at belly height",
          "chooses a golden star ornament from the decoration box",
        ],
      ),
      item(
        "garland",
        "Развешивают гирлянду",
        "home",
        "A cozy festive corner beside a fir tree, with one gently curved string of warm golden lights and a low basket for unused decorations. The cable should form a simple readable arc, never cross a face or wrap around a body. Show a calm decorating moment with soft highlights on the bulbs.",
        [
          "holds one end of a glowing fairy-light garland at shoulder height",
          "steadies the middle of the garland with an open paw",
          "holds the remaining coiled end neatly beside the decoration basket",
        ],
      ),
      item(
        "gift-wrap",
        "Упаковывают подарки",
        "home",
        "A low holiday worktable with a small plain gift box, red wrapping paper, green ribbon and a finished bow. Keep the paper folds tidy and separate a completed parcel from the wrapping area. Warm tree lights glow in the distance, while the main action and paw positions remain clearly visible.",
        [
          "folds wrapping paper neatly around a small box on the table",
          "ties a broad green ribbon around the parcel",
          "places a prepared bow beside the wrapped gift",
        ],
      ),
      item(
        "gingerbread",
        "Новогодние пряники",
        "kitchen",
        "A festive kitchen worktable with gingerbread dough, star and fir-tree cutters, cooled cookies and small piping bags of white icing. A few pine sprigs and red ribbons decorate the far edge of the table. Show the baking and decorating process in clearly separated areas, with no readable writing on the cookies.",
        [
          "presses a fir-tree cookie cutter into rolled gingerbread dough",
          "places star-shaped cookies onto a baking tray",
          "adds a simple white snowflake icing pattern to a cooled cookie",
        ],
      ),
      item(
        "cake",
        "Праздничный торт",
        "kitchen",
        "A low table beside a decorated fir tree holds a round white holiday cake with red berries and a small plain star decoration. A wooden cake board, a pastry bag and a folded napkin are the only extra tools. Show careful final decoration, keeping the cake stable and leaving the selected figures' full silhouettes readable.",
        [
          "adds a neat cream swirl to the cake using a small pastry bag",
          "places a few red berries around the cake's upper edge",
          "holds a small plain star decoration ready to place on the cake",
        ],
      ),
      item(
        "holiday-dinner",
        "Накрывают праздничный стол",
        "home",
        "A welcoming New Year dinner table with plain plates, folded red napkins, a small fruit bowl and a low evergreen centerpiece. Keep the centerpiece below the muzzles so it never blocks expressions. Depict the final table-setting moment, with the main selected figures beside the table rather than hidden behind tall dishes.",
        [
          "sets a plain ceramic plate on the table with both paws",
          "folds a red napkin beside the plate",
          "places a small bowl of tangerines near the center of the table",
        ],
      ),
      item(
        "cocoa",
        "Какао у ёлки",
        "home",
        "A quiet festive room with a softly glowing Christmas tree and a low table holding plain mugs of cocoa, a small bowl of marshmallows and two gingerbread stars. Use warm golden bokeh and delicate steam curls. Keep the mugs below the faces and the clothing fully visible, creating a calm holiday pause.",
        [
          "holds a warm mug of cocoa with both paws",
          "places a gingerbread star on a small saucer",
          "holds a smaller mug and looks at the glowing tree lights",
        ],
      ),
      item(
        "newyear-photo",
        "Фото у новогодней ёлки",
        "home",
        "A decorated Christmas tree with red ornaments and warm golden fairy lights, a few wrapped gifts arranged neatly at its base and soft glowing bokeh behind the figures. Compose a clean holiday portrait that fits the selected frame, with every face, ear and paw visible and comfortable spacing between the selected characters.",
        [
          "faces the camera with a relaxed closed-mouth smile and one paw raised in a small greeting",
          "stands beside the first selected character with a gentle open-paw greeting",
          "stands slightly forward with both paws resting near the body and looks at the camera",
        ],
      ),
    ],
  };
  for (const [season, scenes] of Object.entries(catalog))
    scenes.forEach((scene) => {
      scene.season = season;
    });
  const forSeason = (season) => catalog[season || "spring"] || [];
  const find = (id, season) =>
    forSeason(season).find((scene) => scene.id === id);
  function describe(scene, chars) {
    const ordered = [...chars].sort((a, b) => a.x - b.x);
    const roles = Object.fromEntries(
      ordered.map((char, i) => [
        char.who,
        (ordered.length === 1 && scene.solo
          ? scene.solo
          : scene.tasks[Math.min(i, scene.tasks.length - 1)]
        ).replaceAll("{next}", ordered[(i + 1) % ordered.length].who),
      ]),
    );
    const staging = `Situation staging. Cast: exactly the selected ${ordered.length} capybara${ordered.length === 1 ? "" : "s"} (${ordered.map((c) => c.who).join(", ")}); no additional characters, shop assistants or stray paws. Use these situation-specific gestures instead of a neutral standing pose. Preserve the selected outfits and relative family heights; do not add aprons, swimwear or unrelated accessories. Keep faces, headwear and paws unobstructed, props at a believable scale and contact points clear. Packaging, takeaway cups and gift cards have plain surfaces without readable text, numbers or logos. Keep the main action in focus, with the seasonal setting softly blurred and room around every complete silhouette.`;
    return {
      roles,
      staging,
      setting:
        (scene.season === "newyear" ? "New Year celebration. " : "") + scene.en,
    };
  }
  return { forSeason, find, describe };
})();
