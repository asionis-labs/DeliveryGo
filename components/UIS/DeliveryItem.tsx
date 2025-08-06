import {View, StyleSheet, TouchableOpacity, Platform, Linking, Alert} from "react-native";
import {UIText} from "@/components/UIText";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {useColors} from "@/hooks/useColors";
import {useState} from "react";
import {UIModal} from "@/components/UIModal";
import LineBreak from "@/components/LineBreak";
import {UIButton} from "@/components/UIButton";


export default function DeliveryItem({ item }: { item: any }) {

    const [modalVisible, setModalVisible] = useState(false)

    console.log("DeliveryItem data:", item);
    const color = useColors()


    const handleDirection = (address: string) => {
        const mapURL = Platform.select({
            ios: `http://maps.apple.com/?q=${encodeURIComponent(address)}`,
            android: `geo:0,0?q=${encodeURIComponent(address)}`,
        });
        if (mapURL) {
            Linking.openURL(mapURL);
        }
    };

    return (
        <View style={[styles.container, {backgroundColor: color.white}]}>

            <TouchableOpacity
                style={{flex:1, rowGap: 5}}
                onPress={() => setModalVisible(true)}
            >
                <UIText type="semiBold">27 Kenton Gardens, Saint Albans</UIText>
                <View style={{flexDirection: "row", rowGap: 0, columnGap: 15, flexWrap: "wrap"}}>
                    <UIText type="base" style={{color: color.btn, fontSize: 16}}>£3</UIText>
                    <UIText type="base" style={{fontSize: 16, color: color.text_light}}>3.9 miles</UIText>
                    <UIText type="base" style={{fontSize: 16, color: color.text_light}}>Code : 256 894 597</UIText>
                    <UIText type="base" style={{fontSize: 16, color: color.error}}>Ongoing</UIText>
                    <UIText type="base" style={{fontSize: 16, color: color.text_light}}>Phone: 07707 771 599</UIText>
                </View>

            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => handleDirection(item.address)}
                style={{ paddingVertical: 20, paddingLeft: 15, paddingRight: 10, borderRadius: 10, }} >
                <FontAwesome name="location-arrow" size={24} color={color.btn} />
            </TouchableOpacity>



            <UIModal
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={"Delivery Details"}
            >
                <View style={{flexDirection: "column", gap: 10}}>

                    <LineBreak height={20} />

                    <UIText type="subtitle">27 Kenton Gardens, St Albans, AL1 1JS, United Kingdom</UIText>

                    <LineBreak />

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Status</UIText>
                        <UIText style={{ color: color.error }}>Ongoing</UIText>
                    </View>

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Verification Code</UIText>
                        <UIText>236 589 254</UIText>
                    </View>

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Customer Phone</UIText>
                        <UIText>236 589 254</UIText>
                    </View>

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">PostCode</UIText>
                        <UIText>{item.postcode}</UIText>
                    </View>

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Country</UIText>
                        <UIText>{item.country}</UIText>
                    </View>

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Distance</UIText>
                        <UIText>0.5 miles</UIText>
                    </View>

                    <LineBreak />

                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Start Time</UIText>
                        <UIText>12:15 PM</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">End Time</UIText>
                        <UIText>12:30 PM</UIText>
                    </View>
                    <View style={modalStyles.row}>
                        <UIText type="semiBold">Earning</UIText>
                        <UIText style={{ color: color.btn }}>£1.5</UIText>
                    </View>

                    <LineBreak />

                    <View style={modalStyles.buttonRow}>
                        <UIButton
                            label="Mark as delivered"
                            onPress={() => Alert.alert("Delivered")}
                            type="normal"
                            style={{ flex: 1, backgroundColor: color.error }}
                        />
                        <UIButton
                            label="Directions"
                            onPress={() => handleDirection(item.address)}
                            type="normal"
                            style={{ flex: 1 }}
                        />
                    </View>
                </View>
            </UIModal>

        </View>
    )
}


const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        gap: 5,
        elevation: 3,
    },
});

const modalStyles = StyleSheet.create({

    text: {
        marginTop: 5,
        marginBottom: 15,
        color: 'gray'
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 15,
        marginTop: 15,
        marginBottom: 10,
    },
});