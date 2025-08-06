
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export function useColors() {
    const colorScheme = useColorScheme() ?? "light";
    return Colors[colorScheme];
}


// import { Colors } from "@/constants/Colors";
// import { useColorScheme } from "@/hooks/useColorScheme";
//
// type Theme = "light" | "dark";
// type ColorKey = keyof typeof Colors["light"] & keyof typeof Colors["dark"];
//
// type UseColorProps = {
//     light?: string;
//     dark?: string;
// };
//
//
// export function useColors(props: UseColorProps = {}, colorName: ColorKey): string {
//     const theme: Theme = useColorScheme() ?? "light";
//     const colorFromProps = props[theme];
//
//     if (colorFromProps) {
//         return colorFromProps;
//     }
//
//     return Colors[theme][colorName];
// }
