/**
 * Centralized UI Selectors & Data-TestID Constants for Playwright E2E Tests
 * Reference: TEST_INFRA.md, PROJECT.md
 */

export const SELECTORS = {
  // --- F1: Auth Selectors ---
  auth: {
    loginForm: '[data-testid="login-form"]',
    emailInput: '[data-testid="email-input"], input[name="email"], input[type="email"]',
    passwordInput: '[data-testid="password-input"], input[name="password"], input[type="password"]',
    loginSubmitButton: '[data-testid="login-submit-button"], button[type="submit"]',
    registerForm: '[data-testid="register-form"]',
    nameInput: '[data-testid="name-input"], input[name="name"]',
    registerSubmitButton: '[data-testid="register-submit-button"]',
    errorMessage: '[data-testid="auth-error-message"], .text-destructive, [role="alert"]',
    logoutButton: '[data-testid="logout-button"]',
  },

  // --- F3: PassQ Design System & Global Layout Shell ---
  layout: {
    sidebar: '[data-testid="app-sidebar"]',
    header: '[data-testid="app-header"]',
    navDashboard: 'a[href="/dashboard"], [data-testid="nav-dashboard"]',
    navRoadmap: 'a[href="/lo-trinh"], [data-testid="nav-roadmap"]',
    navSRS: 'a[href="/on-tap"], [data-testid="nav-srs"]',
    navPractice: 'a[href="/luyen-tap"], [data-testid="nav-practice"]',
    navExam: 'a[href="/thi-thu"], [data-testid="nav-exam"]',
    navFormulas: 'a[href="/so-tay"], [data-testid="nav-formulas"]',
    navBookmarks: 'a[href="/da-luu"], [data-testid="nav-bookmarks"]',
    subjectSwitcher: '[data-testid="subject-switcher"]',
    userMenu: '[data-testid="user-menu-dropdown"]',
    mobileMenuButton: '[data-testid="mobile-menu-toggle"]',
    brandLogo: '[data-testid="brand-logo"]',
  },

  // --- F4: Dashboard (Bảng điều khiển) ---
  dashboard: {
    statsTotalAnswered: '[data-testid="stat-total-answered"]',
    statsAccuracy: '[data-testid="stat-accuracy"]',
    statsCurrentStreak: '[data-testid="stat-current-streak"]',
    statsStudyHours: '[data-testid="stat-study-hours"]',
    countdownTimer: '[data-testid="exam-countdown"]',
    studyCurveChart: '[data-testid="study-curve-chart"], canvas',
    continuePracticeCTA: '[data-testid="continue-practice-cta"]',
    methodologySteps: '[data-testid="methodology-step-item"]',
  },

  // --- F5: Roadmap (Lộ trình) ---
  roadmap: {
    sectionTabs: '[data-testid="section-tab"]',
    sectionList: '[data-testid="section-list"]',
    unitCard: '[data-testid="unit-card"]',
    subunitNode: '[data-testid="subunit-node"]',
    loDrawer: '[data-testid="lo-drawer"]',
    loDrawerClose: '[data-testid="lo-drawer-close"]',
    loDrawerPracticeBtn: '[data-testid="lo-drawer-start-practice"]',
    recalibrateModal: '[data-testid="recalibrate-modal"]',
    changeExamDateBtn: '[data-testid="change-exam-date-button"]',
    standardModeToggle: '[data-testid="mode-standard"]',
    fastTrackModeToggle: '[data-testid="mode-fast-track"]',
  },

  // --- F6: Practice Quiz Engine ---
  quiz: {
    container: '[data-testid="quiz-container"]',
    questionStem: '[data-testid="question-stem"]',
    questionScenarioBasis: '[data-testid="scenario-basis"]',
    optionA: '[data-testid="option-A"]',
    optionB: '[data-testid="option-B"]',
    optionC: '[data-testid="option-C"]',
    optionD: '[data-testid="option-D"]',
    allOptions: '[data-testid^="option-"]',
    strikeThroughA: '[data-testid="strike-A"]',
    strikeThroughB: '[data-testid="strike-B"]',
    strikeThroughC: '[data-testid="strike-C"]',
    strikeThroughD: '[data-testid="strike-D"]',
    submitAnswerBtn: '[data-testid="quiz-submit-btn"]',
    feedbackBanner: '[data-testid="quiz-feedback-banner"]',
    feedbackCorrect: '[data-testid="feedback-correct"]',
    feedbackIncorrect: '[data-testid="feedback-incorrect"]',
    distractorAccordion: '[data-testid="distractor-analysis-accordion"]',
    distractorOptionA: '[data-testid="distractor-A"]',
    distractorOptionB: '[data-testid="distractor-B"]',
    distractorOptionC: '[data-testid="distractor-C"]',
    distractorOptionD: '[data-testid="distractor-D"]',
    workedExplanation: '[data-testid="worked-explanation"]',
    nextQuestionBtn: '[data-testid="quiz-next-btn"]',
    bookmarkToggleBtn: '[data-testid="quiz-bookmark-btn"]',
    askAIBtn: '[data-testid="quiz-ask-ai-btn"]',
    questionNavDrawer: '[data-testid="question-nav-drawer"]',
  },

  // --- F7: Spaced Repetition (Ôn tập hôm nay) ---
  srs: {
    container: '[data-testid="srs-container"]',
    flashcard: '[data-testid="srs-flashcard"]',
    cardFront: '[data-testid="flashcard-front"]',
    cardBack: '[data-testid="flashcard-back"]',
    flipCardBtn: '[data-testid="flashcard-flip-btn"]',
    rating1Forget: '[data-testid="srs-rating-1"], button:has-text("Quên")',
    rating2Hard: '[data-testid="srs-rating-2"], button:has-text("Khó")',
    rating3Good: '[data-testid="srs-rating-3"], button:has-text("Được")',
    rating4Easy: '[data-testid="srs-rating-4"], button:has-text("Không cần")',
    undoBtn: '[data-testid="srs-undo-btn"]',
    dueCounter: '[data-testid="srs-due-counter"]',
    emptyQueueMessage: '[data-testid="srs-empty-queue"]',
  },

  // --- F8: Exam Simulation (Thi thử) ---
  exam: {
    container: '[data-testid="exam-container"]',
    mockCard: '[data-testid="mock-exam-card"]',
    startMockBtn: '[data-testid="start-mock-btn"]',
    countdownTimer: '[data-testid="exam-timer"]',
    pacingGauge: '[data-testid="exam-pacing-gauge"]',
    questionIndexItem: '[data-testid^="nav-question-"]',
    flagQuestionBtn: '[data-testid="flag-question-btn"]',
    submitExamBtn: '[data-testid="submit-exam-btn"]',
    confirmSubmitDialog: '[data-testid="confirm-exam-submit-dialog"]',
    scorecard: '[data-testid="exam-scorecard"]',
    totalScoreDisplay: '[data-testid="exam-total-score"]',
    scaledScoreDisplay: '[data-testid="exam-scaled-score"]',
    sectionBreakdownList: '[data-testid="exam-section-breakdown"]',
    passFailBadge: '[data-testid="exam-pass-fail-badge"]',
  },

  // --- F9: Formulas & Bookmarks ---
  formulas: {
    container: '[data-testid="formula-center"]',
    searchInput: '[data-testid="formula-search-input"]',
    sectionFilter: '[data-testid="formula-section-filter"]',
    formulaCard: '[data-testid="formula-card"]',
    latexFormula: '[data-testid="latex-formula"], .katex',
    copyFormulaBtn: '[data-testid="copy-formula-btn"]',
  },
  bookmarks: {
    container: '[data-testid="bookmarks-container"]',
    bookmarkItem: '[data-testid="bookmark-item"]',
    studyNotesTextarea: '[data-testid="study-notes-textarea"]',
    saveNoteBtn: '[data-testid="save-note-btn"]',
    removeBookmarkBtn: '[data-testid="remove-bookmark-btn"]',
  },
};
