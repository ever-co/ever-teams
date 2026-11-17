# @ever-teams/tracking

An analytics library that uses web page interactions to generate aggregated insights and performance metrics.

It records how people use a page (clicks, scrolls, page structure) with a session recorder, and uploads the
recording, with the signed-in user's token, to `{apiUrl}/timesheet/custom-tracking` of an Ever Teams API. Ask your
users for consent before you start it, and always pass the `apiUrl` of your own API: without it, recordings go to
`https://api.ever.team/api`. Versions up to 0.0.2 uploaded them to the demo Gauzy API instead
([ever-co/ever-teams#5406](https://github.com/ever-co/ever-teams/issues/5406)): upgrade.

The embeddable timer does not need this package: see the
[`@ever-teams/atoms` README](https://github.com/ever-co/ever-teams/tree/develop/packages/toolkit/atoms#readme).
MIT licensed.
