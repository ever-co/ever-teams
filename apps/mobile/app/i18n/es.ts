const es = {
    common: {
      ok: "OK!",
      cancel: "Cancel",
      back: "Back",
      save:"Save",
      logOut: "Log Out", // @demo remove-current-line
    },
    welcomeScreen: {
      postscript:
        "psst  — This probably isn't what your app looks like. (Unless your designer handed you these screens, and in that case, ship it!)",
      readyForLaunch: "Your app, almost ready for launch!",
      exciting: "(ohh, this is exciting!)",
      letsGo: "Let's go!", // @demo remove-current-line
    },
    errorScreen: {
      title: "Something went wrong!",
      friendlySubtitle:
        "This is the screen that your users will see in production when an error is thrown. You'll want to customize this message (located in `app/i18n/en.ts`) and probably the layout as well (`app/screens/ErrorScreen`). If you want to remove this entirely, check `app/app.tsx` for the <ErrorBoundary> component.",
      reset: "RESET APP",
      traceTitle: "Error from %{name} stack", // @demo remove-current-line
    },
    emptyStateComponent: {
      generic: {
        heading: "So empty... so sad",
        content: "No data found yet. Try clicking the button to refresh or reload the app.",
        button: "Let's try this again",
      },
    },
    // @demo remove-block-start
    errors: {
      invalidEmail: "Invalid email address.",
    },
    loginScreen: {
      name: "Login",
      enterDetails: "Create New Team",
      enterDetails2: "Join Existed Team",
      hintDetails: "Please enter your team details to create a new team.",
      hintDetails2: "Please enter email and invitation code to join existing team.",
      joinTeam: "Join Team",
      joinExistTeam: "Joining existing team?",
      joinTeamHint: "Enter the invitation code we sent to your email",
      step1Title: "Select Team Name",
      step2Title: "Provide More Details",
      step3Title: "Invitation code",
      confirmDetails: "Please check your email for confirm code",
      confirmDetails2: "Please enter the invitation code we sent to your Email",
      sendCode: "send Code",
      codeNotReceived: "Didn’t recieve code ?Re",
      inviteStepLabel: "Provide your Email",
      emailFieldLabel: "Your Email",
      teamNameFieldLabel: "Team Name",
      inviteCodeFieldLabel: "Input invitation code",
      emailFieldPlaceholder: "Enter your email address",
      teamNameFieldPlaceholder: "Please Enter your team name",
      userNameFieldPlaceholder: "Enter your name",
      tapContinue: "Continue",
      tapJoin: "Join",
      createTeam:"Create Team"
    },
    myWorkScreen: {
      name: "My Work",
      estimateLabel: "Estimate",
      statusText: "Status",
      taskFieldPlaceholder: "What you working on",
      sizeText: "Sizes",
      prioritiesText: "Priorities",
      tabCreateTask: "Create new task",
      labelText: "Label"
    },
    teamScreen: {
      name: "Teams",
      cardTotalTimeLabel: "Total time",
      cardTodayWorkLabel: "Today work",
      cardTotalWorkLabel: "Total work",
      inviteButton: "Invite",
      inviteModalTitle: "Invite member to your team",
      inviteModalHint: "Send a invitation to a team member by email",
      inviteEmailFieldPlaceholder: "Input email address",
      inviteNameFieldPlaceholder: "Input team member name",
      sendButton: "Send"
    },
    tasksScreen: {
      name: "Tasks",
      now: "Now",
      last24hours: "Last 24 hours",
      totalTimeLabel: "Total Time",
      workedTab: "Worked",
      assignedTab: "Assigned",
      unassignedTab: "Unassigned",
      createTaskButton: "Create Task",
      assignTaskButton: "Assign Task",
      createButton: "Create",
      assignButton: "Assign"
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
        changeAvatar:"Change Avatar",
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
        changeLogo:"Change Logo",
        teamRole: "Manager Member & Role",
        workSchedule: "Work Schedule",
        workScheduleHint: "Set your work schedule now",
        transferOwnership: "Transfer Ownership",
        transferOwnershipHint: "Transfer full ownership of team to another user",
        removeTeam: "Remove Team",
        removeTeamHint: "Team will be completely removed for the system and team members lost access",
        quitTeam: "Quit the team",
        quitTeamHint: "You are about to quit the team"
      },
      dangerZone: "Danger Zone",
      modalChangeLanguageTitle:"Change Language",
      statusScreen:{
        mainTitle:"Task Statuses",
        listStatuses:"List of Statuses",
        noActiveStatuses:"There are no active statuses",
        createStatusButton:"Create new status",
        createNewStatusText:"Create New Status",
        statusNamePlaceholder:"Status Name",
        statusIconPlaceholder:"Choose Icon",
        statusColorPlaceholder:"Colors",
        cancelButtonText:"Cancel",
        createButtonText:"Create",
        updateButtonText:"Update"
      }
    },
    demoNavigator: {
      componentsTab: "Components",
      debugTab: "Debug",
      communityTab: "Community",
      podcastListTab: "Podcast",
    },
    demoCommunityScreen: {
      title: "Connect with the community",
      tagLine:
        "Plug in to Infinite Red's community of React Native engineers and level up your app development with us!",
      joinUsOnSlackTitle: "Join us on Slack",
      joinUsOnSlack:
        "Wish there was a place to connect with React Native engineers around the world? Join the conversation in the Infinite Red Community Slack! Our growing community is a safe space to ask questions, learn from others, and grow your network.",
      joinSlackLink: "Join the Slack Community",
      makeIgniteEvenBetterTitle: "Make Ignite even better",
      makeIgniteEvenBetter:
        "Have an idea to make Ignite even better? We're happy to hear that! We're always looking for others who want to help us build the best React Native tooling out there. Join us over on GitHub to join us in building the future of Ignite.",
      contributeToIgniteLink: "Contribute to Ignite",
      theLatestInReactNativeTitle: "The latest in React Native",
      theLatestInReactNative: "We're here to keep you current on all React Native has to offer.",
      reactNativeRadioLink: "React Native Radio",
      reactNativeNewsletterLink: "React Native Newsletter",
      reactNativeLiveLink: "React Native Live",
      chainReactConferenceLink: "Chain React Conference",
      hireUsTitle: "Hire Infinite Red for your next project",
      hireUs:
        "Whether it's running a full project or getting teams up to speed with our hands-on training, Infinite Red can help with just about any React Native project.",
      hireUsLink: "Send us a message",
    },
    demoShowroomScreen: {
      jumpStart: "Components to jump start your project!",
      lorem2Sentences:
        "Nulla cupidatat deserunt amet quis aliquip nostrud do adipisicing. Adipisicing excepteur elit laborum Lorem adipisicing do duis.",
      demoHeaderTxExample: "Yay",
      demoViaTxProp: "Via `tx` Prop",
      demoViaSpecifiedTxProp: "Via `{{prop}}Tx` Prop",
    },
    demoDebugScreen: {
      howTo: "HOW TO",
      title: "Debug",
      tagLine:
        "Congratulations, you've got a very advanced React Native app template here.  Take advantage of this boilerplate!",
      reactotron: "Send to Reactotron",
      reportBugs: "Report Bugs",
      demoList: "Demo List",
      demoPodcastList: "Demo Podcast List",
      androidReactotronHint:
        "If this doesn't work, ensure the Reactotron desktop app is running, run adb reverse tcp:9090 tcp:9090 from your terminal, and reload the app.",
      iosReactotronHint:
        "If this doesn't work, ensure the Reactotron desktop app is running and reload app.",
      macosReactotronHint:
        "If this doesn't work, ensure the Reactotron desktop app is running and reload app.",
      webReactotronHint:
        "If this doesn't work, ensure the Reactotron desktop app is running and reload app.",
      windowsReactotronHint:
        "If this doesn't work, ensure the Reactotron desktop app is running and reload app.",
    },
    demoPodcastListScreen: {
      title: "React Native Radio episodes",
      onlyFavorites: "Only Show Favorites",
      favoriteButton: "Favorite",
      unfavoriteButton: "Unfavorite",
      accessibility: {
        cardHint:
          "Double tap to listen to the episode. Double tap and hold to {{action}} this episode.",
        switch: "Switch on to only show favorites",
        favoriteAction: "Toggle Favorite",
        favoriteIcon: "Episode not favorited",
        unfavoriteIcon: "Episode favorited",
        publishLabel: "Published {{date}}",
        durationLabel: "Duration: {{hours}} hours {{minutes}} minutes {{seconds}} seconds",
      },
      noFavoritesEmptyState: {
        heading: "This looks a bit empty",
        content:
          "No favorites have been added yet. Tap the heart on an episode to add it to your favorites!",
      },
    },
    // @demo remove-block-end
  }
  
  export default es
  export type Translations = typeof es
  