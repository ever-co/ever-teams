# Ever Gauzy Teams

Ever® Gauzy Teams™ - Open Work and Project Management Platform. 

You are welcome to check more information about the platform at our official website - https://gauzy.team.

Ever® Gauzy Teams™ Platform is build on top of our Busines Management Platform (ERP/CRM/HRM) - Ever® Gauzy™ Platform, which itself is a part of our larger Open Platform for On-Demand and Sharing Economies - Ever®. You can get more information about all our products at https://ever.co.

## Getting Starting

Ever® Gauzy Teams™ requires access to Ever® Gauzy™ Platform APIs, provided by another project - Ever® Gauzy™ Platform, see https://github.com/ever-co/ever-gauzy (and also <https://gauzy.co>). Specifically you will be interested in the `apps/api` and `apps/server` folders of the mono-repo.

There are few ways to run Ever Gauzy Teams:

1. Connect it to our live Ever Gauzy APIs using endpoint <https://api.gauzy.co/api> which is set in the `GAUZY_API_SERVER_URL` env variable (see <https://github.com/ever-co/ever-gauzy-teams/blob/develop/web/.env.sample> for example). Of course, you will have to register in Ever Gauzy, see <https://app.gauzy.co/#/auth/register> (Note: currently in Alpha version)

2. Download and run Ever Gauzy Server setup (<https://web.gauzy.co/downloads>) or run server manually (see <https://github.com/ever-co/ever-gauzy/tree/develop/apps/server>). You can also run only Ever Gauzy APIs (manually), see https://github.com/ever-co/ever-gauzy/tree/develop/apps/api. For getting starting instructions, it's best to check Ever Gauzy [README](https://github.com/ever-co/ever-gauzy/blob/develop/README.md) file. After you get API or Server running, make sure you set environment variable `GAUZY_API_SERVER_URL` (see <https://github.com/ever-co/ever-gauzy-teams/blob/develop/web/.env.sample> for example).

## Content

- `/web` - NextJs based web app at <https://app.gauzy.team> (deployed from `main` branch)
- `/website` - NextJs based public website at <https://gauzy.team> (deployed from `main` branch)
- `/mobile` - ReactNative / Expo powered mobile apps
- `/extensions` - Browser Extensions powered by https://github.com/PlasmoHQ/plasmo

## License

❗ This repository is PRIVATE, COPYRIGHTED & PROPRIETARY product by Ever Co. LTD. ❗  
❗ *Do NOT share code and do NOT COPY portions of the code to other products!* ❗  

We will most likely eventually release it Open-Source, but under custom license which sometimes called “Commons Clause”, see example below:

```

“Commons Clause” License Condition v1.0

The Software is provided to you by the Licensor under the License,
as defined below, subject to the following condition.

Without limiting other conditions in the License, the grant of rights under 
the License will not include, and the License does not grant to you,
the right to Sell the Software.

For purposes of the foregoing, “Sell” means practicing any or all of the rights granted to
you under the License to provide to third parties, for a fee or other consideration 
(including without limitation fees for hosting or consulting/ support services related
to the Software), a product or service whose value derives, entirely or substantially,
from the functionality of the Software. Any license notice or attribution required by the License
must also include this Commons Clause License Condition notice.

Software: Ever Gauzy Teams

License: GNU AFFERO GENERAL PUBLIC LICENSE v3.0

Licensor: Ever Co. LTD

All third party components incorporated into the Ever Gauzy Teams are licensed under
the original license provided by the owner of the applicable component.

WARNING: You are not allowed to use this code to host your own SaaS version of Ever Gauzy Teams❗

```

We can also use https://www.elastic.co/licensing/elastic-license OR https://www.mongodb.com/licensing/server-side-public-license.

However, I am not sure yet because such licenses MAY allow people to use Gauzy Teams internally without requirement to purchase proprietary license from us. 
I think there should be some special Clause for such license restrictions.

TODO: check licensing!

## Trademarks

**Ever**® is a registered trademark of [Ever Co. LTD](https://ever.co).  
**Ever® Demand™**, **Ever® Gauzy™**, **Ever® Gauzy Teams™** and **Ever® OpenSaaS™**  are all trademarks of [Ever Co. LTD](https://ever.co).

The trademarks may only be used with the written permission of Ever Co. LTD. and may not be used to promote or otherwise market competitive products or services.

All other brand and product names are trademarks, registered trademarks or service marks of their respective holders.

## Copyright

#### Copyright © 2022-present, Ever Co. LTD. All rights reserved.
