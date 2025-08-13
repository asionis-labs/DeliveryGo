import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UIText } from '@/components/UIText';
import { UIButton } from '@/components/UIButton';
import { useColors } from '@/hooks/useColors';
import { dataStore } from '@/store/dataStore';
import { supabase } from '@/lib/supabase';
import { UIModal } from '@/components/UIModal';

const LineBreak = ({ height = 10 }: { height?: number }) => <View style={{ height }} />;

interface Profile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'driver' | 'restaurant';
  house_number: string;
  street: string;
  town: string;
  postcode: string;
  country: string;
  hourly_rate: number;
  mileage_rate: number;
  active_connection_id: string | null;
  active_connection_name: string | null;
}

interface Connection {
  id: string;
  driver_id: string;
  restaurant_id: string;
  status: 'pending' | 'accepted' | 'declined';
  hourly_rate: number;
  mileage_rate: number;
  driver_name: string;
  restaurant_name: string;
  invited_by: 'driver' | 'restaurant';
  created_at: string;
}

export default function ConnectionScreen() {
  const color = useColors();
  const { profile, setProfile, setConnections: setConnectionsInStore } = dataStore();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [connectedProfile, setConnectedProfile] = useState<Profile | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('connections')
      .select(`
        id, driver_id, restaurant_id, status, hourly_rate, mileage_rate, invited_by, created_at,
        driver_name:profiles!connections_driver_id_fkey(name),
        restaurant_name:profiles!connections_restaurant_id_fkey(name)
      `)
      .or(`driver_id.eq.${profile.id},restaurant_id.eq.${profile.id}`);

    if (error) {
      Alert.alert("Error fetching connections", error.message);
      setConnections([]);
      setConnectionsInStore([]);
    } else {
      const formattedConnections = data.map((conn: any) => ({
        ...conn,
        driver_name: conn.driver_name?.name,
        restaurant_name: conn.restaurant_name?.name
      }));
      setConnections(formattedConnections);
      setConnectionsInStore(formattedConnections);
    }
    setLoading(false);
  }, [profile?.id, setConnections, setConnectionsInStore]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = async () => {
    setLoading(true);
    const oppositeRole = profile?.role === 'driver' ? 'restaurant' : 'driver';
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role')
      .eq('role', oppositeRole)
      .ilike('name', `%${searchQuery}%`);

    if (error) {
      Alert.alert("Search Error", error.message);
    } else {
      const filteredResults = data ? data.filter(res => res.id !== profile?.id) : [];
      setSearchResults(filteredResults);
    }
    setLoading(false);
  };

  const handleSendRequest = async (recipientId: string) => {
    if (!profile?.id) return;
    const [driver_id, restaurant_id] = profile.role === 'driver'
      ? [profile.id, recipientId]
      : [recipientId, profile.id];

    const { hourly_rate, mileage_rate, role } = profile;

    if (hourly_rate === null || mileage_rate === null) {
      return Alert.alert("Error", "Your profile is missing hourly or mileage rate information. Please update your profile first.");
    }

    const { error } = await supabase
      .from('connections')
      .insert({
        driver_id,
        restaurant_id,
        hourly_rate,
        mileage_rate,
        invited_by: role,
        status: 'pending',
      });

    if (error) {
      Alert.alert("Error", `Failed to send request: ${error.message}`);
    } else {
      Alert.alert("Success", "Connection request sent!");
      fetchConnections();
    }
  };

  const handleUpdateConnection = async (connId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('connections')
      .update({ status })
      .eq('id', connId);

    if (error) {
      Alert.alert("Error", `Failed to update request: ${error.message}`);
    } else {
      Alert.alert("Success", `Request ${status}.`);
      fetchConnections();
    }
  };

  const handleDeleteConnection = async (connId: string) => {
    if (profile?.active_connection_id === connId) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ active_connection_id: null, active_connection_name: "Self_Driving" })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        Alert.alert("Error", `Failed to update profile: ${error.message}`);
        return;
      }

      setProfile(data);
    }

    const { error: deleteError } = await supabase
      .from('connections')
      .delete()
      .eq('id', connId);

    if (deleteError) {
      Alert.alert("Error", `Failed to remove connection: ${deleteError.message}`);
    } else {
      Alert.alert("Success", "Connection removed.");
      fetchConnections();
    }
  };

  const incomingRequests = useMemo(() => {
    if (!profile) return [];
    const oppositeRole = profile.role === 'driver' ? 'restaurant' : 'driver';
    return connections.filter(conn => conn.status === 'pending' && conn.invited_by === oppositeRole);
  }, [connections, profile]);

  const outgoingRequests = useMemo(() => {
    if (!profile) return [];
    return connections.filter(conn => conn.status === 'pending' && conn.invited_by === profile.role);
  }, [connections, profile]);

  const acceptedConnections = useMemo(() => {
    return connections.filter(conn => conn.status === 'accepted');
  }, [connections]);

  const isConnectedOrPending = (id: string) => {
    return connections.some(conn =>
      (conn.driver_id === id || conn.restaurant_id === id)
    );
  };

  const openConnectionModal = async (connection: Connection) => {
    setModalLoading(true);
    setIsModalVisible(true);
    setSelectedConnection(connection);

    const connectedId = profile?.role === 'driver' ? connection.restaurant_id : connection.driver_id;
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        name, phone, email, role,
        house_number, street, town, postcode, country
      `)
      .eq('id', connectedId)
      .single();

    if (error) {
      Alert.alert("Error", `Failed to fetch profile: ${error.message}`);
      setConnectedProfile(null);
    } else {
      setConnectedProfile(data as Profile);
    }
    setModalLoading(false);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedConnection(null);
    setConnectedProfile(null);
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading && !searchQuery && connections.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: color.primary_bg }]}>
        <ActivityIndicator size="large" color={color.text} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: color.primary_bg }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.contentContainer}>
          <View style={styles.headerContainer}>
            <UIText type="title" style={styles.header}>Connections</UIText>
            <UIButton
              label="Reload"
              type='tag'
              onPress={fetchConnections}
              style={{ backgroundColor: color.btn, paddingHorizontal: 20, paddingVertical: 10 }}
            />
          </View>
          <LineBreak height={20} />

          {/* --- Search Section --- */}
          <View style={[styles.card, { backgroundColor: color.white }]}>
            <UIText type="semiBold" style={{ marginBottom: 10 }}>Find New Connections</UIText>
            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.searchInput, { color: color.text, borderColor: color.border, backgroundColor: color.second_bg }]}
                placeholder={`Search for ${profile?.role === 'driver' ? 'restaurants' : 'drivers'}...`}
                placeholderTextColor={color.text_light}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <LineBreak height={10} />
            {loading && searchQuery ? (
              <ActivityIndicator size="small" color={color.text} style={{ marginTop: 10 }} />
            ) : searchResults.length > 0 ? (
              searchResults.map(result => (
                <View key={result.id} style={[styles.resultCard, { backgroundColor: color.second_bg }]}>
                  <View>
                    <UIText type="semiBold">{result.name}</UIText>
                    <UIText type="base" style={{ color: color.text_light }}>{result.role}</UIText>
                  </View>
                  {!isConnectedOrPending(result.id) && (
                    <UIButton
                      label="Send Request"
                      onPress={() => handleSendRequest(result.id)}
                      style={{ backgroundColor: color.success, paddingHorizontal: 15 }}
                      textStyle={{ fontSize: 14 }}
                    />
                  )}
                  {isConnectedOrPending(result.id) && (
                    <UIText style={{ color: color.text_light }}>Request Sent</UIText>
                  )}
                </View>
              ))
            ) : searchQuery ? (
              <UIText style={{ color: color.text_light }}>No results found.</UIText>
            ) : null}
          </View>

          {/* --- Incoming Requests Section --- */}
          <LineBreak height={20} />
          <UIText type="semiBold" style={styles.sectionHeader}>Incoming Requests ({incomingRequests.length})</UIText>
          {incomingRequests.length > 0 ? (
            incomingRequests.map(conn => (
              <View key={conn.id} style={[styles.card, { backgroundColor: color.white }]}>
                <UIText type="base" style={{ marginBottom: 10 }}>Request from: <UIText type="semiBold">{profile?.role === 'driver' ? conn.restaurant_name : conn.driver_name}</UIText></UIText>
                <View style={styles.buttonGroup}>
                  <UIButton
                    label="Accept"
                    onPress={() => handleUpdateConnection(conn.id, 'accepted')}
                    style={{ backgroundColor: color.success, flex: 1 }}
                  />
                  <UIButton
                    label="Reject"
                    onPress={() => handleUpdateConnection(conn.id, 'declined')}
                    style={{ backgroundColor: color.error, flex: 1 }}
                  />
                </View>
              </View>
            ))
          ) : (
            <UIText style={[styles.noDataText, { color: color.text_light }]}>No incoming requests.</UIText>
          )}

          {/* --- Outgoing Requests Section --- */}
          <LineBreak height={20} />
          <UIText type="semiBold" style={styles.sectionHeader}>Outgoing Requests ({outgoingRequests.length})</UIText>
          {outgoingRequests.length > 0 ? (
            outgoingRequests.map(conn => (
              <View key={conn.id} style={[styles.card, { backgroundColor: color.white }]}>
                <UIText type="base">Request to: <UIText type="semiBold">{profile?.role === 'driver' ? conn.restaurant_name : conn.driver_name}</UIText></UIText>
                <UIButton
                  label="Cancel"
                  style={{ backgroundColor: color.border, marginTop: 10 }}
                  onPress={() => handleDeleteConnection(conn.id)}
                />
              </View>
            ))
          ) : (
            <UIText style={[styles.noDataText, { color: color.text_light }]}>No outgoing requests.</UIText>
          )}

          {/* --- Accepted Connections Section --- */}
          <LineBreak height={20} />
          <UIText type="semiBold" style={styles.sectionHeader}>Your Connections ({acceptedConnections.length})</UIText>
          {acceptedConnections.length > 0 ? (
            acceptedConnections.map(conn => (
              <TouchableOpacity key={conn.id} onPress={() => openConnectionModal(conn)} style={[styles.cardWithButton, { backgroundColor: color.white }]}>
                <View style={styles.connectionDetails}>
                  <UIText type="semiBold">
                    {profile?.role === 'driver' ? conn.restaurant_name : conn.driver_name}
                  </UIText>
                  <View style={{ flexDirection: 'row', gap: 15, flexWrap: 'wrap', marginTop: 5 }}>
                    <UIText type="base" style={{ fontSize: 16, color: color.btn }}>£{conn.hourly_rate} / hour</UIText>
                    <UIText type="base" style={{ fontSize: 16, color: color.text_light }}>Connected: {formatDateTime(conn.created_at)}</UIText>
                  </View>
                </View>
                <UIButton
                  label="Disconnect"
                  onPress={() => handleDeleteConnection(conn.id)}
                  style={{ backgroundColor: color.error, width: 120 }}
                  textStyle={{ fontSize: 14 }}
                />
              </TouchableOpacity>
            ))
          ) : (
            <UIText style={[styles.noDataText, { color: color.text_light }]}>You have no active connections.</UIText>
          )}

          <LineBreak height={50} />
        </View>
      </ScrollView>
      {selectedConnection && (
        <UIModal
          title={connectedProfile?.name || "Connection Details"}
          isVisible={isModalVisible}
          onClose={closeModal}
        >
          {modalLoading ? (
            <ActivityIndicator size="large" color={color.text} />
          ) : connectedProfile && selectedConnection ? (
            <View style={{ flexDirection: "column", gap: 10 }}>
              <LineBreak height={20} />
              <UIText type="subtitle">{connectedProfile.name}</UIText>
              <UIText type="base" style={{ color: color.text_light }}>{connectedProfile.role}</UIText>
              <LineBreak />
              <View style={modalStyles.row}>
                <UIText type="semiBold">Hourly Rate</UIText>
                <UIText>£{selectedConnection.hourly_rate}</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Mileage Rate</UIText>
                <UIText>£{selectedConnection.mileage_rate}/mile</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Connected Since</UIText>
                <UIText>{formatDateTime(selectedConnection.created_at)}</UIText>
              </View>
              <LineBreak />
              <View style={modalStyles.row}>
                <UIText type="semiBold">Email</UIText>
                <UIText>{connectedProfile.email}</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Phone</UIText>
                <UIText>{connectedProfile.phone}</UIText>
              </View>
              <LineBreak />
              <View style={modalStyles.row}>
                <UIText type="semiBold">Address</UIText>
                <UIText>{connectedProfile.house_number} {connectedProfile.street}</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Town</UIText>
                <UIText>{connectedProfile.town}</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Postcode</UIText>
                <UIText>{connectedProfile.postcode}</UIText>
              </View>
              <View style={modalStyles.row}>
                <UIText type="semiBold">Country</UIText>
                <UIText>{connectedProfile.country}</UIText>
              </View>
              <LineBreak />
              <View style={modalStyles.buttonRow}>
                <UIButton
                  label="Close"
                  onPress={closeModal}
                  type="normal"
                  style={{ flex: 1 }}
                />
                <UIButton
                  label="Disconnect"
                  onPress={() => {
                    closeModal();
                    handleDeleteConnection(selectedConnection.id);
                  }}
                  type="normal"
                  style={{ flex: 1, backgroundColor: color.error }}
                />
              </View>
            </View>
          ) : (
            <UIText>Failed to load profile details.</UIText>
          )}
        </UIModal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    paddingLeft: 5,
  },
  sectionHeader: {
    paddingLeft: 5,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  card: {
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 5,
  },
  cardWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 5,
  },
  connectionDetails: {
    flex: 1,
    marginRight: 10,
  },
  resultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  noDataText: {
    paddingLeft: 5,
    marginTop: 0,
  },
});

const modalStyles = StyleSheet.create({
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