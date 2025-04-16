import React, { useState, useEffect, useContext } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppContext } from '../context/AppContext';
// Import API_BASE_URL as well
import { fetchNovels as apiFetchNovels, API_BASE_URL } from '../api';

const NovelListScreen = ({ navigation }) => {
  const { theme } = useContext(AppContext);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNovels = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetchNovels();
        setNovels(data); // Variable name remains unchanged internally
      } catch (err) {
        setError('Failed to load books.'); // Changed error message
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadNovels();
  }, []);

  // Header options are now controlled by the Tab Navigator screen options
  // We can remove the useLayoutEffect here if header is consistent
  /* React.useLayoutEffect(() => {
    navigation.setOptions({
        // Options moved to Tab.Screen definition in AppNavigator.js
    });
  }, [navigation, theme]); */


  const styles = createThemedStyles(theme);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      // Pass 'bookId' and 'bookTitle' to the detail screen route params
      onPress={() => navigation.navigate('NovelDetail', { bookId: item.id, bookTitle: item.title })}
      activeOpacity={0.8} // Slightly more feedback
    >
      {/* Conditionally render Image or Placeholder */}
      {item.coverImageUrl ? (
          <Image
              source={{ uri: `${API_BASE_URL.replace('/api', '')}/public${item.coverImageUrl}` }}
              style={styles.coverImage} // Use a new style for the image
              resizeMode="cover"
          />
      ) : (
          <View style={styles.coverImagePlaceholder}>
             <Icon name="image-size-select-actual" size={30} color={theme.textSecondary + '90'} />
          </View>
      )}
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.itemAuthor} numberOfLines={1}>by {item.authorName || 'Kweezy'}</Text>
        <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description || 'No description available.'}
        </Text>
      </View>
       <Icon name="chevron-right" size={26} color={theme.textSecondary} style={styles.chevron} />
    </TouchableOpacity>
  );

  // Remove loading indicator display
  // if (loading) {
  //   return <View style={[styles.centered, { backgroundColor: theme.novelListBackground }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  // }

  if (error && novels.length === 0) { // Show error only if list is empty
    return <View style={[styles.centered, { backgroundColor: theme.novelListBackground }]}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    // Use the specific novelListBackground from the theme
    <View style={[styles.container, { backgroundColor: theme.novelListBackground }]}>
      <FlatList
        data={novels} // Variable name remains unchanged internally
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>No books found.</Text>} // Changed text
        contentContainerStyle={styles.listContentContainer}
      />
    </View>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
      paddingVertical: 16, // More vertical padding
      paddingHorizontal: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16, // Consistent padding
    marginBottom: 16, // More spacing
    backgroundColor: theme.card,
    borderRadius: 12, // More rounded
    // Refined shadow based on theme
    shadowColor: theme.themeName === 'dark' ? '#000' : '#444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme.themeName === 'dark' ? 0.3 : 0.1,
    shadowRadius: 5,
    elevation: 4, // Slightly more elevation
  },
  // Style for the actual cover image in the list
  coverImage: {
      width: 60,
      height: 85,
      borderRadius: 8,
      marginRight: 16,
      backgroundColor: theme.border + '20', // Add a subtle background for loading/error
  },
  coverImagePlaceholder: {
      width: 60,
      height: 85,
      backgroundColor: theme.border + '40',
      borderRadius: 8,
      marginRight: 16, // More spacing
      justifyContent: 'center',
      alignItems: 'center',
  },
  itemTextContainer: {
      flex: 1,
      justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '600', // Semi-bold
    color: theme.text,
    marginBottom: 4, // Adjust spacing
  },
  itemAuthor: {
    fontSize: 14,
    color: theme.textSecondary, // Use secondary text color
    marginBottom: 6, // Adjust spacing
  },
  itemDescription: {
      fontSize: 14,
      color: theme.textSecondary, // Use secondary text color
      lineHeight: 20, // Adjust line height
  },
  chevron: {
      marginLeft: 10, // Adjust spacing
      opacity: 0.5, // More subtle chevron
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: theme.textSecondary, // Use secondary text color
  },
  errorText: {
      color: 'red',
      textAlign: 'center',
      fontSize: 16,
  }
});

export default NovelListScreen;
