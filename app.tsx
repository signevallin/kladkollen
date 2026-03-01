import { useEffect, useState } from 'react'
import {
    FlatList,
    SafeAreaView,
    StyleSheet, Text,
    TouchableOpacity,
    View
} from 'react-native'
import { supabase } from './supabase'

export default function App() {
  const [garments, setGarments] = useState([])

  useEffect(() => {
    fetchGarments()
  }, [])

  async function fetchGarments() {
    const { data, error } = await supabase
      .from('garments')
      .select('*')
    if (data) setGarments(data)
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>KLÄDKOLLEN</Text>
        <Text style={styles.subtitle}>min garderob</Text>
      </View>

      {/* Garderob */}
      <FlatList
        data={garments}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Din garderob är tom!{'\n'}Lägg till ditt första plagg 🍒
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category}</Text>
          </View>
        )}
      />

      {/* Lägg till-knapp */}
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Lägg till plagg</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#150408',
  },
  header: {
    padding: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FBF3EF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#C4737A',
    marginTop: 2,
  },
  grid: {
    padding: 16,
  },
  item: {
    flex: 1,
    margin: 6,
    backgroundColor: 'rgba(122,24,40,0.4)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,115,122,0.2)',
  },
  itemName: {
    color: '#FBF3EF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  itemCategory: {
    color: '#C4737A',
    fontSize: 10,
    marginTop: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#C4737A',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
  },
  addButton: {
    margin: 16,
    backgroundColor: '#9E2035',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FBF3EF',
    fontSize: 16,
    fontWeight: '600',
  },
})

