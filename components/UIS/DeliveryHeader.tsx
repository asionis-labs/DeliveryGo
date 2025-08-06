import {View, StyleSheet, TouchableOpacity} from "react-native";
import {UIText} from "@/components/UIText";
import {useColors} from "@/hooks/useColors";
import {useState} from "react";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import {UIModal} from "@/components/UIModal";
import LineBreak from "@/components/LineBreak";
import {UIButton} from "@/components/UIButton";
import Foundation from '@expo/vector-icons/Foundation';


export default function DeliveryHeader({ data }: { data: any }) {

    const [dropdownVisible, setDropdownVisible] = useState(false)

    const color = useColors();

    // console.log("Delivery Header data:", data);

    return (
        <View style={{flex: 1, padding: 20}}>

            <View style={[styles.container, { backgroundColor: color.primary_bg }]}>

                <View style={{flexDirection: "row", alignItems: "center", justifyContent: "space-between"}}>
                    <UIText type="title">Dashboard</UIText>
                    <TouchableOpacity
                        onPress={() => setDropdownVisible(true)}
                        style={{flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 20, paddingTop: 20, paddingBottom: 20}}
                    >
                        <UIText type="semiBold"> Pizza Gogo </UIText>
                        <FontAwesome name="caret-down" size={16} color={color.text} />
                    </TouchableOpacity>

                </View>

                <View style={{
                    backgroundColor: color.white, padding: 20, borderRadius: 15, marginTop: 10,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.1, elevation: 5,
                }}>


                    <View style={{flexDirection: "row", justifyContent: "space-between", flex: 1}}>

                        <View style={{flex: 1}}>
                            <UIText>Delivery Fees </UIText>
                            <UIText type="subtitle" style={{ marginTop: 5, color: color.btn }}> £21.25 </UIText>
                        </View>


                        <View style={{flex: 1}}>
                            <UIText style={{textAlign: "right"}}>Start Time </UIText>
                            <UIText type="semiBold" style={{ marginTop: 5, color: color.text_light, textAlign: "right" }}>0 hours / --:-- </UIText>
                        </View>

                    </View>

                    <LineBreak height={20} />



                    <View style={{flex: 1, flexDirection: "row", justifyContent: "space-between", gap: 20, alignItems: "center"}}>

                        <View style={{flex: 2}}>
                            <UIText>Today&#39;s Earning </UIText>
                            <UIText type="subtitle" style={{ marginTop: 5, color: color.btn }}> £67.25 </UIText>
                        </View>

                        <UIButton label="Start" style={{flex: 1, paddingVertical: 20, borderRadius: 15, backgroundColor: color.error}} icon={<Foundation name="key" size={24} color={color.white} />}/>
                    </View>

                </View>

                <UIModal title="Select" isVisible={dropdownVisible} onClose={() => setDropdownVisible(false)}  >
                    <UIText>Hello</UIText>
                </UIModal>
            </View>

            <LineBreak height={20} />

            <UIText type="semiBold"> Deliveries (2) </UIText>

        </View>
    )
}

const styles = StyleSheet.create({
    container: {

    },
});