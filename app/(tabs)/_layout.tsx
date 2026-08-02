import { Tabs } from 'expo-router'

// Flikskärmarna ligger i en Tabs-navigator så de hålls MONTERADE i minnet –
// flikbyten blir omedelbara och skärmarna byggs inte om från scratch (till
// skillnad från den tidigare Stack-lösningen). Den egna BottomNav:en renderas
// per skärm och fungerar som fältet, så vi döljer navigatorns standardfält.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      initialRouteName="home"
      screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' }, animation: 'none' }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="wardrobe" />
      <Tabs.Screen name="my-outfit" />
      <Tabs.Screen name="inspiration" />
    </Tabs>
  )
}
