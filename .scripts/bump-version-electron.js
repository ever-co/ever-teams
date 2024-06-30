const fs = require('fs');
const simpleGit = require('simple-git');
const git = simpleGit();

async function getLatestTag(repoURL) {
	try {
		// Fetch remote tags
		const tags = await git.listRemote(['--tags', repoURL]);

		// Parse and filter tags
		const tagPattern = /^v?[0-9]+\.[0-9]+\.[0-9]+$/;
		const tagList = tags
			.split('\n')
			.map((tagLine) => tagLine.split(/\s+/)[1]) // Extract the tag reference
			.filter((ref) => ref && ref.includes('refs/tags/')) // Filter out non-tags
			.map((ref) => ref.replace('refs/tags/', '')) // Extract the tag name
			.filter((tag) => tagPattern.test(tag)); // Filter valid version tags

		// Sort and get the latest tag
		const latestTag = tagList
			.sort((a, b) => {
				// Using localeCompare with 'numeric' option for version comparison
				return a.localeCompare(b, undefined, { numeric: true });
			})
			.pop();

		return latestTag;
	} catch (error) {
		console.error(`Error fetching tags: ${error.message}`);
	}
}

module.exports.serverweb = async (isProd) => {
	if (fs.existsSync('./apps/server-web/release/app/package.json')) {
		let package = require('../apps/server-web/release/app/package.json');
		let currentVersion = package.version;

		const repoURL = process.env.PROJECT_REPO;
		console.log('repoURL', repoURL);

		const appName = process.env.DESKTOP_WEB_SERVER_APP_NAME;
		console.log('appName', appName);

		const stdout = await getLatestTag(repoURL);

		let newVersion = stdout.trim();
		console.log('latest tag', newVersion);

		if (newVersion) {
			// let's remove "v" from version, i.e. first character
			newVersion = newVersion.substring(1);
			package.version = newVersion;

			console.log('Version updated to version', newVersion);
		} else {
			console.log('Latest tag is not found. Build Desktop Web Server App with default version', currentVersion);
		}

		package.name = appName;
		package.productName = process.env.DESKTOP_WEB_SERVER_APP_DESCRIPTION;
		package.description = process.env.DESKTOP_WEB_SERVER_APP_DESCRIPTION;
		package.homepage = process.env.COMPANY_SITE_LINK;

		fs.writeFileSync('./apps/server-web/release/app/package.json', JSON.stringify(package, null, 2));

		let updated = require('../apps/server-web/release/app/package.json');

		console.log('Version releasing', updated.version);
	}

	if (fs.existsSync('./apps/server-web/package.json')) {
		let package = require('../apps/server-web/package.json');
		let currentVersion = package.version;

		const repoURL = process.env.PROJECT_REPO;
		console.log('repoURL', repoURL);

		const appName = process.env.DESKTOP_WEB_SERVER_APP_NAME;
		console.log('appName', appName);

		const stdout = await getLatestTag(repoURL);

		let newVersion = stdout.trim();
		console.log('latest tag', newVersion);

		if (newVersion) {
			// let's remove "v" from version, i.e. first character
			newVersion = newVersion.substring(1);
			package.version = newVersion;

			console.log('Version updated to version', newVersion);
		} else {
			console.log('Latest tag is not found. Build Desktop Web Server App with default version', currentVersion);
		}

		package.name = appName;
		package.productName = process.env.DESKTOP_WEB_SERVER_APP_DESCRIPTION;
		package.description = process.env.DESKTOP_WEB_SERVER_APP_DESCRIPTION;
		package.homepage = process.env.COMPANY_SITE_LINK;

		package.build.appId = process.env.DESKTOP_WEB_SERVER_APP_ID;
		package.build.productName = process.env.DESKTOP_WEB_SERVER_APP_DESCRIPTION;
		package.build.linux.executableName = appName;

		const appRepoName = process.env.DESKTOP_WEB_SERVER_REPO_NAME || appName;
		const appRepoOwner = process.env.DESKTOP_WEB_SERVER_REPO_OWNER || 'ever-co';

		// For GitHub options see https://www.electron.build/configuration/publish.html

		if (!isProd) {
			package.build.publish = [
				{
					provider: 'github',
					repo: appRepoName,
					owner: appRepoOwner,
					releaseType: 'prerelease'
				},
				{
					provider: 'spaces',
					name: 'ever',
					region: 'sfo3',
					path: `/${appName}-pre`,
					acl: 'public-read'
				}
			];
		} else {
			package.build.publish = [
				{
					provider: 'github',
					repo: appRepoName,
					owner: appRepoOwner,
					releaseType: 'release'
				},
				{
					provider: 'spaces',
					name: 'ever',
					region: 'sfo3',
					path: `/${appName}`,
					acl: 'public-read'
				}
			];
		}

		fs.writeFileSync('./apps/server-web/package.json', JSON.stringify(package, null, 2));

		let updated = require('../apps/server-web/package.json');

		console.log('Version releasing', updated.version);
	}
};
