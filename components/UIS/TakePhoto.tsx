import {UIText} from "@/components/UIText";
import {UIButton} from "@/components/UIButton";
import {View, StyleSheet} from "react-native";
import {useColors} from "@/hooks/useColors";
import FontAwesome from '@expo/vector-icons/FontAwesome';

export default function TakePhoto(){

    const color = useColors()

    return(
        <View style={{backgroundColor: color.inputBG, flexDirection: "row", marginBottom: 50, paddingVertical: 10, paddingHorizontal: 20, alignItems: "center", justifyContent: "space-between"}}>
            <UIText style={{flex: 1, color: color.link}}>Add Manually</UIText>
            <UIButton style={{paddingVertical: 20, flex: 1}} type="normal" label="Take Photo" icon={<FontAwesome name="camera" size={20} color={color.white} />}/>
        </View>
    )
}