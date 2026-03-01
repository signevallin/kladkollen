import { Stack } from 'expo-router'

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
       <Stack.Screen name="profile" />
      <Stack.Screen name="wardrobe" />
      <Stack.Screen name="outfit" />
      <Stack.Screen name="my-outfit" />
      <Stack.Screen name="inspiration" />
      <Stack.Screen name="stats" />
      <Stack.Screen name="add-garment" />
      <Stack.Screen name="garment-detail" />
      <Stack.Screen name="login" />
    </Stack>
  )
}
