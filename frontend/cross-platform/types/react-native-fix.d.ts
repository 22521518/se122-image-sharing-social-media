/**
 * Type augmentation to fix React 19 / react-native type incompatibility
 *
 * This fixes the "Property 'children' is missing in type 'ReactElement'" and
 * "'View' cannot be used as a JSX component" errors that occur due to
 * React 19's stricter ReactNode type definition conflicting with react-native.
 *
 * @see https://github.com/facebook/react-native/issues/42019
 */

import type { ReactNode } from 'react';

declare global {
  namespace JSX {
    // Extend IntrinsicAttributes to accept children
    interface IntrinsicAttributes {
      children?: ReactNode;
    }

    // Make Element compatible with ReactNode
    type Element = ReactNode;
  }
}

// Augment React types
declare module 'react' {
  // Fix ReactElement to include optional children
  interface ReactElement {
    children?: ReactNode;
  }
}

// Fix react-native component types
declare module 'react-native' {
  import { ComponentType, ReactNode, FC, ComponentClass } from 'react';

  interface ViewProps {
    children?: ReactNode;
  }

  interface TextProps {
    children?: ReactNode;
  }

  interface ScrollViewProps {
    children?: ReactNode;
  }

  interface TouchableOpacityProps {
    children?: ReactNode;
  }

  interface ImageProps {
    children?: ReactNode;
  }
}

export { };
