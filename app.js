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
        quizData:{} // { [subjectId]: { questions:[], generatedAt, lastScore, lastQuizDate, interval, history:[] } }
    },
    pomodoro:{running:false,mode:'work',timeLeft:1500,session:1,interval:null,focusSubjectId:null,focusChapterId:null},
    swInterval:null,

    BADGES:[
        {id:'first-step',name:'First Step',desc:'Log your first study session',icon:'🌟'},
        {id:'bookworm',name:'Bookworm',desc:'Study for 10 hours total',icon:'📚'},
        {id:'marathon',name:'Marathon Runner',desc:'Study 4+ hours in one day',icon:'🏃'},
        {id:'streak-3',name:'On Fire',desc:'3 day study streak',icon:'🔥'},
        {id:'streak-7',name:'Unstoppable',desc:'7 day study streak',icon:'⚡'},
        {id:'streak-14',name:'Two Weeks Strong',desc:'14 day study streak',icon:'💪'},
        {id:'streak-30',name:'Monthly Legend',desc:'30 day study streak',icon:'👑'},
        {id:'ch-1',name:'Chapter Down',desc:'Complete first chapter',icon:'✅'},
        {id:'ch-10',name:'Knowledge Seeker',desc:'Complete 10 chapters',icon:'🎯'},
        {id:'ch-25',name:'Halfway Hero',desc:'Complete 25 chapters',icon:'🦸'},
        {id:'ch-50',name:'Chapter Champion',desc:'Complete 50 chapters',icon:'🏅'},
        {id:'rev-1',name:'Reviser',desc:'Do your first revision',icon:'🔄'},
        {id:'rev-10',name:'Memory Master',desc:'Do 10 revisions',icon:'🧠'},
        {id:'sub-complete',name:'Subject Expert',desc:'Complete all chapters in a subject',icon:'🏆'},
        {id:'level-5',name:'Rising Star',desc:'Reach Level 5',icon:'⭐'},
        {id:'level-10',name:'Scholar',desc:'Reach Level 10',icon:'🎓'},
        {id:'allround',name:'All-Rounder',desc:'Study all subjects in one day',icon:'🌈'},
        {id:'perfect-week',name:'Perfect Week',desc:'7 day streak',icon:'💎'},
        {id:'pomodoro-10',name:'Focus Master',desc:'Complete 10 Pomodoros',icon:'🍅'},
        {id:'scorer-90',name:'Top Scorer',desc:'Score 90%+ in any exam',icon:'💯'},
        {id:'task-master',name:'Task Master',desc:'Complete 50 tasks',icon:'📋'},
        {id:'doubt-clear',name:'Doubt Slayer',desc:'Resolve 10 doubts',icon:'🗡️'},
        {id:'note-taker',name:'Note Taker',desc:'Create 20 notes',icon:'📝'},
        {id:'resource-king',name:'Resource King',desc:'Save 15 resources',icon:'📎'}
    ],

    // ── CLASS 9 ──────────────────────────────────────────────────────────
    CLASS9_DATA:[
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Number Systems','Polynomials','Coordinate Geometry','Linear Equations in Two Variables','Introduction to Euclid\'s Geometry','Lines and Angles','Triangles','Quadrilaterals','Circles','Heron\'s Formula','Surface Areas and Volumes','Statistics']},
        {name:'Science',icon:'🔬',color:'#10b981',chapters:['Matter in Our Surroundings','Is Matter Around Us Pure','Atoms and Molecules','Structure of the Atom','The Fundamental Unit of Life','Tissues','Motion','Force and Laws of Motion','Gravitation','Work and Energy','Sound','Why Do We Fall Ill','Natural Resources']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Fun They Had','The Sound of Music','The Little Girl','A Truly Beautiful Mind','The Snake and the Mirror','My Childhood','Packing','Reach for the Top','The Bond of Love','Kathmandu','If I Were You','The Road Not Taken (Poem)','Wind (Poem)','Rain on the Roof (Poem)','The Lake Isle of Innisfree (Poem)','A Legend of the Northland (Poem)','No Men Are Foreign (Poem)','The Duck and the Kangaroo (Poem)','On Killing a Tree (Poem)','The Snake Trying (Poem)','A Slumber Did My Spirit Seal (Poem)']},
        {name:'Social Science',icon:'🌍',color:'#06b6d4',chapters:['The French Revolution','Socialism in Europe and the Russian Revolution','Nazism and the Rise of Hitler','Forest Society and Colonialism','Pastoralists in the Modern World','India — Size and Location','Physical Features of India','Drainage','Climate','Natural Vegetation and Wildlife','Population','What is Democracy? Why Democracy?','Constitutional Design','Electoral Politics','Working of Institutions','Democratic Rights','The Story of Village Palampur','People as Resource','Poverty as a Challenge','Food Security in India']},
        {name:'Hindi',icon:'📜',color:'#ef4444',chapters:['दो बैलों की कथा','ल्हासा की ओर','उपभोक्तावाद की संस्कृति','साँवले सपनों की याद','नाना साहब की पुत्री देवी मैना को भस्म कर दिया गया','प्रेमचंद के फटे जूते','मेरे बचपन के दिन','एक कुत्ता और एक मैना','इस जल प्रलय में','रैदास के पद','रहीम के दोहे','कबीर की साखियाँ','ललद्यद','वाख','सवैये','कैदी और कोकिला','ग्राम श्री','चंद्र गहना से लौटती बेर','मेघ आए','यमराज की दिशा','बच्चे काम पर जा रहे हैं']}
    ],

    // ── CLASS 10 (original — untouched) ──────────────────────────────────
    CLASS10_DATA:[
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Real Numbers','Polynomials','Linear Equations in Two Variables','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Intro to Trigonometry','Applications of Trigonometry','Circles','Areas Related to Circles','Surface Areas & Volumes','Statistics','Probability']},
        {name:'Science',icon:'🔬',color:'#10b981',chapters:['Chemical Reactions & Equations','Acids, Bases & Salts','Metals & Non-metals','Carbon & its Compounds','Life Processes','Control & Coordination','How do Organisms Reproduce','Heredity & Evolution','Light: Reflection & Refraction','Human Eye & Colourful World','Electricity','Magnetic Effects of Current','Our Environment']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['A Letter to God','Dust of Snow (Poem)','Fire and Ice (Poem)','Nelson Mandela','A Tiger in the Zoo (Poem)','Two Stories about Flying','How to Tell Wild Animals (Poem)','The Ball Poem (Poem)','Anne Frank Diary','Amanda! (Poem)','Glimpses of India','The Trees (Poem)','Mijbil the Otter','Fog (Poem)','Madam Rides the Bus','The Tale of Custrd the Dragon (Poem)','The Sermon at Benares','For Anne Gregory (Poem)','The Proposal']},
        {name:'Social Science',icon:'🌍',color:'#06b6d4',chapters:['Rise of Nationalism in Europe','Nationalism in India','Making of a Global World','Age of Industrialisation','Print Culture & Modern World','Resources & Development','Forest & Wildlife Resources','Water Resources','Agriculture','Minerals & Energy Resources','Manufacturing Industries','Lifelines of National Economy','Power Sharing','Federalism','Political Parties','Outcomes of Democracy','Development','Sectors of Indian Economy','Money & Credit','Globalisation & Indian Economy']},
        {name:'Hindi',icon:'📜',color:'#ef4444',chapters:['साखी','पद','मनुष्यता','पर्वत प्रदेश में पावस','तोप','कर चले हम फ़िदा','आत्मत्राण','बड़े भाई साहब','डायरी का एक पन्ना','तताँरा-वामीरो कथा','तीसरी कसम के शिल्पकार शैलेन्द्र','अब कहाँ दूसरे के दुख से दुखी होने वाले','पतझर में टूटी पत्तियाँ','कारतूस','हरिहर काका','सपनों के-से दिन','टोपी शुक्ला','व्याकरण']}
    ],

    // ── CLASS 11 PCM ─────────────────────────────────────────────────────
    CLASS11_PCM_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:['Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','System of Particles and Rotational Motion','Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids','Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves']},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:['Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements and Periodicity in Properties','Chemical Bonding and Molecular Structure','Thermodynamics','Equilibrium','Redox Reactions','Organic Chemistry — Some Basic Principles and Techniques','Hydrocarbons','Environmental Chemistry','States of Matter','The s-Block Elements','The p-Block Elements (Groups 13 and 14)','Hydrogen']},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Sets','Relations and Functions','Trigonometric Functions','Principle of Mathematical Induction','Complex Numbers and Quadratic Equations','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Introduction to Three Dimensional Geometry','Limits and Derivatives','Statistics','Probability']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut: The Saga Continues','Landscape of the Soul','The Ailing Planet','The Browning Version','The Adventure','Silk Road','A Photograph (Poem)','The Laburnum Top (Poem)','The Voice of the Rain (Poem)','Childhood (Poem)','Father to Son (Poem)','The Summer of the Beautiful White Horse','The Address','Ranga\'s Marriage','Albert Einstein at School','Mother\'s Day','The Ghat of the Only World','Birth','The Tale of Melon City']},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:['Changing Trends and Career in Physical Education','Olympic Movement','Physical Fitness, Wellness and Lifestyle','Physical Education and Sports for CWSN','Yoga','Physical Activity and Leadership Training','Test, Measurement and Evaluation','Fundamentals of Anatomy and Physiology','Fundamentals of Kinesiology and Biomechanics','Psychology and Sports','Training in Sports','Doping']}
    ],

    // ── CLASS 11 PCB ─────────────────────────────────────────────────────
    CLASS11_PCB_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:['Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','System of Particles and Rotational Motion','Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids','Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves']},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:['Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements and Periodicity in Properties','Chemical Bonding and Molecular Structure','Thermodynamics','Equilibrium','Redox Reactions','Organic Chemistry — Some Basic Principles and Techniques','Hydrocarbons','Environmental Chemistry','States of Matter','The s-Block Elements','The p-Block Elements (Groups 13 and 14)','Hydrogen']},
        {name:'Biology',icon:'🌿',color:'#22c55e',chapters:['The Living World','Biological Classification','Plant Kingdom','Animal Kingdom','Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals','Cell: The Unit of Life','Biomolecules','Cell Cycle and Cell Division','Transport in Plants','Mineral Nutrition','Photosynthesis in Higher Plants','Respiration in Plants','Plant Growth and Development','Digestion and Absorption','Breathing and Exchange of Gases','Body Fluids and Circulation','Excretory Products and their Elimination','Locomotion and Movement','Neural Control and Coordination','Chemical Coordination and Integration']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut: The Saga Continues','Landscape of the Soul','The Ailing Planet','The Browning Version','The Adventure','Silk Road','A Photograph (Poem)','The Laburnum Top (Poem)','The Voice of the Rain (Poem)','Childhood (Poem)','Father to Son (Poem)','The Summer of the Beautiful White Horse','The Address','Ranga\'s Marriage','Albert Einstein at School','Mother\'s Day','The Ghat of the Only World','Birth','The Tale of Melon City']},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:['Changing Trends and Career in Physical Education','Olympic Movement','Physical Fitness, Wellness and Lifestyle','Physical Education and Sports for CWSN','Yoga','Physical Activity and Leadership Training','Test, Measurement and Evaluation','Fundamentals of Anatomy and Physiology','Fundamentals of Kinesiology and Biomechanics','Psychology and Sports','Training in Sports','Doping']}
    ],

    // ── CLASS 11 COMMERCE ────────────────────────────────────────────────
    CLASS11_COMMERCE_DATA:[
        {name:'Accountancy',icon:'💰',color:'#a855f7',chapters:['Introduction to Accounting','Theory Base of Accounting','Recording of Transactions I','Recording of Transactions II','Bank Reconciliation Statement','Trial Balance and Rectification of Errors','Depreciation, Provisions and Reserves','Bill of Exchange','Financial Statements I','Financial Statements II','Accounts from Incomplete Records','Applications of Computers in Accounting','Computerised Accounting System']},
        {name:'Business Studies',icon:'🏢',color:'#0ea5e9',chapters:['Business, Trade and Commerce','Forms of Business Organisation','Private, Public and Global Enterprises','Business Services','Emerging Modes of Business','Social Responsibilities of Business and Business Ethics','Formation of a Company','Sources of Business Finance','Small Business','Internal Trade','International Business']},
        {name:'Economics',icon:'📈',color:'#f97316',chapters:['Introduction to Statistics','Collection of Data','Organisation of Data','Presentation of Data','Measures of Central Tendency','Measures of Dispersion','Correlation','Index Numbers','Use of Statistical Tools','Indian Economy on the Eve of Independence','Indian Economy 1950–1990','Liberalisation, Privatisation and Globalisation: An Appraisal','Poverty','Human Capital Formation in India','Rural Development','Employment: Growth, Informalisation and Other Issues','Infrastructure','Environment and Sustainable Development','Comparative Development Experiences of India and Its Neighbours']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut: The Saga Continues','Landscape of the Soul','The Ailing Planet','The Browning Version','The Adventure','Silk Road','A Photograph (Poem)','The Laburnum Top (Poem)','The Voice of the Rain (Poem)','Childhood (Poem)','Father to Son (Poem)','The Summer of the Beautiful White Horse','The Address','Ranga\'s Marriage','Albert Einstein at School','Mother\'s Day','The Ghat of the Only World','Birth','The Tale of Melon City']},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Sets','Relations and Functions','Trigonometric Functions','Principle of Mathematical Induction','Complex Numbers and Quadratic Equations','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Introduction to Three Dimensional Geometry','Limits and Derivatives','Statistics','Probability']}
    ],

    // ── CLASS 12 PCM ─────────────────────────────────────────────────────
    CLASS12_PCM_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:['Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei','Semiconductor Electronics','Communication Systems']},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:['The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles and Processes of Isolation of Elements','The p-Block Elements','The d- and f-Block Elements','Coordination Compounds','Haloalkanes and Haloarenes','Alcohols, Phenols and Ethers','Aldehydes, Ketones and Carboxylic Acids','Amines','Biomolecules','Polymers','Chemistry in Everyday Life']},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives','Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Last Lesson','Lost Spring','Deep Water','The Rattrap','Indigo','Poets and Pancakes','The Interview','Going Places','My Mother at Sixty-six (Poem)','Keeping Quiet (Poem)','A Thing of Beauty (Poem)','A Roadside Stand (Poem)','Aunt Jennifer\'s Tigers (Poem)','Third Level','The Tiger King','Journey to the End of the Earth','The Enemy','Should Wizard Hit Mommy','On the Face of It','Evans Tries an O-level','Memories of Childhood']},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:['Planning in Sports','Sports and Nutrition','Yoga and Lifestyle','Physical Education and Sports for CWSN','Children and Women in Sports','Test, Measurement and Evaluation in Sports','Physiology and Injuries in Sports','Biomechanics and Sports','Psychology and Sports','Training in Sports']}
    ],

    // ── CLASS 12 PCB ─────────────────────────────────────────────────────
    CLASS12_PCB_DATA:[
        {name:'Physics',icon:'⚛️',color:'#8b5cf6',chapters:['Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei','Semiconductor Electronics','Communication Systems']},
        {name:'Chemistry',icon:'🧪',color:'#10b981',chapters:['The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles and Processes of Isolation of Elements','The p-Block Elements','The d- and f-Block Elements','Coordination Compounds','Haloalkanes and Haloarenes','Alcohols, Phenols and Ethers','Aldehydes, Ketones and Carboxylic Acids','Amines','Biomolecules','Polymers','Chemistry in Everyday Life']},
        {name:'Biology',icon:'🌿',color:'#22c55e',chapters:['Reproduction in Organisms','Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health','Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution','Human Health and Disease','Strategies for Enhancement in Food Production','Microbes in Human Welfare','Biotechnology: Principles and Processes','Biotechnology and its Applications','Organisms and Populations','Ecosystem','Biodiversity and Conservation','Environmental Issues']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Last Lesson','Lost Spring','Deep Water','The Rattrap','Indigo','Poets and Pancakes','The Interview','Going Places','My Mother at Sixty-six (Poem)','Keeping Quiet (Poem)','A Thing of Beauty (Poem)','A Roadside Stand (Poem)','Aunt Jennifer\'s Tigers (Poem)','Third Level','The Tiger King','Journey to the End of the Earth','The Enemy','Should Wizard Hit Mommy','On the Face of It','Evans Tries an O-level','Memories of Childhood']},
        {name:'Physical Education',icon:'🏃',color:'#84cc16',chapters:['Planning in Sports','Sports and Nutrition','Yoga and Lifestyle','Physical Education and Sports for CWSN','Children and Women in Sports','Test, Measurement and Evaluation in Sports','Physiology and Injuries in Sports','Biomechanics and Sports','Psychology and Sports','Training in Sports']}
    ],

    // ── CLASS 12 COMMERCE ────────────────────────────────────────────────
    CLASS12_COMMERCE_DATA:[
        {name:'Accountancy',icon:'💰',color:'#a855f7',chapters:['Accounting for Not-for-Profit Organisation','Accounting for Partnership: Basic Concepts','Reconstitution of a Partnership Firm — Admission of a Partner','Reconstitution of a Partnership Firm — Retirement/Death of a Partner','Dissolution of Partnership Firm','Accounting for Share Capital','Issue and Redemption of Debentures','Financial Statements of a Company','Analysis of Financial Statements','Accounting Ratios','Cash Flow Statement','Computerised Accounting System']},
        {name:'Business Studies',icon:'🏢',color:'#0ea5e9',chapters:['Nature and Significance of Management','Principles of Management','Business Environment','Planning','Organising','Staffing','Directing','Controlling','Financial Management','Financial Markets','Marketing Management','Consumer Protection','Entrepreneurship Development']},
        {name:'Economics',icon:'📈',color:'#f97316',chapters:['Introduction to Macroeconomics','National Income Accounting','Money and Banking','Determination of Income and Employment','Government Budget and the Economy','Open Economy Macroeconomics','Indian Economy on the Eve of Independence','Indian Economy 1950–1990','Liberalisation, Privatisation and Globalisation','Poverty','Human Capital Formation in India','Rural Development','Employment: Growth, Informalisation and Other Issues','Infrastructure','Environment and Sustainable Development']},
        {name:'English',icon:'📝',color:'#f59e0b',chapters:['The Last Lesson','Lost Spring','Deep Water','The Rattrap','Indigo','Poets and Pancakes','The Interview','Going Places','My Mother at Sixty-six (Poem)','Keeping Quiet (Poem)','A Thing of Beauty (Poem)','A Roadside Stand (Poem)','Aunt Jennifer\'s Tigers (Poem)','Third Level','The Tiger King','Journey to the End of the Earth','The Enemy','Should Wizard Hit Mommy','On the Face of It','Evans Tries an O-level','Memories of Childhood']},
        {name:'Mathematics',icon:'📐',color:'#6366f1',chapters:['Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives','Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability']}
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

        // Always start on dashboard on refresh
        this.state.currentPage = 'dashboard';

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
        // Used by: subjects, revisions, planning, weekly, dashboard (subject list),
        //          quiz, exams, log modal, task auto-plan, rewards (badge checks).
        // We load this lazily on the first navigate to ANY content tab that
        // needs subjects, because the dashboard itself doesn't require them for
        // its first paint (streak / goal / challenge render without subjects).
        if (tab === 'subjects' || tab === 'revisions' || tab === 'planning' ||
            tab === 'weekly'   || tab === 'quiz'      || tab === 'exercises' || tab === 'backlog') {
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
                if (tasks) this.state.tasks = tasks;
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

    toggleNavGroup(group){
        const el=document.getElementById('nav-group-'+group);
        const chevron=document.getElementById('nav-chevron-'+group);
        if(!el||!chevron)return;
        el.classList.toggle('collapsed');
        chevron.classList.toggle('collapsed');
    },

    // Pages in each nav group (for auto-expand on navigate)
    NAV_GROUPS:{
        work:['revisions','quiz','coach','pomodoro','doubts'],
        review:['planning','exams','weekly'],
        library:['notes','exercises','resources']
    },
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
    today(){return new Date().toISOString().split('T')[0]},
    daysBetween(d1,d2){return Math.floor((new Date(d2)-new Date(d1))/864e5)},
    formatMin(m){const h=Math.floor(m/60),min=m%60;return h>0?`${h}h ${min}m`:`${min}m`},
    formatSec(s){const m=Math.floor(s/60),sec=s%60;return`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`},
    getAllChapters(){const c=[];this.state.subjects.forEach(s=>s.chapters.forEach(ch=>c.push({...ch,subjectName:s.name,subjectColor:s.color,subjectIcon:s.icon,subjectId:s.id})));return c},
    getSubjectById(id){return this.state.subjects.find(s=>s.id===id)},
    getChapter(sId,cId){const s=this.getSubjectById(sId);return s?s.chapters.find(c=>c.id===cId):null},
    getTodaySessions(){return this.state.sessions.filter(s=>s.date===this.today())},
    getTodayMinutes(){return this.getTodaySessions().reduce((a,s)=>a+s.timeSpent,0)},
    getWeekSessions(){const n=new Date(),w=[];for(let i=6;i>=0;i--){const d=new Date(n);d.setDate(d.getDate()-i);w.push(d.toISOString().split('T')[0])}return{days:w,sessions:this.state.sessions.filter(s=>w.includes(s.date))}},
    getCompletedCount(){return this.getAllChapters().filter(c=>c.status==='completed'||c.status==='revised').length},
    getTotalChapters(){return this.getAllChapters().length},
    getOverdueChapters(){const t=this.today();return this.getAllChapters().filter(c=>c.deadline&&c.deadline<t&&c.status!=='completed'&&c.status!=='revised')},
    getRevisionsDue(){const t=new Date(),r=[];this.getAllChapters().forEach(ch=>{if(ch.status==='completed'||ch.status==='revised'){const lr=(ch.revisionDates||[]).length>0?new Date((ch.revisionDates||[])[((ch.revisionDates||[]).length-1)]):(ch.completionDate?new Date(ch.completionDate):null);if(lr){const ds=Math.floor((t-lr)/864e5),iv=[1,3,7,14,30],ni=iv[Math.min(ch.revisionCount,iv.length-1)];if(ds>=ni)r.push({...ch,daysSince:ds,nextInterval:ni})}}});return r},

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
        return{date:predDate.toISOString().split('T')[0],daysNeeded,rate:Math.round(rate*10)/10};
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
                setTimeout(()=>this.toast(`🧊 Streak freeze earned! You now have ${this.state.streakFreezes} freeze${this.state.streakFreezes!==1?'s':''}.`,'info'),800);
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
    showLevelUp(l){const luIcon=document.querySelector('#level-up .lu-icon');if(luIcon)luIcon.textContent='↑';document.getElementById('lu-text').textContent=`Level ${l}!`;document.getElementById('lu-sub').textContent=`You've reached Level ${l}!`;document.getElementById('level-up').classList.add('show');this.celebrate()},
    updateSidebar(){const p=this.state.profile;document.getElementById('sb-name').textContent=p.name;document.getElementById('sb-level').textContent=`LVL ${p.level}`;const c=this.xpForLevel(p.level-1),n=this.xpForLevel(p.level),pct=Math.min(100,((p.xp-c)/(n-c))*100);document.getElementById('sb-xp-fill').style.transform=`scaleX(${Math.min(1,pct/100)})`;document.getElementById('sb-xp-text').textContent=`${p.xp-c} / ${n-c} XP`},
    updateNavBadges(){const r=this.getRevisionsDue().length,o=this.getOverdueChapters().length,ud=this.state.doubts.filter(d=>d.status==='unresolved').length;const rb=document.getElementById('rev-badge'),ob=document.getElementById('overdue-badge'),db=document.getElementById('doubt-badge');rb.style.display=r>0?'inline':'none';rb.textContent=r;ob.style.display=o>0?'inline':'none';ob.textContent=o;db.style.display=ud>0?'inline':'none';db.textContent=ud;const qDue=this.getQuizDueSubjects().length;const qb=document.getElementById('quiz-badge');if(qb){qb.style.display=qDue>0?'inline':'none';qb.textContent=qDue;}},

    checkBadges(){const _priorBadges=new Set(this.state.earnedBadges);const s=this.getStats(),nb=[];this.BADGES.forEach(b=>{if(this.state.earnedBadges.includes(b.id))return;let e=false;switch(b.id){case'first-step':e=s.totalSessions>=1;break;case'bookworm':e=s.totalMinutes>=600;break;case'marathon':e=s.maxDailyMinutes>=240;break;case'streak-3':e=s.streak>=3;break;case'streak-7':e=s.streak>=7;break;case'streak-14':e=s.streak>=14;break;case'streak-30':e=s.streak>=30;break;case'ch-1':e=s.completedChapters>=1;break;case'ch-10':e=s.completedChapters>=10;break;case'ch-25':e=s.completedChapters>=25;break;case'ch-50':e=s.completedChapters>=50;break;case'rev-1':e=s.totalRevisions>=1;break;case'rev-10':e=s.totalRevisions>=10;break;case'sub-complete':e=s.completedSubjects>=1;break;case'level-5':e=s.level>=5;break;case'level-10':e=s.level>=10;break;case'allround':e=s.subjectsStudiedToday>=this.state.subjects.length&&this.state.subjects.length>0;break;case'perfect-week':e=s.streak>=7;break;case'pomodoro-10':e=s.pomodoroCompleted>=10;break;case'scorer-90':e=this.state.examScores.some(x=>x.scored/x.total>=0.9);break;case'task-master':e=this.state.tasks.filter(t=>t.done).length>=50;break;case'doubt-clear':e=this.state.doubts.filter(d=>d.status==='understood').length>=10;break;case'note-taker':e=(this.state.notes||[]).length>=20;break;case'resource-king':e=(this.state.resources||[]).length>=15;break}if(e){nb.push(b);this.state.earnedBadges.push(b.id)}});if(nb.length>0){const _bUid=window._supabaseUserId;if(_bUid&&this._badgesLoaded){const _newBadges=nb.filter(b=>!_priorBadges.has(b.id));_newBadges.forEach(b=>{DB.badges.add(_bUid,b.id).then(({error})=>{if(error&&!error.message?.includes('duplicate'))console.error('[DB] badge add:',error);});if(window.Notifications)Notifications.send('badge',`Badge unlocked: ${b.name}`,b.desc,'rewards');});}nb.forEach(b=>setTimeout(()=>this.toast(`🏅 Badge: ${b.icon} ${b.name}!`,'success'),800))}},

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
                return !isNaN(d.getTime())&&d.toISOString().split('T')[0]===this.today()
            }).length
        };
        dc.challenges.forEach(ch=>{
            if(dc.completed.includes(ch.id))return;
            const orig=this.DAILY_CHALLENGES[ch.checkIdx];
            if(orig&&orig.check(ctx)){dc.completed.push(ch.id);this.addXP(ch.xp,`Challenge: ${ch.text}`);this.toast(`Challenge done: ${ch.text}`,'success')}
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
            const sj={id:this.uid(),name:sub.name,icon:sub.icon,color:sub.color,chapters:[]};
            sub.chapters.forEach(ch=>{sj.chapters.push({id:this.uid(),name:ch,status:'not-started',deadline:'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:'medium',notes:'',exercises:[],createdAt:Date.now()})});
            this.state.subjects.push(sj);
            if(_lcUid){
                DB.subjects.create(_lcUid,{name:sub.name,icon:sub.icon,color:sub.color}).then(({data,error})=>{
                    if(error){console.error('[DB] loadCBSE subjects.create:',error);return;}
                    if(data&&data.id){
                        const order_index_base=sj.chapters.length;
                        sj.id=data.id;
                        sj.chapters.forEach((ch,i)=>{
                            DB.chapters.create({user_id:_lcUid,subject_id:data.id,name:ch.name,status:'not-started',difficulty:'medium',revision_count:0,order_index:i}).then(({data:cd,error:ce})=>{
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
            const sj={id:this.uid(),name:sub.name,icon:sub.icon,color:sub.color,chapters:[]};
            sub.chapters.forEach(ch=>{sj.chapters.push({id:this.uid(),name:ch,status:'not-started',deadline:'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:'medium',notes:'',exercises:[],createdAt:Date.now()})});
            this.state.subjects.push(sj);
            if(_lcUid){
                DB.subjects.create(_lcUid,{name:sub.name,icon:sub.icon,color:sub.color}).then(({data:sd,error})=>{
                    if(error){console.error('[DB] loadCBSEForClass subjects:',error);return;}
                    if(sd&&sd.id){
                        sj.id=sd.id;
                        sj.chapters.forEach((ch,i)=>{
                            DB.chapters.create({user_id:_lcUid,subject_id:sd.id,name:ch.name,status:'not-started',difficulty:'medium',revision_count:0,order_index:i}).then(({data:cd,error:ce})=>{
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
        this.render();
        this.updateSidebar();
        setTimeout(_patchSidebarExam,300);
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
        // Auto-expand nav group containing this page
        Object.entries(this.NAV_GROUPS||{}).forEach(([group,pages])=>{
            if(pages.includes(page)){
                const el=document.getElementById('nav-group-'+group);
                const chevron=document.getElementById('nav-chevron-'+group);
                if(el&&el.classList.contains('collapsed')){
                    el.classList.remove('collapsed');
                    if(chevron)chevron.classList.remove('collapsed');
                }
            }
        });
        const titles={dashboard:'Dashboard',subjects:'Subjects & Chapters',log:'Study Log',tasks:'Daily Tasks',revisions:'Revision Tracker',exams:'Exam Scores',doubts:'Doubt Tracker',exercises:'Exercise Tracker',planning:'Deadlines',weekly:'Analytics',pomodoro:'Focus Timer',notes:'Notes & Formulas',resources:'Resources',coach:'AI Coach',rewards:'Rewards',settings:'Settings',quiz:'Quiz',backlog:'Backlog'};
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
            planning:'Stay on track',weekly:'Analytics & plan',
            pomodoro:'Focus timer',notes:'Notes & formulas',
            resources:'Study links',doubts:'Track your doubts',
            exams:'Score history',exercises:'Chapter exercises',
            rewards:'XP & badges',settings:'Preferences',
            backlog:'Study debt tracker',
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
    renderPage(p){const r={dashboard:()=>this.renderDashboard(),subjects:()=>this.renderSubjects(),log:()=>this.renderLog(),tasks:()=>this.renderTasks(),revisions:()=>this.renderRevisions(),exams:()=>this.renderExams(),doubts:()=>this.renderDoubts(),exercises:()=>this.renderExercises(),planning:()=>this.renderPlanning(),weekly:()=>this.renderWeekly(),pomodoro:()=>this.renderPomodoro(),notes:()=>this.renderNotes(),resources:()=>this.renderResources(),coach:()=>this.renderCoach(),rewards:()=>this.renderRewards(),settings:()=>this.renderSettings(),quiz:()=>this.renderQuiz(),backlog:()=>window.Backlog&&Backlog.renderPage()};if(r[p])r[p]()},
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

    getTomorrowPlan(){const plan=[];this.getOverdueChapters().forEach(c=>plan.push({...c,reason:'Overdue',priority:'overdue'}));this.getRevisionsDue().forEach(c=>plan.push({...c,reason:'Revision due',priority:'revised'}));const pending=this.getAllChapters().filter(c=>c.status==='not-started'||c.status==='in-progress');pending.filter(c=>c.difficulty==='hard').slice(0,2).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Hard topic',priority:'hard'})});pending.filter(c=>c.deadline).sort((a,b)=>a.deadline.localeCompare(b.deadline)).slice(0,3).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Deadline approaching',priority:'medium'})});pending.slice(0,5).forEach(c=>{if(!plan.find(p=>p.id===c.id))plan.push({...c,reason:'Pending',priority:'easy'})});return plan},

    // HEATMAP DATA
    getHeatmapData(){const data={};const now=new Date();for(let i=89;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);data[d.toISOString().split('T')[0]]=0}this.state.sessions.forEach(s=>{if(data[s.date]!==undefined)data[s.date]+=s.timeSpent});return data},

    // DASHBOARD
    renderDashboard(){
        const el=document.getElementById('page-dashboard');
        if(!el)return;
        try{
        const tm=this.getTodayMinutes(),gm=this.state.profile.dailyGoalMinutes||120,gp=Math.min(100,Math.round(tm/gm*100));
        const comp=this.getCompletedCount(),tot=this.getTotalChapters(),sp=tot>0?Math.round(comp/tot*100):0;
        const od=this.getOverdueChapters(),rd=this.getRevisionsDue(),ts=this.getTodaySessions(),st=this.state.profile.streak||0;
        const wd=this.getWeekSessions(),plan=this.getTomorrowPlan(),dte=this.getDaysToExam(),rs=this.getReadinessScore();
        const hm=this.getHeatmapData();
        const dc=this.state.dailyChallenges||{date:'',challenges:[],completed:[]};
        const pred=this.getPredictedCompletion();
        const todayMood=this.state.profile.moodHistory.find(m=>m.date===this.today());
        const avgMin=this.state.sessions.length>0?Math.round(this.state.sessions.reduce((a,s)=>a+s.timeSpent,0)/Math.max(1,new Set(this.state.sessions.map(s=>s.date)).size)):0;
        const urgentCount=od.length+rd.length;

        // ── HERO: What to do right now ──────────────────────────
        const heroChapter=plan[0];
        // P0-2: Compute pace intelligence
        const remaining=tot-comp;
        let paceMsg='',paceColor='rgba(186,220,255,0.75)';
        if(dte!==null&&dte>0&&tot>0){
            const needed=remaining/dte;
            const actual=pred?pred.rate:0;
            if(remaining===0){paceMsg='🎉 All chapters done! Ready for boards.';paceColor='#4ADE80'}
            else if(needed<=0.1){paceMsg=`${remaining} ch left · Well ahead of pace ✅`;paceColor='#4ADE80'}
            else if(actual>0&&actual>=needed*0.9){paceMsg=`Need ${needed.toFixed(1)} ch/day · You're on pace ✅`;paceColor='#4ADE80'}
            else if(actual>0&&actual>=needed*0.6){paceMsg=`Need ${needed.toFixed(1)} ch/day · Slightly behind ⚠️`;paceColor='#FBBF24'}
            else{paceMsg=`Need ${needed.toFixed(1)} ch/day · Behind pace — speed up! 🚨`;paceColor='#F87171'}
        }else if(dte===null){paceMsg='Set exam date for pace tracking'}
        else if(dte===0){paceMsg='Exam is today — best of luck! 🌟';paceColor='#FBBF24'}
        else if(remaining===0){paceMsg='All chapters done! 🎉';paceColor='#4ADE80'}
        // Determine ring color: green if daily goal already hit, cyan for WIP
        const ringColor=gp>=100?'#22C55E':'#22d3ee';
        // Find subject color for hero chapter subject tag
        const heroSubject=heroChapter?this.state.subjects.find(s=>s.id===heroChapter.subjectId):null;
        const heroSubjectColor=heroSubject?heroSubject.color:'#6F72FD';
        const heroSubjectColorRgba=heroSubjectColor.startsWith('#')
            ?(()=>{const r=parseInt(heroSubjectColor.slice(1,3),16),g=parseInt(heroSubjectColor.slice(3,5),16),b=parseInt(heroSubjectColor.slice(5,7),16);return`rgba(${r},${g},${b},0.15)`})()
            :'rgba(99,102,241,0.15)';

        const heroHTML=heroChapter
            ?`<div class="db-hero" onclick="App.openChapterDetail('${heroChapter.subjectId}','${heroChapter.id}')">
                <div class="db-hero-left">
                    <div class="db-hero-label">▶ STUDY NOW</div>
                    <div class="db-hero-title">${heroChapter.name}</div>
                    <div class="db-hero-subject-tag" style="background:${heroSubjectColorRgba};color:${heroSubjectColor}">
                        ${heroChapter.subjectIcon} ${heroChapter.subjectName}
                    </div>
                    ${paceMsg?`<div style="font-size:.75rem;margin-top:8px;font-style:italic;color:${paceColor}">${paceMsg}</div>`:''}
                    <div style="display:flex;gap:8px;margin-top:16px">
                        <button class="btn btn-primary" onclick="event.stopPropagation();App.openQuickLog()" style="font-size:.8rem;padding:8px 16px;border-radius:12px">Log Session</button>
                        <button class="btn btn-secondary" onclick="event.stopPropagation();App.navigate('pomodoro')" style="font-size:.8rem;padding:8px 16px;border-radius:12px">Focus Timer</button>
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
                    <div class="db-hero-sub" style="color:rgba(134,239,172,0.85)">All chapters are up to date 🎉</div>
                    ${paceMsg?`<div style="font-size:.75rem;margin-top:8px;font-style:italic;color:var(--text-secondary)">${paceMsg}</div>`:''}
                    <button class="btn btn-primary" onclick="App.navigate('subjects')" style="margin-top:16px;font-size:.8rem;padding:8px 16px;border-radius:12px">Browse Subjects</button>
                </div>
                <div style="font-size:4rem;position:relative;z-index:1">🎉</div>
            </div>`;

        // ── STREAK HERO + 3 SUPPORTING STATS ─────────────────────
        // STREAK FREEZE — read freeze state for display
        const sf=this.state.streakFreezes||0;
        const freezeSlotsHTML=[0,1,2].map(i=>`<span style="font-size:1rem;opacity:${i<sf?'1':'0.25'}">🧊</span>`).join('');
        const freezeLabelHTML=sf===0
            ?`<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:4px">no freezes — earn one at a 7-day streak</div>`
            :`<div style="font-size:.7rem;color:var(--color-text-secondary);margin-top:4px">streak freeze${sf!==1?'s':''}</div>`;
        // STREAK FREEZE — dismissible freeze-used banner
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
        const streakSubline=st>0
            ?`🔥 ${st} day streak — keep it alive`
            :`Start your streak today — any session counts`;
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
                    ${freezeLabelHTML}                </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <div style="font-size:.62rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--color-text-secondary);font-weight:700;margin-bottom:2px">Streak</div>
                ${st>0?`<div style="font-size:.72rem;color:#F97316;font-weight:600">Best: keep going!</div>`:`<button class="btn btn-primary btn-sm" onclick="App.openQuickLog()" style="font-size:.72rem;padding:5px 12px;margin-top:4px">Log now</button>`}
            </div>
        </div>
        <div class="db-stats" style="grid-template-columns:repeat(3,1fr);">
            <div class="db-stat db-stat-indigo">
                <div class="db-stat-val">${this.formatMin(tm)}</div>
                <div class="db-stat-lbl">Today${avgMin>0?' · avg '+this.formatMin(avgMin):''}</div>
                <div class="db-stat-trend" style="color:${tm>=avgMin&&avgMin>0?'var(--accent-light)':'var(--text-muted)'}">${tm>=avgMin&&avgMin>0?'↑ Above avg':'—'}</div>
            </div>
            <div class="db-stat db-stat-green">
                <div class="db-stat-val">${comp}<span style="font-size:.9rem;font-weight:400;color:var(--color-text-secondary)">/${tot}</span></div>
                <div class="db-stat-lbl">Chapters done</div>
                <div class="db-stat-trend" style="color:${sp>=50?'var(--trend-green)':'var(--text-muted)'}">${sp>=50?'↑ Strong':'—'}</div>
            </div>
            <div class="db-stat db-stat-purple">
                <div class="db-stat-val">${dte!==null&&dte>0?dte:'—'}</div>
                <div class="db-stat-lbl">${dte!==null&&dte>0?'Days to boards':'Exam date'}</div>
                <div class="db-stat-trend" style="color:${dte!==null&&dte<30?'var(--text-danger)':dte!==null&&dte<60?'var(--trend-purple)':'var(--text-muted)'}">${dte!==null&&dte>0?(dte<30?'↓ Very soon':dte<60?'Getting close':'Plenty of time'):'Not set'}</div>
            </div>
        </div>`;

        // ── URGENCY BANNER (only if needed) ──────────────────────
        const urgencyHTML=urgentCount>0?`<div class="db-urgency" onclick="App.navigate('revisions')">
            <div style="display:flex;align-items:center;gap:10px;flex:1">
                <span style="font-size:1.2rem">${od.length>0?'🚨':'🔔'}</span>
                <div>
                    <div style="font-weight:600;font-size:.85rem">${od.length>0?(od.length+' overdue chapter'+(od.length>1?'s':'')+(rd.length>0?' + ':'')):''}${rd.length>0?(rd.length+' revision'+(rd.length>1?'s':'')+' due'):''}</div>
                    <div style="font-size:.75rem;color:var(--color-text-secondary)">${od.length>0?(od[0].name+(od.length>1?' and '+(od.length-1)+' more':'')):((rd[0]&&rd[0].name)||'')} · Tap to review</div>
                </div>
            </div>
            <span style="color:var(--color-text-secondary);font-size:.8rem">→</span>
        </div>`:'';

        // ── WEEK STRIP ────────────────────────────────────────────
        const weekHTML=`<div class="db-week-card card">
            <div class="card-header" style="margin-bottom:14px">
                <span class="card-title">This Week</span>
                <span style="font-size:.78rem;color:var(--text-muted)">${wd.sessions.reduce((a,s)=>a+s.timeSpent,0)>0?this.formatMin(wd.sessions.reduce((a,s)=>a+s.timeSpent,0))+' total':''}</span>
            </div>
            <div class="db-week-strip">
                ${wd.days.map(d=>{
                    const mins=wd.sessions.filter(s=>s.date===d).reduce((a,s)=>a+s.timeSpent,0);
                    const isToday=d===this.today();
                    const height=mins>0?Math.max(20,Math.min(100,Math.round(mins/gm*100)))+'%':'4px';
                    const dayName=new Date(d+'T12:00').toLocaleDateString('en',{weekday:'short'});
                    return`<div class="db-week-col">
                        <div class="db-week-bar-wrap">
                            <div class="db-week-bar ${isToday?'today':''} ${mins>0?'has-data':''}" style="height:${height}" title="${dayName}: ${this.formatMin(mins)}"></div>
                        </div>
                        <div class="db-week-day ${isToday?'today':''}">${dayName}</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        // ── MOOD (compact, inline) ────────────────────────────────
        const moodHTML=!todayMood?`<div class="card db-mood-card">
            <div style="font-size:.78rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">How are you feeling?</div>
            <div style="display:flex;gap:8px">
                ${['🤩','😊','😐','😴','😤'].map(m=>`<button class="db-mood-btn" onclick="App.setMood('${m}')">${m}</button>`).join('')}
            </div>
        </div>`:
        `<div class="card db-mood-card" style="display:flex;align-items:center;gap:12px">
            <span style="font-size:1.6rem">${todayMood.mood}</span>
            <div>
                <div style="font-size:.8rem;font-weight:600">Feeling ${{'🤩':'amazing','😊':'good','😐':'okay','😴':'tired','😤':'frustrated'}[todayMood.mood]||'okay'} today</div>
                <div style="font-size:.72rem;color:var(--text-muted)">${this.getMoodAdvice(todayMood.mood).slice(0,60)}...</div>
            </div>
        </div>`;

        // ── DAILY CHALLENGES ──────────────────────────────────────
        // ── DAILY CHALLENGES ──────────────────────────────────────
        const _dcTotal=dc.challenges.length||3;
        const _dcDone=dc.completed.length;
        const _dcPct=_dcTotal>0?Math.round(_dcDone/_dcTotal*100):0;
        const _allDone=_dcDone===_dcTotal&&_dcTotal>0;
        const _totalXP=dc.challenges.reduce((a,c)=>a+c.xp,0);

        const challengeHTML=(()=>{
            // Empty state
            if(!dc.date||dc.date!==this.today()||dc.challenges.length===0){
                return`<div class="card" style="text-align:center;padding:24px 16px">
                    <span style="font-size:1.3rem">🎯</span>
                    <p style="font-size:.82rem;color:var(--text-muted);margin-top:8px">Challenges refresh daily</p>
                </div>`;
            }
            return`<div class="card" id="dc-card" style="${_allDone?'border:1px solid rgba(34,197,94,0.3)':''}">
                <div class="card-header" style="margin-bottom:6px">
                    <span class="card-title">Daily Challenges</span>
                    <span style="font-size:.72rem;color:var(--text-muted)">${_dcDone}/${_dcTotal} done</span>
                </div>
                <div style="height:3px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:14px">
                    <div style="height:100%;width:${_dcPct}%;background:linear-gradient(90deg,var(--color-brand),#22d3ee);border-radius:2px;transition:width .5s ease"></div>
                </div>
                ${dc.challenges.map((ch,idx)=>{
                    const done=dc.completed.includes(ch.id);
                    const isLast=idx===dc.challenges.length-1;
                    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;${isLast?'':'border-bottom:1px solid var(--border)'}">
                        <div id="dc-chk-${ch.id}" onclick="App._dcToggleAnim(${ch.id},this)" style="width:20px;height:20px;border-radius:6px;border:2px solid ${done?'var(--color-brand)':'var(--border)'};background:${done?'var(--color-brand)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;transition:all .25s cubic-bezier(0.34,1.56,0.64,1)">
                            ${done?`<svg width="10" height="10" viewBox="0 0 10 10" style="display:block"><polyline points="1.5,5 4,7.5 8.5,2" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`:''}
                        </div>
                        <span style="font-size:.82rem;flex:1;transition:opacity .2s;${done?'text-decoration:line-through;opacity:.45':''}">${ch.text}</span>
                        <span style="font-size:.7rem;font-weight:700;background:rgba(99,102,241,0.12);color:var(--accent-light);padding:3px 8px;border-radius:8px;white-space:nowrap">+${ch.xp} XP</span>
                    </div>`;
                }).join('')}
                ${_allDone?`<div style="font-size:.75rem;color:var(--text-success);text-align:center;padding-top:10px">All done! +${_totalXP} XP earned</div>`:''}
            </div>`;
        })();

        // ── SUBJECT PROGRESS ──────────────────────────────────────
        // PERF FIX (LCP): state.subjects is [] on the FIRST dashboard render —
        // subjects are fetched lazily in the background (see init()) and
        // renderDashboard() re-runs once that fetch resolves. Previously
        // render #1 painted a tiny "No subjects yet" card here, then render #2
        // swapped it for a full db-subj-grid of N subject cells — THAT size
        // jump (not the heatmap) is the "Element render delay" Lighthouse is
        // flagging, because it lands below the heatmap card in db-col-main.
        //
        // Fix: while subjects are still loading, render a db-subj-grid
        // SKELETON with the same cell count we expect once data arrives
        // (derived from the student's CBSE class/stream — already known from
        // bootstrap, zero extra fetches). When the real subjects load, the
        // skeleton cells are replaced in place by real ones: same grid, same
        // dimensions, only the content inside each cell changes.
        //
        // NOTE: getHeatmapData() / the heatmap card below is intentionally
        // UNCHANGED — it always returns exactly 90 entries regardless of
        // subjects/sessions state, so its size is identical on render #1 and
        // render #2. It was not actually the source of the resize.
        const subjectsHTML=this.state.subjects.length>0?`<div class="card">
            <div class="card-header" style="margin-bottom:14px">
                <span class="card-title">Subjects</span>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('subjects')" style="font-size:.72rem">See all →</button>
            </div>
            <div class="db-subj-grid">
            ${this.state.subjects.map(s=>{
                const dn=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
                const pc=s.chapters.length>0?Math.round(dn/s.chapters.length*100):0;
                const health=this.computeSubjectHealth(s);
                const hc=health>=70?'var(--success)':health>=40?'var(--warning)':'var(--danger)';
                return`<div class="db-subj-cell" onclick="App.navigate('subjects')">
                    <div class="db-subj-cell-top">
                        <span class="db-subj-cell-icon">${s.icon}</span>
                        <span class="db-subj-cell-name">${s.name}</span>
                        <span class="db-subj-cell-count">${dn}/${s.chapters.length}</span>
                    </div>
                    <div class="db-subj-cell-bar-track">
                        <div class="db-subj-cell-bar-fill" style="width:${pc}%;background:${s.color}"></div>
                    </div>
                    <div class="db-subj-cell-health">
                        <span class="db-subj-cell-hlabel">Health</span>
                        <div class="db-subj-cell-htrack">
                            <div class="db-subj-cell-hfill" style="width:${health}%;background:${hc}"></div>
                        </div>
                        <span class="db-subj-cell-hval" style="color:${hc}">${health}</span>
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
            // Subjects haven't loaded yet (first paint). Estimate the cell
            // count for the skeleton from the student's selected CBSE
            // class/stream — every CBSE class/stream combo ships exactly 5
            // subjects, so this matches the real grid for the vast majority
            // of users. Custom subject lists may differ by a cell or two,
            // which is a one-time, minor resize vs. today's empty→full jump.
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

        // ── UP NEXT ───────────────────────────────────────────────
        const upNextHTML=`<div class="card">
            <div class="card-header" style="margin-bottom:12px">
                <span class="card-title">Up Next</span>
                <button class="btn btn-ghost btn-sm" onclick="App.navigate('coach')" style="font-size:.72rem">Full plan →</button>
            </div>
            ${plan.length===0
                ?'<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:20px 0">All caught up! 🎉</p>'
                :plan.slice(0,4).map(p=>`<div class="plan-card" onclick="App.openChapterDetail('${p.subjectId}','${p.id}')">
                    <div class="plan-emoji">${p.subjectIcon}</div>
                    <div class="plan-info"><h3>${p.name}</h3><p>${p.subjectName}</p></div>
                    <span style="font-size:.65rem;padding:3px 8px;border-radius:6px;white-space:nowrap;background:${p.priority==='overdue'?'rgba(239,68,68,0.1)':p.priority==='revised'?'rgba(6,182,212,0.1)':'rgba(99,102,241,0.1)'};color:${p.priority==='overdue'?'var(--text-danger)':p.priority==='revised'?'var(--info)':'var(--accent-light)'}">${p.reason}</span>
                </div>`).join('')}
        </div>`;

        // ── HEATMAP ───────────────────────────────────────────────
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

        // ── BOARD READINESS (only if exam date set) ───────────────
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
                <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:8px">${dte} days to exam · ${rs>=70?'Looking strong! Keep revising 💪':rs>=40?'Good progress, push harder 🚀':'Need to pick up the pace ⚠️'}</div>
                ${pred?`<div style="font-size:.72rem;color:var(--text-muted)">📈 Predicted finish: ${pred.date} at ${pred.rate} ch/day</div>`:''}
            </div>
        </div>`:'';

        // ── SAVED INDICATOR ───────────────────────────────────────
        const savedHTML=`<div style="text-align:center;padding:8px;font-size:.7rem;color:var(--text-muted)">💾 Data saved locally · <a href="#" onclick="App.exportData();return false;" style="color:var(--accent-light);cursor:pointer;text-decoration:underline">Export backup</a></div>`;

        // ── P0-3: WEAK CHAPTERS ───────────────────────────────────
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

        // ── P1-2: PROACTIVE COACH NUDGE ───────────────────────────
        let coachNudge='';
        const lastStudyDate=this.state.profile.lastStudyDate;
        const daysSinceStudy=lastStudyDate?this.daysBetween(lastStudyDate,this.today()):999;
        const nudgeDismissed=localStorage.getItem('nudge_dismissed')===this.today();
        if(!nudgeDismissed){
            let nudgeMsg='',nudgeIcon='🤖',nudgeBorder='var(--accent)';
            // BUG FIX: user has already studied today — silence is the reward, show nothing
            if(daysSinceStudy===0){
                coachNudge='';
            }else{
                // BUG FIX: all nudge logic runs only when daysSinceStudy > 0
                if(daysSinceStudy===1){
                    nudgeMsg=`Study something today to protect your streak — even 20 minutes counts.`;
                    nudgeIcon='⚡';nudgeBorder='var(--warning)';
                }else if(daysSinceStudy<=3){
                    nudgeMsg=`Your streak is paused. Log any session today to restart it.`;
                    nudgeIcon='🎯';nudgeBorder='var(--warning)';
                }else if(daysSinceStudy<=6){
                    nudgeMsg=`It's been a few days — no pressure. One session today puts you back on track.`;
                    nudgeIcon='💪';nudgeBorder='var(--accent)';
                }else if(daysSinceStudy>=7){
                    nudgeMsg=`Fresh start. Log one session today — your streak begins now.`;
                    nudgeIcon='🌱';nudgeBorder='var(--success)';
                }
                if(!nudgeMsg&&weakChapters.length>=3){
                    nudgeMsg=`${weakChapters.length} chapters flagged as weak (${weakChapters.slice(0,2).map(c=>c.name).join(', ')}${weakChapters.length>2?'…':''}). These need focused re-study before boards.`;
                    nudgeIcon='📉';nudgeBorder='var(--danger)';
                }
                if(!nudgeMsg&&dte!==null&&dte>0&&remaining>0){
                    const needed=remaining/dte;const actual=pred?pred.rate:0;
                    if(actual>0&&actual<needed*0.6){
                        nudgeMsg=`At your current pace (${actual} ch/day) you need ${needed.toFixed(1)} ch/day to finish before boards. You're behind — consider pushing 1 extra chapter today.`;
                        nudgeIcon='⏰';nudgeBorder='var(--danger)';
                    }
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

        // ── ASSEMBLE ──────────────────────────────────────────────
        el.innerHTML=`
        ${freezeBannerHTML}
        <p class="db-greeting-compact">Good ${this.getGreeting()}, ${this.state.profile.name} 👋 &nbsp;·&nbsp; ${this.getMotivation()} ✨</p>
        ${heroHTML}
        ${statsHTML}
        ${urgencyHTML}
        <div id="backlog-dashboard-widget">${window.Backlog ? Backlog.renderDashboardWidget() : ''}</div>
        ${coachNudge}
        <div class="db-two-col">
            <div class="db-col-main">
                ${weekHTML}
                ${challengeHTML}
                ${heatmapHTML}
                ${subjectsHTML}
            </div>
            <div class="db-col-side">
                ${moodHTML}
                ${readinessHTML}
                ${weakHTML}
                ${upNextHTML}
            </div>
        </div>
        ${savedHTML}`;

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
    renderSubjects(){
        const el=document.getElementById('page-subjects'),subs=this.state.subjects;
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><div></div><button class="btn btn-primary" onclick="App.openModal('modal-subject')">+ Subject</button></div><div class="subject-tabs"><div class="subject-tab ${this.state.selectedSubjectFilter==='all'?'active':''}" onclick="App.filterSubject('all')">All</div>${subs.map(s=>`<div class="subject-tab ${this.state.selectedSubjectFilter===s.id?'active':''}" onclick="App.filterSubject('${s.id}')">${s.icon} ${s.name}</div>`).join('')}</div>`;
        const flt=this.state.selectedSubjectFilter==='all'?subs:subs.filter(s=>s.id===this.state.selectedSubjectFilter);
        const fmtShort=ds=>ds?new Date(ds+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):null;
        // Built once per render (O(sessions)) instead of once per chapter per
        // render (O(chapters × sessions)) — see chapter-meta lastStudied lookup below.
        const lastStudiedMap=new Map();
        this.state.sessions.forEach(sess=>{
            if(!sess.chapterId)return;
            const prev=lastStudiedMap.get(sess.chapterId);
            if(!prev||sess.date>prev)lastStudiedMap.set(sess.chapterId,sess.date);
        });
        if(subs.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div></span><div class="empty-state-title">No subjects yet</div><div class="empty-state-desc">Load your entire CBSE Class ${this.state.profile.selectedClass||10} syllabus in one tap, or add subjects manually.</div><div style="display:flex;gap:var(--sp-2);justify-content:center;flex-wrap:wrap"><button class="btn btn-primary" onclick="App._welcomeClass=App.state.profile.selectedClass||10;App._welcomeStream=App.state.profile.selectedStream||null;App.loadCBSEForClass()">Load CBSE Class ${this.state.profile.selectedClass||10} Syllabus</button><button class="btn btn-secondary" onclick="App.openModal('modal-subject')">+ Add Manually</button></div><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>CBSE loads all 5 subjects with chapters pre-filled</div></div>`}
        else{flt.forEach(s=>{
            const dn=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length,pc=s.chapters.length>0?Math.round(dn/s.chapters.length*100):0;
            const trophyIcon=pc>=100?'🥇':pc>=75?'🥈':pc>=50?'🥉':'';
            const health=this.computeSubjectHealth(s);
            const healthColor=health>=70?'var(--success)':health>=40?'var(--warning)':'var(--danger)';
            const healthLabel=health>=70?'Strong':'Needs work';
            h+=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${s.color}"><div class="card-header" style="flex-wrap:wrap"><div style="flex:1;min-width:0"><span class="card-title" style="font-size:1rem">${s.icon} ${s.name} ${trophyIcon}</span><p style="font-size:.72rem;color:var(--text-muted);margin-top:4px">${dn}/${s.chapters.length} • ${pc}%</p></div><div style="display:flex;gap:4px;flex-shrink:0"><button class="btn btn-sm btn-secondary" onclick="App.openAddChapterModal('${s.id}')">+</button><button class="btn btn-sm btn-danger" onclick="App.deleteSubject('${s.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div><div class="progress-bar" style="margin-bottom:10px"><div class="progress-fill" style="width:${pc}%;background:${s.color}"></div></div><div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><span style="font-size:.65rem;color:var(--text-muted);flex-shrink:0">Health</span><div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${health}%;background:${healthColor};border-radius:3px;transition:width .8s ease"></div></div><span style="font-size:.65rem;font-weight:700;color:${healthColor};flex-shrink:0">${health} · ${healthLabel}</span></div><div style="display:flex;flex-direction:column;gap:8px">${s.chapters.length===0?'<p style="color:var(--text-muted);font-size:.85rem;text-align:center;padding:16px">No chapters</p>':s.chapters.map(c=>{const ov=c.deadline&&c.deadline<this.today()&&c.status!=='completed'&&c.status!=='revised';const confMap={1:'🔴',2:'🟡',3:'🟢',4:'⚡'};const confTag=c.confidence?`<span style="font-size:.65rem">${confMap[c.confidence]}</span>`:'';const lastStudied=fmtShort(lastStudiedMap.get(c.id));const studiedTag=lastStudied?`<span style="font-size:.65rem;color:var(--text-muted)">Last: ${lastStudied}</span>`:'';return`<div class="chapter-item" style="box-sizing:border-box"><div class="chapter-check ${c.status==='completed'||c.status==='revised'?'done':''}" onclick="event.stopPropagation();App.toggleChapter('${s.id}','${c.id}')">${c.status==='completed'||c.status==='revised'?'✓':''}</div><div class="chapter-info" onclick="App.openChapterDetail('${s.id}','${c.id}')"><div class="chapter-name">${c.name}</div><div class="chapter-meta"><span class="tag tag-${c.status.replace(' ','-')}">${c.status.replace('-',' ')}</span><span class="tag tag-${c.difficulty}">${c.difficulty}</span>${c.revisionCount>0?`<span style="font-size:.65rem">🔄${c.revisionCount}</span>`:''}${studiedTag}${confTag}${c.weakFlag?'<span class="tag" style="background:rgba(239,68,68,0.1);color:var(--text-danger)">weak</span>':''}${ov?'<span class="tag tag-overdue">!</span>':''}</div></div><div class="chapter-actions" style="flex-shrink:0"><button class="ch-btn" onclick="event.stopPropagation();App.quickRevision('${s.id}','${c.id}')" title="Revise"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></button><button class="ch-btn" onclick="event.stopPropagation();App.deleteChapter('${s.id}','${c.id}')" title="Delete"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`}).join('')}</div></div>`})}
        el.innerHTML=h;
    },
    filterSubject(id){this.state.selectedSubjectFilter=id;this.renderSubjects()},
    toggleChapter(sId,cId){
        const ch=this.getChapter(sId,cId);if(!ch)return;
        if(ch.status==='completed'||ch.status==='revised'){ch.status='in-progress';ch.completionDate=null}
        else{
            ch.status='completed';ch.completionDate=this.today();
            this.addXP(20,'Chapter completed');this.celebrate();
            // Check if subject is now fully complete
            const sub=this.getSubjectById(sId);
            if(sub&&sub.chapters.every(c=>c.status==='completed'||c.status==='revised')){
                setTimeout(()=>{this.celebrate();this.toast(`🏆 ${sub.icon} ${sub.name} complete! Amazing!`,'success')},800);
            }
        }
        const _isUUID = s => s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:ch.status,completion_date:ch.completionDate||null}).then(({error})=>{if(error)console.error('[DB] chapters.update status:',error);});}
        this.save();this.render();
    },
    quickRevision(sId,cId){const ch=this.getChapter(sId,cId);if(!ch)return;ch.revisionCount++;ch.revisionDates.push(this.today());ch.status='revised';if(!ch.completionDate)ch.completionDate=this.today();const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:'revised',revision_count:ch.revisionCount,revision_dates:ch.revisionDates,completion_date:ch.completionDate}).then(({error})=>{if(error)console.error('[DB] quickRevision chapters.update:',error);});}this.addXP(15,'Revision done');this.recordStudyDay();this.save();this.render();this.toast(`🔄 Rev ${ch.revisionCount}: "${ch.name}"`,'success')},
    deleteChapter(sId,cId){if(!confirm('Delete chapter?'))return;const s=this.getSubjectById(sId);const _dc=s.chapters.find(c=>c.id===cId);s.chapters=s.chapters.filter(c=>c.id!==cId);const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_dc&&_isUUID(_dc.id)){DB.chapters.delete(_dc.id).then(({error})=>{if(error)console.error('[DB] chapters.delete:',error);});}this.save();this.render()},
    deleteSubject(sId){if(!confirm('Delete subject and all its chapters?'))return;const _ds=this.state.subjects.find(s=>s.id===sId);this.state.subjects=this.state.subjects.filter(s=>s.id!==sId);const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_ds&&_isUUID(_ds.id)){DB.subjects.delete(_ds.id).then(({error})=>{if(error)console.error('[DB] subjects.delete:',error);});}this.save();this.render()},

    openChapterDetail(sId,cId){
        const ch=this.getChapter(sId,cId),sub=this.getSubjectById(sId);if(!ch||!sub)return;
        const ss=this.state.sessions.filter(s=>s.chapterId===cId),tt=ss.reduce((a,s)=>a+s.timeSpent,0);
        const ov=ch.deadline&&ch.deadline<this.today()&&ch.status!=='completed'&&ch.status!=='revised';
        const exKey=sId+'_'+cId;
        const exercises=this.state.exercises[exKey]||[];
        document.getElementById('detail-body').innerHTML=`<div style="margin-bottom:18px"><span class="tag" style="background:${sub.color}22;color:${sub.color}">${sub.icon} ${sub.name}</span><h3 style="font-size:1.15rem;margin-top:8px">${ch.name}</h3></div><div class="grid grid-3" style="margin-bottom:18px"><div class="card" style="padding:14px;text-align:center"><p style="font-size:1.2rem;font-weight:700">${this.formatMin(tt)}</p><p style="font-size:.7rem;color:var(--text-muted)">Time</p></div><div class="card" style="padding:14px;text-align:center"><p style="font-size:1.2rem;font-weight:700">${ch.revisionCount}</p><p style="font-size:.7rem;color:var(--text-muted)">Revisions</p></div><div class="card" style="padding:14px;text-align:center"><p style="font-size:1.2rem;font-weight:700">${ss.length}</p><p style="font-size:.7rem;color:var(--text-muted)">Sessions</p></div></div><div class="form-row" style="margin-bottom:16px"><div class="form-group" style="margin:0"><label class="form-label">Status</label><select class="form-select" onchange="App.updateChapterField('${sId}','${cId}','status',this.value)"><option value="not-started" ${ch.status==='not-started'?'selected':''}>Not Started</option><option value="in-progress" ${ch.status==='in-progress'?'selected':''}>In Progress</option><option value="completed" ${ch.status==='completed'?'selected':''}>Completed</option><option value="revised" ${ch.status==='revised'?'selected':''}>Revised</option></select></div><div class="form-group" style="margin:0"><label class="form-label">Difficulty</label><select class="form-select" onchange="App.updateChapterField('${sId}','${cId}','difficulty',this.value)"><option value="easy" ${ch.difficulty==='easy'?'selected':''}>Easy</option><option value="medium" ${ch.difficulty==='medium'?'selected':''}>Medium</option><option value="hard" ${ch.difficulty==='hard'?'selected':''}>Hard</option></select></div></div><div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" value="${ch.deadline||''}" onchange="App.updateChapterField('${sId}','${cId}','deadline',this.value)">${ov?'<p style="color:var(--text-danger);font-size:.75rem;margin-top:4px">Overdue!</p>':''}</div><div class="form-group"><label class="form-label">Notes</label><textarea class="form-textarea" placeholder="Study notes..." onchange="App.updateChapterField('${sId}','${cId}','notes',this.value)">${ch.notes||''}</textarea></div><div class="form-group"><label class="form-label">Exercises</label><div style="display:flex;gap:6px;margin-bottom:8px"><input type="text" id="ex-new-${exKey.replace(/[^a-zA-Z0-9]/g,'')}" class="form-input" placeholder="Ex 1.1, Ex 1.2..." style="flex:1"><button class="btn btn-sm btn-secondary" onclick="App.addExercise('${sId}','${cId}')">Add</button></div><div class="exercise-grid">${exercises.map((ex,i)=>`<div class="exercise-chip ${ex.done?'done':''}" onclick="App.toggleExercise('${sId}','${cId}',${i})">${ex.name} ${ex.done?'✓':''}</div>`).join('')}</div></div>`;
        document.getElementById('detail-footer').innerHTML=`<button class="btn btn-secondary" onclick="App.closeModal('modal-detail')">Close</button><button class="btn btn-primary" onclick="App.openQuickLog('${sId}','${cId}');App.closeModal('modal-detail')">Log Study</button>`;
        this.openModal('modal-detail');
    },
    updateChapterField(sId,cId,f,v){const ch=this.getChapter(sId,cId);if(!ch)return;ch[f]=v;if(f==='status'&&v==='completed'&&!ch.completionDate){ch.completionDate=this.today();this.addXP(20,'Chapter completed')}const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){const _dbField={status:'status',difficulty:'difficulty',deadline:'deadline',notes:'notes'}[f];if(_dbField){DB.chapters.update(ch.id,{[_dbField]:v}).then(({error})=>{if(error)console.error('[DB] updateChapterField:',error);});}}this.save();this.render()},

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
    renderExercises(){
        const el=document.getElementById('page-exercises');
        let h='<div style="margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">Track NCERT exercises, RD Sharma, and sample papers per chapter.</p></div>';
        const subs=this.state.subjects;
        if(subs.length===0){h+='<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></div></span><div class="empty-state-title">Add subjects first</div><div class="empty-state-desc">Exercises are tracked per chapter. Load your CBSE syllabus or add subjects to get started.</div><button class="btn btn-primary" onclick="App.navigate(\'subjects\')">Go to Subjects →</button></div>';el.innerHTML=h;return}
        subs.forEach(s=>{
            const chaptersWithEx=s.chapters.filter(c=>{const k=s.id+'_'+c.id;return this.state.exercises[k]&&this.state.exercises[k].length>0});
            if(chaptersWithEx.length===0)return;
            h+=`<div class="card" style="margin-bottom:16px;border-left:3px solid ${s.color}"><div class="card-header"><span class="card-title">${s.icon} ${s.name}</span></div>`;
            chaptersWithEx.forEach(c=>{
                const k=s.id+'_'+c.id;const exs=this.state.exercises[k]||[];
                const doneCount=exs.filter(e=>e.done).length;
                h+=`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:.85rem;font-weight:600">${c.name}</span><span style="font-size:.75rem;color:var(--text-muted)">${doneCount}/${exs.length}</span></div><div class="exercise-grid">${exs.map((ex,i)=>`<div class="exercise-chip ${ex.done?'done':''}" onclick="App.toggleExercise('${s.id}','${c.id}',${i})">${ex.name} ${ex.done?'✓':''}</div>`).join('')}</div></div>`;
            });
            h+='</div>';
        });
        // Also show chapters with no exercises
        let emptyCount=0;
        subs.forEach(s=>{s.chapters.forEach(c=>{const k=s.id+'_'+c.id;if(!this.state.exercises[k]||this.state.exercises[k].length===0)emptyCount++})});
        if(emptyCount>0)h+=`<p style="color:var(--text-muted);font-size:.82rem;text-align:center;margin-top:16px">${emptyCount} chapters have no exercises tracked. Open chapter details to add them.</p>`;
        el.innerHTML=h;
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
<div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="log-subject" onchange="App.updateLogChapters()"><option value="">Select</option>${subs.map(s=>`<option value="${s.id}" ${s.id===pSub?'selected':''}>${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Chapter</label><select class="form-select" id="log-chapter"><option value="">Select</option>${co}</select></div></div>
<div class="form-group">
    <label class="form-label">What did you cover?</label>
    <input type="text" id="log-covered" class="form-input" placeholder="e.g. Completed Newton's laws, revised Chapter 3..." maxlength="200">
    <div id="log-covered-error" style="display:none;color:var(--color-danger);font-size:0.75rem;margin-top:4px">Please add a quick note on what you studied</div>
</div>
<div class="form-group"><label class="form-label">Intention</label><div class="quick-log" id="intention-chips"><div class="quick-chip selected" data-intention="understand" onclick="App.selectIntention(this)">🧠 Understand</div><div class="quick-chip" data-intention="revise" onclick="App.selectIntention(this)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> Revise</div><div class="quick-chip" data-intention="practice" onclick="App.selectIntention(this)">✏️ Practice</div><div class="quick-chip" data-intention="doubts" onclick="App.selectIntention(this)">❓ Clear Doubts</div></div></div>
<div class="form-group"><label class="form-label">Time Spent</label><div class="quick-log" id="time-chips"><div class="quick-chip" data-min="15" onclick="App.selectTime(this)">15m</div><div class="quick-chip" data-min="30" onclick="App.selectTime(this)">30m</div><div class="quick-chip selected" data-min="45" onclick="App.selectTime(this)">45m</div><div class="quick-chip" data-min="60" onclick="App.selectTime(this)">1h</div><div class="quick-chip" data-min="90" onclick="App.selectTime(this)">1.5h</div><div class="quick-chip" data-min="120" onclick="App.selectTime(this)">2h</div></div><input type="number" id="log-time-custom" class="form-input" placeholder="Or enter minutes" min="1" style="margin-top:8px" oninput="App.updateDurationHint()">
<div id="duration-hint" style="color:${defaultHintColor};font-size:0.75rem;margin-top:4px">${defaultHintText}</div>
</div>
<div class="form-group"><label class="form-label">Type</label><div class="quick-log" id="type-chips"><div class="quick-chip selected" data-type="learning" onclick="App.selectType(this)">📖 Learning</div><div class="quick-chip" data-type="revision" onclick="App.selectType(this)">🔄 Revision</div><div class="quick-chip" data-type="practice" onclick="App.selectType(this)">✏️ Practice</div><div class="quick-chip" data-type="test" onclick="App.selectType(this)">📝 Test</div></div></div>
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
    selectIntention(el){document.querySelectorAll('#intention-chips .quick-chip').forEach(c=>c.classList.remove('selected'));el.classList.add('selected')},

    saveStudyLog(){
        const sId=document.getElementById('log-subject').value,cId=document.getElementById('log-chapter').value,ct=document.getElementById('log-time-custom').value,st=document.querySelector('#time-chips .quick-chip.selected'),time=ct?parseInt(ct):(st?parseInt(st.dataset.min):0),type=document.querySelector('#type-chips .quick-chip.selected')?.dataset.type||'learning',rating=document.querySelectorAll('#productivity-stars .star.active').length,notes=document.getElementById('log-notes').value;
        const confBtn=document.querySelector('#confidence-chips .conf-btn.selected');
        const confidence=confBtn?parseInt(confBtn.dataset.conf):3;
        const intentionChip=document.querySelector('#intention-chips .quick-chip.selected');
        const intention=intentionChip?intentionChip.dataset.intention:'understand';

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
        const _newSession={id:this.uid(),subjectId:sId,chapterId:cId||'',chapterName:ch?ch.name:'',subjectName:sub.name,date:this.today(),timeSpent:time,type,rating,notes,confidence,intention,coveredNote,streakEligible,createdAt:Date.now()};
        this.state.sessions.push(_newSession);
        // Supabase fire-and-forget
        const _userId=window._supabaseUserId;
        if(_userId){
            DB.sessions.create({user_id:_userId,subject_id:sId,chapter_id:cId||null,time_spent:time,date:this.today(),type,rating,notes}).then(({data,error})=>{
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
        }
        if(type==='revision'&&ch){ch.revisionCount++;ch.revisionDates.push(this.today());if(ch.status==='completed')ch.status='revised';this.addXP(15,'Revision');const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(ch.id)){DB.chapters.update(ch.id,{status:ch.status,revision_count:ch.revisionCount,revision_dates:ch.revisionDates,completion_date:ch.completionDate||null}).then(({error})=>{if(error)console.error('[DB] saveStudyLog revision chapters.update:',error);});}}
        // LOG VALIDATION — STEP 4: pass streakEligible so short sessions are neutral, not misses
        this.recordStudyDay(streakEligible);
        this.addXP(10,'Session logged');
        const tm=this.getTodayMinutes();if(tm>=this.state.profile.dailyGoalMinutes){const pm=tm-time;if(pm<this.state.profile.dailyGoalMinutes){this.addXP(25,'Daily goal! 🎯');this.celebrate();this.showGoalHitBanner()}}
        this.save();this.closeModal('modal-log');this.render();this.toast(`📖 ${this.formatMin(time)} logged!`,'success');
        this.dismissStreakReminder(false);
        if (window.Backlog && cId && ch) Backlog.onSessionLogged(sub.name, ch.name);
    },

    renderLog(){
        const el=document.getElementById('page-log'),ss=[...this.state.sessions].sort((a,b)=>b.date!==a.date?b.date.localeCompare(a.date):(b.createdAt||0)-(a.createdAt||0)),gr={};ss.forEach(s=>{if(!gr[s.date])gr[s.date]=[];gr[s.date].push(s)});
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${this.state.sessions.length} sessions • ${this.formatMin(this.state.sessions.reduce((a,s)=>a+s.timeSpent,0))}</p><button class="btn btn-primary" onclick="App.openQuickLog()">Log</button></div>`;
        if(ss.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div></span><div class="empty-state-title">No sessions logged yet</div><div class="empty-state-desc">Every study session you log builds your streak, earns XP, and helps the AI Coach give you better advice.</div><button class="btn btn-primary" onclick="App.openQuickLog()">Log Your First Session</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Even 15 minutes counts!</div></div>`}
        else{Object.keys(gr).sort((a,b)=>b.localeCompare(a)).forEach(d=>{const dm=gr[d].reduce((a,s)=>a+s.timeSpent,0);h+=`<div style="margin-bottom:20px"><div style="display:flex;justify-content:space-between;margin-bottom:10px"><h3 style="font-size:.9rem;font-weight:600">${d===this.today()?'Today':d}</h3><span style="font-size:.78rem;color:var(--accent-light);font-weight:600">${this.formatMin(dm)}</span></div>${gr[d].map(s=>{const sub=this.getSubjectById(s.subjectId);const confMap={1:'🔴',2:'🟡',3:'🟢',4:'⚡'};const confEmoji=s.confidence?confMap[s.confidence]:'';return`<div class="plan-card" style="cursor:default"><div class="plan-emoji">${sub?sub.icon:'📖'}</div><div class="plan-info"><h4>${sub?sub.name:'?'} ${s.chapterName?'— '+s.chapterName:''}</h4><p>${s.type}${s.intention?' · '+s.intention:''} ${'⭐'.repeat(s.rating||0)}</p></div><div style="text-align:right"><div class="plan-time">${this.formatMin(s.timeSpent)} ${confEmoji}</div><button class="ch-btn" style="margin-top:4px" onclick="App.deleteSession('${s.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`}).join('')}</div>`})}
        el.innerHTML=h;
    },
    deleteSession(id){if(!confirm('Delete?'))return;const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.sessions.delete(id).then(({error})=>{if(error)console.error('[DB] sessions.delete:',error);});}this.state.sessions=this.state.sessions.filter(s=>s.id!==id);this.save();this.render()},

    // TASKS
    renderTasks(){
        const el=document.getElementById('page-tasks');const today=this.today();
        let todayTasks=this.state.tasks.filter(t=>t.date===today);
        // Carry forward incomplete tasks from yesterday
        const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const yStr=yesterday.toISOString().split('T')[0];
        const carryForward=this.state.tasks.filter(t=>t.date===yStr&&!t.done);
        if(carryForward.length>0){
            carryForward.forEach(t=>{if(!todayTasks.find(x=>x.text===t.text)){this.state.tasks.push({id:this.uid(),text:'⏩ '+t.text,done:false,date:today,createdAt:Date.now()});todayTasks=this.state.tasks.filter(x=>x.date===today)}});
            this.save();
        }
        const doneCount=todayTasks.filter(t=>t.done).length;
        let h=`<div style="display:flex;justify-content:space-between;margin-bottom:18px"><p style="color:var(--text-secondary);font-size:.9rem">${doneCount}/${todayTasks.length} done</p><div style="display:flex;gap:8px"><button class="btn btn-secondary btn-sm" onclick="App.autoGenerateTasks()">Auto-Plan</button></div></div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Add Task</span></div><div style="display:flex;gap:8px"><input type="text" id="new-task" class="form-input" placeholder="e.g., Solve Ex 2.3..." style="flex:1" onkeydown="if(event.key==='Enter')App.addTask()"><button class="btn btn-primary btn-sm" onclick="App.addTask()">Add</button></div></div>`;
        h+=`<div class="card"><div class="card-header"><span class="card-title">Today's Tasks</span></div>`;
        if(todayTasks.length===0){h+=`<div class="empty-state"><span class="empty-state-icon"><div style="width:72px;height:72px;border-radius:16px;background:rgba(99,102,241,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 4px"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div></span><div class="empty-state-title">No tasks for today</div><div class="empty-state-desc">Tasks help you stay focused on what matters. Add your own or let AI plan your day automatically.</div><button class="btn btn-primary" onclick="App.autoGenerateTasks()">Auto-Plan My Day</button><div class="empty-state-hint"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Tip: Auto-Plan pulls from your overdue chapters and revisions</div></div>`}
        else{todayTasks.forEach(t=>{h+=`<div class="task-item"><div class="task-check ${t.done?'done':''}" onclick="App.toggleTask('${t.id}')">${t.done?'✓':''}</div><span class="task-text ${t.done?'done':''}">${t.text}</span><button class="ch-btn" onclick="App.deleteTask('${t.id}')" style="width:24px;height:24px;font-size:.7rem">✕</button></div>`})}
        h+='</div>';el.innerHTML=h;
    },
    addTask(){const inp=document.getElementById('new-task');const text=inp.value.trim();if(!text)return;const _t={id:this.uid(),text,done:false,date:this.today(),createdAt:Date.now()};this.state.tasks.push(_t);const _tUid=window._supabaseUserId;if(_tUid){DB.tasks.create({user_id:_tUid,text,done:false,date:this.today()}).then(({data,error})=>{if(error){console.error('[DB] tasks.create:',error);return;}if(data&&data.id)_t.id=data.id;});}this.save();inp.value='';this.renderTasks();this.toast('Task added','success')},
    toggleTask(id){const t=this.state.tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;if(t.done)this.addXP(5,'Task completed');const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);const _tuUid=window._supabaseUserId;if(_tuUid&&_isUUID(t.id)){DB.tasks.update(t.id,{done:t.done}).then(({error})=>{if(error)console.error('[DB] tasks.update:',error);});}this.save();this.renderTasks();this.checkDailyChallenges()},
    deleteTask(id){const _isUUID=s=>s&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);if(_isUUID(id)){DB.tasks.delete(id).then(({error})=>{if(error)console.error('[DB] tasks.delete:',error);});}this.state.tasks=this.state.tasks.filter(t=>t.id!==id);this.save();this.renderTasks()},
    autoGenerateTasks(){const tasks=[];const od=this.getOverdueChapters();od.slice(0,2).forEach(c=>tasks.push(`📌 Complete: ${c.subjectIcon} ${c.name}`));const rd=this.getRevisionsDue();rd.slice(0,2).forEach(c=>tasks.push(`🔄 Revise: ${c.subjectIcon} ${c.name}`));const pending=this.getAllChapters().filter(c=>c.status==='in-progress');pending.slice(0,2).forEach(c=>tasks.push(`📖 Continue: ${c.subjectIcon} ${c.name}`));if(tasks.length===0)tasks.push('📚 Study for '+this.formatMin(this.state.profile.dailyGoalMinutes));const _agUid=window._supabaseUserId;tasks.forEach(t=>{if(!this.state.tasks.some(x=>x.text===t&&x.date===this.today())){const _at={id:this.uid(),text:t,done:false,date:this.today(),createdAt:Date.now()};this.state.tasks.push(_at);if(_agUid){DB.tasks.create({user_id:_agUid,text:t,done:false,date:this.today()}).then(({data,error})=>{if(error){console.error('[DB] auto tasks.create:',error);return;}if(data&&data.id)_at.id=data.id;});}}});this.save();this.renderTasks();this.toast('Tasks auto-generated! 🤖','success')},

    // --- END OF PART 1 --- (continued in Part 2)
    // The following methods are defined in Part 2:
    // renderExams, openExamModal, saveExamScore, renderRevisions,
    // renderDoubts, openDoubtModal, saveDoubt, renderResources, openResourceModal, saveResource,
    // renderPlanning, renderWeekly, renderPomodoro, startPomodoro, pausePomodoro, resetPomodoro,
    // skipPomodoro, pomodoroComplete, updatePomodoroSetting, startStopwatch, startStopwatchTimer,
    // stopStopwatch, renderNotes, addNote (modal version), saveNoteFromModal, deleteNote,
    // renderCoach, getCoachMessage, renderRewards, renderSettings,
    // handleSearch, openModal, closeModal, openAddChapterModal, saveChapter, saveSubject, pickColor,
    // exportData, importData, resetAll, toast, celebrate
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
                h+=`<div class="subject-progress"><div class="sp-header"><span class="sp-name">${sub.icon} ${sub.name} ${trend}</span><span class="sp-pct" style="color:${pct>=80?'var(--text-success)':pct>=50?'var(--text-warning)':'var(--text-danger)'}">${pct}%</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${sub.color}"></div></div>${prevPct!==null?`<p style="font-size:.68rem;color:var(--text-muted);margin-top:2px">Previous: ${prevPct}% → Current: ${pct}% (${pct-prevPct>=0?'+':''}${pct-prevPct}%)</p>`:''}</div>`;
            });
            h+='</div>';
            // Target vs actual
            if(this.state.profile.targetScore){
                h+=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${avg>=this.state.profile.targetScore?'var(--success)':'var(--warning)'}"><div class="card-header"><span class="card-title">Target vs Actual</span></div><p style="font-size:.9rem">Target: <strong>${this.state.profile.targetScore}%</strong> | Average: <strong style="color:${avg>=this.state.profile.targetScore?'var(--text-success)':'var(--text-danger)'}">${avg}%</strong> ${avg>=this.state.profile.targetScore?'On track!':'Needs improvement'}</p></div>`;
            }
        }
        h+=`<div class="card"><div class="card-header"><span class="card-title">All Scores</span></div>`;
        if(scores.length===0)h+='<p style="color:var(--text-muted);font-size:.85rem">No scores yet. Log your first exam!</p>';
        else{[...scores].reverse().forEach(e=>{const sub=this.getSubjectById(e.subjectId);const pct=Math.round(e.scored/e.total*100);h+=`<div class="rev-item"><div class="rev-info"><h4>${sub?sub.icon:''} ${e.name}</h4><p>${sub?sub.name:''} • ${e.date} • ${e.scored}/${e.total}</p></div><div style="display:flex;align-items:center;gap:8px"><span style="font-size:.85rem;font-weight:700;color:${pct>=80?'var(--text-success)':pct>=50?'var(--text-warning)':'var(--text-danger)'}">${pct}%</span><button class="ch-btn" onclick="App.deleteExam('${e.id}')" style="width:24px;height:24px;font-size:.65rem"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`})}
        h+='</div>';el.innerHTML=h;
    },
    openExamModal(){
        const subs=this.state.subjects;
        document.getElementById('exam-form-body').innerHTML=`<div class="form-group"><label class="form-label">Exam Name</label><input type="text" id="exam-name" class="form-input" placeholder="e.g., Unit Test 3"></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="exam-subject">${subs.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Date</label><input type="date" id="exam-date" class="form-input" value="${this.today()}"></div></div><div class="form-row"><div class="form-group"><label class="form-label">Marks Obtained</label><input type="number" id="exam-scored" class="form-input" placeholder="28" min="0"></div><div class="form-group"><label class="form-label">Total Marks</label><input type="number" id="exam-total" class="form-input" placeholder="40" min="1"></div></div>`;
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
        el.innerHTML=`<div class="grid grid-3" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg></div><div class="stat-info"><h3>${rd.length}</h3><p>Due now</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="stat-info"><h3>${rc.length}</h3><p>Revised</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><h3>${totalRevisions}</h3><p>Total revisions</p></div></div></div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Due Now</span></div>${rd.length===0?'<p style="color:var(--text-muted);font-size:.85rem">All clear! 🎉</p>':rd.map(c=>`<div class="rev-item"><div class="rev-info"><h4>${c.subjectIcon} ${c.name}</h4><p>${c.subjectName} • ${c.daysSince}d ago • Rev #${c.revisionCount}</p></div><button class="btn btn-sm btn-primary" onclick="App.quickRevision('${c.subjectId}','${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> Revise</button></div>`).join('')}</div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Revision History</span></div>${rc.length===0?'<p style="color:var(--text-muted);font-size:.85rem">No revisions yet</p>':rc.sort((a,b)=>b.revisionCount-a.revisionCount).slice(0,15).map(c=>`<div class="rev-item"><div class="rev-info"><h4>${c.subjectIcon} ${c.name}</h4><p>${c.subjectName} • ${c.revisionCount} revision${c.revisionCount>1?'s':''} • Last: ${c.revisionDates[c.revisionDates.length-1]||'N/A'}</p></div><span class="tag tag-revised">×${c.revisionCount}</span></div>`).join('')}</div><div class="card" style="border-left:3px solid var(--info)"><div class="card-header"><span class="card-title">Spaced Repetition Schedule</span></div><div style="font-size:.82rem;color:var(--text-secondary);line-height:1.7"><p>Rev 1: <strong>1 day</strong> after completion</p><p>Rev 2: <strong>3 days</strong> after Rev 1</p><p>Rev 3: <strong>7 days</strong> after Rev 2</p><p>Rev 4: <strong>14 days</strong> after Rev 3</p><p>Rev 5: <strong>30 days</strong> after Rev 4</p></div></div>`;
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
                html+=`<div class="doubt-item"><div style="display:flex;justify-content:space-between;align-items:flex-start"><div><h4>${d.text}</h4><p>${sub?sub.icon+' '+sub.name:''} ${d.chapter?'• '+d.chapter:''} ${d.priority==='must-clear'?'<span class="tag tag-hard" style="margin-left:4px">Must Clear</span>':''}</p></div><span class="tag tag-${d.status}">${d.status}</span></div><div class="doubt-actions">${d.status==='unresolved'?`<button class="btn btn-sm btn-warning" onclick="App.updateDoubtStatus('${d.id}','asked')">Asked Teacher</button>`:''} ${d.status!=='understood'?`<button class="btn btn-sm btn-success" onclick="App.updateDoubtStatus('${d.id}','understood')">Understood</button>`:''}<button class="ch-btn" onclick="App.deleteDoubt('${d.id}')" style="width:28px;height:28px"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div></div>`;
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
        const subs=this.state.subjects;
        document.getElementById('doubt-form-body').innerHTML=`<div class="form-group"><label class="form-label">Doubt / Topic</label><input type="text" id="doubt-text" class="form-input" placeholder="e.g., I don't understand trigonometric identities proof"></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="doubt-subject"><option value="">Select</option>${subs.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Chapter (optional)</label><input type="text" id="doubt-chapter" class="form-input" placeholder="e.g., Trigonometry"></div></div><div class="form-group"><label class="form-label">Priority</label><div class="quick-log"><div class="quick-chip selected" data-priority="must-clear" onclick="App.pickDoubtPriority(this)">🔴 Must Clear Before Exam</div><div class="quick-chip" data-priority="nice-to-know" onclick="App.pickDoubtPriority(this)">🟡 Nice to Know</div></div></div>`;
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
        this.save();this.closeModal('modal-doubt');this.render();this.toast('❓ Doubt added','success');
    },
    updateDoubtStatus(id,status){
        const d=this.state.doubts.find(x=>x.id===id);if(!d)return;
        d.status=status;
        if(status==='understood'){d.resolvedDate=this.today();this.addXP(10,'Doubt cleared! 🧠')}
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
                h+=`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">${sub?sub.icon+' '+sub.name:'General'}</span></div>`;
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
        document.getElementById('resource-form-body').innerHTML=`<div class="form-group"><label class="form-label">Title</label><input type="text" id="res-title" class="form-input" placeholder="e.g., Best Electricity chapter video"></div><div class="form-group"><label class="form-label">URL / Link</label><input type="url" id="res-url" class="form-input" placeholder="https://youtube.com/..."></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="res-subject"><option value="">General</option>${subs.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Type</label><select class="form-select" id="res-type"><option value="youtube">YouTube</option><option value="pdf">PDF</option><option value="website">Website</option><option value="other">📎 Other</option></select></div></div><div class="form-group"><label class="form-label">Chapter (optional)</label><input type="text" id="res-chapter" class="form-input" placeholder="e.g., Electricity"></div>`;
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

    // PLANNING
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
            const dateStr=d.toISOString().split('T')[0];
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

    renderPlanning(){
        const el=document.getElementById('page-planning'),ac=this.getAllChapters(),od=this.getOverdueChapters(),up=ac.filter(c=>c.deadline&&c.deadline>=this.today()&&c.status!=='completed'&&c.status!=='revised').sort((a,b)=>a.deadline.localeCompare(b.deadline)),nd=ac.filter(c=>!c.deadline&&c.status!=='completed'&&c.status!=='revised');
        const pred=this.getPredictedCompletion();
        const dte=this.getDaysToExam();

        // P2-2: Sprint planner (only when ≤21 days to exam)
        const sprint=this.generateSprintPlan();
        let sprintHTML='';
        if(sprint){
            const coveredPct=sprint.totalChapters>0?Math.round(sprint.coveredInSprint/sprint.totalChapters*100):100;
            sprintHTML=`<div class="card" style="margin-bottom:20px;border-left:3px solid var(--warning)">
                <div class="card-header" style="margin-bottom:12px">
                    <span class="card-title">Exam Sprint — ${dte} Days Left</span>
                    <span style="font-size:.7rem;background:rgba(245,158,11,0.12);color:var(--text-warning);padding:3px 8px;border-radius:6px;font-weight:600">${sprint.coveredInSprint}/${sprint.totalChapters} chapters planned</span>
                </div>
                <p style="font-size:.75rem;color:var(--text-muted);margin-bottom:14px">Auto-prioritized: weak chapters first, then overdue, then hard topics. ${coveredPct<100?`<strong style="color:var(--text-danger)">${sprint.totalChapters-sprint.coveredInSprint} chapters won't fit — focus on these first.</strong>`:'All pending chapters covered ✅'}</p>
                <div style="display:flex;flex-direction:column;gap:6px">
                ${sprint.days.map(day=>`<div style="border-radius:8px;padding:10px 12px;background:${day.isToday?'rgba(79,70,229,0.1)':'var(--color-surface-hover)'};border:1px solid ${day.isToday?'var(--color-brand)':'transparent'}">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${day.chapters.length>0||day.revisions.length>0?'7px':'0'}">
                        <span style="font-size:.75rem;font-weight:700;color:${day.isToday?'var(--accent-light)':'var(--text-secondary)'}">${day.isToday?'TODAY':day.label} <span style="font-weight:400;color:var(--text-muted)">${day.date}</span>${day.isWeekend?' 🏖️':''}</span>
                        ${day.chapters.length===0&&day.revisions.length===0?'<span style="font-size:.65rem;color:var(--text-success)">✅ Rest day</span>':''}
                    </div>
                    ${day.chapters.map(c=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="font-size:.7rem;color:var(--text-muted);flex-shrink:0">${c.sprintReason}</span><span style="font-size:.78rem;font-weight:500;flex:1">${c.subjectIcon} ${c.name}</span></div>`).join('')}
                    ${day.revisions.map(c=>`<div style="display:flex;align-items:center;gap:6px;padding:3px 0"><span style="font-size:.7rem;color:var(--info);flex-shrink:0"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg> Revise</span><span style="font-size:.78rem;flex:1">${c.subjectIcon} ${c.name}</span></div>`).join('')}
                </div>`).join('')}
                </div>
            </div>`;
        }
        let predHtml='';
        if(pred&&dte!==null){
            const onTrack=this.daysBetween(this.today(),pred.date)<=dte;
            predHtml=`<div class="card" style="margin-bottom:20px;border-left:3px solid ${onTrack?'var(--success)':'var(--danger)'}"><div class="card-header"><span class="card-title">Predicted Completion</span></div><p style="font-size:.9rem">At current pace (<strong>${pred.rate} ch/day</strong>), you'll finish by <strong>${pred.date}</strong> (${pred.daysNeeded} days).</p><p style="font-size:.82rem;margin-top:6px;color:${onTrack?'var(--text-success)':'var(--text-danger)'}">${onTrack?'On track for boards!':'Won\'t finish before exams — speed up!'}</p>${!onTrack&&dte>0?`<p style="font-size:.78rem;color:var(--text-muted);margin-top:4px">Need: ${Math.ceil((this.getTotalChapters()-this.getCompletedCount())/dte*10)/10} chapters/day to finish on time</p>`:''}</div>`;
        }

        el.innerHTML=`<div class="grid grid-3" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(239,68,68,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-info"><h3>${od.length}</h3><p>Overdue</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><h3>${up.length}</h3><p>Upcoming</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div class="stat-info"><h3>${nd.length}</h3><p>No deadline</p></div></div></div>${sprintHTML}${predHtml}${od.length>0?`<div class="card" style="margin-bottom:20px;border-left:3px solid var(--danger)"><div class="card-header"><span class="card-title">Overdue</span></div>${od.map(c=>`<div class="plan-card" onclick="App.openChapterDetail('${c.subjectId}','${c.id}')"><div class="plan-emoji">${c.subjectIcon}</div><div class="plan-info"><h4>${c.name}</h4><p>${c.subjectName} • ${this.daysBetween(c.deadline,this.today())}d overdue</p></div></div>`).join('')}</div>`:''}<div class="card"><div class="card-header"><span class="card-title">Upcoming Deadlines</span></div>${up.length===0?'<p style="color:var(--text-muted)">None</p>':up.map(c=>{const dl=this.daysBetween(this.today(),c.deadline);return`<div class="plan-card" onclick="App.openChapterDetail('${c.subjectId}','${c.id}')"><div class="plan-emoji">${c.subjectIcon}</div><div class="plan-info"><h4>${c.name}</h4><p>${c.subjectName} • ${c.deadline}</p></div><span class="tag" style="color:var(--${dl<=3?'danger':dl<=7?'warning':'success'})">${dl}d</span></div>`}).join('')}</div>`;
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

        // P2-3: Honest weekly report — shown every Sunday, or any day if triggered
        const isSunday=new Date().getDay()===0;
        const reportDismissed=localStorage.getItem('weekly_report_dismissed')===this.today();
        let weeklyReportHTML='';
        if((isSunday||ws.length>0)&&!reportDismissed){
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
                    <button onclick="localStorage.setItem('weekly_report_dismissed','${this.today()}');this.closest('.card').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:1rem;padding:2px 4px">×</button>
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
                        <div style="font-size:.65rem;font-weight:600;color:${ds>=5?'var(--text-success)':ds>=3?'var(--text-warning)':'var(--text-danger)'}">${ds>=5?'Consistent ✅':ds>=3?'Almost there':'Needs work'}</div>
                    </div>
                </div>
                ${weakest?`<div style="margin-bottom:10px;padding:8px 10px;background:rgba(239,68,68,0.07);border-radius:6px;font-size:.78rem"><span style="color:var(--text-danger);font-weight:600">📉 Weakest chapter: </span>${weakest.name} <span style="color:var(--text-muted)">(${weakest.sub})</span> — avg confidence ${['','🔴','🟡','🟢','⚡'][Math.round(weakest.avg)]||'🔴'}</div>`:''}
                <div style="padding:10px;background:rgba(79,70,229,0.07);border-radius:6px;font-size:.8rem;line-height:1.5"><span style="font-weight:600;color:var(--accent-light)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Recommendation: </span>${rec}</div>
            </div>`;
        }
        el.innerHTML=weeklyReportHTML+`<div class="grid grid-4" style="margin-bottom:20px"><div class="card stat-card"><div class="stat-icon" style="background:rgba(99,102,241,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div class="stat-info"><h3>${this.formatMin(tm)}</h3><p>This week</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><h3>${ds}/7</h3><p>Days studied</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div><div class="stat-info"><h3>${this.formatMin(tmMin)}</h3><p>This month</p></div></div><div class="card stat-card"><div class="stat-icon" style="background:rgba(139,92,246,0.12)"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div><div class="stat-info"><h3>${avgSession}m</h3><p>Avg session</p></div></div></div>
        <div class="grid grid-2" style="margin-bottom:20px"><div class="card"><div class="card-header"><span class="card-title">Daily Study Time</span></div><div class="week-graph">${dd.map(d=>{const pc=d.minutes/mx*100;const dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d.date+'T12:00').getDay()];return`<div class="bar-col"><div class="bar-value">${d.minutes>0?this.formatMin(d.minutes):''}</div><div class="bar" style="height:${Math.max(2,pc)}%;${d.date===this.today()?'background:var(--gradient-3)':''}"></div><div class="bar-label">${dn}</div></div>`}).join('')}</div></div><div class="card"><div class="card-header"><span class="card-title">Subject Split — This Week</span></div>${Object.keys(sb).length===0?'<p style="color:var(--text-muted)">No data this week</p>':Object.entries(sb).sort((a,b)=>b[1]-a[1]).map(([sId,min])=>{const sub=this.getSubjectById(sId);if(!sub)return'';const pc=Math.round(min/tm*100);return`<div class="subject-progress"><div class="sp-header"><span class="sp-name">${sub.icon} ${sub.name}</span><span class="sp-pct" style="color:${sub.color}">${this.formatMin(min)} (${pc}%)</span></div><div class="progress-bar"><div class="progress-fill" style="width:${pc}%;background:${sub.color}"></div></div></div>`}).join('')}</div></div>
        <div class="grid grid-2" style="margin-bottom:20px"><div class="card"><div class="card-header"><span class="card-title">Monthly Comparison</span></div><p style="font-size:.9rem;margin-bottom:12px">This month: <strong style="color:var(--text-primary)">${this.formatMin(tmMin)}</strong></p><p style="font-size:.9rem;margin-bottom:12px">Last month: <strong style="color:var(--text-primary)">${this.formatMin(lmMin)}</strong></p><p style="font-size:.85rem;color:${tmMin>=lmMin?'var(--text-success)':'var(--text-danger)'};font-weight:600">${tmMin>=lmMin?'↑':'↓'} ${monthChange>=0?'+':''}${monthChange}% ${tmMin>=lmMin?'Improving!':'Study more!'}</p></div><div class="card"><div class="card-header"><span class="card-title">Productivity Patterns</span></div><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem">🕐</span> Best time: <strong style="color:var(--text-primary)">${bestHour?bestHour[0]+':00':'--'}</strong></p><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span> Best day: <strong style="color:var(--text-primary)">${bestDay?dayNames[bestDay[0]]:'--'}</strong></p><p style="font-size:.85rem;color:var(--text-secondary);line-height:2"><span style="font-size:1.1rem"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span> Avg session: <strong style="color:var(--text-primary)">${avgSession}m</strong></p></div></div>
        <div class="card"><div class="card-header"><span class="card-title">Subject Balance — All Time</span></div><div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">${this.state.subjects.map(s=>{const min=allSubTime[s.id]||0;const pc=Math.round(min/totalAllTime*100);const isLow=pc<(100/Math.max(1,this.state.subjects.length))*0.5;return`<div style="text-align:center;min-width:60px;flex:0 0 auto"><div style="width:60px;height:60px;border-radius:50%;border:4px solid ${s.color};display:flex;align-items:center;justify-content:center;margin:0 auto 6px;font-size:1.5rem;${isLow?'opacity:.5':''}">${s.icon}</div><p style="font-size:.78rem;font-weight:600">${s.name}</p><p style="font-size:.72rem;color:${isLow?'var(--text-danger)':s.color}">${pc}%</p>${isLow?'<p style="font-size:.6rem;color:var(--text-danger)">⚠️ Low</p>':''}`}).join('')}</div></div>`;
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
            ?this.state.subjects.map(s=>`<option value="${s.id}"${p.focusSubjectId===s.id?' selected':''}>${s.icon} ${s.name}</option>`).join('')
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
              ${this.state.subjects.map(s=>`<option value="${s.id}">${s.icon} ${s.name}</option>`).join('')}
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

                // ── Update last_studied_date on the chapter in memory + DB ──
                if(focusCh){
                    focusCh.lastStudiedDate=this.today();
                    if(_isUUID(focusCh.id)){
                        DB.chapters.update(focusCh.id,{last_studied_date:this.today()})
                            .then(({error})=>{if(error)console.error('[DB] pomodoro last_studied_date:',error);});
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

            this.toast(`🍅 Pomodoro #${this.pomodoro.session} done!`,'success');
            this.pomodoro.mode='break';
            this.pomodoro.timeLeft=(this.pomodoro.session%set.sessionsBeforeLong===0?set.longBreakMin:set.breakMin)*60;
        }else{
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
        if(sw.subjectId){const sub=this.getSubjectById(sw.subjectId);const _swSess={id:this.uid(),subjectId:sw.subjectId,chapterId:'',chapterName:'',subjectName:sub?sub.name:'Stopwatch',date:this.today(),timeSpent:mins,type:'learning',rating:4,notes:'Stopwatch session',createdAt:Date.now()};this.state.sessions.push(_swSess);const _swUid=window._supabaseUserId;if(_swUid){DB.sessions.create({user_id:_swUid,subject_id:sw.subjectId,chapter_id:null,time_spent:mins,date:this.today(),type:'learning',rating:4,notes:'Stopwatch session'}).then(({data,error})=>{if(error){console.error('[DB] stopwatch session:',error);return;}if(data&&data.id)_swSess.id=data.id;});}this.recordStudyDay();this.addXP(10,'Stopwatch session');this.toast(`⏱ ${this.formatMin(mins)} logged!`,'success')}
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
                h+=`<div class="card" style="margin-bottom:16px"><div class="card-header"><span class="card-title">${sub?sub.icon+' '+sub.name:'General'}</span></div>${ns.map(n=>{const ac=(n.attachments&&n.attachments.length)?n.attachments.length:0;return`<div class="plan-card" style="cursor:pointer" onclick="App.viewNote('${n.id}')"><div class="plan-info"><h4>${n.title} ${n.isFormula?' (Formula)':''} ${ac?`<span style="font-size:.68rem;background:rgba(99,102,241,0.15);color:var(--accent-light);padding:2px 6px;border-radius:8px;margin-left:4px">📎 ${ac}</span>`:''}</h4><p style="white-space:pre-wrap;margin-top:4px;font-size:.8rem;color:var(--text-secondary)">${n.content.substring(0,180)}${n.content.length>180?'...':''}</p></div><button class="ch-btn" onclick="event.stopPropagation();App.deleteNote('${n.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button></div>`}).join('')}</div>`;
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
        document.getElementById('note-edit-body').innerHTML=`<div class="form-group"><label class="form-label">Title</label><input type="text" id="note-title" class="form-input" placeholder="e.g., Trigonometry Formulas" value="${existing?existing.title:''}"></div><div class="form-group"><label class="form-label">Content / Formulas</label><textarea class="form-textarea" id="note-content" placeholder="Write your notes, formulas, key concepts..." style="min-height:120px">${existing?existing.content:''}</textarea></div><div class="form-row"><div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="note-subject"><option value="">General</option>${subs.map(s=>`<option value="${s.id}" ${existing&&existing.subjectId===s.id?'selected':''}>${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Type</label><div class="quick-log"><div class="quick-chip ${!existing||!existing.isFormula?'selected':''}" data-formula="false" onclick="App.pickNoteType(this)">📝 Notes</div><div class="quick-chip ${existing&&existing.isFormula?'selected':''}" data-formula="true" onclick="App.pickNoteType(this)">📐 Formula</div></div></div></div><div class="form-group"><label class="form-label">📎 Attachments <span style="font-size:.72rem;color:var(--text-muted)">(Images &amp; PDFs • max 4 MB each)</span></label><div class="attach-zone" id="attach-zone" onclick="document.getElementById('attach-file-input').click()" ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="App._handleAttachDrop(event)"><div style="font-size:1.8rem">📁</div><p>Click to upload or drag &amp; drop<br><span style="font-size:.7rem">JPG · PNG · GIF · WebP · PDF</span></p><input type="file" id="attach-file-input" accept="image/*,.pdf" multiple style="display:none" onchange="App._handleAttachFiles(this.files)"></div><div class="attach-preview" id="attach-preview">${attachHtml}</div></div>${editId?`<input type="hidden" id="note-edit-id" value="${editId}">`:''}`;
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
        document.getElementById('detail-body').innerHTML=`<div style="margin-bottom:14px">${sub?`<span class="tag" style="background:${sub.color}22;color:${sub.color}">${sub.icon} ${sub.name}</span>`:''} ${note.isFormula?'<span class="tag" style="background:rgba(99,102,241,0.12);color:var(--accent-light)">📐 Formula</span>':''}</div><h3 style="font-size:1.15rem;margin-bottom:14px">${note.title}</h3><div style="white-space:pre-wrap;font-size:.9rem;line-height:1.8;color:var(--text-secondary);background:var(--bg-card);padding:16px;border-radius:var(--radius-sm);border:1px solid var(--border)">${note.content||'<span style="opacity:.4">No text content</span>'}</div>${attachHtml}`;
        document.getElementById('detail-footer').innerHTML=`<button class="btn btn-secondary" onclick="App.closeModal('modal-detail')">Close</button><button class="btn btn-primary" onclick="App.closeModal('modal-detail');App.openNoteModal('${id}')">Edit</button>`;
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
            return`<div class="plan-card" style="cursor:pointer;margin-bottom:6px" onclick="App.viewNote('${n.id}')"><div class="plan-info"><h4>${n.title} ${n.isFormula?' (Formula)':''}</h4><p style="font-size:.78rem;color:var(--text-muted)">${sub?sub.icon+' '+sub.name:'General'}</p></div></div>`;
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
        const recentSessions=this.state.sessions.slice(-5).map(s=>`${s.subjectName} - ${s.chapterName} (${s.timeSpent}min, ${s.type}${s.confidence?', conf:'+['','🔴','🟡','🟢','⚡'][s.confidence]:''}${s.intention?', intent:'+s.intention:''})`).join('; ');
        const subjectProgress=this.state.subjects.map(s=>{
            const done=s.chapters.filter(c=>c.status==='completed'||c.status==='revised').length;
            return `${s.icon} ${s.name}: ${done}/${s.chapters.length} chapters`;
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
            ${plan.slice(0,4).map(p=>`<div class="plan-card" onclick="App.openChapterDetail('${p.subjectId}','${p.id}')"><div class="plan-emoji">${p.subjectIcon}</div><div class="plan-info"><h4>${p.name}</h4><p>${p.subjectName} · ${p.reason}</p></div></div>`).join('')||'<p style="color:var(--text-muted);font-size:.82rem;padding:4px 0">All caught up! 🎉</p>'}
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
            const greeting='Hey '+this.state.profile.name+'! 👋 I\'m your AI study coach. I can see your real progress — '+this.getCompletedCount()+'/'+this.getTotalChapters()+' chapters done'+(od.length>0?', '+od.length+' overdue':'')+(rd.length>0?', '+rd.length+' revisions due':'')+'. What do you need help with today?';
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
        el.innerHTML=`<div class="grid grid-2"><div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Profile</span></div>${userEmail?`<div class="form-group"><label class="form-label">Email</label><div class="form-input" style="background:var(--color-surface-hover);cursor:default;color:var(--text-muted);font-size:.82rem">${userEmail}</div></div>`:''}<div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" value="${p.name}" onchange="App.state.profile.name=this.value;App.updateSidebar();App._syncFullProfile()"></div><div class="form-group"><label class="form-label">Class</label><select class="form-select" onchange="App.changeClass(parseInt(this.value))">${[9,10,11,12].map(c=>`<option value="${c}" ${p.selectedClass===c?'selected':''}>Class ${c}</option>`).join('')}</select></div>${(p.selectedClass===11||p.selectedClass===12)?`<div class="form-group"><label class="form-label">Stream</label><select class="form-select" onchange="App.state.profile.selectedStream=this.value;App._syncFullProfile()">${['PCM','PCB','Commerce'].map(s=>`<option value="${s}" ${p.selectedStream===s?'selected':''} >${s}</option>`).join('')}</select></div>`:''}<div class="form-group"><label class="form-label">Daily Study Goal</label><select class="form-select" onchange="App.state.profile.dailyGoalMinutes=parseInt(this.value);App._syncFullProfile()">${[60,90,120,150,180,240,300].map(v=>`<option value="${v}" ${p.dailyGoalMinutes===v?'selected':''}>${v/60}h (${v}m)</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Board Exam Date</label><input type="date" class="form-input" value="${p.examDate||''}" onchange="App.state.profile.examDate=this.value;App.updatePageSubtitle();App.updateTopbarPills();App._syncFullProfile()"></div><div class="form-group"><label class="form-label">Target Score (%)</label><input type="number" class="form-input" value="${p.targetScore||90}" min="1" max="100" onchange="App.state.profile.targetScore=parseInt(this.value);App._syncFullProfile()"></div></div>
        <div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Theme</span></div><div style="display:flex;flex-direction:column;gap:12px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-sm ${this.state.theme==='dark'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('dark')">Dark</button><button class="btn btn-sm ${this.state.theme==='light'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('light')">Light</button><button class="btn btn-sm ${this.state.theme==='warm-dark'?'btn-primary':'btn-secondary'}" onclick="App.toggleTheme('warm-dark')">Warm Dark</button></div><div style="display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid var(--border)"><input type="checkbox" id="auto-theme-check" ${this.state.autoTheme?'checked':''} onchange="App.toggleAutoTheme()" style="width:16px;height:16px;cursor:pointer"><label for="auto-theme-check" style="font-size:.82rem;cursor:pointer">Auto switch (Light 7AM–7PM, Dark at night)</label></div></div></div>
        <div class="card"><div class="card-header"><span class="card-title">Statistics</span></div><div style="font-size:.85rem;color:var(--text-secondary);line-height:2"><p>Sessions: <strong style="color:var(--text-primary)">${stats.totalSessions}</strong></p><p>Total Study Time: <strong style="color:var(--text-primary)">${this.formatMin(stats.totalMinutes)}</strong></p><p>Chapters Done: <strong style="color:var(--text-primary)">${stats.completedChapters}/${this.getTotalChapters()}</strong></p><p>Total Revisions: <strong style="color:var(--text-primary)">${stats.totalRevisions}</strong></p><p>Current Streak: <strong style="color:var(--text-primary)">${stats.streak} days</strong></p><p>Exams Logged: <strong style="color:var(--text-primary)">${this.state.examScores.length}</strong></p><p>Doubts: <strong style="color:var(--text-primary)">${this.state.doubts.length} (${this.state.doubts.filter(d=>d.status==='unresolved').length} unresolved)</strong></p><p>Notes: <strong style="color:var(--text-primary)">${(this.state.notes||[]).length}</strong></p><p>Resources: <strong style="color:var(--text-primary)">${(this.state.resources||[]).length}</strong></p><p>Level ${stats.level} (${p.xp} XP)</p></div></div></div><div><div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Data Management</span></div><div style="display:flex;flex-direction:column;gap:10px"><button class="btn btn-secondary" onclick="App.exportData()" style="justify-content:center">Export Data (JSON)</button><button class="btn btn-secondary" onclick="document.getElementById('import-file').click()" style="justify-content:center">Import Data</button><input type="file" id="import-file" accept=".json" style="display:none" onchange="App.importData(event)"><hr style="border-color:var(--border)"><button class="btn btn-danger" onclick="App.resetAll()" style="justify-content:center">Reset All Data</button></div></div>
        <div class="card" style="margin-bottom:20px"><div class="card-header"><span class="card-title">Keyboard Shortcuts</span></div><div style="font-size:.82rem;color:var(--text-secondary);line-height:2.2"><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+L</kbd> Quick Log</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+P</kbd> Focus Timer</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Ctrl+K</kbd> Search</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">1-9</kbd> Navigate pages (with Alt)</p><p><kbd style="background:var(--bg-card);padding:2px 8px;border-radius:4px;border:1px solid var(--border);font-family:monospace">Esc</kbd> Close modals</p></div></div>
        <div class="card"><div class="card-header"><span class="card-title">About BoardOS</span></div><p style="font-size:.82rem;color:var(--text-secondary);line-height:1.8">BoardOS is your personal study OS. Track subjects, chapters, revisions, exams, doubts, and more — all in one place.</p><p style="font-size:.75rem;color:var(--text-muted);margin-top:8px">All data is stored locally in your browser. Export regularly to avoid data loss!</p><hr style="border-color:var(--border);margin:12px 0"><button class="btn btn-secondary" onclick="window.StudyOSTour&&window.StudyOSTour.replay();App.navigate('dashboard')" style="justify-content:center;width:100%">🗺️ Replay Onboarding Tour</button></div></div></div>`;
        // Inject Install App card after render
        this._renderPWACard();
    },

    _renderPWACard(){
        const el = document.getElementById('page-settings');
        if (!el) return;
        const isInstalled = window._pwaIsInstalled && window._pwaIsInstalled();
        const isIOS       = window._pwaIsIOS && window._pwaIsIOS();
        const hasPrompt   = !!window._pwaInstallPrompt;
        let card = '';
        if (isInstalled || window._pwaInstalled) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(16,185,129,0.3)"><div class="card-header"><span class="card-title">📲 Install App</span></div><div style="display:flex;align-items:center;gap:10px;font-size:.85rem;color:var(--success,#10b981)"><span style="font-size:1.4rem">✅</span><span>BoardOS is installed on your device. You&apos;re all set!</span></div></div>`;
        } else if (isIOS) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(99,102,241,0.3)"><div class="card-header"><span class="card-title">📲 Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">Add BoardOS to your home screen for instant access — no browser needed.</p><button class="btn btn-primary" onclick="window._pwaDoInstall()" style="width:100%;justify-content:center">📋 How to Install on iPhone / iPad</button><div id="pwa-ios-tip" style="display:none;margin-top:12px;background:var(--color-surface-hover,rgba(255,255,255,0.05));border-radius:10px;padding:14px;font-size:.8rem;color:var(--text-secondary);line-height:2.1"><p style="font-weight:600;color:var(--text-primary);margin-bottom:4px">Follow these steps:</p><p>1. Tap the <strong style="color:var(--text-primary)">Share button ⎋</strong> at the bottom of Safari</p><p>2. Scroll down and tap <strong style="color:var(--text-primary)">"Add to Home Screen"</strong></p><p>3. Tap <strong style="color:var(--text-primary)">"Add"</strong> in the top right corner</p><p style="margin-top:8px;font-size:.74rem;color:var(--text-muted)">⚠️ Must be opened in Safari. Chrome on iPhone won&apos;t show this option.</p></div></div>`;
        } else if (hasPrompt) {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid rgba(99,102,241,0.3)"><div class="card-header"><span class="card-title">📲 Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">Install BoardOS as an app for faster access, offline support, and a distraction-free study experience.</p><button class="btn btn-primary" onclick="window._pwaDoInstall()" style="width:100%;justify-content:center">⬇️ Install BoardOS</button><p style="font-size:.72rem;color:var(--text-muted);margin-top:8px;text-align:center">Works offline · No app store needed · Instant launch</p></div>`;
        } else {
            card = `<div class="card" style="margin-bottom:20px;border:1px solid var(--border)"><div class="card-header"><span class="card-title">📲 Install App</span></div><p style="font-size:.82rem;color:var(--text-secondary);line-height:1.8"><strong style="color:var(--text-primary)">Chrome / Edge:</strong> Click the <strong>⊕ install icon</strong> in the address bar.<br><strong style="color:var(--text-primary)">Android:</strong> Tap <strong>⋮ Menu → Add to Home Screen</strong>.<br><strong style="color:var(--text-primary)">iPhone (Safari):</strong> Tap <strong>Share ⎋ → Add to Home Screen</strong>.</p></div>`;
        }
        el.insertAdjacentHTML('afterbegin', card);
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
        document.getElementById('chapter-form-body').innerHTML=`<div class="form-group"><label class="form-label">Subject</label><select class="form-select" id="ch-subject">${subs.map(s=>`<option value="${s.id}" ${s.id===pSub?'selected':''}>${s.icon} ${s.name}</option>`).join('')}</select></div><div class="form-group"><label class="form-label">Chapter Name</label><input type="text" id="ch-name" class="form-input" placeholder="e.g., Real Numbers"></div><div class="form-row"><div class="form-group"><label class="form-label">Difficulty</label><select class="form-select" id="ch-diff"><option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option></select></div><div class="form-group"><label class="form-label">Deadline</label><input type="date" id="ch-deadline" class="form-input"></div></div>`;
        this.openModal('modal-chapter');
    },
    saveChapter(){
        const sId=document.getElementById('ch-subject').value,name=document.getElementById('ch-name').value.trim();
        if(!name){this.toast('Enter chapter name','warning');return}
        const sub=this.getSubjectById(sId);if(!sub)return;
        const _newCh={id:this.uid(),name,status:'not-started',deadline:document.getElementById('ch-deadline').value||'',completionDate:null,revisionCount:0,revisionDates:[],difficulty:document.getElementById('ch-diff').value,notes:'',exercises:[],createdAt:Date.now()};
        sub.chapters.push(_newCh);
        const _chUid=window._supabaseUserId;
        if(_chUid){DB.chapters.create({user_id:_chUid,subject_id:sId,name,status:'not-started',difficulty:_newCh.difficulty,deadline:_newCh.deadline||null,revision_count:0,order_index:sub.chapters.length-1}).then(({data,error})=>{if(error){console.error('[DB] chapters.create:',error);return;}if(data&&data.id)_newCh.id=data.id;});}
        this.save();this.closeModal('modal-chapter');this.render();this.toast(`📖 "${name}" added!`,'success');
    },
    saveSubject(){
        const name=document.getElementById('new-subject-name').value.trim(),icon=document.getElementById('new-subject-icon').value.trim()||'📚',cc=document.querySelector('#color-pick .quick-chip.selected'),color=cc?cc.dataset.color:'#6366f1';
        if(!name){this.toast('Enter subject name','warning');return}
        const _ns={id:this.uid(),name,icon,color,chapters:[]};
        this.state.subjects.push(_ns);
        const _nsUid=window._supabaseUserId;
        if(_nsUid){DB.subjects.create(_nsUid,{name,icon,color}).then(({data,error})=>{if(error){console.error('[DB] subjects.create:',error);return;}if(data&&data.id)_ns.id=data.id;});}
        this.save();this.closeModal('modal-subject');this.render();this.toast(`📚 "${name}" added!`,'success');
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
                const {data:sd,error:se}=await DB.subjects.create(uid,{
                    name:  sub.name,
                    icon:  sub.icon,
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
    toast(msg,type='info'){
        const c=document.getElementById('toast-container');
        const icons={success:'✅',warning:'⚠️',error:'❌',info:'ℹ️',xp:'⚡'};
        const t=document.createElement('div');
        t.className=`toast toast-${type}`;
        t.innerHTML=`<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
        c.appendChild(t);
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
            const next=new Date(qd.lastQuizDate);
            next.setDate(next.getDate()+interval);
            return today>=next.toISOString().split('T')[0];
        });
    },

    getQuizNextDate(subjectId){
        const qd=this.state.quizData&&this.state.quizData[subjectId];
        if(!qd||!qd.lastQuizDate) return null;
        const interval=qd.interval||7;
        const next=new Date(qd.lastQuizDate);
        next.setDate(next.getDate()+interval);
        return next.toISOString().split('T')[0];
    },

    setQuizInterval(subjectId, days){
        if(!this.state.quizData) this.state.quizData={};
        if(!this.state.quizData[subjectId]) this.state.quizData[subjectId]={};
        this.state.quizData[subjectId].interval=days;
        this._syncQuizData(subjectId);
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
    return `<div class="quiz-subject-card ${cardClass}">
    <div style="padding:16px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <div style="width:42px;height:42px;border-radius:10px;background:${s.color}22;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">${s.icon}</div>
            <div style="flex:1;min-width:0">
                <div style="font-size:.88rem;font-weight:700;color:var(--color-text-primary)">${s.name}</div>
                <div style="font-size:.7rem;color:var(--text-muted);margin-top:2px">${completed.length} chapter${completed.length!==1?'s':''} ready</div>
            </div>
            ${dueBadge}
        </div>
        ${lastScore!==undefined?`<div class="quiz-score-row">
            <div class="quiz-score-bar-wrap"><div class="quiz-score-bar-fill" style="width:${lastScore}%;background:${barColor}"></div></div>
            <div class="quiz-score-label">Last: <strong>${lastScore}%</strong>${avgScore!==null&&history.length>1?` · Avg <strong>${avgScore}%</strong>`:''}</div>
        </div>`:''}
        ${history.length>0?`<div class="quiz-stats-row"><div class="quiz-stat-chip">Taken <strong>${history.length}×</strong></div>${hasCached?'<div class="quiz-stat-chip" style="color:var(--color-success)">✓ Cached</div>':''}</div>`:''}
        <div class="quiz-interval-row">
            <span class="quiz-interval-label">Review every</span>
            <div class="quiz-interval-chips">
                ${[3,5,7,14].map(d=>`<button class="quiz-interval-chip ${interval===d?'selected':''}" onclick="event.stopPropagation();App.setQuizInterval('${s.id}',${d})">${d}d</button>`).join('')}
            </div>
        </div>
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
                <p style="font-weight:600;margin-bottom:6px">Generating questions for ${sub.icon} ${sub.name}…</p>
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
            subjectIcon:sub.icon,
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
            this.toast('No mistakes to review! 🎉','success');
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

// Keyboard shortcuts
document.addEventListener('keydown',e=>{
    if(e.key==='Escape')document.querySelectorAll('.modal-overlay.show').forEach(m=>m.classList.remove('show'));
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