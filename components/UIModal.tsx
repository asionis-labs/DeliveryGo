import { useColors } from '@/hooks/useColors';
import { FontAwesome5 } from '@expo/vector-icons';
import React, { ReactNode } from "react";
import { Modal, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {UIText} from "@/components/UIText";

interface UIModalProps {
     isVisible: boolean;
     title?: string;
     children: ReactNode;
     onClose?: () => void;
}

export const UIModal = ({ isVisible, title, children, onClose }: UIModalProps) => {
     const color = useColors();

     return (
          <Modal
               animationType="slide"
               transparent={false}
               visible={isVisible}
               onRequestClose={onClose}
               presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}>
               <SafeAreaView style={[styles.safeArea, { backgroundColor: color.primary_bg }]}>
                    <View style={styles.contentContainer}>
                         <View style={styles.header}>
                              {title && ( <UIText type="title">{title}</UIText> ) || <View></View>}
                              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                   <FontAwesome5 name="times" size={24} color={color.text} />
                              </TouchableOpacity>
                         </View>
                         <View style={styles.childrenWrapper}>
                              {children}
                         </View>
                    </View>
               </SafeAreaView>
          </Modal>
     );
};

const styles = StyleSheet.create({
     safeArea: {
          flex: 1,
     },
     contentContainer: {
          flex: 1,
          padding: 20,
     },
     header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          marginBottom: 15,
     },
     title: {
          fontSize: 24,
          fontWeight: 'bold',
          flexShrink: 1,
     },
     closeButton: {
          padding: 5,
     },
     childrenWrapper: {
          flex: 1,
     },
});