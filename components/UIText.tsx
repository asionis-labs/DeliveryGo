import { useColors } from "@/hooks/useColors";
import { StyleSheet, Text, TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
     type?: 'base' | 'title' | 'subtitle' | 'semiBold' | 'link' | 'large';
};

export function UIText({ style, type = 'base', ...rest }: ThemedTextProps) {

     const color = useColors();

     const typeMap = {
          base: styles.base,
          title: styles.title,
          subtitle: styles.subtitle,
          semiBold: styles.semiBold,
          link: styles.link,
          large: styles.large,
     }

     return (
          <Text
               style={[
                    typeMap[type] || styles.base,
                    { color: color.text },
                    style,
               ]} {...rest}
          />
     );
}

const styles = StyleSheet.create({
     base: {
          fontSize: 16,
          lineHeight: 22,
          fontWeight: 500,

     },
     semiBold: {
          fontSize: 16,
          lineHeight: 22,
          fontWeight: '600',
     },
     title: {
          fontSize: 30,
          fontWeight: '700',
          lineHeight: 34,
     },
     subtitle: {
          fontSize: 20,
          fontWeight: '700',
          lineHeight: 28,
     },
     link: {
          fontSize: 16,
          lineHeight: 22,
          fontWeight: '600',
          textDecorationLine: 'underline',
     },
     large: {
          fontSize: 35,
          fontWeight: '800',
          lineHeight: 34,
     }
});