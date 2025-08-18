
import { create } from 'zustand';

export type Connection = {
    id: string;
    driver_id: string;
    restaurant_id: string;
    hourly_rate: number;
    mileage_rate: number;
    invited_by: 'driver' | 'restaurant';
    status: 'pending' | 'accepted' | 'declined';
    restaurant_name: string;
    driver_name: string,
    restaurant_postcode: string
    subscription_end?: string,
    created_at?: string,
    local_rate?: number;

    // ... add other fields
};

export type Shift = {
    id: string;
    driver_id: string;
    restaurant_id: string;
    start_time: string;
    status: 'active' | 'ended';
    end_time: string | null;
    // ... add other fields
};

export type Delivery = {
    id: string;
    driver_id: string;
    restaurant_id: string;
    shift_id: string;
    earning: number;
    distance_miles: number;
    verify_code: string;
    customer_phone: string;
    address: string;
    postcode: string;
    country: string;
    status: 'ongoing' | 'completed';
    start_time: string;
    completed_at: string | null;
    connection_id: string | null;
    // ... add other fields
};

export type UserProfile = {
    id: string;
    name: string;
    phone: string;
    email: string;
    role: 'driver' | 'restaurant';
    house_number?: string;
    street?: string;
    town?: string;
    postcode?: string;
    country?: string;
    hourly_rate?: number;
    mileage_rate?: number;
    active_connection_id?: string;
    active_connection_name?: string;
    subscription_end?: string,
    local_rate?: number;

};

type AppDataStore = {
    connections: Connection[];
    shifts: Shift[];
    deliveries: Delivery[];
    setConnections: (connections: Connection[]) => void;
    setShifts: (shifts: Shift[]) => void;
    setDeliveries: (deliveries: Delivery[]) => void;
    session: any;
    profile: UserProfile | null;
    setSession: (session: any) => void;
    setProfile: (profile: UserProfile | null) => void;
    clear: () => void;
};

export const dataStore = create<AppDataStore>((set) => ({
    connections: [],
    shifts: [],
    deliveries: [],
    setConnections: (connections) => set({ connections }),
    setShifts: (shifts) => set({ shifts }),
    setDeliveries: (deliveries) => set({ deliveries }),
    session: null,
    profile: null,
    setSession: (session) => set({ session }),
    setProfile: (profile) => set({ profile }),
    clear: () => set({ connections: [], shifts: [], deliveries: [], session: null, profile: null }),
}));