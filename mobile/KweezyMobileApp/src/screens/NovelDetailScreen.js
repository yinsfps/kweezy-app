import React, { useState, useEffect, useContext, useCallback } from 'react'; // Import useCallback
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Button } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
import { AppContext } from '../context/AppContext';
// Import API_BASE_URL along with the fetch function
import { fetchNovelDetails as apiFetchNovelDetails, API_BASE_URL } from '../api';

const NovelDetailScreen = ({ route, navigation }) => {
  // Use bookId and bookTitle from route params
  const { bookId, bookTitle } = route.params;
  const { theme, userToken } = useContext(AppContext);
  const [novel, setNovel] = useState(null); // Internal variable name remains unchanged
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastReadInfo, setLastReadInfo] = useState(null); // State for { chapterId, chapterNumber }

  // Function to check local storage for last read chapter
  const checkLastRead = useCallback(async () => {
      // Only check if book data (with chapters) is loaded and user is logged in
      if (novel?.chapters && novel.chapters.length > 0 && userToken) { // Internal variable name remains unchanged
          let latestChapterId = null;
          let latestChapterNumber = -1;
          // Use bookId in the storage key
          const chapterKeys = novel.chapters.map(ch => `scrollPos_novel_${bookId}_chapter_${ch.id}`);
          try {
              const storedPositions = await AsyncStorage.multiGet(chapterKeys);
              storedPositions.forEach(([key, value], index) => {
                  if (value !== null) { // If a position is saved for this chapter
                      const chapter = novel.chapters[index];
                      // Track the chapter with the highest number that has a saved position
                      if (chapter.chapterNumber > latestChapterNumber) {
                          latestChapterNumber = chapter.chapterNumber;
                          latestChapterId = chapter.id;
                      }
                  }
              });
              if (latestChapterId) {
                  console.log(`Focus Check: Found latest read chapter locally: ${latestChapterId} (Number: ${latestChapterNumber})`);
                  setLastReadInfo({ chapterId: latestChapterId, chapterNumber: latestChapterNumber });
              } else {
                  console.log("Focus Check: No local scroll positions found for this book."); // Changed log message
                  setLastReadInfo(null); // Ensure it's null if nothing found
              }
          } catch (e) {
              console.error("Focus Check: Error reading local scroll positions:", e);
              setLastReadInfo(null); // Reset on error
          }
      } else {
          setLastReadInfo(null); // Reset if not logged in or no chapters
      }
  }, [novel, bookId, userToken]); // Dependencies for the check function - Use bookId

  // Fetch basic book details on initial load
  useEffect(() => {
    const loadNovelDetails = async () => { // Function name remains unchanged internally
      console.log(`NovelDetailScreen: Loading details for bookId: ${bookId} (User token: ${userToken ? 'present' : 'absent'})`); // Changed log message
      // REMOVED the block that prevented fetching when logged out.
      // Now it will always try to fetch.
      try {
        setLoading(true); // Start loading indicator
        setError(null);
        // Fetch details - assume this endpoint gives title, desc, chapters etc.
        // We will ignore the userProgress part it might return for now.
        const data = await apiFetchNovelDetails(bookId); // Use bookId
        console.log("NovelDetailScreen: Fetched data:", data ? "Data received" : "No data");
        if (data) {
          setNovel(data); // Internal variable name remains unchanged
          navigation.setOptions({
            title: data.title || 'Book Details', // Changed default title
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            headerTitleStyle: { color: theme.text, fontWeight: '600' },
          });
        } else {
          console.log("NovelDetailScreen: No data received from API.");
          setError('Failed to load book details.'); // Changed error message
        }
      } catch (err) {
        console.error("NovelDetailScreen: Error fetching details:", err);
        setError('An error occurred while loading book details.'); // Changed error message
      } finally {
        console.log("NovelDetailScreen: Setting loading to false.");
        setLoading(false);
      }
    };
    loadNovelDetails();
  }, [bookId, navigation, theme, userToken]); // Use bookId dependency, add userToken dependency

  // Use useFocusEffect to check local storage whenever the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log("NovelDetailScreen focused, checking last read...");
      checkLastRead();
      return () => {
          console.log("NovelDetailScreen unfocused");
      };
    }, [checkLastRead]) // Depend on the memoized checkLastRead function
  );

  const styles = createThemedStyles(theme);

  // Navigate to the last read chapter and position (reading from AsyncStorage)
  const handleContinueReading = async () => {
      if (!lastReadInfo?.chapterId) return; // Use state variable
      // Use bookId in storage key
      const key = `scrollPos_novel_${bookId}_chapter_${lastReadInfo.chapterId}`;
      let scrollY = 0;
      try {
          const savedScrollY = await AsyncStorage.getItem(key);
          if (savedScrollY !== null) {
              scrollY = JSON.parse(savedScrollY);
          }
          console.log(`Read local scroll for continue: Key: ${key}, Y: ${scrollY}`);
      } catch (e) {
          console.error("Failed to read local scroll position for continue:", e);
      }
      navigation.navigate('ChapterReader', {
          novelId: novel.id,
          chapterId: lastReadInfo.chapterId,
          chapterTitle: `Chapter ${lastReadInfo.chapterNumber || '?'}`, // Use state variable
          initialScrollY: scrollY
      });
  };

  // Navigate to a specific chapter from the list (reading from AsyncStorage)
  const handleChapterPress = async (item) => {
      // Use bookId in storage key
      const key = `scrollPos_novel_${bookId}_chapter_${item.id}`;
      let scrollY = 0;
      try {
          const savedScrollY = await AsyncStorage.getItem(key);
          if (savedScrollY !== null) {
              scrollY = JSON.parse(savedScrollY);
          }
          console.log(`Read local scroll for chapter ${item.id}: Key: ${key}, Y: ${scrollY}`);
      } catch (e) {
          console.error(`Failed to read local scroll position for chapter ${item.id}:`, e);
      }
      navigation.navigate('ChapterReader', {
          novelId: novel.id,
          chapterId: item.id,
          chapterTitle: item.title,
          initialScrollY: scrollY // Pass saved scrollY or 0
      });
  };

  const renderChapterItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chapterItem}
      onPress={() => handleChapterPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.chapterNumber}>Chapter {item.chapterNumber}</Text>
      <Text style={styles.chapterTitle} numberOfLines={1}>{item.title}</Text>
       <Icon name="chevron-right" size={26} color={theme.textSecondary} style={styles.chevron} />
    </TouchableOpacity>
  );

  if (loading) { return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>; }
  if (error || !novel) { return <View style={[styles.centered, { backgroundColor: theme.background }]}><Text style={styles.errorText}>{error || 'Book not found.'}</Text></View>; } // Changed text

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.coverImageContainer}>
          {/* Conditionally render Image or Placeholder */}
          {novel.coverImageUrl ? (
              <Image
                  // Construct URL using the base from api.js (stripping '/api') and the relative path
                  source={{ uri: `${API_BASE_URL.replace('/api', '')}/public${novel.coverImageUrl}` }}
                  style={styles.coverImage}
                  resizeMode="cover" // Or 'contain' depending on desired look
              />
          ) : (
              <View style={styles.coverImagePlaceholder}>
                 <Icon name="book-open-variant" size={100} color={theme.text + '50'} />
              </View>
          )}
      </View>

      <View style={styles.contentPadding}>
          <Text style={styles.title}>{novel.title}</Text>
          <Text style={styles.author}>by {novel.authorName || 'Kweezy'}</Text>
          <View style={styles.separator} />
          <Text style={styles.description}>{novel.description}</Text>

          {/* Continue Reading Button - Use local state */}
          {lastReadInfo && (
              <TouchableOpacity style={styles.continueButton} onPress={handleContinueReading}>
                  <Icon name="play-circle-outline" size={20} color={theme.background} style={{ marginRight: 8 }}/>
                  <Text style={styles.continueButtonText}>
                      Continue Reading: Chapter {lastReadInfo.chapterNumber || '?'}
                  </Text>
              </TouchableOpacity>
          )}

          <Text style={styles.chaptersHeader}>Chapters</Text>
          {novel.chapters && novel.chapters.length > 0 ? (
              novel.chapters.map((item, index) => (
                  <View key={item.id}>
                      {renderChapterItem({ item })}
                  </View>
              ))
          ) : (
              <Text style={styles.emptyText}>No chapters available.</Text>
          )}
      </View>
    </ScrollView>
  );
};

const createThemedStyles = (theme) => StyleSheet.create({
  container: { flex: 1, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  coverImageContainer: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 15, },
  // Style for the actual image
  coverImage: { width: 160, height: 240, borderRadius: 8, resizeMode: 'cover', },
  // Placeholder style remains the same
  coverImagePlaceholder: { width: 160, height: 240, backgroundColor: theme.card, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border + '80', elevation: 4, shadowColor: theme.themeName === 'dark' ? '#000' : '#555', shadowOffset: { width: 0, height: 4 }, shadowOpacity: theme.themeName === 'dark' ? 0.4 : 0.15, shadowRadius: 6, },
  contentPadding: { paddingHorizontal: 20, paddingBottom: 30, },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 8, color: theme.text, textAlign: 'center', },
  author: { fontSize: 16, color: theme.textSecondary, marginBottom: 25, textAlign: 'center', },
  separator: { height: 1, backgroundColor: theme.border, width: '60%', alignSelf: 'center', marginBottom: 25, },
  description: { fontSize: 16, lineHeight: 24, marginBottom: 25, color: theme.text, textAlign: 'left', },
  continueButton: {
      flexDirection: 'row', backgroundColor: theme.primary, paddingVertical: 12, paddingHorizontal: 20,
      borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 30, elevation: 2,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2,
  },
  continueButtonText: { color: theme.background, fontSize: 16, fontWeight: '600', },
  chaptersHeader: { fontSize: 20, fontWeight: '600', marginBottom: 5, paddingTop: 10, color: theme.text, },
  chapterItem: { flexDirection: 'row', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.border, alignItems: 'center', },
  chapterNumber: { fontSize: 15, marginRight: 15, color: theme.textSecondary, minWidth: 70, fontWeight: '500', },
  chapterTitle: { flex: 1, fontSize: 16, color: theme.text, fontWeight: '500', marginRight: 8, },
  chevron: { opacity: 0.6, },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 14, color: theme.textSecondary, paddingBottom: 20, },
  errorText: { color: 'red', textAlign: 'center', fontSize: 16, }
});

export default NovelDetailScreen;
