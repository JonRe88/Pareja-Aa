import { Text, TextProps, TextStyle } from 'react-native';

type Variant = 'body' | 'caption' | 'button';
type Weight = 'light' | 'regular' | 'medium' | 'semibold';

const fontByWeight: Record<Weight, string> = {
  light: 'SofiaSans_300Light',
  regular: 'SofiaSans_400Regular',
  medium: 'SofiaSans_500Medium',
  semibold: 'SofiaSans_600SemiBold',
};

export type AppTextProps = TextProps & {
  variant?: Variant;
  weight?: Weight;
};

export function AppText({
  variant = 'body',
  weight = 'regular',
  style,
  ...props
}: AppTextProps) {
  const base: TextStyle =
    variant === 'caption'
      ? { fontSize: 12, lineHeight: 18 }
      : variant === 'button'
        ? { fontSize: 14, letterSpacing: 0.5 }
        : { fontSize: 14, lineHeight: 22 };

  return (
    <Text
      {...props}
      style={[
        base,
        { fontFamily: fontByWeight[weight] },
        style,
      ]}
    />
  );
}

