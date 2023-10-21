const fs = require('fs');
const { exec } = require('child_process');

module.exports.desktop = (isProd) => {
	if (fs.existsSync('./apps/desktop-timer/src/package.json')) {
		let package = require('../apps/desktop-timer/src/package.json');
		let currentVersion = package.version;

		exec(
			"git ls-remote --tags git@github.com:ever-co/ever-teams.git | grep -v '^{}' | awk -F'/' '/refs/tags// {print $3}' | grep -E '^v?[0-9]+.[0-9]+.[0-9]+' | sort -V | tail -n1",
			(error, stdout) => {
				if (error) {
					console.error(`exec error: ${error}`);
					return;
				}

				let newVersion = stdout.trim();
				console.log('latest tag', newVersion);

				if (newVersion) {
					// let's remove "v" from version, i.e. first character
					newVersion = newVersion.substring(1);
					package.version = newVersion;

					package.name = 'ever-teams-desktop';
					package.productName = 'Ever Teams Desktop';
					package.description = 'Ever Teams Desktop';
					package.homepage = 'https://ever.team';

					package.build.appId = 'com.ever.everteamsdesktop';
					package.build.productName = 'Ever Teams Desktop';
					package.build.linux.executableName = 'ever-teams-desktop';

					if (!isProd) {
						package.build.publish = [
							{
								provider: 'github',
								repo: 'ever-teams-desktop',
								releaseType: 'prerelease'
							},
							{
								provider: 'spaces',
								name: 'ever',
								region: 'sfo3',
								path: '/ever-teams-desktop-pre',
								acl: 'public-read'
							}
						];
					} else {
						package.build.publish = [
							{
								provider: 'github',
								repo: 'ever-teams-desktop',
								releaseType: 'release'
							},
							{
								provider: 'spaces',
								name: 'ever',
								region: 'sfo3',
								path: '/ever-teams-desktop',
								acl: 'public-read'
							}
						];
					}

					fs.writeFileSync(
						'./apps/desktop-timer/src/package.json',
						JSON.stringify(package, null, 2)
					);

					let updated = require('../apps/desktop-timer/src/package.json');
					console.log('Version updated to version', updated.version);
				} else {
					console.log(
						'Latest tag is not found. build desktop app with default version',
						currentVersion
					);
				}
			}
		);
	}
};
