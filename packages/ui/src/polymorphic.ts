import * as React from "react";

export type AsChildProps = {
  asChild?: boolean;
};

export type PolymorphicRef<C extends React.ElementType> = React.ComponentPropsWithRef<C>["ref"];

export type PolymorphicComponentProps<C extends React.ElementType, Props = {}> =
  Props & AsChildProps &
    (C extends React.ElementType
      ? Omit<React.ComponentPropsWithoutRef<C>, keyof Props | "asChild">
      : never);

export type PolymorphicComponentPropsWithRef<C extends React.ElementType, Props = {}> =
  PolymorphicComponentProps<C, Props> & {
    ref?: PolymorphicRef<C>;
  };
