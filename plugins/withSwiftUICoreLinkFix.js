const { withXcodeProject } = require('@expo/config-plugins')

// RevenueCats paywall-UI (react-native-purchases-ui → RNPaywalls/RevenueCatUI)
// bäddar in en autolink-hint för SwiftUICore i sina statiska bibliotek. iOS-SDK:ns
// SwiftUICore.tbd har allowable-clients som bara tillåter Apples egna ramverk
// (SwiftUI, UIKit m.fl.), så länkningen dör med:
//
//   ld: cannot link directly with 'SwiftUICore' because product being built
//       is not an allowed client of it
//
// Hinten är onödig här: appens deployment target är 15.1, och SwiftUICore.tbd
// innehåller $ld$previous-poster som pekar om symbolerna till SwiftUI för allt
// under iOS 18. Appen länkar redan -framework SwiftUI. Vi ber alltså länkaren
// hoppa över just den auto-länkade biblioteket.
//
// Måste vara ett config-plugin och inte en handredigering i ios/: den katalogen
// är gitignorerad och byggs om från noll av `expo prebuild` och av EAS.
const FLAGS = ['-Xlinker', '-ignore_auto_link_library', '-Xlinker', 'SwiftUICore']

module.exports = function withSwiftUICoreLinkFix(config) {
  return withXcodeProject(config, cfg => {
    const buildConfigs = cfg.modResults.pbxXCBuildConfigurationSection()

    for (const key of Object.keys(buildConfigs)) {
      const settings = buildConfigs[key] && buildConfigs[key].buildSettings
      if (!settings || !settings.PRODUCT_NAME) continue // hoppa över projektnivån

      const existing = settings.OTHER_LDFLAGS
      const flags = Array.isArray(existing)
        ? [...existing]
        : existing
          ? [existing]
          : ['"$(inherited)"']

      if (flags.some(f => String(f).includes('ignore_auto_link_library'))) continue
      settings.OTHER_LDFLAGS = [...flags, ...FLAGS]
    }

    return cfg
  })
}
