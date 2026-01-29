import { Href, Link, usePathname } from 'expo-router';
import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, TextStyle, ViewStyle } from 'react-native';

interface NavLinkRenderProps {
  isActive: boolean;
}

interface NavLinkProps {
  href: Href;
  style?: ViewStyle;
  activeStyle?: ViewStyle;
  textStyle?: TextStyle;
  activeTextStyle?: TextStyle;
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
  onPress?: () => void;
}

export function NavLink({ href, style, activeStyle, children, onPress }: NavLinkProps) {
  const pathname = usePathname();
  const hrefPath = typeof href === 'string' ? href : href.pathname;
  const isActive = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

  const renderProps: NavLinkRenderProps = { isActive };

  return (
    <Link href={href} asChild>
      <Pressable style={[styles.link, style, isActive && activeStyle]} onPress={onPress}>
        {typeof children === 'function' ? children(renderProps) : children}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    // Base link styles
  },
});
