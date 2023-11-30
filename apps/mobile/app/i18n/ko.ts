import { Translations } from './en';

const ko: Translations = {
	common: {
		ok: '확인!',
		cancel: '취소',
		loading: 'Loading',
		back: '뒤로',
		save: '',
		logOut: '로그아웃',
		edit: 'Edit',
		confirm: 'Confirm',
		discard: 'Discard'
	},
	welcomeScreen: {
		postscript:
			'잠깐! — 지금 보시는 것은 아마도 당신의 앱의 모양새가 아닐겁니다. (디자이너분이 이렇게 건내주셨다면 모를까요. 만약에 그렇다면, 이대로 가져갑시다!) ',
		readyForLaunch: '출시 준비가 거의 끝난 나만의 앱!',
		exciting: '(오, 이거 신나는데요!)',
		letsGo: '가보자구요!' // @demo remove-current-line
	},
	errorScreen: {
		title: '뭔가 잘못되었습니다!',
		friendlySubtitle:
			'이 화면은 오류가 발생할 때 프로덕션에서 사용자에게 표시됩니다. 이 메시지를 커스터마이징 할 수 있고(해당 파일은 `app/i18n/ko.ts` 에 있습니다) 레이아웃도 마찬가지로 수정할 수 있습니다(`app/screens/error`). 만약 이 오류화면을 완전히 없에버리고 싶다면 `app/app.tsx` 파일에서 <ErrorBoundary> 컴포넌트를 확인하기 바랍니다.',
		reset: '초기화',
		traceTitle: '%{name} 스택에서의 오류' // @demo remove-current-line
	},
	emptyStateComponent: {
		generic: {
			heading: '너무 텅 비어서.. 너무 슬퍼요..',
			content: '데이터가 없습니다. 버튼을 눌러서 리프레쉬 하시거나 앱을 리로드하세요.',
			button: '다시 시도해봅시다'
		}
	},
	// @demo remove-block-start
	errors: {
		invalidEmail: '잘못된 이메일 주소 입니다.'
	},
	loginScreen: {
		name: '로그인',
		enterDetails: '새 팀 만들기',
		enterDetails2: '기존 팀에 합류',
		enterDetails3: '작업공간',
		hintDetails: '새 팀을 만들려면 팀 세부 정보를 입력하십시오.',
		hintDetails2: '기존 팀에 가입하려면 이메일과 초대 코드를 입력하세요.',
		hintDetails3: '다음 작업공간과 연결된 이메일',
		joinTeam: '팀에 합류',
		joinExistTeam: '기존 팀에 합류하시겠습니까?',
		joinTeamHint: '이메일로 보내드린 초대 코드를 입력하세요.',
		step1Title: '팀 이름 선택',
		step2Title: '자세한 내용 제공',
		step3Title: '초대 코드',
		confirmDetails: '확인 코드는 이메일을 확인하세요.',
		confirmDetails2: '귀하의 이메일로 전송된 초대 코드를 입력하십시오',
		sendCode: '코드 보내기',
		codeNotReceived: '코드를 받지 못하셨나요?',
		inviteStepLabel: '이메일 제공',
		emailFieldLabel: '귀하의 이메일',
		teamNameFieldLabel: '팀 이름',
		inviteCodeFieldLabel: '초대 코드 입력',
		selectWorkspaceFieldLabel: '작업공간 선택',
		emailFieldPlaceholder: '이메일 주소를 입력하세요',
		teamNameFieldPlaceholder: '팀 이름을 입력하세요',
		userNameFieldPlaceholder: '당신의 이름을 입력',
		tapContinue: '계속하다',
		tapJoin: '가입하다',
		createTeam: 'Create Team',
		invalidConfirmCode: '잘못된 확인 코드',
		securityCodeSent: '보안 코드가 새 이메일로 전송되었습니다',
		codeSentTo: '6자 코드가 다음으로 전송되었습니다:'
	},
	myWorkScreen: {
		name: '일하다',
		estimateLabel: '추정',
		statusText: '상태',
		taskFieldPlaceholder: '작업 중인 작업',
		sizeText: '크기',
		prioritiesText: '우선순위',
		tabCreateTask: '새 작업 만들기',
		labelText: '상표'
	},
	teamScreen: {
		name: '팀',
		cardTotalTimeLabel: '총 시간',
		cardTodayWorkLabel: '오늘 일',
		cardTotalWorkLabel: '총 작업',
		inviteButton: '초대',
		inviteModalTitle: '팀원을 팀에 초대',
		inviteModalHint: '이메일로 팀원에게 초대장 보내기',
		inviteEmailFieldPlaceholder: '이메일 주소 입력',
		inviteNameFieldPlaceholder: '팀원 이름 입력',
		sendButton: '보내다',
		createNewTeamButton: '새 팀 만들기'
	},
	taskDetailsScreen: {
		characterLimitErrorTitle: '작업 제목을 업데이트할 수 없습니다.',
		characterLimitErrorDescription: '작업 제목은 255자를 초과할 수 없습니다.',
		copyTitle: '제목이 복사되었습니다.',
		changeParent: '상위 변경',
		addParent: '상위 추가',
		taskScreen: '작업 화면',
		details: '세부',
		taskPublic: '이 작업은 공개입니다.',
		makePrivate: '비공개로 설정',
		taskPrivate: '이 작업은 비공개입니다.',
		makePublic: '공개로 설정',
		typeIssue: '이슈 유형',
		creator: '생성자',
		assignees: '담당자',
		startDate: '시작일',
		dueDate: '마감일',
		daysRemaining: '남은 일수',
		version: '버전',
		epic: '에픽',
		status: '상태',
		labels: '라벨',
		size: '크기',
		priority: '우선 순위',
		manageAssignees: '담당자 관리',
		setDueDate: '마감일 설정',
		setStartDate: '시작일 설정',
		items: '품목',
		estimate: '견적',
		estimations: '견적들',
		time: '시간',
		progress: '진행',
		timeToday: '오늘의 시간',
		totalGroupTime: '총 그룹 시간',
		timeRemaining: '남은 시간',
		blocks: '블록',
		clones: '복제',
		duplicates: '중복',
		isBlockedBy: '차단됨',
		isClonedBy: '복제됨',
		isDuplicatedBy: '복제됨',
		relatesTo: '관련이 있다',
		linkedIssues: '연결된 이슈',
		description: '설명',
		descriptionBlockPlaceholder: '프로젝트에 대한 완전한 설명을 작성하세요...',
		copyDescription: '설명이 복사되었습니다.',
		showMore: '더 보기'
	},
	tasksScreen: {
		name: '작업',
		now: '지금',
		last24hours: '지난 24시간',
		totalTimeLabel: '총 시간',
		workedTab: '일했다',
		assignedTab: '할당된',
		unassignedTab: '할당되지 않음',
		createTaskButton: '작업 만들기',
		assignTaskButton: '작업 할당',
		createButton: '창조하다',
		assignButton: '양수인',
		resendInvitation: '초대장 다시 보내기',
		editTaskLabel: '작업 편집',
		unassignTaskLabel: '작업 할당 해제',
		unMakeManager: '관리자 만들기 취소',
		makeManager: '관리자 만들기',
		remove: '제거',
		filter: '필터',
		apply: '적용하다',
		reset: '초기화'
	},
	noTeamScreen: {
		createYourTeam: 'Create your own team or join existed',
		hintMessage: 'Lorem ipsum dolor sit amet consectetur. Blandit lobortis dui risus neque.'
	},
	settingScreen: {
		name: 'Settings',
		personalSection: {
			name: 'Personal',
			fullName: 'Full Name',
			yourContact: 'Your Contact',
			yourContactHint: 'Your contact information',
			themes: 'Themes',
			darkModeToLight: 'Dark Mode to Light Mode',
			lightModeToDark: 'Light Mode to Dark Mode',
			language: 'Language',
			changeAvatar: 'Change Avatar',
			timeZone: 'Time Zone',
			workSchedule: 'Work Schedule',
			workScheduleHint: 'Set your work schedule now',
			removeAccount: 'Remove Account',
			removeAccountHint: 'Account will be removed from all teams, except where you are the only manager',
			deleteAccount: 'Delete Account',
			deleteAccountHint: 'Your account will be deleted permanently with remolving from all teams',
			detect: 'Detect'
		},
		teamSection: {
			name: 'Team',
			teamName: 'Team Name',
			timeTracking: 'Time Tracking',
			timeTrackingHint: 'Enable time tracking',
			taskStatuses: 'Task Statuses',
			taskPriorities: 'Task Priorities',
			taskSizes: 'Task Sizes',
			taskLabel: 'Task Label',
			changeLogo: 'Change Logo',
			teamRole: 'Manager Member & Role',
			workSchedule: 'Work Schedule',
			workScheduleHint: 'Set your work schedule now',
			transferOwnership: 'Transfer Ownership',
			transferOwnershipHint: 'Transfer full ownership of team to another user',
			removeTeam: 'Remove Team',
			removeTeamHint: 'Team will be completely removed for the system and team members lost access',
			quitTeam: 'Quit the team',
			quitTeamHint: 'You are about to quit the team',
			areYouSure: 'Are you sure ?',
			teamType: '팀 타입',
			publicTeam: '공개 팀',
			privateTeam: '비공개 팀',
			changeTeamName: {
				mainTitle: 'Change Team Name',
				inputPlaceholder: 'Team Name'
			}
		},
		dangerZone: 'Danger Zone',
		modalChangeLanguageTitle: 'Change Language',
		languages: {
			english: 'English ( United States )',
			french: 'French ( France )',
			arabic: 'Arabic',
			russian: 'Russian',
			bulgarian: 'Bulgarian',
			spanish: 'Spanish',
			korean: 'Korean',
			hebrew: 'Hebrew'
		},
		versionScreen: {
			mainTitle: '작업 버전',
			listOfVersions: '버전 목록',
			noActiveVersions: '활성 버전이 없습니다',
			createNewVersionButton: '새 버전 생성',
			createNewVersionText: '새 버전 생성',
			versionNamePlaceholder: '버전 이름',
			cancelButtonText: '취소',
			createButtonText: '생성',
			updateButtonText: '업데이트'
		},
		statusScreen: {
			mainTitle: 'Task Statuses',
			statuses: 'Statuses',
			listStatuses: 'List of Statuses',
			noActiveStatuses: 'There are no active statuses',
			createStatusButton: 'Create new status',
			createNewStatusText: 'Create New Status',
			statusNamePlaceholder: 'Status Name',
			statusIconPlaceholder: 'Choose Icon',
			statusColorPlaceholder: 'Colors',
			cancelButtonText: 'Cancel',
			createButtonText: 'Create',
			updateButtonText: 'Update'
		},
		priorityScreen: {
			mainTitle: 'Task Priorities',
			priorities: 'Priorities',
			listPriorities: 'List of Priorities',
			noActivePriorities: 'There are no active priorities',
			createPriorityButton: 'Create new priority',
			createNewPriorityText: 'Create New Priority',
			priorityNamePlaceholder: 'Priority Name',
			priorityIconPlaceholder: 'Search Icon',
			priorityColorPlaceholder: 'Colors',
			cancelButtonText: 'Cancel',
			createButtonText: 'Create',
			updateButtonText: 'Update'
		},
		labelScreen: {
			mainTitle: 'Task Labels',
			listLabels: 'List of Labels',
			labels: 'Labels',
			noActiveLabels: 'There are no active labels',
			createLabelButton: 'Create new label',
			createNewLabelText: 'Create New Labels',
			labelNamePlaceholder: 'Labels Name',
			labelIconPlaceholder: 'Choose Icon',
			labelColorPlaceholder: 'Colors',
			cancelButtonText: 'Cancel',
			createButtonText: 'Create',
			updateButtonText: 'Update'
		},
		sizeScreen: {
			mainTitle: 'Task Sizes',
			sizes: 'Sizes',
			listSizes: 'List of Sizes',
			noActiveSizes: 'There are no active sizes',
			createSizeButton: 'Create new size',
			createNewSizeText: 'Create New Sizes',
			sizeNamePlaceholder: 'Size Name',
			sizeIconPlaceholder: 'Choose Icon',
			sizeColorPlaceholder: 'Colors',
			cancelButtonText: 'Cancel',
			createButtonText: 'Create',
			updateButtonText: 'Update'
		},
		membersSettingsScreen: {
			mainTitle: 'Members & Roles',
			deleteUserConfirmation: '선택한 사용자를 삭제하시겠습니까?',
			changeRole: '역할 변경',
			delete: '삭제'
		},
		changeFullName: {
			firstNamePlaceholder: 'First Name',
			lastNamePlaholder: 'Last Name',
			mainTitle: 'Change Full Name'
		},
		changeAvatar: {
			recentPictures: 'Recent Pictures',
			recentFiles: 'Recent files',
			selectFromGalery: 'Select from galery',
			selectFromFiles: 'Select from Files',
			continueButton: 'Continue',
			logoDeleteConfirmation: 'Are you sure you want to delete the logo?',
			avatarDeleteConfirmation: 'Are you sure you want to delete the avatar?'
		},
		contact: {
			mainTitle: 'Change Your Contact',
			emailPlaceholder: 'Email Address',
			phonePlaceholder: 'Phone Number',
			emailNotValid: 'Please provide a valid Email',
			phoneNotValid: 'Please provide a valid Phone Number'
		},
		changeTimezone: {
			mainTitle: 'Change Time Zone',
			selectTimezoneTitle: 'Select Time Zone'
		},
		changeLanguage: {
			mainTitle: 'Change Language',
			selectLanguageTitle: 'Select Languanges'
		}
	},
	hamburgerMenu: {
		darkMode: '다크 모드'
	},
	inviteModal: {
		accept: '수용하다',
		reject: '거부하다',
		inviteHint: '귀하는 가입 초대를 받았습니다.'
	},
	accountVerificationModal: {
		verify: '확인하다'
	},
	demoNavigator: {
		componentsTab: '컴포넌트',
		debugTab: '디버그',
		communityTab: '커뮤니티',
		podcastListTab: '팟캐스트'
	},
	demoCommunityScreen: {
		title: '커뮤니티와 함께해요',
		tagLine:
			'전문적인 React Native 엔지니어들로 구성된 Infinite Red 커뮤니티에 접속해서 함께 개발 실력을 향상시켜 보세요!',
		joinUsOnSlackTitle: 'Slack 에 참여하세요',
		joinUsOnSlack:
			'전 세계 React Native 엔지니어들과 함께할 수 있는 곳이 있었으면 좋겠죠? Infinite Red Community Slack 에서 대화에 참여하세요! 우리의 성장하는 커뮤니티는 질문을 던지고, 다른 사람들로부터 배우고, 네트워크를 확장할 수 있는 안전한 공간입니다. ',
		joinSlackLink: 'Slack 에 참여하기',
		makeIgniteEvenBetterTitle: 'Ignite 을 향상시켜요',
		makeIgniteEvenBetter:
			'Ignite 을 더 좋게 만들 아이디어가 있나요? 기쁜 소식이네요. 우리는 항상 최고의 React Native 도구를 구축하는데 도움을 줄 수 있는 분들을 찾고 있습니다. GitHub 에서 Ignite 의 미래를 만들어 가는것에 함께해 주세요.',
		contributeToIgniteLink: 'Ignite 에 기여하기',
		theLatestInReactNativeTitle: 'React Native 의 최신정보',
		theLatestInReactNative: 'React Native 가 제공하는 모든 최신 정보를 알려드립니다.',
		reactNativeRadioLink: 'React Native 라디오',
		reactNativeNewsletterLink: 'React Native 뉴스레터',
		reactNativeLiveLink: 'React Native 라이브 스트리밍',
		chainReactConferenceLink: 'Chain React 컨퍼런스',
		hireUsTitle: '다음 프로젝트에 Infinite Red 를 고용하세요',
		hireUs: '프로젝트 전체를 수행하든, 실무 교육을 통해 팀의 개발 속도에 박차를 가하든 상관없이, Infinite Red 는 React Native 프로젝트의 모든 분야의 에서 도움을 드릴 수 있습니다.',
		hireUsLink: '메세지 보내기'
	},
	demoShowroomScreen: {
		jumpStart: '프로젝트를 바로 시작할 수 있는 컴포넌트들!',
		lorem2Sentences:
			'별 하나에 추억과, 별 하나에 사랑과, 별 하나에 쓸쓸함과, 별 하나에 동경(憧憬)과, 별 하나에 시와, 별 하나에 어머니, 어머니',
		demoHeaderTxExample: '야호',
		demoViaTxProp: '`tx` Prop 을 통해',
		demoViaSpecifiedTxProp: '`{{prop}}Tx` Prop 을 통해'
	},
	demoDebugScreen: {
		howTo: '사용방법',
		title: '디버그',
		tagLine:
			'축하합니다. 여기 아주 고급스러운 React Native 앱 템플릿이 있습니다. 이 보일러 플레이트를 사용해보세요!',
		reactotron: 'Reactotron 으로 보내기',
		reportBugs: '버그 보고하기',
		demoList: '데모 목록',
		demoPodcastList: '데모 팟캐스트 목록',
		androidReactotronHint:
			'만약에 동작하지 않는 경우, Reactotron 데스크탑 앱이 실행중인지 확인 후, 터미널에서 adb reverse tcp:9090 tcp:9090 을 실행한 다음 앱을 다시 실행해보세요.',
		iosReactotronHint:
			'만약에 동작하지 않는 경우, Reactotron 데스크탑 앱이 실행중인지 확인 후 앱을 다시 실행해보세요.',
		macosReactotronHint:
			'만약에 동작하지 않는 경우, Reactotron 데스크탑 앱이 실행중인지 확인 후 앱을 다시 실행해보세요.',
		webReactotronHint:
			'만약에 동작하지 않는 경우, Reactotron 데스크탑 앱이 실행중인지 확인 후 앱을 다시 실행해보세요.',
		windowsReactotronHint:
			'만약에 동작하지 않는 경우, Reactotron 데스크탑 앱이 실행중인지 확인 후 앱을 다시 실행해보세요.'
	},
	demoPodcastListScreen: {
		title: 'React Native 라디오 에피소드',
		onlyFavorites: '즐겨찾기만 보기',
		favoriteButton: '즐겨찾기',
		unfavoriteButton: '즐겨찾기 해제',
		accessibility: {
			cardHint:
				'에피소드를 들으려면 두 번 탭하세요. 이 에피소드를 좋아하거나 싫어하려면 두 번 탭하고 길게 누르세요.',
			switch: '즐겨찾기를 사용하려면 스위치를 사용하세요.',
			favoriteAction: '즐겨찾기 토글',
			favoriteIcon: '좋아하는 에피소드',
			unfavoriteIcon: '즐겨찾기하지 않은 에피소드',
			publishLabel: '{{date}} 에 발행됨',
			durationLabel: '소요시간: {{hours}}시간 {{minutes}}분 {{seconds}}초'
		},
		noFavoritesEmptyState: {
			heading: '조금 텅 비어 있네요.',
			content: '즐겨찾기가 없습니다. 에피소드에 있는 하트를 눌러서 즐겨찾기에 추가하세요.'
		}
	}
	// @demo remove-block-end
};

export default ko;
