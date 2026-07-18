const { notarize } = require('@electron/notarize');
const { build } = require('../package.json');

exports.default = async function notarizeMacos(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  if (process.env.CI !== 'true') {
    process.stderr.write(
      'Skipping notarizing step. Packaging is not running in CI\n',
    );
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword) {
    process.stderr.write(
      'Skipping notarizing step. APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD must be set\n',
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const notarizeOptions = {
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId,
    appleIdPassword,
  };

  // 新版 notarytool 推荐带上 teamId
  if (teamId) {
    notarizeOptions.teamId = teamId;
  }

  await notarize(notarizeOptions);
};
