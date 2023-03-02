import { Translations } from "./en"

const ar: Translations = {
  common: {
    ok: "نعم",
    cancel: "حذف",
    back: "خلف",
    logOut: "تسجيل خروج",
    save:"حفظ"
     // @demo remove-current-line
  },
  welcomeScreen: {
    postscript:
      "ربما لا يكون هذا هو الشكل الذي يبدو عليه تطبيقك مالم يمنحك المصمم هذه الشاشات وشحنها في هذه الحالة",
    readyForLaunch: "تطبيقك تقريبا جاهز للتشغيل",
    exciting: "اوه هذا مثير",
    letsGo: "لنذهب", // @demo remove-current-line
  },
  errorScreen: {
    title: "هناك خطأ ما",
    friendlySubtitle:
      "هذه هي الشاشة التي سيشاهدها المستخدمون في عملية الانتاج عند حدوث خطأ. سترغب في تخصيص هذه الرسالة ( الموجودة في 'ts.en/i18n/app') وربما التخطيط ايضاً ('app/screens/ErrorScreen'). إذا كنت تريد إزالة هذا بالكامل، تحقق من 'app/app.tsp' من اجل عنصر <ErrorBoundary>.",
    reset: "اعادة تعيين التطبيق",
    traceTitle: "خطأ من مجموعة %{name}", // @demo remove-current-line
  },
  emptyStateComponent: {
    generic: {
      heading: "فارغة جداً....حزين",
      content: "لا توجد بيانات حتى الآن. حاول النقر فوق الزر لتحديث التطبيق او اعادة تحميله.",
      button: "لنحاول هذا مرّة أخرى",
    },
  },
  // @demo remove-block-start
  errors: {
    invalidEmail: "عنوان البريد الالكتروني غير صالح",
  },
  loginScreen: {
    name: "تسجيل الدخول",
    enterDetails: "إنشاء فريق جديد",
    enterDetails2: "انضم إلى الفريق الحالي",
    hintDetails: "الرجاء إدخال تفاصيل فريقك لإنشاء فريق جديد.",
    hintDetails2: "الرجاء إدخال البريد الإلكتروني ورمز الدعوة للانضمام إلى الفريق الحالي.",
    joinTeam: "انضم إلى الفريق",
    joinExistTeam: "الانضمام إلى الفريق الحالي؟",
    joinTeamHint: "أدخل رمز الدعوة الذي أرسلناه إلى بريدك الإلكتروني",
    step1Title: "حدد اسم الفريق",
    step2Title: "قدم المزيد من التفاصيل",
    step3Title: "شفرة الدعوة",
    confirmDetails: "يرجى التحقق من بريدك الإلكتروني للحصول على رمز التأكيد",
    confirmDetails2: "الرجاء إدخال رمز الدعوة الذي أرسلناه إلى بريدك الإلكتروني",
    sendCode: "أرسل كود",
    codeNotReceived: "ألم تستلم الرمز؟ يكرر",
    inviteStepLabel: "أدخل بريدك الإلكتروني",
    emailFieldLabel: "بريدك الالكتروني",
    teamNameFieldLabel: "اسم الفريق",
    inviteCodeFieldLabel: "أدخل رمز الدعوة",
    emailFieldPlaceholder: "أدخل عنوان بريدك الالكتروني",
    teamNameFieldPlaceholder: "الرجاء إدخال اسم فريقك",
    userNameFieldPlaceholder: "أدخل أسمك",
    tapContinue: "يكمل",
    tapJoin: "ينضم",
   createTeam:"Create Team"
  },
  myWorkScreen: {
    name: "عملى",
    estimateLabel: "تقدير",
    statusText: "حالة",
    taskFieldPlaceholder: "ما الذي تعمل عليه",
    sizeText: "الأحجام",
    prioritiesText: "الأولويات",
    tabCreateTask: "قم بإنشاء مهمة جديدة",
    labelText: "مُلصَق"
  },
  teamScreen: {
    name: "فرق",
    cardTotalTimeLabel: "الوقت الكلي",
    cardTodayWorkLabel: "العمل اليوم",
    cardTotalWorkLabel: "إجمالي العمل",
    inviteButton: "يدعو",
    inviteModalTitle: "ادعُ عضوًا إلى فريقك",
    inviteModalHint: "أرسل دعوة إلى أحد أعضاء الفريق عبر البريد الإلكتروني",
    inviteEmailFieldPlaceholder: "أدخل عنوان البريد الإلكتروني",
    inviteNameFieldPlaceholder: "أدخل اسم عضو الفريق",
    sendButton: "إرسال",
    createNewTeamButton:"أنشئ فريقًا جديدًا"
  },
  tasksScreen: {
    name: "مهام",
    now: "الآن",
    last24hours: "أخر 24 ساعه",
    totalTimeLabel: "الوقت الكلي",
    workedTab: "عمل",
    assignedTab: "تعيين",
    unassignedTab: "غير معين",
    createTaskButton: "إنشاء مهمة",
    assignTaskButton: "تعيين مهمة",
    createButton: "خلق",
    assignButton: "تعيين"
  },
  settingScreen: {
    name: "Settings",
    personalSection: {
      name: "Personal",
      fullName: "Full Name",
      yourContact: "Your Contact",
      yourContactHint: "Your contact information",
      themes: "Themes",
      darkModeToLight: "Dark Mode to Light Mode",
      lightModeToDark: "Light Mode to Dark Mode",
      language: "Language",
      changeAvatar: "Change Avatar",
      timeZone: "Time Zone",
      workSchedule: "Work Schedule",
      workScheduleHint: "Set your work schedule now",
      removeAccount: "Remove Account",
      removeAccountHint: "Account will be removed from all teams, except where you are the only manager",
      deleteAccount: "Delete Account",
      deleteAccountHint: "Your account will be deleted permanently with remolving from all teams",
      detect: "Detect"
    },
    teamSection: {
      name: "Team",
      teamName: "Team Name",
      timeTracking: "Time Tracking",
      timeTrackingHint: "Enable time tracking",
      taskStatuses: "Task Statuses",
      taskPriorities: "Task Priorities",
      taskSizes: "Task Sizes",
      taskLabel: "Task Label",
      changeLogo: "Change Logo",
      teamRole: "Manager Member & Role",
      workSchedule: "Work Schedule",
      workScheduleHint: "Set your work schedule now",
      transferOwnership: "Transfer Ownership",
      transferOwnershipHint: "Transfer full ownership of team to another user",
      removeTeam: "Remove Team",
      removeTeamHint: "Team will be completely removed for the system and team members lost access",
      quitTeam: "Quit the team",
      quitTeamHint: "You are about to quit the team",
    },
    dangerZone: "Danger Zone",
    modalChangeLanguageTitle: "Change Language",
    languages: {
      english: "English ( United States )",
      french: "French ( France )",
      arabic: "Arabic",
      russian: "Russian",
      bulgarian: "Bulgarian",
      spanish: "Spanish",
      korean: "Korean",
      hebrew: "Hebrew"
    },
    statusScreen: {
      mainTitle: "Task Statuses",
      listStatuses: "List of Statuses",
      noActiveStatuses: "There are no active statuses",
      createStatusButton: "Create new status",
      createNewStatusText: "Create New Status",
      statusNamePlaceholder: "Status Name",
      statusIconPlaceholder: "Choose Icon",
      statusColorPlaceholder: "Colors",
      cancelButtonText: "Cancel",
      createButtonText: "Create",
      updateButtonText: "Update"
    },
    priorityScreen: {
      mainTitle: "Task Priorities",
      listPriorities: "List of Priorities",
      noActivePriorities: "There are no active priorities",
      createPriorityButton: "Create new priority",
      createNewPriorityText: "Create New Priority",
      priorityNamePlaceholder: "Priority Name",
      priorityIconPlaceholder: "Choose Icon",
      priorityColorPlaceholder: "Colors",
      cancelButtonText: "Cancel",
      createButtonText: "Create",
      updateButtonText: "Update"
    },
    labelScreen: {
      mainTitle: "Task Labels",
      listLabels: "List of Labels",
      noActiveLabels: "There are no active labels",
      createLabelButton: "Create new label",
      createNewLabelText: "Create New Labels",
      labelNamePlaceholder: "Labels Name",
      labelIconPlaceholder: "Choose Icon",
      labelColorPlaceholder: "Colors",
      cancelButtonText: "Cancel",
      createButtonText: "Create",
      updateButtonText: "Update"
    },
    sizeScreen: {
      mainTitle: "Task Sizes",
      listSizes: "List of Sizes",
      noActiveSizes: "There are no active sizes",
      createSizeButton: "Create new size",
      createNewSizeText: "Create New Sizes",
      sizeNamePlaceholder: "Size Name",
      sizeIconPlaceholder: "Choose Icon",
      sizeColorPlaceholder: "Colors",
      cancelButtonText: "Cancel",
      createButtonText: "Create",
      updateButtonText: "Update"
    },
    changeFullName: {
      firstNamePlaceholder: "First Name",
      lastNamePlaholder: "Last Name",
      mainTitle: "Change Full Name"
    },
    changeAvatar: {
      recentPictures: "Recent Pictures",
      recentFiles: "Recent files",
      selectFromGalery: "Select from galery",
      selectFromFiles: "Select from Files",
      continueButton: "Continue"
    },
    contact: {
      mainTitle: "Change Your Contact",
      emailPlaceholder: "Email Address",
      phonePlaceholder: "Phone Number",
      emailNotValid: "Please, provide a valid email",
      phoneNotValid: "Please, provide a valid phone number"
    },
    changeTimezone:{
      mainTitle:"Change Time Zone",
      selectTimezoneTitle:"Select Time Zone"
    },
    changeLanguage:{
      mainTitle:"Change Language",
      selectLanguageTitle:"Select Languanges"
    }
  },
  hamburgerMenu:{
    darkMode:"الوضع الداكن",
  },
  demoNavigator: {
    componentsTab: "عناصر",
    debugTab: "تصحيح",
    communityTab: "واصل اجتماعي",
    podcastListTab: "البودكاست",
  },
  demoCommunityScreen: {
    title: "تواصل مع المجتمع",
    tagLine:
      "قم بالتوصيل لمنتدى Infinite Red الذي يضم تفاعل المهندسين المحلّيين ورفع مستوى تطوير تطبيقك معنا",
    joinUsOnSlackTitle: "انضم الينا على Slack",
    joinUsOnSlack:
      "هل ترغب في وجود مكان للتواصل مع مهندسي React Native حول العالم؟ الانضمام الى المحادثة في سلاك المجتمع الاحمر اللانهائي! مجتمعناالمتنامي هو مساحةآمنة لطرح الاسئلة والتعلم من الآخرين وتنمية شبكتك.",
    joinSlackLink: "انضم الي مجتمع Slack",
    makeIgniteEvenBetterTitle: "اجعل Ignite افضل",
    makeIgniteEvenBetter:
      "هل لديك فكرة لجعل Ignite افضل؟ نحن سعداء لسماع ذلك! نحن نبحث دائماً عن الآخرين الذين يرغبون في مساعدتنا في بناء افضل الادوات المحلية التفاعلية المتوفرة هناك. انضم الينا عبر GitHub للانضمام الينا في بناء مستقبل Ignite",
    contributeToIgniteLink: "ساهم في Ignite",
    theLatestInReactNativeTitle: "الاحدث في React Native",
    theLatestInReactNative: "نخن هنا لنبقيك محدثاً على جميع React Native التي تعرضها",
    reactNativeRadioLink: "راديو React Native",
    reactNativeNewsletterLink: "نشرة اخبار React Native",
    reactNativeLiveLink: "مباشر React Native",
    chainReactConferenceLink: "مؤتمر Chain React",
    hireUsTitle: "قم بتوظيف Infinite Red لمشروعك القادم",
    hireUs:
      "سواء كان الامر يتعلّق بتشغيل مشروع كامل او اعداد الفرق بسرعة من خلال التدريب العلمي لدينا، يمكن ان يساعد Infinite Red اللامتناهي في اي مشروع محلي يتفاعل معه.",
    hireUsLink: "ارسل لنا رسالة",
  },
  demoShowroomScreen: {
    jumpStart: "مكونات او عناصر لبدء مشروعك",
    lorem2Sentences:
      "عامل الناس بأخلاقك لا بأخلاقهم. عامل الناس بأخلاقك لا بأخلاقهم. عامل الناس بأخلاقك لا بأخلاقهم",
    demoHeaderTxExample: "ياي",
    demoViaTxProp: "عبر `tx` Prop",
    demoViaSpecifiedTxProp: "Prop `{{prop}}Tx` عبر",
  },
  demoDebugScreen: {
    howTo: "كيف",
    title: "التصحيح",
    tagLine: "مبروك، لديك نموذج اصلي متقدم للغاية للتفاعل هنا. الاستفادة من هذه النمذجة",
    reactotron: "Reactotron ارسل إلى",
    reportBugs: "الابلاغ عن اخطاء",
    demoList: "قائمة تجريبية",
    demoPodcastList: "قائمة البودكاست التجريبي",
    androidReactotronHint:
      "اذا لم ينجح ذللك، فتأكد من تشغيل تطبيق الحاسوب الخاص Reactotron، وقم بتشغيل عكس adb tcp:9090 \ntcp:9090 من جهازك الطرفي ، واعد تحميل التطبيق",
    iosReactotronHint:
      "اذا لم ينجح ذلك، فتأكد من تشغيل تطبيق الحاسوب الخاص ب Reactotron وأعد تحميل التطبيق",
    macosReactotronHint: "اذا لم ينجح ذلك، فتأكد من تشغيل الحاسوب ب Reactotron وأعد تحميل التطبيق",
    webReactotronHint: "اذا لم ينجح ذلك، فتأكد من تشغيل الحاسوب ب Reactotron وأعد تحميل التطبيق",
    windowsReactotronHint:
      "اذا لم ينجح ذلك، فتأكد من تشغيل الحاسوب ب Reactotron وأعد تحميل التطبيق",
  },
  demoPodcastListScreen: {
    title: "حلقات إذاعية React Native",
    onlyFavorites: "المفضلة فقط",
    favoriteButton: "المفضل",
    unfavoriteButton: "غير مفضل",
    accessibility: {
      cardHint: "انقر مرّتين للاستماع على الحلقة. انقر مرّتين وانتظر لتفعيل {{action}} هذه الحلقة.",
      switch: "قم بالتبديل لاظهار المفضّلة فقط.",
      favoriteAction: "تبديل المفضلة",
      favoriteIcon: "الحلقة الغير مفضّلة",
      unfavoriteIcon: "الحلقة المفضّلة",
      publishLabel: "نشرت {{date}}",
      durationLabel: "المدّة: {{hours}} ساعات {{minutes}} دقائق {{seconds}} ثواني",
    },
    noFavoritesEmptyState: {
      heading: "هذا يبدو فارغاً بعض الشيء.",
      content:
        "لم تتم اضافة اي مفضلات حتى الان. اضغط على القلب في إحدى الحلقات لإضافته الى المفضلة.",
    },
  },
  // @demo remove-block-end
}

export default ar
