import LineBreak from '@/components/LineBreak';
import { StyleSheet, View, Text, SafeAreaView, Platform } from 'react-native';

export default function Report() {
    return (
        <SafeAreaView style={{ backgroundColor: "red", flex: 1, padding: 50 }}>
            <LineBreak height={Platform.OS === "android" ? 25 : 0} />

            <View>
                <Text> Hello </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({

});
