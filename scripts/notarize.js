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

  if (!(
    'APPLE_ID' in process.env && 'APPLE_APP_SPECIFIC_PASSWORD' in process.env
  )) {
    process.stderr.write(
      'Skipping notarizing step. APPLE_ID and APPLE_APP_SPECIFIC_PASSWORD env variables must be set\n',
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  await notarize({
    appBundleId: build.appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
  });
};
