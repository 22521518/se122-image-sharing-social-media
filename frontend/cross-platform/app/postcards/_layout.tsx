import { Stack } from 'expo-router';

export default function PostcardsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
