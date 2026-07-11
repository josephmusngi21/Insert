const {
  withEntitlementsPlist,
  withInfoPlist,
  createRunOncePlugin,
} = require("@expo/config-plugins");

const withInsertIosSurfaceFeatures = (config, options = {}) => {
  const appGroup = options.appGroup || "group.com.insert.app";

  config = withEntitlementsPlist(config, (mod) => {
    const existingGroups = mod.modResults["com.apple.security.application-groups"] || [];
    if (!existingGroups.includes(appGroup)) {
      mod.modResults["com.apple.security.application-groups"] = [...existingGroups, appGroup];
    }

    mod.modResults["com.apple.developer.usernotifications.time-sensitive"] = true;
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSSupportsLiveActivities = true;
    return mod;
  });

  return config;
};

module.exports = createRunOncePlugin(
  withInsertIosSurfaceFeatures,
  "with-insert-ios-surface-features",
  "1.0.0"
);
