import { useColors } from "@/hooks/useColors";
import React, { ReactNode } from "react";
import { StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from "react-native";

export type UIButtonType = 'normal' | 'large' | 'tag' | 'outline' | 'bold';

export type UIButtonProps = {
     label: string;
     onPress?: () => void;
     type?: UIButtonType;
     style?: ViewStyle;
     textStyle?: TextStyle;
     icon?: ReactNode;
     iconPosition?: 'left' | 'right';
};

export const UIButton = ({ label, onPress, type = 'normal', style, textStyle, icon, iconPosition = 'left', ...rest }: UIButtonProps) => {
     const color = useColors();

     const themedButtonStyles: Record<UIButtonType, ViewStyle> = {
          normal: {
               ...styles.buttonBase,
               backgroundColor: color.btn,
               minHeight: 50,
               paddingVertical: 15,
          },
          large: {
               ...styles.buttonBase,
               backgroundColor: color.btn,
               minHeight: 60,
               paddingVertical: 18,
          },
          tag: {
               ...styles.buttonBase,
               backgroundColor: color.success,
               // minHeight: 40,
               paddingVertical: 3,
          },
          outline: {
               ...styles.buttonBase,
               backgroundColor: 'transparent',
               borderColor: color.btn,
               borderWidth: 2,
               minHeight: 50,
               paddingVertical: 15,
          },

          bold: {
               ...styles.buttonBase,
               backgroundColor: color.btn,
               minHeight: 50,
               paddingVertical: 15,
          }
     };

     const themedTextStyles: Record<UIButtonType, TextStyle> = {
          normal: { ...styles.normalText, color: color.white },
          large: { ...styles.largeText, color: color.white },
          tag: { ...styles.tagText, color: color.white },
          outline: { ...styles.outlineText, color: color.btn },
          bold: { ...styles.normalText, color: color.white, fontWeight: 'bold' },

     };

     const buttonStyle = themedButtonStyles[type] || themedButtonStyles.normal;
     const labelStyle = themedTextStyles[type] || themedTextStyles.normal;

     return (
          <TouchableOpacity
               onPress={onPress}
               style={[buttonStyle, style]}
               activeOpacity={0.80}
               {...rest}
          >
               <View style={styles.content}>
                    {iconPosition === 'left' && icon && (<View style={styles.iconWrapperLeft}>{icon}</View>)}
                    <Text style={[labelStyle, textStyle]}>{label}</Text>
                    {iconPosition === 'right' && icon && (<View style={styles.iconWrapperRight}>{icon}</View>)}
               </View>
          </TouchableOpacity>
     );
};

const styles = StyleSheet.create({
     buttonBase: {
          borderRadius: 5,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
          elevation: 2,
          paddingHorizontal: 20,
          fontWeight: 500
     },
     content: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
     },

     normalText: {
          fontSize: 16,
          fontWeight: '500',
     },

     largeText: {
          fontSize: 19,
          fontWeight: 700
     },
     tagText: {
          fontSize: 14,
          fontWeight: 600,
     },

     outlineText: {
          fontWeight: 600,
     },
     iconWrapperLeft: {
          marginRight: 10,
     },
     iconWrapperRight: {
          marginLeft: 10,
     }
}); 