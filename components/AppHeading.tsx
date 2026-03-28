import { Text, TextProps, TextStyle } from 'react-native';

type Level = 'h1' | 'h2' | 'h3';

export type AppHeadingProps = TextProps & {
  level?: Level;
};

export function AppHeading({ level = 'h2', style, ...props }: AppHeadingProps) {
  const base: TextStyle =
    level === 'h1'
      ? { fontSize: 44, lineHeight: 48 }
      : level === 'h3'
        ? { fontSize: 20, lineHeight: 26 }
        : { fontSize: 28, lineHeight: 34 };

  return (
    <Text
      {...props}
      style={[
        base,
        { fontFamily: 'Parisienne_400Regular' },
        style,
      ]}
    />
  );
}

