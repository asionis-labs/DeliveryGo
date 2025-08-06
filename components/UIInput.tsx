import React from 'react';
import { TextInput, StyleSheet, TextInputProps, View, ViewStyle, TextStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export type UIInputProps = TextInputProps & {
    iconName?: string;
    iconSize?: number;
    iconColor?: string;
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
};

export const UIInput = ({ containerStyle, inputStyle, iconName, iconSize = 18, iconColor, ...rest }: UIInputProps) => {
    const color = useColors();

    const themedContainerStyle = {
        backgroundColor: color.white,
        borderColor: color.second_bg,
    };

    const themedInputStyle = {
        color: color.text,
    };

    const finalIconColor = iconColor || color.placeholder;

    return (
        <View style={[styles.container, themedContainerStyle, containerStyle]}>
            {iconName && (
                <FontAwesome5
                    name={iconName}
                    size={iconSize}
                    color={finalIconColor}
                    style={styles.icon}
                />
            )}
            <TextInput
                style={[styles.input, themedInputStyle, inputStyle]}
                placeholderTextColor={color.placeholder}
                {...rest}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 50,
        width: '100%',
        borderRadius: 8,
        borderWidth: 2,
        paddingHorizontal: 15,
        marginBottom: 15, // Added a default margin for spacing
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingHorizontal: 0, // Reset padding to avoid double padding with the container
    },
});