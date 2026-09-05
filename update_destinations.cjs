const fs = require('fs');
const path = require('path');

const destinationsData = {
  'kilo-5-beach': {
    id: ['### Pesona Bawah Laut di Tengah Kota', 'Nikmati keunikan Pantai Kilo 5 yang menawarkan keindahan terumbu karang tepat di pinggir jalan raya kota Luwuk. Anda bisa langsung snorkeling atau sekadar menikmati pisang goreng khas pesisir sambil memandangi laut yang tenang.'],
    en: ['### Underwater Charm in the City Center', 'Enjoy the uniqueness of Kilo 5 Beach, which offers beautiful coral reefs right along the main road of Luwuk city. You can go snorkeling immediately or simply enjoy local fried bananas while looking at the calm sea.'],
    es: ['### Encanto Submarino en el Centro de la Ciudad', 'Disfrute de la singularidad de la playa Kilo 5, que ofrece hermosos arrecifes de coral justo al lado de la carretera principal de la ciudad de Luwuk. Puede hacer snorkel de inmediato o simplemente disfrutar de plátanos fritos locales mientras mira el mar en calma.'],
    fr: ['### Charme Sous-marin au Centre-ville', 'Profitez du caractère unique de la plage Kilo 5, qui offre de magnifiques récifs coralliens juste le long de la route principale de la ville de Luwuk. Vous pouvez faire de la plongée avec tuba immédiatement ou simplement déguster des bananes frites locales en regardant la mer calme.'],
    zh: ['### 市中心的水下魅力', '享受Kilo 5海滩的独特之处，这里在卢武克市主干道旁提供美丽的珊瑚礁。您可以立即去浮潜，或者一边欣赏平静的海面，一边享用当地的炸香蕉。']
  },
  'piala-waterfall': {
    id: ['### Kesegaran Air Terjun Hijau Toska', 'Air Terjun Piala menyuguhkan aliran air sungai yang jatuh bertingkat dengan kolam alami berwarna hijau toska yang jernih. Area ini sangat cocok untuk berenang menikmati udara segar pegunungan Hanga-Hanga.'],
    en: ['### The Freshness of Turquoise Waterfalls', 'Piala Waterfall presents cascading river flows with clear turquoise natural pools. This area is perfect for swimming and enjoying the fresh mountain air of Hanga-Hanga.'],
    es: ['### La Frescura de las Cascadas Turquesas', 'La cascada Piala presenta flujos de ríos en cascada con piscinas naturales de color turquesa claro. Esta área es perfecta para nadar y disfrutar del aire fresco de la montaña de Hanga-Hanga.'],
    fr: ['### La Fraîcheur des Cascades Turquoise', 'La cascade de Piala présente des flux de rivière en cascade avec des piscines naturelles turquoise clair. Cette zone est parfaite pour nager et profiter de l\'air frais de la montagne de Hanga-Hanga.'],
    zh: ['### 绿松石瀑布的清新', 'Piala瀑布呈现层叠的河流和清澈的绿松石天然水池。这个地区非常适合游泳和享受Hanga-Hanga的新鲜山地空气。']
  },
  'laumarang-waterfall': {
    id: ['### Petualangan Alam Tersembunyi', 'Dikelilingi oleh vegetasi hutan hujan yang lebat, Air Terjun Laumarang menawarkan pengalaman petualangan sejati. Suara gemuruh air dan suasana hutan yang magis akan langsung menyambut Anda setelah perjalanan trekking.'],
    en: ['### Hidden Nature Adventure', 'Surrounded by dense rainforest vegetation, Laumarang Waterfall offers a true adventure experience. The sound of roaring water and the magical forest atmosphere will welcome you after trekking.'],
    es: ['### Aventura de Naturaleza Oculta', 'Rodeada de densa vegetación de selva tropical, la cascada de Laumarang ofrece una verdadera experiencia de aventura. El sonido del agua rugiente y la atmósfera mágica del bosque le darán la bienvenida después del senderismo.'],
    fr: ['### Aventure Naturelle Cachée', 'Entourée d\'une végétation de forêt tropicale dense, la cascade de Laumarang offre une véritable expérience d\'aventure. Le bruit de l\'eau rugissante et l\'atmosphère magique de la forêt vous accueilleront après la randonnée.'],
    zh: ['### 隐藏的自然冒险', '被茂密的雨林植被环绕，Laumarang瀑布提供了真正的冒险体验。徒步旅行后，咆哮的水声和神奇的森林氛围将欢迎您。']
  },
  'salodik-waterfall': {
    id: ['### Undakan Alam yang Memukau', 'Salodik terkenal dengan air terjun bertingkatnya yang mengalir melintasi formasi bebatuan kapur eksotis. Dikelilingi hutan pinus, udara di sini sangat sejuk dan cocok untuk tempat bersantai keluarga.'],
    en: ['### Stunning Natural Cascades', 'Salodik is famous for its cascading waterfalls that flow across exotic limestone formations. Surrounded by pine forests, the air here is very cool and suitable for a family relaxing spot.'],
    es: ['### Impresionantes Cascadas Naturales', 'Salodik es famoso por sus cascadas que fluyen a través de exóticas formaciones de piedra caliza. Rodeado de bosques de pinos, el aire aquí es muy fresco y adecuado para un lugar de relajación familiar.'],
    fr: ['### Superbes Cascades Naturelles', 'Salodik est célèbre pour ses cascades qui coulent à travers des formations calcaires exotiques. Entouré de forêts de pins, l\'air ici est très frais et convient à un lieu de détente en famille.'],
    zh: ['### 令人惊叹的自然瀑布', 'Salodik以其流过异国石灰岩层叠瀑布而闻名。四周环绕着松树林，这里的空气非常凉爽，适合全家休闲。']
  },
  'pulau-dua-balantak': {
    id: ['### Panorama Dua Bukit Karang', 'Ikon dari Pulau Dua adalah dua buah bukit karang raksasa yang menjulang dari dasar laut. Anda bisa mendaki salah satu bukitnya untuk mendapatkan pemandangan spektakuler matahari terbit dan lautan biru yang luas.'],
    en: ['### Panorama of Two Coral Hills', 'The icon of Pulau Dua is two giant coral hills rising from the seabed. You can climb one of the hills to get a spectacular view of the sunrise and the vast blue ocean.'],
    es: ['### Panorama de Dos Colinas de Coral', 'El icono de Pulau Dua son dos colinas gigantes de coral que se elevan desde el lecho marino. Puede subir a una de las colinas para tener una vista espectacular del amanecer y el vasto océano azul.'],
    fr: ['### Panorama de Deux Collines de Corail', 'L\'icône de Pulau Dua est constituée de deux collines géantes de corail s\'élevant du fond marin. Vous pouvez escalader l\'une des collines pour avoir une vue spectaculaire sur le lever du soleil et le vaste océan bleu.'],
    zh: ['### 两座珊瑚山的全景', 'Pulau Dua的标志是从海底升起的两座巨大的珊瑚山。您可以爬上其中一座山，壮观的日出和广阔的蔚蓝海洋尽收眼底。']
  },
  'bukit-teletubbies': {
    id: ['### Hamparan Savana Hijau Luas', 'Sesuai namanya, perbukitan di Bualemo ini menyerupai pemandangan bukit di serial Teletubbies. Hamparan padang rumput hijau yang bergulung-gulung menawarkan lanskap fotografi yang sangat memanjakan mata.'],
    en: ['### Vast Green Savanna', 'As the name implies, the hills in Bualemo resemble the scenery in the Teletubbies series. The rolling green grassland offers a very eye-pleasing photography landscape.'],
    es: ['### Vasta Sabana Verde', 'Como su nombre lo indica, las colinas de Bualemo se asemejan al paisaje de la serie Teletubbies. La pradera verde ondulada ofrece un paisaje de fotografía muy agradable a la vista.'],
    fr: ['### Vaste Savane Verte', 'Comme son nom l\'indique, les collines de Bualemo ressemblent aux paysages de la série Teletubbies. Les prairies vertes vallonnées offrent un paysage photographique très agréable à l\'œil.'],
    zh: ['### 广阔的绿色大草原', '顾名思义，Bualemo的丘陵类似于天线宝宝系列中的风景。连绵起伏的绿色草原提供了非常赏心悦目的摄影景观。']
  },
  'paisu-pok-lake': {
    id: ['### Kaca Biru di Jantung Hutan', 'Danau Paisu Pok adalah keajaiban alam berupa danau air tawar berair sangat jernih kebiruan layaknya kaca. Anda bahkan dapat melihat dasar danau dan ikan-ikan yang berenang bebas dari atas perahu kano.'],
    en: ['### Blue Glass in the Heart of the Forest', 'Paisu Pok Lake is a natural wonder in the form of a freshwater lake with very clear bluish water like glass. You can even see the bottom of the lake and fish swimming freely from a canoe.'],
    es: ['### Vidrio Azul en el Corazón del Bosque', 'El lago Paisu Pok es una maravilla natural en forma de lago de agua dulce con aguas azuladas muy claras como el cristal. Incluso puedes ver el fondo del lago y los peces nadando libremente desde una canoa.'],
    fr: ['### Verre Bleu au Cœur de la Forêt', 'Le lac Paisu Pok est une merveille naturelle sous la forme d\'un lac d\'eau douce aux eaux bleuâtres très claires comme du verre. Vous pouvez même voir le fond du lac et les poissons nager librement depuis un canoë.'],
    zh: ['### 森林中心的蓝色玻璃', 'Paisu Pok湖是一个自然奇观，其淡水湖泊的湖水像玻璃一样清澈湛蓝。您甚至可以从独木舟上看到湖底和自由游动的鱼。']
  },
  'paisu-batango-lake': {
    id: ['### Air Payau Pembawa Ketenangan', 'Berbeda dengan Paisu Pok, Danau Paisu Batango memiliki campuran air payau karena letaknya yang berdekatan dengan laut. Warna airnya yang memikat dikelilingi rimbunnya pepohonan menciptakan harmoni alam yang menenangkan.'],
    en: ['### Tranquil Brackish Water', 'Unlike Paisu Pok, Paisu Batango Lake has a mixture of brackish water because of its proximity to the sea. Its captivating water color surrounded by lush trees creates a soothing natural harmony.'],
    es: ['### Agua Salobre Tranquila', 'A diferencia de Paisu Pok, el lago Paisu Batango tiene una mezcla de agua salobre debido a su proximidad al mar. Su cautivador color de agua rodeado de frondosos árboles crea una relajante armonía natural.'],
    fr: ['### Eau Saumâtre Tranquille', 'Contrairement à Paisu Pok, le lac Paisu Batango a un mélange d\'eau saumâtre en raison de sa proximité avec la mer. La couleur captivante de son eau entourée d\'arbres luxuriants crée une harmonie naturelle apaisante.'],
    zh: ['### 宁静的微咸水', '与Paisu Pok不同，Paisu Batango湖因靠近大海而混合了微咸水。迷人的水色被茂密的树木环绕，创造了舒缓的自然和谐。']
  },
  'mbuang-mbuang-island': {
    id: ['### Surga Ubur-Ubur Tanpa Sengat', 'Mbuang-Mbuang terkenal dengan ubur-ubur tanpa sengat di danau purbanya serta terumbu karang yang perawan. Ini adalah destinasi sempurna untuk snorkeling eksklusif dan merasakan kehidupan pesisir yang otentik.'],
    en: ['### Stingless Jellyfish Paradise', 'Mbuang-Mbuang is famous for stingless jellyfish in its ancient lakes and virgin coral reefs. This is a perfect destination for exclusive snorkeling and experiencing authentic coastal life.'],
    es: ['### Paraíso de Medusas sin Aguijón', 'Mbuang-Mbuang es famoso por las medusas sin aguijón en sus antiguos lagos y arrecifes de coral vírgenes. Este es un destino perfecto para hacer snorkel exclusivo y experimentar la auténtica vida costera.'],
    fr: ['### Paradis des Méduses sans Dard', 'Mbuang-Mbuang est célèbre pour ses méduses sans dard dans ses anciens lacs et ses récifs coralliens vierges. C\'est une destination parfaite pour la plongée en apnée exclusive et la vie côtière authentique.'],
    zh: ['### 无刺水母天堂', 'Mbuang-Mbuang以其古老湖泊中的无刺水母和原始珊瑚礁而闻名。这是进行专属浮潜和体验真实沿海生活的完美目的地。']
  },
  'poganda-beach': {
    id: ['### Pasir Putih Sepi di Peleng', 'Pantai Poganda menyuguhkan hamparan pasir putih bersih yang dikelilingi oleh pepohonan kelapa yang teduh. Karena belum terlalu ramai, pantai ini menawarkan pengalaman liburan serasa di pulau pribadi.'],
    en: ['### Quiet White Sands in Peleng', 'Poganda Beach presents a stretch of clean white sand surrounded by shady coconut trees. Because it is not too crowded, this beach offers a vacation experience like on a private island.'],
    es: ['### Arenas Blancas y Tranquilas en Peleng', 'La playa de Poganda presenta un tramo de arena blanca limpia rodeada de cocoteros con sombra. Debido a que no está demasiado concurrida, esta playa ofrece una experiencia de vacaciones como en una isla privada.'],
    fr: ['### Sables Blancs Tranquilles à Peleng', 'La plage de Poganda présente une étendue de sable blanc et propre entourée de cocotiers ombragés. Parce qu\'elle n\'est pas trop fréquentée, cette plage offre une expérience de vacances comme sur une île privée.'],
    zh: ['### 佩伦安静的白沙', 'Poganda海滩呈现出一段干净的白沙，周围环绕着阴凉的椰树。由于不拥挤，这片海滩提供了如在私人岛屿上的度假体验。']
  },
  'teduang-beach': {
    id: ['### Relaksasi di Bawah Nyiur Melambai', 'Pantai Teduang di Peleng adalah tempat singgah yang luar biasa dengan gazebo-gazebo santai yang didirikan menjorok ke perairan dangkal. Anda dapat bersantai menikmati senja sambil ditemani hembusan angin laut.'],
    en: ['### Relaxation under Swaying Palms', 'Teduang Beach in Peleng is a wonderful stopover with relaxing gazebos built jutting into the shallow waters. You can relax enjoying the twilight while accompanied by the sea breeze.'],
    es: ['### Relajación bajo las Palmeras Ondulantes', 'La playa de Teduang en Peleng es una parada maravillosa con relajantes glorietas construidas que se adentran en las aguas poco profundas. Puedes relajarte disfrutando del crepúsculo acompañado por la brisa marina.'],
    fr: ['### Détente sous les Palmiers Ondulants', 'La plage de Teduang à Peleng est une halte merveilleuse avec des belvédères relaxants construits qui s\'avancent dans les eaux peu profondes. Vous pouvez vous détendre en profitant du crépuscule accompagné de la brise marine.'],
    zh: ['### 摇曳棕榈下的放松', '佩伦的Teduang海滩是一个绝佳的停留地，建在浅水区的凉亭非常适合放松。您可以伴着海风，放松身心享受黄昏。']
  },
  'oyama-beach': {
    id: ['### Hamparan Pasir Timbul yang Memikat', 'Pantai Oyama menyimpan daya tarik unik berupa gosong pasir (sandbar) atau pasir timbul putih yang muncul saat air surut. Perairan jernih di sekelilingnya menjadikannya spot sempurna untuk berenang santai.'],
    en: ['### Captivating Emerged Sandbars', 'Oyama Beach holds a unique attraction in the form of a sandbar or white emerged sand that appears at low tide. The clear waters surrounding it make it a perfect spot for leisurely swimming.'],
    es: ['### Bancos de Arena Emergidos Cautivadores', 'La playa de Oyama tiene una atracción única en forma de banco de arena o arena blanca emergida que aparece con la marea baja. Las aguas cristalinas que lo rodean lo convierten en un lugar perfecto para nadar sin prisas.'],
    fr: ['### Bancs de Sable Émergés Captivants', 'La plage d\'Oyama a une attraction unique sous la forme d\'un banc de sable ou de sable blanc émergé qui apparaît à marée basse. Les eaux claires qui l\'entourent en font un endroit parfait pour nager tranquillement.'],
    zh: ['### 迷人的出水沙洲', 'Oyama海滩拥有独特的吸引力，即退潮时出现的沙洲或白色出水沙。周围清澈的海水使其成为休闲游泳的完美场所。']
  },
  'mandel-beach': {
    id: ['### Surga Tersembunyi di Peling Tengah', 'Di Pantai Mandel, Anda akan disambut oleh butiran pasir putih halus dan air laut berwarna gradasi pirus. Gugusan formasi batuan karang kecil di sekitarnya menambah karakter eksotis pada pantai yang masih perawan ini.'],
    en: ['### Hidden Paradise in Central Peling', 'At Mandel Beach, you will be greeted by fine white sand and turquoise gradient seawater. The cluster of small coral rock formations around it adds an exotic character to this virgin beach.'],
    es: ['### Paraíso Escondido en Peling Central', 'En la playa de Mandel, será recibido por fina arena blanca y agua de mar con gradiente turquesa. El grupo de pequeñas formaciones rocosas de coral a su alrededor añade un carácter exótico a esta playa virgen.'],
    fr: ['### Paradis Caché au Centre de Peling', 'À la plage de Mandel, vous serez accueilli par du sable fin et blanc et une eau de mer en dégradé turquoise. Le groupe de petites formations de roches coralliennes autour ajoute un caractère exotique à cette plage vierge.'],
    zh: ['### 中Peling的隐藏天堂', '在Mandel海滩，迎接您的将是细白的沙滩和绿松石色渐变的海水。周围的一簇小珊瑚礁岩层为这个原始海滩增添了异国情调。']
  },
  'bontolan-beach': {
    id: ['### Kedamaian di Ujung Peleng', 'Pantai Bontolan menawarkan perairan yang dangkal dengan ombak yang sangat tenang, sangat ideal untuk wisata keluarga dan bermain kano. Senja di Bontolan sering kali melukiskan warna lembayung yang luar biasa indah di cakrawala.'],
    en: ['### Peace at the Edge of Peleng', 'Bontolan Beach offers shallow waters with very calm waves, highly ideal for family tourism and canoeing. Twilight at Bontolan often paints an incredibly beautiful purplish color on the horizon.'],
    es: ['### Paz en el Borde de Peleng', 'La playa de Bontolan ofrece aguas poco profundas con olas muy tranquilas, muy ideales para el turismo familiar y el piragüismo. El crepúsculo en Bontolan a menudo pinta un color violáceo increíblemente hermoso en el horizonte.'],
    fr: ['### Paix au Bord de Peleng', 'La plage de Bontolan offre des eaux peu profondes avec des vagues très calmes, très idéales pour le tourisme familial et le canoë. Le crépuscule à Bontolan peint souvent une couleur violacée incroyablement belle à l\'horizon.'],
    zh: ['### 佩伦边缘的宁静', 'Bontolan海滩水浅浪平，非常适合家庭旅游和划独木舟。Bontolan的黄昏经常在天际画出极其美丽的紫红色。']
  },
  'goa-buloling': {
    id: ['### Eksplorasi Stalaktit Magis', 'Gua Buloling menghadirkan keindahan ornamen gua berupa stalaktit dan stalagmit yang masih alami. Lubang cahaya di bagian atas gua menciptakan efek "ray of light" (cahaya surga) yang sangat dramatis untuk diabadikan oleh kamera.'],
    en: ['### Magical Stalactite Exploration', 'Buloling Cave presents the beauty of cave ornaments in the form of natural stalactites and stalagmites. The light hole at the top of the cave creates a very dramatic "ray of light" effect to capture on camera.'],
    es: ['### Exploración Mágica de Estalactitas', 'La Cueva Buloling presenta la belleza de los ornamentos de la cueva en forma de estalactitas y estalagmitas naturales. El agujero de luz en la parte superior de la cueva crea un efecto de "rayo de luz" muy dramático para capturar con la cámara.'],
    fr: ['### Exploration Magique de Stalactites', 'La grotte de Buloling présente la beauté des ornements de la grotte sous forme de stalactites et de stalagmites naturelles. Le trou de lumière au sommet de la grotte crée un effet de "rayon de lumière" très dramatique à capturer à l\'appareil photo.'],
    zh: ['### 神奇的钟乳石探索', 'Buloling洞穴呈现了自然钟乳石和石笋形式的洞穴装饰之美。洞穴顶部的光洞创造了非常戏剧性的“光线”效果，适合用相机捕捉。']
  },
  'pompon-beach': {
    id: ['### Sudut Tenang Pantai Tropis', 'Pantai Pompon adalah representasi sempurna dari pantai tropis sunyi. Ombaknya yang lembut dipadukan dengan garis pantai yang bersih membuatnya menjadi tempat terbaik untuk membaca buku atau bersantai melepaskan penat.'],
    en: ['### A Quiet Corner of a Tropical Beach', 'Pompon Beach is a perfect representation of a secluded tropical beach. Its gentle waves combined with a clean coastline make it the best place to read a book or relax to release fatigue.'],
    es: ['### Un Rincón Tranquilo de una Playa Tropical', 'La playa Pompon es una representación perfecta de una playa tropical apartada. Sus suaves olas combinadas con una costa limpia la convierten en el mejor lugar para leer un libro o relajarse.'],
    fr: ['### Un Coin Tranquille d\'une Plage Tropicale', 'La plage de Pompon est une représentation parfaite d\'une plage tropicale isolée. Ses vagues douces combinées à un littoral propre en font le meilleur endroit pour lire un livre ou se détendre.'],
    zh: ['### 热带海滩的宁静角落', 'Pompon海滩是幽静热带海滩的完美代表。温和的海浪加上干净的海岸线，使其成为看书或放松释放疲劳的最佳场所。']
  },
  'kawalu-bay': {
    id: ['### Keindahan Teluk yang Melengkung', 'Teluk Kawalu menyajikan lanskap air yang tenang, dilindungi oleh bukit-bukit karang yang melengkung. Perairan di teluk ini sangat jernih dan menyimpan potensi taman laut yang menanti untuk dijelajahi oleh para penyelam.'],
    en: ['### The Beauty of the Curved Bay', 'Kawalu Bay presents a calm water landscape, protected by curved coral hills. The waters in this bay are very clear and hold marine park potential waiting to be explored by divers.'],
    es: ['### La Belleza de la Bahía Curva', 'La bahía de Kawalu presenta un paisaje de aguas tranquilas, protegido por colinas de coral curvas. Las aguas en esta bahía son muy claras y tienen el potencial de un parque marino que espera ser explorado por los buceadores.'],
    fr: ['### La Beauté de la Baie Courbe', 'La baie de Kawalu présente un paysage d\'eau calme, protégé par des collines de corail courbes. Les eaux de cette baie sont très claires et recèlent un potentiel de parc marin qui attend d\'être exploré par les plongeurs.'],
    zh: ['### 弯曲海湾的美丽', 'Kawalu湾呈现出平静的水面景观，受弯曲的珊瑚山保护。这个海湾的水非常清澈，蕴藏着等待潜水员探索的海洋公园潜力。']
  },
  'kamumu-waterfall': {
    id: ['### Oase Menyegarkan di Bulagi', 'Berada jauh di pelosok Peleng, Air Terjun Kamumu menyuguhkan panorama air jatuh yang lebar dan bertingkat. Suasana asri dan sejuk sangat mendominasi, memberikan penyegaran maksimal setelah perjalanan jauh.'],
    en: ['### Refreshing Oasis in Bulagi', 'Located deep in the remote area of Peleng, Kamumu Waterfall presents a panorama of wide and cascading falls. The lush and cool atmosphere dominates, providing maximum refreshment after a long journey.'],
    es: ['### Oasis Refrescante en Bulagi', 'Ubicada en lo profundo de la remota zona de Peleng, la Cascada Kamumu presenta un panorama de cataratas anchas y en cascada. El ambiente exuberante y fresco domina, proporcionando un refresco máximo después de un largo viaje.'],
    fr: ['### Oasis Rafraîchissante à Bulagi', 'Située au fond de la région isolée de Peleng, la cascade de Kamumu présente un panorama de chutes larges et en cascade. L\'atmosphère luxuriante et fraîche domine, offrant un rafraîchissement maximal après un long voyage.'],
    zh: ['### Bulagi令人耳目一新的绿洲', 'Kamumu瀑布位于Peleng偏远地区的深处，呈现出宽阔和层叠的瀑布全景。郁郁葱葱的凉爽氛围占据主导地位，为长途旅行后提供最大的清凉。']
  },
  'mokokawa-waterfall': {
    id: ['### Pesona Air Jatuh di Balik Rimba', 'Air Terjun Mokokawa mungkin sedikit menantang untuk diakses, namun keindahannya sepadan dengan usahanya. Airnya yang mengalir deras di antara rimbunnya hutan sekunder menawarkan nuansa petualangan yang eksklusif.'],
    en: ['### The Charm of the Falls Behind the Jungle', 'Mokokawa Waterfall might be a bit challenging to access, but its beauty is worth the effort. Its fast-flowing water amidst the dense secondary forest offers an exclusive adventure nuance.'],
    es: ['### El Encanto de las Cataratas Detrás de la Selva', 'La Cascada Mokokawa puede ser un poco difícil de acceder, pero su belleza vale la pena el esfuerzo. Su agua de flujo rápido en medio del denso bosque secundario ofrece un matiz de aventura exclusivo.'],
    fr: ['### Le Charme des Chutes Derrière la Jungle', 'La cascade de Mokokawa peut être un peu difficile d\'accès, mais sa beauté en vaut la peine. Son eau à débit rapide au milieu de la forêt secondaire dense offre une nuance d\'aventure exclusive.'],
    zh: ['### 丛林背后瀑布的魅力', 'Mokokawa瀑布可能有点难以进入，但它的美丽值得努力。在茂密的次生林中湍急的水流提供了一种独特的冒险氛围。']
  },
  'long-beach': {
    id: ['### Garis Pantai yang Tak Berujung', 'Long Beach (Pantai Panjang) Banggai menampilkan hamparan garis pantai yang membentang luas. Sempurna untuk berjalan tanpa alas kaki sambil mencari kerang atau sekadar memanjakan mata memandang laut lepas.'],
    en: ['### Endless Coastline', 'Long Beach Banggai features an extensive stretch of coastline. Perfect for walking barefoot while looking for shells or simply spoiling your eyes looking at the open sea.'],
    es: ['### Litoral Interminable', 'Long Beach Banggai cuenta con un extenso tramo de costa. Perfecto para caminar descalzo mientras busca conchas o simplemente deleitar la vista mirando a mar abierto.'],
    fr: ['### Littoral Sans Fin', 'Long Beach Banggai dispose d\'une vaste étendue de littoral. Parfait pour marcher pieds nus tout en cherchant des coquillages ou tout simplement gâter vos yeux en regardant la haute mer.'],
    zh: ['### 无尽的海岸线', '邦盖的Long Beach拥有广阔的海岸线。非常适合赤脚散步，寻找贝壳，或者只是欣赏开阔的海洋以大饱眼福。']
  }
};

async function run() {
  const baseDir = path.join(process.cwd(), 'src', 'content', 'destinations');
  
  if (!fs.existsSync(baseDir)) {
    console.log('Destinations directory not found.');
    return;
  }
  
  const langs = ['id', 'en', 'es', 'fr', 'zh'];
  let count = 0;
  
  for (const lang of langs) {
    const langDir = path.join(baseDir, lang);
    if (!fs.existsSync(langDir)) continue;
    
    const files = fs.readdirSync(langDir);
    
    for (const file of files) {
      if (!file.endsWith('.md')) continue;
      
      const slug = file.replace('.md', '');
      const filePath = path.join(langDir, file);
      
      let content = fs.readFileSync(filePath, 'utf-8');
      
      if (destinationsData[slug] && destinationsData[slug][lang]) {
        const replacementHeading = destinationsData[slug][lang][0];
        const replacementPara = destinationsData[slug][lang][1];
        
        const newText = `${replacementHeading}\n\n${replacementPara}`;
        
        // Use regex to find "### Menikmati Keindahan Alam" and the paragraph below it.
        const regex = /### Menikmati Keindahan Alam\n\nKeindahan alam di sini sangat menakjubkan\. Pengunjung dapat menikmati suasana yang tenang dan berbagai aktivitas luar ruangan\. Tempat ini sangat cocok bagi Anda yang mencari ketenangan dari hiruk-pikuk kota\./g;
        
        if (regex.test(content)) {
          content = content.replace(regex, newText);
          fs.writeFileSync(filePath, content, 'utf-8');
          console.log(`Updated ${lang}/${slug}`);
          count++;
        } else {
            console.log(`NOT MATCHED in ${lang}/${slug}`);
        }
      }
    }
  }
  console.log(`Total files updated: ${count}`);
}

run();
