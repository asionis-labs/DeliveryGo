// import { create } from 'zustand';
//
// type UserProfile = {
//     id: string;
//     name: string;
//     phone: string;
//     email: string;
//     role: 'driver' | 'restaurant';
//     house_number?: string;
//     street?: string;
//     town?: string;
//     postcode?: string;
//     country?: string;
//     hourly_rate?: number;
//     mileage_rate?: number;
// };
//
// type UserStore = {
//     session: any;
//     profile: UserProfile | null;
//     setSession: (session: any) => void;
//     setProfile: (profile: UserProfile | null) => void;
//     clear: () => void;
// };
//
// export const userStore = create<UserStore>((set) => ({
//     session: null,
//     profile: null,
//     setSession: (session) => set({ session }),
//     setProfile: (profile) => set({ profile }),
//     clear: () => set({ session: null, profile: null }),
// }));
