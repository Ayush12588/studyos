/* ─── PATCH: Goal tile selector (new onboarding) ─── */
App_goalTileMinutes = 120;
function _patchSelectGoalTile(el) {
    document.querySelectorAll('.goal-tile').forEach(t => t.classList.remove('selected'));
    el.classList.add('selected');
    const mins = parseInt(el.dataset.mins);
    App_goalTileMinutes = mins;
    const sel = document.getElementById('welcome-goal');
    if (sel) sel.value = String(mins);
}

/* ─── PATCH: Exam date preview ─── */
function _patchExamDatePreview() {
    const inp = document.getElementById('welcome-exam-date');
    const prev = document.getElementById('welcome-days-preview');
    if (!inp || !prev) return;
    inp.addEventListener('input', () => {
        const v = inp.value;
        if (!v) { prev.textContent = ''; return; }
        const d = Math.ceil((new Date(v) - new Date()) / 86400000);
        prev.textContent = d > 0 ? `${d} days remaining` : d === 0 ? 'Today!' : 'Date is in the past';
    });
}

/* ─── PATCH: Sidebar exam countdown chip ─── */
function _patchSidebarExam() {
    if (!window.App) return;
    const examDate = App.state && App.state.profile && App.state.profile.examDate;
    const chip = document.getElementById('sidebar-exam-chip');
    const days = document.getElementById('sidebar-exam-days');
    if (!chip || !days) return;
    if (examDate) {
        const d = Math.ceil((new Date(examDate) - new Date()) / 86400000);
        if (d >= 0) {
            days.textContent = d;
            chip.style.display = 'flex';
            return;
        }
    }
    chip.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    _patchExamDatePreview();
    App.selectGoalTile = _patchSelectGoalTile;
    setTimeout(_patchSidebarExam, 500);
});

// ─── Fallback guard: hapticsVibrate ─────────────────────────────────────────
// app.js calls hapticsVibrate(...) unguarded (no try/catch) at ~28 call
// sites, several inline in save/render chains (e.g. saveStudyLog,
// quickRevision, showLevelUp). haptics.js defines the real implementation
// and should load before this file — but if it 404s, gets blocked, or its
// <script> tag is ever removed, hapticsVibrate would be undefined and any
// call to it throws ReferenceError, silently breaking whatever save/render
// logic was chained after it. This stub only takes effect if the real one
// never registered, so it costs nothing when haptics.js loads normally.
if (typeof window.hapticsVibrate !== 'function') {
    window.hapticsVibrate = function () {};
}

const App={
    state:{
        profile:{name:'Student',xp:0,level:1,streak:0,lastStudyDate:null,dailyGoalMinutes:120,maxDailyMinutes:0,examDate:'',targetScore:90,mood:'',moodHistory:[]},
        subjects:[],sessions:[],earnedBadges:[],currentPage:'dashboard',selectedSubjectFilter:'all',
        pomodoroSettings:{workMin:25,breakMin:5,longBreakMin:15,sessionsBeforeLong:4},
        examScores:[],tasks:[],notes:[],resources:[],doubts:[],exercises:{},
        theme:'warm-dark',autoTheme:false,
        stopwatch:{running:false,elapsed:0,subjectId:'',chapterId:''},
        dailyChallenges:{date:'',challenges:[],completed:[]},
        weeklyPlan:{},
        checkins:{},
        // STREAK FREEZE
        streakFreezes:1,
        lastFreezeUsedDate:null,
        pendingFreezeNotice:false,
        // QUIZ
        quizData:{}, // { [subjectId]: { questions:[], generatedAt, lastScore, lastQuizDate, interval, history:[] } }
        // CIRCLES — populated by _loadTabData('circles'), re-fetched every visit (not session-cached)
        circles:[]
    },
    // Transient, non-persisted: which circle's leaderboard is currently open in detail view
    _openCircleId:null,
    _openCircleLeaderboard:null,
    _openCircleOvertakes:[],
    pomodoro:{running:false,mode:'work',timeLeft:1500,session:1,interval:null,focusSubjectId:null,focusChapterId:null},
    swInterval:null,

    BADGES:[
        {id:'first-step',name:'First Step',desc:'Log your first study session',icon:''},
        {id:'bookworm',name:'Bookworm',desc:'Study for 10 hours total',icon:''},
        {id:'marathon',name:'Marathon Runner',desc:'Study 4+ hours in one day',icon:''},
        {id:'streak-3',name:'On Fire',desc:'3 day study streak',icon:''},
        {id:'streak-7',name:'Unstoppable',desc:'7 day study streak',icon:''},
        {id:'streak-14',name:'Two Weeks Strong',desc:'14 day study streak',icon:''},
        {id:'streak-30',name:'Monthly Legend',desc:'30 day study streak',icon:''},
        {id:'ch-1',name:'Chapter Down',desc:'Complete first chapter',icon:''},
        {id:'ch-10',name:'Knowledge Seeker',desc:'Complete 10 chapters',icon:''},
        {id:'ch-25',name:'Halfway Hero',desc:'Complete 25 chapters',icon:''},
        {id:'ch-50',name:'Chapter Champion',desc:'Complete 50 chapters',icon:''},
        {id:'rev-1',name:'Reviser',desc:'Do your first revision',icon:''},
        {id:'rev-10',name:'Memory Master',desc:'Do 10 revisions',icon:''},
        {id:'sub-complete',name:'Subject Expert',desc:'Complete all chapters in a subject',icon:''},
        {id:'level-5',name:'Rising Star',desc:'Reach Level 5',icon:''},
        {id:'level-10',name:'Scholar',desc:'Reach Level 10',icon:''},
        {id:'allround',name:'All-Rounder',desc:'Study all subjects in one day',icon:''},
        {id:'perfect-week',name:'Perfect Week',desc:'7 day streak',icon:''},
        {id:'pomodoro-10',name:'Focus Master',desc:'Complete 10 Pomodoros',icon:''},
        {id:'scorer-90',name:'Top Scorer',desc:'Score 90%+ in any exam',icon:''},
        {id:'task-master',name:'Task Master',desc:'Complete 50 tasks',icon:''},
        {id:'doubt-clear',name:'Doubt Slayer',desc:'Resolve 10 doubts',icon:''},
        {id:'note-taker',name:'Note Taker',desc:'Create 20 notes',icon:''},
        {id:'resource-king',name:'Resource King',desc:'Save 15 resources',icon:''}
    ],

    // ── CLASS 9 ──────────────────────────────────────────────────────────
    // chapters are {name, difficulty} objects — difficulty is used when pre-loading to Supabase
    CLASS9_DATA:[
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Number Systems',difficulty:'medium'},
            {name:'Polynomials',difficulty:'medium'},
            {name:'Coordinate Geometry',difficulty:'hard'},
            {name:'Linear Equations in Two Variables',difficulty:'medium'},
            {name:'Introduction to Euclid\'s Geometry',difficulty:'easy'},
            {name:'Lines and Angles',difficulty:'easy'},
            {name:'Triangles',difficulty:'medium'},
            {name:'Quadrilaterals',difficulty:'medium'},
            {name:'Circles',difficulty:'hard'},
            {name:'Heron\'s Formula',difficulty:'easy'},
            {name:'Surface Areas and Volumes',difficulty:'medium'},
            {name:'Statistics',difficulty:'medium'}
        ]},
        {name:'Science',icon:'🔬',color:'#10b981',chapters:[
            // Chemistry
            {name:'Matter in Our Surroundings',difficulty:'easy'},
            {name:'Is Matter Around Us Pure',difficulty:'medium'},
            {name:'Atoms and Molecules',difficulty:'medium'},
            {name:'Structure of the Atom',difficulty:'hard'},
            // Biology
            {name:'The Fundamental Unit of Life',difficulty:'easy'},
            {name:'Tissues',difficulty:'medium'},
            // Physics
            {name:'Motion',difficulty:'hard'},
            {name:'Force and Laws of Motion',difficulty:'hard'},
            {name:'Gravitation',difficulty:'medium'},
            {name:'Work and Energy',difficulty:'medium'},
            {name:'Sound',difficulty:'medium'},
            // Biology/Health
            {name:'Why Do We Fall Ill',difficulty:'easy'},
            {name:'Natural Resources',difficulty:'easy'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Fun They Had',difficulty:'medium'},
            {name:'The Sound of Music',difficulty:'medium'},
            {name:'The Little Girl',difficulty:'medium'},
            {name:'A Truly Beautiful Mind',difficulty:'medium'},
            {name:'The Snake and the Mirror',difficulty:'medium'},
            {name:'My Childhood',difficulty:'medium'},
            {name:'Packing',difficulty:'medium'},
            {name:'Reach for the Top',difficulty:'medium'},
            {name:'The Bond of Love',difficulty:'medium'},
            {name:'Kathmandu',difficulty:'medium'},
            {name:'If I Were You',difficulty:'medium'},
            {name:'The Road Not Taken (Poem)',difficulty:'medium'},
            {name:'Wind (Poem)',difficulty:'medium'},
            {name:'Rain on the Roof (Poem)',difficulty:'medium'},
            {name:'The Lake Isle of Innisfree (Poem)',difficulty:'medium'},
            {name:'A Legend of the Northland (Poem)',difficulty:'medium'},
            {name:'No Men Are Foreign (Poem)',difficulty:'medium'},
            {name:'The Duck and the Kangaroo (Poem)',difficulty:'medium'},
            {name:'On Killing a Tree (Poem)',difficulty:'medium'},
            {name:'The Snake Trying (Poem)',difficulty:'medium'},
            {name:'A Slumber Did My Spirit Seal (Poem)',difficulty:'medium'}
        ]},
        {name:'Social Science',icon:'🌍',color:'#06b6d4',chapters:[
            // History — medium
            {name:'The French Revolution',difficulty:'medium'},
            {name:'Socialism in Europe and the Russian Revolution',difficulty:'medium'},
            {name:'Nazism and the Rise of Hitler',difficulty:'medium'},
            {name:'Forest Society and Colonialism',difficulty:'medium'},
            {name:'Pastoralists in the Modern World',difficulty:'medium'},
            // Geography — easy
            {name:'India — Size and Location',difficulty:'easy'},
            {name:'Physical Features of India',difficulty:'easy'},
            {name:'Drainage',difficulty:'easy'},
            {name:'Climate',difficulty:'easy'},
            {name:'Natural Vegetation and Wildlife',difficulty:'easy'},
            {name:'Population',difficulty:'easy'},
            // Political Science — easy
            {name:'What is Democracy? Why Democracy?',difficulty:'easy'},
            {name:'Constitutional Design',difficulty:'easy'},
            {name:'Electoral Politics',difficulty:'easy'},
            {name:'Working of Institutions',difficulty:'easy'},
            {name:'Democratic Rights',difficulty:'easy'},
            // Economics — easy
            {name:'The Story of Village Palampur',difficulty:'easy'},
            {name:'People as Resource',difficulty:'easy'},
            {name:'Poverty as a Challenge',difficulty:'easy'},
            {name:'Food Security in India',difficulty:'easy'}
        ]},
        {name:'Hindi',icon:'📜',color:'#ef4444',chapters:[
            {name:'दो बैलों की कथा',difficulty:'medium'},
            {name:'ल्हासा की ओर',difficulty:'medium'},
            {name:'उपभोक्तावाद की संस्कृति',difficulty:'medium'},
            {name:'साँवले सपनों की याद',difficulty:'medium'},
            {name:'नाना साहब की पुत्री देवी मैना को भस्म कर दिया गया',difficulty:'medium'},
            {name:'प्रेमचंद के फटे जूते',difficulty:'medium'},
            {name:'मेरे बचपन के दिन',difficulty:'medium'},
            {name:'एक कुत्ता और एक मैना',difficulty:'medium'},
            {name:'इस जल प्रलय में',difficulty:'medium'},
            {name:'रैदास के पद',difficulty:'medium'},
            {name:'रहीम के दोहे',difficulty:'medium'},
            {name:'कबीर की साखियाँ',difficulty:'medium'},
            {name:'ललद्यद',difficulty:'medium'},
            {name:'वाख',difficulty:'medium'},
            {name:'सवैये',difficulty:'medium'},
            {name:'कैदी और कोकिला',difficulty:'medium'},
            {name:'ग्राम श्री',difficulty:'medium'},
            {name:'चंद्र गहना से लौटती बेर',difficulty:'medium'},
            {name:'मेघ आए',difficulty:'medium'},
            {name:'यमराज की दिशा',difficulty:'medium'},
            {name:'बच्चे काम पर जा रहे हैं',difficulty:'medium'}
        ]}
    ],

    // ── CLASS 10 ─────────────────────────────────────────────────────────
    CLASS10_DATA:[
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Real Numbers',difficulty:'easy'},
            {name:'Polynomials',difficulty:'medium'},
            {name:'Linear Equations in Two Variables',difficulty:'medium'},
            {name:'Quadratic Equations',difficulty:'hard'},
            {name:'Arithmetic Progressions',difficulty:'medium'},
            {name:'Triangles',difficulty:'medium'},
            {name:'Coordinate Geometry',difficulty:'hard'},
            {name:'Intro to Trigonometry',difficulty:'hard'},
            {name:'Applications of Trigonometry',difficulty:'hard'},
            {name:'Circles',difficulty:'hard'},
            {name:'Areas Related to Circles',difficulty:'medium'},
            {name:'Surface Areas & Volumes',difficulty:'medium'},
            {name:'Statistics',difficulty:'medium'},
            {name:'Probability',difficulty:'easy'}
        ]},
        {name:'Science',icon:'🔬',color:'#10b981',chapters:[
            // Chemistry
            {name:'Chemical Reactions & Equations',difficulty:'medium'},
            {name:'Acids, Bases & Salts',difficulty:'medium'},
            {name:'Metals & Non-metals',difficulty:'medium'},
            {name:'Carbon & its Compounds',difficulty:'hard'},
            // Biology
            {name:'Life Processes',difficulty:'medium'},
            {name:'Control & Coordination',difficulty:'medium'},
            {name:'How do Organisms Reproduce',difficulty:'easy'},
            {name:'Heredity & Evolution',difficulty:'medium'},
            // Physics
            {name:'Light: Reflection & Refraction',difficulty:'medium'},
            {name:'Human Eye & Colourful World',difficulty:'easy'},
            {name:'Electricity',difficulty:'hard'},
            {name:'Magnetic Effects of Current',difficulty:'hard'},
            // Environment
            {name:'Our Environment',difficulty:'easy'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'A Letter to God',difficulty:'medium'},
            {name:'Dust of Snow (Poem)',difficulty:'medium'},
            {name:'Fire and Ice (Poem)',difficulty:'medium'},
            {name:'Nelson Mandela',difficulty:'medium'},
            {name:'A Tiger in the Zoo (Poem)',difficulty:'medium'},
            {name:'Two Stories about Flying',difficulty:'medium'},
            {name:'How to Tell Wild Animals (Poem)',difficulty:'medium'},
            {name:'The Ball Poem (Poem)',difficulty:'medium'},
            {name:'Anne Frank Diary',difficulty:'medium'},
            {name:'Amanda! (Poem)',difficulty:'medium'},
            {name:'Glimpses of India',difficulty:'medium'},
            {name:'The Trees (Poem)',difficulty:'medium'},
            {name:'Mijbil the Otter',difficulty:'medium'},
            {name:'Fog (Poem)',difficulty:'medium'},
            {name:'Madam Rides the Bus',difficulty:'medium'},
            {name:'The Tale of Custrd the Dragon (Poem)',difficulty:'medium'},
            {name:'The Sermon at Benares',difficulty:'medium'},
            {name:'For Anne Gregory (Poem)',difficulty:'medium'},
            {name:'The Proposal',difficulty:'medium'}
        ]},
        {name:'Social Science',icon:'🌍',color:'#06b6d4',chapters:[
            // History — medium
            {name:'Rise of Nationalism in Europe',difficulty:'medium'},
            {name:'Nationalism in India',difficulty:'medium'},
            {name:'Making of a Global World',difficulty:'medium'},
            {name:'Age of Industrialisation',difficulty:'medium'},
            {name:'Print Culture & Modern World',difficulty:'medium'},
            // Geography — easy
            {name:'Resources & Development',difficulty:'easy'},
            {name:'Forest & Wildlife Resources',difficulty:'easy'},
            {name:'Water Resources',difficulty:'easy'},
            {name:'Agriculture',difficulty:'easy'},
            {name:'Minerals & Energy Resources',difficulty:'easy'},
            {name:'Manufacturing Industries',difficulty:'easy'},
            {name:'Lifelines of National Economy',difficulty:'easy'},
            // Political Science — easy
            {name:'Power Sharing',difficulty:'easy'},
            {name:'Federalism',difficulty:'easy'},
            {name:'Political Parties',difficulty:'easy'},
            {name:'Outcomes of Democracy',difficulty:'easy'},
            // Economics — easy
            {name:'Development',difficulty:'easy'},
            {name:'Sectors of Indian Economy',difficulty:'easy'},
            {name:'Money & Credit',difficulty:'easy'},
            {name:'Globalisation & Indian Economy',difficulty:'easy'}
        ]},
        {name:'Hindi',icon:'📜',color:'#ef4444',chapters:[
            {name:'साखी',difficulty:'medium'},
            {name:'पद',difficulty:'medium'},
            {name:'मनुष्यता',difficulty:'medium'},
            {name:'पर्वत प्रदेश में पावस',difficulty:'medium'},
            {name:'तोप',difficulty:'medium'},
            {name:'कर चले हम फ़िदा',difficulty:'medium'},
            {name:'आत्मत्राण',difficulty:'medium'},
            {name:'बड़े भाई साहब',difficulty:'medium'},
            {name:'डायरी का एक पन्ना',difficulty:'medium'},
            {name:'तताँरा-वामीरो कथा',difficulty:'medium'},
            {name:'तीसरी कसम के शिल्पकार शैलेन्द्र',difficulty:'medium'},
            {name:'अब कहाँ दूसरे के दुख से दुखी होने वाले',difficulty:'medium'},
            {name:'पतझर में टूटी पत्तियाँ',difficulty:'medium'},
            {name:'कारतूस',difficulty:'medium'},
            {name:'हरिहर काका',difficulty:'medium'},
            {name:'सपनों के-से दिन',difficulty:'medium'},
            {name:'टोपी शुक्ला',difficulty:'medium'},
            {name:'व्याकरण',difficulty:'medium'}
        ]}
    ],

    // ── CLASS 11 PCM ─────────────────────────────────────────────────────
    CLASS11_PCM_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:[
            {name:'Physical World',difficulty:'easy'},
            {name:'Units and Measurements',difficulty:'easy'},
            {name:'Motion in a Straight Line',difficulty:'medium'},
            {name:'Motion in a Plane',difficulty:'hard'},
            {name:'Laws of Motion',difficulty:'hard'},
            {name:'Work, Energy and Power',difficulty:'hard'},
            {name:'System of Particles and Rotational Motion',difficulty:'hard'},
            {name:'Gravitation',difficulty:'medium'},
            {name:'Mechanical Properties of Solids',difficulty:'medium'},
            {name:'Mechanical Properties of Fluids',difficulty:'medium'},
            {name:'Thermal Properties of Matter',difficulty:'medium'},
            {name:'Thermodynamics',difficulty:'hard'},
            {name:'Kinetic Theory',difficulty:'medium'},
            {name:'Oscillations',difficulty:'hard'},
            {name:'Waves',difficulty:'hard'}
        ]},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:[
            {name:'Some Basic Concepts of Chemistry',difficulty:'easy'},
            {name:'Structure of Atom',difficulty:'hard'},
            {name:'Classification of Elements and Periodicity in Properties',difficulty:'medium'},
            {name:'Chemical Bonding and Molecular Structure',difficulty:'hard'},
            {name:'Thermodynamics',difficulty:'hard'},
            {name:'Equilibrium',difficulty:'hard'},
            {name:'Redox Reactions',difficulty:'medium'},
            {name:'Organic Chemistry — Some Basic Principles and Techniques',difficulty:'hard'},
            {name:'Hydrocarbons',difficulty:'hard'},
            {name:'Environmental Chemistry',difficulty:'easy'},
            {name:'States of Matter',difficulty:'medium'},
            {name:'The s-Block Elements',difficulty:'easy'},
            {name:'The p-Block Elements (Groups 13 and 14)',difficulty:'medium'},
            {name:'Hydrogen',difficulty:'easy'}
        ]},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Sets',difficulty:'easy'},
            {name:'Relations and Functions',difficulty:'medium'},
            {name:'Trigonometric Functions',difficulty:'hard'},
            {name:'Principle of Mathematical Induction',difficulty:'medium'},
            {name:'Complex Numbers and Quadratic Equations',difficulty:'hard'},
            {name:'Linear Inequalities',difficulty:'easy'},
            {name:'Permutations and Combinations',difficulty:'medium'},
            {name:'Binomial Theorem',difficulty:'medium'},
            {name:'Sequences and Series',difficulty:'medium'},
            {name:'Straight Lines',difficulty:'medium'},
            {name:'Conic Sections',difficulty:'hard'},
            {name:'Introduction to Three Dimensional Geometry',difficulty:'medium'},
            {name:'Limits and Derivatives',difficulty:'hard'},
            {name:'Statistics',difficulty:'easy'},
            {name:'Probability',difficulty:'medium'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Portrait of a Lady',difficulty:'medium'},
            {name:'We\'re Not Afraid to Die',difficulty:'medium'},
            {name:'Discovering Tut: The Saga Continues',difficulty:'medium'},
            {name:'Landscape of the Soul',difficulty:'medium'},
            {name:'The Ailing Planet',difficulty:'medium'},
            {name:'The Browning Version',difficulty:'medium'},
            {name:'The Adventure',difficulty:'medium'},
            {name:'Silk Road',difficulty:'medium'},
            {name:'A Photograph (Poem)',difficulty:'medium'},
            {name:'The Laburnum Top (Poem)',difficulty:'medium'},
            {name:'The Voice of the Rain (Poem)',difficulty:'medium'},
            {name:'Childhood (Poem)',difficulty:'medium'},
            {name:'Father to Son (Poem)',difficulty:'medium'},
            {name:'The Summer of the Beautiful White Horse',difficulty:'medium'},
            {name:'The Address',difficulty:'medium'},
            {name:'Ranga\'s Marriage',difficulty:'medium'},
            {name:'Albert Einstein at School',difficulty:'medium'},
            {name:'Mother\'s Day',difficulty:'medium'},
            {name:'The Ghat of the Only World',difficulty:'medium'},
            {name:'Birth',difficulty:'medium'},
            {name:'The Tale of Melon City',difficulty:'medium'}
        ]},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:[
            {name:'Changing Trends and Career in Physical Education',difficulty:'easy'},
            {name:'Olympic Movement',difficulty:'easy'},
            {name:'Physical Fitness, Wellness and Lifestyle',difficulty:'easy'},
            {name:'Physical Education and Sports for CWSN',difficulty:'easy'},
            {name:'Yoga',difficulty:'easy'},
            {name:'Physical Activity and Leadership Training',difficulty:'easy'},
            {name:'Test, Measurement and Evaluation',difficulty:'medium'},
            {name:'Fundamentals of Anatomy and Physiology',difficulty:'medium'},
            {name:'Fundamentals of Kinesiology and Biomechanics',difficulty:'medium'},
            {name:'Psychology and Sports',difficulty:'medium'},
            {name:'Training in Sports',difficulty:'medium'},
            {name:'Doping',difficulty:'easy'}
        ]}
    ],

    // ── CLASS 11 PCB ─────────────────────────────────────────────────────
    CLASS11_PCB_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:[
            {name:'Physical World',difficulty:'easy'},
            {name:'Units and Measurements',difficulty:'easy'},
            {name:'Motion in a Straight Line',difficulty:'medium'},
            {name:'Motion in a Plane',difficulty:'hard'},
            {name:'Laws of Motion',difficulty:'hard'},
            {name:'Work, Energy and Power',difficulty:'hard'},
            {name:'System of Particles and Rotational Motion',difficulty:'hard'},
            {name:'Gravitation',difficulty:'medium'},
            {name:'Mechanical Properties of Solids',difficulty:'medium'},
            {name:'Mechanical Properties of Fluids',difficulty:'medium'},
            {name:'Thermal Properties of Matter',difficulty:'medium'},
            {name:'Thermodynamics',difficulty:'hard'},
            {name:'Kinetic Theory',difficulty:'medium'},
            {name:'Oscillations',difficulty:'hard'},
            {name:'Waves',difficulty:'hard'}
        ]},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:[
            {name:'Some Basic Concepts of Chemistry',difficulty:'easy'},
            {name:'Structure of Atom',difficulty:'hard'},
            {name:'Classification of Elements and Periodicity in Properties',difficulty:'medium'},
            {name:'Chemical Bonding and Molecular Structure',difficulty:'hard'},
            {name:'Thermodynamics',difficulty:'hard'},
            {name:'Equilibrium',difficulty:'hard'},
            {name:'Redox Reactions',difficulty:'medium'},
            {name:'Organic Chemistry — Some Basic Principles and Techniques',difficulty:'hard'},
            {name:'Hydrocarbons',difficulty:'hard'},
            {name:'Environmental Chemistry',difficulty:'easy'},
            {name:'States of Matter',difficulty:'medium'},
            {name:'The s-Block Elements',difficulty:'easy'},
            {name:'The p-Block Elements (Groups 13 and 14)',difficulty:'medium'},
            {name:'Hydrogen',difficulty:'easy'}
        ]},
        {name:'Biology',icon:'🌿',color:'#22c55e',chapters:[
            {name:'The Living World',difficulty:'easy'},
            {name:'Biological Classification',difficulty:'medium'},
            {name:'Plant Kingdom',difficulty:'medium'},
            {name:'Animal Kingdom',difficulty:'hard'},
            {name:'Morphology of Flowering Plants',difficulty:'medium'},
            {name:'Anatomy of Flowering Plants',difficulty:'medium'},
            {name:'Structural Organisation in Animals',difficulty:'medium'},
            {name:'Cell: The Unit of Life',difficulty:'medium'},
            {name:'Biomolecules',difficulty:'hard'},
            {name:'Cell Cycle and Cell Division',difficulty:'hard'},
            {name:'Transport in Plants',difficulty:'medium'},
            {name:'Mineral Nutrition',difficulty:'medium'},
            {name:'Photosynthesis in Higher Plants',difficulty:'hard'},
            {name:'Respiration in Plants',difficulty:'hard'},
            {name:'Plant Growth and Development',difficulty:'medium'},
            {name:'Digestion and Absorption',difficulty:'medium'},
            {name:'Breathing and Exchange of Gases',difficulty:'medium'},
            {name:'Body Fluids and Circulation',difficulty:'hard'},
            {name:'Excretory Products and their Elimination',difficulty:'medium'},
            {name:'Locomotion and Movement',difficulty:'medium'},
            {name:'Neural Control and Coordination',difficulty:'hard'},
            {name:'Chemical Coordination and Integration',difficulty:'hard'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Portrait of a Lady',difficulty:'medium'},
            {name:'We\'re Not Afraid to Die',difficulty:'medium'},
            {name:'Discovering Tut: The Saga Continues',difficulty:'medium'},
            {name:'Landscape of the Soul',difficulty:'medium'},
            {name:'The Ailing Planet',difficulty:'medium'},
            {name:'The Browning Version',difficulty:'medium'},
            {name:'The Adventure',difficulty:'medium'},
            {name:'Silk Road',difficulty:'medium'},
            {name:'A Photograph (Poem)',difficulty:'medium'},
            {name:'The Laburnum Top (Poem)',difficulty:'medium'},
            {name:'The Voice of the Rain (Poem)',difficulty:'medium'},
            {name:'Childhood (Poem)',difficulty:'medium'},
            {name:'Father to Son (Poem)',difficulty:'medium'},
            {name:'The Summer of the Beautiful White Horse',difficulty:'medium'},
            {name:'The Address',difficulty:'medium'},
            {name:'Ranga\'s Marriage',difficulty:'medium'},
            {name:'Albert Einstein at School',difficulty:'medium'},
            {name:'Mother\'s Day',difficulty:'medium'},
            {name:'The Ghat of the Only World',difficulty:'medium'},
            {name:'Birth',difficulty:'medium'},
            {name:'The Tale of Melon City',difficulty:'medium'}
        ]},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:[
            {name:'Changing Trends and Career in Physical Education',difficulty:'easy'},
            {name:'Olympic Movement',difficulty:'easy'},
            {name:'Physical Fitness, Wellness and Lifestyle',difficulty:'easy'},
            {name:'Physical Education and Sports for CWSN',difficulty:'easy'},
            {name:'Yoga',difficulty:'easy'},
            {name:'Physical Activity and Leadership Training',difficulty:'easy'},
            {name:'Test, Measurement and Evaluation',difficulty:'medium'},
            {name:'Fundamentals of Anatomy and Physiology',difficulty:'medium'},
            {name:'Fundamentals of Kinesiology and Biomechanics',difficulty:'medium'},
            {name:'Psychology and Sports',difficulty:'medium'},
            {name:'Training in Sports',difficulty:'medium'},
            {name:'Doping',difficulty:'easy'}
        ]}
    ],

    // ── CLASS 11 COMMERCE ────────────────────────────────────────────────
    CLASS11_COMMERCE_DATA:[
        {name:'Accountancy',icon:'💰',color:'#a855f7',chapters:[
            {name:'Introduction to Accounting',difficulty:'easy'},
            {name:'Theory Base of Accounting',difficulty:'medium'},
            {name:'Recording of Transactions I',difficulty:'medium'},
            {name:'Recording of Transactions II',difficulty:'hard'},
            {name:'Bank Reconciliation Statement',difficulty:'hard'},
            {name:'Trial Balance and Rectification of Errors',difficulty:'hard'},
            {name:'Depreciation, Provisions and Reserves',difficulty:'hard'},
            {name:'Bill of Exchange',difficulty:'hard'},
            {name:'Financial Statements I',difficulty:'medium'},
            {name:'Financial Statements II',difficulty:'hard'},
            {name:'Accounts from Incomplete Records',difficulty:'hard'},
            {name:'Applications of Computers in Accounting',difficulty:'easy'},
            {name:'Computerised Accounting System',difficulty:'medium'}
        ]},
        {name:'Business Studies',icon:'🏢',color:'#0ea5e9',chapters:[
            {name:'Business, Trade and Commerce',difficulty:'easy'},
            {name:'Forms of Business Organisation',difficulty:'medium'},
            {name:'Private, Public and Global Enterprises',difficulty:'medium'},
            {name:'Business Services',difficulty:'easy'},
            {name:'Emerging Modes of Business',difficulty:'easy'},
            {name:'Social Responsibilities of Business and Business Ethics',difficulty:'easy'},
            {name:'Formation of a Company',difficulty:'medium'},
            {name:'Sources of Business Finance',difficulty:'medium'},
            {name:'Small Business',difficulty:'easy'},
            {name:'Internal Trade',difficulty:'medium'},
            {name:'International Business',difficulty:'medium'}
        ]},
        {name:'Economics',icon:'📈',color:'#f97316',chapters:[
            {name:'Introduction to Statistics',difficulty:'easy'},
            {name:'Collection of Data',difficulty:'easy'},
            {name:'Organisation of Data',difficulty:'easy'},
            {name:'Presentation of Data',difficulty:'medium'},
            {name:'Measures of Central Tendency',difficulty:'medium'},
            {name:'Measures of Dispersion',difficulty:'hard'},
            {name:'Correlation',difficulty:'hard'},
            {name:'Index Numbers',difficulty:'hard'},
            {name:'Use of Statistical Tools',difficulty:'medium'},
            {name:'Indian Economy on the Eve of Independence',difficulty:'easy'},
            {name:'Indian Economy 1950–1990',difficulty:'easy'},
            {name:'Liberalisation, Privatisation and Globalisation: An Appraisal',difficulty:'medium'},
            {name:'Poverty',difficulty:'easy'},
            {name:'Human Capital Formation in India',difficulty:'easy'},
            {name:'Rural Development',difficulty:'easy'},
            {name:'Employment: Growth, Informalisation and Other Issues',difficulty:'medium'},
            {name:'Infrastructure',difficulty:'easy'},
            {name:'Environment and Sustainable Development',difficulty:'easy'},
            {name:'Comparative Development Experiences of India and Its Neighbours',difficulty:'medium'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Portrait of a Lady',difficulty:'medium'},
            {name:'We\'re Not Afraid to Die',difficulty:'medium'},
            {name:'Discovering Tut: The Saga Continues',difficulty:'medium'},
            {name:'Landscape of the Soul',difficulty:'medium'},
            {name:'The Ailing Planet',difficulty:'medium'},
            {name:'The Browning Version',difficulty:'medium'},
            {name:'The Adventure',difficulty:'medium'},
            {name:'Silk Road',difficulty:'medium'},
            {name:'A Photograph (Poem)',difficulty:'medium'},
            {name:'The Laburnum Top (Poem)',difficulty:'medium'},
            {name:'The Voice of the Rain (Poem)',difficulty:'medium'},
            {name:'Childhood (Poem)',difficulty:'medium'},
            {name:'Father to Son (Poem)',difficulty:'medium'},
            {name:'The Summer of the Beautiful White Horse',difficulty:'medium'},
            {name:'The Address',difficulty:'medium'},
            {name:'Ranga\'s Marriage',difficulty:'medium'},
            {name:'Albert Einstein at School',difficulty:'medium'},
            {name:'Mother\'s Day',difficulty:'medium'},
            {name:'The Ghat of the Only World',difficulty:'medium'},
            {name:'Birth',difficulty:'medium'},
            {name:'The Tale of Melon City',difficulty:'medium'}
        ]},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Sets',difficulty:'easy'},
            {name:'Relations and Functions',difficulty:'medium'},
            {name:'Trigonometric Functions',difficulty:'hard'},
            {name:'Principle of Mathematical Induction',difficulty:'medium'},
            {name:'Complex Numbers and Quadratic Equations',difficulty:'hard'},
            {name:'Linear Inequalities',difficulty:'easy'},
            {name:'Permutations and Combinations',difficulty:'medium'},
            {name:'Binomial Theorem',difficulty:'medium'},
            {name:'Sequences and Series',difficulty:'medium'},
            {name:'Straight Lines',difficulty:'medium'},
            {name:'Conic Sections',difficulty:'hard'},
            {name:'Introduction to Three Dimensional Geometry',difficulty:'medium'},
            {name:'Limits and Derivatives',difficulty:'hard'},
            {name:'Statistics',difficulty:'easy'},
            {name:'Probability',difficulty:'medium'}
        ]}
    ],

    // ── CLASS 12 PCM ─────────────────────────────────────────────────────
    CLASS12_PCM_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:[
            {name:'Electric Charges and Fields',difficulty:'hard'},
            {name:'Electrostatic Potential and Capacitance',difficulty:'hard'},
            {name:'Current Electricity',difficulty:'hard'},
            {name:'Moving Charges and Magnetism',difficulty:'hard'},
            {name:'Magnetism and Matter',difficulty:'medium'},
            {name:'Electromagnetic Induction',difficulty:'hard'},
            {name:'Alternating Current',difficulty:'hard'},
            {name:'Electromagnetic Waves',difficulty:'medium'},
            {name:'Ray Optics and Optical Instruments',difficulty:'medium'},
            {name:'Wave Optics',difficulty:'hard'},
            {name:'Dual Nature of Radiation and Matter',difficulty:'medium'},
            {name:'Atoms',difficulty:'medium'},
            {name:'Nuclei',difficulty:'medium'},
            {name:'Semiconductor Electronics',difficulty:'hard'},
            {name:'Communication Systems',difficulty:'easy'}
        ]},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:[
            {name:'The Solid State',difficulty:'hard'},
            {name:'Solutions',difficulty:'hard'},
            {name:'Electrochemistry',difficulty:'hard'},
            {name:'Chemical Kinetics',difficulty:'hard'},
            {name:'Surface Chemistry',difficulty:'medium'},
            {name:'General Principles and Processes of Isolation of Elements',difficulty:'medium'},
            {name:'The p-Block Elements',difficulty:'hard'},
            {name:'The d- and f-Block Elements',difficulty:'medium'},
            {name:'Coordination Compounds',difficulty:'hard'},
            {name:'Haloalkanes and Haloarenes',difficulty:'hard'},
            {name:'Alcohols, Phenols and Ethers',difficulty:'hard'},
            {name:'Aldehydes, Ketones and Carboxylic Acids',difficulty:'hard'},
            {name:'Amines',difficulty:'hard'},
            {name:'Biomolecules',difficulty:'medium'},
            {name:'Polymers',difficulty:'easy'},
            {name:'Chemistry in Everyday Life',difficulty:'easy'}
        ]},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Relations and Functions',difficulty:'medium'},
            {name:'Inverse Trigonometric Functions',difficulty:'hard'},
            {name:'Matrices',difficulty:'medium'},
            {name:'Determinants',difficulty:'hard'},
            {name:'Continuity and Differentiability',difficulty:'hard'},
            {name:'Application of Derivatives',difficulty:'hard'},
            {name:'Integrals',difficulty:'hard'},
            {name:'Application of Integrals',difficulty:'hard'},
            {name:'Differential Equations',difficulty:'hard'},
            {name:'Vector Algebra',difficulty:'medium'},
            {name:'Three Dimensional Geometry',difficulty:'hard'},
            {name:'Linear Programming',difficulty:'medium'},
            {name:'Probability',difficulty:'hard'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Last Lesson',difficulty:'medium'},
            {name:'Lost Spring',difficulty:'medium'},
            {name:'Deep Water',difficulty:'medium'},
            {name:'The Rattrap',difficulty:'medium'},
            {name:'Indigo',difficulty:'medium'},
            {name:'Poets and Pancakes',difficulty:'medium'},
            {name:'The Interview',difficulty:'medium'},
            {name:'Going Places',difficulty:'medium'},
            {name:'My Mother at Sixty-six (Poem)',difficulty:'medium'},
            {name:'Keeping Quiet (Poem)',difficulty:'medium'},
            {name:'A Thing of Beauty (Poem)',difficulty:'medium'},
            {name:'A Roadside Stand (Poem)',difficulty:'medium'},
            {name:'Aunt Jennifer\'s Tigers (Poem)',difficulty:'medium'},
            {name:'Third Level',difficulty:'medium'},
            {name:'The Tiger King',difficulty:'medium'},
            {name:'Journey to the End of the Earth',difficulty:'medium'},
            {name:'The Enemy',difficulty:'medium'},
            {name:'Should Wizard Hit Mommy',difficulty:'medium'},
            {name:'On the Face of It',difficulty:'medium'},
            {name:'Evans Tries an O-level',difficulty:'medium'},
            {name:'Memories of Childhood',difficulty:'medium'}
        ]},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:[
            {name:'Planning in Sports',difficulty:'easy'},
            {name:'Sports and Nutrition',difficulty:'easy'},
            {name:'Yoga and Lifestyle',difficulty:'easy'},
            {name:'Physical Education and Sports for CWSN',difficulty:'easy'},
            {name:'Children and Women in Sports',difficulty:'easy'},
            {name:'Test, Measurement and Evaluation in Sports',difficulty:'medium'},
            {name:'Physiology and Injuries in Sports',difficulty:'medium'},
            {name:'Biomechanics and Sports',difficulty:'medium'},
            {name:'Psychology and Sports',difficulty:'medium'},
            {name:'Training in Sports',difficulty:'medium'}
        ]}
    ],

    // ── CLASS 12 PCB ─────────────────────────────────────────────────────
    CLASS12_PCB_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:[
            {name:'Electric Charges and Fields',difficulty:'hard'},
            {name:'Electrostatic Potential and Capacitance',difficulty:'hard'},
            {name:'Current Electricity',difficulty:'hard'},
            {name:'Moving Charges and Magnetism',difficulty:'hard'},
            {name:'Magnetism and Matter',difficulty:'medium'},
            {name:'Electromagnetic Induction',difficulty:'hard'},
            {name:'Alternating Current',difficulty:'hard'},
            {name:'Electromagnetic Waves',difficulty:'medium'},
            {name:'Ray Optics and Optical Instruments',difficulty:'medium'},
            {name:'Wave Optics',difficulty:'hard'},
            {name:'Dual Nature of Radiation and Matter',difficulty:'medium'},
            {name:'Atoms',difficulty:'medium'},
            {name:'Nuclei',difficulty:'medium'},
            {name:'Semiconductor Electronics',difficulty:'hard'},
            {name:'Communication Systems',difficulty:'easy'}
        ]},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:[
            {name:'The Solid State',difficulty:'hard'},
            {name:'Solutions',difficulty:'hard'},
            {name:'Electrochemistry',difficulty:'hard'},
            {name:'Chemical Kinetics',difficulty:'hard'},
            {name:'Surface Chemistry',difficulty:'medium'},
            {name:'General Principles and Processes of Isolation of Elements',difficulty:'medium'},
            {name:'The p-Block Elements',difficulty:'hard'},
            {name:'The d- and f-Block Elements',difficulty:'medium'},
            {name:'Coordination Compounds',difficulty:'hard'},
            {name:'Haloalkanes and Haloarenes',difficulty:'hard'},
            {name:'Alcohols, Phenols and Ethers',difficulty:'hard'},
            {name:'Aldehydes, Ketones and Carboxylic Acids',difficulty:'hard'},
            {name:'Amines',difficulty:'hard'},
            {name:'Biomolecules',difficulty:'medium'},
            {name:'Polymers',difficulty:'easy'},
            {name:'Chemistry in Everyday Life',difficulty:'easy'}
        ]},
        {name:'Biology',icon:'🌿',color:'#22c55e',chapters:[
            {name:'Reproduction in Organisms',difficulty:'easy'},
            {name:'Sexual Reproduction in Flowering Plants',difficulty:'medium'},
            {name:'Human Reproduction',difficulty:'medium'},
            {name:'Reproductive Health',difficulty:'easy'},
            {name:'Principles of Inheritance and Variation',difficulty:'hard'},
            {name:'Molecular Basis of Inheritance',difficulty:'hard'},
            {name:'Evolution',difficulty:'medium'},
            {name:'Human Health and Disease',difficulty:'medium'},
            {name:'Strategies for Enhancement in Food Production',difficulty:'easy'},
            {name:'Microbes in Human Welfare',difficulty:'easy'},
            {name:'Biotechnology: Principles and Processes',difficulty:'hard'},
            {name:'Biotechnology and its Applications',difficulty:'medium'},
            {name:'Organisms and Populations',difficulty:'medium'},
            {name:'Ecosystem',difficulty:'medium'},
            {name:'Biodiversity and Conservation',difficulty:'easy'},
            {name:'Environmental Issues',difficulty:'easy'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Last Lesson',difficulty:'medium'},
            {name:'Lost Spring',difficulty:'medium'},
            {name:'Deep Water',difficulty:'medium'},
            {name:'The Rattrap',difficulty:'medium'},
            {name:'Indigo',difficulty:'medium'},
            {name:'Poets and Pancakes',difficulty:'medium'},
            {name:'The Interview',difficulty:'medium'},
            {name:'Going Places',difficulty:'medium'},
            {name:'My Mother at Sixty-six (Poem)',difficulty:'medium'},
            {name:'Keeping Quiet (Poem)',difficulty:'medium'},
            {name:'A Thing of Beauty (Poem)',difficulty:'medium'},
            {name:'A Roadside Stand (Poem)',difficulty:'medium'},
            {name:'Aunt Jennifer\'s Tigers (Poem)',difficulty:'medium'},
            {name:'Third Level',difficulty:'medium'},
            {name:'The Tiger King',difficulty:'medium'},
            {name:'Journey to the End of the Earth',difficulty:'medium'},
            {name:'The Enemy',difficulty:'medium'},
            {name:'Should Wizard Hit Mommy',difficulty:'medium'},
            {name:'On the Face of It',difficulty:'medium'},
            {name:'Evans Tries an O-level',difficulty:'medium'},
            {name:'Memories of Childhood',difficulty:'medium'}
        ]},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:[
            {name:'Planning in Sports',difficulty:'easy'},
            {name:'Sports and Nutrition',difficulty:'easy'},
            {name:'Yoga and Lifestyle',difficulty:'easy'},
            {name:'Physical Education and Sports for CWSN',difficulty:'easy'},
            {name:'Children and Women in Sports',difficulty:'easy'},
            {name:'Test, Measurement and Evaluation in Sports',difficulty:'medium'},
            {name:'Physiology and Injuries in Sports',difficulty:'medium'},
            {name:'Biomechanics and Sports',difficulty:'medium'},
            {name:'Psychology and Sports',difficulty:'medium'},
            {name:'Training in Sports',difficulty:'medium'}
        ]}
    ],

    // ── CLASS 12 COMMERCE ────────────────────────────────────────────────
    CLASS12_COMMERCE_DATA:[
        {name:'Accountancy',icon:'💰',color:'#a855f7',chapters:[
            {name:'Accounting for Not-for-Profit Organisation',difficulty:'hard'},
            {name:'Accounting for Partnership: Basic Concepts',difficulty:'medium'},
            {name:'Reconstitution of a Partnership Firm — Admission of a Partner',difficulty:'hard'},
            {name:'Reconstitution of a Partnership Firm — Retirement/Death of a Partner',difficulty:'hard'},
            {name:'Dissolution of Partnership Firm',difficulty:'hard'},
            {name:'Accounting for Share Capital',difficulty:'hard'},
            {name:'Issue and Redemption of Debentures',difficulty:'hard'},
            {name:'Financial Statements of a Company',difficulty:'medium'},
            {name:'Analysis of Financial Statements',difficulty:'medium'},
            {name:'Accounting Ratios',difficulty:'medium'},
            {name:'Cash Flow Statement',difficulty:'hard'},
            {name:'Computerised Accounting System',difficulty:'easy'}
        ]},
        {name:'Business Studies',icon:'🏢',color:'#0ea5e9',chapters:[
            {name:'Nature and Significance of Management',difficulty:'easy'},
            {name:'Principles of Management',difficulty:'easy'},
            {name:'Business Environment',difficulty:'medium'},
            {name:'Planning',difficulty:'medium'},
            {name:'Organising',difficulty:'medium'},
            {name:'Staffing',difficulty:'medium'},
            {name:'Directing',difficulty:'medium'},
            {name:'Controlling',difficulty:'medium'},
            {name:'Financial Management',difficulty:'hard'},
            {name:'Financial Markets',difficulty:'hard'},
            {name:'Marketing Management',difficulty:'medium'},
            {name:'Consumer Protection',difficulty:'easy'},
            {name:'Entrepreneurship Development',difficulty:'easy'}
        ]},
        {name:'Economics',icon:'📈',color:'#f97316',chapters:[
            {name:'Introduction to Macroeconomics',difficulty:'easy'},
            {name:'National Income Accounting',difficulty:'hard'},
            {name:'Money and Banking',difficulty:'medium'},
            {name:'Determination of Income and Employment',difficulty:'hard'},
            {name:'Government Budget and the Economy',difficulty:'medium'},
            {name:'Open Economy Macroeconomics',difficulty:'hard'},
            {name:'Indian Economy on the Eve of Independence',difficulty:'easy'},
            {name:'Indian Economy 1950–1990',difficulty:'easy'},
            {name:'Liberalisation, Privatisation and Globalisation',difficulty:'medium'},
            {name:'Poverty',difficulty:'easy'},
            {name:'Human Capital Formation in India',difficulty:'easy'},
            {name:'Rural Development',difficulty:'easy'},
            {name:'Employment: Growth, Informalisation and Other Issues',difficulty:'medium'},
            {name:'Infrastructure',difficulty:'easy'},
            {name:'Environment and Sustainable Development',difficulty:'easy'}
        ]},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:[
            {name:'The Last Lesson',difficulty:'medium'},
            {name:'Lost Spring',difficulty:'medium'},
            {name:'Deep Water',difficulty:'medium'},
            {name:'The Rattrap',difficulty:'medium'},
            {name:'Indigo',difficulty:'medium'},
            {name:'Poets and Pancakes',difficulty:'medium'},
            {name:'The Interview',difficulty:'medium'},
            {name:'Going Places',difficulty:'medium'},
            {name:'My Mother at Sixty-six (Poem)',difficulty:'medium'},
            {name:'Keeping Quiet (Poem)',difficulty:'medium'},
            {name:'A Thing of Beauty (Poem)',difficulty:'medium'},
            {name:'A Roadside Stand (Poem)',difficulty:'medium'},
            {name:'Aunt Jennifer\'s Tigers (Poem)',difficulty:'medium'},
            {name:'Third Level',difficulty:'medium'},
            {name:'The Tiger King',difficulty:'medium'},
            {name:'Journey to the End of the Earth',difficulty:'medium'},
            {name:'The Enemy',difficulty:'medium'},
            {name:'Should Wizard Hit Mommy',difficulty:'medium'},
            {name:'On the Face of It',difficulty:'medium'},
            {name:'Evans Tries an O-level',difficulty:'medium'},
            {name:'Memories of Childhood',difficulty:'medium'}
        ]},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:[
            {name:'Relations and Functions',difficulty:'medium'},
            {name:'Inverse Trigonometric Functions',difficulty:'hard'},
            {name:'Matrices',difficulty:'medium'},
            {name:'Determinants',difficulty:'hard'},
            {name:'Continuity and Differentiability',difficulty:'hard'},
            {name:'Application of Derivatives',difficulty:'hard'},
            {name:'Integrals',difficulty:'hard'},
            {name:'Application of Integrals',difficulty:'hard'},
            {name:'Differential Equations',difficulty:'hard'},
            {name:'Vector Algebra',difficulty:'medium'},
            {name:'Three Dimensional Geometry',difficulty:'hard'},
            {name:'Linear Programming',difficulty:'medium'},
            {name:'Probability',difficulty:'hard'}
        ]}
    ],

    // ── CBSE_DATA master object (keyed by class) ─────────────────────────
    get CBSE_DATA(){
        return {
            9:  this.CLASS9_DATA,
            10: this.CLASS10_DATA,
            11: { PCM: this.CLASS11_PCM_DATA, PCB: this.CLASS11_PCB_DATA, Commerce: this.CLASS11_COMMERCE_DATA },
            12: { PCM: this.CLASS12_PCM_DATA, PCB: this.CLASS12_PCB_DATA, Commerce: this.CLASS12_COMMERCE_DATA }
        };
    },

    DAILY_CHALLENGES:[
        {text:'Study 3 different subjects today',check:s=>{const t=new Set(s.sessions.filter(x=>x.date===s.today).map(x=>x.subjectId));return t.size>=3},xp:30},
        {text:'Complete 2 chapters today',check:s=>s.chaptersCompletedToday>=2,xp:40},
        {text:'Study for 3 hours total',check:s=>s.todayMinutes>=180,xp:35},
        {text:'Do 3 revisions today',check:s=>s.revisionsToday>=3,xp:30},
        {text:'Log 4 study sessions',check:s=>s.sessions.filter(x=>x.date===s.today).length>=4,xp:25},
        {text:'Complete all daily tasks',check:s=>{const t=s.tasks.filter(x=>x.date===s.today);return t.length>0&&t.every(x=>x.done)},xp:35},
        {text:'Study for 1 hour without break',check:s=>s.sessions.filter(x=>x.date===s.today).some(x=>x.timeSpent>=60),xp:30},
        {text:'Clear 2 doubts',check:s=>s.doubtsResolvedToday>=2,xp:25},
        {text:'Add notes for 2 chapters',check:s=>s.notesAddedToday>=2,xp:20},
        {text:'Score 80%+ on practice test',check:s=>s.examScores.filter(x=>x.date===s.today).some(x=>x.scored/x.total>=0.8),xp:40}
    ],

    async init(){
        // ── Deep link: /circle/join?code=XXXXXX ──────────────────────────────
        // Must run BEFORE the auth check below, because if there's no
        // session we're about to redirect to /index.html and lose the
        // current URL (and its ?code= param) entirely. Stash it in
        // sessionStorage so it survives the login round-trip; _pendingCircleCode
        // is read again further down, after a session is confirmed.
        if (window.location.pathname === '/circle/join') {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            if (code) sessionStorage.setItem('_pendingCircleCode', code);
        }

        // ── Step 1: Let Supabase resolve any OAuth hash tokens ──────────────
        await new Promise((resolve) => {
            const { data: { subscription } } = window.supabase.auth.onAuthStateChange((event, session) => {
                subscription.unsubscribe();
                resolve(session);
            });
        });

        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session) {
            window.location.href = '/index.html';
            return;
        }
        // Store session + email globally for use in renderSettings and API calls
        window._supabaseSession = session;
        window._supabaseUserEmail = session.user?.email || '';

        // ── Step 2: Load UI-only state from localStorage (theme, page, etc.) ──
        this.load();

        // Always start on dashboard on refresh — UNLESS a circle join is
        // pending (either from this exact page load, or stashed before an
        // auth redirect on a previous load). Check sessionStorage, not just
        // the URL, since the URL that originally carried ?code= may already
        // be gone by the time we get here (post-login redirect lands on a
        // different path).
        this.state.currentPage = 'dashboard';
        const pendingCircleCode = sessionStorage.getItem('_pendingCircleCode');
        if (pendingCircleCode) {
            this.state.currentPage = 'circles';
            this._pendingCircleJoinCode = pendingCircleCode;
            // Kept separately from _pendingCircleJoinCode (which renderCircles()
            // nulls out after consuming) specifically so completeWelcome() can
            // still tell a join was pending even if renderCircles() already
            // fired once behind the onboarding overlay for a brand-new user.
            this._pendingCircleJoinCodeRaw = pendingCircleCode;
            sessionStorage.removeItem('_pendingCircleCode');
            // render() (called later in init, not navigate()) does NOT fetch
            // tab data on its own — only navigate() pairs fetch+render. Since
            // we're bypassing navigate() here, fetch explicitly so the
            // circles list isn't empty behind the auto-opened join modal.
            this._loadTabData('circles');
        }

        // ── Step 3: Ensure state field defaults (fields with no Supabase home) ──
        if(!this.state.pomodoroSettings)this.state.pomodoroSettings={workMin:25,breakMin:5,longBreakMin:15,sessionsBeforeLong:4};
        if(!this.state.quizData)this.state.quizData={};
        if(!this.state.exercises)this.state.exercises={};
        if(!this.state.theme)this.state.theme='warm-dark';
        if(!this.state.stopwatch)this.state.stopwatch={running:false,elapsed:0,subjectId:'',chapterId:''};
        if(!this.state.dailyChallenges)this.state.dailyChallenges={date:'',challenges:[],completed:[]};
        if(!this.state.weeklyPlan)this.state.weeklyPlan={};
        if(!this.state.checkins)this.state.checkins={};
        if(!this.state.profile.selectedClass) this.state.profile.selectedClass = 10;
        if(!this.state.profile.selectedStream) this.state.profile.selectedStream = null;
        if(!this.state.profile.mood)this.state.profile.mood='';
        if(!this.state.profile.moodHistory)this.state.profile.moodHistory=[];
        if(this.state.autoTheme===undefined)this.state.autoTheme=false;
        if(this.state.streakFreezes===undefined)this.state.streakFreezes=1;
        if(this.state.lastFreezeUsedDate===undefined)this.state.lastFreezeUsedDate=null;
        if(this.state.pendingFreezeNotice===undefined)this.state.pendingFreezeNotice=false;
        if(this.state.lastFreezeEarnedDate===undefined)this.state.lastFreezeEarnedDate=null;

        // Apply theme early so the loading screen inherits correct colours
        this.applyTheme();

        // ── Step 4: MINIMAL bootstrap — only profile + today's challenge ─────
        //
        // PERF: The old loadFromSupabase() made 13+ sequential Supabase calls
        // on every page load, blocking the first render for 16 530 ms.
        //
        // New contract:
        //   • _loadBootstrap()  → 2 parallel calls (profile + challenge).
        //                         Runs NOW, before first render.
        //   • _loadTabData(tab) → lazy per-tab fetch, called from navigate().
        //                         Each tab fetches its own data the first time
        //                         the user navigates there.  Subsequent visits
        //                         are served from in-memory state (no re-fetch).
        //
        // Result: first paint happens after ~1 network round-trip instead of 13.
        this.showLoadingScreen();
        await this._loadBootstrap(session.user.id);
        this.hideLoadingScreen();
        // ── Notifications: init after bootstrap so userId is confirmed ────────
        if (window.Notifications) await Notifications.init(session.user.id);

        // ── Step 5: Welcome overlay — only for brand-new users ───────────────
        // subjects haven't loaded yet at this point; we check after the first
        // navigate-to-subjects fetch instead.  For the welcome check we rely on
        // the migration flag — new users never have it set.
        const migrationDone = localStorage.getItem('studyos_migration_done');
        if (!migrationDone && this.state.subjects.length === 0) {
            // Eagerly fetch subjects in the background so the welcome check is
            // accurate (subjects may already exist if user refreshed mid-onboard).
            this._loadTabData('subjects').then(() => {
                if (this.state.subjects.length === 0) {
                    document.getElementById('welcome-overlay').classList.remove('hidden');
                }
            });
        }

        // ── Step 6: Boot the rest of the app ────────────────────────────────
        this.pomodoro.timeLeft=(this.state.pomodoroSettings.workMin||25)*60;
        this._badgesLoaded=true; // flag: earnedBadges is now populated from Supabase
        this.updateStreak();this.generateDailyChallenges();this.render();this.updateSidebar();
        this.updatePageTitle();

        // ── Background subjects prefetch ─────────────────────────────────────
        // Dashboard hero needs subjects to show the next chapter to study.
        // Subjects are lazy-loaded on first tab visit, which means the hero
        // shows the "All Caught Up" empty state on first load. This background
        // fetch runs immediately after first paint and re-renders the dashboard
        // hero once data arrives (~300-600ms later). Zero impact on first paint.
        if (!this._loadedTabs.has('subjects')) {
            this._loadTabData('subjects').then(() => {
                const rerender = () => {
                    if (this.state.currentPage === 'dashboard') this.renderDashboard();
                };
                if (window.requestIdleCallback) {
                    requestIdleCallback(rerender, { timeout: 1000 });
                } else {
                    setTimeout(rerender, 100);
                }
                // Run the one-time difficulty migration after subjects are in memory.
                // Uses requestIdleCallback so it never blocks rendering.
                const runMigration = () => { this._migrateCBSEDifficulty(); this._migrateSubjectIconType(); };
                if (window.requestIdleCallback) {
                    requestIdleCallback(runMigration, { timeout: 5000 });
                } else {
                    setTimeout(runMigration, 1500);
                }
            });
        }

        this.checkBadges();
        setInterval(()=>{this.updatePageSubtitle();this.updateTopbarPills();if(this.state.autoTheme)this.autoThemeCheck();this.checkStreakReminder();this.checkEodCheckin()},60000);
        setTimeout(()=>{this.checkStreakReminder();this.checkEodCheckin()},5000);
        this.updatePageSubtitle();
        this.updateTopbarPills();
        if(this.state.autoTheme)this.autoThemeCheck();
        if(this.state.stopwatch.running)this.startStopwatchTimer();
    },

    // ── Loading screen ────────────────────────────────────────────────────────
    showLoadingScreen(){
        if(document.getElementById('studyos-loading-screen'))return;
        const el=document.createElement('div');
        el.id='studyos-loading-screen';
        el.style.cssText=`
            position:fixed;inset:0;z-index:9999;
            background:var(--color-bg);
            display:flex;flex-direction:column;
            align-items:center;justify-content:center;gap:20px;
        `;
        el.innerHTML=`
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"
                style="animation:studyos-spin 0.9s linear infinite;flex-shrink:0">
                <circle cx="20" cy="20" r="16" stroke="var(--color-border)" stroke-width="3"/>
                <path d="M20 4 A16 16 0 0 1 36 20" stroke="var(--color-brand)" stroke-width="3" stroke-linecap="round"/>
            </svg>
            <span style="font-family:var(--font-body);font-size:.875rem;font-weight:500;color:var(--color-text-secondary);letter-spacing:.2px">
                Loading your data…
            </span>
            <style>
                @keyframes studyos-spin{to{transform:rotate(360deg)}}
            </style>
        `;
        document.body.appendChild(el);
    },

    hideLoadingScreen(){
        const el=document.getElementById('studyos-loading-screen');
        if(el){
            el.style.transition='opacity .25s ease';
            el.style.opacity='0';
            setTimeout(()=>el.remove(),280);
        }
    },

    // ── MINIMAL BOOTSTRAP (2 parallel calls, runs at every page load) ────────
    //
    // Fetches ONLY what the dashboard needs to render its first frame:
    //   1. profile  — name, streak, exam date, daily goal, XP/level
    //   2. challenge — today's challenge widget on the home screen
    //
    // Everything else (subjects, sessions, tasks, doubts, notes, resources,
    // badges, checkins, quiz) is fetched lazily by _loadTabData() the first
    // time the user navigates to the relevant tab.
    async _loadBootstrap(userId){
        window._supabaseUserId = userId;
        const warn = (label, error) => console.warn(`[StudyOS] bootstrap — ${label} failed:`, error);

        const today = this.today();

        // Run bootstrap calls in parallel — none depend on each other.
        // todaySessionsResult  → today's study time for the dashboard stat tile
        // firstSessionResult   → earliest session date for pace/predicted-completion calc
        const [profileResult, challengeResult, todaySessionsResult, firstSessionResult, activeDaysResult] = await Promise.allSettled([
            DB.profile.get(userId),
            DB.challenges.getToday(userId, today),
            window.supabase.from('sessions').select('time_spent,date,subject_id,chapter_id,type,confidence,intention,covered_note,streak_eligible,created_at,id').eq('user_id', userId).eq('date', today),
            window.supabase.from('sessions').select('date').eq('user_id', userId).order('date', { ascending: true }).limit(1),
            window.supabase.from('sessions').select('date').eq('user_id', userId),
        ]);

        // ── Profile (basic fields for the header/sidebar) ──────────────────
        try {
            if (profileResult.status === 'rejected') throw profileResult.reason;
            const { data: profile, error } = profileResult.value;
            if (error) throw error;
            if (profile) {
                this.state.profile = {
                    ...this.state.profile,
                    name:             (profile.name          && profile.name.trim())          ? profile.name          : this.state.profile.name,
                    examDate:         (profile.exam_date     && profile.exam_date.trim())     ? profile.exam_date     : this.state.profile.examDate,
                    dailyGoalMinutes: profile.daily_goal_minutes ?? this.state.profile.dailyGoalMinutes,
                    targetScore:      profile.target_score   ?? this.state.profile.targetScore,
                    selectedClass:    profile.selected_class  ?? this.state.profile.selectedClass,
                    selectedStream:   profile.selected_stream ?? this.state.profile.selectedStream,
                    // Extended fields needed for streak/XP/level — all come from
                    // the same single profile row so no extra round-trip.
                    xp:               profile.xp                   ?? this.state.profile.xp,
                    level:            profile.level                ?? this.state.profile.level,
                    streak:           profile.streak               ?? this.state.profile.streak,
                    lastStudyDate:    profile.last_study_date      ?? this.state.profile.lastStudyDate,
                    maxDailyMinutes:  profile.max_daily_minutes    ?? this.state.profile.maxDailyMinutes,
                    pomodoroCompleted:profile.pomodoro_completed   ?? this.state.profile.pomodoroCompleted,
                    mood:             profile.mood                 ?? this.state.profile.mood,
                    moodHistory:      profile.mood_history         ? (Array.isArray(profile.mood_history) ? profile.mood_history : (() => { try { return JSON.parse(profile.mood_history); } catch(e){ return this.state.profile.moodHistory; } })()) : this.state.profile.moodHistory,
                };
                this.state.streakFreezes         = profile.streak_freezes         ?? this.state.streakFreezes;
                this.state.lastFreezeUsedDate    = profile.last_freeze_used_date  ?? this.state.lastFreezeUsedDate;
                this.state.lastFreezeEarnedDate  = profile.last_freeze_earned_date ?? this.state.lastFreezeEarnedDate;
                this.state.pendingFreezeNotice   = profile.pending_freeze_notice  ?? this.state.pendingFreezeNotice;
                if (profile.weekly_plan) { try { this.state.weeklyPlan = JSON.parse(profile.weekly_plan); } catch(e){} }
                if (profile.pomodoro_settings)  { try { this.state.pomodoroSettings = JSON.parse(profile.pomodoro_settings); } catch(e){} }
            }
        } catch(e){ warn('profile', e); }

        // ── Today's challenge (home screen widget) ─────────────────────────
        try {
            if (challengeResult.status === 'rejected') throw challengeResult.reason;
            const { data: todayChallenge } = challengeResult.value;
            if (todayChallenge && todayChallenge.goal) {
                try {
                    this.state.dailyChallenges = {
                        date:       todayChallenge.date,
                        challenges: JSON.parse(todayChallenge.goal      || '[]'),
                        completed:  JSON.parse(todayChallenge.completed || '[]'),
                    };
                } catch(e){}
            }
        } catch(e){ warn('dailyChallenges', e); }

        // ── Today's sessions (dashboard stat tile) ────────────────────────────
        try {
            if (todaySessionsResult.status === 'rejected') throw todaySessionsResult.reason;
            const { data: todaySessions, error } = todaySessionsResult.value;
            if (error) throw error;
            if (todaySessions && todaySessions.length > 0) {
                const normalized = todaySessions.map(s => ({
                    ...s,
                    timeSpent:  s.time_spent  ?? 0,
                    subjectId:  s.subject_id  ?? '',
                    chapterId:  s.chapter_id  ?? '',
                    createdAt:  s.created_at  ?? Date.now(),
                    coveredNote: s.covered_note ?? '',
                    streakEligible: s.streak_eligible ?? true,
                    time_spent:  undefined,
                    subject_id:  undefined,
                    chapter_id:  undefined,
                    created_at:  undefined,
                    covered_note: undefined,
                    streak_eligible: undefined,
                }));
                const existingIds = new Set(this.state.sessions.map(s => s.id));
                normalized.forEach(s => { if (!existingIds.has(s.id)) this.state.sessions.push(s); });
            }
        } catch(e){ warn('todaySessions', e); }

        // ── Earliest session date (for getPredictedCompletion pace calc) ──────
        try {
            if (firstSessionResult.status === 'rejected') throw firstSessionResult.reason;
            const { data: firstRows, error } = firstSessionResult.value;
            if (error) throw error;
            if (firstRows && firstRows.length > 0) {
                this._firstSessionDate = firstRows[0].date;
            }
        } catch(e){ warn('firstSession', e); }

        // ── Active study days count (for accurate pace calc) ──────────────────
        // Counts unique dates with at least one session — excludes idle days.
        // Stored as this._activeDays so getPredictedCompletion() uses real pace.
        try {
            if (activeDaysResult.status === 'rejected') throw activeDaysResult.reason;
            const { data: allDateRows, error } = activeDaysResult.value;
            if (error) throw error;
            if (allDateRows && allDateRows.length > 0) {
                this._activeDays = new Set(allDateRows.map(r => r.date)).size;
            }
        } catch(e){ warn('activeDays', e); }
    },

    // ── PER-TAB LAZY DATA LOADER ──────────────────────────────────────────────
    //
    // Called from navigate() the first time a tab becomes active.
    // A simple Set (_loadedTabs) acts as the guard — once a tab's data is in
    // memory the flag is set and subsequent navigations skip the fetch entirely.
    //
    // Tabs that can receive NEW data (e.g. tasks changes daily, sessions grows)
    // do NOT set the flag so they always re-fetch — but they are cheap point
    // queries (date-scoped), not full table scans.
    //
    // Design principle: this function only sets state and calls render() if the
    // data actually changed.  It never touches UI rendering logic directly.
    _loadedTabs: new Set(),

    async _loadTabData(tab){
        const userId = window._supabaseUserId;
        if (!userId) return;
        const warn = (label, e) => console.warn(`[StudyOS] _loadTabData(${tab}) — ${label} failed:`, e);

        // ── subjects + chapters ──────────────────────────────────────────────
        // Used by: subjects, revisions, weekly, dashboard (subject list),
        //          quiz, exams, log modal, task auto-plan, rewards (badge checks).
        // We load this lazily on the first navigate to ANY content tab that
        // needs subjects, because the dashboard itself doesn't require them for
        // its first paint (streak / goal / challenge render without subjects).
        if (tab === 'subjects' || tab === 'revisions' ||
            tab === 'weekly'   || tab === 'quiz'      || tab === 'backlog') {
            if (!this._loadedTabs.has('subjects')) {
                try {
                    const { data: subjects, error } = await DB.subjects.getAll(userId);
                    if (error) throw error;
                    if (subjects) {
                        // PERF: was Promise.all(subjects.map(... DB.chapters.getBySubject(sub.id) ...))
                        // — N subjects = N separate `chapters?select=...&subject_id=eq.X`
                        // requests, each ~3.8s in the LCP-blocking critical path.
                        // Now: ONE `chapters?select=...&subject_id=in.(id1,id2,...)`
                        // request, then group results back onto each subject by
                        // subject_id in memory. Resulting state.subjects shape is
                        // IDENTICAL to before — only the fetch strategy changed.
                        const subjectIds = subjects.map(sub => sub.id);
                        let allChapters = [];
                        try {
                            const { data: chData, error: chErr } = await DB.chapters.getBySubjects(subjectIds);
                            if (chErr) throw chErr;
                            if (chData) allChapters = chData;
                        } catch(chE){ warn('chapters (batched)', chE); }

                        const chaptersBySubject = new Map();
                        allChapters.forEach(ch => {
                            const sid = ch.subject_id;
                            if (!chaptersBySubject.has(sid)) chaptersBySubject.set(sid, []);
                            chaptersBySubject.get(sid).push({
                                ...ch,
                                subjectId:      ch.subject_id,
                                revisionCount:  ch.revision_count ?? 0,
                                revisionDates:  ch.revision_dates ?? [],
                                order:          ch.order_index    ?? 0,
                                status:         ch.status         ?? 'not-started',
                                difficulty:     ch.difficulty     ?? 'medium',
                                notes:          ch.notes          ?? '',
                                deadline:       ch.deadline       ?? '',
                                completionDate: ch.completion_date ?? null,
                                subject_id:      undefined,
                                revision_count:  undefined,
                                order_index:     undefined,
                                revision_dates:  undefined,
                                completion_date: undefined,
                            });
                        });

                        const withChapters = subjects.map(sub => ({
                            ...sub,
                            iconType: sub.icon_type || this.getIconType(sub.name),
                            chapters: chaptersBySubject.get(sub.id) || [],
                        }));
                        this.state.subjects = withChapters;
                    }
                    this._loadedTabs.add('subjects');
                } catch(e){ warn('subjects', e); }
            }
        }

        // ── sessions (one-time, for "last studied" dates on chapter rows) ─────
        // subjects tab doesn't normally need session data, but renderSubjects()
        // now shows each chapter's last-studied date, which requires sessions
        // to be loaded. Guarded by _loadedTabs so it only fetches once per
        // session (NOT every visit) — unlike the log/weekly fetch below, which
        // intentionally re-fetches every time since sessions grow continuously.
        if (tab === 'subjects' && !this._loadedTabs.has('sessions')) {
            try {
                const { data: sessions, error } = await DB.sessions.getAll(userId);
                if (error) throw error;
                if (sessions) {
                    this.state.sessions = sessions.map(s => ({
                        ...s,
                        timeSpent:  s.time_spent  ?? s.timeSpent  ?? 0,
                        subjectId:  s.subject_id  ?? s.subjectId  ?? '',
                        chapterId:  s.chapter_id  ?? s.chapterId  ?? '',
                        createdAt:  s.created_at  ?? s.createdAt  ?? Date.now(),
                        time_spent:  undefined,
                        subject_id:  undefined,
                        chapter_id:  undefined,
                        created_at:  undefined,
                    }));
                }
                this._loadedTabs.add('sessions');
            } catch(e){ warn('sessions (for subjects)', e); }
        }

        // ── sessions (full history) ──────────────────────────────────────────
        // Used by: log, weekly, dashboard heatmap / week graph.
        // Re-fetched every time the log tab opens (sessions grow with each log).
        if (tab === 'log' || tab === 'weekly' || tab === 'coach') {
            try {
                const { data: sessions, error } = await DB.sessions.getAll(userId);
                if (error) throw error;
                if (sessions) {
                    this.state.sessions = sessions.map(s => ({
                        ...s,
                        timeSpent:  s.time_spent  ?? s.timeSpent  ?? 0,
                        subjectId:  s.subject_id  ?? s.subjectId  ?? '',
                        chapterId:  s.chapter_id  ?? s.chapterId  ?? '',
                        createdAt:  s.created_at  ?? s.createdAt  ?? Date.now(),
                        time_spent:  undefined,
                        subject_id:  undefined,
                        chapter_id:  undefined,
                        created_at:  undefined,
                    }));
                }
                this._loadedTabs.add('sessions');
            } catch(e){ warn('sessions', e); }
        }

        // ── tasks (today only) ───────────────────────────────────────────────
        // Date-scoped — always re-fetch so yesterday→today transitions work.
        if (tab === 'tasks') {
            try {
                const { data: tasks, error } = await DB.tasks.getByDate(userId, this.today());
                if (error) throw error;
                // Normalize snake_case DB columns to the camelCase shape used by
                // locally-created task objects (see addTask/autoGenerateTasks) —
                // same pattern as the doubts loader below. Without this, tasks
                // loaded from Supabase carry subject_id/chapter_id while tasks
                // created this session carry subjectId/chapterId, and every
                // reader has to defensively check both.
                if (tasks) this.state.tasks = tasks.map(t => ({
                    ...t,
                    subjectId: t.subject_id ?? t.subjectId ?? null,
                    chapterId: t.chapter_id ?? t.chapterId ?? null,
                }));
            } catch(e){ warn('tasks', e); }
        }

        // ── doubts ───────────────────────────────────────────────────────────
        if (tab === 'doubts' && !this._loadedTabs.has('doubts')) {
            try {
                const { data: doubts, error } = await DB.doubts.getAll(userId);
                if (error) throw error;
                if (doubts) this.state.doubts = doubts.map(d => ({
                    ...d,
                    text:         d.question      ?? d.text,
                    subjectId:    d.subject_id    ?? d.subjectId,
                    createdAt:    d.created_at    ?? d.createdAt    ?? Date.now(),
                    resolvedDate: d.resolved_date ?? d.resolvedDate ?? null,
                    question:      undefined,
                    subject_id:    undefined,
                    created_at:    undefined,
                    resolved_date: undefined,
                }));
                this._loadedTabs.add('doubts');
            } catch(e){ warn('doubts', e); }
        }

        // ── exam scores ──────────────────────────────────────────────────────
        if (tab === 'exams' && !this._loadedTabs.has('exams')) {
            try {
                const { data: examScores, error } = await DB.examScores.getAll(userId);
                if (error) throw error;
                if (examScores) {
                    this.state.examScores = examScores.map(s => ({
                        ...s,
                        subjectId:  s.subject_id ?? s.subjectId,
                        createdAt:  s.created_at ?? s.createdAt ?? Date.now(),
                        subject_id:  undefined,
                        created_at:  undefined,
                    }));
                }
                this._loadedTabs.add('exams');
            } catch(e){ warn('examScores', e); }
        }

        // ── notes ────────────────────────────────────────────────────────────
        if (tab === 'notes' && !this._loadedTabs.has('notes')) {
            try {
                const { data: notes, error } = await DB.notes.getAll(userId);
                if (error) throw error;
                if (notes) this.state.notes = notes.map(n => ({
                    ...n,
                    subjectId:  n.subject_id  ?? n.subjectId,
                    createdAt:  n.created_at  ?? n.createdAt  ?? Date.now(),
                    updatedAt:  n.updated_at  ?? n.updatedAt  ?? Date.now(),
                    subject_id:  undefined,
                    created_at:  undefined,
                    updated_at:  undefined,
                }));
                this._loadedTabs.add('notes');
            } catch(e){ warn('notes', e); }
        }

        // ── resources ────────────────────────────────────────────────────────
        if (tab === 'resources' && !this._loadedTabs.has('resources')) {
            try {
                const { data: resources, error } = await DB.resources.getAll(userId);
                if (error) throw error;
                if (resources) this.state.resources = resources.map(r => ({
                    ...r,
                    subjectId:  r.subject_id ?? r.subjectId,
                    createdAt:  r.created_at ?? r.createdAt ?? Date.now(),
                    subject_id:  undefined,
                    created_at:  undefined,
                }));
                this._loadedTabs.add('resources');
            } catch(e){ warn('resources', e); }
        }

        // ── badges ───────────────────────────────────────────────────────────
        if (tab === 'rewards' && !this._loadedTabs.has('badges')) {
            try {
                const { data: badges, error } = await DB.badges.getAll(userId);
                if (error) throw error;
                if (badges && badges.length > 0) {
                    this.state.earnedBadges = badges.map(b => b.badge_id);
                }
                this._loadedTabs.add('badges');
            } catch(e){ warn('badges', e); }
        }

        // ── checkins (all history — needed for the EOD widget) ───────────────
        // Loaded on first coach/checkin access; the EOD banner only needs
        // today's entry which arrives via checkins.get() in saveEodCheckin.
        if (tab === 'coach' && !this._loadedTabs.has('checkins')) {
            try {
                const { data: checkinRows, error } = await window.supabase
                    .from('checkins').select('*').eq('user_id', userId);
                if (error) throw error;
                if (checkinRows) {
                    const obj = {};
                    checkinRows.forEach(c => {
                        obj[c.date] = {
                            understood: c.understood || '',
                            unclear:    c.unclear    || '',
                            date:       c.date,
                            createdAt:  c.created_at ? new Date(c.created_at).getTime() : Date.now(),
                        };
                    });
                    this.state.checkins = obj;
                }
                this._loadedTabs.add('checkins');
            } catch(e){ warn('checkins', e); }
        }

        // ── quiz progress (all subjects) ─────────────────────────────────────
        if (tab === 'quiz' && !this._loadedTabs.has('quiz')) {
            try {
                const { data: quizRows, error } = await window.supabase
                    .from('quiz_progress').select('*').eq('user_id', userId);
                if (error) throw error;
                if (quizRows && quizRows.length > 0) {
                    const qd = {};
                    quizRows.forEach(r => {
                        if (r.data) { try { qd[r.subject_id] = JSON.parse(r.data); } catch(e){} }
                    });
                    if (Object.keys(qd).length > 0) this.state.quizData = qd;
                }
                this._loadedTabs.add('quiz');
            } catch(e){ warn('quiz', e); }
        }

        // ── circles (study groups + streak/leaderboard data) ─────────────────
        // Intentionally NOT guarded by _loadedTabs — unlike subjects/doubts/etc,
        // circle membership and each member's streak/leaderboard standing can
        // change from OTHER users' actions (not just this user's), so a
        // once-per-session cache would show stale data on repeat visits.
        // Re-fetches on every navigation to this tab instead.
        if (tab === 'circles') {
            try {
                const { data: circles, error } = await DB.circles.getMine(userId);
                if (error) throw error;
                if (circles) this.state.circles = circles;
            } catch(e){ warn('circles', e); }
        }
    },

    // ── localStorage: UI state + local-only state ────────────────────────────
    // Source of truth for: theme, currentPage, selectedSubjectFilter, stopwatch,
    // pomodoroSettings, quizData, exercises, dailyChallenges, weeklyPlan,
    // checkins, earnedBadges, streakFreezes, profile.xp/level/streak/mood
    // (anything not yet written through to Supabase).
    load(){
        try{
            const d=localStorage.getItem('studyos_ui');
            if(d){
                const p=JSON.parse(d);
                // Only restore keys that live in localStorage.
                // Supabase-owned keys (subjects, sessions, tasks, etc.) are NOT merged here —
                // they will be overwritten by loadFromSupabase() immediately after.
                // Restore safe UI keys
                // Only restore pure UI state — everything else comes from Supabase
                const UI_KEYS=['selectedSubjectFilter','theme','autoTheme','stopwatch'];
                UI_KEYS.forEach(k=>{ if(p[k]!==undefined) this.state[k]=p[k]; });
            }
        }catch(e){console.error('[StudyOS] load():', e)}
    },

    save(){
        // localStorage holds ONLY pure UI state — nothing that needs to survive
        // a browser data wipe. All user data lives in Supabase.
        try{
            const payload={
                currentPage:           this.state.currentPage,
                selectedSubjectFilter: this.state.selectedSubjectFilter,
                theme:                 this.state.theme,
                autoTheme:             this.state.autoTheme,
                stopwatch:             this.state.stopwatch,
            };
            localStorage.setItem('studyos_ui', JSON.stringify(payload));
        }catch(e){console.error('[StudyOS] save():', e)}
        this.updateTopbarPills();
    },

    // ── Sync full profile to Supabase (all fields) ─────────────────────────
    _syncFullProfile(){
        const uid = window._supabaseUserId; if(!uid) return;
        const p = this.state.profile;
        DB.profile.update(uid, {
            name:                    p.name,
            exam_date:               p.examDate || null,
            daily_goal_minutes:      p.dailyGoalMinutes,
            target_score:            p.targetScore,
            xp:                      p.xp,
            level:                   p.level,
            streak:                  p.streak,
            last_study_date:         p.lastStudyDate || null,
            max_daily_minutes:       p.maxDailyMinutes,
            pomodoro_completed:      p.pomodoroCompleted || 0,
            mood:                    p.mood || null,
            mood_history:            JSON.stringify(p.moodHistory || []),
            streak_freezes:          this.state.streakFreezes,
            last_freeze_used_date:   this.state.lastFreezeUsedDate || null,
            last_freeze_earned_date: this.state.lastFreezeEarnedDate || null,
            pending_freeze_notice:   this.state.pendingFreezeNotice || false,
            pomodoro_settings:       JSON.stringify(this.state.pomodoroSettings || {}),
            selected_class:          this.state.profile.selectedClass || 10,
            selected_stream:         this.state.profile.selectedStream || null,
        }).then(({error})=>{ if(error) console.error('[DB] _syncFullProfile:', error); });
    },

    // ── PRIORITY 5: Goal hit banner ───────────────────────
    showGoalHitBanner(){
        const b=document.getElementById('goal-hit-banner');
        if(!b||this._goalShownToday===this.today())return;
        this._goalShownToday=this.today();
        b.classList.add('show');
        setTimeout(()=>b.classList.remove('show'),3500);
    },

    // ── PRIORITY 6: FAB controls ─────────────────────────
    toggleFab(){
        const menu=document.getElementById('fab-menu');
        const backdrop=document.getElementById('fab-backdrop');
        const btn=document.getElementById('fab-btn');
        const isOpen=menu.classList.contains('open');
        menu.classList.toggle('open',!isOpen);
        backdrop.classList.toggle('open',!isOpen);
        btn.textContent=isOpen?'＋':'✕';
        btn.style.transform=isOpen?'':'rotate(45deg)';
    },
    closeFab(){
        document.getElementById('fab-menu').classList.remove('open');
        document.getElementById('fab-backdrop').classList.remove('open');
        const btn=document.getElementById('fab-btn');
        btn.textContent='＋';btn.style.transform='';
    },

    // ── PRIORITY 7: Streak reminder ──────────────────────
    checkStreakReminder(){
        const h=new Date().getHours();
        const streak=this.state.profile.streak||0;
        const studiedToday=this.getTodayMinutes()>0;
        const dismissedToday=localStorage.getItem('sr_dismissed')===this.today();
        // Always auto-hide if already studied or dismissed
        if(studiedToday||dismissedToday){this.dismissStreakReminder(false);return;}
        // Only show between 8pm-11pm, streak exists
        if(h>=20&&h<23&&streak>0){
            const msg=document.getElementById('streak-reminder-msg');
            if(msg)msg.textContent=`Your ${streak}-day streak ends tonight!`;
            const r=document.getElementById('streak-reminder');
            if(r&&!r.classList.contains('show')){
                r.classList.add('show');
                clearTimeout(this._streakTimer);
                this._streakTimer=setTimeout(()=>this.dismissStreakReminder(false),8000);
            }
        }
    },
    dismissStreakReminder(persist=true){
        const r=document.getElementById('streak-reminder');
        if(r)r.classList.remove('show');
        if(persist)localStorage.setItem('sr_dismissed',this.today());
        clearTimeout(this._streakTimer);
    },
    // STREAK FREEZE — dismiss the one-time freeze-used banner
    dismissFreezeNotice(){
        this.state.pendingFreezeNotice=false;
        this._syncFullProfile();
        const banner=document.getElementById('freeze-notice-banner');
        if(banner)banner.remove();
    },

    // ── P1-1: End-of-day check-in ────────────────────────────
    checkEodCheckin(){
        // The dashboard renders its own inline check-in card (see renderDashboard's
        // eodCardHTML), so this fixed banner would double up with it. Only show
        // the fixed banner on non-dashboard pages, where the inline card doesn't exist.
        if(this.state.currentPage==='dashboard')return;
        const h=new Date().getHours();
        if(h<20)return;// only 8PM+
        const dismissedToday=localStorage.getItem('eod_dismissed')===this.today();
        const savedToday=!!(this.state.checkins&&this.state.checkins[this.today()]);
        if(dismissedToday||savedToday)return;
        const b=document.getElementById('eod-checkin');
        if(b&&!b.classList.contains('show'))b.classList.add('show');
    },
    dismissEodCheckin(){
        const b=document.getElementById('eod-checkin');
        if(b)b.classList.remove('show');
        localStorage.setItem('eod_dismissed',this.today());
    },
    saveEodCheckin(){
        const understood=document.getElementById('eod-understood')?.value.trim()||'';
        const unclear=document.getElementById('eod-unclear')?.value.trim()||'';
        if(!understood&&!unclear){this.toast('Add at least one entry','warning');return}
        if(!this.state.checkins)this.state.checkins={};
        this.state.checkins[this.today()]={understood,unclear,date:this.today(),createdAt:Date.now()};
        const _ciUid=window._supabaseUserId;
        if(_ciUid)DB.checkins.upsert(_ciUid,this.today(),{understood,unclear}).then(({error})=>{if(error)console.error('[DB] checkin upsert:',error);});
        this.dismissEodCheckin();
        this.toast('Check-in saved!','success');
    },

    // Inline dashboard check-in — reads from the db-eod-* inputs (not the fixed banner).
    // After saving, re-renders just the dashboard so the card flips to the "saved" view.
    saveEodCheckinInline(){
        const understood=document.getElementById('db-eod-understood')?.value.trim()||'';
        const unclear=document.getElementById('db-eod-unclear')?.value.trim()||'';
        if(!understood&&!unclear){this.toast('Add at least one entry','warning');return}
        if(!this.state.checkins)this.state.checkins={};
        this.state.checkins[this.today()]={understood,unclear,date:this.today(),createdAt:Date.now()};
        const _ciUid=window._supabaseUserId;
        if(_ciUid)DB.checkins.upsert(_ciUid,this.today(),{understood,unclear}).then(({error})=>{if(error)console.error('[DB] checkin upsert:',error);});
        this.save();
        hapticsVibrate('light');
        this.toast('Check-in saved! ✅','success');
        // Re-render dashboard so card switches to the read-only "saved" view
        this.renderDashboard();
    },

    toggleSidebar(){
        const s=document.getElementById('sidebar');
        if(s.classList.contains('open'))this.closeSidebar();
        else this.openSidebar();
    },
    openSidebar(){
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebar-backdrop').classList.add('open');
        document.body.classList.add('sidebar-open');
    },
    closeSidebar(){
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-backdrop').classList.remove('open');
        document.body.classList.remove('sidebar-open');
    },

    applyTheme(){document.documentElement.setAttribute('data-theme',this.state.theme)},

    toggleTheme(theme){
        if(theme){this.state.theme=theme}
        else{const themes=['dark','light','warm-dark'];const ci=themes.indexOf(this.state.theme);this.state.theme=themes[(ci+1)%themes.length]}
        this.state.autoTheme=false;this.applyTheme();this.save();this._syncProfileField({theme:this.state.theme});
        const labels={dark:'Dark mode',light:'Light mode','warm-dark':'🌅 Warm dark mode'};
        this.toast(labels[this.state.theme]||'Theme changed','info');
        if(this.state.currentPage==='settings')this.renderSettings();
    },
    autoThemeCheck(){
        const h=new Date().getHours();
        const newTheme=(h>=7&&h<19)?'light':'dark';
        if(this.state.theme!==newTheme){this.state.theme=newTheme;this.applyTheme();this.save()}
    },
    toggleAutoTheme(){
        this.state.autoTheme=!this.state.autoTheme;
        if(this.state.autoTheme)this.autoThemeCheck();
        this.save();this.toast(this.state.autoTheme?'🕐 Auto theme enabled':'🕐 Auto theme disabled','info');
        if(this.state.currentPage==='settings')this.renderSettings();
    },

    uid(){return Date.now().toString(36)+Math.random().toString(36).substr(2,5)},
    // IMPORTANT: Must use local time, NOT toISOString() (UTC).
    // toISOString() is UTC — for IST users (UTC+5:30) it returns yesterday's
    // date until 5:30 AM local time, breaking session filtering and streaks.
    // 'en-CA' locale gives YYYY-MM-DD format in local time, same as session.date.
    today(){return new Date().toLocaleDateString('en-CA')},
    // Canonical way to turn any Date object into a YYYY-MM-DD string that matches
    // this.today() and session.date. NEVER use date.toISOString().split('T')[0]
    // anywhere in this file — that's UTC and will silently desync from every
    // date string produced by today(), which is local (en-CA). Use this instead.
    localDateStr(date){return date.toLocaleDateString('en-CA')},
    daysBetween(d1,d2){return Math.floor((new Date(d2)-new Date(d1))/864e5)},
    formatMin(m){const h=Math.floor(m/60),min=m%60;return h>0?`${h}h ${min}m`:`${min}m`},
    formatSec(s){const m=Math.floor(s/60),sec=s%60;return`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`},
    fmtShort(ds){return ds?new Date(ds+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):null},
    getAllChapters(){const c=[];this.state.subjects.forEach(s=>s.chapters.forEach(ch=>c.push({...ch,subjectName:s.name,subjectColor:s.color,subjectIcon:this.renderSubjectIcon(s,16),subjectGlyph:this.getSubjectGlyph(s),subjectId:s.id})));return c},
    getSubjectById(id){return this.state.subjects.find(s=>s.id===id)},
    getChapter(sId,cId){const s=this.getSubjectById(sId);return s?s.chapters.find(c=>c.id===cId):null},
    // Auto-detect icon type from subject name (no-emoji design system)
    getIconType(name){
        if(!name) return 'custom';
        const n=name.trim().toLowerCase();
        if(/math/.test(n)) return 'math';
        if(/science|physic|chemistry|biolog/.test(n)) return 'science';
        if(/english/.test(n)) return 'english';
        if(/social|history|geography|civics|polity|economics/.test(n)) return 'social';
        if(/hindi|sanskrit/.test(n)) return 'hindi';
        return 'custom';
    },
    // Render a themed SVG icon for a subject. Falls back to initial-letter square
    // if iconType is missing/unrecognized (e.g. pre-migration data not yet backfilled).
    renderSubjectIcon(subject,size){
        size=size||18;
        const color=(subject&&subject.color)||'#6366f1';
        const type=(subject&&subject.iconType)||this.getIconType(subject&&subject.name);
        const common=`width="${size}" height="${size}" viewBox="0 0 24 24" style="flex-shrink:0;vertical-align:-3px"`;
        // Path-based icons below are verbatim path data from lucide-static (ISC license),
        // chosen so all share viewBox/stroke-width and none reads smaller/weaker than another.
        const stroke=`fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
        switch(type){
            case 'math': // lucide: sigma
                return `<svg ${common} ${stroke}><path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/></svg>`;
            case 'science': // lucide: flask-conical
                return `<svg ${common} ${stroke}><path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/><path d="M6.453 15h11.094"/><path d="M8.5 2h7"/></svg>`;
            case 'english': // lucide: book-open
                return `<svg ${common} ${stroke}><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`;
            case 'social': // lucide: globe
                return `<svg ${common} ${stroke}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
            case 'hindi':
                // No Devanagari glyph exists in Lucide. 17px/800 still read as visibly
                // smaller/thinner than the 2px-stroke icons (confirmed against rendered
                // screenshot) — pushed further to 21px/900 and nudged baseline down.
                return `<svg ${common}><text x="12" y="18" text-anchor="middle" font-size="21" font-weight="900" fill="${color}">ह</text></svg>`;
            case 'custom':
            default:{
                const letter=((subject&&subject.name)||'?').trim().charAt(0).toUpperCase()||'?';
                return `<svg ${common}><rect x="2" y="2" width="20" height="20" rx="5" fill="${color}22" stroke="${color}" stroke-width="1.5"/><text x="12" y="16.5" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${letter}</text></svg>`;
            }
        }
    },
    // Plain-text glyph fallback for contexts where HTML/SVG can't render
    // (e.g. <option> elements, toast strings, AI prompt text). Returns a
    // single Unicode character representative of the icon type — not the
    // old emoji, just a neutral symbol that keeps text-only UI scannable.
    getSubjectGlyph(subject){
        const type=(subject&&subject.iconType)||this.getIconType(subject&&subject.name);
        const glyphs={math:'Σ',science:'⚗',english:'❧',social:'◎',hindi:'ह'};
        if(glyphs[type]) return glyphs[type];
        return ((subject&&subject.name)||'?').trim().charAt(0).toUpperCase()||'?';
    },
    getTodaySessions(){return this.state.sessions.filter(s=>s.date===this.today())},
    getTodayMinutes(){return this.getTodaySessions().reduce((a,s)=>a+s.timeSpent,0)},
    // Must use local date (en-CA = YYYY-MM-DD) — sessions are stored in local time.
    // toISOString() is UTC and causes IST users (UTC+5:30) to get wrong dates.
    getWeekSessions(){const n=new Date(),w=[];for(let i=6;i>=0;i--){const d=new Date(n);d.setDate(d.getDate()-i);w.push(d.toLocaleDateString('en-CA'))}return{days:w,sessions:this.state.sessions.filter(s=>w.includes(s.date))}},
    getCompletedCount(){return this.getAllChapters().filter(c=>c.status==='completed'||c.status==='revised').length},
    getTotalChapters(){return this.getAllChapters().length},
    getOverdueChapters(){const t=this.today();return this.getAllChapters().filter(c=>c.deadline&&c.deadline<t&&c.status!=='completed'&&c.status!=='revised')},
    getRevisionsDue(){const t=new Date(),r=[];this.getAllChapters().forEach(ch=>{if(ch.status==='completed'||ch.status==='revised'){const lr=(ch.revisionDates||[]).length>0?new Date((ch.revisionDates||[])[((ch.revisionDates||[]).length-1)]):(ch.completionDate?new Date(ch.completionDate):null);if(lr){const ds=Math.floor((t-lr)/864e5),iv=[1,3,7,14,30],ni=iv[Math.min(ch.revisionCount,iv.length-1)];if(ds>=ni)r.push({...ch,daysSince:ds,nextInterval:ni})}}});return r},
    // Per-chapter SRS due-date calc, reusing the same [1,3,7,14,30] table as getRevisionsDue.
    // Unlike getRevisionsDue (which only returns chapters that ARE due), this returns the
    // due date regardless of state, for display purposes (e.g. "Due Jun 20" vs "Overdue 2d").
    getNextRevisionInfo(ch){
        if(!ch||(ch.status!=='completed'&&ch.status!=='revised'))return null;
        const dates=ch.revisionDates||[];
        const anchor=dates.length>0?dates[dates.length-1]:ch.completionDate;
        if(!anchor)return null;
        const iv=[1,3,7,14,30],ni=iv[Math.min(ch.revisionCount||0,iv.length-1)];
        const anchorDate=new Date(anchor+'T12:00');
        const dueDate=new Date(anchorDate);dueDate.setDate(dueDate.getDate()+ni);
        const today=new Date(this.today()+'T12:00');
        const daysUntil=Math.round((dueDate-today)/864e5);
        return{dueDate:this.localDateStr(dueDate),isDue:daysUntil<=0,daysUntil};
    },

    getReadinessScore(){
        const total=this.getTotalChapters();if(!total)return 0;
        const comp=this.getCompletedCount()/total*40;
        const revCh=this.getAllChapters().filter(c=>c.revisionCount>0).length;
        const rev=total>0?(revCh/total)*20:0;
        const streak=Math.min(this.state.profile.streak/14,1)*15;
        const avgScore=this.state.examScores.length>0?this.state.examScores.reduce((a,e)=>a+(e.scored/e.total*100),0)/this.state.examScores.length:0;
        const score=avgScore/100*15;
        const unresolvedDoubts=this.state.doubts.filter(d=>d.status==='unresolved').length;
        const doubtPenalty=Math.min(unresolvedDoubts*2,10);
        return Math.min(100,Math.max(0,Math.round(comp+rev+streak+score-doubtPenalty)));
    },
    getDaysToExam(){if(!this.state.profile.examDate)return null;return this.daysBetween(this.today(),this.state.profile.examDate)},

    // P2-1: Subject health score 0–100
    computeSubjectHealth(s){
        if(!s||!s.chapters||s.chapters.length===0)return 0;
        // Component 1: % complete (max 50pts)
        const done=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
        const compScore=(done/s.chapters.length)*50;
        // Component 2: avg confidence across sessions for this subject (max 30pts)
        const subSessions=this.state.sessions.filter(ss=>ss.subjectId===s.id&&ss.confidence);
        let confScore=0;
        if(subSessions.length>0){
            const avgConf=subSessions.reduce((a,ss)=>a+ss.confidence,0)/subSessions.length;
            confScore=(avgConf/4)*30;// 4 is max confidence
        }else{
            confScore=15;// neutral if no data
        }
        // Component 3: revision frequency — what % of completed chapters have been revised (max 20pts)
        const completedChs=s.chapters.filter(c=>c.status==='completed'||c.status==='revised');
        const revisedChs=completedChs.filter(c=>c.revisionCount>0);
        const revScore=completedChs.length>0?(revisedChs.length/completedChs.length)*20:0;
        return Math.round(compScore+confScore+revScore);
    },
    getPredictedCompletion(){
        const totalCh=this.getTotalChapters(),compCh=this.getCompletedCount();
        if(compCh===0||totalCh===0)return null;
        // Use _activeDays (unique days with at least one session) for accurate pace.
        // Calendar days since signup unfairly penalises students who took breaks —
        // e.g. signed up 87 days ago but only studied 20 days → real pace is
        // 5/20 = 0.25 ch/day, not 5/87 = 0.057 ch/day.
        // _activeDays is fetched during bootstrap; fall back to calendar days if unavailable.
        const activeDays=this._activeDays||null;
        if(!activeDays){
            const firstSession=this._firstSessionDate||(this.state.sessions.length>0?this.state.sessions[0].date:null);
            if(!firstSession)return null;
        }
        const daysActive=Math.max(1, activeDays || this.daysBetween(this._firstSessionDate||(this.state.sessions.length>0?this.state.sessions[0].date:this.today()), this.today()));
        const rate=compCh/daysActive;
        if(rate<=0)return null;
        const remaining=totalCh-compCh;
        const daysNeeded=Math.ceil(remaining/rate);
        const predDate=new Date();predDate.setDate(predDate.getDate()+daysNeeded);
        return{date:this.localDateStr(predDate),daysNeeded,rate:Math.round(rate*10)/10};
    },

    // STREAK
    // STREAK FREEZE — updateStreak now runs the full freeze pipeline on load
    updateStreak(){
        const t=this.today(),l=this.state.profile.lastStudyDate;
        if(!l)return; // never studied — no streak to drop, no freeze needed

        // STEP 1: Calculate what streak SHOULD be (existing logic)
        const yesterdayStreak=this.state.profile.streak||0;
        if(this.daysBetween(l,t)>1){
            this.state.profile.streak=0;
        }
        const newStreak=this.state.profile.streak;

        // STEP 2 + 3: Freeze auto-apply — only if streak just dropped to 0
        // STREAK FREEZE
        if(
            newStreak===0 &&
            yesterdayStreak>0 &&
            this.state.streakFreezes>0 &&
            this.state.lastFreezeUsedDate!==t
        ){
            // Consume freeze and restore streak
            this.state.streakFreezes=Math.max(0,this.state.streakFreezes-1);
            this.state.lastFreezeUsedDate=t;
            this.state.profile.streak=yesterdayStreak;
            this.state.pendingFreezeNotice=true;
        }

        // STEP 4: Sync to Supabase
        this._syncFullProfile();

        // Freeze earn check — after freeze is applied, on multiples of 7
        // STREAK FREEZE
        const finalStreak=this.state.profile.streak;
        if(finalStreak>0&&finalStreak%7===0&&this.state.lastFreezeEarnedDate!==t){
            this.state.lastFreezeEarnedDate=t;
            if(this.state.streakFreezes<3){
                this.state.streakFreezes=Math.min(3,this.state.streakFreezes+1);
                this._syncFullProfile();
                // NOTE: no hapticsVibrate here — updateStreak() runs unconditionally
                // on every app boot (see call site + comment above), with no user
                // gesture preceding it. navigator.vibrate() requires a prior tap;
                // calling it here just triggers a blocked-by-browser console warning
                // and never actually buzzes. The toast alone communicates this fine.
                setTimeout(()=>{this.toast(`🧊 Streak freeze earned! You now have ${this.state.streakFreezes} freeze${this.state.streakFreezes!==1?'s':''}.`,'info')},800);
            }else{
                this._syncFullProfile();
                setTimeout(()=>this.toast(`🔥 Streak milestone! Max freezes reached.`,'info'),800);
            }
        }
    },
    // LOG VALIDATION — streakEligible param: true = count toward streak, false = neutral (save only)
    recordStudyDay(streakEligible=true){
        const t=this.today(),l=this.state.profile.lastStudyDate;
        // Always mark today as studied so the day isn't treated as a "miss" by updateStreak
        // But only increment the streak counter when streakEligible === true
        if(l===t)return;
        this.state.profile.lastStudyDate=t;
        if(!streakEligible){
            // Short session — neutral. Save the date stamp so tomorrow's session
            // sees consecutive days, but do not advance the streak counter.
            this._syncFullProfile();
            return;
        }
        const prevStreak=this.state.profile.streak||0;
        if(l&&this.daysBetween(l,t)===1)this.state.profile.streak++;
        else this.state.profile.streak=1;
        this._syncFullProfile();
        // ── Streak milestone celebration ──
        const newStreak=this.state.profile.streak;
        const MILESTONES=[3,7,14,21,30,50,100];
        if(MILESTONES.includes(newStreak)&&!MILESTONES.includes(prevStreak)){
            setTimeout(()=>{
                hapticsVibrate('streak');
                this.celebrate();
                const luIcon=document.querySelector('#level-up .lu-icon');if(luIcon)luIcon.textContent='↑';
                document.getElementById('lu-text').textContent=`${newStreak}-day streak!`;
                document.getElementById('lu-sub').textContent=`You've studied ${newStreak} days in a row. Boards don't stand a chance.`;
                document.getElementById('level-up').classList.add('show');
                this.addXP(50,`${newStreak}-day streak milestone!`);
                if(window.Notifications)Notifications.send('streak',`${newStreak}-day streak!`,`You've studied ${newStreak} days in a row. Keep going!`,'rewards');
            },700);
        }
        // BUG FIX: Freeze earning removed from here — duplicate with updateStreak().
        // updateStreak() always runs on the next app load after a session is saved
        // and will catch the milestone correctly. Keeping it here caused 2 freezes
        // to be awarded on milestone days (day 7, 14, 21...).
    },

    // ── STREAK MODAL ─────────────────────────────────────────────────────
    // NOTE: "Best streak" has no persisted field in profile/Supabase today
    // (only current streak is tracked). We compute it client-side from
    // state.sessions as a best-effort longest-run estimate — accurate once
    // session history is loaded, but not a true historical high if sessions
    // predate this feature or get pruned. A real persisted best_streak would
    // need a new Supabase column + _syncFullProfile field — flag if wanted.
    async openStreakModal(){
        this.openModal('modal-streak');
        const body=document.getElementById('streak-modal-body');
        body.innerHTML='<div class="streak-empty-hint">Loading…</div>';

        // state.sessions is lazy-loaded per-tab (subjects/log/weekly/coach only).
        // If none of those tabs have been visited yet, fetch full history now
        // so the calendar + recent list aren't silently empty/wrong.
        if(!this._loadedTabs?.has('sessions')){
            const userId=window._supabaseUserId;
            if(userId){
                try{
                    const{data:sessions,error}=await DB.sessions.getAll(userId);
                    if(error)throw error;
                    if(sessions){
                        this.state.sessions=sessions.map(s=>({
                            ...s,
                            timeSpent:  s.time_spent  ?? s.timeSpent  ?? 0,
                            subjectId:  s.subject_id  ?? s.subjectId  ?? '',
                            chapterId:  s.chapter_id  ?? s.chapterId  ?? '',
                            createdAt:  s.created_at  ?? s.createdAt  ?? Date.now(),
                            time_spent:  undefined,
                            subject_id:  undefined,
                            chapter_id:  undefined,
                            created_at:  undefined,
                        }));
                    }
                    this._loadedTabs?.add('sessions');
                }catch(e){console.error('[StudyOS] openStreakModal sessions fetch:',e)}
            }
        }
        this.renderStreakModal();
    },

    renderStreakModal(){
        const body=document.getElementById('streak-modal-body');
        if(!body)return;
        const sessions=this.state.sessions||[];
        const studiedDates=new Set(sessions.map(s=>s.date).filter(Boolean));

        // ── Stats ──
        const currentStreak=this.state.profile.streak||0;
        const bestStreak=this._calcBestStreak(studiedDates,currentStreak);
        const daysStudied=this._activeDays||studiedDates.size||0;
        const firstSession=this._firstSessionDate||(sessions.length>0?[...sessions].sort((a,b)=>a.date.localeCompare(b.date))[0].date:null);
        const daysSinceFirst=firstSession?Math.max(1,this.daysBetween(firstSession,this.today())+1):1;
        const consistency=firstSession?Math.min(100,Math.round((daysStudied/daysSinceFirst)*100)):0;

        // ── Freeze slots ──
        const freezes=this.state.streakFreezes||0;
        const freezeSlots=Array.from({length:3},(_,i)=>i<freezes);

        // ── Calendar ──
        const calHtml=this._buildStreakCalendar(studiedDates);

        // ── Recent sessions (last 5) ──
        const recent=[...sessions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')||(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
        const recentHtml=recent.length===0?'<div class="streak-empty-hint">No sessions logged yet.</div>':recent.map(s=>{
            const d=new Date(s.date+'T00:00:00');
            const dLabel=isNaN(d)?'—':d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
            const isFrozenDay=this.state.lastFreezeUsedDate===s.date;
            if(isFrozenDay){
                return `<div class="streak-session-row"><span class="streak-session-date">${dLabel}</span><span class="streak-session-main frozen-note">🧊 Freeze used · streak protected</span></div>`;
            }
            const ch=this.getChapter(s.subjectId,s.chapterId);
            const subj=this.getSubjectById(s.subjectId);
            const chapterName=ch?ch.name:'—';
            const subjectLabel=subj?`${this.renderSubjectIcon(subj,14)} ${subj.name}`:'—';
            return `<div class="streak-session-row"><span class="streak-session-date">${dLabel}</span><span class="streak-session-main">${chapterName} · ${subjectLabel}</span><span class="streak-session-dur">${this.formatMin(s.timeSpent||0)}</span></div>`;
        }).join('');

        body.innerHTML=`
            <div class="streak-stats-row">
                <div class="streak-stat-card"><div class="streak-stat-val">${currentStreak}</div><div class="streak-stat-label">Current Streak</div></div>
                <div class="streak-stat-card"><div class="streak-stat-val">${bestStreak}</div><div class="streak-stat-label">Best Streak</div></div>
                <div class="streak-stat-card"><div class="streak-stat-val">${consistency}%</div><div class="streak-stat-label">Consistency</div></div>
            </div>
            <div class="streak-section">
                <div class="streak-section-title">Freeze Slots</div>
                <div class="streak-freeze-row">${freezeSlots.map(f=>`<div class="streak-freeze-slot ${f?'filled':''}">${f?'🧊':''}</div>`).join('')}</div>
                <div class="streak-freeze-hint">Earn a freeze at each 7-day streak.</div>
            </div>
            <div class="streak-section">
                <div class="streak-section-title">${new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
                <div class="streak-calendar-grid">${calHtml}</div>
            </div>
            <div class="streak-section">
                <div class="streak-section-title">Recent Sessions</div>
                ${recentHtml}
            </div>
        `;
    },

    // ── BOARD COUNTDOWN MODAL — opened from the topbar "Xd" exam pill ──────
    // Deliberately does NOT duplicate the dashboard's Board Readiness card;
    // it answers a different question ("what does this countdown *mean* for
    // my plan?") by putting the predicted-finish-vs-exam-date comparison front
    // and center instead of as a footnote. Reuses existing getters — no new
    // scoring/prediction logic lives here, presentation only.
    openReadinessModal(){
        this.openModal('modal-readiness');
        this.renderReadinessModal();
    },
    renderReadinessModal(){
        const body=document.getElementById('readiness-modal-body');
        if(!body)return;
        const dte=this.getDaysToExam();
        const examDate=this.state.profile.examDate;

        if(dte===null||!examDate){
            body.innerHTML=`<div class="streak-empty-hint">No board exam date set yet.</div>
                <button class="btn btn-primary" style="width:100%;margin-top:14px" onclick="App.closeModal('modal-readiness');App.navigate('settings')">Set Exam Date →</button>`;
            return;
        }

        const rs=this.getReadinessScore();
        const pred=this.getPredictedCompletion();
        const comp=this.getCompletedCount(),tot=this.getTotalChapters();
        const examDateLabel=new Date(examDate+'T12:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

        // ── Pace verdict: compares predicted finish date against the exam date ──
        // This is the one genuinely new insight this modal surfaces — the
        // dashboard's readiness card mentions predicted finish as a small
        // footnote line; here it's the headline.
        let paceVerdictHTML='';
        if(pred){
            const predDate=new Date(pred.date+'T12:00');
            const examDateObj=new Date(examDate+'T12:00');
            const spareDays=Math.round((examDateObj-predDate)/86400000);
            if(spareDays>=0){
                paceVerdictHTML=`<div class="streak-section-title">Pace Check</div>
                    <p style="font-size:.85rem;color:var(--text-secondary);line-height:1.6;margin-bottom:0">At your current pace of <strong style="color:var(--text-primary)">${pred.rate} ch/day</strong>, you're on track to finish around <strong style="color:var(--text-success)">${pred.date}</strong> — about ${spareDays} day${spareDays!==1?'s':''} to spare before your exam. 🌱</p>`;
            }else{
                paceVerdictHTML=`<div class="streak-section-title">Pace Check</div>
                    <p style="font-size:.85rem;color:var(--text-secondary);line-height:1.6;margin-bottom:0">At your current pace of <strong style="color:var(--text-primary)">${pred.rate} ch/day</strong>, you're projected to finish around <strong style="color:var(--text-primary)">${pred.date}</strong> — ${Math.abs(spareDays)} day${Math.abs(spareDays)!==1?'s':''} after your exam. A small pace increase now will close that gap.</p>`;
            }
        }else{
            paceVerdictHTML=`<div class="streak-section-title">Pace Check</div>
                <p style="font-size:.85rem;color:var(--text-secondary);line-height:1.6;margin-bottom:0">Log a few sessions to unlock a pace prediction for your exam.</p>`;
        }

        body.innerHTML=`
            <div class="streak-stats-row">
                <div class="streak-stat-card"><div class="streak-stat-val">${dte}</div><div class="streak-stat-label">Days Left</div></div>
                <div class="streak-stat-card"><div class="streak-stat-val">${rs}%</div><div class="streak-stat-label">Readiness</div></div>
                <div class="streak-stat-card"><div class="streak-stat-val">${comp}<span style="font-size:.75rem;font-weight:400;color:var(--text-muted)">/${tot}</span></div><div class="streak-stat-label">Chapters Done</div></div>
            </div>
            <div class="streak-section">
                <div class="streak-section-title">Exam Date</div>
                <p style="font-size:.85rem;color:var(--text-primary);font-weight:600;margin-bottom:0">${examDateLabel}</p>
            </div>
            <div class="streak-section">
                ${paceVerdictHTML}
            </div>
            <button class="btn btn-secondary" style="width:100%" onclick="App.closeModal('modal-readiness');App.navigate('settings')">Change Exam Date →</button>
        `;
    },

    // Longest run of consecutive studied dates, ending at today if the
    // current streak is active (keeps best >= current, which is always true).
    _calcBestStreak(studiedDates,currentStreak){
        if(studiedDates.size===0)return currentStreak;
        const sorted=[...studiedDates].sort();
        let best=1,run=1;
        for(let i=1;i<sorted.length;i++){
            if(this.daysBetween(sorted[i-1],sorted[i])===1)run++;
            else run=1;
            if(run>best)best=run;
        }
        return Math.max(best,currentStreak);
    },

    _buildStreakCalendar(studiedDates){
        const now=new Date();
        const year=now.getFullYear(),month=now.getMonth();
        const firstOfMonth=new Date(year,month,1);
        const daysInMonth=new Date(year,month+1,0).getDate();
        const startDow=firstOfMonth.getDay(); // 0=Sun
        // BUG FIX: this.today() uses toISOString() (UTC), which can be a full
        // day behind local time for IST users (UTC+5:30) — e.g. 1am IST on
        // the 30th is still "the 29th" in UTC. The calendar itself is built
        // entirely in local time (toLocaleDateString('en-CA')), so "today"
        // must be computed the same way or the wrong cell gets highlighted.
        const todayStr=now.toLocaleDateString('en-CA');
        const lastFreezeDate=this.state.lastFreezeUsedDate;

        // Minutes studied per date, for the hover tooltip.
        const minutesByDate={};
        (this.state.sessions||[]).forEach(s=>{
            if(!s.date)return;
            minutesByDate[s.date]=(minutesByDate[s.date]||0)+(s.timeSpent||0);
        });

        const dow=['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>`<div class="streak-cal-dow">${d}</div>`).join('');
        const leadingBlanks=Array.from({length:startDow},()=>'<div class="streak-cal-day empty"></div>').join('');

        let cells='';
        for(let day=1;day<=daysInMonth;day++){
            const dateObj=new Date(year,month,day);
            const dateStr=dateObj.toLocaleDateString('en-CA');
            let cls='streak-cal-day';
            const isFrozen=dateStr===lastFreezeDate;
            const isFuture=dateStr>todayStr;
            if(isFrozen)cls+=' frozen';
            else if(studiedDates.has(dateStr))cls+=' studied';
            else if(isFuture)cls+=' future';
            else if(dateStr<todayStr)cls+=' missed';
            if(dateStr===todayStr)cls+=' today';

            // Tooltip label
            let tip;
            if(isFrozen)tip='Freeze used · streak protected';
            else if(isFuture)tip='Upcoming';
            else if(minutesByDate[dateStr])tip=this.formatMin(minutesByDate[dateStr])+' studied';
            else tip='No study';

            cells+=`<div class="${cls}" data-tip="${tip}">${day}</div>`;
        }
        return dow+leadingBlanks+cells;
    },

    // XP
    addXP(amt,reason){const ol=this.state.profile.level;this.state.profile.xp+=amt;this.state.profile.level=Math.floor(Math.sqrt(this.state.profile.xp/50))+1;this.updateSidebar();this.toast(`+${amt} XP — ${reason}`,'xp');if(this.state.profile.level>ol)setTimeout(()=>this.showLevelUp(this.state.profile.level),600);this.checkBadges();this._syncFullProfile();},
    // Fire-and-forget profile sync helpers
    _syncProfileXP(){const _uid=window._supabaseUserId;if(!_uid)return;DB.profile.update(_uid,{xp:this.state.profile.xp,level:this.state.profile.level}).then(({error})=>{if(error)console.error('[DB] profile xp/level:',error);});},
    _syncProfileField(fields){const _uid=window._supabaseUserId;if(!_uid)return;DB.profile.update(_uid,fields).then(({error})=>{if(error)console.error('[DB] profile update:',error);});},
    _syncDailyChallenges(){const _uid=window._supabaseUserId;if(!_uid)return;const dc=this.state.dailyChallenges||{};if(!dc.date)return;DB.challenges.upsert(_uid,dc.date,{goal:JSON.stringify(dc.challenges||[]),completed:JSON.stringify(dc.completed||[])}).then(({error})=>{if(error)console.error('[DB] challenges upsert:',error);});},
    _syncWeeklyPlan(){const _uid=window._supabaseUserId;if(!_uid)return;const wp=this.state.weeklyPlan||{};DB.profile.update(_uid,{weekly_plan:JSON.stringify(wp)}).then(({error})=>{if(error)console.error('[DB] weeklyPlan update:',error);});},
    _syncQuizData(subjectId){const _uid=window._supabaseUserId;if(!_uid||!subjectId)return;const qd=this.state.quizData&&this.state.quizData[subjectId];if(!qd)return;DB.quiz.upsert(_uid,subjectId,{data:JSON.stringify(qd)}).then(({error})=>{if(error)console.error('[DB] quiz upsert:',error);});},
    _syncExercises(subjectId,chapterId){const _uid=window._supabaseUserId;if(!_uid)return;const key=subjectId+'_'+chapterId;const exData=this.state.exercises[key]||[];this.state.subjects.forEach(s=>{if(s.id===subjectId){s.chapters.forEach(ch=>{if(ch.id===chapterId&&ch._dbId){DB.chapters.update(ch._dbId||ch.id,{exercises:JSON.stringify(exData)}).then(({error})=>{if(error)console.error('[DB] exercises update:',error);});}});}});const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);const sub=this.state.subjects.find(s=>s.id===subjectId);if(sub){const ch=sub.chapters.find(c=>c.id===chapterId);if(ch&&_isUUID(ch.id)){DB.chapters.update(ch.id,{exercises:JSON.stringify(exData)}).then(({error})=>{if(error)console.error('[DB] exercises update:',error);})}}},
    xpForLevel(l){return l*l*50},
    showLevelUp(l){const luIcon=document.querySelector('#level-up .lu-icon');if(luIcon)luIcon.textContent='↑';document.getElementById('lu-text').textContent=`Level ${l}!`;document.getElementById('lu-sub').textContent=`You've reached Level ${l}!`;document.getElementById('level-up').classList.add('show');hapticsVibrate('levelUp');this.celebrate()},
    updateSidebar(){const p=this.state.profile;const sbName=document.getElementById('sb-name'),sbLevel=document.getElementById('sb-level'),sbFill=document.getElementById('sb-xp-fill'),sbText=document.getElementById('sb-xp-text');if(!sbName||!sbLevel||!sbFill||!sbText)return;sbName.textContent=p.name;sbLevel.textContent=`LVL ${p.level}`;const c=this.xpForLevel(p.level-1),n=this.xpForLevel(p.level),pct=Math.min(100,((p.xp-c)/(n-c))*100);sbFill.style.transform=`scaleX(${Math.min(1,pct/100)})`;sbText.textContent=`${p.xp-c} / ${n-c} XP`},
    updateNavBadges(){const r=this.getRevisionsDue().length,o=this.getOverdueChapters().length,ud=this.state.doubts.filter(d=>d.status==='unresolved').length;const rb=document.getElementById('rev-badge'),ob=document.getElementById('overdue-badge'),db=document.getElementById('doubt-badge');if(rb){rb.style.display=r>0?'inline':'none';rb.textContent=r;}if(ob){ob.style.display=o>0?'inline':'none';ob.textContent=o;}if(db){db.style.display=ud>0?'inline':'none';db.textContent=ud;}const qDue=this.getQuizDueSubjects().length;const qb=document.getElementById('quiz-badge');if(qb){qb.style.display=qDue>0?'inline':'none';qb.textContent=qDue;}},

    checkBadges(){const _priorBadges=new Set(this.state.earnedBadges);const s=this.getStats(),nb=[];this.BADGES.forEach(b=>{if(this.state.earnedBadges.includes(b.id))return;let e=false;switch(b.id){case'first-step':e=s.totalSessions>=1;break;case'bookworm':e=s.totalMinutes>=600;break;case'marathon':e=s.maxDailyMinutes>=240;break;case'streak-3':e=s.streak>=3;break;case'streak-7':e=s.streak>=7;break;case'streak-14':e=s.streak>=14;break;case'streak-30':e=s.streak>=30;break;case'ch-1':e=s.completedChapters>=1;break;case'ch-10':e=s.completedChapters>=10;break;case'ch-25':e=s.completedChapters>=25;break;case'ch-50':e=s.completedChapters>=50;break;case'rev-1':e=s.totalRevisions>=1;break;case'rev-10':e=s.totalRevisions>=10;break;case'sub-complete':e=s.completedSubjects>=1;break;case'level-5':e=s.level>=5;break;case'level-10':e=s.level>=10;break;case'allround':e=s.subjectsStudiedToday>=this.state.subjects.length&&this.state.subjects.length>0;break;case'perfect-week':e=s.streak>=7;break;case'pomodoro-10':e=s.pomodoroCompleted>=10;break;case'scorer-90':e=this.state.examScores.some(x=>x.scored/x.total>=0.9);break;case'task-master':e=this.state.tasks.filter(t=>t.done).length>=50;break;case'doubt-clear':e=this.state.doubts.filter(d=>d.status==='understood').length>=10;break;case'note-taker':e=(this.state.notes||[]).length>=20;break;case'resource-king':e=(this.state.resources||[]).length>=15;break}if(e){nb.push(b);this.state.earnedBadges.push(b.id)}});if(nb.length>0){const _bUid=window._supabaseUserId;if(_bUid&&this._badgesLoaded){const _newBadges=nb.filter(b=>!_priorBadges.has(b.id));_newBadges.forEach(b=>{DB.badges.add(_bUid,b.id).then(({error})=>{if(error&&!error.message?.includes('duplicate'))console.error('[DB] badge add:',error);});if(window.Notifications)Notifications.send('badge',`Badge unlocked: ${b.name}`,b.desc,'rewards');});}nb.forEach(b=>setTimeout(()=>{hapticsVibrate('levelUp');this.toast(`Badge: ${b.name}!`,'success')},800))}},

    getStats(){
        const p=this.state.profile,ac=this.getAllChapters(),ts=this.getTodaySessions(),st=new Set(ts.map(s=>s.subjectId)),tr=ac.reduce((a,c)=>a+c.revisionCount,0),cs=this.state.subjects.filter(s=>s.chapters.length>0&&s.chapters.every(c=>c.status==='completed'||c.status==='revised')).length,sbd={};this.state.sessions.forEach(s=>{sbd[s.date]=(sbd[s.date]||0)+s.timeSpent});const md=Math.max(0,...Object.values(sbd));
        return{totalSessions:this.state.sessions.length,totalMinutes:this.state.sessions.reduce((a,s)=>a+s.timeSpent,0),streak:p.streak,level:p.level,completedChapters:this.getCompletedCount(),totalRevisions:tr,completedSubjects:cs,subjectsStudiedToday:st.size,maxDailyMinutes:md,pomodoroCompleted:this.state.sessions.filter(s=>s.type==='pomodoro').length};
    },

    // DAILY CHALLENGES
    generateDailyChallenges(){
        if(this.state.dailyChallenges.date===this.today())return;
        const shuffled=[...this.DAILY_CHALLENGES].sort(()=>Math.random()-0.5);
        this.state.dailyChallenges={date:this.today(),challenges:shuffled.slice(0,3).map((c,i)=>({id:i,text:c.text,xp:c.xp,checkIdx:this.DAILY_CHALLENGES.indexOf(c)})),completed:[]};
        this._syncDailyChallenges();
    },
    checkDailyChallenges(){
        const dc=this.state.dailyChallenges;if(dc.date!==this.today())return;
        const ctx={sessions:this.state.sessions,today:this.today(),todayMinutes:this.getTodayMinutes(),
            chaptersCompletedToday:this.getAllChapters().filter(c=>(c.status==='completed'||c.status==='revised')&&c.completionDate===this.today()).length,
            revisionsToday:this.state.sessions.filter(s=>s.date===this.today()&&s.type==='revision').length,
            tasks:this.state.tasks,examScores:this.state.examScores,
            doubtsResolvedToday:this.state.doubts.filter(d=>d.resolvedDate===this.today()).length,
            notesAddedToday:(this.state.notes||[]).filter(n=>{
                const raw=n.createdAt||n.created_at;
                if(!raw)return false;
                const d=new Date(raw);
                return !isNaN(d.getTime())&&this.localDateStr(d)===this.today()
            }).length
        };
        dc.challenges.forEach(ch=>{
            if(dc.completed.includes(ch.id))return;
            const orig=this.DAILY_CHALLENGES[ch.checkIdx];
            if(orig&&orig.check(ctx)){dc.completed.push(ch.id);hapticsVibrate('success');this.addXP(ch.xp,`Challenge: ${ch.text}`);this.toast(`Challenge done: ${ch.text}`,'success')}
        });
        this._syncDailyChallenges();
    },

    // DAILY CHALLENGE — animated checkbox toggle (visual + re-triggers logic check)
    _dcToggleAnim(id,el){
        const dc=this.state.dailyChallenges;
        if(!dc||dc.date!==this.today())return;
        if(dc.completed.includes(id))return; // one-way: auto-checked by check engine
        el.style.transform='scale(1.3)';
        setTimeout(()=>{ el.style.transform='scale(1)'; },200);
        this.checkDailyChallenges();
        this.render();
    },

    // MOOD
    setMood(mood){
        this.state.profile.mood=mood;
        this.state.profile.moodHistory.push({mood,date:this.today(),time:Date.now()});
        this._syncFullProfile();this.toast(`Mood set: ${mood}`,'info');
        if(this.state.currentPage==='coach')this.renderCoach();
    },

    // WELCOME
    welcomeNext(step){
        // Step 2: save exam date from step 1
        if(step===2){
            const eField=document.getElementById('welcome-exam-date');
            if(eField&&eField.value) this.state.profile.examDate=eField.value;
        }
        // Step 5 (old step 3): save name from step 4
        if(step===5){
            const n=document.getElementById('welcome-name').value.trim();
            if(!n){this.toast('Enter your name','warning');return;}
            this.state.profile.name=n;
        }
        document.querySelectorAll('.welcome-step').forEach(s=>s.classList.remove('active'));
        document.querySelector(`.welcome-step[data-step="${step}"]`).classList.add('active');
    },
    selectWelcomeClass(cls){
        this._welcomeClass = cls;
        // Highlight selected tile
        document.querySelectorAll('.welcome-step[data-step="2"] .goal-tile').forEach(t=>t.classList.remove('selected'));
        event.currentTarget.classList.add('selected');
        // Class 9/10: skip stream step, go straight to step 4
        if(cls <= 10){
            this._welcomeStream = null;
            this._updateWelcomeStep4Label();
            this.welcomeNext(4);
        } else {
            // Class 11/12: go to stream selection
            this.welcomeNext(3);
        }
    },
    selectWelcomeStream(stream){
        this._welcomeStream = stream;
        this._updateWelcomeStep4Label();
        this.welcomeNext(4);
    },
    // ── ONE-TIME DIFFICULTY MIGRATION ────────────────────────────────────────
    // Existing Supabase chapters were written with difficulty:'medium' before
    // per-chapter difficulty data was added to CLASS*_DATA. This function runs
    // once per device (guarded by localStorage) after subjects are loaded and
    // silently patches any chapter whose stored difficulty doesn't match what
    // CBSE_DATA now specifies. It only touches chapters that need changing —
    // user-overridden difficulties on manually-added chapters are left alone
    // because those won't be found in the CBSE lookup map.
    async _migrateCBSEDifficulty(){
        const MIGRATION_KEY = 'boardos_difficulty_migration_v1';
        if(localStorage.getItem(MIGRATION_KEY)) return; // already done on this device

        const _isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

        // Build a flat name→difficulty lookup from ALL CBSE_DATA entries
        const difficultyMap = new Map(); // chapter name (lowercase) → difficulty
        const _indexSubjects = (subjectArr) => {
            if(!Array.isArray(subjectArr)) return;
            subjectArr.forEach(sub => {
                if(!Array.isArray(sub.chapters)) return;
                sub.chapters.forEach(ch => {
                    difficultyMap.set(ch.name.trim().toLowerCase(), ch.difficulty);
                });
            });
        };
        // Index all classes and streams
        _indexSubjects(this.CLASS9_DATA);
        _indexSubjects(this.CLASS10_DATA);
        _indexSubjects(this.CLASS11_PCM_DATA);
        _indexSubjects(this.CLASS11_PCB_DATA);
        _indexSubjects(this.CLASS11_COMMERCE_DATA);
        _indexSubjects(this.CLASS12_PCM_DATA);
        _indexSubjects(this.CLASS12_PCB_DATA);
        _indexSubjects(this.CLASS12_COMMERCE_DATA);

        let updatedCount = 0;
        const updatePromises = [];

        this.state.subjects.forEach(sub => {
            sub.chapters.forEach(ch => {
                if(!_isUUID(ch.id)) return; // skip local-only chapters (not yet in DB)
                const correctDiff = difficultyMap.get(ch.name.trim().toLowerCase());
                if(!correctDiff) return; // not a CBSE chapter — don't touch it
                if(ch.difficulty === correctDiff) return; // already correct

                // Update in-memory state immediately so UI reflects change
                ch.difficulty = correctDiff;

                // Queue the Supabase update
                updatePromises.push(
                    DB.chapters.update(ch.id, { difficulty: correctDiff })
                        .then(({ error }) => {
                            if(error) console.error(`[Migration] chapters.update failed for "${ch.name}":`, error);
                            else updatedCount++;
                        })
                );
            });
        });

        if(updatePromises.length === 0){
            // Nothing to fix — still mark done so we never run again
            localStorage.setItem(MIGRATION_KEY, '1');
            return;
        }

        await Promise.allSettled(updatePromises);
        localStorage.setItem(MIGRATION_KEY, '1');
        console.log(`[Migration] difficulty_v1 complete — ${updatedCount}/${updatePromises.length} chapters updated`);

        // Re-render the current page so difficulty tags update without a reload
        this.save();
        this.render();
    },

    async _migrateSubjectIconType(){
        const MIGRATION_KEY = 'boardos_icontype_migration_v1';
        if(localStorage.getItem(MIGRATION_KEY)) return; // already done on this device

        const _isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

        let updatedCount = 0;
        const updatePromises = [];

        this.state.subjects.forEach(sub => {
            if(sub.iconType) return; // already has a type, leave it alone
            const type = this.getIconType(sub.name);
            sub.iconType = type; // update in-memory immediately so UI renders correctly

            if(!_isUUID(sub.id)) return; // local-only subject, nothing to sync yet

            updatePromises.push(
                DB.subjects.update(sub.id, { icon_type: type })
                    .then(({ error }) => {
                        if(error) console.error(`[Migration] subjects.update icon_type failed for "${sub.name}":`, error);
                        else updatedCount++;
                    })
            );
        });

        if(updatePromises.length === 0){
            localStorage.setItem(MIGRATION_KEY, '1');
            this.save();
            return;
        }

        await Promise.allSettled(updatePromises);
        localStorage.setItem(MIGRATION_KEY, '1');
        console.log(`[Migration] icontype_v1 complete — ${updatedCount}/${updatePromises.length} subjects updated`);

        this.save();
        this.render();
    },

    _updateWelcomeStep4Label(){
        const cls = this._welcomeClass || 10;
        const stream = this._welcomeStream || null;
        const label = stream ? `Class ${cls} ${stream}` : `Class ${cls}`;
        const p = document.getElementById('welcome-class-label');
        if(p) p.textContent = `Your ${label} Your personal study OS. Let's personalize your workspace.`;
        const btn = document.getElementById('welcome-load-btn');
        if(btn) btn.textContent = `Load CBSE ${label} Syllabus`;
    },
    loadCBSE(){
        const _lcUid=window._supabaseUserId;
        this.CLASS10_DATA.forEach(sub=>{
            if(this.state.subjects.some(s=>s.name.trim().toLowerCase()===sub.name.trim().toLowerCase()))return;
            const sj={id:this.uid(),name:sub.name,iconType:this.getIconType(sub.name),color:sub.color,chapters:[]};
            // ch is now {name, difficulty} — use ch.difficulty so each chapter
            // gets its correct difficulty instead of the old hardcoded 'medium'
            sub.chapters.forEach(ch=>{sj.chapters.push({id:this.uid(),name:ch.name,status:'not-started',deadline:'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:ch.difficulty,notes:'',exercises:[],createdAt:Date.now()})});
            this.state.subjects.push(sj);
            if(_lcUid){
                DB.subjects.create(_lcUid,{name:sub.name,icon_type:sj.iconType,color:sub.color}).then(({data,error})=>{
                    if(error){console.error('[DB] loadCBSE subjects.create:',error);return;}
                    if(data&&data.id){
                        sj.id=data.id;
                        sj.chapters.forEach((ch,i)=>{
                            DB.chapters.create({user_id:_lcUid,subject_id:data.id,name:ch.name,status:'not-started',difficulty:ch.difficulty,revision_count:0,order_index:i}).then(({data:cd,error:ce})=>{
                                if(ce){console.error('[DB] loadCBSE chapters.create:',ce);return;}
                                if(cd&&cd.id)ch.id=cd.id;
                            });
                        });
                    }
                });
            }
        });
        this.toast('Syllabus loaded!','success');this.welcomeNext(3);
    },
    loadCBSEForClass(){
        const cls = this._welcomeClass || 10;
        const stream = this._welcomeStream || null;
        let data = this.CBSE_DATA[cls];
        if(cls === 11 || cls === 12){
            if(!stream){ this.toast('Please select a stream first','warning'); return; }
            data = this.CBSE_DATA[cls][stream];
        }
        if(!data){ this.toast('Syllabus not found','error'); return; }
        this.state.profile.selectedClass = cls;
        this.state.profile.selectedStream = stream;
        const _lcUid = window._supabaseUserId;
        data.forEach(sub => {
            if(this.state.subjects.some(s=>s.name.trim().toLowerCase()===sub.name.trim().toLowerCase()))return;
            const sj={id:this.uid(),name:sub.name,iconType:this.getIconType(sub.name),color:sub.color,chapters:[]};
            // ch is now {name, difficulty} — use ch.difficulty so each chapter
            // gets its correct difficulty instead of the old hardcoded 'medium'
            sub.chapters.forEach(ch=>{sj.chapters.push({id:this.uid(),name:ch.name,status:'not-started',deadline:'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:ch.difficulty,notes:'',exercises:[],createdAt:Date.now()})});
            this.state.subjects.push(sj);
            if(_lcUid){
                DB.subjects.create(_lcUid,{name:sub.name,icon_type:sj.iconType,color:sub.color}).then(({data:sd,error})=>{
                    if(error){console.error('[DB] loadCBSEForClass subjects:',error);return;}
                    if(sd&&sd.id){
                        sj.id=sd.id;
                        sj.chapters.forEach((ch,i)=>{
                            DB.chapters.create({user_id:_lcUid,subject_id:sd.id,name:ch.name,status:'not-started',difficulty:ch.difficulty,revision_count:0,order_index:i}).then(({data:cd,error:ce})=>{
                                if(ce){console.error('[DB] loadCBSEForClass chapters:',ce);return;}
                                if(cd&&cd.id)ch.id=cd.id;
                            });
                        });
                    }
                });
            }
        });
        this._syncFullProfile();
        this.updatePageTitle();
        this.toast('Class '+cls+'syllabus loaded!','success');
        this.welcomeNext(5);
    },
    completeWelcome(){
        const sel=document.getElementById('welcome-goal');
        if(sel&&typeof App_goalTileMinutes!=='undefined') sel.value=String(App_goalTileMinutes);
        this.state.profile.dailyGoalMinutes=parseInt(sel?sel.value:'120');
        const ed=document.getElementById('welcome-exam-date').value;
        if(ed) this.state.profile.examDate=ed;
        // Sync full profile to Supabase
        this._syncFullProfile();
        document.getElementById('welcome-overlay').classList.add('hidden');
        // If a circle join was pending, renderCircles() may have already run
        // once (and consumed _pendingCircleJoinCode) while this overlay was
        // covering the whole screen — meaning the join modal opened, but
        // invisibly, and nobody saw it. Re-arm it here so the render() call
        // below actually shows it now that the overlay is gone.
        if (this._pendingCircleJoinCodeRaw) {
            this._pendingCircleJoinCode = this._pendingCircleJoinCodeRaw;
            this._pendingCircleJoinCodeRaw = null;
        }
        this.render();
        this.updateSidebar();
        setTimeout(_patchSidebarExam,300);
        hapticsVibrate('streak');
        this.celebrate();
        this.toast('Welcome, '+this.state.profile.name+'! 🚀','success');
        setTimeout(() => window.StudyOSTour && window.StudyOSTour.start(), 3000);
    },

    // NAV
    navigate(page){
        // If leaving an active quiz, stop its countdown timer to prevent
        // _finishQuiz() firing silently in the background and corrupting state
        if(page!=='quiz'&&this._quiz&&this._quiz.active){
            clearInterval(this._quiz.timerInterval);
            this._quiz=null;
        }
        this.state.currentPage=page;document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
        const pe=document.getElementById('page-'+page);if(pe)pe.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
        document.querySelectorAll('.mob-nav-item').forEach((n,i)=>{const pages=['dashboard','subjects','','tasks','rewards'];n.classList.toggle('active',pages[i]===page)});
        const titles={dashboard:'Dashboard',subjects:'Subjects',log:'Study Log',tasks:'Daily Tasks',revisions:'Revisions',exams:'Exam Scores',doubts:'Doubts',weekly:'Analytics',pomodoro:'Focus Timer',notes:'Notes',resources:'Resources',coach:'AI Coach',rewards:'Rewards',settings:'Settings',quiz:'Quiz',backlog:'Backlog',circles:'Study Circles'};
        document.getElementById('page-title').textContent=titles[page]||page;this.updatePageSubtitle();

        // PERF: fetch this tab's data lazily (no-op if already loaded), then render.
        // _loadTabData() resolves instantly for tabs with the loaded-guard set,
        // so subsequent navigations to the same tab have zero async overhead.
        this._loadTabData(page).then(() => {
            this.renderPage(page);
        }).catch(() => {
            // Data fetch failed — render anyway with whatever state we have
            this.renderPage(page);
        });

        this.closeSidebar();document.getElementById('content').scrollTop=0;
    },
    updatePageSubtitle(){
        const n=new Date();
        const dateStr=n.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});
        const page=this.state.currentPage;
        const subtitles={
            dashboard:dateStr,tasks:dateStr,log:dateStr,
            subjects:'Your syllabus',revisions:'Spaced repetition',
            coach:'Powered by Groq',quiz:'Active recall',
            weekly:'Analytics & plan',
            pomodoro:'Focus timer',notes:'Notes & formulas',
            resources:'Study links',doubts:'Track your doubts',
            exams:'Score history',
            rewards:'XP & badges',settings:'Preferences',
            backlog:'Study debt tracker',
            circles:'Study with friends',
        };
        document.getElementById('page-subtitle').textContent=subtitles[page]||dateStr;
    },

    updateTopbarPills(){
        // ── Streak pill ──
        const streak=this.state.profile.streak||0;
        const sp=document.getElementById('topbar-streak-pill');
        const sv=document.getElementById('topbar-streak-val');
        if(sp&&sv){
            if(streak>0){sp.style.display='inline-flex';sv.textContent=streak}
            else{sp.style.display='none'}
        }
        // ── Exam countdown pill ──
        const dte=this.getDaysToExam();
        const ep=document.getElementById('topbar-exam-pill');
        const ev=document.getElementById('topbar-exam-val');
        if(ep&&ev){
            if(dte!==null&&dte>=0){
                ep.style.display='inline-flex';
                ev.textContent=dte;
                if(dte<30){ep.classList.add('danger')}else{ep.classList.remove('danger')}
            }else{ep.style.display='none'}
        }
    },
    renderPage(p){const r={dashboard:()=>this.renderDashboard(),subjects:()=>this.renderSubjects(),log:()=>this.renderLog(),tasks:()=>this.renderTasks(),revisions:()=>this.renderRevisions(),exams:()=>this.renderExams(),doubts:()=>this.renderDoubts(),weekly:()=>this.renderWeekly(),pomodoro:()=>this.renderPomodoro(),notes:()=>this.renderNotes(),resources:()=>this.renderResources(),coach:()=>this.renderCoach(),rewards:()=>this.renderRewards(),settings:()=>this.renderSettings(),quiz:()=>this.renderQuiz(),backlog:()=>window.Backlog&&Backlog.renderPage(),circles:()=>this.renderCircles()};if(r[p])r[p]()},
    renderCircles(){
        const el=document.getElementById('page-circles');
        if(!el)return;

        // Deep link: if we arrived here via /circle/join?code=XXXXXX (captured
        // in init(), possibly surviving a login redirect via sessionStorage),
        // auto-open the join modal pre-filled with that code. Consume it once
        // so it doesn't reopen on every subsequent visit to this page.
        if (this._pendingCircleJoinCode) {
            const code = this._pendingCircleJoinCode;
            this._pendingCircleJoinCode = null;
            this.openModal('modal-circle-join');
            const codeInput = document.getElementById('circle-join-code');
            if (codeInput) codeInput.value = code;
        }

        const circles=(this.state.circles||[]).map(row=>row.circles).filter(Boolean);

        if(this._openCircleId){
            this._renderCircleDetail(el);
            return;
        }

        let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:8px;flex-wrap:wrap"><div></div><div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" onclick="App.openModal('modal-circle-join')">Join with Code</button><button class="btn btn-primary" onclick="App.openModal('modal-circle-create')">+ New Circle</button></div></div>`;

        if(circles.length===0){
            h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div></span><div class="empty-state-title">No circles yet</div><div class="empty-state-desc">Study with a small group of friends. Track streaks and chapters together — nobody studies better alone.</div><div style="display:flex;gap:var(--sp-2);justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="App.openModal('modal-circle-create')">Start a Circle</button><button class="btn btn-secondary" onclick="App.openModal('modal-circle-join')">Join with Code</button></div></div>`;
            el.innerHTML=h;
            return;
        }

        h+=`<div class="grid grid-2" style="gap:14px">`;
        circles.forEach(c=>{
            const memberCount=(c.circle_members&&c.circle_members[0]&&c.circle_members[0].count)||1;
            h+=`<div class="card" style="cursor:pointer" onclick="App.openCircle('${c.id}')"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><h3 style="font-size:1.05rem;margin-bottom:4px">${c.name}</h3><p style="font-size:.78rem;color:var(--text-muted)">${memberCount} member${memberCount===1?'':'s'}</p></div><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="9 18 15 12 9 6"/></svg></div></div>`;
        });
        h+=`</div>`;
        el.innerHTML=h;
    },

    async openCircle(circleId){
        this._openCircleId=circleId;
        this._openCircleLeaderboard=null;
        this._openCircleOvertakes=[];
        this.render();
        try{
            const {data,error}=await DB.circles.getLeaderboard(circleId);
            if(error)throw error;
            this._openCircleLeaderboard=data||[];
        }catch(e){
            console.warn('[circles-leaderboard]',e);
            this.toast('Could not load leaderboard','error');
            this._openCircleId=null;
            this.render();
            return;
        }
        this.render();

        // Overtakes are a non-critical addition — fetched AFTER the main
        // leaderboard has already rendered, and a failure here is only
        // logged, never shown as an error toast or allowed to block the
        // leaderboard the user actually came for.
        try{
            const {data,error}=await DB.circles.getRecentOvertakes(circleId);
            if(error)throw error;
            this._openCircleOvertakes=data||[];
            const myOvertakes=this._openCircleOvertakes.filter(o=>o.overtaken_user_id===window._supabaseUserId);
            if(myOvertakes.length>0&&window.Notifications){
                myOvertakes.forEach(o=>{
                    Notifications.send('circle-overtake',`${o.overtaker_name} passed you!`,`${o.overtaker_name} moved ahead of you in the leaderboard. Time to catch up.`,'circles');
                });
            }
            this.render();
        }catch(e){
            console.warn('[circles-overtakes]',e);
            // Deliberately silent to the user — this is a bonus signal, not
            // core leaderboard data. Logged for debugging only.
        }
    },

    closeCircleDetail(){
        this._openCircleId=null;
        this._openCircleLeaderboard=null;
        this._openCircleOvertakes=[];
        this.render();
    },

    // Toggles the ⋮ dropdown on the circle detail page. Called with no
    // args to force-close (from menu item clicks after their own action
    // fires) or with the click event to open/close on the trigger button.
    // Click-outside-to-close uses a one-shot capturing listener registered
    // only while open, so we don't leak a permanent document listener for
    // a menu that's rarely opened.
    toggleCircleMenu(evt){
        if(evt)evt.stopPropagation();
        const dd=document.getElementById('circle-menu-dropdown');
        if(!dd)return;
        const opening = dd.style.display==='none' || !dd.style.display;
        dd.style.display = opening ? 'block' : 'none';
        if(opening){
            const closeOnOutsideClick=(e)=>{
                if(!dd.contains(e.target)){
                    dd.style.display='none';
                    document.removeEventListener('click',closeOnOutsideClick,true);
                }
            };
            // Defer registration one tick so the click that opened the menu
            // (which is still bubbling/capturing) doesn't immediately close it.
            setTimeout(()=>document.addEventListener('click',closeOnOutsideClick,true),0);
        }
    },

    _renderCircleDetail(el){
        const circles=(this.state.circles||[]).map(row=>row.circles).filter(Boolean);
        const circle=circles.find(c=>c.id===this._openCircleId);
        if(!circle){
            this._openCircleId=null;
            this.renderCircles();
            return;
        }

        let h=`<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px"><div style="display:flex;align-items:center;gap:10px"><button class="btn btn-secondary btn-sm" onclick="App.closeCircleDetail()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg> Back</button><h2 style="font-size:1.1rem">${circle.name}</h2></div>`;

        // Three-dot menu: invite code, copy link, and leave all live here now —
        // moved off the main card per product decision to reduce visual noise
        // for an action set most users touch once (at join time) or rarely
        // (leaving). Click-outside-to-close is wired via a one-shot document
        // listener added at open time (see toggleCircleMenu), not CSS
        // :focus-within, so it also closes on scroll/tap-elsewhere on mobile.
        h+=`<div class="circle-menu-wrap" style="position:relative">
            <button class="btn btn-secondary btn-sm" onclick="App.toggleCircleMenu(event)" aria-label="Circle options" style="padding:6px 10px">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
            <div id="circle-menu-dropdown" class="circle-menu-dropdown" style="display:none;position:absolute;top:calc(100% + 6px);right:0;background:var(--bg-card,#fff);border:1px solid var(--border-color,rgba(0,0,0,.08));border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);min-width:200px;z-index:50;overflow:hidden">
                <div style="padding:10px 14px;border-bottom:1px solid var(--border-color,rgba(0,0,0,.06))">
                    <p style="font-size:.68rem;color:var(--text-muted);margin-bottom:2px">Invite code</p>
                    <p style="font-size:1rem;font-weight:700;letter-spacing:2px;color:var(--text-primary)">${circle.invite_code}</p>
                </div>
                <button class="circle-menu-item" onclick="App.copyCircleInvite('${circle.invite_code}');App.toggleCircleMenu()" style="width:100%;text-align:left;padding:10px 14px;background:none;border:none;font-size:.85rem;cursor:pointer;display:flex;align-items:center;gap:8px;color:var(--text-primary)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy Invite Link
                </button>
                <button class="circle-menu-item" onclick="App.toggleCircleMenu();App.leaveCircleConfirm('${circle.id}','${circle.name.replace(/'/g,"\\'")}')" style="width:100%;text-align:left;padding:10px 14px;background:none;border:none;font-size:.85rem;cursor:pointer;color:var(--text-danger);display:flex;align-items:center;gap:8px">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Leave Circle
                </button>
            </div>
        </div></div>`;

        if(this._openCircleLeaderboard===null){
            h+=`<div class="card" style="text-align:center;padding:32px 20px;color:var(--text-muted)">Loading leaderboard…</div>`;
            el.innerHTML=h;
            return;
        }

        const rows=this._openCircleLeaderboard;
        // Rank by weekly_minutes, then streak as tiebreaker — mirrors the
        // RPC's own tiebreak chain (order by weekly_minutes desc, streak
        // desc, user_id) so the rank shown here always matches what the
        // backend considers "first." Previously sorted by streak first,
        // which is why 3+ members tied at streak 0 all bunched at the same
        // apparent rank while a 6-chapter week went invisible to ranking
        // entirely — weekly_minutes as primary key fixes both: it rarely
        // ties, and it directly reflects actual study effort this week.
        const scored=[...rows].sort((a,b)=>
            (b.weekly_minutes||0)-(a.weekly_minutes||0) ||
            (b.streak||0)-(a.streak||0)
        );

        h+=`<div class="card"><div class="card-header"><span class="card-title">Leaderboard</span><span class="card-subtitle">${rows.length} member${rows.length===1?'':'s'} • this week</span></div>`;
        if(rows.length===0){
            h+=`<p style="color:var(--text-muted);font-size:.85rem;padding:8px 0">No members yet.</p>`;
        }else{
            // Plain numeric rank, no gold/silver/bronze styling — explicit
            // product decision: show "1, 2, 3" so users can see standing,
            // without dressing the top 3 up as a podium.
            // Rank 1: colored LEFT BORDER accent (matches .db-stat-indigo/
            // -green/-orange convention already used on the dashboard —
            // NOT a full box border, which felt bolted-on/generic here).
            // Ranks 2+: no circle/container at all, just a large bold
            // numeral in --text-muted, same weight class as db-stat-val —
            // quieter than a badge, keeps visual attention on rank 1 and
            // on the numbers that actually matter (minutes, streak).
            scored.forEach((r,i)=>{
                const rank=i+1;
                const isTop=rank===1;

                // Rank-change arrow: rank_change is (yesterday's rank - today's
                // rank) as computed server-side, so POSITIVE means improved
                // (moved to a better/lower rank number), matching the arrow
                // direction a user intuitively expects (up arrow = good).
                // 0 or missing (first day, no snapshot yet) shows nothing —
                // deliberately not showing a fake "no change" indicator on
                // day one, since there's no real prior state to compare to.
                let rankChangeHtml='';
                if(typeof r.rank_change==='number'&&r.rank_change!==0){
                    const improved=r.rank_change<0; // stored as current-yesterday; negative = moved up
                    const delta=Math.abs(r.rank_change);
                    rankChangeHtml=`<span style="font-size:.68rem;font-weight:700;color:${improved?'var(--text-success)':'var(--text-danger)'};display:inline-flex;align-items:center;gap:1px;margin-left:4px" aria-label="${improved?'Moved up':'Moved down'} ${delta} rank${delta===1?'':'s'}">${improved?'▲':'▼'}${delta}</span>`;
                }

                // Closest-rival gap: MINUTES behind the next higher rank
                // tier. NOTE: "next higher rank" is NOT necessarily
                // rank-1 — if multiple people are tied at the same
                // weekly_minutes value, they all share one rank number and
                // are all the same distance behind the SAME person above
                // them, not behind each other. Must look up that person's
                // actual rank from the sorted list, not assume rank-1.
                // Styled as a tinted info pill (--color-focus-bg/--info),
                // matching the paceTag recipe used elsewhere in the app,
                // instead of plain colored text.
                let gapHtml='';
                if(rank>1&&typeof r.gap_to_next_rank==='number'&&r.gap_to_next_rank>0){
                    const nextRankNum=scored.filter(o=>(o.weekly_minutes||0)>(r.weekly_minutes||0)).length;
                    gapHtml=`<span style="display:inline-block;font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:var(--color-focus-bg);color:var(--info);margin-top:4px">${this.formatMin(r.gap_to_next_rank)} behind rank ${nextRankNum}</span>`;
                }

                // 7-day mini sparkline: r.daily_minutes is a Mon->Sun jsonb
                // array of integers already deserialized to a JS array by
                // Supabase. Rendered as 7 thin bars, tallest bar in the set
                // defines 100% height so the shape is always relative to
                // that person's own week, not a fixed absolute scale.
                // FIX #1 (dashed-line artifact): an all-zero week now
                // renders a plain muted caption instead of 7 near-invisible
                // slivers that visually blurred together.
                // FIX #2 (this pass): on a week with SOME activity, the
                // zero-minute days were still rendering as 3px slivers in
                // a low-contrast border color — effectively invisible next
                // to an 18px bar, so the "shape of the week" a sparkline is
                // supposed to convey was unreadable (only 2-3 of 7 bars
                // were actually perceptible). Raised min height to 4px AND
                // switched zero-day color to --text-muted (has real
                // contrast against the card background, unlike --border
                // which is designed to be subtle by definition — using a
                // "subtle" token for something that needs to stay visible
                // was the actual root cause). Container width is now
                // EXPLICIT (7 * 6px bars + 6 * 3px gaps = 60px) instead of
                // implicit flex sizing, removing any ambiguity about
                // whether bars could be getting clipped by a parent.
                const dm=Array.isArray(r.daily_minutes)?r.daily_minutes:[0,0,0,0,0,0,0];
                const maxDay=Math.max(0,...dm);
                const sparkHtml=maxDay===0
                    ? `<p style="font-size:.68rem;color:var(--text-muted);margin-top:6px">No study time logged yet this week</p>`
                    : `<div style="display:flex;align-items:flex-end;gap:3px;height:18px;width:60px;margin-top:6px;flex-shrink:0" aria-hidden="true">${dm.map(mins=>{
                        const barH=Math.max(4,Math.round((mins/maxDay)*18));
                        return`<div style="width:6px;flex-shrink:0;height:${barH}px;border-radius:2px;background:${mins>0?'var(--accent-light)':'var(--text-muted)'};opacity:${mins>0?'1':'0.35'}"></div>`;
                    }).join('')}</div>`;

                // Streak badge: rebuilt as a tinted pill using the SAME
                // recipe as paceTag/.tag-* elsewhere (tinted bg + solid
                // text from one semantic color pair) instead of the
                // generic .tag class, which is meant for chapter-status
                // labels, not streaks. --color-streak-bg/--color-streak
                // already exist in the design system for exactly this.
                const streakBadge=`<span style="flex-shrink:0;display:inline-flex;align-items:center;gap:3px;font-size:.72rem;font-weight:700;padding:4px 9px;border-radius:var(--radius-xs);background:${r.streak>0?'var(--color-streak-bg)':'var(--color-surface)'};color:${r.streak>0?'var(--color-streak,#F97316)':'var(--text-muted)'};border:1px solid ${r.streak>0?'rgba(249,115,22,0.2)':'var(--border)'}" title="${r.streak||0} day streak">🔥 ${r.streak||0}</span>`;

                // Rank marker: rank 1 = solid filled circle (40px, matching
                // .stat-icon sizing convention); ranks 2+ = plain bold
                // numeral, no shape, --text-muted — see comment above.
                const rankMarker=isTop
                    ? `<span style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:700">${rank}</span>`
                    : `<span style="flex-shrink:0;width:36px;text-align:center;font-size:1.1rem;font-weight:700;color:var(--text-muted)">${rank}</span>`;

                h+=`<div style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;margin-bottom:8px;border-radius:var(--radius-sm);background:var(--color-surface);border:1px solid var(--color-border);${isTop?'border-left:3px solid var(--accent);':''}${r.is_caller?'background:var(--color-surface-hover);':''}">${rankMarker}<div style="flex:1;min-width:0"><h4 style="font-size:.85rem;font-weight:600;color:var(--text-primary)">${r.name}${r.is_caller?' <span style="font-size:.7rem;color:var(--accent-light);font-weight:600">(you)</span>':''}${rankChangeHtml}</h4><p style="font-size:${isTop?'1.15rem':'.95rem'};font-weight:700;color:var(--text-primary);line-height:1.3;margin-top:2px">${this.formatMin(r.weekly_minutes||0)}<span style="font-size:.68rem;font-weight:500;color:var(--text-muted)"> this week</span></p><p style="font-size:.72rem;color:var(--text-muted);margin-top:2px">${r.chapters_completed||0} chapters completed • ${r.active_days_this_week||0}/7 active days</p>${gapHtml}${sparkHtml}</div>${streakBadge}</div>`;
            });
        }
        h+=`</div>`;
        el.innerHTML=h;
    },

    copyCircleInvite(inviteCode){
        const link=DB.circles.getInviteLink(inviteCode);
        if(navigator.clipboard&&navigator.clipboard.writeText){
            navigator.clipboard.writeText(link).then(()=>{
                this.toast('Invite link copied!','success');
            }).catch(()=>{
                this.toast(`Invite code: ${inviteCode}`,'success');
            });
        }else{
            this.toast(`Invite code: ${inviteCode}`,'success');
        }
    },

    async createCircleSubmit(){
        const nameInput=document.getElementById('circle-create-name');
        const name=(nameInput&&nameInput.value||'').trim();
        if(!name){this.toast('Enter a circle name','warning');return;}
        if(name.length>40){this.toast('Name is too long','warning');return;}

        const {data,error}=await DB.circles.create(name,10);
        if(error){
            console.error('[DB] circles.create:',error);
            this.toast('Could not create circle','error');
            return;
        }

        this.closeModal('modal-circle-create');
        if(nameInput)nameInput.value='';
        this.toast(`Circle "${name}" created!`,'success');
        this._loadedTabs&&this._loadedTabs.delete&&this._loadedTabs.delete('circles');
        await this._loadTabData('circles');
        this.render();
    },

    async joinCircleSubmit(){
        const codeInput=document.getElementById('circle-join-code');
        const code=(codeInput&&codeInput.value||'').trim().toUpperCase();
        if(!code){this.toast('Enter an invite code','warning');return;}

        const {data,error}=await DB.circles.joinByCode(code);
        if(error){
            this.toast(error.message||'Could not join circle','error');
            return;
        }

        this.closeModal('modal-circle-join');
        if(codeInput)codeInput.value='';
        this.toast('Joined circle!','success');
        this._loadedTabs&&this._loadedTabs.delete&&this._loadedTabs.delete('circles');
        await this._loadTabData('circles');
        this.render();
    },

    leaveCircleConfirm(circleId,circleName){
        if(!confirm(`Leave "${circleName}"? You can rejoin later with an invite code.`))return;
        this.leaveCircle(circleId);
    },

    async leaveCircle(circleId){
        const {error}=await DB.circles.leave(circleId);
        if(error){
            console.error('[DB] circles.leave:',error);
            this.toast('Could not leave circle','error');
            return;
        }
        this.toast('Left circle','success');
        this._openCircleId=null;
        this._openCircleLeaderboard=null;
        this._loadedTabs&&this._loadedTabs.delete&&this._loadedTabs.delete('circles');
        await this._loadTabData('circles');
        this.render();
    },
    render(){
        const page = this.state.currentPage;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const pe = document.getElementById('page-' + page);
        if(pe) pe.classList.add('active');
        this.renderPage(page);
        this.updateNavBadges();
        try{this.checkDailyChallenges();}catch(e){console.error('[StudyOS] checkDailyChallenges crashed:',e);}
    },

    getGreeting(){const h=new Date().getHours();return h<12?'morning':h<17?'afternoon':'evening'},
    getMotivation(){const m=["Every chapter brings you closer to success! 💪","Small daily progress = big results! 🚀","Consistency beats intensity! 🔥","Your future self will thank you! 📚","One chapter at a time! ✨","Believe in yourself! 🌟","Hard work pays off! 🏆","Stay focused, stay winning! 🎯"];return m[Math.floor(Math.random()*m.length)]},

    // Context-aware greeting line — replaces the generic motivation quote.
    // Priority: streak at risk > exam urgency > weak subject > behind pace > generic.
    getSmartGreeting(){
        const st=this.state.profile.streak||0;
        const dte=this.getDaysToExam();
        const lastStudy=this.state.profile.lastStudyDate;
        const daysSince=lastStudy?this.daysBetween(lastStudy,this.today()):999;
        const tm=this.getTodayMinutes();
        const weakChapters=this.getAllChapters().filter(c=>c.weakFlag);
        const remaining=this.getTotalChapters()-this.getCompletedCount();
        const pred=this.getPredictedCompletion();

        // Find the most at-risk subject by pace ratio
        let atRiskSubject=null;
        if(this.state.subjects.length>0&&dte!==null&&dte>0){
            const tot=this.getTotalChapters(),comp=this.getCompletedCount();
            const overallPct=tot>0?comp/tot:0;
            const riskSubjs=this.state.subjects
                .map(s=>{
                    const dn=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
                    const pct=s.chapters.length>0?dn/s.chapters.length:0;
                    return{name:s.name,pct,gap:overallPct-pct,remaining:s.chapters.length-dn};
                })
                .filter(s=>s.remaining>0&&s.gap>0.2)
                .sort((a,b)=>b.gap-a.gap);
            if(riskSubjs.length>0)atRiskSubject=riskSubjs[0].name;
        }

        // Streak at risk (studied yesterday, haven't today, streak > 1)
        if(st>1&&daysSince===1&&tm===0){
            return`🔥 ${st}-day streak on the line — log a session today to keep it alive!`;
        }
        // Exam very close
        if(dte!==null&&dte>0&&dte<=14){
            return`⏰ ${dte} days to boards — every session counts now. You've got this!`;
        }
        // Behind pace on a specific subject
        if(atRiskSubject){
            return`📉 ${atRiskSubject} is falling behind — even one chapter today helps.`;
        }
        // Weak chapters flagged
        if(weakChapters.length>0){
            return`⚠️ ${weakChapters[0].name} needs a revisit — your confidence there was low.`;
        }
        // Behind overall pace
        if(dte!==null&&dte>0&&remaining>0&&pred){
            const needed=remaining/dte;
            if(pred.rate>0&&pred.rate<needed*0.6){
                return`🚨 Need ${needed.toFixed(1)} ch/day at your pace — push one extra chapter today.`;
            }
        }
        // Already studied today — positive reinforcement
        if(tm>0){
            const generic=["Great momentum — keep it going! 🚀","Consistency is your superpower! 🔥","Every session compounds. Stay at it! 📚"];
            return generic[new Date().getDay()%generic.length];
        }
        // Default
        const fallback=["One session a day keeps the backlog away! 📖","Small steps, big results. Start today! ✨","Your future boards score is built right now! 🏆"];
        return fallback[new Date().getDay()%fallback.length];
    },

    getTomorrowPlan(){const plan=[];this.getOverdueChapters().forEach(c=>plan.push({...c,reason:'Overdue',priority:'overdue'}));this.getRevisionsDue().forEach(c=>plan.push({...c,reason:'Revision due',priority:'revised'}));const pending=this.getAllChapters().filter(c=>c.status==='not-started'||c.status==='in-progress');pending.filter(c=>c.difficulty==='hard').slice(0,2).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Hard topic',priority:'hard'})});pending.filter(c=>c.deadline).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,3).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Deadline approaching',priority:'medium'})});pending.slice(0,5).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Pending',priority:'easy'})});return plan},

    // HEATMAP DATA
    getHeatmapData(){const data={};const now=new Date();for(let i=89;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);data[this.localDateStr(d)]=0}this.state.sessions.forEach(s=>{if(data[s.date]!==undefined)data[s.date]+=s.timeSpent});return data},

    // DASHBOARD
    // ─────────────────────────────────────────────────────────────────────────
    // NEW helper — call from hero "Skip →" button.
    // Stores skipped chapter IDs in localStorage, keyed to today so the skip
    // list auto-clears at midnight with zero state pollution.
    // ─────────────────────────────────────────────────────────────────────────
    skipHeroChapter(chapterId){
        const key=`db_hero_skips_${this.today()}`;
        let skips=[];
        try{skips=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}
        if(!skips.includes(chapterId))skips.push(chapterId);
        localStorage.setItem(key,JSON.stringify(skips));
        this.renderDashboard();
    },

    renderDashboard(){
        const el=document.getElementById('page-dashboard');
        if(!el)return;
        try{
        const tm=this.getTodayMinutes(),gm=this.state.profile.dailyGoalMinutes||120,gp=Math.min(100,Math.round(tm/gm*100));
        const comp=this.getCompletedCount(),tot=this.getTotalChapters(),sp=tot>0?Math.round(comp/tot*100):0;
        const od=this.getOverdueChapters(),rd=this.getRevisionsDue(),ts=this.getTodaySessions(),st=this.state.profile.streak||0;
        const wd=this.getWeekSessions(),dte=this.getDaysToExam(),rs=this.getReadinessScore();
        const hm=this.getHeatmapData();
        const pred=this.getPredictedCompletion();
        const avgMin=this.state.sessions.length>0?Math.round(this.state.sessions.reduce((a,s)=>a+s.timeSpent,0)/Math.max(1,new Set(this.state.sessions.map(s=>s.date)).size)):0;

        // ── HERO SKIP: filter already-skipped chapters from today's plan ──────
        const _skipKey=`db_hero_skips_${this.today()}`;
        let _skippedIds=[];
        try{_skippedIds=JSON.parse(localStorage.getItem(_skipKey)||'[]')}catch(_){}
        const plan=this.getTomorrowPlan().filter(p=>!_skippedIds.includes(p.id));

        // ── PACE INTELLIGENCE ──────────────────────────────────────────────
        const remaining=tot-comp;
        let paceMsg='',paceColor='rgba(186,220,255,0.75)';
        if(dte!==null&&dte>0&&tot>0){
            const needed=remaining/dte;
            const actual=pred?pred.rate:0;
            if(remaining===0){paceMsg='All chapters done! Ready for boards.';paceColor='#4ADE80'}
            else if(needed<=0.1){paceMsg=`${remaining} ch left · Well ahead of pace ✅`;paceColor='#4ADE80'}
            else if(actual>0&&actual>=needed*0.9){paceMsg=`Need ${needed.toFixed(1)} ch/day · You're on pace ✅`;paceColor='#4ADE80'}
            else if(actual>0&&actual>=needed*0.6){paceMsg=`Need ${needed.toFixed(1)} ch/day · Slightly behind ⚠️`;paceColor='#FBBF24'}
            else{paceMsg=`Need ${needed.toFixed(1)} ch/day · Behind pace — speed up! 🚨`;paceColor='#F87171'}
        }else if(dte===null){paceMsg='Set exam date for pace tracking'}
        else if(dte===0){paceMsg='Exam is today — best of luck! 🌟';paceColor='#FBBF24'}
        else if(remaining===0){paceMsg='All chapters done!';paceColor='#4ADE80'}

        // Ring color: green once daily goal hit, cyan while WIP
        const ringColor=gp>=100?'#22C55E':'#22d3ee';
        const heroChapter=plan[0];
        const heroSubject=heroChapter?this.state.subjects.find(s=>s.id===heroChapter.subjectId):null;
        const heroSubjectColor=heroSubject?heroSubject.color:'#6F72FD';
        const heroSubjectColorRgba=heroSubjectColor.startsWith('#')
            ?(()=>{const r=parseInt(heroSubjectColor.slice(1,3),16),g=parseInt(heroSubjectColor.slice(3,5),16),b=parseInt(heroSubjectColor.slice(5,7),16);return`rgba(${r},${g},${b},0.15)`})()
            :'rgba(99,102,241,0.15)';

        // ── SECTION 1: STUDY NOW HERO ──────────────────────────────────────
        const heroHTML=heroChapter
            ?`<div class="db-hero" onclick="App.openChapterDetail('${heroChapter.subjectId}','${heroChapter.id}')">
                <div class="db-hero-left">
                    <div class="db-hero-label">▶ STUDY NOW</div>
                    <div class="db-hero-title">${heroChapter.name}</div>
                    <div class="db-hero-subject-tag" style="background:${heroSubjectColorRgba};color:${heroSubjectColor}">
                        ${heroChapter.subjectIcon} ${heroChapter.subjectName}
                    </div>
                    ${paceMsg?`<div style="font-size:.75rem;margin-top:8px;font-style:italic;color:${paceColor}">${paceMsg}</div>`:''}
                    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">
                        <button class="btn btn-primary" onclick="event.stopPropagation();App.openQuickLog()" style="font-size:.8rem;padding:8px 16px;border-radius:12px">Log Session</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation();App.navigate('pomodoro')" style="font-size:.8rem;padding:8px 16px;border-radius:12px">Focus Timer</button>
                        <button class="btn btn-ghost" onclick="event.stopPropagation();App.skipHeroChapter('${heroChapter.id}')" style="font-size:.8rem;padding:8px 14px;border-radius:12px;color:var(--text-muted)" title="Show next recommendation">Skip →</button>
                    </div>
                </div>
                <div class="db-hero-ring">
                    <svg width="120" height="120" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="7"/>
                        <circle cx="60" cy="60" r="52" fill="none" stroke="${ringColor}" stroke-width="7"
                            stroke-dasharray="${2*Math.PI*52}"
                            stroke-dashoffset="${2*Math.PI*52*(1-gp/100)}"
                            stroke-linecap="round"
                            style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s ease"/>
                    </svg>
                    <div class="db-hero-ring-val" style="color:${ringColor}">${gp}%</div>
                    <div class="db-hero-ring-lbl">of goal</div>
                </div>
            </div>`
            :`<div class="db-hero db-hero-empty db-hero-celebration">
                <div class="db-hero-left">
                    <div class="db-hero-label">✨ ALL CAUGHT UP</div>
                    <div class="db-hero-title">Great work, ${this.state.profile.name}!</div>
                    <div class="db-hero-sub" style="color:rgba(134,239,172,0.85)">All chapters are up to date</div>
                    ${paceMsg?`<div style="font-size:.75rem;margin-top:8px;font-style:italic;color:var(--text-secondary)">${paceMsg}</div>`:''}
                    <button class="btn btn-primary" onclick="App.navigate('subjects')" style="margin-top:16px;font-size:.8rem;padding:8px 16px;border-radius:12px">Browse Subjects</button>
                </div>
                <div style="font-size:4rem;position:relative;z-index:1"></div>
            </div>`;

        // ── SECTION 2: REVISIONS DUE TODAY ────────────────────────────────
        // getRevisionsDue() returns {daysSince, nextInterval, ...ch}
        // daysOverdue = daysSince - nextInterval (>0 means overdue)
        const rdSorted=rd.slice().sort((a,b)=>(b.daysSince-b.nextInterval)-(a.daysSince-a.nextInterval));
        // P1-2 FIX: Show context "3 most urgent of N" so users know exactly what they're seeing.
        // If all fit (≤3), no "and N more" footer. If more exist, footer links to full list.
        const rdSortedFull=rd.slice().sort((a,b)=>(b.daysSince-b.nextInterval)-(a.daysSince-a.nextInterval));
        const rdVisible=rdSortedFull.slice(0,3);
        const rdHidden=rdSortedFull.length-rdVisible.length;
        const revisionsDueHTML=rd.length>0?`
        <div style="border:1px solid var(--border);border-radius:var(--radius);padding:16px 20px;margin-bottom:16px;background:var(--color-surface)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <span style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text-secondary);display:inline-flex;align-items:center;gap:6px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M8 16H3v5"/></svg>Ready to Revise</span>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('revisions')" style="font-size:.72rem;color:var(--accent-light)">See all ${rd.length} →</button>
            </div>
            ${rd.length>3?`<div style="font-size:.7rem;color:var(--text-muted);margin-bottom:10px;font-style:italic">Showing 3 most helpful of ${rd.length}</div>`:''}
            ${rdVisible.map(c=>{
                const daysOverdue=c.daysSince-c.nextInterval;
                const subj=this.state.subjects.find(s=>s.id===c.subjectId);
                return`<div onclick="App.openChapterDetail('${c.subjectId}','${c.id}')" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer;transition:opacity .15s" onmouseenter="this.style.opacity='.75'" onmouseleave="this.style.opacity='1'">
                    <span style="font-size:1rem;flex-shrink:0">${subj?this.renderSubjectIcon(subj,16):'?'}</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-size:.83rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
                        <div style="font-size:.72rem;color:var(--text-muted)">${c.subjectName||''}</div>
                    </div>
                    <span style="font-size:.72rem;font-weight:600;color:var(--text-muted);white-space:nowrap;flex-shrink:0">${daysOverdue}d since last look</span>
                </div>`;
            }).join('')}
            ${rdHidden>0?`<div onclick="App.navigate('revisions')" style="text-align:center;padding:8px 0 2px;font-size:.72rem;color:var(--accent-light);cursor:pointer;font-weight:600">+ ${rdHidden} more → View all</div>`:''}
        </div>`:'';

        // ── SECTION 3: THREE STAT CARDS ───────────────────────────────────
        // Stat 1 — time studied today vs daily goal.
        // P1-3 FIX: If today is 0m, show yesterday's time so the card isn't
        // immediately demoralizing on page load. The sub-label clarifies it's yesterday.
        const goalLabel=this.formatMin(gm);
        const yesterday=(()=>{const d=new Date();d.setDate(d.getDate()-1);return d.toLocaleDateString('en-CA')})();
        const yesterdayMin=this.state.sessions.filter(s=>s.date===yesterday).reduce((a,s)=>a+s.timeSpent,0);

        // Stat 2 — chapters done vs total + weekly gap
        // "chapters completed this week" = distinct chapterIds in sessions this week
        const thisWeekChapters=new Set(wd.sessions.filter(s=>s.chapterId).map(s=>s.chapterId)).size;
        // Derive a simple weekly chapter target from pace needed to finish before exam.
        // Fallback to a reasonable default (5/week) if no exam date.
        let weeklyChapterTarget=5;
        if(dte!==null&&dte>0&&remaining>0){
            const weeksLeft=dte/7;
            weeklyChapterTarget=Math.max(1,Math.ceil(remaining/Math.max(1,weeksLeft)));
        }
        const weekChapterGap=weeklyChapterTarget-thisWeekChapters;
        const chapterSubline=weekChapterGap>0
            ?`<div class="db-stat-trend" style="color:#F97316;font-weight:600">Need ${weekChapterGap} more this week</div>`
            :`<div class="db-stat-trend" style="color:var(--trend-green)">✓ Week target met</div>`;

        // Stat 3 — days to exam + pace gap
        let paceSubline='';
        if(dte!==null&&dte>0&&remaining>0){
            const needed=remaining/dte;
            const actual=pred?pred.rate:0;
            if(actual>0&&actual>=needed*0.9){
                paceSubline=`<div class="db-stat-trend" style="color:var(--trend-green)">On track ✅</div>`;
            }else{
                paceSubline=`<div class="db-stat-trend" style="color:#F97316">${actual>0?actual.toFixed(1):'0'}/day · Need ${needed.toFixed(1)}/day</div>`;
            }
        }else if(dte===null){
            paceSubline=`<div class="db-stat-trend" style="color:var(--text-muted)">Set exam date</div>`;
        }else if(remaining===0){
            paceSubline=`<div class="db-stat-trend" style="color:var(--trend-green)">All done! 🎉</div>`;
        }

        // Streak freeze display
        const sf=this.state.streakFreezes||0;
        const freezeSlotsHTML=[0,1,2].map(i=>`<span style="font-size:1rem;opacity:${i<sf?'1':'0.25'}">🧊</span>`).join('');
        const freezeLabelHTML=sf===0
            ?`<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:4px">no freezes — earn one at a 7-day streak</div>`
            :`<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:4px">streak freeze${sf!==1?'s':''}</div>`;
        const freezeBannerHTML=this.state.pendingFreezeNotice
            ?`<div id="freeze-notice-banner" style="background:var(--color-focus-bg);border:1px solid var(--color-focus);border-radius:var(--radius-sm);padding:12px 16px;font-size:.82rem;display:flex;align-items:center;gap:10px;margin-bottom:12px">
                <span style="flex-shrink:0;font-size:1.1rem">🧊</span>
                <span style="flex:1">Streak freeze used — your <strong>${this.state.profile.streak}</strong>-day streak is safe. Study today to keep it going.</span>
                <button onclick="App.dismissFreezeNotice()" style="background:none;border:none;cursor:pointer;color:var(--color-text-secondary);font-size:1.1rem;padding:2px 6px;flex-shrink:0;line-height:1" title="Dismiss">×</button>
            </div>`
            :'';
        const streakHeroStyle=st>0
            ?`background:rgba(249,115,22,0.10);border:1.5px solid #F97316;`
            :`background:var(--color-surface);border:1.5px solid var(--color-border);`;
        const streakSubline=st>0?`🔥 ${st} day streak — keep it alive`:`Start your streak today — any session counts`;
        const streakSubColor=st>0?`#F97316`:`var(--color-text-secondary)`;

        const statsHTML=`
        <div style="${streakHeroStyle}border-radius:var(--radius);padding:20px 24px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;gap:16px;cursor:default;">
            <div style="display:flex;align-items:center;gap:16px;flex:1;min-width:0;">
                <span style="font-size:2.2rem;line-height:1;flex-shrink:0">${st>0?'🔥':'🕯️'}</span>
                <div>
                    <div style="font-family:var(--font-mono);font-size:2.75rem;font-weight:700;line-height:1;color:${st>0?'#F97316':'var(--color-text-primary)'};">${st}<span style="font-size:1.1rem;font-weight:500;color:var(--color-text-secondary);margin-left:4px">day${st!==1?'s':''}</span></div>
                    <div style="font-size:.78rem;color:${streakSubColor};margin-top:5px;font-weight:${st>0?'600':'400'}">${streakSubline}</div>
                    ${st===0?`<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:3px">Log a session below to begin</div>`:''}
                    <div style="margin-top:8px;display:flex;align-items:center;gap:4px">${freezeSlotsHTML}</div>
                    ${freezeLabelHTML}
                </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <div style="font-size:.62rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--color-text-secondary);font-weight:700;margin-bottom:2px">Streak</div>
                ${st>0?`<div style="font-size:.72rem;color:#F97316;font-weight:600">Best: keep going!</div>`:`<button class="btn btn-primary btn-sm" onclick="App.openQuickLog()" style="font-size:.72rem;padding:5px 12px;margin-top:4px">Log now</button>`}
            </div>
        </div>
        <div class="db-stats" style="grid-template-columns:repeat(3,1fr);">
            <div class="db-stat db-stat-indigo">
                ${tm>0
                    ?`<div class="db-stat-val">${this.formatMin(tm)}</div>
                      <div class="db-stat-lbl">Today${avgMin>0?' · avg '+this.formatMin(avgMin):''}</div>
                      <div class="db-stat-trend" style="color:var(--text-muted);font-size:.7rem">of ${goalLabel} goal</div>
                      <div class="db-stat-trend" style="color:${tm>=avgMin&&avgMin>0?'var(--accent-light)':'var(--text-muted)'}">\n                      ${tm>=avgMin&&avgMin>0?'↑ Above avg':'—'}</div>`
                    :yesterdayMin>0
                        ?`<div class="db-stat-val" style="color:var(--text-secondary)">${this.formatMin(yesterdayMin)}</div>
                          <div class="db-stat-lbl">Yesterday</div>
                          <div class="db-stat-trend" style="color:var(--accent-light);font-size:.7rem">Goal today: ${goalLabel}</div>
                          <div class="db-stat-trend" style="color:var(--text-muted)">Log a session to start →</div>`
                        :`<div class="db-stat-val" style="color:var(--text-muted);font-size:1.5rem">—</div>
                          <div class="db-stat-lbl">Today's goal</div>
                          <div class="db-stat-trend" style="color:var(--accent-light);font-size:.7rem">${goalLabel} target</div>
                          <div class="db-stat-trend" style="color:var(--text-muted)">Log your first session →</div>`
                }
            </div>
            <div class="db-stat db-stat-green">
                <div class="db-stat-val">${comp}<span style="font-size:.9rem;font-weight:400;color:var(--color-text-secondary)">/${tot}</span></div>
                <div class="db-stat-lbl">Chapters done</div>
                ${chapterSubline}
            </div>
            <div class="db-stat db-stat-purple">
                <div class="db-stat-val">${dte!==null&&dte>0?dte:'—'}</div>
                <div class="db-stat-lbl">${dte!==null&&dte>0?'Days to boards':'Exam date'}</div>
                ${paceSubline}
            </div>
        </div>`;

        // ── SECTION 4: THIS WEEK BAR CHART (with goal reference line) ─────
        // .db-week-col has no justify-content set (defaults to flex-start), so
        // .db-week-bar-wrap (first child) packs against the column's TOP —
        // verified via DevTools that bar-wrap's top edge === strip's top edge.
        // The goal line (CSS: top:0 on .db-week-goal-line) shares that exact
        // origin. Bars render at 0–100% height of their own bar-wrap (the
        // mins/gm*100 formula below, clamped to 100), so a bar at exactly the
        // daily goal fills its wrap completely and its top edge lands exactly
        // at the goal line — by shared coordinate origin, not a hardcoded
        // pixel constant.
        // P1-4 FIX: Bar chart shows actual time values above each bar.
        // Bar chart: value labels live in a SEPARATE flex row above the strip.
        // They must NOT be inside .db-week-col — doing so shortens .db-week-bar-wrap,
        // which breaks the goal line (position:absolute top:0 = where a 100% bar ends).
        const weekTotalMins=wd.sessions.reduce((a,s)=>a+s.timeSpent,0);
        const weekHTML=`<div class="db-week-card card">
            <div class="card-header" style="margin-bottom:10px">
                <span class="card-title">This Week</span>
                <span style="font-size:.78rem;color:var(--text-muted)">${weekTotalMins>0?this.formatMin(weekTotalMins)+' total':''}</span>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:3px;padding:0 0 0 0">
                ${wd.days.map(d=>{
                    const mins=wd.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.timeSpent,0);
                    const metGoal=mins>=gm;
                    return`<div style="flex:1;text-align:center;font-size:.55rem;font-weight:${metGoal?'700':'400'};color:${mins>0?(metGoal?'#22C55E':'var(--text-muted)'):'transparent'};line-height:1;min-height:10px">${mins>0?this.formatMin(mins):'&nbsp;'}</div>`;
                }).join('')}
            </div>
            <div class="db-week-strip" style="position:relative;">
                <div class="db-week-goal-line">
                    <span>${this.formatMin(gm)} goal</span>
                </div>
                ${wd.days.map(d=>{
                    const mins=wd.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.timeSpent,0);
                    const isToday=d===this.today();
                    const height=mins>0?Math.max(4,Math.min(100,Math.round(mins/gm*100)))+'%':'4px';
                    const dayName=new Date(d+'T12:00').toLocaleDateString('en',{weekday:'short'});
                    const metGoal=mins>=gm;
                    return`<div class="db-week-col">
                        <div class="db-week-bar-wrap">
                            <div class="db-week-bar ${isToday?'today':''} ${mins>0?'has-data':''} ${metGoal?'goal-met':''}" style="height:${height}" title="${dayName}: ${this.formatMin(mins)}"></div>
                        </div>
                        <div class="db-week-day ${isToday?'today':''}">${dayName}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        // ── SECTION 5: SUBJECTS GRID (pacing tag replaces health bar) ─────
        // Pacing: chapters_remaining_per_subject / days_to_exam vs
        // chapters_remaining_total / days_to_exam. We compare the subject's
        // own remaining-to-due ratio against total needed pace.
        const subjectsHTML=this.state.subjects.length>0?`<div class="card">
            <div class="card-header" style="margin-bottom:14px">
                <span class="card-title">Subjects</span>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('subjects')" style="font-size:.72rem">See all →</button>
            </div>
            <div class="db-subj-grid">
            ${this.state.subjects.map(s=>{
                const dn=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
                const subjTotal=s.chapters.length;
                const pc=subjTotal>0?Math.round(dn/subjTotal*100):0;
                // Pacing tag calculation
                const subjRemaining=subjTotal-dn;
                let paceTag='',paceTagColor='',paceTagBg='';
                if(subjRemaining===0){
                    paceTag='Done ✓';paceTagColor='var(--text-success)';paceTagBg='rgba(34,197,94,0.12)';
                }else if(dte!==null&&dte>0){
                    // needed chapters/day just for this subject to finish before exam
                    const subjNeeded=subjRemaining/dte;
                    // overall needed rate for reference
                    const overallNeeded=remaining>0?remaining/dte:0;
                    // use actual pace ratio — if subject completion % is >= overall % it's "on track"
                    const subjPct=subjTotal>0?dn/subjTotal:0;
                    const overallPct=tot>0?comp/tot:0;
                    if(subjPct>=overallPct*0.9){
                        paceTag='On track';paceTagColor='var(--text-success)';paceTagBg='rgba(34,197,94,0.12)';
                    }else if(subjPct>=overallPct*0.6){
                        paceTag='Needs focus';paceTagColor='var(--text-secondary)';paceTagBg='var(--color-surface-2, rgba(148,163,184,0.12))';
                    }else{
                        paceTag='Prioritize next';paceTagColor='var(--text-secondary)';paceTagBg='var(--color-surface-2, rgba(148,163,184,0.12))';
                    }
                }else{
                    // No exam date — fall back to completion %
                    if(pc>=66){paceTag='On track';paceTagColor='var(--text-success)';paceTagBg='rgba(34,197,94,0.12)';}
                    else if(pc>=33){paceTag='Needs focus';paceTagColor='var(--text-secondary)';paceTagBg='var(--color-surface-2, rgba(148,163,184,0.12))';}
                    else{paceTag='Prioritize next';paceTagColor='var(--text-secondary)';paceTagBg='var(--color-surface-2, rgba(148,163,184,0.12))';}
                }
                return`<div class="db-subj-cell" onclick="App.navigate('subjects')">
                    <div class="db-subj-cell-top">
                        <span class="db-subj-cell-icon">${this.renderSubjectIcon(s,18)}</span>
                        <span class="db-subj-cell-name">${s.name}</span>
                        <span class="db-subj-cell-count">${dn}/${subjTotal}</span>
                    </div>
                    <div class="db-subj-cell-bar-track">
                        <div class="db-subj-cell-bar-fill" style="width:${pc}%;background:${s.color}"></div>
                    </div>
                    <div class="db-subj-cell-health" style="justify-content:flex-end">
                        <span style="font-size:.68rem;font-weight:700;padding:2px 8px;border-radius:6px;background:${paceTagBg};color:${paceTagColor}">${paceTag}</span>
                    </div>
                </div>`;
            }).join('')}
            </div>
        </div>`:(this._loadedTabs.has('subjects')?`<div class="card" style="text-align:center;padding:32px 20px">
            <div style="font-size:2.5rem;margin-bottom:10px">📚</div>
            <div style="font-weight:600;margin-bottom:6px">No subjects yet</div>
            <div style="font-size:.8rem;color:var(--text-muted);margin-bottom:16px">Load your CBSE syllabus or add subjects manually</div>
            <button class="btn btn-primary btn-sm" onclick="App.navigate('subjects')">Get Started →</button>
        </div>`:(()=>{
            const _cls=this.state.profile.selectedClass||10;
            const _stream=this.state.profile.selectedStream;
            const _cbse=this.CBSE_DATA[_cls];
            let _expected=5;
            if(Array.isArray(_cbse))_expected=_cbse.length;
            else if(_cbse)_expected=(_stream&&_cbse[_stream])?_cbse[_stream].length:Math.max(...Object.values(_cbse).map(a=>a.length));
            const _skelCell=`<div class="db-subj-cell db-subj-cell-skeleton">
                <div class="db-subj-cell-top">
                    <span class="db-subj-cell-icon skeleton-pulse" style="width:18px;height:18px;border-radius:5px"></span>
                    <span class="db-subj-cell-name skeleton-pulse" style="width:60%;height:11px;border-radius:4px"></span>
                    <span class="db-subj-cell-count skeleton-pulse" style="width:30px;height:9px;border-radius:4px"></span>
                </div>
                <div class="db-subj-cell-bar-track"></div>
                <div class="db-subj-cell-health">
                    <span class="db-subj-cell-hlabel skeleton-pulse" style="width:34px;height:8px;border-radius:4px"></span>
                    <div class="db-subj-cell-htrack"></div>
                    <span class="db-subj-cell-hval skeleton-pulse" style="width:18px;height:8px;border-radius:4px"></span>
                </div>
            </div>`;
            return `<div class="card">
                <div class="card-header" style="margin-bottom:14px">
                    <span class="card-title">Subjects</span>
                    <button class="btn btn-ghost btn-sm" onclick="App.navigate('subjects')" style="font-size:.72rem">See all →</button>
                </div>
                <div class="db-subj-grid">${_skelCell.repeat(_expected)}</div>
            </div>`;
        })());

        // ── HEATMAP ───────────────────────────────────────────────────────
        const hmDates=Object.keys(hm);
        const heatmapHTML=`<div class="card">
            <div class="card-header" style="margin-bottom:14px">
                <span class="card-title">Study Activity</span>
                <div style="display:flex;gap:4px;align-items:center">
                    <span style="font-size:.65rem;color:var(--text-muted)">Less</span>
                    ${['','l1','l2','l3','l4'].map(l=>`<div class="heatmap-cell ${l}" style="width:10px;height:10px;flex-shrink:0"></div>`).join('')}
                    <span style="font-size:.65rem;color:var(--text-muted)">More</span>
                </div>
            </div>
            <div class="heatmap">${hmDates.map(d=>{const m=hm[d];const lvl=m===0?'':m<30?'l1':m<60?'l2':m<120?'l3':'l4';return`<div class="heatmap-cell ${lvl}" title="${d}: ${this.formatMin(m)}"></div>`}).join('')}</div>
        </div>`;

        // ── BOARD READINESS ───────────────────────────────────────────────
        const readinessHTML=dte!==null&&dte>0?`<div class="card" style="display:flex;align-items:center;gap:20px">
            <div class="readiness-ring" style="flex-shrink:0">
                <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(128,128,128,0.1)" stroke-width="6"/>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="${rs>=70?'var(--success)':rs>=40?'var(--warning)':'var(--danger)'}" stroke-width="6"
                        stroke-dasharray="${2*Math.PI*34}" stroke-dashoffset="${2*Math.PI*34*(1-rs/100)}"
                        stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1s ease"/>
                </svg>
                <div class="readiness-value" style="font-size:1.1rem;color:${rs>=70?'var(--text-success)':rs>=40?'var(--text-warning)':'var(--text-danger)'}">${rs}%</div>
            </div>
            <div style="flex:1">
                <div style="font-weight:700;font-size:.95rem;margin-bottom:4px">Board Readiness</div>
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">${dte} days to exam · ${rs>=70?'Looking strong! Keep revising 💪':rs>=40?'Good progress, push harder 🚀':'Plenty of time — let\'s build momentum 🌱'}</div>
                ${pred?`<div style="font-size:.72rem;color:var(--text-muted)">📈 Predicted finish: ${pred.date} at ${pred.rate} ch/day</div>`:''}
            </div>
        </div>`:'';

        // ── WEAK CHAPTERS ────────────────────────────────────────────────
        const weakChapters=this.getAllChapters().filter(c=>c.weakFlag);
        const weakHTML=weakChapters.length>0?`<div class="card" style="border-left:3px solid var(--danger);margin-bottom:0">
            <div class="card-header" style="margin-bottom:10px">
                <span class="card-title">Needs Attention</span>
                <span style="font-size:.7rem;color:var(--text-danger);font-weight:600">${weakChapters.length} weak chapter${weakChapters.length>1?'s':''}</span>
            </div>
            <p style="font-size:.75rem;color:var(--text-muted);margin-bottom:10px">These chapters had low confidence ratings across multiple sessions. Revisit before boards.</p>
            ${weakChapters.slice(0,5).map(c=>`<div class="plan-card" onclick="App.openChapterDetail('${c.subjectId}','${c.id}')" style="border-color:rgba(239,68,68,0.25)">
                <div class="plan-emoji">${c.subjectIcon}</div>
                <div class="plan-info"><h3>${c.name}</h3><p>${c.subjectName}</p></div>
                <span style="font-size:.72rem;color:var(--text-danger);font-weight:600">⚠️ Weak</span>
            </div>`).join('')}
            ${weakChapters.length>5?`<p style="font-size:.72rem;color:var(--text-muted);margin-top:6px;text-align:center">+${weakChapters.length-5} more · <span style="color:var(--accent-light);cursor:pointer" onclick="App.navigate('subjects')">View all →</span></p>`:''}
        </div>`:'';

        // ── PROACTIVE COACH NUDGE ────────────────────────────────────────
        let coachNudge='';
        const lastStudyDate=this.state.profile.lastStudyDate;
        const daysSinceStudy=lastStudyDate?this.daysBetween(lastStudyDate,this.today()):999;
        const nudgeDismissed=localStorage.getItem('nudge_dismissed')===this.today();
        if(!nudgeDismissed){
            let nudgeMsg='',nudgeIcon='🤖',nudgeBorder='var(--accent)';
            if(daysSinceStudy===0){
                coachNudge='';
            }else{
                if(daysSinceStudy===1){nudgeMsg=`Study something today to protect your streak — even 20 minutes counts.`;nudgeIcon='⚡';nudgeBorder='var(--warning)';}
                else if(daysSinceStudy<=3){nudgeMsg=`Your streak is paused. Log any session today to restart it.`;nudgeIcon='🎯';nudgeBorder='var(--warning)';}
                else if(daysSinceStudy<=6){nudgeMsg=`It's been a few days — no pressure. One session today puts you back on track.`;nudgeIcon='💪';nudgeBorder='var(--accent)';}
                else if(daysSinceStudy>=7){nudgeMsg=`Fresh start. Log one session today — your streak begins now.`;nudgeIcon='🌱';nudgeBorder='var(--success)';}
                if(!nudgeMsg&&weakChapters.length>=3){nudgeMsg=`${weakChapters.length} chapters flagged as weak (${weakChapters.slice(0,2).map(c=>c.name).join(', ')}${weakChapters.length>2?'…':''}). These need focused re-study before boards.`;nudgeIcon='📉';nudgeBorder='var(--danger)';}
                if(!nudgeMsg&&dte!==null&&dte>0&&remaining>0){
                    const needed=remaining/dte;const actual=pred?pred.rate:0;
                    if(actual>0&&actual<needed*0.6){nudgeMsg=`At your current pace (${actual} ch/day) you need ${needed.toFixed(1)} ch/day to finish before boards. You're behind — consider pushing 1 extra chapter today.`;nudgeIcon='⏰';nudgeBorder='var(--danger)';}
                }
                if(nudgeMsg){
                    coachNudge=`<div style="background:rgba(79,70,229,0.06);border:1px solid ${nudgeBorder};border-left:3px solid ${nudgeBorder};border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;display:flex;gap:12px;align-items:flex-start">
                        <span style="font-size:1.3rem;flex-shrink:0">${nudgeIcon}</span>
                        <div style="flex:1">
                            <div style="font-size:.78rem;font-weight:600;margin-bottom:3px;color:var(--text-primary)">Coach says</div>
                            <div style="font-size:.8rem;color:var(--text-secondary);line-height:1.5">${nudgeMsg}</div>
                        </div>
                        <button onclick="localStorage.setItem('nudge_dismissed','${this.today()}');this.closest('[style]').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:2px 4px;flex-shrink:0" title="Dismiss">×</button>
                    </div>`;
                }
            }
        }

        // ── EOD CHECK-IN — inline card on dashboard ─────────────────────────────
        // Visibility rules:
        //   1. Already saved today  → always show (read-only, positive reinforcement)
        //   2. Not saved + hour≥17  → show input form (end of study day)
        //   3. Not saved + hour<17  → render nothing (not relevant yet)
        // The position:fixed bottom banner in app.html still covers non-dashboard tabs.
        const todayCheckinEntry=this.state.checkins&&this.state.checkins[this.today()];
        const currentHour=new Date().getHours();
        const showEodCard=!!(todayCheckinEntry||(currentHour>=17));
        const eodCardHTML=!showEodCard?''
            :todayCheckinEntry
            ?`<div class="card" style="border-left:3px solid var(--color-brand);margin-bottom:0">
                <div class="card-header" style="margin-bottom:10px">
                    <span class="card-title" style="font-size:.82rem">✅ Today's Check-in</span>
                    <span style="font-size:.7rem;color:var(--text-muted)">Saved</span>
                </div>
                ${todayCheckinEntry.understood?`<div style="font-size:.78rem;margin-bottom:6px"><span style="color:var(--text-muted);font-weight:600">Understood: </span><span style="color:var(--text-primary)">${todayCheckinEntry.understood}</span></div>`:''}
                ${todayCheckinEntry.unclear?`<div style="font-size:.78rem"><span style="color:var(--text-muted);font-weight:600">Still unclear: </span><span style="color:var(--text-primary)">${todayCheckinEntry.unclear}</span></div>`:''}
            </div>`
            :`<div class="card" id="db-eod-inline" style="border-left:3px solid var(--color-brand);margin-bottom:0">
                <div class="card-header" style="margin-bottom:10px">
                    <span class="card-title" style="font-size:.82rem">📝 End of Day Check-in</span>
                    <span style="font-size:.7rem;color:var(--text-muted)">2 quick questions</span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
                    <input type="text" id="db-eod-understood" class="form-input" placeholder="One thing you understood today..." style="font-size:.78rem;padding:7px 10px">
                    <input type="text" id="db-eod-unclear" class="form-input" placeholder="One thing still unclear..." style="font-size:.78rem;padding:7px 10px">
                </div>
                <div style="display:flex;gap:8px;align-items:center">
                    <button class="btn btn-primary btn-sm" onclick="App.saveEodCheckinInline()">Save check-in</button>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('db-eod-inline').style.display='none';localStorage.setItem('eod_dismissed','${this.today()}')">Dismiss</button>
                </div>
            </div>`;

        // ── ASSEMBLE ──────────────────────────────────────────────────────
        // Order: freeze banner → greeting → S1 hero → S2 revisions due →
        //        S3 stat cards → backlog widget → coach nudge →
        //        S4 week chart (main col) | readiness + eod check-in +
        //        heatmap + subjects + weak chapters (side col)
        // NOTE: heatmap + subjects moved to side col to reduce main col cognitive load.
        el.innerHTML=`
        ${freezeBannerHTML}
        <p class="db-greeting-compact">Good ${this.getGreeting()}, ${this.state.profile.name} 👋 &nbsp;·&nbsp; <span style="color:var(--text-secondary)">${this.getSmartGreeting()}</span></p>
        ${heroHTML}
        ${revisionsDueHTML}
        ${statsHTML}
        <div id="backlog-dashboard-widget">${window.Backlog ? Backlog.renderDashboardWidget() : ''}</div>
        ${coachNudge}
        <div class="db-two-col">
            <div class="db-col-main">
                ${weekHTML}
                ${subjectsHTML}
            </div>
            <div class="db-col-side">
                ${readinessHTML}
                ${eodCardHTML}
                ${heatmapHTML}
                ${weakHTML}
            </div>
        </div>`;

        }catch(err){
            console.error('Dashboard render error:',err);
            el.innerHTML=`<div style="padding:40px;text-align:center">
                <div style="font-size:3rem;margin-bottom:16px">📚</div>
                <h2 style="font-size:1.3rem;margin-bottom:8px">Welcome to BoardOS!</h2>
                <p style="color:var(--text-secondary);margin-bottom:20px">Start by loading your syllabus or adding subjects.</p>
                <button class="btn btn-primary" onclick="App.navigate('subjects')">Go to Subjects →</button>
            </div>`;
        }
    },
    // SUBJECTS
    // FIX 17: chapter-row "..." overflow menu — "Add exercise" coming in Sprint 4.
    renderSubjects(){
        const el=document.getElementById('page-subjects'),subs=this.state.subjects;
        let h=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;gap:8px;flex-wrap:wrap"><div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" onclick="App.navigate('notes')">📝 Notes & Formulas</button><button class="btn btn-primary btn-sm" onclick="App.openDoubtModal()">❓ Add Doubt</button></div><button class="btn btn-primary" onclick="App.openModal('modal-subject')">+ Subject</button></div><div class="subject-tabs"><div class="subject-tab ${this.state.selectedSubjectFilter==='all'?'active':''}" onclick="App.filterSubject('all')">All</div>${subs.map(s=>`<div class="subject-tab ${this.state.selectedSubjectFilter===s.id?'active':''}" onclick="App.filterSubject('${s.id}')">${this.renderSubjectIcon(s,14)} ${s.name}</div>`).join('')}</div>`;
        const flt=this.state.selectedSubjectFilter==='all'?subs:subs.filter(s=>s.id===this.state.selectedSubjectFilter);
        const fmtShort=this.fmtShort.bind(this);

        // Built once per render O(sessions) — keyed by chapterId
        const lastStudiedMap=new Map();
        this.state.sessions.forEach(sess=>{
            if(!sess.chapterId)return;
            const prev=lastStudiedMap.get(sess.chapterId);
            if(!prev||sess.date>prev)lastStudiedMap.set(sess.chapterId,sess.date);
        });

        // FIX A: threshold date string for "studied within 7 days"
        const sevenDaysAgo=(()=>{const d=new Date();d.setDate(d.getDate()-7);return this.localDateStr(d)})();

        if(subs.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div></span><div class="empty-state-title">No subjects yet</div><div class="empty-state-desc">Load your entire CBSE Class ${this.state.profile.selectedClass||10} syllabus in one tap, or add subjects manually.</div><div style="display:flex;gap:var(--sp-2);justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="App._welcomeClass=App.state.profile.selectedClass||10;App._welcomeStream=App.state.profile.selectedStream||null;App.loadCBSEForClass()">Load CBSE Class ${this.state.profile.selectedClass||10} Syllabus</button><button class="btn btn-secondary" onclick="App.openModal('modal-subject')">+ Add Manually</button></div><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>CBSE loads all 5 subjects with chapters pre-filled</div></div>`}
        else{flt.forEach(s=>{
            const dn=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length,pc=s.chapters.length>0?Math.round(dn/s.chapters.length*100):0;
            const trophyIcon=pc>=100?'🥇':pc>=75?'🥈':pc>=50?'🥉':'';

            // FIX A: compute revisions_overdue and not_started from chapter data
            let revisionsOverdue=0,notStarted=0;
            s.chapters.forEach(c=>{
                if(c.status==='not-started')notStarted++;
                else if(c.status==='completed'||c.status==='revised'){
                    const ls=lastStudiedMap.get(c.id);
                    // overdue if never studied OR last studied more than 7 days ago
                    if(!ls||ls<sevenDaysAgo)revisionsOverdue++;
                }
            });
            const healthLine=revisionsOverdue===0&&notStarted===0
                ?`<span style="font-size:.72rem;font-weight:600;color:var(--color-success,#10b981)">All chapters on track</span>`
                :`<span style="font-size:.72rem;color:var(--text-secondary)">${revisionsOverdue>0?`<span style="color:var(--color-warning,#f59e0b);font-weight:600">${revisionsOverdue} revision${revisionsOverdue!==1?'s':''} overdue</span>`:''}${revisionsOverdue>0&&notStarted>0?' · ':''}${notStarted>0?`<span style="color:var(--text-muted)">${notStarted} not started</span>`:''}</span>`;

            const subSafeId=s.id.replace(/[^a-zA-Z0-9_]/g,'_');
            h+=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${s.color}"><div class="card-header" style="flex-wrap:wrap"><div style="flex:1;min-width:0"><span class="card-title" style="font-size:1rem">${this.renderSubjectIcon(s,18)} ${s.name} ${trophyIcon}</span><p style="font-size:.72rem;color:var(--text-muted);margin-top:4px">${dn}/${s.chapters.length} • ${pc}%</p></div><div style="display:flex;gap:4px;flex-shrink:0"><button class="btn btn-sm btn-secondary" onclick="App.openAddChapterModal('${s.id}')">+</button><div style="position:relative"><button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();App._toggleSubMenu('${s.id}','${subSafeId}')" title="More" style="font-size:1rem;letter-spacing:1px;padding:0 8px">···</button><div id="submenu-${subSafeId}" style="display:none;position:absolute;right:0;top:100%;margin-top:2px;background:var(--surface-2,var(--card-bg));border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:170px;z-index:200;overflow:hidden"><button onclick="event.stopPropagation();App._subMenuDelete('${s.id}','${subSafeId}')" style="display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:.82rem;color:var(--color-danger,#ef4444);cursor:pointer">Delete subject</button></div></div></div></div><div id="subdel-${subSafeId}" style="display:none;padding:10px 12px;margin-bottom:12px;background:var(--surface-2,var(--card-bg));border:1px solid var(--color-danger,#ef4444);border-radius:8px;font-size:.8rem;color:var(--text-secondary)">Delete "<strong>${s.name}</strong>" and all ${s.chapters.length} chapter${s.chapters.length===1?'':'s'} inside it? This cannot be undone. <div style="margin-top:8px"><button class="btn btn-sm btn-danger" onclick="App.deleteSubject('${s.id}')">Confirm delete</button><button class="btn btn-sm btn-secondary" style="margin-left:6px" onclick="document.getElementById('subdel-${subSafeId}').style.display='none'">Cancel</button></div></div><div class="progress-bar" style="margin-bottom:10px"><div class="progress-fill" style="width:${pc}%;background:${s.color}"></div></div><div style="margin-bottom:14px">${healthLine}</div><div style="display:flex;flex-direction:column;gap:8px">${s.chapters.length===0?'<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px">No chapters</p>':s.chapters.map(c=>{
                const ov=c.deadline&&c.deadline<this.today()&&c.status!=='completed'&&c.status!=='revised';
                const confMap={1:'🔴',2:'🟡',3:'🟢',4:'⚡'};
                const confTag=c.confidence?`<span style="font-size:.65rem">${confMap[c.confidence]}</span>`:'';

                // FIX C: last_studied_date display — "Last studied: Jun 14" or "Not studied yet"
                const lastStudiedDate=lastStudiedMap.get(c.id);
                const fmtDate=fmtShort(lastStudiedDate);
                const studiedTag=fmtDate
                    ?`<span style="font-size:.65rem;color:var(--text-muted)">Last studied: ${fmtDate}</span>`
                    :`<span style="font-size:.65rem;color:var(--text-muted);opacity:.6">Not studied yet</span>`;

                const exList=this.state.exercises[s.id+'_'+c.id]||[];
                const exTag=exList.length>0?`<span class="tag" style="background:rgba(99,102,241,0.1);color:var(--accent-light)">${exList.filter(e=>e.done).length}/${exList.length} exercises</span>`:'';

                // FIX B: safe IDs for DOM (strip non-alphanum)
                const safeId=(s.id+'__'+c.id).replace(/[^a-zA-Z0-9_]/g,'_');

                return`<div class="chapter-item" style="box-sizing:border-box" id="chrow-${safeId}"><div class="chapter-check ${c.status==='completed'||c.status==='revised'?'done':''}" onclick="event.stopPropagation();App.toggleChapter('${s.id}','${c.id}')">${c.status==='completed'||c.status==='revised'?'✓':''}</div><div class="chapter-info" onclick="App.openChapterDetail('${s.id}','${c.id}')"><div class="chapter-name">${c.name}</div><div class="chapter-meta"><span class="tag tag-${c.status.replace(' ','-')}">${c.status.replace('-',' ')}</span><span class="tag tag-${c.difficulty}">${c.difficulty}</span>${c.revisionCount>0?`<span style="font-size:.65rem">🔄${c.revisionCount}</span>`:''}${studiedTag}${confTag}${exTag}${c.weakFlag?'<span class="tag" style="background:rgba(239,68,68,0.1);color:var(--text-danger)">weak</span>':''}${ov?'<span class="tag tag-overdue">!</span>':''}</div></div><div class="chapter-actions" style="flex-shrink:0;display:flex;align-items:center;gap:2px"><button class="ch-btn" onclick="event.stopPropagation();App.quickRevision('${s.id}','${c.id}')" title="Revise"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></button><div style="position:relative"><button class="ch-btn" onclick="event.stopPropagation();App._toggleChMenu('${s.id}','${c.id}','${safeId}')" title="More" style="font-size:1rem;letter-spacing:1px;padding:0 6px">···</button><div id="chmenu-${safeId}" style="display:none;position:absolute;right:0;top:100%;margin-top:2px;background:var(--surface-2,var(--card-bg));border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.18);min-width:160px;z-index:200;overflow:hidden"><button onclick="event.stopPropagation();App._closeChMenu();App.openChapterDetail('${s.id}','${c.id}')" style="display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:.82rem;color:var(--text-primary);cursor:pointer">Edit chapter</button><button onclick="event.stopPropagation();App._chMenuDelete('${s.id}','${c.id}','${safeId}')" style="display:block;width:100%;text-align:left;padding:9px 14px;background:none;border:none;font-size:.82rem;color:var(--color-danger,#ef4444);cursor:pointer">Delete chapter</button></div></div></div><div id="chdel-${safeId}" style="display:none;padding:8px 10px;background:var(--surface-2,var(--card-bg));border-top:1px solid var(--border);font-size:.8rem;color:var(--text-secondary)">Delete "<strong>${c.name.replace(/"/g,'&quot;')}</strong>"? Cannot be undone. <button class="btn btn-sm btn-danger" style="margin-left:8px;padding:2px 10px" onclick="event.stopPropagation();App.deleteChapter('${s.id}','${c.id}')">Confirm</button><button class="btn btn-sm btn-secondary" style="margin-left:4px;padding:2px 10px" onclick="event.stopPropagation();document.getElementById('chdel-${safeId}').style.display='none'">Cancel</button></div></div>`;
            }).join('')}</div></div>`})}
        el.innerHTML=h;
    },
    // FIX B helpers — overflow menu state
    _chMenuOpen:null,
    _toggleChMenu(sId,cId,safeId){
        const menuEl=document.getElementById('chmenu-'+safeId);
        if(!menuEl)return;
        const isOpen=menuEl.style.display!=='none';
        this._closeChMenu();
        if(!isOpen){menuEl.style.display='block';this._chMenuOpen=safeId;}
    },
    _closeChMenu(){
        if(this._chMenuOpen){
            const m=document.getElementById('chmenu-'+this._chMenuOpen);
            if(m)m.style.display='none';
            this._chMenuOpen=null;
        }
    },
    _chMenuDelete(sId,cId,safeId){
        this._closeChMenu();
        const confirmEl=document.getElementById('chdel-'+safeId);
        if(confirmEl)confirmEl.style.display='block';
    },
    filterSubject(id){this.state.selectedSubjectFilter=id;this.renderSubjects()},
    toggleChapter(sId,cId){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        if(ch.status==='completed'||ch.status==='revised'){ch.status='in-progress';ch.completionDate=null}
        else{
            ch.status='completed';ch.completionDate=this.today();
            hapticsVibrate('success');this.addXP(20,'Chapter completed');this.celebrate();
            // Check if subject is now fully complete
            const sub=this.getSubjectById(sId);
            if(sub&&sub.chapters.every(c=>c.status==='completed'||c.status==='revised')){
                hapticsVibrate('levelUp'); // must fire synchronously within the click's gesture window — see setTimeout below
                setTimeout(()=>{this.celebrate();this.toast(`🏆 ${sub.name} complete! Amazing!`,'success')},800);
            }
        }
        const _isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:ch.status,completion_date:ch.completionDate||null}).then(({error})=>{if(error)console.error('[DB] chapters.update status:',error);});}
        this.save();this.render();
    },
    quickRevision(sId,cId){const ch=this.getChapter(sId,cId);if(!ch)return;ch.revisionCount++;ch.revisionDates.push(this.today());ch.status='revised';if(!ch.completionDate)ch.completionDate=this.today();const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:'revised',revision_count:ch.revisionCount,revision_dates:ch.revisionDates,completion_date:ch.completionDate}).then(({error})=>{if(error)console.error('[DB] quickRevision chapters.update:',error);});}hapticsVibrate('success');this.addXP(15,'Revision done');this.recordStudyDay();this.save();this.render();this.toast(`🔄 Rev ${ch.revisionCount}: "${ch.name}"`,'success')},
    deleteChapter(sId,cId){const s=this.getSubjectById(sId);if(!s)return;const _dc=s.chapters.find(c=>c.id===cId);s.chapters=s.chapters.filter(c=>c.id!==cId);const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_dc&&_isUUID(_dc.id)){DB.chapters.delete(_dc.id).then(({error})=>{if(error)console.error('[DB] chapters.delete:',error);});}this.save();this.render()},
    _toggleSubMenu(sId,safeId){
        const menuEl=document.getElementById('submenu-'+safeId);
        if(!menuEl)return;
        const isOpen=menuEl.style.display!=='none';
        this._closeSubMenu();
        if(!isOpen){menuEl.style.display='block';this._subMenuOpen=safeId;}
    },
    _closeSubMenu(){
        if(this._subMenuOpen){
            const m=document.getElementById('submenu-'+this._subMenuOpen);
            if(m)m.style.display='none';
            this._subMenuOpen=null;
        }
    },
    _subMenuDelete(sId,safeId){
        this._closeSubMenu();
        const confirmEl=document.getElementById('subdel-'+safeId);
        if(confirmEl)confirmEl.style.display='block';
    },
    deleteSubject(sId){const _ds=this.state.subjects.find(s=>s.id===sId);this.state.subjects=this.state.subjects.filter(s=>s.id!==sId);const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_ds&&_isUUID(_ds.id)){DB.subjects.delete(_ds.id).then(({error})=>{if(error)console.error('[DB] subjects.delete:',error);});}this.save();this.render()},

    openChapterDetail(sId,cId){
        const ch=this.getChapter(sId,cId),sub=this.getSubjectById(sId);if(!ch||!sub)return;
        const ss=this.state.sessions.filter(s=>s.chapterId===cId);
        const lastStudied=ss.length?ss.reduce((a,s)=>s.date>a?s.date:a,ss[0].date):null;
        const ov=ch.deadline&&ch.deadline<this.today()&&ch.status!=='completed'&&ch.status!=='revised';
        const exKey=sId+'_'+cId;
        const exercises=this.state.exercises[exKey]||[];
        const hasDeadlineOrExercises=!!ch.deadline||exercises.length>0;

        // SECTION 1 — stats
        const revInfo=this.getNextRevisionInfo(ch);
        let nextRevHtml,nextRevColor='var(--text-primary)';
        if(!revInfo){nextRevHtml='Not due yet';nextRevColor='var(--text-muted)';}
        else if(revInfo.isDue){nextRevHtml=revInfo.daysUntil<0?`Overdue ${Math.abs(revInfo.daysUntil)}d`:'Due today';nextRevColor='var(--text-danger)';}
        else{nextRevHtml=`Due ${this.fmtShort(revInfo.dueDate)}`;}

        const statusLabels={'not-started':'Not Started','in-progress':'In Progress','completed':'Completed','revised':'Revised'};
        const statTiles=`<div class="grid" style="grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
            <div class="card" style="padding:12px 14px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:2px">Last studied</p><p style="font-size:.95rem;font-weight:600">${lastStudied?this.fmtShort(lastStudied):'Never'}</p></div>
            <div class="card" style="padding:12px 14px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:2px">Times revised</p><p style="font-size:.95rem;font-weight:600">${ch.revisionCount||0}</p></div>
            <div class="card" style="padding:12px 14px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:2px">Next revision</p><p id="chdet-next-rev" style="font-size:.95rem;font-weight:600;color:${nextRevColor}">${nextRevHtml}</p></div>
            <div class="card" style="padding:12px 14px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:2px">Difficulty</p><p style="font-size:.95rem;font-weight:600;text-transform:capitalize">${ch.difficulty}</p></div>
        </div>`;

        // SECTION 2 — quick actions
        const quickActions=`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
            <button class="btn btn-secondary btn-sm" style="flex:1;min-width:120px" onclick="App.openQuickLog('${sId}','${cId}');App.closeModal('modal-detail')">Log Session</button>
            <button class="btn btn-secondary btn-sm" style="flex:1;min-width:120px" onclick="App.markRevised('${sId}','${cId}')">Mark Revised</button>
            <button class="btn btn-secondary btn-sm" style="flex:1;min-width:120px" onclick="App.openBacklogFromChapter('${sId}','${cId}')">Add to Backlog</button>
            <button class="btn btn-secondary btn-sm" style="flex:1;min-width:120px" onclick="App.startFocusFromChapter('${sId}','${cId}')">Start Focus Timer</button>
        </div>`;

        // SECTION 3 — revision history (max 5, quality badge if present)
        const qualityStyle={shaky:'background:rgba(239,68,68,0.12);color:var(--text-danger)',ok:'background:rgba(249,115,22,0.12);color:#F97316',solid:'background:rgba(34,197,94,0.12);color:#22C55E'};
        const qualityLabel={shaky:'Shaky',ok:'OK',solid:'Solid'};
        const revDates=ch.revisionDates||[],revQuality=ch.revisionQuality||[];
        const revRows=revDates.slice().reverse().slice(0,5).map((d,i)=>{
            const origIdx=revDates.length-1-i;
            const q=revQuality[origIdx];
            return`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;font-size:.8rem"><span>${this.fmtShort(d)} · Rev ${origIdx+1}</span>${q?`<span class="tag" style="font-size:.68rem;${qualityStyle[q]||''}">${qualityLabel[q]||q}</span>`:''}</div>`;
        }).join('');
        const revisionHistory=revDates.length>0?`<div style="margin-bottom:18px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:6px">Revision history</p>${revRows}${revDates.length>5?`<button class="btn btn-ghost btn-sm" style="font-size:.72rem;color:#F97316;padding:4px 0" onclick="App.navigate('revisions')">View all ${revDates.length} →</button>`:''}</div>`:'';

        // SECTION 4 — status segmented control + difficulty dropdown
        const statusSeg=`<div style="margin-bottom:14px"><p style="font-size:.7rem;color:var(--text-muted);margin-bottom:6px">Status</p><div id="chdet-status-seg" style="display:flex;border:1px solid var(--border,#27272a);border-radius:8px;overflow:hidden">${Object.entries(statusLabels).map(([val,label],i)=>`<button id="chdet-seg-${val}" onclick="App.setChapterStatus('${sId}','${cId}','${val}')" style="flex:1;padding:7px 4px;font-size:.7rem;border:none;cursor:pointer;${i>0?'border-left:1px solid var(--border,#27272a);':''}background:${ch.status===val?'var(--accent,#F97316)':'transparent'};color:${ch.status===val?'#fff':'var(--text-secondary)'}">${label}</button>`).join('')}</div></div>
        <div class="form-group" style="margin-bottom:18px"><label class="form-label">Difficulty</label><select class="form-select" onchange="App.updateChapterField('${sId}','${cId}','difficulty',this.value)"><option value="easy" ${ch.difficulty==='easy'?'selected':''}>Easy</option><option value="medium" ${ch.difficulty==='medium'?'selected':''}>Medium</option><option value="hard" ${ch.difficulty==='hard'?'selected':''}>Hard</option></select></div>`;

        // SECTION 5 — notes, save on blur only
        const notesSection=`<div class="form-group" style="margin-bottom:18px"><label class="form-label">Notes</label><textarea class="form-textarea" placeholder="Study notes..." onblur="App.saveChapterNotes('${sId}','${cId}',this.value)">${ch.notes||''}</textarea></div>`;

        // Deadline + Exercises — collapsed below notes, open by default only if populated
        const deadlineExercises=`<details ${hasDeadlineOrExercises?'open':''} style="margin-bottom:4px"><summary style="font-size:.75rem;color:var(--text-muted);cursor:pointer;margin-bottom:10px">Deadline & exercises</summary>
            <div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" value="${ch.deadline||''}" onchange="App.updateChapterField('${sId}','${cId}','deadline',this.value)">${ov?'<p style="color:var(--text-danger);font-size:.75rem;margin-top:4px">Overdue!</p>':''}</div>
            <div class="form-group"><label class="form-label">Exercises</label><div style="display:flex;gap:6px;margin-bottom:8px"><input type="text" id="ex-new-${exKey.replace(/[^a-zA-Z0-9]/g,'')}" class="form-input" placeholder="Ex 1.1, Ex 1.2..." style="flex:1"><button class="btn btn-sm btn-secondary" onclick="App.addExercise('${sId}','${cId}')">Add</button></div><div class="exercise-grid">${exercises.map((ex,i)=>`<div class="exercise-chip ${ex.done?'done':''}" onclick="App.toggleExercise('${sId}','${cId}',${i})">${ex.name} ${ex.done?'✓':''}</div>`).join('')}</div></div>
        </details>`;

        document.getElementById('detail-body').innerHTML=`<div style="margin-bottom:18px"><span class="tag" style="background:${sub.color}22;color:${sub.color}">${this.renderSubjectIcon(sub,14)} ${sub.name}</span><span id="chdet-status-badge" class="tag tag-${ch.status.replace(' ','-')}" style="margin-left:6px">${ch.status.replace('-',' ')}</span><h3 style="font-size:1.15rem;margin-top:8px">${ch.name}</h3></div>${statTiles}${quickActions}${revisionHistory}${statusSeg}${notesSection}${deadlineExercises}`;
        const footerEl=document.getElementById('detail-footer');
        footerEl.innerHTML='';
        footerEl.style.display='none';
        this.openModal('modal-detail');
    },
    setChapterStatus(sId,cId,status){
        this.updateChapterField(sId,cId,'status',status);
        // Surgical patch only — header badge + segmented control active state.
        // Deliberately NOT calling openChapterDetail() here: that would wipe an
        // in-progress (unsaved, blur-pending) Notes draft and re-trigger the
        // open/close-details collapse state, which the spec didn't ask for.
        const badge=document.getElementById('chdet-status-badge');
        if(badge){badge.className=`tag tag-${status.replace(' ','-')}`;badge.textContent=status.replace('-',' ');}
        const statusLabels={'not-started':'Not Started','in-progress':'In Progress','completed':'Completed','revised':'Revised'};
        Object.keys(statusLabels).forEach(val=>{
            const btn=document.getElementById(`chdet-seg-${val}`);
            if(!btn)return;
            const active=val===status;
            btn.style.background=active?'var(--accent,#F97316)':'transparent';
            btn.style.color=active?'#fff':'var(--text-secondary)';
        });
        // Next-revision stat tile can change meaning when status flips into/out of
        // completed/revised (getNextRevisionInfo only applies to those states) —
        // that one tile needs its value recalculated even in a surgical patch.
        const ch=this.getChapter(sId,cId);
        const revInfo=this.getNextRevisionInfo(ch);
        const valEl=document.getElementById('chdet-next-rev');
        if(valEl){
            if(!revInfo){valEl.textContent='Not due yet';valEl.style.color='var(--text-muted)';}
            else if(revInfo.isDue){valEl.textContent=revInfo.daysUntil<0?`Overdue ${Math.abs(revInfo.daysUntil)}d`:'Due today';valEl.style.color='var(--text-danger)';}
            else{valEl.textContent=`Due ${this.fmtShort(revInfo.dueDate)}`;valEl.style.color='var(--text-primary)';}
        }
    },
    saveChapterNotes(sId,cId,val){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        if(ch.notes===val)return; // no-op if unchanged, matches native blur/onchange semantics
        this.updateChapterField(sId,cId,'notes',val);
    },
    markRevised(sId,cId){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        this._pendingRevisionQuality={sId,cId};
        document.getElementById('detail-body').insertAdjacentHTML('afterbegin',`<div id="rev-quality-prompt" style="background:var(--card-bg,#18181b);border:1px solid var(--border,#27272a);border-radius:8px;padding:10px 12px;margin-bottom:14px"><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">How did that revision go?</p><div style="display:flex;gap:6px"><button class="btn btn-sm btn-secondary" style="flex:1" onclick="App.confirmRevision('${sId}','${cId}','shaky')">Shaky</button><button class="btn btn-sm btn-secondary" style="flex:1" onclick="App.confirmRevision('${sId}','${cId}','ok')">OK</button><button class="btn btn-sm btn-secondary" style="flex:1" onclick="App.confirmRevision('${sId}','${cId}','solid')">Solid</button></div></div>`);
    },
    confirmRevision(sId,cId,quality){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        ch.revisionCount=(ch.revisionCount||0)+1;
        ch.revisionDates=ch.revisionDates||[];ch.revisionDates.push(this.today());
        ch.revisionQuality=ch.revisionQuality||[];ch.revisionQuality.push(quality);
        ch.status='revised';
        if(!ch.completionDate)ch.completionDate=this.today();
        const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        if(_isUUID(ch.id)){
            DB.chapters.update(ch.id,{status:'revised',revision_count:ch.revisionCount,revision_dates:ch.revisionDates,revision_quality:ch.revisionQuality,completion_date:ch.completionDate}).then(({error})=>{if(error)console.error('[DB] confirmRevision chapters.update:',error);});
        }
        this.addXP(15,'Revision done');this.recordStudyDay();this.save();
        this.toast(`🔄 Rev ${ch.revisionCount}: "${ch.name}"`,'success');
        this.openChapterDetail(sId,cId);
    },
    openBacklogFromChapter(sId,cId){
        const ch=this.getChapter(sId,cId),sub=this.getSubjectById(sId);if(!ch||!sub)return;
        this.closeModal('modal-detail');
        if(window.Backlog&&typeof window.Backlog.openAddModal==='function'){
            window.Backlog.openAddModal({subjectName:sub.name,chapterName:ch.name});
        }
    },
    startFocusFromChapter(sId,cId){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        this.closeModal('modal-detail');
        // Set state directly rather than calling setFocusSubject/setFocusChapter —
        // those each trigger their own renderPomodoro() pass and a .focus() call,
        // which is wasted work (and a stray focus-steal) before the page is visible.
        this.pomodoro.focusSubjectId=sId;
        this.pomodoro.focusChapterId=cId;
        this.navigate('pomodoro');
    },
    updateChapterField(sId,cId,f,v){const ch=this.getChapter(sId,cId);if(!ch)return;ch[f]=v;if(f==='status'&&v==='completed'&&!ch.completionDate){ch.completionDate=this.today();this.addXP(20,'Chapter completed')}const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){const _dbField={status:'status',difficulty:'difficulty',deadline:'deadline',notes:'notes'}[f];if(_dbField){const _payload={[_dbField]:v};if(f==='status'&&v==='completed')_payload.completion_date=ch.completionDate;DB.chapters.update(ch.id,_payload).then(({error})=>{if(error)console.error('[DB] updateChapterField:',error);});}}this.save();this.render()},

    // EXERCISES
    addExercise(sId,cId){
        const exKey=sId+'_'+cId;
        const inputId='ex-new-'+exKey.replace(/[^a-zA-Z0-9]/g,'');
        const inp=document.getElementById(inputId);if(!inp)return;
        const names=inp.value.split(',').map(n=>n.trim()).filter(n=>n);
        if(names.length===0)return;
        if(!this.state.exercises[exKey])this.state.exercises[exKey]=[];
        names.forEach(name=>{this.state.exercises[exKey].push({name,done:false})});
        this._syncExercises(sId,cId);this.openChapterDetail(sId,cId);this.toast('Exercises added!','success');
    },
    toggleExercise(sId,cId,idx){
        const exKey=sId+'_'+cId;
        if(!this.state.exercises[exKey]||!this.state.exercises[exKey][idx])return;
        this.state.exercises[exKey][idx].done=!this.state.exercises[exKey][idx].done;
        if(this.state.exercises[exKey][idx].done)this.addXP(5,'Exercise done');
        this._syncExercises(sId,cId);this.openChapterDetail(sId,cId);
    },
    // STUDY LOG
    openQuickLog(pSub,pCh){
        const subs=this.state.subjects;let co='';
        if(pSub){const s=this.getSubjectById(pSub);if(s)co=s.chapters.map(c=>`<option value="${c.id}" ${c.id===pCh?'selected':''}>${c.name}</option>`).join('')}
        // LOG VALIDATION — default chip is 45m, so hint starts green
        const defaultMin=45;
        const defaultHintColor='var(--color-success)';
        const defaultHintText='✓ Counts toward your streak';
        document.getElementById('log-form-body').innerHTML=`
<div class="form-group"><label class="form-label">Subject</label><input type="hidden" id="log-subject" value="${pSub||''}"><div class="log-subject-grid" id="log-subject-grid">${subs.map(s=>`<div class="log-subject-pill ${s.id===pSub?'selected':''}" data-sid="${s.id}" onclick="App.selectLogSubject('${s.id}')">${this.renderSubjectIcon(s,16)}<span>${s.name}</span></div>`).join('')}</div></div>
<div class="form-group"><label class="form-label">Chapter</label><select class="form-select" id="log-chapter"><option value="">Select</option>${co}</select></div>
<div class="form-group">
    <label class="form-label">What did you cover?</label>
    <input type="text" id="log-covered" class="form-input" placeholder="e.g. Completed Newton's laws, revised Chapter 3..." maxlength="200">
    <div id="log-covered-error" style="display:none;color:var(--color-danger);font-size:0.75rem;margin-top:4px">Please add a quick note on what you studied</div>
</div>
<div class="form-group"><label class="form-label">Time Spent</label><div class="quick-log" id="time-chips"><div class="quick-chip" data-min="15" onclick="App.selectTime(this)">15m</div><div class="quick-chip" data-min="30" onclick="App.selectTime(this)">30m</div><div class="quick-chip selected" data-min="45" onclick="App.selectTime(this)">45m</div><div class="quick-chip" data-min="60" onclick="App.selectTime(this)">1h</div><div class="quick-chip" data-min="90" onclick="App.selectTime(this)">1.5h</div><div class="quick-chip" data-min="120" onclick="App.selectTime(this)">2h</div></div><input type="number" id="log-time-custom" class="form-input" placeholder="Or enter minutes" min="1" style="margin-top:8px" oninput="App.updateDurationHint()">
<div id="duration-hint" style="color:${defaultHintColor};font-size:0.75rem;margin-top:4px">${defaultHintText}</div>
</div>
<div class="form-group"><label class="form-label">Session Type</label><div class="quick-log" id="type-chips"><div class="quick-chip selected" data-type="learning" onclick="App.selectType(this)">📖 Learning</div><div class="quick-chip" data-type="revision" onclick="App.selectType(this)">🔄 Revision</div><div class="quick-chip" data-type="practice" onclick="App.selectType(this)">✏️ Practice</div><div class="quick-chip" data-type="test" onclick="App.selectType(this)">📝 Test</div></div></div>
<div class="form-group"><label class="form-label">How well did you understand? <span style="font-size:.72rem;color:var(--text-muted)">(tap one)</span></label><div style="display:flex;gap:8px" id="confidence-chips"><button type="button" class="conf-btn" data-conf="1" onclick="App.selectConfidence(this)" title="Lost — didn't understand" style="font-size:1.4rem;padding:6px 10px;border-radius:8px;border:2px solid var(--color-border);background:var(--color-surface-hover);cursor:pointer;transition:border-color .15s,background .15s">🔴</button><button type="button" class="conf-btn" data-conf="2" onclick="App.selectConfidence(this)" title="Shaky — some gaps" style="font-size:1.4rem;padding:6px 10px;border-radius:8px;border:2px solid var(--color-border);background:var(--color-surface-hover);cursor:pointer;transition:border-color .15s,background .15s">🟡</button><button type="button" class="conf-btn selected" data-conf="3" onclick="App.selectConfidence(this)" title="Good — mostly clear" style="font-size:1.4rem;padding:6px 10px;border-radius:8px;border:2px solid var(--color-brand);background:rgba(79,70,229,0.12);cursor:pointer;transition:border-color .15s,background .15s">🟢</button><button type="button" class="conf-btn" data-conf="4" onclick="App.selectConfidence(this)" title="Nailed it — crystal clear" style="font-size:1.4rem;padding:6px 10px;border-radius:8px;border:2px solid var(--color-border);background:var(--color-surface-hover);cursor:pointer;transition:border-color .15s,background .15s">⚡</button></div><div style="font-size:.68rem;color:var(--text-muted);margin-top:5px">🔴 Lost · 🟡 Shaky · 🟢 Good · ⚡ Nailed it</div></div>
<div class="form-group"><label class="form-label">Focus ⭐</label><div class="star-rating" id="productivity-stars">${[1,2,3,4,5].map(i=>`<span class="star ${i<=4?'active':''}" data-val="${i}" onclick="App.setRating(${i})">⭐</span>`).join('')}</div></div>
<div class="form-group"><label class="form-label">Notes</label><input type="text" id="log-notes" class="form-input" placeholder="Quick note..."></div>`;
        this.openModal('modal-log');
    },
    // LOG VALIDATION — live hint update when user types in the custom duration field
    updateDurationHint(){
        const custom=document.getElementById('log-time-custom');
        const hint=document.getElementById('duration-hint');
        if(!hint||!custom)return;
        const val=parseInt(custom.value);
        if(!custom.value||isNaN(val)||val<=0){
            hint.style.display='none';
            return;
        }
        hint.style.display='block';
        if(val>=15){
            hint.style.color='var(--color-success)';
            hint.textContent='✓ Counts toward your streak';
        }else{
            hint.style.color='var(--color-warning)';
            hint.textContent='Sessions under 15 min won\'t count toward your streak';
        }
    },
    updateLogChapters(){const sId=document.getElementById('log-subject').value,s=this.getSubjectById(sId),sel=document.getElementById('log-chapter');sel.innerHTML='<option value="">Select</option>';if(s)s.chapters.forEach(c=>{sel.innerHTML+=`<option value="${c.id}">${c.name}</option>`})},
    // Custom subject pill grid in Log Session modal — mirrors the old <select onchange>
    // behavior (set hidden value + repopulate chapters) but supports inline SVG icons,
    // which native <option> elements cannot render.
    selectLogSubject(sId){
        document.getElementById('log-subject').value=sId;
        document.querySelectorAll('#log-subject-grid .log-subject-pill').forEach(p=>{p.classList.toggle('selected',p.dataset.sid===sId)});
        this.updateLogChapters();
    },
    selectTime(el){
        document.querySelectorAll('#time-chips .quick-chip').forEach(c=>c.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('log-time-custom').value='';
        // LOG VALIDATION — update hint immediately when a chip is clicked
        const hint=document.getElementById('duration-hint');
        if(hint){
            const mins=parseInt(el.dataset.min)||0;
            hint.style.display='block';
            if(mins>=15){
                hint.style.color='var(--color-success)';
                hint.textContent='✓ Counts toward your streak';
            }else{
                hint.style.color='var(--color-warning)';
                hint.textContent='Sessions under 15 min won\'t count toward your streak';
            }
        }
    },
    selectType(el){document.querySelectorAll('#type-chips .quick-chip').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')},
    setRating(v){document.querySelectorAll('#productivity-stars .star').forEach(s=>{s.classList.toggle('active',parseInt(s.dataset.val)<=v)})},
    selectConfidence(el){document.querySelectorAll('#confidence-chips .conf-btn').forEach(b=>{b.classList.remove('selected');b.style.borderColor='var(--color-border)';b.style.background='var(--color-surface-hover)'});el.classList.add('selected');el.style.borderColor='var(--color-brand)';el.style.background='rgba(79,70,229,0.12)'},

    saveStudyLog(){
        const sId=document.getElementById('log-subject').value,cId=document.getElementById('log-chapter').value,ct=document.getElementById('log-time-custom').value,st=document.querySelector('#time-chips .quick-chip.selected'),time=ct?parseInt(ct):(st?parseInt(st.dataset.min):0),type=document.querySelector('#type-chips .quick-chip.selected')?.dataset.type||'learning',rating=document.querySelectorAll('#productivity-stars .star.active').length,notes=document.getElementById('log-notes').value;
        const confBtn=document.querySelector('#confidence-chips .conf-btn.selected');
        const confidence=confBtn?parseInt(confBtn.dataset.conf):3;

        // LOG VALIDATION — STEP 1: covered note is required; block save if missing
        const coveredEl=document.getElementById('log-covered');
        const coveredErrorEl=document.getElementById('log-covered-error');
        const coveredNote=coveredEl?coveredEl.value.trim():'';
        if(!coveredNote){
            if(coveredErrorEl)coveredErrorEl.style.display='block';
            if(coveredEl)coveredEl.focus();
            return;
        }
        if(coveredErrorEl)coveredErrorEl.style.display='none';

        if(!sId){this.toast('Select subject','warning');return}
        if(!time||time<=0){this.toast('Select time','warning');return}

        // LOG VALIDATION — STEP 2: determine streak eligibility (>= 15 min)
        const streakEligible=time>=15;

        const sub=this.getSubjectById(sId),ch=cId?sub.chapters.find(c=>c.id===cId):null;
        // LOG VALIDATION — STEP 3: store coveredNote and streakEligible on the session object
        const _newSession={id:this.uid(),subjectId:sId,chapterId:cId||'',chapterName:ch?ch.name:'',subjectName:sub.name,date:this.today(),timeSpent:time,type,rating,notes,confidence,coveredNote,streakEligible,createdAt:Date.now()};
        this.state.sessions.push(_newSession);
        // Supabase fire-and-forget
        const _userId=window._supabaseUserId;
        if(_userId){
            DB.sessions.create({user_id:_userId,subject_id:sId,chapter_id:cId||null,time_spent:time,date:this.today(),type,rating,notes,confidence,covered_note:coveredNote,streak_eligible:streakEligible}).then(({data,error})=>{
                if(error){console.error('[DB] sessions.create:',error);return;}
                if(data&&data.id) _newSession.id=data.id;
            });
        }
        if(ch){
            // Write confidence back: take the min (worst) confidence seen across sessions for this chapter
            const chSessions=this.state.sessions.filter(s=>s.chapterId===cId&&s.confidence);
            ch.confidence=Math.min(...chSessions.map(s=>s.confidence));
            // P0-3: weak flag — 2+ sessions with confidence ≤ 2
            const weakSessions=chSessions.filter(s=>s.confidence<=2);
            if(weakSessions.length>=2)ch.weakFlag=true;
            if(ch.status==='not-started')ch.status='in-progress';
            // Write status, confidence, weak_flag back to DB — all confirmed columns
            const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
            if(_isUUID(ch.id)){
                DB.chapters.update(ch.id,{
                    status:ch.status,
                    confidence:ch.confidence??null,
                    weak_flag:ch.weakFlag??false,
                }).then(({error})=>{if(error)console.error('[DB] saveStudyLog chapters.update:',error);});
            }
        }
        if(type==='revision'&&ch){ch.revisionCount++;ch.revisionDates.push(this.today());if(ch.status==='completed')ch.status='revised';hapticsVibrate('success');this.addXP(15,'Revision');const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:ch.status,revision_count:ch.revisionCount,revision_dates:ch.revisionDates,completion_date:ch.completionDate||null}).then(({error})=>{if(error)console.error('[DB] saveStudyLog revision chapters.update:',error);});}}
        // LOG VALIDATION — STEP 4: pass streakEligible so short sessions are neutral, not misses
        this.recordStudyDay(streakEligible);
        this.addXP(10,'Session logged');
        const tm=this.getTodayMinutes();if(tm>=this.state.profile.dailyGoalMinutes){const pm=tm-time;if(pm<this.state.profile.dailyGoalMinutes){hapticsVibrate('streak');this.addXP(25,'Daily goal! 🎯');this.celebrate();this.showGoalHitBanner()}}
        hapticsVibrate('success');this.save();this.closeModal('modal-log');this.render();this.toast(`📖 ${this.formatMin(time)} logged!`,'success');
        this.dismissStreakReminder(false);
        if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
    },

    renderLog(){
        const el=document.getElementById('page-log'),ss=[...this.state.sessions].sort((a,b)=>b.date!==a.date?b.date.localeCompare(a.date):(b.createdAt||0)-(a.createdAt||0)),gr={};ss.forEach(s=>{if(!gr[s.date])gr[s.date]=[];gr[s.date].push(s)});
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${this.state.sessions.length} sessions • ${this.formatMin(this.state.sessions.reduce((a,s)=>a+s.timeSpent,0))}</p><button class="btn btn-primary" onclick="App.openQuickLog()">Log</button></div>`;
        if(ss.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></span><div class="empty-state-title">No sessions logged yet</div><div class="empty-state-desc">Every study session you log builds your streak, earns XP, and helps the AI Coach give you better advice.</div><button class="btn btn-primary" onclick="App.openQuickLog()">Log Your First Session</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Even 15 minutes counts!</div></div>`}
        else{Object.keys(gr).sort((a,b)=>b.localeCompare(a)).forEach(d=>{const dm=gr[d].reduce((a,s)=>a+s.timeSpent,0);h+=`<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><h3 style="font-size:.9rem;font-weight:600">${d===this.today()?'Today':d}</h3><span style="font-size:.78rem;color:var(--accent-light);font-weight:600">${this.formatMin(dm)}</span></div>${gr[d].map(s=>{const sub=this.getSubjectById(s.subjectId);const confMap={1:'🔴',2:'🟡',3:'🟢',4:'⚡'};const confEmoji=s.confidence?confMap[s.confidence]:'';return`<div class="plan-card" style="cursor:default"><div class="plan-emoji">${sub?this.renderSubjectIcon(sub,18):'?'}</div><div class="plan-info"><h4>${sub?sub.name:'?'} ${s.chapterName?'— '+s.chapterName:''}</h4><p>${s.type} ${'⭐'.repeat(s.rating||0)}</p></div><div style="text-align:right"><div class="plan-time">${this.formatMin(s.timeSpent)} ${confEmoji}</div><button class="ch-btn" style="margin-top:4px" onclick="App.deleteSession('${s.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`}).join('')}</div>`})}
        el.innerHTML=h;
    },
    deleteSession(id){if(!confirm('Delete?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.sessions.delete(id).then(({error})=>{if(error)console.error('[DB] sessions.delete:',error);});}this.state.sessions=this.state.sessions.filter(s=>s.id!==id);this.save();this.render()},

    // TASKS
    renderTasks(){
        const el=document.getElementById('page-tasks');const today=this.today();
        let todayTasks=this.state.tasks.filter(t=>t.date===today);
        // Carry forward incomplete tasks from yesterday
        const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const yStr=this.localDateStr(yesterday);
        const carryForward=this.state.tasks.filter(t=>t.date===yStr&&!t.done);
        if(carryForward.length>0){
            carryForward.forEach(t=>{if(!todayTasks.find(x=>x.text===t.text)){this.state.tasks.push({id:this.uid(),text:'⏩ '+t.text,done:false,date:today,createdAt:Date.now()});todayTasks=this.state.tasks.filter(x=>x.date===today)}});
            this.save();
        }
        const doneCount=todayTasks.filter(t=>t.done).length;
        const subs=this.state.subjects||[];
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${doneCount}/${todayTasks.length} done</p><div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" onclick="App.autoGenerateTasks()">Auto-Plan</button></div></div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Add Task</span></div><div style="display:flex;gap:8px;margin-bottom:8px"><input type="text" id="new-task" class="form-input" placeholder="e.g., Solve Ex 2.3..." style="flex:1" onkeydown="if(event.key==='Enter')App.addTask()"><button class="btn btn-primary btn-sm" onclick="App.addTask()">Add</button></div><div style="display:flex;gap:8px"><select id="new-task-subject" class="form-select" style="flex:1;font-size:.78rem;color:var(--text-muted);padding:6px 8px" onchange="App.updateNewTaskChapters()"><option value="">Subject (optional)</option>${subs.map(s=>`<option value="${s.id}">${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}</select><select id="new-task-chapter" class="form-select" style="flex:1;font-size:.78rem;color:var(--text-muted);padding:6px 8px"><option value="">Chapter (optional)</option></select></div></div>`;
        h+=`<div class="card"><div class="card-header"><span class="card-title">Today's Tasks</span></div>`;
        if(todayTasks.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div></span><div class="empty-state-title">No tasks for today</div><div class="empty-state-desc">Tasks help you stay focused on what matters. Add your own or let AI plan your day automatically.</div><button class="btn btn-primary" onclick="App.autoGenerateTasks()">Auto-Plan My Day</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Tip: Auto-Plan pulls from your overdue chapters and revisions</div></div>`}
        else{todayTasks.forEach(t=>{
            let pillHtml='';
            if(t.subjectId){
                const sub=this.getSubjectById(t.subjectId);
                if(sub){
                    const ch=t.chapterId?this.getChapter(t.subjectId,t.chapterId):null;
                    pillHtml=`<div style="margin-left:32px;margin-top:2px"><span style="display:inline-flex;align-items:center;gap:4px;font-size:.72rem;color:var(--text-muted);background:rgba(99,102,241,0.08);border-radius:6px;padding:2px 8px">${this.renderSubjectIcon(sub,12)} ${sub.name}${ch?' • '+ch.name:''}</span></div>`;
                }
            }
            h+=`<div class="task-item-wrap"><div class="task-item"><div class="task-check ${t.done?'done':''}" onclick="App.toggleTask('${t.id}')">${t.done?'✓':''}</div><span class="task-text ${t.done?'done':''}">${t.text}</span><button class="ch-btn" onclick="App.deleteTask('${t.id}')" style="width:24px;height:24px;font-size:.7rem">✕</button></div>${pillHtml}</div>`;
        })}
        h+='</div>';el.innerHTML=h;
    },
    // Populates the chapter dropdown in the Add Task row when a subject is chosen.
    updateNewTaskChapters(){
        const sId=document.getElementById('new-task-subject').value;
        const sel=document.getElementById('new-task-chapter');
        const s=this.getSubjectById(sId);
        sel.innerHTML='<option value="">Chapter (optional)</option>'+(s?s.chapters.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''):'');
    },
    addTask(){
        const inp=document.getElementById('new-task');const text=inp.value.trim();if(!text)return;
        const subSel=document.getElementById('new-task-subject');
        const chSel=document.getElementById('new-task-chapter');
        const subjectId=subSel&&subSel.value?subSel.value:null;
        const chapterId=chSel&&chSel.value?chSel.value:null;
        const _t={id:this.uid(),text,done:false,date:this.today(),createdAt:Date.now(),subjectId,chapterId};
        this.state.tasks.push(_t);
        const _tUid=window._supabaseUserId;
        if(_tUid){
            DB.tasks.create({user_id:_tUid,text,done:false,date:this.today(),subject_id:subjectId,chapter_id:chapterId}).then(({data,error})=>{
                if(error){console.error('[DB] tasks.create:',error);return;}
                if(data&&data.id)_t.id=data.id;
            });
        }
        this.save();inp.value='';
        if(subSel)subSel.value='';
        if(chSel)chSel.innerHTML='<option value="">Chapter (optional)</option>';
        this.renderTasks();this.toast('Task added','success')
    },
    toggleTask(id){
        const t=this.state.tasks.find(x=>x.id===id);if(!t)return;
        t.done=!t.done;
        if(t.done){hapticsVibrate('light');this.addXP(5,'Task completed');}
        const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        const _tuUid=window._supabaseUserId;
        if(_tuUid&&_isUUID(t.id)){
            DB.tasks.update(t.id,{done:t.done}).then(({error})=>{if(error)console.error('[DB] tasks.update:',error);});
        }
        // Task completion is a weaker signal than an actual logged session or
        // Pomodoro, so this writes a separate task_touched_date column instead
        // of overloading last_studied_date (which Pomodoro/session-complete
        // writes to — see ~line 3407). Does NOT touch chapter status.
        if(t.done&&t.chapterId){
            const ch=this.getChapter(t.subjectId,t.chapterId);
            if(ch)ch.taskTouchedDate=this.today();
            if(_isUUID(t.chapterId)){
                DB.chapters.update(t.chapterId,{task_touched_date:this.today()}).then(({error})=>{if(error)console.error('[DB] toggleTask chapters.update task_touched_date:',error);});
            }
        }
        this.save();this.renderTasks();this.checkDailyChallenges()
    },
    deleteTask(id){const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.tasks.delete(id).then(({error})=>{if(error)console.error('[DB] tasks.delete:',error);});}this.state.tasks=this.state.tasks.filter(t=>t.id!==id);this.save();this.renderTasks()},
    autoGenerateTasks(){const tasks=[];const od=this.getOverdueChapters();od.slice(0,2).forEach(c=>tasks.push(`📌 Complete: ${c.subjectGlyph} ${c.name}`));const rd=this.getRevisionsDue();rd.slice(0,2).forEach(c=>tasks.push(`🔄 Revise: ${c.subjectGlyph} ${c.name}`));const pending=this.getAllChapters().filter(c=>c.status==='in-progress');pending.slice(0,2).forEach(c=>tasks.push(`📖 Continue: ${c.subjectGlyph} ${c.name}`));if(tasks.length===0)tasks.push('📚 Study for '+this.formatMin(this.state.profile.dailyGoalMinutes));const _agUid=window._supabaseUserId;tasks.forEach(t=>{if(!this.state.tasks.some(x=>x.text===t&&x.date===this.today())){const _at={id:this.uid(),text:t,done:false,date:this.today(),createdAt:Date.now()};this.state.tasks.push(_at);if(_agUid){DB.tasks.create({user_id:_agUid,text:t,done:false,date:this.today()}).then(({data,error})=>{if(error){console.error('[DB] auto tasks.create:',error);return;}if(data&&data.id)_at.id=data.id;});}}});this.save();this.renderTasks();this.toast('Tasks auto-generated! 🤖','success')},

    // --- END OF PART 1 --- (continued in Part 2)
    // The following methods are defined in Part 2:
    // renderExams, openExamModal, saveExamScore, renderRevisions,
    // renderDoubts, openDoubtModal, saveDoubt, renderResources, openResourceModal, saveResource,
    // renderWeekly, renderPomodoro, startPomodoro, pausePomodoro, resetPomodoro,
    // skipPomodoro, pomodoroComplete, updatePomodoroSetting, startStopwatch, startStopwatchTimer,
    // stopStopwatch, renderNotes, addNote (modal version), saveNoteFromModal, deleteNote,
    // renderCoach, getCoachMessage, renderRewards, renderSettings,
    // handleSearch, openModal, closeModal, openAddChapterModal, saveChapter, saveSubject, pickColor,
    // exportData, importData, resetAll, toast, celebrate,
    // openStreakModal, renderStreakModal, _calcBestStreak, _buildStreakCalendar
        // EXAMS
    renderExams(){
        const el=document.getElementById('page-exams');const scores=this.state.examScores||[];
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${scores.length} exams logged</p><button class="btn btn-primary" onclick="App.openExamModal()">+ Log Score</button></div>`;
        if(scores.length>0){
            const avg=Math.round(scores.reduce((a,e)=>a+(e.scored/e.total*100),0)/scores.length);
            const best=Math.round(Math.max(...scores.map(e=>e.scored/e.total*100)));
            const worst=Math.round(Math.min(...scores.map(e=>e.scored/e.total*100)));
            h+=`<div class="grid grid-4" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><h3>${avg}%</h3><p>Average</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg></div><div class="stat-info"><h3>${best}%</h3><p>Best score</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(239,68,68,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg></div><div class="stat-info"><h3>${worst}%</h3><p>Lowest</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><div class="stat-info"><h3>${scores.length}</h3><p>Tests taken</p></div></div></div>`;
            // Score trends by subject
            const bySub={};scores.forEach(e=>{if(!bySub[e.subjectId])bySub[e.subjectId]=[];bySub[e.subjectId].push(e)});
            h+=`<div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Score Trends by Subject</span></div>`;
            Object.entries(bySub).forEach(([sId,exams])=>{
                const sub=this.getSubjectById(sId);if(!sub)return;
                const latest=exams[exams.length-1];const pct=Math.round(latest.scored/latest.total*100);
                const prevPct=exams.length>1?Math.round(exams[exams.length-2].scored/exams[exams.length-2].total*100):null;
                const trend=prevPct!==null?(pct>prevPct?'↑':'↓'):'';
                h+=`<div class="subject-progress"><div class="sp-header"><span class="sp-name">${this.renderSubjectIcon(sub,14)} ${sub.name} ${trend}</span><span class="sp-pct" style="color:${pct>=80?'var(--text-success)':pct>=50?'var(--text-warning)':'var(--text-danger)'}">${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${sub.color}"></div></div>${prevPct!==null?`<p style="font-size:.68rem;color:var(--text-muted);margin-top:2px">Previous: ${prevPct}% → Current: ${pct}% (${pct-prevPct>=0?'+':''}${pct-prevPct}%)</p>`:''}</div>`;
            });
            h+='</div>';
            // Target vs actual
            if(this.state.profile.targetScore){
                h+=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${avg>=this.state.profile.targetScore?'var(--success)':'var(--warning)'}"><div class="card-header"><span class="card-title">Target vs Actual</span></div><p style="font-size:.9rem">Target: <strong>${this.state.profile.targetScore}%</strong> | Average: <strong style="color:${avg>=this.state.profile.targetScore?'var(--text-success)':'var(--text-danger)'}">${avg}%</strong> ${avg>=this.state.profile.targetScore?'On track!':'Needs improvement'}</p></div>`;
            }
        }
        h+=`<div class="card"><div class="card-header"><span class="card-title">All Scores</span></div>`;
        if(scores.length===0)h+='<p style="color:var(--text-muted);font-size:.85rem">No scores yet. Log your first exam!</p>';
        else{[...scores].reverse().forEach(e=>{const sub=this.getSubjectById(e.subjectId);const pct=Math.round(e.scored/e.total*100);h+=`<div class="rev-item"><div class="rev-info"><h4>${sub?this.renderSubjectIcon(sub,14):''} ${e.name}</h4><p>${sub?sub.name:''} • ${e.date} • ${e.scored}/${e.total}</p></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:.85rem;font-weight:700;color:${pct>=80?'var(--text-success)':pct>=50?'var(--text-warning)':'var(--text-danger)'}">${pct}%</span><button class="ch-btn" onclick="App.deleteExam('${e.id}')" style="width:24px;height:24px;font-size:.65rem"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`})}
        h+='</div>';el.innerHTML=h;
    },
    openExamModal(){
        const subs=this.state.subjects;
        document.getElementById('exam-form-body').innerHTML=`<div class="form-group"><label class="form-label">Exam Name</label><input type="text" id="exam-name" class="form-input" placeholder="e.g., Unit Test 3"></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="exam-subject">${subs.map(s=>`<option value="${s.id}">${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Date</label><input type="date" id="exam-date" class="form-input" value="${this.today()}"></div></div><div class="form-row"><div class="form-group"><label class="form-label">Marks Obtained</label><input type="number" id="exam-scored" class="form-input" placeholder="28" min="0"></div><div class="form-group"><label class="form-label">Total Marks</label><input type="number" id="exam-total" class="form-input" placeholder="40" min="1"></div></div>`;
        this.openModal('modal-exam');
    },
    saveExamScore(){
        const name=document.getElementById('exam-name').value.trim(),sId=document.getElementById('exam-subject').value,date=document.getElementById('exam-date').value,scored=parseInt(document.getElementById('exam-scored').value),total=parseInt(document.getElementById('exam-total').value);
        if(!name||isNaN(scored)||isNaN(total)||total<=0){this.toast('Fill all fields correctly','warning');return}
        if(scored>total){this.toast('Scored cannot exceed total','warning');return}
        const _ne={id:this.uid(),name,subjectId:sId,date,scored,total,createdAt:Date.now()};
        this.state.examScores.push(_ne);
        const _esUid=window._supabaseUserId;
        if(_esUid){DB.examScores.create({user_id:_esUid,subject_id:sId||null,name,scored,total,date}).then(({data,error})=>{if(error){console.error('[DB] examScores.create:',error);return;}if(data&&data.id)_ne.id=data.id;});}
        this.save();this.closeModal('modal-exam');this.render();this.addXP(10,'Exam logged');
        const pct=Math.round(scored/total*100);
        this.toast(`📝 ${name}: ${scored}/${total} (${pct}%)`,'success');
        this.checkDailyChallenges();
    },
    deleteExam(id){if(!confirm('Delete exam score?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.examScores.delete(id).then(({error})=>{if(error)console.error('[DB] examScores.delete:',error);});}this.state.examScores=this.state.examScores.filter(e=>e.id!==id);this.save();this.render()},

    // REVISIONS
    renderRevisions(){
        const el=document.getElementById('page-revisions'),rd=this.getRevisionsDue(),ac=this.getAllChapters(),rc=ac.filter(c=>c.revisionCount>0);
        const totalRevisions=ac.reduce((a,c)=>a+c.revisionCount,0);
        el.innerHTML=`<div class="grid grid-3" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></div><div class="stat-info"><h3>${rd.length}</h3><p>Due now</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3>${rc.length}</h3><p>Revised</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><h3>${totalRevisions}</h3><p>Total revisions</p></div></div></div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Due Now</span></div>${rd.length===0?'<p style="color:var(--text-muted);font-size:.85rem">All clear — nothing due today</p>':rd.map(c=>`<div class="rev-item"><div class="rev-info"><h4>${c.subjectIcon} ${c.name}</h4><p>${c.subjectName} • ${c.daysSince}d ago • Rev #${c.revisionCount}</p></div><button class="btn btn-sm btn-primary" onclick="App.quickRevision('${c.subjectId}','${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> Revise</button></div>`).join('')}</div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Revision History</span></div>${rc.length===0?'<p style="color:var(--text-muted);font-size:.85rem">No revisions yet</p>':rc.sort((a,b)=>b.revisionCount-a.revisionCount).slice(0,15).map(c=>`<div class="rev-item"><div class="rev-info"><h4>${c.subjectIcon} ${c.name}</h4><p>${c.subjectName} • ${c.revisionCount} revision${c.revisionCount>1?'s':''} • Last: ${c.revisionDates[c.revisionDates.length-1]||'N/A'}</p></div><span class="tag tag-revised">×${c.revisionCount}</span></div>`).join('')}</div><div class="card" style="border-left:3px solid var(--info)"><div class="card-header"><span class="card-title">Spaced Repetition Schedule</span></div><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.7"><p>Rev 1: <strong>1 day</strong> after completion</p><p>Rev 2: <strong>3 days</strong> after Rev 1</p><p>Rev 3: <strong>7 days</strong> after Rev 2</p><p>Rev 4: <strong>14 days</strong> after Rev 3</p><p>Rev 5: <strong>30 days</strong> after Rev 4</p></div></div>`;
    },

    // DOUBTS
    renderDoubts(){
        const el=document.getElementById('page-doubts');const doubts=this.state.doubts||[];
        const unresolved=doubts.filter(d=>d.status==='unresolved');
        const asked=doubts.filter(d=>d.status==='asked');
        const understood=doubts.filter(d=>d.status==='understood');
        let h=`<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:18px"><button class="btn btn-primary" onclick="App.openDoubtModal()" style="width:100%;justify-content:center">+ Add Doubt</button><div class="grid grid-3" style="gap:10px"><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(239,68,68,0.12);width:36px;height:36px;font-size:1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">${unresolved.length}</h3><p>Unresolved</p></div></div><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(245,158,11,0.12);width:36px;height:36px;font-size:1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">${asked.length}</h3><p>Asked</p></div></div><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(16,185,129,0.12);width:36px;height:36px;font-size:1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">${understood.length}</h3><p>Understood</p></div></div></div></div>`;

        const renderDoubtList=(title,list,emoji)=>{
            if(list.length===0)return'';
            let html=`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">${emoji} ${title} (${list.length})</span></div>`;
            list.forEach(d=>{
                const sub=this.getSubjectById(d.subjectId);
                html+=`<div class="doubt-item"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h4>${d.text}</h4><p>${sub?this.renderSubjectIcon(sub,12)+' '+sub.name:''} ${d.chapter?'• '+d.chapter:''} ${d.priority==='must-clear'?'<span class="tag tag-hard" style="margin-left:4px">Must Clear</span>':''}</p></div><span class="tag tag-${d.status}">${d.status}</span></div><div class="doubt-actions">${d.status==='unresolved'?`<button class="btn btn-sm btn-warning" onclick="App.updateDoubtStatus('${d.id}','asked')">Asked Teacher</button>`:''} ${d.status!=='understood'?`<button class="btn btn-sm btn-success" onclick="App.updateDoubtStatus('${d.id}','understood')">Understood</button>`:''}<button class="ch-btn" onclick="App.deleteDoubt('${d.id}')" style="width:28px;height:28px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`;
            });
            html+='</div>';return html;
        };

        h+=renderDoubtList('Unresolved',unresolved,'🔴');
        h+=renderDoubtList('Asked Teacher',asked,'🟡');
        h+=renderDoubtList('Understood',understood,'🟢');

        if(doubts.length===0){
            h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div></span><div class="empty-state-title">No doubts logged — good sign!</div><div class="empty-state-desc">When you're confused about something, log it here. Your AI Coach can help explain it and you'll never forget to revisit a tricky concept.</div><button class="btn btn-primary" onclick="App.openDoubtModal()">+ Log a Doubt</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Clearing doubts before boards is critical — don't skip this</div></div>`;
        }
        el.innerHTML=h;
    },
    openDoubtModal(){
        // Navigate to the Doubts page first so whatever the user was doing
        // (e.g. browsing Subjects) lands them on the full doubts list —
        // unresolved/asked/understood + stats — with the add form layered
        // on top. Doubts has no permanent nav tab; this is its only entry
        // point besides search, by design.
        if(this.state.currentPage!=='doubts')this.navigate('doubts');
        const subs=this.state.subjects;
        document.getElementById('doubt-form-body').innerHTML=`<div class="form-group"><label class="form-label">Doubt / Topic</label><input type="text" id="doubt-text" class="form-input" placeholder="e.g., I don't understand trigonometric identities proof"></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="doubt-subject"><option value="">Select</option>${subs.map(s=>`<option value="${s.id}">${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Chapter (optional)</label><input type="text" id="doubt-chapter" class="form-input" placeholder="e.g., Trigonometry"></div></div><div class="form-group"><label class="form-label">Priority</label><div class="quick-log"><div class="quick-chip selected" data-priority="must-clear" onclick="App.pickDoubtPriority(this)">🔴 Must Clear Before Exam</div><div class="quick-chip" data-priority="nice-to-know" onclick="App.pickDoubtPriority(this)">🟡 Nice to Know</div></div></div>`;
        this.openModal('modal-doubt');
    },
    pickDoubtPriority(el){document.querySelectorAll('#doubt-form-body .quick-chip').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')},
    saveDoubt(){
        const text=document.getElementById('doubt-text').value.trim();
        if(!text){this.toast('Enter your doubt','warning');return}
        const sId=document.getElementById('doubt-subject').value;
        const chapter=document.getElementById('doubt-chapter').value.trim();
        const priority=document.querySelector('#doubt-form-body .quick-chip.selected')?.dataset.priority||'must-clear';
        const _nd={id:this.uid(),text,subjectId:sId,chapter,priority,status:'unresolved',createdAt:Date.now(),resolvedDate:null};
        this.state.doubts.push(_nd);
        const _duUid=window._supabaseUserId;
        if(_duUid){DB.doubts.create({user_id:_duUid,subject_id:sId||null,text,status:'unresolved'}).then(({data,error})=>{if(error){console.error('[DB] doubts.create:',error);return;}if(data&&data.id)_nd.id=data.id;});}
        this.save();this.closeModal('modal-doubt');this.render();
        // Already on the Doubts page (navigated there on open), so the new
        // doubt is immediately visible in the list — no further redirect needed.
        this.toast('❓ Doubt added','success');
    },
    updateDoubtStatus(id,status){
        const d=this.state.doubts.find(x=>x.id===id);if(!d)return;
        d.status=status;
        if(status==='understood'){d.resolvedDate=this.today();hapticsVibrate('light');this.addXP(10,'Doubt cleared! 🧠')}
        const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        if(_isUUID(d.id)){DB.doubts.update(d.id,{status}).then(({error})=>{if(error)console.error('[DB] doubts.update status:',error);});}
        this.save();this.render();
        this.toast(status==='understood'?'✅ Doubt cleared!':'🙋 Status updated','success');
        this.checkDailyChallenges();
    },
    deleteDoubt(id){if(!confirm('Delete doubt?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.doubts.delete(id).then(({error})=>{if(error)console.error('[DB] doubts.delete:',error);});}this.state.doubts=this.state.doubts.filter(d=>d.id!==id);this.save();this.render()},

    // RESOURCES
    renderResources(){
        const el=document.getElementById('page-resources');const resources=this.state.resources||[];
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${resources.length} resources saved</p><button class="btn btn-primary" onclick="App.openResourceModal()">+ Add Resource</button></div>`;
        if(resources.length===0){
            h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></div></span><div class="empty-state-title">No resources saved yet</div><div class="empty-state-desc">Save YouTube videos, PDFs, and websites here so you never lose a good study resource mid-session.</div><button class="btn btn-primary" onclick="App.openResourceModal()">+ Save First Resource</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Great resources: NCERT PDFs, PW videos, Khan Academy</div></div>`;
        }else{
            const bySub={};resources.forEach(r=>{const k=r.subjectId||'general';if(!bySub[k])bySub[k]=[];bySub[k].push(r)});
            Object.entries(bySub).forEach(([sId,rs])=>{
                const sub=this.getSubjectById(sId);
                h+=`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">${sub?this.renderSubjectIcon(sub,16)+' '+sub.name:'General'}</span></div>`;
                rs.forEach(r=>{
                    const typeIcons={youtube:'🎬',pdf:'📄',website:'🌐',other:'📎'};
                    h+=`<div class="resource-item"><span style="font-size:1.3rem">${typeIcons[r.type]||'📎'}</span><div style="flex:1;min-width:0"><h4 style="font-size:.85rem;font-weight:600">${r.title}</h4><a href="${r.url}" target="_blank" rel="noopener" style="font-size:.78rem;color:var(--accent-light);word-break:break-all">${r.url.substring(0,60)}${r.url.length>60?'...':''}</a>${r.chapter?`<p style="font-size:.7rem;color:var(--text-muted)">Ch: ${r.chapter}</p>`:''}</div><button class="ch-btn" onclick="App.deleteResource('${r.id}')" style="flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div>`;
                });
                h+='</div>';
            });
        }
        el.innerHTML=h;
    },
    openResourceModal(){
        const subs=this.state.subjects;
        document.getElementById('resource-form-body').innerHTML=`<div class="form-group"><label class="form-label">Title</label><input type="text" id="res-title" class="form-input" placeholder="e.g., Best Electricity chapter video"></div><div class="form-group"><label class="form-label">URL / Link</label><input type="url" id="res-url" class="form-input" placeholder="https://youtube.com/..."></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="res-subject"><option value="">General</option>${subs.map(s=>`<option value="${s.id}">${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="res-type"><option value="youtube">YouTube</option><option value="pdf">PDF</option><option value="website">Website</option><option value="other">📎 Other</option></select></div></div><div class="form-group"><label class="form-label">Chapter (optional)</label><input type="text" id="res-chapter" class="form-input" placeholder="e.g., Electricity"></div>`;
        this.openModal('modal-resource');
    },
    saveResource(){
        const title=document.getElementById('res-title').value.trim();
        const url=document.getElementById('res-url').value.trim();
        if(!title||!url){this.toast('Enter title and URL','warning');return}
        const _nr={id:this.uid(),title,url,subjectId:document.getElementById('res-subject').value,type:document.getElementById('res-type').value,chapter:document.getElementById('res-chapter').value.trim(),createdAt:Date.now()};
        this.state.resources.push(_nr);
        const _rUid=window._supabaseUserId;
        if(_rUid){DB.resources.create({user_id:_rUid,title,url,type:_nr.type,subject_id:_nr.subjectId||null}).then(({data,error})=>{if(error){console.error('[DB] resources.create:',error);return;}if(data&&data.id)_nr.id=data.id;});}
        this.save();this.closeModal('modal-resource');this.render();this.toast('🔗 Resource saved!','success');this.checkBadges();
    },
    deleteResource(id){if(!confirm('Delete resource?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.resources.delete(id).then(({error})=>{if(error)console.error('[DB] resources.delete:',error);});}this.state.resources=this.state.resources.filter(r=>r.id!==id);this.save();this.render()},

    // SPRINT PLANNER (helper, currently unused — formerly powered the removed Planning page)
    // P2-2: Generate 3-week day-by-day sprint plan
    generateSprintPlan(){
        const dte=this.getDaysToExam();
        if(dte===null||dte>21||dte<=0)return null;
        const days=Math.min(dte,21);
        // Priority order: weak > overdue > hard pending > medium pending > easy pending
        const allCh=this.getAllChapters();
        const pending=allCh.filter(c=>c.status!=='completed'&&c.status!=='revised');
        const revisionDue=this.getRevisionsDue();

        // Build ordered pool
        const pool=[];
        // 1. Weak flagged chapters (re-study)
        pending.filter(c=>c.weakFlag).forEach(c=>pool.push({...c,sprintReason:'🚨 Weak chapter'}));
        // 2. Overdue chapters
        const overdue=this.getOverdueChapters();
        overdue.forEach(c=>{if(!pool.find(p=>p.id===c.id))pool.push({...c,sprintReason:'Overdue'})});
        // 3. Hard pending not yet covered
        pending.filter(c=>c.difficulty==='hard'&&!pool.find(p=>p.id===c.id)).forEach(c=>pool.push({...c,sprintReason:'🔥 Hard topic'}));
        // 4. Medium pending
        pending.filter(c=>c.difficulty==='medium'&&!pool.find(p=>p.id===c.id)).forEach(c=>pool.push({...c,sprintReason:'📖 Pending'}));
        // 5. Easy pending
        pending.filter(c=>c.difficulty==='easy'&&!pool.find(p=>p.id===c.id)).forEach(c=>pool.push({...c,sprintReason:'📖 Pending'}));

        // Build day plan — roughly 1–2 chapters per day spread across days
        const chaptersPerDay=Math.max(1,Math.ceil(pool.length/days));
        const plan=[];
        for(let i=0;i<days;i++){
            const d=new Date();d.setDate(d.getDate()+i);
            const dateStr=this.localDateStr(d);
            const dayLabel=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
            const isWeekend=d.getDay()===0||d.getDay()===6;
            const chapters=pool.splice(0,isWeekend?Math.min(3,chaptersPerDay+1):chaptersPerDay);
            // Add revisions due on this day (if any)
            const revs=revisionDue.filter(c=>{
                const lr=c.revisionDates&&c.revisionDates.length>0?c.revisionDates[c.revisionDates.length-1]:c.completionDate;
                if(!lr)return false;
                const daysSince=this.daysBetween(lr,dateStr);
                return daysSince===0;
            });
            plan.push({date:dateStr,label:dayLabel,isWeekend,chapters,revisions:revs,isToday:dateStr===this.today()});
            if(pool.length===0)break;
        }
        return{days:plan,totalChapters:allCh.filter(c=>c.status!=='completed'&&c.status!=='revised').length,coveredInSprint:plan.reduce((a,d)=>a+d.chapters.length,0)};
    },

    // WEEKLY / ANALYTICS
    renderWeekly(){
        const el=document.getElementById('page-weekly'),wk=this.getWeekSessions(),ws=wk.sessions,tm=ws.reduce((a,s)=>a+s.timeSpent,0),ds=new Set(ws.map(s=>s.date)).size;
        const dd=wk.days.map(d=>({date:d,minutes:ws.filter(s=>s.date===d).reduce((a,s)=>a+s.timeSpent,0)})),mx=Math.max(1,...dd.map(d=>d.minutes));
        const sb={};ws.forEach(s=>{sb[s.subjectId]=(sb[s.subjectId]||0)+s.timeSpent});

        // Monthly comparison
        const now=new Date();const thisMonth=now.getMonth(),thisYear=now.getFullYear();
        const lm=thisMonth===0?11:thisMonth-1;const lmYear=thisMonth===0?thisYear-1:thisYear;
        const tmSessions=this.state.sessions.filter(s=>{const d=new Date(s.date);return d.getMonth()===thisMonth&&d.getFullYear()===thisYear});
        const lmSessions=this.state.sessions.filter(s=>{const d=new Date(s.date);return d.getMonth()===lm&&d.getFullYear()===lmYear});
        const tmMin=tmSessions.reduce((a,s)=>a+s.timeSpent,0);
        const lmMin=lmSessions.reduce((a,s)=>a+s.timeSpent,0);
        const monthChange=lmMin>0?Math.round((tmMin-lmMin)/lmMin*100):0;

        // Best study time (productivity patterns)
        const hourBuckets={};this.state.sessions.forEach(s=>{const h=new Date(s.createdAt).getHours();hourBuckets[h]=(hourBuckets[h]||0)+s.timeSpent});
        const bestHour=Object.entries(hourBuckets).sort((a,b)=>b[1]-a[1])[0];

        // Best day of week
        const dayBuckets={0:0,1:0,2:0,3:0,4:0,5:0,6:0};
        this.state.sessions.forEach(s=>{const d=new Date(s.date+'T12:00').getDay();dayBuckets[d]+=s.timeSpent});
        const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const bestDay=Object.entries(dayBuckets).sort((a,b)=>b[1]-a[1])[0];

        // Average session length
        const avgSession=this.state.sessions.length>0?Math.round(this.state.sessions.reduce((a,s)=>a+s.timeSpent,0)/this.state.sessions.length):0;

        // Subject balance for radar visual
        const allSubTime={};this.state.sessions.forEach(s=>{allSubTime[s.subjectId]=(allSubTime[s.subjectId]||0)+s.timeSpent});
        const totalAllTime=Object.values(allSubTime).reduce((a,b)=>a+b,0)||1;

        // Pacing Forecast (moved from former Planning page — Predicted Completion block)
        const pred=this.getPredictedCompletion();
        const dte=this.getDaysToExam();
        let pacingForecastHTML='';
        if(pred&&dte!==null){
            // Compare daysNeeded directly against dte — avoids date-string roundtrip precision loss.
            // remaining is already baked into pred.daysNeeded by getPredictedCompletion().
            const remaining=this.getTotalChapters()-this.getCompletedCount();
            const neededPace=dte>0?Math.round((remaining/dte)*10)/10:Infinity;
            const daysAhead=dte-pred.daysNeeded; // positive = finishing before exam
            // Severity: green = on track, amber = gap ≤14 days, red = gap >14 days
            let borderColor,statusColor,statusMsg;
            if(pred.daysNeeded<=dte){
                borderColor='var(--success)';statusColor='var(--text-success)';
                const buffer=dte-pred.daysNeeded;
                statusMsg=`Finishing ${buffer} day${buffer!==1?'s':''} before your exam — keep this pace.`;
            } else {
                const daysBehind=pred.daysNeeded-dte;
                const paceGap=Math.round((neededPace-pred.rate)*10)/10;
                if(daysBehind<=14){
                    borderColor='var(--warning)';statusColor='var(--text-warning)';
                    statusMsg=`${paceGap} more ch/day closes the gap. Minor adjustment needed.`;
                } else {
                    borderColor='var(--danger)';statusColor='var(--text-danger)';
                    statusMsg=`${paceGap} more ch/day needed — ${daysBehind} days behind. Consider daily study bursts.`;
                }
            }
            pacingForecastHTML=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${borderColor}"><div class="card-header"><span class="card-title">Pacing Forecast</span></div><p style="font-size:.9rem">At current pace (<strong>${pred.rate} ch/day</strong>), you'll finish by <strong>${pred.date}</strong> (${pred.daysNeeded} days).</p><p style="font-size:.82rem;margin-top:6px;color:${statusColor}">${statusMsg}</p>${dte>0?`<p style="font-size:.78rem;color:var(--text-muted);margin-top:4px">Need: <strong>${neededPace} ch/day</strong> to finish by exam.</p>`:''}</div>`;
        }


        // ── Study Consistency Heatmap ─────────────────────────────────────────────
        const heatmapDayMap={};
        this.state.sessions.forEach(s=>{
            const ld=new Date(s.date+'T12:00').toLocaleDateString('en-CA');
            heatmapDayMap[ld]=(heatmapDayMap[ld]||0)+s.timeSpent;
        });
        const heatToday=new Date();heatToday.setHours(0,0,0,0);
        const day90=new Date(heatToday);day90.setDate(day90.getDate()-89);
        // Roll back to Sunday of the week containing day90
        const gridStart=new Date(day90);gridStart.setDate(gridStart.getDate()-gridStart.getDay());
        // Build flat day list (gridStart → today)
        const heatDays=[];
        for(let d=new Date(gridStart);d<=heatToday;d.setDate(d.getDate()+1)){
            const lbl=d.toLocaleDateString('en-CA');
            heatDays.push({lbl,mins:heatmapDayMap[lbl]||0,pre:d<day90,today:lbl===this.today()});
        }
        // Pad tail to Saturday so grid is full columns
        while(heatDays.length%7!==0)heatDays.push({lbl:'',mins:0,pre:true,today:false});
        // Chunk into weeks
        const heatWeeks=[];
        for(let i=0;i<heatDays.length;i+=7)heatWeeks.push(heatDays.slice(i,i+7));
        // Layout: use a fixed viewBox but scale with width:100%
        // Day labels on left, month labels on top, cells fill the rest
        const DL=22; // day-label col width
        const MT=20; // month-label row height
        const CG=3;  // gap between cells
        // Target ~600px viewBox width so it scales nicely
        const NUM_WEEKS=heatWeeks.length;
        const CS=Math.max(10,Math.floor((560-DL-CG*(NUM_WEEKS-1))/NUM_WEEKS)); // cell size, min 10
        const VB_W=DL+NUM_WEEKS*(CS+CG)-CG;
        const VB_H=MT+7*(CS+CG)-CG;
        // Colour scale
        const hCV=m=>m<=0?'var(--color-surface-hover)':m<30?'color-mix(in srgb,var(--accent) 25%,transparent)':m<60?'color-mix(in srgb,var(--accent) 60%,transparent)':'var(--accent)';
        // Month labels — track which months we've already shown to avoid duplicates
        const mNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const shownMonths=new Set();
        const mLabelsSVG=heatWeeks.map((wk,wi)=>{
            // find first real (non-pre) day in this week
            const firstReal=wk.find(d=>d.lbl&&!d.pre);
            if(!firstReal)return'';
            const dt=new Date(firstReal.lbl+'T12:00');
            const mo=dt.getMonth();
            // show label on the week that contains the 1st, or the very first visible week
            if(dt.getDate()>7&&wi>0)return'';
            if(shownMonths.has(mo))return'';
            shownMonths.add(mo);
            const x=DL+wi*(CS+CG);
            return`<text x="${x}" y="${MT-6}" font-size="10" fill="var(--text-muted)" font-family="inherit" font-weight="500">${mNames[mo]}</text>`;
        }).join('');
        // Day-of-week labels — ALL 7, alternating opacity for clean look
        const dLabels=['S','M','T','W','T','F','S'];
        const dLabelsSVG=dLabels.map((n,i)=>{
            const y=MT+i*(CS+CG)+CS/2;
            const op=i%2===0?'1':'0.45'; // Sun/Tue/Thu/Sat full, Mon/Wed/Fri dimmed
            return`<text x="${DL-4}" y="${y}" font-size="9" fill="var(--text-muted)" text-anchor="end" dominant-baseline="middle" font-family="inherit" opacity="${op}">${n}</text>`;
        }).join('');
        // Cells
        const cellsSVG=heatWeeks.map((wk,wi)=>wk.map((c,di)=>{
            const x=DL+wi*(CS+CG);
            const y=MT+di*(CS+CG);
            const fill=c.pre?'var(--color-surface-hover)':hCV(c.mins);
            const op=c.pre?'0.25':'1';
            const ring=c.today?`<rect x="${x-1.5}" y="${y-1.5}" width="${CS+3}" height="${CS+3}" rx="${CS/4+1}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>`:'';
            const attrs=c.lbl&&!c.pre?` data-lbl="${c.lbl}" data-mins="${c.mins}"`:' ';
            return`${ring}<rect${attrs} class="heat-cell" x="${x}" y="${y}" width="${CS}" height="${CS}" rx="${Math.max(2,CS/4)}" fill="${fill}" opacity="${op}"/>`;
        }).join('')).join('');
        const studiedDays90=Object.keys(heatmapDayMap).filter(d=>{const dt=new Date(d+'T12:00');return dt>=day90&&dt<=heatToday}).length;
        const heatmapHTML=`<div class="card" style="margin-bottom:20px">
            <div class="card-header" style="margin-bottom:12px">
                <span class="card-title">Study Consistency</span>
                <span style="font-size:.75rem;color:var(--text-muted);margin-left:auto">${studiedDays90} of 90 days</span>
            </div>
            <div style="overflow-x:auto">
                <svg id="heat-svg" viewBox="0 0 ${VB_W} ${VB_H}" width="100%" style="display:block;min-width:${Math.min(VB_W,320)}px">
                    ${mLabelsSVG}${dLabelsSVG}${cellsSVG}
                    <g id="heat-tip" style="display:none;pointer-events:none">
                        <rect id="heat-tip-bg" rx="5" fill="var(--color-surface)" stroke="var(--color-border)" stroke-width="1"/>
                        <text id="heat-tip-txt" font-size="10" fill="var(--text-primary)" font-family="inherit" font-weight="600"/>
                    </g>
                </svg>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:10px">
                <span style="font-size:.7rem;color:var(--text-muted)">Less</span>
                <svg width="11" height="11"><rect width="11" height="11" rx="2" fill="var(--color-surface-hover)" stroke="var(--color-border)" stroke-width="1"/></svg>
                <svg width="11" height="11"><rect width="11" height="11" rx="2" fill="color-mix(in srgb,var(--accent) 25%,transparent)"/></svg>
                <svg width="11" height="11"><rect width="11" height="11" rx="2" fill="color-mix(in srgb,var(--accent) 60%,transparent)"/></svg>
                <svg width="11" height="11"><rect width="11" height="11" rx="2" fill="var(--accent)"/></svg>
                <span style="font-size:.7rem;color:var(--text-muted)">More</span>
                <span style="font-size:.7rem;color:var(--text-muted);margin-left:4px">· None / &lt;30m / 30–60m / 60m+</span>
            </div>
        </div>`;
        // ── END heatmap ───────────────────────────────────────────────────────

        // P2-3: Honest weekly report — shown every Sunday, or any day if triggered
        const isSunday=new Date().getDay()===0;
        const reportDismissed=localStorage.getItem('weekly_report_dismissed')===this.today();
        let weeklyReportHTML='';
        if(true){
            // Last week sessions (7–14 days ago)
            const lastWeekStart=new Date();lastWeekStart.setDate(lastWeekStart.getDate()-14);
            const lastWeekEnd=new Date();lastWeekEnd.setDate(lastWeekEnd.getDate()-7);
            const lwSessions=this.state.sessions.filter(s=>{const d=new Date(s.date);return d>=lastWeekStart&&d<lastWeekEnd});
            const lwMin=lwSessions.reduce((a,s)=>a+s.timeSpent,0);
            // BUG 2 FIX: count distinct chapters with sessions this week.
            // Previous code checked c.completionDate which is undefined for Supabase-loaded
            // chapters (Supabase returns completion_date snake_case, never mapped to camelCase).
            // Sessions are always populated and correctly date-stamped at log time.
            const thisWeekChapters=new Set(wk.sessions.filter(s=>s.chapterId).map(s=>s.chapterId)).size;
            const lastWeekChapters=this.getAllChapters().filter(c=>{if(!c.completionDate)return false;const d=new Date(c.completionDate);const lws=new Date();lws.setDate(lws.getDate()-14);const lwe=new Date();lwe.setDate(lwe.getDate()-7);return d>=lws&&d<lwe}).length;
            // Weakest chapter this week (lowest avg confidence)
            const chConfMap={};ws.forEach(s=>{if(s.chapterId&&s.confidence){if(!chConfMap[s.chapterId])chConfMap[s.chapterId]={name:s.chapterName,sub:s.subjectName,total:0,count:0};chConfMap[s.chapterId].total+=s.confidence;chConfMap[s.chapterId].count++}});
            const chConfs=Object.values(chConfMap).map(c=>({...c,avg:c.total/c.count}));
            const weakest=chConfs.sort((a,b)=>a.avg-b.avg)[0];
            // Derive a data-driven recommendation (no AI)
            let rec='';
            const weakChaps=this.getAllChapters().filter(c=>c.weakFlag);
            const overdue=this.getOverdueChapters();
            const revsDue=this.getRevisionsDue();
            if(weakest&&weakest.avg<=2)rec=`Re-study "${weakest.name}" — your confidence was low all week. One focused session can turn this around.`;
            else if(overdue.length>0)rec=`You have ${overdue.length} overdue chapter${overdue.length>1?'s':''} (${overdue[0].name}${overdue.length>1?'…':''}). Clear at least one this week.`;
            else if(revsDue.length>0)rec=`${revsDue.length} chapter${revsDue.length>1?'s are':' is'} due for revision. Revising within the spaced interval locks in memory.`;
            else if(ds<4)rec=`You studied only ${ds} day${ds!==1?'s':''} this week. Aim for 5+ days — consistency beats long cramming sessions.`;
            else rec=`Solid week! Keep it up. Next: focus on completing a whole subject before boards.`;
            const timeVsLast=lwMin>0?Math.round((tm-lwMin)/lwMin*100):null;
            weeklyReportHTML=`<div class="card" style="margin-bottom:20px;border-left:3px solid var(--accent)">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
                    <span class="card-title">Weekly Report</span>
                    <button onclick="this.closest('.card').style.display='none'" title="Hide" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:2px 4px;border-radius:4px;line-height:1">×</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px">
                    <div style="text-align:center;padding:10px;background:var(--color-surface-hover);border-radius:8px">
                        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">${this.formatMin(tm)}</div>
                        <div style="font-size:.65rem;color:var(--text-muted)">Time this week</div>
                        ${timeVsLast!==null?`<div style="font-size:.65rem;font-weight:600;color:${timeVsLast>=0?'var(--text-success)':'var(--text-danger)'}">${timeVsLast>=0?'▲':'▼'} ${Math.abs(timeVsLast)}% vs last week</div>`:''}
                    </div>
                    <div style="text-align:center;padding:10px;background:var(--color-surface-hover);border-radius:8px">
                        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">${thisWeekChapters}</div>
                        <div style="font-size:.65rem;color:var(--text-muted)">Chapters done</div>
                        ${lastWeekChapters>0?`<div style="font-size:.65rem;font-weight:600;color:${thisWeekChapters>=lastWeekChapters?'var(--text-success)':'var(--text-danger)'}">${thisWeekChapters>=lastWeekChapters?'▲':'▼'} vs ${lastWeekChapters} last week</div>`:''}
                    </div>
                    <div style="text-align:center;padding:10px;background:var(--color-surface-hover);border-radius:8px">
                        <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary)">${ds}/7</div>
                        <div style="font-size:.65rem;color:var(--text-muted)">Days studied</div>
                        <div style="font-size:.65rem;font-weight:600;color:${ds>=5?'var(--text-success)':ds>=3?'var(--text-warning)':'var(--text-danger)'}">${ds>=5?'Consistent ✅':ds>=3?'Almost there':`${ds}/7 days — aim for 5+`}</div>
                    </div>
                </div>
                ${weakest?`<div style="margin-bottom:10px;padding:8px 10px;background:rgba(239,68,68,0.07);border-radius:6px;font-size:.78rem"><span style="color:var(--text-danger);font-weight:600">📉 Weakest chapter: </span>${weakest.name} <span style="color:var(--text-muted)">(${weakest.sub})</span> — avg confidence ${['','🔴','🟡','🟢','⚡'][Math.round(weakest.avg)]||'🔴'}</div>`:''}
                <div style="padding:10px;background:rgba(79,70,229,0.07);border-radius:6px;font-size:.8rem;line-height:1.5"><span style="font-weight:600;color:var(--accent-light)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Recommendation: </span>${rec}</div>
            </div>`;
        }
        el.innerHTML=heatmapHTML+weeklyReportHTML+`<div class="grid grid-4" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3>${this.formatMin(tm)}</h3><p>This week</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><h3>${ds}/7</h3><p>Days studied</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><h3>${this.formatMin(tmMin)}</h3><p>This month</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><h3>${avgSession}m</h3><p>Avg session</p></div></div></div>
        ${pacingForecastHTML}
        <div class="grid grid-2" style="margin-bottom:20px"><div class="card"><div class="card-header"><span class="card-title">Daily Study Time</span></div><div style="padding-top:4px">${(()=>{
            const BW=24,BG=8,CHARTW=7*(BW+BG)-BG,CHARTH=96,LABH=18,VALH=14;
            const SVG_H=CHARTH+LABH+VALH+8;
            const bars=dd.map((d,i)=>{
                const pc=mx>0?d.minutes/mx:0;
                const bh=Math.max(pc>0?3:0,Math.round(pc*CHARTH));
                const x=i*(BW+BG);
                const dn=['S','M','T','W','T','F','S'][new Date(d.date+'T12:00').getDay()];
                const isToday=d.date===this.today();
                const fill=isToday?'var(--accent)':pc>0?'color-mix(in srgb,var(--accent) 35%,transparent)':'var(--color-surface-hover)';
                const valTxt=d.minutes>0?`<text x="${x+BW/2}" y="${VALH+CHARTH-bh-5}" text-anchor="middle" font-size="9" fill="${isToday?'var(--accent)':'var(--text-muted)'}" font-family="inherit" font-weight="600">${this.formatMin(d.minutes)}</text>`:'';
                const bar=`<rect x="${x}" y="${VALH+CHARTH-bh}" width="${BW}" height="${Math.max(bh,2)}" rx="4" fill="${fill}"/>`;
                const lbl=`<text x="${x+BW/2}" y="${VALH+CHARTH+14}" text-anchor="middle" font-size="10" fill="${isToday?'var(--accent)':'var(--text-muted)'}" font-family="inherit" font-weight="${isToday?'700':'400'}">${dn}</text>`;
                return valTxt+bar+lbl;
            }).join('');
            return`<svg viewBox="0 0 ${7*(BW+BG)-BG} ${SVG_H}" width="100%" height="${SVG_H}" style="display:block">${bars}</svg>`;
        })()}</div></div><div class="card"><div class="card-header"><span class="card-title">Subject Split — This Week</span></div>${Object.keys(sb).length===0?'<p style="color:var(--text-muted)">No data this week</p>':Object.entries(sb).sort((a,b)=>b[1]-a[1]).map(([sId,min])=>{const sub=this.getSubjectById(sId);if(!sub)return'';const pc=Math.round(min/tm*100);return`<div class="subject-progress"><div class="sp-header"><span class="sp-name">${this.renderSubjectIcon(sub,14)} ${sub.name}</span><span class="sp-pct" style="color:${sub.color}">${this.formatMin(min)} (${pc}%)</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pc}%;background:${sub.color}"></div></div></div>`}).join('')}</div></div>
        <div class="grid grid-2" style="margin-bottom:20px"><div class="card"><div class="card-header"><span class="card-title">Monthly Comparison</span></div><p style="font-size:.9rem;margin-bottom:12px">This month: <strong style="color:var(--text-primary)">${this.formatMin(tmMin)}</strong></p><p style="font-size:.9rem;margin-bottom:12px">Last month: <strong style="color:var(--text-primary)">${this.formatMin(lmMin)}</strong></p><p style="font-size:.85rem;color:${tmMin>=lmMin?'var(--text-success)':'var(--text-danger)'};font-weight:600">${tmMin>=lmMin?'↑':'↓'} ${monthChange>=0?'+':''}${monthChange}% ${tmMin>=lmMin?'vs last month':'below last month'}</p></div><div class="card"><div class="card-header"><span class="card-title">Productivity Patterns</span></div><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem">🕐</span> Best time: <strong style="color:var(--text-primary)">${bestHour?bestHour[0]+':00':'--'}</strong></p><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span> Best day: <strong style="color:var(--text-primary)">${bestDay?dayNames[bestDay[0]]:'--'}</strong></p><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Avg session: <strong style="color:var(--text-primary)">${avgSession}m</strong></p></div></div>
        <div class="card" id="subbal-card">${(()=>{
            const swt=this.state.subjects.filter(s=>allSubTime[s.id]>0);
            if(!swt.length)return`<div class="card-header"><span class="card-title">Subject Balance — All Time</span></div><p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:20px">No sessions yet</p>`;
            const CX=90,CY=90,R=66,SW=20;
            const C=2*Math.PI*R;
            let off=0;
            const segs=[...swt].sort((a,b)=>(allSubTime[b.id]||0)-(allSubTime[a.id]||0)).map((s,i)=>{
                const m=allSubTime[s.id]||0,fr=m/totalAllTime,da=fr*C,ga=C-da;
                const seg={i,id:s.id,icon:this.renderSubjectIcon(s,14),name:s.name,color:s.color,m,fr,da,ga,off};
                off+=da;return seg;
            });
            const arcs=segs.map(sg=>`<circle class="sb-arc" data-i="${sg.i}" cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${sg.color}" stroke-width="${SW}" stroke-dasharray="${sg.da.toFixed(2)} ${sg.ga.toFixed(2)}" stroke-dashoffset="${(-sg.off+C/4).toFixed(2)}" style="cursor:pointer;transition:stroke-width .15s ease,opacity .15s ease"/>`).join('');
            const legend=segs.map(sg=>`<div class="sb-row" data-i="${sg.i}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background .12s ease"><span style="width:10px;height:10px;border-radius:3px;background:${sg.color};display:inline-block;flex-shrink:0"></span><span style="font-size:.78rem;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sg.icon} ${sg.name}</span><span style="font-size:.74rem;color:var(--text-muted)">${this.formatMin(sg.m)}</span><span style="font-size:.74rem;font-weight:700;color:${sg.color};min-width:30px;text-align:right">${Math.round(sg.fr*100)}%</span></div>`).join('');
            return`<div class="card-header"><span class="card-title">Subject Balance — All Time</span></div><div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap"><div style="position:relative;flex-shrink:0"><svg id="sb-svg" viewBox="0 0 180 180" width="180" height="180" style="overflow:visible">${arcs}<text id="donut-name" x="${CX}" y="${CY-8}" text-anchor="middle" font-size="10" fill="var(--text-secondary)" font-family="inherit"></text><text id="donut-pct" x="${CX}" y="${CY+10}" text-anchor="middle" font-size="18" fill="var(--text-primary)" font-family="inherit" font-weight="700"></text><text id="donut-time" x="${CX}" y="${CY+24}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="inherit"></text></svg></div><div id="sb-legend" style="flex:1;min-width:150px">${legend}</div></div>`;
        })()}</div>`;
        setTimeout(()=>{
            const svg=document.getElementById('sb-svg');const leg=document.getElementById('sb-legend');
            if(!svg||!leg)return;
            const arcs=[...svg.querySelectorAll('.sb-arc')];const rows=[...leg.querySelectorAll('.sb-row')];
            const nameEl=document.getElementById('donut-name');const pctEl=document.getElementById('donut-pct');const timeEl=document.getElementById('donut-time');
            const BASE_SW=20,HOV_SW=23;
            const on=idx=>{
                arcs.forEach((a,i)=>{a.setAttribute('stroke-width',i===idx?HOV_SW:BASE_SW);a.style.opacity=i===idx?'1':'0.35';});
                rows.forEach((r,i)=>{r.style.background=i===idx?`color-mix(in srgb,${arcs[i].getAttribute('stroke')} 10%,transparent)`:'';r.style.fontWeight=i===idx?'700':'';});
                const arc=arcs[idx],row=rows[idx];
                if(nameEl)nameEl.textContent=row?row.querySelector('span:nth-child(2)')?.textContent.trim().replace(/^\S+\s/,''):'';
                if(pctEl){pctEl.textContent=row?row.querySelector('span:last-child')?.textContent:'';pctEl.setAttribute('fill',arc.getAttribute('stroke'));}
                if(timeEl)timeEl.textContent=row?row.querySelector('span:nth-child(3)')?.textContent:'';
            };
            const off=()=>{
                arcs.forEach(a=>{a.setAttribute('stroke-width',BASE_SW);a.style.opacity='1';});
                rows.forEach(r=>{r.style.background='';r.style.fontWeight='';});
                if(nameEl)nameEl.textContent='';if(pctEl)pctEl.textContent='';if(timeEl)timeEl.textContent='';
            };
            arcs.forEach((a,i)=>{a.addEventListener('mouseenter',()=>on(i));a.addEventListener('mouseleave',off);});
            rows.forEach((r,i)=>{r.addEventListener('mouseenter',()=>on(i));r.addEventListener('mouseleave',off);});
        },0);
        // ── Heatmap cell tooltip ─────────────────────────────────────────────
        setTimeout(()=>{
            const hsvg=document.getElementById('heat-svg');
            if(!hsvg)return;
            const tip=hsvg.getElementById('heat-tip');
            const tipBg=hsvg.getElementById('heat-tip-bg');
            const tipTxt=hsvg.getElementById('heat-tip-txt');
            if(!tip||!tipBg||!tipTxt)return;
            const fmtDate=lbl=>{const[y,m,d]=lbl.split('-');const dt=new Date(+y,+m-1,+d);return dt.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});};
            const fmtMins=m=>m>=60?`${Math.floor(m/60)}h ${m%60>0?m%60+'m':''}`.trim():`${m}m`;
            hsvg.querySelectorAll('.heat-cell[data-lbl]').forEach(cell=>{
                cell.addEventListener('mouseenter',e=>{
                    const lbl=cell.getAttribute('data-lbl');
                    const mins=+cell.getAttribute('data-mins');
                    const txt=mins>0?`${fmtDate(lbl)} — ${fmtMins(mins)}`:`${fmtDate(lbl)} — No study`;
                    tipTxt.textContent=txt;
                    // measure text width
                    const tw=txt.length*5.8+16;
                    const th=22;
                    const cx=+cell.getAttribute('x');
                    const cy=+cell.getAttribute('y');
                    // keep inside SVG bounds
                    const svgVB=hsvg.viewBox&&hsvg.viewBox.baseVal;const svgW=svgVB?svgVB.width:(hsvg.getBoundingClientRect().width||400);
                    const tx=Math.min(cx,svgW-tw-4);
                    const ty=cy>30?cy-th-4:cy+16;
                    tipBg.setAttribute('x',tx);tipBg.setAttribute('y',ty);tipBg.setAttribute('width',tw);tipBg.setAttribute('height',th);
                    tipTxt.setAttribute('x',tx+8);tipTxt.setAttribute('y',ty+14);
                    tip.style.display='block';
                });
                cell.addEventListener('mouseleave',()=>{tip.style.display='none';});
            });
        },0);
    },

    // POMODORO + STOPWATCH
    renderPomodoro(){
        const el=document.getElementById('page-pomodoro'),p=this.pomodoro,set=this.state.pomodoroSettings;
        const mins=Math.floor(p.timeLeft/60),secs=p.timeLeft%60;
        const tt=(p.mode==='work'?set.workMin:(p.session%set.sessionsBeforeLong===0?set.longBreakMin:set.breakMin))*60;
        const prog=((tt-p.timeLeft)/tt)*100;
        const sw=this.state.stopwatch;

        // ── Build subject options for the focus-subject dropdown ──────────
        const subjectOpts=this.state.subjects.length>0
            ?this.state.subjects.map(s=>`<option value="${s.id}"${p.focusSubjectId===s.id?' selected':''}>${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')
            :'<option value="" disabled>No subjects added yet</option>';

        // ── Build chapter options, ordered: in_progress → not-started → completed/revised ──
        // Only rendered when a subject is selected.
        let chapterSelectHTML='';
        if(p.focusSubjectId){
            const focusSub=this.state.subjects.find(s=>s.id===p.focusSubjectId);
            if(focusSub&&focusSub.chapters.length>0){
                const ORDER={in_progress:0,'in-progress':0,not_started:1,'not-started':1,completed:2,revised:2};
                const sorted=[...focusSub.chapters].sort((a,b)=>(ORDER[a.status]??1)-(ORDER[b.status]??1));
                const chOpts=sorted.map(c=>`<option value="${c.id}"${p.focusChapterId===c.id?' selected':''}>${c.name}</option>`).join('');
                chapterSelectHTML=`<select id="focus-chapter" class="form-select" style="margin-bottom:8px" onchange="App.setFocusChapter(this.value)">${chOpts}</select>`;
            } else {
                chapterSelectHTML=`<select class="form-select" style="margin-bottom:8px" disabled><option>No chapters in this subject</option></select>`;
            }
        } else {
            chapterSelectHTML=`<select class="form-select" style="margin-bottom:8px" disabled><option>Select subject first</option></select>`;
        }

        // ── Warning shown below Start button when no chapter is selected ──
        const noChapterWarning=(!p.focusChapterId&&p.mode==='work')
            ?`<p style="font-size:.75rem;color:#f97316;margin-top:8px;text-align:center">⚠️ Chapter not selected — time won't be tracked to a chapter</p>`
            :'';

        el.innerHTML=`<div class="grid grid-2">

<div class="card">
  <div class="pomodoro-display">
    <svg width="200" height="200" viewBox="0 0 200 200" style="max-width:100%;height:auto">
      <circle class="pomodoro-ring" cx="100" cy="100" r="90" stroke="rgba(128,128,128,0.1)"/>
      <circle class="pomodoro-ring" cx="100" cy="100" r="90"
        stroke="${p.mode==='work'?'url(#pg)':'var(--success)'}"
        stroke-dasharray="${2*Math.PI*90}"
        stroke-dashoffset="${2*Math.PI*90*(1-prog/100)}"
        stroke-linecap="round"/>
      <defs><linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#8b5cf6"/>
      </linearGradient></defs>
    </svg>
    <div class="pomodoro-time">${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div>
    <div class="pomodoro-label">${p.mode==='work'?'Focus':'Break'} — Session ${p.session}</div>

    ${p.mode==='work'?`
    <div style="margin:14px 0 4px;text-align:left;width:100%;max-width:280px">
      <label class="form-label" style="font-size:.72rem;margin-bottom:4px">Subject</label>
      <select id="focus-subject" class="form-select" style="margin-bottom:8px"
        onchange="App.setFocusSubject(this.value)">
        <option value="" ${!p.focusSubjectId?'selected':''} disabled>Select subject</option>
        ${subjectOpts}
      </select>
      <label class="form-label" style="font-size:.72rem;margin-bottom:4px">Chapter</label>
      ${chapterSelectHTML}
    </div>
    `:''}

    <div class="pomodoro-controls">
      ${p.running
        ?`<button class="btn btn-secondary" onclick="App.pausePomodoro()">Pause</button>`
        :`<button class="btn btn-primary" onclick="App.startPomodoro()">▶ Start</button>`}
      <button class="btn btn-secondary" onclick="App.resetPomodoro()">↺</button>
      <button class="btn btn-ghost" onclick="App.skipPomodoro()">⏭</button>
    </div>
    ${noChapterWarning}
  </div>
</div>

<div class="card">
  <div class="card-header"><span class="card-title">Stopwatch</span></div>
  <div style="text-align:center;padding:20px">
    <div class="stopwatch-time">${this.formatSec(sw.elapsed||0)}</div>
    <p style="font-size:.8rem;color:var(--text-secondary);margin:12px 0">${sw.running?'Recording...':'Ready'}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      ${sw.running
        ?`<button class="btn btn-danger" onclick="App.stopStopwatch()">Stop &amp; Log</button>`
        :`<div style="width:100%">
            <select id="sw-subject" class="form-select" style="margin-bottom:8px">
              ${this.state.subjects.map(s=>`<option value="${s.id}">${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="App.startStopwatch()" style="width:100%">▶ Start Timer</button>
          </div>`}
    </div>
  </div>
  <hr style="border-color:var(--border);margin:16px 0">
  <div class="card-header"><span class="card-title">Pomodoro Settings</span></div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Focus (min)</label>
      <input type="number" class="form-input" value="${set.workMin}" min="1" max="120"
        onchange="App.updatePomodoroSetting('workMin',this.value)"></div>
    <div class="form-group"><label class="form-label">Break (min)</label>
      <input type="number" class="form-input" value="${set.breakMin}" min="1" max="30"
        onchange="App.updatePomodoroSetting('breakMin',this.value)"></div>
  </div>
  <div class="form-row">
    <div class="form-group"><label class="form-label">Long Break (min)</label>
      <input type="number" class="form-input" value="${set.longBreakMin}" min="1" max="60"
        onchange="App.updatePomodoroSetting('longBreakMin',this.value)"></div>
    <div class="form-group"><label class="form-label">Sessions before long</label>
      <input type="number" class="form-input" value="${set.sessionsBeforeLong}" min="2" max="8"
        onchange="App.updatePomodoroSetting('sessionsBeforeLong',this.value)"></div>
  </div>
</div>

</div>`;
    },

    // ── Focus Timer: subject/chapter selection handlers ─────────────────────
    // Called by the subject dropdown onchange. Resets chapter selection and re-renders.
    setFocusSubject(sId){
        this.pomodoro.focusSubjectId=sId||null;
        this.pomodoro.focusChapterId=null; // reset chapter whenever subject changes
        this.renderPomodoro();
        // Re-apply scroll position so the timer card stays in view
        const el=document.getElementById('focus-chapter');
        if(el)el.focus();
    },

    // Called by the chapter dropdown onchange. Just stores the ID.
    setFocusChapter(cId){
        this.pomodoro.focusChapterId=cId||null;
        this.renderPomodoro(); // re-render to clear/show the warning
    },
    startPomodoro(){if(this.pomodoro.running)return;this.pomodoro.running=true;this.pomodoro.interval=setInterval(()=>{this.pomodoro.timeLeft--;if(this.pomodoro.timeLeft<=0)this.pomodoroComplete();if(this.state.currentPage==='pomodoro')this.renderPomodoro()},1000);this.renderPomodoro()},
    pausePomodoro(){this.pomodoro.running=false;clearInterval(this.pomodoro.interval);this.renderPomodoro()},
    resetPomodoro(){this.pausePomodoro();this.pomodoro.timeLeft=(this.pomodoro.mode==='work'?this.state.pomodoroSettings.workMin:this.state.pomodoroSettings.breakMin)*60;this.renderPomodoro()},
    skipPomodoro(){this.pausePomodoro();this.pomodoroComplete()},
    pomodoroComplete(){
        this.pausePomodoro();
        const set=this.state.pomodoroSettings;

        if(this.pomodoro.mode==='work'){
            // ── Resolve which subject/chapter to attribute this session to ──
            // Prefer the explicitly-selected focus subject; fall back to subjects[0]
            // only when the user has not made any selection at all.
            const _pUid=window._supabaseUserId;
            const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
            const focusSub=this.pomodoro.focusSubjectId
                ?this.state.subjects.find(s=>s.id===this.pomodoro.focusSubjectId)
                :(this.state.subjects.length>0?this.state.subjects[0]:null);

            if(focusSub){
                // Look up the chapter object (may be null if none selected)
                const focusCh=this.pomodoro.focusChapterId
                    ?focusSub.chapters.find(c=>c.id===this.pomodoro.focusChapterId)||null
                    :null;

                // ── Write status + last_studied_date back to DB when Pomodoro completes ──
                if(focusCh){
                    if(focusCh.status==='not-started')focusCh.status='in-progress';
                    if(_isUUID(focusCh.id)){
                        DB.chapters.update(focusCh.id,{status:focusCh.status,last_studied_date:this.today()})
                            .then(({error})=>{if(error)console.error('[DB] pomodoro chapters.update:',error);});
                    }
                }

                // ── Build in-memory session record ────────────────────────
                const _pSess={
                    id:this.uid(),
                    subjectId:focusSub.id,
                    chapterId:focusCh?focusCh.id:'',
                    chapterName:focusCh?focusCh.name:'',
                    subjectName:focusSub.name,
                    date:this.today(),
                    timeSpent:set.workMin,
                    type:'focus_timer',
                    rating:5,
                    notes:`Pomodoro #${this.pomodoro.session}${focusCh?' — '+focusCh.name:''}`,
                    createdAt:Date.now()
                };
                this.state.sessions.push(_pSess);

                // ── Persist session to Supabase ───────────────────────────
                if(_pUid){
                    DB.sessions.create({
                        user_id:_pUid,
                        subject_id:focusSub.id,
                        chapter_id:focusCh&&_isUUID(focusCh.id)?focusCh.id:null,
                        time_spent:set.workMin,
                        date:this.today(),
                        type:'focus_timer',
                        rating:5,
                        notes:`Pomodoro #${this.pomodoro.session}${focusCh?' — '+focusCh.name:''}`
                    }).then(({data,error})=>{
                        if(error){console.error('[DB] pomodoro session:',error);return;}
                        if(data&&data.id)_pSess.id=data.id;
                    });
                }

                this.recordStudyDay();
                this.addXP(10,'Pomodoro done 🍅');
            }

            hapticsVibrate('success');
            this.toast(`🍅 Pomodoro #${this.pomodoro.session} done!`,'success');
            this.pomodoro.mode='break';
            this.pomodoro.timeLeft=(this.pomodoro.session%set.sessionsBeforeLong===0?set.longBreakMin:set.breakMin)*60;
        }else{
            hapticsVibrate('light');
            this.toast('Break over! Time to focus!','info');
            this.pomodoro.mode='work';
            this.pomodoro.session++;
            this.pomodoro.timeLeft=set.workMin*60;
        }
        this.save();this.renderPomodoro();this.checkDailyChallenges();
    },
    updatePomodoroSetting(k,v){this.state.pomodoroSettings[k]=parseInt(v)||1;if(!this.pomodoro.running&&k==='workMin'&&this.pomodoro.mode==='work')this.pomodoro.timeLeft=this.state.pomodoroSettings.workMin*60;this.save();this._syncFullProfile();},

    // Stopwatch
    startStopwatch(){const sId=document.getElementById('sw-subject')?.value;this.state.stopwatch={running:true,elapsed:0,subjectId:sId||'',chapterId:'',startTime:Date.now()};this.save();this.startStopwatchTimer();this.renderPomodoro()},
    startStopwatchTimer(){if(this.swInterval)clearInterval(this.swInterval);this.swInterval=setInterval(()=>{if(this.state.stopwatch.running){this.state.stopwatch.elapsed=Math.floor((Date.now()-this.state.stopwatch.startTime)/1000);if(this.state.currentPage==='pomodoro')this.renderPomodoro()}},1000)},
    stopStopwatch(){
        clearInterval(this.swInterval);const sw=this.state.stopwatch;const mins=Math.max(1,Math.round(sw.elapsed/60));
        if(sw.subjectId){const sub=this.getSubjectById(sw.subjectId);const _swSess={id:this.uid(),subjectId:sw.subjectId,chapterId:'',chapterName:'',subjectName:sub?sub.name:'Stopwatch',date:this.today(),timeSpent:mins,type:'learning',rating:4,notes:'Stopwatch session',createdAt:Date.now()};this.state.sessions.push(_swSess);const _swUid=window._supabaseUserId;if(_swUid){DB.sessions.create({user_id:_swUid,subject_id:sw.subjectId,chapter_id:null,time_spent:mins,date:this.today(),type:'learning',rating:4,notes:'Stopwatch session'}).then(({data,error})=>{if(error){console.error('[DB] stopwatch session:',error);return;}if(data&&data.id)_swSess.id=data.id;});}hapticsVibrate('success');this.recordStudyDay();this.addXP(10,'Stopwatch session');this.toast(`⏱ ${this.formatMin(mins)} logged!`,'success')}
        this.state.stopwatch={running:false,elapsed:0,subjectId:'',chapterId:''};this.save();this.render();
    },

    // NOTES (with modal)
    renderNotes(){
        const el=document.getElementById('page-notes');const notes=this.state.notes||[];
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${notes.length} notes</p><button class="btn btn-primary" onclick="App.openNoteModal()">+ Add Note</button></div>`;
        if(notes.length===0){
            h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div></span><div class="empty-state-title">No notes yet</div><div class="empty-state-desc">Save formulas, key concepts, and revision notes here. You can attach images and PDFs too.</div><button class="btn btn-primary" onclick="App.openNoteModal()">+ Write First Note</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Try saving the quadratic formula or Newton's laws first</div></div>`;
        }else{
            // Search notes
            h+=`<div class="form-group" style="margin-bottom:16px"><input type="text" class="form-input" placeholder="🔍 Search notes..." oninput="App.filterNotes(this.value)"></div><div id="notes-list">`;
            const bySub={};notes.forEach(n=>{const k=n.subjectId||'general';if(!bySub[k])bySub[k]=[];bySub[k].push(n)});
            Object.entries(bySub).forEach(([sId,ns])=>{
                const sub=this.getSubjectById(sId);
                h+=`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">${sub?this.renderSubjectIcon(sub,16)+' '+sub.name:'General'}</span></div>${ns.map(n=>{const ac=(n.attachments&&n.attachments.length)?n.attachments.length:0;return`<div class="plan-card" style="cursor:pointer" onclick="App.viewNote('${n.id}')"><div class="plan-info"><h4>${n.title} ${n.isFormula?' (Formula)':''} ${ac?`<span style="font-size:.68rem;background:rgba(99,102,241,0.15);color:var(--accent-light);padding:2px 6px;border-radius:8px;margin-left:4px">📎 ${ac}</span>`:''}</h4><p style="white-space:pre-wrap;margin-top:4px;font-size:.8rem;color:var(--text-secondary)">${n.content.substring(0,180)}${n.content.length>180?'...':''}</p></div><button class="ch-btn" onclick="event.stopPropagation();App.deleteNote('${n.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div>`}).join('')}</div>`;
            });
            h+='</div>';
        }
        el.innerHTML=h;
    },
    openNoteModal(editId){
        const subs=this.state.subjects;
        const existing=editId?(this.state.notes||[]).find(n=>n.id===editId):null;
        this._pendingAttachments=existing&&existing.attachments?[...existing.attachments]:[];
        const attachHtml=this._buildAttachPreviewHtml();
        document.getElementById('note-edit-body').innerHTML=`<div class="form-group"><label class="form-label">Title</label><input type="text" id="note-title" class="form-input" placeholder="e.g., Trigonometry Formulas" value="${existing?existing.title:''}"></div><div class="form-group"><label class="form-label">Content / Formulas</label><textarea class="form-textarea" id="note-content" placeholder="Write your notes, formulas, key concepts..." style="min-height:120px">${existing?existing.content:''}</textarea></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="note-subject"><option value="">General</option>${subs.map(s=>`<option value="${s.id}" ${existing&&existing.subjectId===s.id?'selected':''}>${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Type</label><div class="quick-log"><div class="quick-chip ${!existing||!existing.isFormula?'selected':''}" data-formula="false" onclick="App.pickNoteType(this)">📝 Notes</div><div class="quick-chip ${existing&&existing.isFormula?'selected':''}" data-formula="true" onclick="App.pickNoteType(this)">📐 Formula</div></div></div></div><div class="form-group"><label class="form-label">📎 Attachments <span style="font-size:.72rem;color:var(--text-muted)">(Images &amp; PDFs • max 4 MB each)</span></label><div class="attach-zone" id="attach-zone" onclick="document.getElementById('attach-file-input').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="App._handleAttachDrop(event)"><div style="font-size:1.8rem">📁</div><p>Click to upload or drag &amp; drop<br><span style="font-size:.7rem">JPG · PNG · GIF · WebP · PDF</span></p><input type="file" id="attach-file-input" accept="image/*,.pdf" multiple style="display:none" onchange="App._handleAttachFiles(this.files)"></div><div class="attach-preview" id="attach-preview">${attachHtml}</div></div>${editId?`<input type="hidden" id="note-edit-id" value="${editId}">`:''}`;
        document.querySelector('#modal-note-edit .modal-header h2').textContent=editId?'📓 Edit Note':'📓 Add Note';
        this.openModal('modal-note-edit');
    },
    _buildAttachPreviewHtml(){
        return (this._pendingAttachments||[]).map((a,i)=>
            a.type==='image'
            ?`<div class="attach-thumb"><img src="${a.data}" alt="${a.name}"><button class="attach-remove" onclick="App._removeNewAttach(${i})">×</button></div>`
            :`<div class="attach-thumb"><div class="pdf-thumb">📄<span>${a.name}</span></div><button class="attach-remove" onclick="App._removeNewAttach(${i})">×</button></div>`
        ).join('');
    },
    _removeNewAttach(i){
        this._pendingAttachments.splice(i,1);
        const p=document.getElementById('attach-preview');
        if(p)p.innerHTML=this._buildAttachPreviewHtml();
    },
    _handleAttachDrop(e){
        e.preventDefault();
        document.getElementById('attach-zone').classList.remove('drag-over');
        this._handleAttachFiles(e.dataTransfer.files);
    },
    _handleAttachFiles(files){
        if(!files||!files.length)return;
        const MAX=4*1024*1024;
        Array.from(files).forEach(file=>{
            if(file.size>MAX){this.toast(`${file.name} is too large (max 4 MB)`,'warning');return}
            const isPdf=file.type==='application/pdf';
            const isImg=file.type.startsWith('image/');
            if(!isPdf&&!isImg){this.toast('Only images and PDFs are supported','warning');return}
            const reader=new FileReader();
            reader.onload=e=>{
                this._pendingAttachments=this._pendingAttachments||[];
                this._pendingAttachments.push({type:isPdf?'pdf':'image',name:file.name,data:e.target.result});
                const p=document.getElementById('attach-preview');
                if(p)p.innerHTML=this._buildAttachPreviewHtml();
            };
            reader.readAsDataURL(file);
        });
    },
    pickNoteType(el){el.parentElement.querySelectorAll('.quick-chip').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')},
    saveNoteFromModal(){
        const title=document.getElementById('note-title').value.trim();
        const content=document.getElementById('note-content').value.trim();
        if(!title&&!content&&(!this._pendingAttachments||!this._pendingAttachments.length)){this.toast('Enter a title or content','warning');return}
        const subjectId=document.getElementById('note-subject').value;
        const isFormula=document.querySelector('#note-edit-body .quick-chip.selected')?.dataset.formula==='true';
        const editId=document.getElementById('note-edit-id')?.value;
        const attachments=this._pendingAttachments?[...this._pendingAttachments]:[];
        if(editId){
            const note=this.state.notes.find(n=>n.id===editId);
            if(note){note.title=title;note.content=content;note.subjectId=subjectId;note.isFormula=isFormula;note.attachments=attachments;note.updatedAt=Date.now();
            if(note.id){DB.notes.update(note.id,{title,content,subject_id:subjectId||null}).then(({error})=>{if(error)console.error('[DB] notes.update:',error);});}}
        }else{
            const _nn={id:this.uid(),title,content,subjectId,isFormula,attachments,createdAt:Date.now()};
            this.state.notes.push(_nn);
            const _nnUid=window._supabaseUserId;
            if(_nnUid){DB.notes.create({user_id:_nnUid,title,content,subject_id:subjectId||null}).then(({data,error})=>{if(error){console.error('[DB] notes.create:',error);return;}if(data&&data.id)_nn.id=data.id;});}
        }
        this._pendingAttachments=[];
        try{this.save();}catch(e){this.toast('⚠️ Storage full! Remove some attachments.','warning');return;}
        this.closeModal('modal-note-edit');this.renderNotes();
        this.toast(editId?'📓 Note updated!':'📓 Note saved!','success');
        this.checkBadges();this.checkDailyChallenges();
    },
    viewNote(id){
        const note=this.state.notes.find(n=>n.id===id);if(!note)return;
        const sub=this.getSubjectById(note.subjectId);
        const attachHtml=(note.attachments&&note.attachments.length)
            ?`<div style="margin-top:16px"><p style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">📎 Attachments (${note.attachments.length})</p><div class="note-attachments">${note.attachments.map((a,i)=>
                a.type==='image'
                ?`<div class="note-attach-item" onclick="App.openLightbox('${id}',${i})" title="${a.name}"><img src="${a.data}" alt="${a.name}"></div>`
                :`<div class="note-attach-item" onclick="App.openLightbox('${id}',${i})" title="${a.name}"><div class="note-attach-pdf">📄<span>${a.name}</span></div></div>`
            ).join('')}</div></div>`:'';
        document.getElementById('detail-body').innerHTML=`<div style="margin-bottom:14px">${sub?`<span class="tag" style="background:${sub.color}22;color:${sub.color}">${this.renderSubjectIcon(sub,14)} ${sub.name}</span>`:''} ${note.isFormula?'<span class="tag" style="background:rgba(99,102,241,0.12);color:var(--accent-light)">📐 Formula</span>':''}</div><h3 style="font-size:1.15rem;margin-bottom:14px">${note.title}</h3><div style="white-space:pre-wrap;font-size:.9rem;line-height:1.8;color:var(--text-secondary);background:var(--bg-card);padding:16px;border-radius:var(--radius-sm);border:1px solid var(--border)">${note.content||'<span style="opacity:.4">No text content</span>'}</div>${attachHtml}`;
        const noteFooterEl=document.getElementById('detail-footer');
        noteFooterEl.style.display='';
        noteFooterEl.innerHTML=`<button class="btn btn-secondary" onclick="App.closeModal('modal-detail')">Close</button><button class="btn btn-primary" onclick="App.closeModal('modal-detail');App.openNoteModal('${id}')">Edit</button>`;
        this.openModal('modal-detail');
    },
    openLightbox(noteId,attachIdx){
        const note=this.state.notes.find(n=>n.id===noteId);if(!note||!note.attachments)return;
        const a=note.attachments[attachIdx];if(!a)return;
        const overlay=document.getElementById('lb-overlay');
        const img=document.getElementById('lb-img');
        const pdf=document.getElementById('lb-pdf');
        if(a.type==='image'){img.src=a.data;img.style.display='';pdf.style.display='none';pdf.src=''}
        else{pdf.src=a.data;pdf.style.display='';img.style.display='none';img.src=''}
        overlay.classList.add('show');
        document.body.style.overflow='hidden';
    },
    closeLightbox(){
        document.getElementById('lb-overlay').classList.remove('show');
        document.getElementById('lb-img').src='';
        document.getElementById('lb-pdf').src='';
        document.body.style.overflow='';
    },
    deleteNote(id){if(!confirm('Delete note?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.notes.delete(id).then(({error})=>{if(error)console.error('[DB] notes.delete:',error);});}this.state.notes=this.state.notes.filter(n=>n.id!==id);this.save();this.renderNotes()},
    filterNotes(q){
        if(!q||q.length<2){if(this.state.currentPage==='notes')this.renderNotes();return}
        q=q.toLowerCase();
        const notes=(this.state.notes||[]).filter(n=>n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q));
        const container=document.getElementById('notes-list');
        if(!container)return;
        if(notes.length===0){container.innerHTML='<p style="color:var(--text-muted);text-align:center;padding:20px">No matching notes</p>';return}
        container.innerHTML=notes.map(n=>{
            const sub=this.getSubjectById(n.subjectId);
            return`<div class="plan-card" style="cursor:pointer;margin-bottom:6px" onclick="App.viewNote('${n.id}')"><div class="plan-info"><h4>${n.title} ${n.isFormula?' (Formula)':''}</h4><p style="font-size:.78rem;color:var(--text-muted)">${sub?this.renderSubjectIcon(sub,12)+' '+sub.name:'General'}</p></div></div>`;
        }).join('');
    },

    // AI COACH
    // ── AI COACH ──────────────────────────────────────────────
    GROQ_KEY:'',// key is now stored securely in Vercel environment variables
    coachHistory:[], // {role:'user'|'model', parts:[{text}]}

    buildCoachContext(){
        const p=this.state.profile;
        const cls = p.selectedClass || 10;
        const stream = p.selectedStream;
        const classLabel = stream ? `Class ${cls} ${stream}` : `Class ${cls}`;
        const tm=this.getTodayMinutes();
        const sp=this.getTotalChapters()>0?Math.round(this.getCompletedCount()/this.getTotalChapters()*100):0;
        const od=this.getOverdueChapters();
        const rd=this.getRevisionsDue();
        const ws=this.state.subjects.filter(s=>{const d=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;return s.chapters.length>0&&d/s.chapters.length<0.3});
        const udoubts=this.state.doubts.filter(d=>d.status==='unresolved');
        const todayMood=this.state.profile.moodHistory.find(m=>m.date===this.today());
        const dte=this.getDaysToExam();
        const recentSessions=this.state.sessions.slice(-5).map(s=>`${s.subjectName} - ${s.chapterName} (${s.timeSpent}min, ${s.type}${s.confidence?', conf:'+['','🔴','🟡','🟢','⚡'][s.confidence]:''})`).join('; ');
        const subjectProgress=this.state.subjects.map(s=>{
            const done=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
            return `${this.getSubjectGlyph(s)} ${s.name}: ${done}/${s.chapters.length} chapters`;
        }).join(', ');
        const weakChaps=this.getAllChapters().filter(c=>c.weakFlag);
        const todayCheckin=this.state.checkins&&this.state.checkins[this.today()];
        const recentCheckins=Object.values(this.state.checkins||{}).slice(-3).map(c=>`${c.date}: understood="${c.understood}", unclear="${c.unclear}"`).join('; ');

        return `You are a friendly, encouraging AI study coach for a CBSE ${classLabel} student. You know their real study data and give SHORT, specific, actionable advice. Be warm but concise — 2-4 sentences max unless asked for detail. Use emojis naturally. Never be generic.

STUDENT PROFILE:
- Name: ${p.name}
- Class: ${classLabel}
- Exam date: ${p.examDate||'not set'} (${dte!==null?dte+' days away':'date not set'})
- Daily goal: ${this.formatMin(p.dailyGoalMinutes)} | Studied today: ${this.formatMin(tm)}
- Study streak: ${p.streak} days
- Today's mood: ${todayMood?todayMood.mood:'not set'}
- Level: ${p.level} (${p.xp} XP)

SYLLABUS PROGRESS:
- Overall: ${sp}% complete (${this.getCompletedCount()}/${this.getTotalChapters()} chapters)
- By subject: ${subjectProgress}

URGENT ITEMS:
- Overdue chapters (${od.length}): ${od.slice(0,3).map(c=>c.name).join(', ')||'none'}
- Revisions due (${rd.length}): ${rd.slice(0,3).map(c=>c.name).join(', ')||'none'}
- Weak subjects (<30% done): ${ws.map(s=>s.name).join(', ')||'none'}
- Weak chapters (low confidence, flagged): ${weakChaps.slice(0,4).map(c=>c.name).join(', ')||'none'}
- Unresolved doubts (${udoubts.length}): ${udoubts.slice(0,3).map(d=>d.text).join('; ')||'none'}

RECENT STUDY SESSIONS: ${recentSessions||'none yet'}

END-OF-DAY REFLECTIONS (recent): ${recentCheckins||'none yet'}
${todayCheckin?`Today's check-in: understood="${todayCheckin.understood}", unclear="${todayCheckin.unclear}"`:''}

Answer only what the student asks. If they ask for a quiz, generate 3 CBSE-style MCQs on the topic with 4 options and the answer at the end. If they ask what to study, suggest specifically from their pending chapters. If there are unclear topics from recent check-ins, proactively offer to explain them.`;
    },

    async sendCoachMessage(){
        const input=document.getElementById('coach-input');
        const msg=input.value.trim();
        if(!msg)return;
        input.value='';
        input.style.height='auto';

        // Add user message to UI
        this.coachHistory.push({role:'user',parts:[{text:msg}]});
        this.renderChatMessages();
        this.scrollChat();

        // Show typing indicator
        document.getElementById('coach-typing').style.display='flex';
        this.scrollChat();

        try{
            const systemCtx=this.buildCoachContext();
            const messages=[
                {role:'system',content:systemCtx},
                ...this.coachHistory.map(m=>({
                    role:(m.role==='model'||m.role==='assistant')?'assistant':'user',
                    content:m.parts[0].text
                }))
            ];

            // Call our own Vercel serverless function — key is stored server-side
            const { data: { session: authSession } } = await window.supabase.auth.getSession();
            const res=await fetch('/api/chat',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    'Authorization': `Bearer ${authSession?.access_token || ''}`
                },
                body:JSON.stringify({messages})
            });
            const data=await res.json();
            if(data.error)throw new Error(data.error);
            const reply=data.reply||'Sorry, I could not respond. Try again!';
            // Always use role:'model' for coach replies (mapped to 'assistant' when sent to API)
            this.coachHistory.push({role:'model',parts:[{text:reply}]});
        }catch(e){
            // Always use role:'model' for coach replies (mapped to 'assistant' when sent to API)
            this.coachHistory.push({role:'model',parts:[{text:'⚠️ Could not connect to AI. Check your internet and try again. ('+e.message+')'}]});
        }

        document.getElementById('coach-typing').style.display='none';
        this.renderChatMessages();
        this.scrollChat();
    },

    coachIconSvg(){
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M47 18C32 12 20 22 26 34C12 35 10 52 22 56C11 68 24 82 34 74C40 86 49 80 47 68" />
            <path d="M53 18C68 12 80 22 74 34C88 35 90 52 78 56C89 68 76 82 66 74C60 86 51 80 53 68" />
            <circle cx="50" cy="42" r="8" />
            <path d="M35 68C35 53 65 53 65 68" />
        </svg>`;
    },

    renderChatMessages(){
        const container=document.getElementById('coach-messages');
        if(!container)return;
        container.innerHTML=this.coachHistory.map(m=>{
            const isUser=m.role==='user';
            const text=m.parts[0].text;
            // Simple markdown: **bold**, newlines
            const formatted=text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
            return`<div style="display:flex;gap:10px;margin-bottom:14px;${isUser?'flex-direction:row-reverse':''}">
                <div class="coach-chat-avatar ${isUser?'user':'bot'}">${isUser?'👤':this.coachIconSvg()}</div>
                <div style="max-width:78%;background:${isUser?'var(--gradient-1)':'var(--bg-card)'};border:1px solid ${isUser?'transparent':'var(--border)'};border-radius:${isUser?'14px 4px 14px 14px':'4px 14px 14px 14px'};padding:10px 14px;font-size:.85rem;line-height:1.6;color:${isUser?'#fff':'var(--text-primary)'}">
                    ${formatted}
                </div>
            </div>`;
        }).join('');
    },

    scrollChat(){
        const box=document.getElementById('coach-chat-box');
        if(box)setTimeout(()=>box.scrollTop=box.scrollHeight,50);
    },

    askQuickQuestion(q){
        const input=document.getElementById('coach-input');
        if(input){input.value=q;this.sendCoachMessage();}
    },

    renderCoach(){
        const el=document.getElementById('page-coach');
        const od=this.getOverdueChapters(),rd=this.getRevisionsDue();
        // BUG 1 FIX: totalRevisions = sum of chapter.revisionCount (same source as Revision Tracker)
        const totalRevisions=this.getAllChapters().reduce((a,c)=>a+c.revisionCount,0);
        const tm=this.getTodayMinutes();
        // BUG 3 FIX: guard against 0/undefined dailyGoalMinutes to prevent NaN/0% display
        const gm=this.state.profile.dailyGoalMinutes||120;
        const sp=this.getTotalChapters()>0?Math.round(this.getCompletedCount()/this.getTotalChapters()*100):0;
        const ws=this.state.subjects.filter(s=>{const d=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;return s.chapters.length>0&&d/s.chapters.length<0.3});
        const udoubtsCount=this.state.doubts.filter(d=>d.status==='unresolved').length;
        const todayMood=this.state.profile.moodHistory.find(m=>m.date===this.today());
        const plan=this.getTomorrowPlan();
        const dte=this.getDaysToExam();
        const goalPct=gm>0?Math.min(100,Math.round(tm/gm*100)):0;
        const suggestions=[];
        if(od.length>0)suggestions.push('My '+od.length+' overdue chapters — help me catch up');
        if(rd.length>0)suggestions.push('Plan my revisions for today');
        suggestions.push('What should I study right now?');
        if(ws.length>0)suggestions.push('How do I improve in '+ws[0].name+'?');
        suggestions.push('Quiz me on '+(this.getAllChapters().find(c=>c.status==='in-progress')?.name||'Electricity'));
        suggestions.push('How do I stay consistent?');
        el.innerHTML=`
<div class="coach-stat-strip">
    <div class="coach-stat-item"><div class="coach-stat-val">${sp}%</div><div class="coach-stat-lbl">Done</div></div>
    <div class="coach-stat-item"><div class="coach-stat-val ${od.length>0?'danger':''}">${od.length}</div><div class="coach-stat-lbl">Overdue</div></div>
    <div class="coach-stat-item"><div class="coach-stat-val">${totalRevisions}</div><div class="coach-stat-lbl">Revisions</div></div>
    <div class="coach-stat-item"><div class="coach-stat-val ${goalPct>=100?'success':''}">${goalPct}%</div><div class="coach-stat-lbl">Goal</div></div>
</div>
<div class="coach-card">
    <div class="coach-card-header">
        <div class="coach-avatar" aria-hidden="true">
            ${this.coachIconSvg()}
        </div>
        <div class="coach-title">AI Study Coach</div>
        <div class="coach-status-dot"></div>
        <button class="btn btn-sm btn-ghost" onclick="App.clearCoachHistory()" title="Clear chat" style="margin-left:4px;padding:4px 8px;min-height:unset"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
    </div>
    <div class="coach-chat-body" id="coach-chat-box">
        <div id="coach-messages"></div>
        <div id="coach-typing" style="display:none;align-items:center;gap:10px;margin-bottom:10px">
            <div class="coach-chat-avatar bot coach-typing-avatar">${this.coachIconSvg()}</div>
            <div style="background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:4px 14px 14px 14px;padding:10px 14px">
                <div style="display:flex;gap:4px;align-items:center"><span style="width:6px;height:6px;border-radius:50%;background:var(--color-brand);animation:blink 1s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--color-brand);animation:blink 1s .2s infinite"></span><span style="width:6px;height:6px;border-radius:50%;background:var(--color-brand);animation:blink 1s .4s infinite"></span></div>
            </div>
        </div>
    </div>
    <div class="coach-chips-row">
        ${suggestions.slice(0,4).map(s=>`<button class="coach-chip" onclick="App.askQuickQuestion('${s.replace(/'/g,"\\'")}')")">💬 ${s.length>38?s.slice(0,38)+'…':s}</button>`).join('')}
    </div>
    <div class="coach-input-row">
        <textarea id="coach-input" class="coach-textarea" placeholder="Ask anything…" rows="1"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();App.sendCoachMessage()}"
            oninput="this.style.height='auto';requestAnimationFrame(()=>{this.style.height=this.scrollHeight+'px'})"></textarea>
        <button class="coach-send-btn" onclick="App.sendCoachMessage()">➤</button>
    </div>
</div>
<div class="coach-drawer" id="coach-drawer">
    <div class="coach-drawer-toggle" onclick="App._toggleCoachDrawer()">
        <span class="coach-drawer-toggle-label">
            📋 Study Now &amp; Insights
            ${od.length>0||rd.length>0?`<span style="background:var(--color-danger);color:#fff;font-size:.6rem;font-weight:700;padding:1px 6px;border-radius:10px">${od.length+rd.length}</span>`:''}
        </span>
        <span class="coach-drawer-caret">▼</span>
    </div>
    <div class="coach-drawer-body">
        <div class="coach-drawer-section">
            <div class="coach-drawer-section-title">📖 Study Now</div>
            ${plan.slice(0,4).map(p=>`<div class="plan-card" onclick="App.openChapterDetail('${p.subjectId}','${p.id}')"><div class="plan-emoji">${p.subjectIcon}</div><div class="plan-info"><h4>${p.name}</h4><p>${p.subjectName} · ${p.reason}</p></div></div>`).join('')||'<p style="color:var(--text-muted);font-size:.82rem;padding:4px 0">All caught up!</p>'}
        </div>
        <div class="coach-drawer-section" style="border-top:1px solid var(--color-border);margin-top:12px">
            <div class="coach-drawer-section-title" style="padding-top:14px">Quick Insights</div>
            ${tm<gm?`<div class="coach-msg" style="border-color:var(--color-warning)"><h4>📖 ${this.formatMin(gm-tm)} left for goal</h4><p>Studied ${this.formatMin(tm)} today</p></div>`:`<div class="coach-msg" style="border-color:var(--color-success)"><h4>🎯 Daily goal hit!</h4><p>${this.formatMin(tm)} today 🔥</p></div>`}
            ${od.length>0?`<div class="coach-msg" style="border-color:var(--color-danger)"><h4>⚠️ ${od.length} overdue</h4><p>${od.slice(0,2).map(c=>c.name).join(', ')}</p></div>`:''}
            ${rd.length>0?`<div class="coach-msg" style="border-color:var(--color-brand)"><h4>🔄 ${rd.length} revisions due</h4><p>Spaced repetition builds memory</p></div>`:''}
            ${ws.length>0?`<div class="coach-msg" style="border-color:var(--text-muted)"><h4>📉 Weak subjects</h4><p>${ws.map(s=>s.name).join(', ')}</p></div>`:''}
            ${udoubtsCount>0?`<div class="coach-msg" style="border-color:var(--color-danger)"><h4>❓ ${udoubtsCount} unresolved doubts</h4><p>Clear these before they pile up</p></div>`:''}
            ${dte!==null&&dte>0?`<div class="coach-msg" style="border-color:var(--color-success)"><h4>📅 ${dte} days to boards</h4><p>Readiness: ${this.getReadinessScore()}%</p></div>`:''}
        </div>
        <div class="coach-drawer-section" style="border-top:1px solid var(--color-border);margin-top:12px">
            <div class="coach-drawer-section-title" style="padding-top:14px">Today's Mood</div>
            <div class="coach-mood-row">
                ${['🤩','😊','😐','😴','😤'].map(m=>`<button class="mood-btn ${todayMood?.mood===m?'selected':''}" onclick="App.setMood('${m}')">${m}</button>`).join('')}
            </div>
            ${todayMood?`<p style="font-size:.75rem;color:var(--text-muted)">${this.getMoodAdvice(todayMood.mood)}</p>`:''}
        </div>
    </div>
</div>`;
        this.renderChatMessages();
        this.scrollChat();
        if(this.coachHistory.length===0){
            const greeting='Hey '+this.state.profile.name+'! I\'m your AI study coach. I can see your real progress — '+this.getCompletedCount()+'/'+this.getTotalChapters()+' chapters done'+(od.length>0?', '+od.length+' overdue':'')+(rd.length>0?', '+rd.length+' revisions due':'')+'. What do you need help with today?';
            this.coachHistory.push({role:'model',parts:[{text:greeting}]});
            this.renderChatMessages();
        }
    },

    _toggleCoachDrawer(){
        const d=document.getElementById('coach-drawer');
        if(d)d.classList.toggle('open');
    },
    clearCoachHistory(){
        this.coachHistory=[];
        this.renderCoach();
    },

    getMoodAdvice(mood){
        const a={'🤩':'You\'re energized! Perfect time for hard topics like Trigonometry or Quadratic Equations! 🚀','😊':'Good mood! Balance new topics with revision. Productive day ahead! ✨','😐':'Feeling neutral? Start with something familiar, then tackle tougher topics. 📖','😴':'Take it easy — do light revision or watch a concept video. Rest matters! 💤','😤':'Feeling frustrated? Try solving practice problems — small wins help! 🧘'};
        return a[mood]||'Keep going! Every session counts! 💪';
    },

    generateWeeklyPlan(){
        const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
        const plan=[];
        const pending=this.getAllChapters().filter(c=>c.status!=='completed'&&c.status!=='revised');
        const revDue=this.getRevisionsDue();
        let pIdx=0,rIdx=0;
        days.forEach((dayName,di)=>{
            const items=[];
            if(pending[pIdx]){items.push({icon:pending[pIdx].subjectIcon,text:`${pending[pIdx].subjectName}: ${pending[pIdx].name}`,type:'New'});pIdx++}
            if(pending[pIdx]&&di<5){items.push({icon:pending[pIdx].subjectIcon,text:`${pending[pIdx].subjectName}: ${pending[pIdx].name}`,type:'New'});pIdx++}
            if(revDue[rIdx]){items.push({icon:'🔄',text:`Revise: ${revDue[rIdx].name}`,type:'Revision'});rIdx++}
            if(di>=5){items.push({icon:'📝',text:'Practice previous year papers',type:'Practice'})}
            if(items.length===0)items.push({icon:'📚',text:'Free study / Catch up',type:'Flexible'});
            plan.push({dayName,items});
        });
        return plan;
    },
    regenerateWeeklyPlan(){this.renderCoach();this.toast('📅 Plan refreshed!','info')},

    // REWARDS
    renderRewards(){
        const el=document.getElementById('page-rewards'),p=this.state.profile,c=this.xpForLevel(p.level-1),n=this.xpForLevel(p.level),pc=Math.min(100,((p.xp-c)/(n-c))*100),stats=this.getStats();
        el.innerHTML=`<div class="card" style="margin-bottom:20px;text-align:center;padding:30px"><div style="font-size:3.5rem;margin-bottom:10px">⚡</div><h2 style="font-size:2rem;font-weight:800;background:var(--gradient-1);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Level ${p.level}</h2><p style="color:var(--text-secondary);margin-bottom:16px">${p.xp} XP Total</p><div style="max-width:400px;margin:0 auto"><div class="progress-bar" style="height:14px;border-radius:7px"><div class="progress-fill" style="width:${pc}%;background:var(--gradient-1)"></div></div><p style="font-size:.78rem;color:var(--text-muted);margin-top:8px">${p.xp-c} / ${n-c} XP to Level ${p.level+1}</p></div></div><div class="grid grid-4" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg></div><div class="stat-info"><h3>${p.streak}</h3><p>Day Streak</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg></div><div class="stat-info"><h3>${this.state.earnedBadges.length}/${this.BADGES.length}</h3><p>Badges</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="stat-info"><h3>${stats.totalSessions}</h3><p>Sessions</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3>${this.formatMin(stats.totalMinutes)}</h3><p>Total Study Time</p></div></div></div><div class="card"><div class="card-header"><span class="card-title">Achievement Badges</span><span class="card-subtitle">${this.state.earnedBadges.length} earned</span></div><div class="grid grid-4">${this.BADGES.map(b=>{const e=this.state.earnedBadges.includes(b.id);return`<div class="card badge-card ${e?'':'locked'}"><span class="badge-icon">${b.icon}</span><div class="badge-name">${b.name}</div><div class="badge-desc">${b.desc}</div>${e?'<div class="badge-earned">✓ Earned</div>':''}</div>`}).join('')}</div></div>`;
    },

    // SETTINGS
    changeClass(cls){
        this.state.profile.selectedClass = cls;
        if(cls <= 10) this.state.profile.selectedStream = null;
        this._syncFullProfile();
        this.renderSettings();
        this.updatePageTitle();
    },
    updatePageTitle(){
        const cls = this.state.profile.selectedClass || 10;
        const stream = this.state.profile.selectedStream;
        let label = 'Class ' + cls;
        if(stream) label += ' · ' + stream;
        document.title = 'BoardOS — ' + label;
        const el = document.getElementById('sidebar-class-label');
        if(el) el.textContent = 'CBSE · ' + label;
    },
    renderSettings(){
        const el=document.getElementById('page-settings'),p=this.state.profile,stats=this.getStats();
        const userEmail=window._supabaseSession?.user?.email||window._supabaseUserEmail||'';

        // ── Tier 1: Profile — the only unambiguous reason to open Settings ──
        const profileCard=`<div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Profile</span></div>${userEmail?`<div class="form-group"><label class="form-label">Email</label><div class="form-input" style="background:var(--color-surface-hover);cursor:default;color:var(--text-muted);font-size:.82rem">${userEmail}</div></div>`:''}<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" value="${p.name}" onchange="App.state.profile.name=this.value;App.updateSidebar();App._syncFullProfile()"></div><div class="form-group"><label class="form-label">Class</label><select class="form-select" onchange="App.changeClass(parseInt(this.value))">${[9,10,11,12].map(c=>`<option value="${c}" ${p.selectedClass===c?'selected':''}>Class ${c}</option>`).join('')}</select></div>${(p.selectedClass===11||p.selectedClass===12)?`<div class="form-group"><label class="form-label">Stream</label><select class="form-select" onchange="App.state.profile.selectedStream=this.value;App._syncFullProfile()">${['PCM','PCB','Commerce'].map(s=>`<option value="${s}" ${p.selectedStream===s?'selected':''} >${s}</option>`).join('')}</select></div>`:''}<div class="form-group"><label class="form-label">Daily Study Goal</label><select class="form-select" onchange="App.state.profile.dailyGoalMinutes=parseInt(this.value);App._syncFullProfile()">${[60,90,120,150,180,240,300].map(v=>`<option value="${v}" ${p.dailyGoalMinutes===v?'selected':''}>${v/60}h (${v}m)</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Board Exam Date</label><input type="date" class="form-input" value="${p.examDate||''}" onchange="App.state.profile.examDate=this.value;App.updatePageSubtitle();App.updateTopbarPills();App._syncFullProfile()"></div><div class="form-group"><label class="form-label">Target Score (%)</label><input type="number" class="form-input" value="${p.targetScore||90}" min="1" max="100" onchange="App.state.profile.targetScore=parseInt(this.value);App._syncFullProfile()"></div></div>`;

        // ── Tier 2: App configuration — Theme (Install App card is injected after Theme by _renderPWACard) ──
        const themeCard=`<div class="card" style="margin-bottom:20px" id="settings-theme-card"><div class="card-header"><span class="card-title">Theme</span></div><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm ${this.state.theme==='dark'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('dark')">Dark</button><button class="btn btn-sm ${this.state.theme==='light'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('light')">Light</button><button class="btn btn-sm ${this.state.theme==='warm-dark'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('warm-dark')">Warm Dark</button></div><div style="display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid var(--border)"><input type="checkbox" id="auto-theme-check" ${this.state.autoTheme?'checked':''} onchange="App.toggleAutoTheme()" style="width:16px;height:16px;cursor:pointer"><label for="auto-theme-check" style="font-size:.82rem;cursor:pointer">Auto switch (Light 7AM–7PM, Dark at night)</label></div></div></div>`;

        // ── Tier 3: Lifetime Record — ONLY metrics not already owned by Analytics/Rewards (Total Study Time, lifetime Sessions, Level/XP) ──
        const lifetimeCard=`<div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Lifetime Record</span><span class="card-subtitle">Since you started</span></div><div class="grid grid-3" style="gap:10px"><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(139,92,246,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">${this.formatMin(stats.totalMinutes)}</h3><p>Total study time</p></div></div><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">${stats.totalSessions}</h3><p>Sessions logged</p></div></div><div class="card stat-card" style="padding:14px"><div class="stat-icon" style="background:rgba(251,191,36,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div><div class="stat-info"><h3 style="font-size:1.2rem">Lvl ${stats.level}</h3><p>${p.xp} XP</p></div></div></div><p style="font-size:.72rem;color:var(--text-muted);margin-top:12px">Looking for streaks, chapters, revisions or badges? Check <a href="#" onclick="App.navigate('analytics');return false" style="color:var(--accent-light);text-decoration:none">Analytics</a> or <a href="#" onclick="App.navigate('rewards');return false" style="color:var(--accent-light);text-decoration:none">Rewards</a>.</p></div>`;

        // ── Tier 3b: Data Management (export/import only — Reset moved to its own danger zone) ──
        const dataMgmtCard=`<div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Data Management</span></div><div style="display:flex;flex-direction:column;gap:10px"><button class="btn btn-secondary" onclick="App.exportData()" style="justify-content:center">Export Data (JSON)</button><button class="btn btn-secondary" onclick="document.getElementById('import-file').click()" style="justify-content:center">Import Data</button><input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(event)"></div></div>`;

        // ── Tier 4: Reference, low-stakes ──
        const shortcutsCard=`<div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Keyboard Shortcuts</span></div><div style="font-size:.82rem;color:var(--text-secondary);line-height:2.2"><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+L</kbd> Quick Log</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+P</kbd> Focus Timer</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+K</kbd> Search</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">1-9</kbd> Navigate pages (with Alt)</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Esc</kbd> Close modals</p></div></div>`;

        const aboutCard=`<div class="card"><div class="card-header"><span class="card-title">About BoardOS</span></div><p style="font-size:.82rem;color:var(--text-secondary);line-height:1.8">BoardOS is your personal study OS. Track subjects, chapters, revisions, exams, doubts, and more — all in one place.</p><p style="font-size:.75rem;color:var(--text-muted);margin-top:8px">All data is stored locally in your browser. Export regularly to avoid data loss!</p><hr style="border-color:var(--border);margin:12px 0"><button class="btn btn-secondary" onclick="App.navigate('rewards')" style="justify-content:center;width:100%;margin-bottom:8px">🏆 View Rewards & Badges</button><button class="btn btn-secondary" onclick="window.StudyOSTour&&window.StudyOSTour.replay();App.navigate('dashboard')" style="justify-content:center;width:100%">🗺️ Replay Onboarding Tour</button></div>`;

        // ── Tier 5: Danger Zone — isolated, full width, never adjacent to a safe action ──
        const dangerZone=`<div class="card" style="margin-top:24px;background:var(--color-danger-bg);border:1px solid var(--color-danger-border)"><div class="card-header"><span class="card-title" style="color:var(--text-danger)">Danger Zone</span></div><div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap"><div style="max-width:480px"><p style="font-size:.85rem;font-weight:600;color:var(--text-primary);margin-bottom:4px">Reset all data</p><p style="font-size:.78rem;color:var(--text-secondary);line-height:1.6">Permanently deletes every subject, session, score, note and setting. This cannot be undone — export a backup first if you want to keep anything.</p></div><button class="btn btn-danger" onclick="App.resetAll()" style="flex-shrink:0">Reset All Data</button></div></div>`;

        // Profile and Theme run full-width, stacked — they're both "set once" decisions
        // and Theme's short height would otherwise create an awkward empty gap when
        // paired against the much taller Profile card in a 2-col grid row.
        // Everything below (browsable / reference content) flows into a clean 2-col
        // grid; grid-2 auto-flows row by row (item1→col1, item2→col2, item3→col1...)
        // so source order = reading order on both desktop (2 cols) and mobile
        // (collapses to 1 col under 900px) — do not manually split into two <div>
        // columns, that desyncs mobile order from the intended hierarchy.
        el.innerHTML=`${profileCard}<div id="settings-theme-wrap">${themeCard}</div>
        <div class="grid grid-2" style="align-items:start">
            ${lifetimeCard}${dataMgmtCard}${shortcutsCard}${aboutCard}
        </div>${dangerZone}`;

        // Inject Install App card right after Theme, not at the top of the page
        this._renderPWACard();
    },

    _renderPWACard(){
        const el = document.getElementById('page-settings');
        const themeCard = document.getElementById('settings-theme-card');
        if (!el || !themeCard) return;
        const isInstalled = window._pwaIsInstalled && window._pwaIsInstalled();
        const isIOS       = window._pwaIsIOS && window._pwaIsIOS();
        const hasPrompt   = !!window._pwaInstallPrompt;
        let card = '';
        if (isInstalled || window._pwaInstalled) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(16,185,129,0.3)"><div style="display:flex;align-items:center;gap:10px;font-size:.82rem;color:var(--success,#10b981)"><span style="font-size:1.2rem">✅</span><span><strong style="color:var(--text-primary)">BoardOS is installed.</strong> You're all set!</span></div></div>`;
        } else if (isIOS) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(99,102,241,0.3)"><div class="card-header"><span class="card-title">Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">Add BoardOS to your home screen for instant access — no browser needed.</p><button class="btn btn-primary" onclick="window._pwaDoInstall()" style="width:100%;justify-content:center">📋 How to Install on iPhone / iPad</button><div id="pwa-ios-tip" style="display:none;margin-top:12px;background:var(--color-surface-hover,rgba(255,255,255,0.05));border-radius:10px;padding:14px;font-size:.8rem;color:var(--text-secondary);line-height:2.1"><p style="font-weight:600;color:var(--text-primary);margin-bottom:4px">Follow these steps:</p><p>1. Tap the <strong style="color:var(--text-primary)">Share button ⎋</strong> at the bottom of Safari</p><p>2. Scroll down and tap <strong style="color:var(--text-primary)">"Add to Home Screen"</strong></p><p>3. Tap <strong style="color:var(--text-primary)">"Add"</strong> in the top right corner</p><p style="margin-top:8px;font-size:.74rem;color:var(--text-muted)">⚠️ Must be opened in Safari. Chrome on iPhone won&apos;t show this option.</p></div></div>`;
        } else if (hasPrompt) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(99,102,241,0.3)"><div class="card-header"><span class="card-title">Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">Install BoardOS as an app for faster access, offline support, and a distraction-free study experience.</p><button class="btn btn-primary" onclick="window._pwaDoInstall()" style="width:100%;justify-content:center">⬇️ Install BoardOS</button><p style="font-size:.72rem;color:var(--text-muted);margin-top:8px;text-align:center">Works offline · No app store needed · Instant launch</p></div>`;
        } else {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid var(--border)"><div class="card-header"><span class="card-title">Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);line-height:1.8"><strong style="color:var(--text-primary)">Chrome / Edge:</strong> Click the <strong>⊕ install icon</strong> in the address bar.<br><strong style="color:var(--text-primary)">Android:</strong> Tap <strong>⋮ Menu → Add to Home Screen</strong>.<br><strong style="color:var(--text-primary)">iPhone (Safari):</strong> Tap <strong>Share ⎋ → Add to Home Screen</strong>.</p></div>`;
        }
        themeCard.insertAdjacentHTML('afterend', card);
    },

    // SEARCH
    handleSearch(q){
        const dd=document.getElementById('search-dropdown');
        if(!q||q.length<2){dd.style.display='none';return}
        q=q.toLowerCase();const results=[];
        this.getAllChapters().forEach(c=>{if(c.name.toLowerCase().includes(q)||c.subjectName.toLowerCase().includes(q)){results.push({...c,resultType:'chapter'})}});
        (this.state.notes||[]).forEach(n=>{if(n.title.toLowerCase().includes(q)||n.content.toLowerCase().includes(q)){results.push({...n,resultType:'note'})}});
        (this.state.doubts||[]).forEach(d=>{if(d.text.toLowerCase().includes(q)){results.push({...d,resultType:'doubt'})}});
        (this.state.resources||[]).forEach(r=>{if(r.title.toLowerCase().includes(q)){results.push({...r,resultType:'resource'})}});
        if(results.length===0){dd.style.display='none';return}
        dd.style.display='block';
        dd.innerHTML=results.slice(0,10).map(r=>{
            if(r.resultType==='note')return`<div class="plan-card" style="margin:4px;cursor:pointer" onclick="App.navigate('notes');document.getElementById('search-dropdown').style.display='none'"><div class="plan-emoji">📓</div><div class="plan-info"><h4>${r.title}</h4><p>Note</p></div></div>`;
            if(r.resultType==='doubt')return`<div class="plan-card" style="margin:4px;cursor:pointer" onclick="App.navigate('doubts');document.getElementById('search-dropdown').style.display='none'"><div class="plan-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="plan-info"><h4>${r.text.substring(0,50)}</h4><p>Doubt • ${r.status}</p></div></div>`;
            if(r.resultType==='resource')return`<div class="plan-card" style="margin:4px;cursor:pointer" onclick="App.navigate('resources');document.getElementById('search-dropdown').style.display='none'"><div class="plan-emoji">🔗</div><div class="plan-info"><h4>${r.title}</h4><p>Resource</p></div></div>`;
            return`<div class="plan-card" style="margin:4px;cursor:pointer" onclick="App.openChapterDetail('${r.subjectId}','${r.id}');document.getElementById('search-dropdown').style.display='none'"><div class="plan-emoji">${r.subjectIcon}</div><div class="plan-info"><h4>${r.name}</h4><p>${r.subjectName}</p></div></div>`;
        }).join('');
    },

    // MOBILE SEARCH OVERLAY
    openMobileSearch(){
        const overlay=document.getElementById('mobile-search-overlay');
        overlay.classList.add('open');
        setTimeout(()=>{
            const inp=document.getElementById('mobile-search-input');
            if(inp){inp.focus();inp.value=''}
        },230);
    },
    closeMobileSearch(){
        const overlay=document.getElementById('mobile-search-overlay');
        overlay.classList.remove('open');
        const res=document.getElementById('mobile-search-results');
        if(res){res.innerHTML='';res.classList.remove('has-results');}
        const inp=document.getElementById('mobile-search-input');
        if(inp) inp.value='';
    },
    syncMobileSearch(q){
        // Mirror results into mobile results panel
        const res=document.getElementById('mobile-search-results');
        if(!res) return;
        if(!q||q.length<2){res.innerHTML='';res.classList.remove('has-results');return;}
        const ql=q.toLowerCase();const results=[];
        this.getAllChapters().forEach(c=>{if(c.name.toLowerCase().includes(ql)||c.subjectName.toLowerCase().includes(ql)){results.push({...c,resultType:'chapter'})}});
        (this.state.notes||[]).forEach(n=>{if(n.title.toLowerCase().includes(ql)||n.content.toLowerCase().includes(ql)){results.push({...n,resultType:'note'})}});
        (this.state.doubts||[]).forEach(d=>{if(d.text.toLowerCase().includes(ql)){results.push({...d,resultType:'doubt'})}});
        (this.state.resources||[]).forEach(r=>{if(r.title.toLowerCase().includes(ql)){results.push({...r,resultType:'resource'})}});
        if(results.length===0){res.innerHTML='<div style="padding:14px 16px;font-size:.85rem;color:var(--text-muted)">No results</div>';res.classList.add('has-results');return;}
        res.classList.add('has-results');
        res.innerHTML=results.slice(0,10).map(r=>{
            if(r.resultType==='note')return`<div class="plan-card" style="margin:8px;cursor:pointer" onclick="App.navigate('notes');App.closeMobileSearch()"><div class="plan-emoji">📓</div><div class="plan-info"><h4>${r.title}</h4><p>Note</p></div></div>`;
            if(r.resultType==='doubt')return`<div class="plan-card" style="margin:8px;cursor:pointer" onclick="App.navigate('doubts');App.closeMobileSearch()"><div class="plan-emoji"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="plan-info"><h4>${r.text.substring(0,50)}</h4><p>Doubt • ${r.status}</p></div></div>`;
            if(r.resultType==='resource')return`<div class="plan-card" style="margin:8px;cursor:pointer" onclick="App.navigate('resources');App.closeMobileSearch()"><div class="plan-emoji">🔗</div><div class="plan-info"><h4>${r.title}</h4><p>Resource</p></div></div>`;
            return`<div class="plan-card" style="margin:8px;cursor:pointer" onclick="App.openChapterDetail('${r.subjectId}','${r.id}');App.closeMobileSearch()"><div class="plan-emoji">${r.subjectIcon}</div><div class="plan-info"><h4>${r.name}</h4><p>${r.subjectName}</p></div></div>`;
        }).join('');
    },

    // MODALS
    openModal(id){document.getElementById(id).classList.add('show')},
    closeModal(id){document.getElementById(id).classList.remove('show')},

    openAddChapterModal(pSub){
        const subs=this.state.subjects;
        if(subs.length===0){this.toast('Add a subject first!','warning');this.openModal('modal-subject');return}
        document.getElementById('chapter-form-body').innerHTML=`
<div class="form-group">
  <label class="form-label">Subject</label>
  <select class="form-select" id="ch-subject">
    ${subs.map(s=>`<option value="${s.id}" ${s.id===pSub?'selected':''}>${this.getSubjectGlyph(s)} ${s.name}</option>`).join('')}
  </select>
</div>
<div class="form-group">
  <label class="form-label">Chapter Name</label>
  <input type="text" id="ch-name" class="form-input" placeholder="e.g., Real Numbers">
</div>
<div class="form-row">
  <div class="form-group">
    <label class="form-label">
      Difficulty
      <span id="ch-diff-required" style="color:var(--text-danger,#ef4444);font-size:.75rem;margin-left:6px;display:none">*Required</span>
    </label>
    <select class="form-select" id="ch-diff" onchange="App._onChDiffChange()">
      <option value="" disabled selected>— Select difficulty —</option>
      <option value="easy">Easy</option>
      <option value="medium">Medium</option>
      <option value="hard">Hard</option>
    </select>
  </div>
  <div class="form-group">
    <label class="form-label">Deadline</label>
    <input type="date" id="ch-deadline" class="form-input">
  </div>
</div>`;
        // Disable Save button until difficulty is chosen
        const saveBtn = document.querySelector('#modal-chapter .btn-primary');
        if(saveBtn){ saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; saveBtn.style.cursor = 'not-allowed'; }
        this.openModal('modal-chapter');
    },
    // Called by the difficulty dropdown onchange — re-enables Save and hides the required hint
    _onChDiffChange(){
        const saveBtn = document.querySelector('#modal-chapter .btn-primary');
        if(saveBtn){ saveBtn.disabled = false; saveBtn.style.opacity = ''; saveBtn.style.cursor = ''; }
        const req = document.getElementById('ch-diff-required');
        if(req) req.style.display = 'none';
    },
    saveChapter(){
        const sId=document.getElementById('ch-subject').value,name=document.getElementById('ch-name').value.trim();
        if(!name){this.toast('Enter chapter name','warning');return}
        const diff=document.getElementById('ch-diff').value;
        if(!diff){
            // Show inline required hint and keep Save disabled
            const req=document.getElementById('ch-diff-required');
            if(req) req.style.display='inline';
            this.toast('Please select a difficulty','warning');
            return;
        }
        const sub=this.getSubjectById(sId);if(!sub)return;
        const _newCh={id:this.uid(),name,status:'not-started',deadline:document.getElementById('ch-deadline').value||'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:diff,notes:'',exercises:[],createdAt:Date.now()};
        sub.chapters.push(_newCh);
        const _chUid=window._supabaseUserId;
        if(_chUid){DB.chapters.create({user_id:_chUid,subject_id:sId,name,status:'not-started',difficulty:diff,deadline:_newCh.deadline||null,revision_count:0,order_index:sub.chapters.length-1}).then(({data,error})=>{if(error){console.error('[DB] chapters.create:',error);return;}if(data&&data.id)_newCh.id=data.id;});}
        this.save();this.closeModal('modal-chapter');this.render();this.toast(`📖 "${name}" added!`,'success');
    },
    saveSubject(){
        const name=document.getElementById('new-subject-name').value.trim(),cc=document.querySelector('#color-pick .quick-chip.selected'),color=cc?cc.dataset.color:'#6366f1';
        if(!name){this.toast('Enter subject name','warning');return}
        const iconType=this.getIconType(name);
        const _ns={id:this.uid(),name,iconType,color,chapters:[]};
        this.state.subjects.push(_ns);
        const _nsUid=window._supabaseUserId;
        if(_nsUid){DB.subjects.create(_nsUid,{name,icon_type:iconType,color}).then(({data,error})=>{if(error){console.error('[DB] subjects.create:',error);return;}if(data&&data.id)_ns.id=data.id;});}
        this.save();this.closeModal('modal-subject');this.render();this.toast(`Subject "${name}" added!`,'success');
    },
    pickColor(el){document.querySelectorAll('#color-pick .quick-chip').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')},

    // EXPORT/IMPORT
    exportData(){
        const d=JSON.stringify(this.state,null,2),b=new Blob([d],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');
        a.href=u;a.download=`boardos-${this.today()}.json`;a.click();URL.revokeObjectURL(u);this.toast('Data exported! 📤','success');
    },
    importData(e){
        const f=e.target.files[0];if(!f)return;
        if(!confirm('This will replace ALL current data. Continue?')){e.target.value='';return}
        const r=new FileReader();
        r.onload=ev=>{try{const parsed=JSON.parse(ev.target.result);Object.assign(this.state,parsed);this.state.currentPage='dashboard';this.save();this.render();this.updateSidebar();this.applyTheme();this.toast('Data imported! 📥','success');this._importSyncToSupabase(parsed);}catch(err){this.toast('Invalid file format','error')}};
        r.readAsText(f);e.target.value='';
    },
    welcomeImport(e){
        const f=e.target.files[0];if(!f)return;
        const r=new FileReader();
        r.onload=ev=>{try{const parsed=JSON.parse(ev.target.result);Object.assign(this.state,parsed);this.state.currentPage='dashboard';this.save();document.getElementById('welcome-overlay').classList.add('hidden');this.render();this.updateSidebar();this.applyTheme();this.toast('Welcome back, '+this.state.profile.name+'! 📥','success');this._importSyncToSupabase(parsed);}catch(err){this.toast('Invalid backup file — could not import.','error')}};
        r.readAsText(f);e.target.value='';
    },
    async _importSyncToSupabase(parsed){
        const uid=window._supabaseUserId;
        if(!uid)return; // not logged in — localStorage-only, nothing to do
        this.toast('Syncing to cloud… ☁️','info');
        try{
            // ── 1. Profile ───────────────────────────────────────────────────
            const p=parsed.profile||{};
            await DB.profile.update(uid,{
                name:                p.name||'',
                xp:                  p.xp||0,
                level:               p.level||1,
                streak:              p.streak||0,
                last_study_date:     p.lastStudyDate||p.last_study_date||null,
                max_daily_minutes:   p.maxDailyMinutes||p.max_daily_minutes||0,
                exam_date:           p.examDate||p.exam_date||null,
                target_score:        p.targetScore||p.target_score||90,
                daily_goal_minutes:  p.dailyGoalMinutes||p.daily_goal_minutes||120,
                mood:                p.mood||null,
                mood_history:        JSON.stringify(p.moodHistory||p.mood_history||[]),
                selected_class:      p.selectedClass||p.selected_class||10,
                selected_stream:     p.selectedStream||p.selected_stream||null,
                streak_freezes:      p.streakFreezes||p.streak_freezes||1,
                pomodoro_completed:  p.pomodoroCompleted||p.pomodoro_completed||0,
                weekly_plan:         JSON.stringify(parsed.weeklyPlan||{}),
            });

            // ── 2. Subjects → build old-ID-to-new-ID map ────────────────────
            const subjectIdMap={};   // oldId → newSupabaseId
            const chapterIdMap={};   // oldId → newSupabaseId
            const subjects=parsed.subjects||[];

            for(const sub of subjects){
                const importedIconType = sub.iconType || sub.icon_type || this.getIconType(sub.name);
                const {data:sd,error:se}=await DB.subjects.create(uid,{
                    name:  sub.name,
                    icon_type: importedIconType,
                    color: sub.color,
                });
                if(se||!sd||!sd.id){console.error('[import] subject create failed',se);continue;}
                subjectIdMap[sub.id]=sd.id;

                // ── 3. Chapters for this subject ─────────────────────────────
                const chapters=sub.chapters||[];
                for(let i=0;i<chapters.length;i++){
                    const ch=chapters[i];
                    const {data:cd,error:ce}=await DB.chapters.create({
                        user_id:       uid,
                        subject_id:    sd.id,
                        name:          ch.name,
                        status:        ch.status||'not-started',
                        difficulty:    ch.difficulty||'medium',
                        deadline:      ch.deadline||null,
                        revision_count:ch.revisionCount||ch.revision_count||0,
                        order_index:   ch.order??ch.order_index??i,
                    });
                    if(ce||!cd||!cd.id){console.error('[import] chapter create failed',ce);continue;}
                    chapterIdMap[ch.id]=cd.id;
                }
            }

            // ── 4. Sessions ──────────────────────────────────────────────────
            const sessions=parsed.sessions||[];
            await Promise.all(sessions.map(s=>
                DB.sessions.create({
                    user_id:    uid,
                    subject_id: subjectIdMap[s.subjectId||s.subject_id]||null,
                    chapter_id: chapterIdMap[s.chapterId||s.chapter_id]||null,
                    time_spent: s.timeSpent||s.time_spent||0,
                    date:       s.date||this.today(),
                    type:       s.type||'learning',
                    rating:     s.rating||3,
                    notes:      s.notes||'',
                }).then(({error})=>{if(error)console.error('[import] session:',error);})
            ));

            // ── 5. Tasks ─────────────────────────────────────────────────────
            const tasks=parsed.tasks||[];
            await Promise.all(tasks.map(t=>
                DB.tasks.create({
                    user_id: uid,
                    text:    t.text,
                    done:    t.done||false,
                    date:    t.date||this.today(),
                }).then(({error})=>{if(error)console.error('[import] task:',error);})
            ));

            // ── 6. Doubts ────────────────────────────────────────────────────
            const doubts=parsed.doubts||[];
            await Promise.all(doubts.map(d=>
                DB.doubts.create({
                    user_id:    uid,
                    subject_id: subjectIdMap[d.subjectId||d.subject_id]||null,
                    text:       d.text||d.question||'',
                    status:     d.status||'unresolved',
                }).then(({error})=>{if(error)console.error('[import] doubt:',error);})
            ));

            // ── 7. Exam scores ───────────────────────────────────────────────
            const examScores=parsed.examScores||[];
            await Promise.all(examScores.map(ex=>
                DB.examScores.create({
                    user_id:    uid,
                    subject_id: subjectIdMap[ex.subjectId||ex.subject_id]||null,
                    name:       ex.name||'',
                    scored:     ex.scored||0,
                    total:      ex.total||100,
                    date:       ex.date||this.today(),
                }).then(({error})=>{if(error)console.error('[import] examScore:',error);})
            ));

            // ── 8. Notes ─────────────────────────────────────────────────────
            const notes=parsed.notes||[];
            await Promise.all(notes.map(n=>
                DB.notes.create({
                    user_id:    uid,
                    title:      n.title||'',
                    content:    n.content||'',
                    subject_id: subjectIdMap[n.subjectId||n.subject_id]||null,
                }).then(({error})=>{if(error)console.error('[import] note:',error);})
            ));

            // ── 9. Resources ─────────────────────────────────────────────────
            const resources=parsed.resources||[];
            await Promise.all(resources.map(res=>
                DB.resources.create({
                    user_id:    uid,
                    title:      res.title||'',
                    url:        res.url||'',
                    type:       res.type||'link',
                    subject_id: subjectIdMap[res.subjectId||res.subject_id]||null,
                }).then(({error})=>{if(error)console.error('[import] resource:',error);})
            ));

            // ── 10. Badges ───────────────────────────────────────────────────
            const badges=parsed.earnedBadges||[];
            await Promise.all(badges.map(bid=>
                DB.badges.add(uid,bid)
                    .then(({error})=>{if(error&&!error.message?.includes('duplicate'))console.error('[import] badge:',error);})
            ));

            // ── 11. Daily challenges ─────────────────────────────────────────
            const dc=parsed.dailyChallenges||{};
            if(dc.date){
                await DB.challenges.upsert(uid,dc.date,{
                    goal:      JSON.stringify(dc.challenges||[]),
                    completed: JSON.stringify(dc.completed||[]),
                }).then(({error})=>{if(error)console.error('[import] challenges:',error);});
            }

            // ── 12. Quiz data ────────────────────────────────────────────────
            const quizData=parsed.quizData||{};
            await Promise.all(Object.entries(quizData).map(([oldSubId,qd])=>{
                const newSubId=subjectIdMap[oldSubId]||oldSubId;
                return DB.quiz.upsert(uid,newSubId,{data:JSON.stringify(qd)})
                    .then(({error})=>{if(error)console.error('[import] quiz:',error);});
            }));

            this.toast('Cloud sync complete ✅','success');
        }catch(err){
            console.error('[import] _importSyncToSupabase error:',err);
            this.toast('Import saved locally. Cloud sync failed — try re-importing.','warning');
        }
    },
    async resetAll(){
        if(!confirm('⚠️ Delete ALL data? This cannot be undone!'))return;
        if(!confirm('Are you really sure? All subjects, sessions, notes, and progress will be permanently deleted.'))return;
        const uid=window._supabaseUserId;
        if(!uid){localStorage.removeItem('studyos_ui');location.reload();return;}
        this.toast('Deleting all data…','info');
        try{
            // Delete all user data from every table (keep auth user + profile row with just name/email)
            await Promise.all([
                supabase.from('sessions').delete().eq('user_id',uid),
                supabase.from('tasks').delete().eq('user_id',uid),
                supabase.from('doubts').delete().eq('user_id',uid),
                supabase.from('exam_scores').delete().eq('user_id',uid),
                supabase.from('notes').delete().eq('user_id',uid),
                supabase.from('resources').delete().eq('user_id',uid),
                supabase.from('user_badges').delete().eq('user_id',uid),
                supabase.from('checkins').delete().eq('user_id',uid),
                supabase.from('challenges').delete().eq('user_id',uid),
                supabase.from('quiz_progress').delete().eq('user_id',uid),
            ]);
            // Delete chapters first (FK constraint), then subjects
            const {data:subs}=await supabase.from('subjects').select('id').eq('user_id',uid);
            if(subs&&subs.length){
                await Promise.all(subs.map(s=>supabase.from('chapters').delete().eq('subject_id',s.id)));
                await supabase.from('subjects').delete().eq('user_id',uid);
            }
            // Reset profile to defaults (keep name/email)
            await DB.profile.update(uid,{
                xp:0,level:1,streak:0,last_study_date:null,max_daily_minutes:0,
                exam_date:null,daily_goal_minutes:120,target_score:90,
                mood:null,mood_history:'[]',pomodoro_completed:0,
                streak_freezes:1,last_freeze_used_date:null,last_freeze_earned_date:null,
                pending_freeze_notice:false,pomodoro_settings:'{}',
            });
            localStorage.removeItem('studyos_ui');
            location.reload();
        }catch(e){
            console.error('resetAll error:',e);
            this.toast('Error deleting data. Try again.','error');
        }
    },

    // TOAST
    toast(msg,type='info',opts){
        // opts: { actionLabel, onAction } — optional. Adds a tappable action
        // to the toast (e.g. "View" link) without changing the ~30 existing
        // plain toast(msg,type) call sites, which stay untouched.
        const c=document.getElementById('toast-container');
        const icons={success:'✅',warning:'⚠️',error:'❌',info:'ℹ️',xp:'⚡'};
        const t=document.createElement('div');
        t.className=`toast toast-${type}`;
        const actionHtml=opts&&opts.actionLabel
            ?`<button class="toast-action" type="button">${opts.actionLabel}</button>`
            :'';
        t.innerHTML=`<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>${actionHtml}`;
        c.appendChild(t);
        if(opts&&opts.onAction){
            const btn=t.querySelector('.toast-action');
            if(btn)btn.addEventListener('click',()=>{opts.onAction();t.classList.add('toast-out');setTimeout(()=>t.remove(),300);});
        }
        setTimeout(()=>{t.classList.add('toast-out');setTimeout(()=>t.remove(),300)},3500);
    },

    // CELEBRATION
    celebrate(){
        const c=document.getElementById('celebration');c.innerHTML='';c.classList.add('show');
        const cols=['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#fbbf24'];
        for(let i=0;i<60;i++){
            const cf=document.createElement('div');cf.className='confetti';
            cf.style.cssText=`left:${Math.random()*100}%;top:-10px;background:${cols[Math.floor(Math.random()*cols.length)]};animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*0.5}s;width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;border-radius:${Math.random()>0.5?'50%':'2px'}`;
            c.appendChild(cf);
        }
        setTimeout(()=>c.classList.remove('show'),3500);
    },


    // ══════════════════════════════════════════════════
    // QUIZ FEATURE — Active Recall
    // ══════════════════════════════════════════════════

    // Active quiz session state (not persisted — lives only during a quiz)
    _quiz: null,

    getQuizDueSubjects(){
        if(!this.state.quizData) this.state.quizData={};
        const today=this.today();
        return this.state.subjects.filter(s=>{
            const completed=s.chapters.filter(c=>c.status==='completed'||c.status==='revised');
            if(completed.length===0) return false;
            const qd=this.state.quizData[s.id];
            if(!qd||!qd.lastQuizDate) return true; // never quizzed = due
            const interval=qd.interval||7;
            const next=new Date(qd.lastQuizDate+'T12:00');
            next.setDate(next.getDate()+interval);
            return today>=this.localDateStr(next);
        });
    },

    getQuizNextDate(subjectId){
        const qd=this.state.quizData&&this.state.quizData[subjectId];
        if(!qd||!qd.lastQuizDate) return null;
        const interval=qd.interval||7;
        const next=new Date(qd.lastQuizDate+'T12:00');
        next.setDate(next.getDate()+interval);
        return this.localDateStr(next);
    },

    setQuizInterval(subjectId, days){
        if(!this.state.quizData) this.state.quizData={};
        if(!this.state.quizData[subjectId]) this.state.quizData[subjectId]={};
        this.state.quizData[subjectId].interval=days;
        this._syncQuizData(subjectId);
        this.renderQuiz();
    },

    toggleQuizSettings(subjectId){
        if(!this._quizSettingsOpen) this._quizSettingsOpen=new Set();
        if(this._quizSettingsOpen.has(subjectId)) this._quizSettingsOpen.delete(subjectId);
        else this._quizSettingsOpen.add(subjectId);
        this.renderQuiz();
    },

    renderQuiz(){
        const el=document.getElementById('page-quiz');
        if(!el) return;
        if(this._quiz && this._quiz.active){
            this._renderQuizSession(el);
            return;
        }
        const subjects=this.state.subjects.filter(s=>s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length>0);
        const dueSubjects=this.getQuizDueSubjects();
        if(!this.state.quizData) this.state.quizData={};
        const today=this.today();
        if(subjects.length===0){
            el.innerHTML=`<div class="empty-state" style="padding:60px 20px;text-align:center">
                <div style="font-size:3rem;margin-bottom:16px">🧠</div>
                <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:8px">No chapters completed yet</h3>
                <p style="color:var(--text-muted);font-size:.875rem">Complete at least one chapter to unlock quizzes.</p>
                <button class="btn btn-primary" style="margin-top:20px" onclick="App.navigate(\'subjects\')">Go to Subjects</button>
            </div>`;
            return;
        }
        const dueCount=dueSubjects.length;
        el.innerHTML=`
<div class="quiz-page-header">
    <div class="quiz-page-title">🧠 Active Recall Quiz</div>
    <div class="quiz-page-sub">AI-generated MCQs from your completed chapters</div>
</div>
${dueCount>0?`<div class="quiz-due-banner">⚡ ${dueCount} quiz${dueCount>1?'zes':''} due today <span>— test yourself to lock in memory</span></div>`:''}
<div class="grid grid-2" id="quiz-subject-grid">
${subjects.map(s=>{
    const completed=s.chapters.filter(c=>c.status==='completed'||c.status==='revised');
    const qd=this.state.quizData[s.id]||{};
    const interval=qd.interval||7;
    const isDue=dueSubjects.find(x=>x.id===s.id);
    const nextDate=this.getQuizNextDate(s.id);
    const lastScore=qd.lastScore;
    const history=qd.history||[];
    const hasCached=qd.questions&&qd.questions.length>0;
    const avgScore=history.length>0?Math.round(history.reduce((a,h)=>a+h.pct,0)/history.length):null;
    let nextLabel='';
    if(nextDate){
        const diff=Math.round((new Date(nextDate)-new Date(today))/(1000*60*60*24));
        if(diff===0)nextLabel='Today';
        else if(diff===1)nextLabel='Tomorrow';
        else if(diff>0)nextLabel='In '+diff+' days';
        else nextLabel=Math.abs(diff)+'d overdue';
    }
    let dueBadge='',cardClass='';
    if(!qd.lastQuizDate){
        dueBadge=`<span class="quiz-due-badge new">Never taken</span>`;
    } else if(isDue){
        const overdue=today>nextDate;
        dueBadge=`<span class="quiz-due-badge ${overdue?'due-urgent':'due'}">${overdue?'Overdue':'Due today'}</span>`;
        cardClass=overdue?'due-urgent':'due';
    } else {
        dueBadge=`<span class="quiz-due-badge ok">${nextLabel}</span>`;
    }
    const barColor=lastScore>=80?'var(--color-success)':lastScore>=50?'var(--color-warning)':'var(--color-danger)';
    const settingsOpen=this._quizSettingsOpen&&this._quizSettingsOpen.has(s.id);
    return `<div class="quiz-subject-card ${cardClass}">
    <div class="quiz-subject-body">
        <div class="quiz-subject-header">
            <div class="quiz-subject-icon" style="--icon-bg:${s.color}22">${this.renderSubjectIcon(s,22)}</div>
            <div class="quiz-subject-info">
                <div class="quiz-subject-name">${s.name}</div>
                <div class="quiz-subject-meta">${completed.length} chapter${completed.length!==1?'s':''} ready</div>
            </div>
            ${dueBadge}
            <button class="quiz-gear-btn" title="Review interval settings" aria-label="Review interval settings" aria-expanded="${settingsOpen?'true':'false'}" onclick="event.stopPropagation();App.toggleQuizSettings('${s.id}')">⚙</button>
        </div>
        ${settingsOpen?`<div class="quiz-interval-row">
            <span class="quiz-interval-label">Review interval</span>
            <div class="quiz-interval-chips">
                ${[3,5,7,14].map(d=>`<button class="quiz-interval-chip ${interval===d?'selected':''}" onclick="event.stopPropagation();App.setQuizInterval('${s.id}',${d})">${d}d</button>`).join('')}
            </div>
        </div>`:''}
        ${lastScore!==undefined?`<div class="quiz-score-row">
            <div class="quiz-score-bar-wrap"><div class="quiz-score-bar-fill" style="width:${lastScore}%;background:${barColor}"></div></div>
            <div class="quiz-score-label">Last: <strong>${lastScore}%</strong>${avgScore!==null&&history.length>1?` · Avg <strong>${avgScore}%</strong>`:''}</div>
        </div>`:''}
        ${history.length>0?`<div class="quiz-stats-row"><div class="quiz-stat-chip">Taken <strong>${history.length}×</strong></div>${hasCached?'<div class="quiz-stat-chip" style="color:var(--color-success)" title="Questions are pre-generated and ready to go" aria-label="Questions ready">✓ Ready</div>':''}</div>`:''}
        <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="App.startQuiz('${s.id}')">
            ${isDue||!qd.lastQuizDate?'⚡ Start Quiz':'🔁 Quiz Again'}
        </button>
    </div>
</div>`;
}).join('')}
</div>`;
    },


    async startQuiz(subjectId){
        const sub=this.getSubjectById(subjectId);
        if(!sub){this.toast('Subject not found','error');return;}

        const completed=sub.chapters.filter(c=>c.status==='completed'||c.status==='revised');
        if(completed.length===0){this.toast('No completed chapters to quiz on','warning');return;}

        if(!this.state.quizData) this.state.quizData={};
        if(!this.state.quizData[subjectId]) this.state.quizData[subjectId]={};
        const qd=this.state.quizData[subjectId];

        // Check cache validity: exists, has enough questions, < 14 days old
        const cacheValid=qd.questions&&qd.questions.length>=10&&qd.generatedAt&&
            (Date.now()-qd.generatedAt < 14*24*60*60*1000);

        const el=document.getElementById('page-quiz');
        if(!cacheValid){
            // Show loading
            el.innerHTML=`<div class="quiz-generating">
                <div class="qg-spinner"></div>
                <p style="font-weight:600;margin-bottom:6px">Generating questions for ${this.renderSubjectIcon(sub,14)} ${sub.name}…</p>
                <p>AI is writing CBSE-style MCQs from your ${completed.length} completed chapters</p>
            </div>`;

            try {
                const questions=await this._generateQuizQuestions(sub, completed);
                qd.questions=questions;
                qd.generatedAt=Date.now();
                this._syncQuizData(subjectId);
            } catch(e){
                el.innerHTML=`<div class="quiz-generating">
                    <p style="color:var(--color-danger);font-weight:600">⚠️ Could not generate questions</p>
                    <p style="margin-top:8px">${e.message}</p>
                    <button class="btn btn-secondary" style="margin-top:20px" onclick="App.renderQuiz()">← Back</button>
                </div>`;
                return;
            }
        }

        // Pick 10 random questions from the pool
        const pool=[...qd.questions];
        const shuffled=pool.sort(()=>Math.random()-.5).slice(0,Math.min(10,pool.length));
        // Shuffle options for each question
        shuffled.forEach((q, idx)=>{
            const clone={...q, options:[...q.options]};
            const correct=clone.options[clone.correctIndex];
            clone.options.sort(()=>Math.random()-.5);
            clone.correctIndex=clone.options.indexOf(correct);
            shuffled[idx]=clone;
        });

        // Start session
        this._quiz={
            active:true,
            mode:'quiz', // 'quiz' | 'review'
            subjectId,
            subjectName:sub.name,
            subjectIcon:this.renderSubjectIcon(sub,16),
            questions:shuffled,
            current:0,
            answers:{},   // index-keyed: { [qIndex]: {selected, correct, isCorrect, chapterName, question} }
            answered:false,
            startTime:Date.now(),
            timerInterval:null,
            elapsed:0,
            totalSeconds:10*60, // 10 min
            // review mode state (populated after quiz finishes)
            reviewQuestions:[],
            reviewCurrent:0,
            // cached final results (so review mode can return to results)
            _finalCorrect:0,_finalTotal:0,_finalPct:0,_finalChapterMap:{},_finalXp:0
        };

        // Start countdown timer
        this._quiz.timerInterval=setInterval(()=>{
            if(!this._quiz||!this._quiz.active) return;
            this._quiz.elapsed++;
            const remaining=this._quiz.totalSeconds-this._quiz.elapsed;
            if(remaining<=0){
                this._finishQuiz(true);
                return;
            }
            // Update timer display only
            const pill=document.getElementById('quiz-timer-pill');
            if(pill){
                const m=Math.floor(remaining/60),s=remaining%60;
                pill.textContent=`${m}:${s.toString().padStart(2,'0')}`;
                pill.className='quiz-timer-pill'+(remaining<=60?' danger':remaining<=180?' warn':'');
            }
        },1000);

        this._renderQuizSession(document.getElementById('page-quiz'));
    },

    async _generateQuizQuestions(subject, completedChapters){
        const chapterNames=completedChapters.map(c=>c.name).join(', ');
        const systemPrompt=`You are a CBSE Class 10 question paper setter. Generate exactly 15 high-quality multiple choice questions (MCQs) covering these chapters: ${chapterNames} from the subject ${subject.name}.

Rules:
- Each question MUST be from CBSE Class 10 curriculum
- Mix difficulty: 5 easy, 6 medium, 4 hard
- Include application questions, not just definitions
- Wrong options (distractors) must be plausible — common student misconceptions
- Include 1-2 "why/because" type questions
- Each question tagged with the exact chapter name it comes from

Return ONLY a JSON array, no markdown, no extra text. Format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief 1-2 sentence explanation of why this is correct.",
    "chapter": "Chapter name",
    "difficulty": "easy|medium|hard"
  }
]
  
CRITICAL ACCURACY RULES:
- For any calculation question (LCM, HCF, area, percentage, etc.), verify the answer step-by-step before setting correctIndex
- correctIndex MUST point to the provably correct answer — never guess
- If you are not 100% certain of the answer, skip that question and replace it with one you are certain about
`;

        const { data: { session: authSession } } = await window.supabase.auth.getSession();
    const res=await fetch('/api/quiz',{
        method:'POST',
        headers:{
            'Content-Type':'application/json',
            'Authorization':`Bearer ${authSession?.access_token||''}`
        },
        body:JSON.stringify({
            system: systemPrompt,
            userMessage: `Generate 15 CBSE Class 10 MCQs for ${subject.name} covering: ${chapterNames}`
        })
    });

        if(!res.ok) throw new Error(`Server error: ${res.status}`);
        const data=await res.json();
        if(data.error) throw new Error(data.error);

        // Parse JSON from response
        let raw=data.reply||'';
        raw=raw.replace(/```json|```/g,'').trim();
        // Extract JSON array if wrapped in extra text
        const match=raw.match(/\[[\s\S]*\]/);
        if(!match) throw new Error('Invalid response format from AI');
        const questions=JSON.parse(match[0]);
        if(!Array.isArray(questions)||questions.length===0) throw new Error('No questions returned');
        return questions;
    },

    _renderQuizSession(el){
        const q=this._quiz;
        if(!q||!q.active){this.renderQuiz();return;}

        // ── REVIEW MODE (mistake round) ──────────────────────────────────────
        if(q.mode==='review'){
            this._renderReviewSession(el);
            return;
        }

        // ── NORMAL QUIZ MODE ─────────────────────────────────────────────────
        const current=q.questions[q.current];
        const progress=Math.round((q.current/q.questions.length)*100);
        const remaining=q.totalSeconds-q.elapsed;
        const m=Math.floor(remaining/60), s=remaining%60;
        const timerClass=remaining<=60?'danger':remaining<=180?'warn':'';

        // Determine if this question was already answered (for back-navigation)
        const existingAnswer=q.answers[q.current]||null;
        const isAnswered=existingAnswer!==null||q.answered;

        // Back button: only show if not on first question
        const canGoBack=q.current>0;

        el.innerHTML=`<div class="quiz-session-wrap">
            <!-- Header bar -->
            <div class="quiz-header-bar">
                <button class="btn btn-ghost btn-sm" onclick="App._confirmQuitQuiz()">✕ Exit</button>
                <div style="display:flex;align-items:center;gap:10px;flex:1;justify-content:center">
                    <span style="font-size:.8rem;color:var(--text-muted);font-weight:600">${q.subjectIcon} ${q.subjectName}</span>
                    <span style="font-size:.8rem;color:var(--text-muted)">Q ${q.current+1} / ${q.questions.length}</span>
                </div>
                <div class="quiz-timer-pill ${timerClass}" id="quiz-timer-pill">${m}:${s.toString().padStart(2,'0')}</div>
            </div>

            <!-- Progress bar with answered-dot indicators -->
            <div class="quiz-progress-track">
                <div class="quiz-progress-fill" style="width:${progress}%"></div>
            </div>
            <div class="quiz-dot-row">
                ${q.questions.map((_,i)=>{
                    const a=q.answers[i];
                    const cls=i===q.current?'active':a?a.isCorrect?'done-correct':'done-wrong':'upcoming';
                    return`<span class="quiz-dot ${cls}" onclick="App._jumpToQuestion(${i})" title="Q${i+1}"></span>`;
                }).join('')}
            </div>

            <!-- Question card -->
            <div class="quiz-q-card" id="quiz-q-card">
                <div class="quiz-q-meta">${current.chapter||''} · <span class="quiz-difficulty-badge ${current.difficulty||'medium'}">${current.difficulty||'medium'}</span></div>
                <div class="quiz-q-text">${current.question}</div>
                <div class="quiz-options" id="quiz-options">
                    ${current.options.map((opt,i)=>{
                        // If we have an existing answer for this question (back-nav scenario),
                        // render options in their answered state
                        let cls='';
                        if(existingAnswer){
                            if(i===existingAnswer.correct) cls=existingAnswer.selected===existingAnswer.correct&&i===existingAnswer.selected?'correct':'reveal-correct';
                            else if(i===existingAnswer.selected&&!existingAnswer.isCorrect) cls='wrong';
                        }
                        return`<button class="quiz-option ${cls}" id="quiz-opt-${i}"
                            onclick="App._selectQuizOption(${i})"
                            ${isAnswered?'disabled':''}>
                            <span class="quiz-option-key">${['A','B','C','D'][i]}</span>
                            <span>${opt}</span>
                        </button>`;
                    }).join('')}
                </div>
                <!-- Explanation: show immediately if viewing a previously-answered question -->
                <div class="quiz-explanation${existingAnswer?' show '+(existingAnswer.isCorrect?'correct-exp':'wrong-exp'):''}" id="quiz-explanation">
                    ${existingAnswer?`${existingAnswer.isCorrect?'✅':'❌'} <strong>${existingAnswer.isCorrect?'Correct!':'Incorrect.'}</strong> ${current.explanation||''}`:``}
                </div>
            </div>

            <!-- Navigation row -->
            <div class="quiz-nav-row">
                <!-- Back button -->
                <button class="btn btn-ghost" id="quiz-back-btn"
                    onclick="App._prevQuizQuestion()"
                    style="${canGoBack?'':'visibility:hidden'}">
                    ← Back
                </button>
                <!-- Next / Submit -->
                <button class="btn btn-primary" id="quiz-next-btn"
                    onclick="App._nextQuizQuestion()"
                    style="${isAnswered?'':'display:none'};min-width:140px;justify-content:center">
                    ${q.current+1===q.questions.length?'See Results 🎯':'Next →'}
                </button>
            </div>
        </div>`;
    },

    // ── REVIEW MODE RENDERER ─────────────────────────────────────────────────
    _renderReviewSession(el){
        const q=this._quiz;
        const mistakes=q.reviewQuestions;
        const current=mistakes[q.reviewCurrent];
        const progress=Math.round((q.reviewCurrent/mistakes.length)*100);
        const isLast=q.reviewCurrent===mistakes.length-1;

        el.innerHTML=`<div class="quiz-session-wrap">
            <!-- Header bar (review-tinted) -->
            <div class="quiz-header-bar review-header">
                <button class="btn btn-ghost btn-sm" onclick="App._renderQuizResults(
                    App._quiz._finalCorrect,App._quiz._finalTotal,App._quiz._finalPct,
                    App._quiz._finalChapterMap,App._quiz._finalXp,false,
                    App._quiz.subjectIcon,App._quiz.subjectName)">✕ Exit Review</button>
                <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center">
                    <span style="display:inline-flex;align-items:center;gap:6px;font-size:.78rem;font-weight:700;color:var(--color-danger);letter-spacing:.4px">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.13"/></svg>
                        MISTAKE REVIEW
                    </span>
                    <span style="font-size:.78rem;color:var(--text-muted)">${q.reviewCurrent+1} / ${mistakes.length}</span>
                </div>
                <div style="width:60px"></div>
            </div>

            <!-- Progress bar (red) -->
            <div class="quiz-progress-track" style="margin-top:14px">
                <div class="quiz-progress-fill review" style="width:${progress}%"></div>
            </div>
            <!-- No dot row in review mode — simpler is better here -->

            <!-- Question card with red accent -->
            <div class="quiz-q-card review-card">
                <div class="quiz-q-meta">
                    ${current.chapter||''}
                    <span class="quiz-difficulty-badge ${current.difficulty||'medium'}">${current.difficulty||'medium'}</span>
                </div>
                <div class="quiz-q-text">${current.question}</div>
                <div class="quiz-options">
                    ${current.options.map((opt,i)=>{
                        const isCorrect=i===current.correctIndex;
                        const isYours=i===current.yourAnswer&&!isCorrect;
                        const cls=isCorrect?'reveal-correct':isYours?'wrong':'';
                        return`<button class="quiz-option ${cls}" disabled>
                            <span class="quiz-option-key">${['A','B','C','D'][i]}</span>
                            <span>${opt}</span>
                            ${isCorrect?`<span class="opt-tag">✓ Correct</span>`:''}
                            ${isYours?`<span class="opt-tag">✗ Yours</span>`:''}
                        </button>`;
                    }).join('')}
                </div>
                <div class="quiz-explanation show wrong-exp">
                    ${current.explanation||''}
                </div>
            </div>

            <!-- Navigation -->
            <div class="quiz-nav-row">
                <button class="btn btn-ghost" onclick="App._prevReviewQuestion()"
                    style="${q.reviewCurrent>0?'':'visibility:hidden'}">← Back</button>
                <button class="btn btn-primary" onclick="App._nextReviewQuestion()"
                    style="min-width:160px;justify-content:center">
                    ${isLast?'✅ Done — See Results':'Next Mistake →'}
                </button>
            </div>
        </div>`;
    },

    _selectQuizOption(optIndex){
        const q=this._quiz;
        // Ignore if already answered (this question index already has a stored answer)
        if(!q||q.answered||q.answers[q.current]) return;
        q.answered=true;
        const current=q.questions[q.current];
        const isCorrect=optIndex===current.correctIndex;
        hapticsVibrate(isCorrect ? 'light' : 'error');

        // Store answer keyed by question index (not push — allows back-nav)
        q.answers[q.current]={
            selected:optIndex,
            correct:current.correctIndex,
            isCorrect,
            chapterName:current.chapter||'Unknown',
            question:current.question
        };

        // Style options
        const opts=document.querySelectorAll('.quiz-option');
        opts.forEach((btn,i)=>{
            btn.disabled=true;
            if(i===current.correctIndex) btn.classList.add(isCorrect&&i===optIndex?'correct':'reveal-correct');
            else if(i===optIndex&&!isCorrect) btn.classList.add('wrong');
        });

        // Show explanation
        const expEl=document.getElementById('quiz-explanation');
        if(expEl&&current.explanation){
            expEl.className=`quiz-explanation show ${isCorrect?'correct-exp':'wrong-exp'}`;
            expEl.innerHTML=`${isCorrect?'✅':'❌'} <strong>${isCorrect?'Correct!':'Incorrect.'}</strong> ${current.explanation}`;
        }

        // Show next button
        const nextBtn=document.getElementById('quiz-next-btn');
        if(nextBtn) nextBtn.style.display='flex';
    },

    _nextQuizQuestion(){
        const q=this._quiz;
        if(!q) return;

        // If on last question and it's answered → finish
        if(q.current+1>=q.questions.length){
            // Check all questions have been answered before finishing
            const unanswered=q.questions.findIndex((_,i)=>!q.answers[i]);
            if(unanswered!==-1){
                // Jump to first unanswered instead of finishing
                q.current=unanswered;
                q.answered=false;
                this._renderQuizSession(document.getElementById('page-quiz'));
                return;
            }
            this._finishQuiz(false);
            return;
        }

        q.current++;
        // answered flag reflects whether the NEW current question already has an answer
        q.answered=!!q.answers[q.current];
        this._renderQuizSession(document.getElementById('page-quiz'));
    },

    _prevQuizQuestion(){
        const q=this._quiz;
        if(!q||q.current===0) return;
        q.current--;
        // When going back, the question is already answered — set flag so UI renders read-only
        q.answered=!!q.answers[q.current];
        this._renderQuizSession(document.getElementById('page-quiz'));
    },

    // Jump to any question dot — only if already answered or going forward
    _jumpToQuestion(index){
        const q=this._quiz;
        if(!q) return;
        // Allow jumping to any answered question or to the current unanswered frontier
        const frontier=q.questions.findIndex((_,i)=>!q.answers[i]);
        const limit=frontier===-1?q.questions.length-1:frontier;
        if(index>limit) return; // can't jump ahead of unanswered questions
        q.current=index;
        q.answered=!!q.answers[index];
        this._renderQuizSession(document.getElementById('page-quiz'));
    },

    // ── REVIEW MODE NAVIGATION ────────────────────────────────────────────────
    _nextReviewQuestion(){
        const q=this._quiz;
        if(!q) return;
        if(q.reviewCurrent>=q.reviewQuestions.length-1){
            // Done with review → back to results
            this._renderQuizResults(
                q._finalCorrect,q._finalTotal,q._finalPct,
                q._finalChapterMap,q._finalXp,false,
                q.subjectIcon,q.subjectName
            );
            return;
        }
        q.reviewCurrent++;
        this._renderReviewSession(document.getElementById('page-quiz'));
    },

    _prevReviewQuestion(){
        const q=this._quiz;
        if(!q||q.reviewCurrent===0) return;
        q.reviewCurrent--;
        this._renderReviewSession(document.getElementById('page-quiz'));
    },

    _startReviewMode(){
        const q=this._quiz;
        if(!q) return;
        // Build review list: wrong answers with full question context
        const mistakes=q.questions
            .map((question,i)=>{
                const a=q.answers[i];
                if(!a||a.isCorrect) return null;
                return{...question, yourAnswer:a.selected};
            })
            .filter(Boolean);
        if(mistakes.length===0){
            this.toast('No mistakes to review!','success');
            return;
        }
        q.mode='review';
        q.reviewQuestions=mistakes;
        q.reviewCurrent=0;
        this._renderReviewSession(document.getElementById('page-quiz'));
    },

    _finishQuiz(timedOut){
        const q=this._quiz;
        if(!q) return;
        clearInterval(q.timerInterval);
        q.active=false;
        if(timedOut) hapticsVibrate('error');

        // answers is now an index-keyed sparse array — filter to only answered entries
        const answeredList=q.questions.map((_,i)=>q.answers[i]).filter(Boolean);
        const total=answeredList.length;
        const correct=answeredList.filter(a=>a.isCorrect).length;
        const pct=total>0?Math.round(correct/total*100):0;

        // Compute chapter breakdown
        const chapterMap={};
        answeredList.forEach(a=>{
            if(!chapterMap[a.chapterName]) chapterMap[a.chapterName]={correct:0,total:0};
            chapterMap[a.chapterName].total++;
            if(a.isCorrect) chapterMap[a.chapterName].correct++;
        });

        // Persist results
        if(!this.state.quizData) this.state.quizData={};
        if(!this.state.quizData[q.subjectId]) this.state.quizData[q.subjectId]={};
        const qd=this.state.quizData[q.subjectId];
        qd.lastQuizDate=this.today();
        qd.lastScore=pct;
        if(!qd.history) qd.history=[];
        qd.history.push({date:this.today(), score:correct, total, pct});
        if(qd.history.length>20) qd.history=qd.history.slice(-20);
        this._syncQuizData(q.subjectId);

        // XP reward
        const xpEarned=correct*5+(pct>=80?20:0);
        this.addXP(xpEarned);

        // Flag weak chapters
        Object.entries(chapterMap).forEach(([name, data])=>{
            if(data.total>0&&data.correct/data.total<0.5){
                this.state.subjects.forEach(s=>{
                    s.chapters.forEach(c=>{if(c.name===name) c.weakFlag=true;});
                });
            }
        });

        // Log revisions for all quizzed chapters
        const quizzedChapterNames=[...new Set(answeredList.map(a=>a.chapterName))];
        this.state.subjects.forEach(s=>{
            s.chapters.forEach(c=>{
                if(quizzedChapterNames.includes(c.name)&&(c.status==='completed'||c.status==='revised')){
                    if(!c.revisionDates) c.revisionDates=[];
                    c.revisionDates.push(this.today());
                    c.revisionCount=(c.revisionCount||0)+1;
                    c.status='revised';
                }
            });
        });

        this._syncWeeklyPlan();
        this.updateNavBadges();

        // Auto AI debrief (fire and forget — don't await)
        const weakChapters=Object.entries(chapterMap).filter(([n,d])=>d.correct/d.total<0.5).map(([n])=>n);
        if(weakChapters.length>0){
            this._quizAIDebrief(q.subjectName, pct, weakChapters);
        }

        // Cache final results on _quiz so review mode can return to results screen
        q._finalCorrect=correct;
        q._finalTotal=total;
        q._finalPct=pct;
        q._finalChapterMap=chapterMap;
        q._finalXp=xpEarned;

        this._renderQuizResults(correct, total, pct, chapterMap, xpEarned, timedOut, q.subjectIcon, q.subjectName);
    },

    async _quizAIDebrief(subjectName, pct, weakChapters){
        try{
            const messages=[
                {role:'system',content:'You are a warm, encouraging CBSE Class 10 study coach. Be very brief — 2 sentences max.'},
                {role:'user',content:`Student just scored ${pct}% on a ${subjectName} quiz. Weak chapters: ${weakChapters.join(', ')}. Give one specific, actionable tip.`}
            ];
            const { data: { session: authSession } } = await window.supabase.auth.getSession();
            const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${authSession?.access_token||''}`},body:JSON.stringify({messages})});
            const data=await res.json();
            if(data.reply&&this.state.currentPage==='quiz'){
                const debriefEl=document.getElementById('quiz-ai-debrief');
                if(debriefEl){
                    debriefEl.innerHTML=`<div style="padding:12px 14px;border-radius:var(--radius-sm);border-left:3px solid var(--color-brand);background:rgba(79,70,229,0.06);font-size:.82rem;line-height:1.55;color:var(--text-secondary)">
                        <span style="font-weight:600;color:var(--color-text-primary)">🤖 Coach: </span>${data.reply}
                    </div>`;
                }
            }
        }catch(e){/* silent fail */}
    },

    _renderQuizResults(correct, total, pct, chapterMap, xpEarned, timedOut, subjectIcon, subjectName){
        const el=document.getElementById('page-quiz');
        // Capture subjectId before _quiz is nulled at the end of this function
        const retrySubjectId=this._quiz?.subjectId||'';
        const ringColor=pct>=80?'#22C55E':pct>=50?'#F59E0B':'#EF4444';
        const circumference=2*Math.PI*56;
        const weakChapters=Object.entries(chapterMap).filter(([n,d])=>d.correct/d.total<0.5).map(([n])=>n);

        // Count mistakes for the review button
        const mistakeCount=this._quiz
            ? this._quiz.questions.filter((_,i)=>this._quiz.answers[i]&&!this._quiz.answers[i].isCorrect).length
            : 0;

        el.innerHTML=`<div class="quiz-session-wrap">
            <div class="card" style="text-align:center;padding:32px 24px;margin-bottom:20px">
                ${timedOut?`<div style="font-size:.78rem;color:var(--color-warning);font-weight:600;margin-bottom:12px;letter-spacing:.5px">⏱ TIME UP</div>`:''}
                <div style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px">${subjectIcon} ${subjectName} Quiz Results</div>

                <div class="quiz-result-ring-wrap">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="56" fill="none" stroke="var(--color-border)" stroke-width="8"/>
                        <circle cx="70" cy="70" r="56" fill="none" stroke="${ringColor}" stroke-width="8"
                            stroke-dasharray="${circumference}"
                            stroke-dashoffset="${circumference*(1-pct/100)}"
                            stroke-linecap="round"
                            style="transform:rotate(-90deg);transform-origin:center;transition:stroke-dashoffset 1.2s ease"/>
                    </svg>
                    <div class="quiz-result-ring-val">
                        <div class="quiz-result-score" style="color:${ringColor}">${pct}%</div>
                        <div class="quiz-result-total">${correct}/${total}</div>
                    </div>
                </div>

                <div style="font-size:1.3rem;margin-bottom:6px">${pct>=80?'🎉 Excellent!':pct>=60?'👍 Good job!':pct>=40?'📖 Keep practising':'💪 Need more revision'}</div>
                <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px">${pct>=80?'Strong recall — keep it up!':pct>=60?'Almost there, review weak chapters':'Focus on weak chapters before next quiz'}</div>
                <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:20px;padding:5px 14px;font-family:var(--font-mono);font-size:.82rem;color:var(--color-xp)">⚡ +${xpEarned} XP earned</div>
            </div>

            <!-- Mistake Review CTA — only shown if there are mistakes -->
            ${mistakeCount>0?`
            <div class="card quiz-review-cta" style="margin-bottom:20px">
                <div class="review-cta-inner">
                    <div class="review-cta-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.13"/></svg>
                    </div>
                    <div class="review-cta-copy">
                        <div class="review-cta-title">Review ${mistakeCount} Mistake${mistakeCount>1?'s':''}</div>
                        <div class="review-cta-sub">See correct answers &amp; explanations for every question you got wrong</div>
                    </div>
                    <button class="btn btn-danger" onclick="App._startReviewMode()">Start Review →</button>
                </div>
            </div>`:''}

            <!-- Chapter breakdown -->
            <div class="card" style="margin-bottom:20px">
                <div class="card-header"><span class="card-title">Chapter Breakdown</span></div>
                <div class="quiz-chapter-breakdown">
                    ${Object.entries(chapterMap).map(([name,data])=>{
                        const cpct=Math.round(data.correct/data.total*100);
                        const cls=cpct>=70?'strong':cpct<50?'weak':'';
                        return`<div class="quiz-chapter-row ${cls}">
                            <span class="qcr-name">${name}</span>
                            <span class="qcr-score" style="color:${cpct>=70?'var(--color-success)':cpct<50?'var(--color-danger)':'var(--color-warning)'}">${data.correct}/${data.total} (${cpct}%)</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <!-- AI debrief (populated asynchronously) -->
            <div id="quiz-ai-debrief" style="margin-bottom:20px"></div>

            <!-- Actions -->
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                ${weakChapters.length>0?`<button class="btn btn-warning" onclick="App.navigate('subjects')" style="flex:1;justify-content:center;min-width:140px">Review Weak Chapters</button>`:''}
                <button class="btn btn-primary" onclick="App._quiz=null;App.renderQuiz()" style="flex:1;justify-content:center;min-width:120px">← Back to Quizzes</button>
                <button class="btn btn-secondary" onclick="App.startQuiz('${retrySubjectId}')" style="flex:1;justify-content:center;min-width:100px">Retry</button>
            </div>
        </div>`;
    },

    _confirmQuitQuiz(){
        if(!confirm('Exit quiz? Your progress will be lost.')) return;
        if(this._quiz) clearInterval(this._quiz.timerInterval);
        this._quiz=null;
        this.renderQuiz();
    },

    // ── END QUIZ FEATURE ──
};

// Wait for db.js module to populate window.DB and window.supabase before booting
function _waitForDB(cb, attempts) {
    attempts = attempts || 0;
    if (window.DB && window.supabase) { cb(); return; }
    if (attempts > 100) { console.error('[StudyOS] db.js module never loaded — check db.js path/network'); return; }
    setTimeout(function(){ _waitForDB(cb, attempts + 1); }, 50);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ _waitForDB(function(){ App.init(); }); });
} else {
    _waitForDB(function(){ App.init(); });
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(m=>{
    m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
});

// FIX B: close chapter overflow menu on any click outside it
document.addEventListener('click',()=>{
    if(window.App&&App._chMenuOpen)App._closeChMenu();
    if(window.App&&App._subMenuOpen)App._closeSubMenu();
});

// Keyboard shortcuts
document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
        document.querySelectorAll('.modal-overlay.show').forEach(m=>m.classList.remove('show'));
        if(window.App&&App._chMenuOpen)App._closeChMenu(); // FIX B: also close overflow menu
        if(window.App&&App._subMenuOpen)App._closeSubMenu();
    }
    if(e.ctrlKey&&e.key==='l'){e.preventDefault();App.openQuickLog()}
    if(e.ctrlKey&&e.key==='p'){e.preventDefault();App.navigate('pomodoro')}
    if(e.ctrlKey&&e.key==='k'){e.preventDefault();document.querySelector('.search-box input')?.focus()}
    if(e.altKey){
        const pages=['dashboard','subjects','log','tasks','revisions','exams','pomodoro','notes','coach'];
        const num=parseInt(e.key);
        if(num>=1&&num<=pages.length){e.preventDefault();App.navigate(pages[num-1])}
    }
});

//done

//Service Worker registration for PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// ─── PWA Install Engine ───────────────────────────────────────────────────
(function () {
    window._pwaInstallPrompt = null;   // captured deferred event
    window._pwaInstalled = false;      // flips true after install

    // Detect iOS Safari
    window._pwaIsIOS = () =>
        /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

    // Detect if already running as installed PWA
    window._pwaIsInstalled = () =>
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

    // Capture the install prompt — fires on Chrome/Edge/Android
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window._pwaInstallPrompt = e;
        // Re-render settings if it's currently open so button appears
        if (window.App && App.state && App.state.currentPage === 'settings') {
            App.renderSettings();
        }
    });

    // After install completes, flip flag and re-render settings
    window.addEventListener('appinstalled', () => {
        window._pwaInstalled = true;
        window._pwaInstallPrompt = null;
        if (window.App && App.state && App.state.currentPage === 'settings') {
            App.renderSettings();
        }
    });

    // Called by the Install button in Settings
    window._pwaDoInstall = function () {
        if (window._pwaIsIOS()) {
            // Toggle iOS tooltip
            const tip = document.getElementById('pwa-ios-tip');
            if (tip) tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
            return;
        }
        if (window._pwaInstallPrompt) {
            window._pwaInstallPrompt.prompt();
            window._pwaInstallPrompt.userChoice.then((result) => {
                if (result.outcome === 'accepted') {
                    window._pwaInstalled = true;
                    window._pwaInstallPrompt = null;
                    if (window.App) App.renderSettings();
                }
            });
        }
    };
})();

// ── bfcache compatibility ────────────────────────────────────────────────────
// Supabase JS holds an internal WebSocket for auth state even when no explicit
// realtime channels are open. That persistent connection blocks bfcache, so we
// tear everything down on pagehide (bfcache-safe) instead of unload (which
// would itself block bfcache). The client reconnects automatically if the user
// navigates forward again.
window.addEventListener('pagehide', () => {
    if (window.supabase && typeof window.supabase.removeAllChannels === 'function') {
        window.supabase.removeAllChannels();
    }
    if (window.Notifications) Notifications.destroy();
});