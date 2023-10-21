# Ever Teams Platform

[![Gitpod Ready-to-Code](https://img.shields.io/badge/Gitpod-Ready--to--Code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/ever-co/ever-teams)
[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/gauzy)
[![Gitter](https://badges.gitter.im/JoinChat.svg)](https://gitter.im/ever-co/ever-gauzy?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Get help on Codementor](https://cdn.codementor.io/badges/get_help_github.svg)](https://www.codementor.io/evereq?utm_source=github&utm_medium=button&utm_term=evereq&utm_campaign=github)

## ⭐️ What is it?

[Ever® Teams™](https://app.ever.team) - Open Work and Project Management Platform.

![web](https://docs.gauzy.co/docs/assets/gauzy-teams/web/overview.png)

**NOTE: Platform currently is in active development stage / WIP, please use with caution!**

## ✨ Features

Below is a list of the most important planned features:

- Work / Workforce Management
- Time Management / Time Tracking / Activity Tracking
- Productivity Tracking & Metrics
- Projects / Tasks & Issues Management
- Organizations / Teams
- Tags / Labels
- Integrations (GitHub, GitLab, Bitbucket, JIRA, etc.)
- Dark / Black / Light Themes

## 🌼 Screenshots

<details>
<summary>Show / Hide Screenshots</summary>

### Web Platform

![web](https://docs.gauzy.co/docs/assets/gauzy-teams/web/overview.png)
![web](https://docs.gauzy.co/docs/assets/gauzy-teams/web/web2.png)
![web](https://docs.gauzy.co/docs/assets/gauzy-teams/web/web3.png)

### Mobile Apps (iOS/Android)

![mobile](https://docs.gauzy.co/docs/assets/gauzy-teams/mobile/overview.png)

### Browser Extension

![extension](https://docs.gauzy.co/docs/assets/gauzy-teams/extension/overview.png)

Note: Currently WIP, the screenshot is just a temporary picture :)

</details>

## 📊 Activity

![Alt](https://repobeats.axiom.co/api/embed/7dc568c25f12884ca41e421ad2ae0b6dc1e576b1.svg "Repobeats analytics image")

## 🔗 Links

- **<https://app.ever.team>** - Ever Teams Platform web application (not yet in production release)
- **<https://ever.team>** - Check more information about the Ever Teams platform at the official website (WIP).
- **<https://gauzy.co>** - Check more information about the Ever Gauzy Platform at the official website.
- **<https://ever.co>** - Get more information about our company products.

## ⚡️ Our Open Platforms

Ever® Teams™ Platform (<https://app.ever.team>) is built on top of our Business Management Platform (ERP/CRM/HRM) - Ever® Gauzy™ Platform (<https://gauzy.co>), which itself is a part of our larger Open Platform for On-Demand and Sharing Economies - Ever®. You can get more information about all our products at <https://ever.co>.

## 🧱 Technology Stack and Requirements

- [TypeScript](https://www.typescriptlang.org) language
- [NodeJs](https://nodejs.org) / [NestJs](https://github.com/nestjs/nest)
- [Nx](https://nx.dev)
- [React](https://reactjs.org)
- [React Native](https://reactnative.dev)

#### See also README.md and CREDITS.md files in relevant folders for lists of libraries and software included in the Platform, information about licenses, and other details

## 📄 Documentation

Please refer to our official [Platform Documentation](https://docs.ever.team) (WIP) and to our [Wiki](https://github.com/ever-co/ever-teams/wiki) (WIP).

## 🚀 Getting Starting

Ever® Teams™ requires access to Ever® Gauzy™ Platform APIs, provided by another project - Ever® Gauzy™ Platform, see <https://github.com/ever-co/ever-gauzy> (and also <https://gauzy.co>). Specifically, you will be interested in the `apps/api` and `apps/server` folders of the mono-repo.

There are a few ways to run Ever Teams:

1. Connect it to our live Ever Gauzy APIs using endpoint <https://api.gauzy.co/api> (or to our staging <https://apistage.gauzy.co/api> if you want to just test everything) which is set in the `GAUZY_API_SERVER_URL` env variable (see <https://github.com/ever-co/ever-teams/blob/develop/web/.env.sample> for example). Of course, you will have to register in Ever Gauzy, see <https://app.gauzy.co/#/auth/register> (Note: currently in Alpha version)

2. Run `yarn build:web` and then `yarn start:web` commands from root of the project to start the Ever Teams (By default it will be connected to <https://api.gauzy.co/api> API endpoint, you)

## 📄 Content

- `/web` - NextJs-based (React) Web App at <https://app.ever.team> (deployed from `main` branch)
- `/website` - NextJs-based (React) public website at <https://ever.team> (deployed from `main` branch)
- `/mobile` - Expo (ReactNative) powered mobile app
- `/extensions` - Browser Extensions (powered by <https://github.com/PlasmoHQ/plasmo>)

## 💌 Contact Us

- [Ever.co Website Contact Us page](https://ever.co/contacts)
- [Slack Community](https://join.slack.com/t/gauzy/shared_invite/enQtNzc5MTA5MDUwODg2LTI0MGEwYTlmNWFlNzQzMzBlOWExNTk0NzAyY2IwYWYwMzZjMTliYjMwNDI3NTJmYmM4MDQ4NDliMDNiNDY1NWU)
- [Discord Chat](https://discord.gg/hKQfn4j)
- [Spectrum Community](https://spectrum.chat/gauzy)
- [Gitter Chat](https://gitter.im/ever-co/gauzy)
- [CodeMentor](https://www.codementor.io/evereq)
- For business inquiries: <mailto:gauzy@ever.co>
- Please report security vulnerabilities to <mailto:security@ever.co>
- [Gauzy Platform @ Twitter](https://twitter.com/gauzyplatform)
- [Gauzy Platform @ Facebook](https://www.facebook.com/gauzyplatform)

## 🔐 Security

Ever Teams Platform follows good security practices, but 100% security cannot be guaranteed in any software!
Ever Teams Platform is provided AS IS without any warranty. Use at your own risk!
See more details in the [LICENSE.md](LICENSE.md).

In a production setup, all client-side to server-side (backend, APIs) communications should be encrypted using HTTPS/WSS/SSL (REST APIs, GraphQL endpoint, Socket.io WebSockets, etc.).

If you discover any issue regarding security, please disclose the information responsibly by sending an email to <mailto:security@ever.co> or on [![huntr](https://cdn.huntr.dev/huntr_security_badge_mono.svg)](https://huntr.dev) and not by creating a GitHub issue.

## 🛡️ License

This software is available under the following licenses:

- [Ever® Teams™ Platform Community Edition](https://github.com/ever-co/ever-teams/blob/master/LICENSE.md##ever-teams-platform-community-edition-license)
- [Ever® Teams™ Platform Small Business](https://github.com/ever-co/ever-teams/blob/master/LICENSE.md#ever-teams-platform-small-business-license)
- [Ever® Teams™ Platform Enterprise](https://github.com/ever-co/ever-teams/blob/master/LICENSE.md#ever-teams-platform-enterprise-license)

#### The default Ever® Teams™ Platform license, without a valid Ever® Teams™ Platform Enterprise or Ever® Teams™ Platform Small Business License agreement, is the Ever® Teams™ Platform Community Edition License

We support the open-source community. If you're building awesome non-profit/open-source projects, we're happy to help and will provide (subject to [acceptance criteria](https://github.com/ever-co/ever-gauzy/wiki/Free-license-and-hosting-for-Non-profit-and-Open-Source-projects)) Ever Teams Enterprise edition license and free hosting option! Feel free to contact us at <mailto:ever@ever.co> to make a request. More details are explained in our [Wiki](https://github.com/ever-co/ever-gauzy/wiki/Free-license-and-hosting-for-Non-profit-and-Open-Source-projects).

#### Please see [LICENSE](LICENSE.md) for more information on licenses

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fever-co%2Fever-teams.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fever-co%2Fever-teams?ref=badge_large)

## ™️ Trademarks

**Ever**® is a registered trademark of [Ever Co. LTD](https://ever.co).
**Ever® Demand™**, **Ever® Gauzy™**, **Ever® Teams™** and **Ever® OpenSaaS™**  are all trademarks of [Ever Co. LTD](https://ever.co).

The trademarks may only be used with the written permission of Ever Co. LTD. and may not be used to promote or otherwise market competitive products or services.

All other brand and product names are trademarks, registered trademarks, or service marks of their respective holders.

## 🍺 Contribute

- Please give us a :star: on Github, it **helps**!
- You are more than welcome to submit feature requests in the [separate repo](https://github.com/ever-co/feature-requests/issues)
- Pull requests are always welcome! Please base pull requests against the _develop_ branch and follow the [contributing guide](.github/CONTRIBUTING.md).

## 💪 Thanks to our Contributors

See our contributors list in [CONTRIBUTORS.md](https://github.com/ever-co/ever-teams/blob/develop/.github/CONTRIBUTORS.md).
You can also view a full list of our [contributors tracked by Github](https://github.com/ever-co/ever-teams/graphs/contributors).

<img src="https://contributors-img.web.app/image?repo=ever-co/ever-teams" />

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ever-co/ever-teams&type=Date)](https://star-history.com/#ever-co/ever-teams&Date)

## ❤️ Powered By

<p>
  <a href="https://www.digitalocean.com/?utm_medium=opensource&utm_source=ever-co">
    <img src="https://opensource.nyc3.cdn.digitaloceanspaces.com/attribution/assets/PoweredByDO/DO_Powered_by_Badge_blue.svg" width="201px">
  </a>
</p>

<p>
	<a href="https://vercel.com/?utm_source=ever-co&utm_campaign=oss">
  	  <img src=".github/vercel-logo.svg" alt="Powered by Vercel" />
	</a>
</p>

## ©️ Copyright

#### Copyright © 2022-present, Ever Co. LTD. All rights reserved

---

![visitors](https://visitor-badge.laobi.icu/badge?page_id=ever-co.ever-teams-platform)
[![huntr](https://cdn.huntr.dev/huntr_security_badge_mono.svg)](https://huntr.dev)
[![Circle CI](https://circleci.com/gh/ever-co/ever-teams.svg?style=svg)](https://circleci.com/gh/ever-co/ever-teams)
[![codecov](https://codecov.io/gh/ever-co/ever-teams/branch/master/graph/badge.svg)](https://codecov.io/gh/ever-co/ever-teams)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/8c46f9eb9df64aa9859dea4d572059ac)](https://www.codacy.com/gh/ever-co/ever-teams/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=ever-co/ever-teams&amp;utm_campaign=Badge_Grade)
[![DeepScan grade](https://deepscan.io/api/teams/3293/projects/16703/branches/363423/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=3293&pid=16703&bid=363423)
[![Known Vulnerabilities](https://snyk.io/test/github/ever-co/ever-teams/badge.svg)](https://snyk.io/test/github/ever-co/ever-teams)
[![Total alerts](https://img.shields.io/lgtm/alerts/g/ever-co/ever-teams.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ever-co/ever-teams/alerts/)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/ever-co/ever-teams.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/ever-co/ever-teams/context:javascript)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fever-co%2Fever-teams.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fever-co%2Fever-teams?ref=badge_shield)
[![Crowdin](https://badges.crowdin.net/e/1d2b3405d65a56ec116d0984fd579cc9/localized.svg)](https://ever.crowdin.com/ever-teams)

## 🔥 P.S

- If you are running any business or doing freelance, check our new project [Ever Gauzy](https://github.com/ever-co/ever-gauzy) - Open Business Management Platform (ERP/CRM/HRM)
- [We are Hiring: remote TypeScript / NodeJS / NestJS / Angular & React developers](https://github.com/ever-co/jobs#available-positions)
