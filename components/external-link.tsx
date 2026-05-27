import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { type PropsWithChildren } from 'react';
import { Linking, Pressable, type PressableProps } from 'react-native';

type Props = PropsWithChildren<PressableProps & { href: string }>;

export function ExternalLink({ href, children, ...rest }: Props) {
  return (
    <Pressable
      {...rest}
      onPress={async (event) => {
        if (process.env.EXPO_OS !== 'web') {
          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
          return;
        }

        await Linking.openURL(href);
      }}
    >
      {children}
    </Pressable>
  );
}
