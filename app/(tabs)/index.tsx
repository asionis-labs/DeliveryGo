import {SafeAreaView, StyleSheet, View, StatusBar, FlatList} from 'react-native';
import {useColors} from "@/hooks/useColors";
import {deliveries} from "@/data";
import DeliveryHeader from "@/components/UIS/DeliveryHeader";
import DeliveryItem from "@/components/UIS/DeliveryItem";
import TakePhoto from "@/components/UIS/TakePhoto";


export default function HomeScreen() {

    const color = useColors();

  return (
    <SafeAreaView style={{flex:1,  backgroundColor: color.primary_bg}}>
        <StatusBar
            backgroundColor={color.primary_bg}
            barStyle="dark-content"
        />

        <View style={{flex: 1}}>

            <FlatList
                data={deliveries}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <DeliveryItem item={item} />}
                ListHeaderComponent={DeliveryHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
            />

            <TakePhoto />


        </View>


    </SafeAreaView>
  );
}




const styles = StyleSheet.create({

});
