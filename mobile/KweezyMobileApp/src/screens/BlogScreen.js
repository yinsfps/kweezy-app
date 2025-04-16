import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Import icons
import { fetchBlogPosts } from '../api';
import { AppContext } from '../context/AppContext';

const BlogScreen = ({ navigation }) => {
  const { theme } = useContext(AppContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const loadPosts = useCallback(async (pageNum = 1, isRefreshing = false) => {
    if (!isRefreshing && pageNum === 1) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchBlogPosts(pageNum);
      // Add check for data and data.posts
      if (data && data.posts) {
          setPosts(prevPosts => pageNum === 1 ? data.posts : [...prevPosts, ...data.posts]);
          setTotalPages(data.totalPages || 1); // Default totalPages to 1 if undefined
          setPage(pageNum);
      } else {
          // Handle case where data is not as expected (e.g., API error)
          console.warn("Received unexpected data structure from fetchBlogPosts:", data);
          setError('Failed to load blog posts (invalid data).');
          // Optionally clear posts if pageNum is 1
          if (pageNum === 1) setPosts([]);
      }
    } catch (err) {
      setError('Failed to load blog posts.');
      console.error(err);
    } finally {
       if (!isRefreshing && pageNum === 1) {
         setLoading(false);
       }
    }
  }, []);

  useEffect(() => {
    // Apply theme to header
    navigation.setOptions({
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
    });
    loadPosts(1); // Load initial posts on mount
  }, [loadPosts, navigation, theme]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts(1, true).finally(() => setRefreshing(false));
  }, [loadPosts]);

  const handleLoadMore = () => {
    if (page < totalPages && !loading && !refreshing) {
      loadPosts(page + 1);
    }
  };

  // Create themed styles dynamically
  const styles = createThemedStyles(theme);

  const renderItem = ({ item }) => (
    <View style={styles.postItem}>
      {/* TODO: Add optional image for blog posts? */}
      <Text style={styles.postTitle}>{item.title}</Text>
      <View style={styles.metaContainer}>
        <Icon name="account-outline" size={14} color={theme.text + 'aa'} />
        <Text style={styles.postAuthor}> {item.author?.username || 'Admin'}</Text>
        <Icon name="calendar-blank-outline" size={14} color={theme.text + 'aa'} style={{marginLeft: 10}}/>
        <Text style={styles.postDate}>
           {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Draft'}
        </Text>
      </View>
      {/* Display excerpt or full content depending on design */}
      <Text style={styles.postExcerpt}>{item.content}</Text>
      {/* TODO: Add navigation to a BlogPostDetailScreen later if needed */}
      {/* <TouchableOpacity onPress={() => navigation.navigate('BlogPostDetail', { postId: item.id })}>
          <Text style={styles.readMore}>Read More</Text>
      </TouchableOpacity> */}
    </View>
  );

  const renderFooter = () => {
    if (loading && page > 1 && !refreshing) {
        return <ActivityIndicator style={{ marginVertical: 20 }} color={theme.primary} />;
    }
    return null;
  };

  if (loading && page === 1 && !refreshing) {
    return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  if (error && posts.length === 0) {
    return <View style={[styles.centered, { backgroundColor: theme.background }]}><Text style={styles.errorText}>{error}</Text></View>;
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={<View style={styles.centered}><Text style={styles.emptyText}>No blog posts found.</Text></View>}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
        />
      }
    />
  );
};

// Function to create themed styles
const createThemedStyles = (theme) => StyleSheet.create({
  listContainer: {
    padding: 15, // More padding
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  postItem: {
    backgroundColor: theme.card,
    padding: 20, // More padding
    marginBottom: 15, // More margin
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postTitle: {
    fontSize: 20, // Larger title
    fontWeight: '600',
    marginBottom: 8, // More space
    color: theme.text,
  },
  metaContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      opacity: 0.8,
  },
  postAuthor: {
    fontSize: 13,
    color: theme.text + 'aa',
  },
  postDate: {
    fontSize: 13,
    color: theme.text + 'aa',
  },
  postExcerpt: {
    fontSize: 15, // Slightly larger excerpt
    color: theme.text,
    lineHeight: 22, // Better line height
    marginBottom: 8,
  },
  readMore: {
      color: theme.primary,
      fontWeight: '600',
      marginTop: 10,
  },
  emptyText: {
      color: theme.text + '80',
      textAlign: 'center',
      marginTop: 50,
  },
  errorText: {
      color: 'red',
      textAlign: 'center',
  }
});

export default BlogScreen;
