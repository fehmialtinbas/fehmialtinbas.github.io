// All site copy lives here, in English and Turkish.
// Each section is one station of the rolling mill; the 3D camera visits them in this order.

export type Lang = 'en' | 'tr';
export type L = Record<Lang, string>;
const l = (en: string, tr: string): L => ({ en, tr });

export interface Stand { code: string; title: L; tech: string; text: L }
export interface Card { title: L; meta: L; text: L; href: string }
export interface Entry { title: string; meta: L }
export interface Action { label: L; href: string; primary?: boolean }

export interface Section {
  id: string;
  side: 'left' | 'right';
  code: string; // HUD station code
  machine: L; // HUD machine name
  temp: number; // material temperature shown in the HUD, °C
  kicker: L;
  title: L;
  meta?: L;
  body?: L[];
  entries?: Entry[];
  tags?: string[];
  stands?: Stand[];
  bullets?: L[];
  stats?: { value: string; label: L }[];
  chips?: { group: L; list: string[] }[];
  cards?: Card[];
  actions?: Action[];
  contact?: boolean;
}

export const links = {
  email: 'mailto:mfehmialtinbas@gmail.com',
  github: 'https://github.com/fehmialtinbas',
  linkedin: 'https://linkedin.com/in/fehmialtinbas',
  medium: 'https://medium.com/@mfehmialtinbas',
  article:
    'https://medium.com/@mfehmialtinbas/how-to-use-elastic-stack-to-monitor-your-node-js-applications-1ed5c5e7eceb',
  hamal: 'https://github.com/fehmialtinbas/Hamal',
  tsDocker: 'https://github.com/fehmialtinbas/ts_node_js_docker',
};

export const ui = {
  loading: l('Heating up the furnace…', 'Fırın ısınıyor…'),
  scroll: l('Scroll to start the line', 'Hattı başlatmak için kaydır'),
  stations: l('Stations', 'İstasyonlar'),
  temp: l('Strip temperature', 'Şerit sıcaklığı'),
  footer: l('Built with Three.js. The mill is stylised, the career is real.', 'Three.js ile yapıldı. Hadde temsili, kariyer gerçek.'),
};

export const sections: Section[] = [
  {
    id: 'start',
    side: 'left',
    code: 'ST-00',
    machine: l('Furnace discharge', 'Fırın çıkışı'),
    temp: 1220,
    kicker: l('Full-stack Software Developer · Istanbul', 'Full-stack Yazılım Geliştirici · İstanbul'),
    title: l('Mustafa Fehmi Altınbaş', 'Mustafa Fehmi Altınbaş'),
    body: [
      l(
        'Industrial engineer by training, software developer by trade. Since 2022 I have been building the software that plans how steel moves through a rolling mill, plus the web apps, APIs and dashboards around it.',
        "Eğitimim endüstri mühendisliği, mesleğim yazılım. 2022'den beri çeliğin haddehanede nasıl ilerleyeceğini planlayan yazılımları; etrafındaki web uygulamalarını, API'leri ve panelleri geliştiriyorum.",
      ),
      l(
        'Follow a slab down the line: every station is a part of my career.',
        'Bir slabı hat boyunca takip et: her istasyon kariyerimden bir durak.',
      ),
    ],
    actions: [
      { label: l('Start the line', 'Hattı başlat'), href: '#foundation', primary: true },
      { label: l('Get in touch', 'İletişime geç'), href: '#contact' },
    ],
  },
  {
    id: 'foundation',
    side: 'right',
    code: 'ST-01',
    machine: l('Reheating furnace', 'Tav fırını'),
    temp: 1250,
    kicker: l('Station 01 · Reheating furnace', 'İstasyon 01 · Tav fırını'),
    title: l('Foundation', 'Temel'),
    meta: l(
      'Marmara University · B.Sc. Industrial Engineering · 2014 – 2020',
      'Marmara Üniversitesi · Endüstri Mühendisliği (Lisans) · 2014 – 2020',
    ),
    body: [
      l(
        'Every coil starts as a cold slab that has to be heated before it can be shaped. Mine was industrial engineering: production planning, operations research and how factories really work. It is the reason production systems feel like home today.',
        'Her bobin, şekil almadan önce ısıtılması gereken soğuk bir slab olarak başlar. Benimki endüstri mühendisliğiydi: üretim planlama, yöneylem araştırması ve fabrikaların gerçekte nasıl çalıştığı. Bugün üretim sistemlerinde kendimi evimde hissetmemin sebebi bu.',
      ),
    ],
    entries: [
      { title: 'Pargesoft', meta: l('Intern · Aug 2019 – Feb 2020 · Istanbul', 'Stajyer · Ağu 2019 – Şub 2020 · İstanbul') },
      { title: 'Türkiye Vagon Sanayi', meta: l('Intern · Jul – Aug 2019 · Sakarya', 'Stajyer · Tem – Ağu 2019 · Sakarya') },
    ],
  },
  {
    id: 'roughing',
    side: 'left',
    code: 'ST-02',
    machine: l('Roughing mill R1', 'Kaba hadde R1'),
    temp: 1120,
    kicker: l('Station 02 · Roughing mill R1', 'İstasyon 02 · Kaba hadde R1'),
    title: l('First shaping', 'İlk şekil'),
    meta: l(
      'VBT Yazılım · Full-stack Software Developer · Jul 2021 – Sep 2022',
      'VBT Yazılım · Full-stack Yazılım Geliştirici · Tem 2021 – Eyl 2022',
    ),
    body: [
      l(
        "The roughing mill takes the big hits. My first full-time role did the same: Java and Spring Boot on the backend, Angular on the frontend, and my first steps into production planning software for one of Türkiye's largest steel producers.",
        'Kaba hadde en büyük darbeleri alır. İlk tam zamanlı işim de öyleydi: backend\'de Java ve Spring Boot, frontend\'de Angular ve Türkiye\'nin en büyük çelik üreticilerinden biri için üretim planlama yazılımında ilk adımlarım.',
      ),
      l(
        'I also worked as a consultant at Phexum on Spring Boot, Vue.js and Node.js projects.',
        "Phexum'da da Spring Boot, Vue.js ve Node.js projelerinde danışman olarak çalıştım.",
      ),
    ],
    tags: ['Java', 'Spring Boot', 'Angular', 'Vue.js', 'Node.js'],
  },
  {
    id: 'finishing',
    side: 'right',
    code: 'ST-03',
    machine: l('Finishing mill F1–F5', 'Son hadde F1–F5'),
    temp: 930,
    kicker: l('Station 03 · Finishing mill F1 – F5', 'İstasyon 03 · Son hadde F1 – F5'),
    title: l('Five stands, five projects', 'Beş tezgâh, beş proje'),
    meta: l(
      'Phexum · Full-stack Software Developer · Sep 2022 – today',
      'Phexum · Full-stack Yazılım Geliştirici · Eyl 2022 – bugün',
    ),
    body: [
      l(
        'In a finishing mill every stand makes the strip a little thinner and more precise. At Phexum every project did that to me: a new domain, a new stack, a new kind of problem.',
        "Son haddede her tezgâh şeridi biraz daha inceltir ve hassaslaştırır. Phexum'da her proje bana bunu yaptı: yeni bir alan, yeni bir teknoloji, yeni türde bir problem.",
      ),
    ],
    stands: [
      {
        code: 'F1',
        title: l('EdTech platform', 'EdTech platformu'),
        tech: 'NestJS · PostgreSQL · Redis · RabbitMQ · MongoDB',
        text: l(
          'Backend services with NestJS. Integrated the ELK Stack for centralized logs and Elastic APM for real-time performance metrics.',
          'NestJS ile backend servisleri. Merkezi loglar için ELK Stack\'i, gerçek zamanlı performans metrikleri için Elastic APM\'i entegre ettim.',
        ),
      },
      {
        code: 'F2',
        title: l('Logistics payment tool', 'Lojistik ödeme aracı'),
        tech: 'TypeScript · React · PostgreSQL · Python',
        text: l(
          'Processes incoming invoices and optimizes payments. Mostly TypeScript backend, plus the React frontend.',
          'Gelen faturaları işleyip ödemeleri optimize ediyor. Ağırlıkla TypeScript backend, yanında React arayüz.',
        ),
      },
      {
        code: 'F3',
        title: l('Airport operations tools', 'Havalimanı operasyon araçları'),
        tech: 'Java · Spring Boot · MS SQL',
        text: l(
          'Internal tools for operational tracking and reporting at a major airport.',
          'Büyük bir havalimanında operasyon takibi ve raporlama için iç araçlar.',
        ),
      },
      {
        code: 'F4',
        title: l('Financial web tools', 'Finansal web araçları'),
        tech: 'ASP.NET · JavaScript',
        text: l('Web-based financial and operational tools (WebPos & KIS).', 'Web tabanlı finans ve operasyon araçları (WebPos ve KIS).'),
      },
      {
        code: 'F5',
        title: l('AminoAcid app', 'AminoAcid uygulaması'),
        tech: 'Node.js · Vue.js · MongoDB',
        text: l(
          'Node.js backend and Vue.js features for a NoSQL-based internal application.',
          'NoSQL tabanlı bir iç uygulama için Node.js backend ve Vue.js özellikleri.',
        ),
      },
    ],
  },
  {
    id: 'pulpit',
    side: 'left',
    code: 'ST-04',
    machine: l('Control pulpit', 'Kumanda kabini'),
    temp: 880,
    kicker: l('Station 04 · Control pulpit', 'İstasyon 04 · Kumanda kabini'),
    title: l('The software that runs the line', 'Hattı yöneten yazılım'),
    meta: l(
      'Production planning · 2022 – today · Java · Spring Boot · Angular · Oracle',
      'Üretim planlama · 2022 – bugün · Java · Spring Boot · Angular · Oracle',
    ),
    body: [
      l(
        "This is my main work. From the pulpit you don't touch the steel, you decide what happens to it. I am one of the main developers of the production planning system of one of Türkiye's largest steel producers.",
        'Asıl işim bu. Kumanda kabininden çeliğe dokunmazsın, ona ne olacağına karar verirsin. Türkiye\'nin en büyük çelik üreticilerinden birinin üretim planlama sisteminin ana geliştiricilerinden biriyim.',
      ),
    ],
    bullets: [
      l(
        'Preparing, cancelling and viewing production programs for hot strip, plate and cold rolling lines',
        'Sıcak şerit, levha ve soğuk haddeleme hatları için üretim programı hazırlama, iptal ve görüntüleme',
      ),
      l(
        'Level 3 dispatch: sending programs to plant systems and tracking their acknowledgements',
        'Seviye 3 gönderimi: programları saha sistemlerine iletip onaylarını takip etmek',
      ),
      l('Slab yard, production tracking and quality control modules', 'Slab sahası, üretim takip ve kalite kontrol modülleri'),
    ],
    stats: [
      { value: '2,400+', label: l('commits', 'commit') },
      { value: '9', label: l('repositories', 'repo') },
      { value: '2022', label: l('on the line since', 'yılından beri hatta') },
    ],
  },
  {
    id: 'toolbox',
    side: 'right',
    code: 'ST-05',
    machine: l('Laminar cooling', 'Laminer soğutma'),
    temp: 640,
    kicker: l('Station 05 · Laminar cooling', 'İstasyon 05 · Laminer soğutma'),
    title: l('Toolbox', 'Alet çantası'),
    body: [
      l(
        'Cooling sets the final properties of the steel. These are the tools that set mine.',
        'Soğutma çeliğin son özelliklerini belirler. Benimkileri belirleyen araçlar bunlar.',
      ),
    ],
    chips: [
      { group: l('Backend', 'Backend'), list: ['Java', 'Spring Boot', 'REST APIs', 'Microservices', 'Node.js', 'NestJS', 'TypeScript', 'Python'] },
      { group: l('Frontend', 'Frontend'), list: ['Angular', 'React', 'Vue.js', 'JavaScript', 'HTML', 'CSS'] },
      { group: l('Data', 'Veri'), list: ['SQL', 'Oracle', 'PostgreSQL', 'MS SQL', 'MySQL', 'MongoDB', 'Redis'] },
      { group: l('Observability & messaging', 'Gözlemlenebilirlik ve mesajlaşma'), list: ['Elasticsearch', 'Logstash', 'Kibana', 'Elastic APM', 'RabbitMQ'] },
      { group: l('DevOps & tools', 'DevOps ve araçlar'), list: ['Docker', 'Git', 'GitHub Actions', 'Jira', 'Postman', 'IntelliJ IDEA'] },
      { group: l('AI-assisted development', 'AI destekli geliştirme'), list: ['Claude Code', 'MCP', 'Multi-agent workflows', 'GitHub Copilot'] },
    ],
  },
  {
    id: 'writing',
    side: 'left',
    code: 'ST-06',
    machine: l('Down coiler', 'Sarıcı'),
    temp: 590,
    kicker: l('Station 06 · Down coiler', 'İstasyon 06 · Sarıcı'),
    title: l('Writing & side projects', 'Yazılar ve yan projeler'),
    cards: [
      {
        title: l('How to Use Elastic Stack to Monitor Your Node.js Applications', 'How to Use Elastic Stack to Monitor Your Node.js Applications'),
        meta: l('Article · Medium · Jul 2025', 'Makale · Medium · Tem 2025'),
        text: l(
          'Elastic APM, Filebeat, Logstash and Kibana for a NestJS application, with a Docker Compose setup.',
          'Bir NestJS uygulaması için Elastic APM, Filebeat, Logstash ve Kibana; Docker Compose kurulumuyla.',
        ),
        href: links.article,
      },
      {
        title: l('Hamal', 'Hamal'),
        meta: l('Hobby project · Lua · open source', 'Hobi projesi · Lua · açık kaynak'),
        text: l(
          'A World of Warcraft addon I build in my spare time: no dependencies, CI and 120+ automated tests against a mocked game client.',
          'Boş zamanlarımda geliştirdiğim bir World of Warcraft addon\'u: bağımlılık yok, CI ve sahte bir oyun istemcisine karşı 120+ otomatik test.',
        ),
        href: links.hamal,
      },
      {
        title: l('ts_node_js_docker', 'ts_node_js_docker'),
        meta: l('Starter template · TypeScript · Docker', 'Başlangıç şablonu · TypeScript · Docker'),
        text: l(
          'Runs a Node.js + TypeScript service with Docker Compose in one command.',
          'Node.js + TypeScript servisini Docker Compose ile tek komutta ayağa kaldırır.',
        ),
        href: links.tsDocker,
      },
    ],
  },
  {
    id: 'contact',
    side: 'right',
    code: 'ST-07',
    machine: l('Coil yard', 'Bobin sahası'),
    temp: 40,
    kicker: l('Station 07 · Coil yard', 'İstasyon 07 · Bobin sahası'),
    title: l("The coil is ready. Let's talk.", 'Bobin hazır. Konuşalım.'),
    body: [
      l(
        'Happy to talk about backend, full-stack and manufacturing software. Email is the fastest way to reach me.',
        'Backend, full-stack ve üretim yazılımları üzerine konuşmaktan memnuniyet duyarım. Bana en hızlı e-postayla ulaşırsın.',
      ),
    ],
    contact: true,
  },
];
