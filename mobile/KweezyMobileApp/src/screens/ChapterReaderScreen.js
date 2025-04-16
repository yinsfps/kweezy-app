import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, // Ensure FlatList is imported
  TextInput, Button, Alert, KeyboardAvoidingView, Platform,
  Pressable,
  ScrollView,
  LayoutAnimation,
  UIManager
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import {
    fetchChapterSegments, fetchCommentsForSegment, postComment,
    fetchReactionsForSegment, toggleReaction, toggleCommentLike,
    updateUserNovelProgress // Add back progress update function
} from '../api';
import { AppContext } from '../context/AppContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
const ESTIMATED_ITEM_HEIGHT = 150; // Adjust this value based on average item size if needed

// --- Comment Section Component ---
// (Stable version)
const CommentSection = ({ segmentId, theme, isLoggedIn, navigation, reactionCounts, handleToggleReaction, initialComments = [] }) => {
  const styles = createThemedStyles(theme);
  const [comments, setComments] = useState(initialComments);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(initialComments.length > 0);

  const loadComments = useCallback(async (page = 1, appending = false) => {
    if (!segmentId) return;
    if (appending && loadingMore) return;
    if (!appending) setLoadingComments(true); else setLoadingMore(true);
    try {
      const commentsData = await fetchCommentsForSegment(segmentId, page);
      if (appending) setComments(prev => [...prev, ...(commentsData.comments || [])]);
      else setComments(commentsData.comments || []);
      setCurrentPage(commentsData.currentPage || 1);
      setTotalPages(commentsData.totalPages || 1);
      setInitialLoadComplete(true);
    } catch (err) { console.error("Failed load comments:", err); Alert.alert("Error", "Could not load comments."); }
    finally { setLoadingComments(false); setLoadingMore(false); }
  }, [segmentId, loadingMore]);

  useEffect(() => {
    if (initialComments.length === 0) {
        loadComments(1);
    } else {
      setLoadingComments(false);
      fetchCommentsForSegment(segmentId, 1)
          .then(data => setTotalPages(data.totalPages || 1))
          .catch(err => console.error("Failed fetch page count:", err));
    }
  }, [loadComments, initialComments]);

  const handlePostComment = async () => {
    if (!newCommentText.trim() || !segmentId) return;
    if (!isLoggedIn) { Alert.alert("Login Required", "..."); navigation.navigate('Login'); return; }
    setPostingComment(true);
    try {
      const response = await postComment(segmentId, newCommentText);
      if (!response.ok) { throw new Error('Failed to post comment.'); }
      setNewCommentText('');
      loadComments(1);
    } catch (err) { Alert.alert("Error", err.message || "Could not post comment."); }
    finally { setPostingComment(false); }
  };

  const handleToggleCommentLike = async (commentId) => {
      if (!isLoggedIn) { Alert.alert("Login Required", "..."); navigation.navigate('Login'); return; }
      const originalComments = [...comments];
      setComments(prevComments =>
          prevComments.map(comment => {
              if (comment.id === commentId) {
                  const liked = !comment.likedByCurrentUser;
                  const likeCount = liked ? (comment.likeCount || 0) + 1 : (comment.likeCount || 0) - 1;
                  return { ...comment, likedByCurrentUser: liked, likeCount: Math.max(0, likeCount) };
              }
              return comment;
          })
      );
      try {
          const response = await toggleCommentLike(commentId);
          if (!response.ok) { setComments(originalComments); loadComments(1); throw new Error('Failed to toggle comment like.'); }
      } catch (error) { setComments(originalComments); loadComments(1); console.error(`Error toggling like:`, error); Alert.alert("Error", "Could not update like."); }
  };

  const handleLoadMoreComments = () => {
      if (!loadingMore && !loadingComments && currentPage < totalPages) {
          loadComments(currentPage + 1, true);
      }
  };

  const isCloseToBottom = ({layoutMeasurement, contentOffset, contentSize}) => {
    const paddingToBottom = 50;
    if (contentSize.height < layoutMeasurement.height) return false;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  const reactionTypes = [
      { type: 'heart', emoji: '❤️' }, { type: 'fire', emoji: '🔥' },
      { type: 'surprise', emoji: '😱' }, { type: 'cry', emoji: '😭' },
      { type: 'angry', emoji: '😠' }, // Added angry emoji
  ];

  return (
    <View style={styles.commentSectionContainer}>
        {/* Reaction bar is now the first element inside the container */}
        <View style={styles.reactionBar}>
            {reactionTypes.map(({ type, emoji }) => (
                <TouchableOpacity key={type} style={styles.reactionButton} onPress={() => handleToggleReaction(segmentId, type)}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    <Text style={styles.reactionCount}>{reactionCounts?.[type] || 0}</Text>
                </TouchableOpacity>
            ))}
        </View>
        {/* ScrollView follows the reaction bar */}
        <ScrollView style={styles.commentList} nestedScrollEnabled={true}
            onScroll={({nativeEvent}) => { if (isCloseToBottom(nativeEvent)) { handleLoadMoreComments(); } }}
            scrollEventThrottle={400} >
            {loadingComments && comments.length === 0 ? ( <View style={styles.commentLoaderContainer}><ActivityIndicator color={theme.primary} /></View> )
             : ( comments.map(item => (
                    <View key={`comment-${item.id}`} style={styles.commentItem}>
                        <View style={styles.commentContentContainer}>
                            <Text style={styles.commentTextInline}>
                                <Text style={[styles.commentUser, { color: item.user?.usernameColor || theme.primary }]}>
                                    {item.user?.username || 'User'}: </Text>
                                {item.commentText}
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.commentLikeButton} onPress={() => handleToggleCommentLike(item.id)}>
                            <Icon name={item.likedByCurrentUser ? "heart" : "heart-outline"} size={18} color={item.likedByCurrentUser ? theme.primary : theme.textSecondary} />
                            <Text style={[styles.commentLikeCount, { color: item.likedByCurrentUser ? theme.primary : theme.textSecondary }]}>{item.likeCount || 0}</Text>
                        </TouchableOpacity>
                    </View>
                ))
             )}
            {loadingMore && <ActivityIndicator style={{ marginVertical: 10 }} color={theme.primary} />}
        </ScrollView>
        {isLoggedIn && ( <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
             <View style={styles.commentInputContainer}>
                 <TextInput
                     style={[styles.commentInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                     placeholder="Add a comment..." placeholderTextColor={theme.text + '80'}
                     value={newCommentText} onChangeText={setNewCommentText} multiline
                 />
                 <Button title="Post" onPress={handlePostComment} disabled={postingComment || !newCommentText.trim()} color={theme.primary} />
             </View>
        </KeyboardAvoidingView> )}
        {!isLoggedIn && ( <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginPrompt, { color: theme.primary }]}>Please log in to comment.</Text>
        </TouchableOpacity> )}
    </View>
  );
};


// --- Main Chapter Reader Screen ---
const ChapterReaderScreen = ({ route, navigation }) => {
  console.log("--- ChapterReaderScreen Mounted ---");
  // Removed initialScrollY from params
  const { chapterId, chapterTitle, novelId } = route.params;
  const { userToken, theme, currentFontSize, adjustFontSize, toggleTheme } = useContext(AppContext);
  const isLoggedIn = !!userToken;

  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reactionCounts, setReactionCounts] = useState({});
  const [expandedSegmentId, setExpandedSegmentId] = useState(null);
  const [allCommentsData, setAllCommentsData] = useState({});
  const [loadingAllComments, setLoadingAllComments] = useState(false);
  // Add refs for scroll tracking, saving interval, AND restoration
  const flatListRef = useRef(null); // Ref for FlatList instance
  const scrollY = useRef(0);
  const intervalRef = useRef(null);
  const hasScrolledRef = useRef(false); // To track if initial scroll happened

  // --- Scroll Position Saving Logic (Periodic) ---
  const handleScroll = (event) => {
      // ONLY update the ref, do not trigger save here
      scrollY.current = event.nativeEvent.contentOffset.y;
  };

  // Define saveScrollPosition outside useEffect for cleanup, but redefine inside for interval closure
  const saveScrollPosition = useCallback(async (currentScrollYValue) => {
      if (!novelId || !chapterId || currentScrollYValue < 0) return;
      const key = `scrollPos_novel_${novelId}_chapter_${chapterId}`;
      try {
          // console.log(`Saving local scroll periodically: Key: ${key}, Y: ${currentScrollYValue}`); // Optional: reduce logging noise
          await AsyncStorage.setItem(key, JSON.stringify(currentScrollYValue));
          if (isLoggedIn) {
              updateUserNovelProgress(novelId, chapterId, currentScrollYValue)
                  .catch(err => console.error("Background save scroll to backend failed:", err));
          }
      } catch (err) {
          console.error("Failed to save local scroll position:", err);
      }
  }, [novelId, chapterId, isLoggedIn]); // Added isLoggedIn dependency

  // Effect to set up periodic saving
  useEffect(() => {
      console.log("--- Running useEffect for scroll saving interval ---");

      // Define the save function *inside* the effect to capture current props/state
      const saveCurrentPosition = async () => {
          const currentScrollYValue = scrollY.current; // Read current value from ref
          if (!novelId || !chapterId || currentScrollYValue < 0) return;
          const key = `scrollPos_novel_${novelId}_chapter_${chapterId}`;
          try {
              console.log(`Saving local scroll periodically: Key: ${key}, Y: ${currentScrollYValue}`);
              await AsyncStorage.setItem(key, JSON.stringify(currentScrollYValue));
              if (isLoggedIn) {
                  updateUserNovelProgress(novelId, chapterId, currentScrollYValue)
                      .catch(err => console.error("Background save scroll to backend failed:", err));
              }
          } catch (err) {
              console.error("Failed to save local scroll position:", err);
          }
      };

      // Start interval when component mounts
      console.log("Setting up periodic scroll save interval (4 seconds)");
      intervalRef.current = setInterval(saveCurrentPosition, 4000); // Save every 4 seconds

      // Cleanup function to clear interval when component unmounts
      return () => {
          if (intervalRef.current) {
              console.log("Clearing periodic scroll save interval");
              clearInterval(intervalRef.current);
          }
          // Save one last time on unmount using the function defined outside
          console.log("Component unmounting, saving final scroll position.");
          // Need to call the outer saveScrollPosition for cleanup, as the inner one is out of scope
          // This might still have closure issues, but let's try
          const finalScrollY = scrollY.current;
          const finalKey = `scrollPos_novel_${novelId}_chapter_${chapterId}`;
           AsyncStorage.setItem(finalKey, JSON.stringify(finalScrollY)).catch(e => console.error("Error saving final scroll on unmount", e));
           if(isLoggedIn){
                updateUserNovelProgress(novelId, chapterId, finalScrollY).catch(e => console.error("Error saving final scroll to backend on unmount", e));
           }

      };
  // Dependencies now include props needed inside the effect's save function
  }, [novelId, chapterId, isLoggedIn]);


  // --- Data Loading ---
  React.useLayoutEffect(() => {
    let themeIconName = 'weather-sunny';
    if (theme.themeName === 'dark') themeIconName = 'moon-waning-crescent';
    else if (theme.themeName === 'oled') themeIconName = 'moon-full';

    navigation.setOptions({
        title: chapterTitle || 'Reader',
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text, fontWeight: '600' },
        headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={toggleTheme} style={{ paddingHorizontal: 10 }}>
                    <Icon name={themeIconName} size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={adjustFontSize} style={{ paddingLeft: 10, paddingRight: 15 }}>
                    <Icon name="format-font-size-increase" size={26} color={theme.text} />
                </TouchableOpacity>
            </View>
        ),
    });
  }, [navigation, theme, adjustFontSize, toggleTheme]);

  const preloadAllComments = async (segmentIds) => {
      if (!segmentIds || segmentIds.length === 0 || loadingAllComments) return;
      setLoadingAllComments(true);
      try {
          const segmentsToFetch = segmentIds.slice(0, 10);
          const commentPromises = segmentsToFetch.map(id =>
              fetchCommentsForSegment(id, 1).then(data => ({ segmentId: id, comments: data.comments || [] }))
          );
          const results = await Promise.all(commentPromises);
          const commentsMap = results.reduce((acc, result) => {
              acc[result.segmentId] = result.comments; return acc;
          }, {});
          setAllCommentsData(commentsMap);
      } catch (err) { console.error("Failed to preload comments:", err); }
      finally { setLoadingAllComments(false); }
  };

  // Reverted loadChapterData to simple version
  const loadChapterData = useCallback(async () => {
    setLoading(true); setError(null); setAllCommentsData({});
    try {
      console.log(`Fetching segments for chapter ${chapterId}...`);
      const segmentsData = await fetchChapterSegments(chapterId);
      console.log(`Fetched ${segmentsData?.length || 0} segments.`);
      setSegments(segmentsData || []);

      setLoading(false);
      console.log("Set loading to false after setting segments.");

      if (segmentsData && segmentsData.length > 0) {
          const segmentIds = segmentsData.map(s => s.id);
          fetchReactionsForAllSegments(segmentIds);
          preloadAllComments(segmentIds);
      } else {
          console.warn(`No segments found for chapter ${chapterId}`);
      }
    } catch (err) {
        console.error(`Error loading chapter data for ${chapterId}:`, err);
        setError('Failed to load chapter data.');
        setLoading(false);
    }
  }, [chapterId]);


  useEffect(() => { loadChapterData(); }, [loadChapterData]);

  const fetchReactionsForAllSegments = async (segmentIds) => {
      if (!segmentIds || segmentIds.length === 0) return;
      try {
          const reactionsPromises = segmentIds.map(id => fetchReactionsForSegment(id));
          const results = await Promise.all(reactionsPromises);
          const reactionsMap = segmentIds.reduce((acc, id, index) => {
              acc[id] = results[index] || {}; return acc;
          }, {});
          console.log("--- Reactions Map Fetched ---:", JSON.stringify(reactionsMap, null, 2)); // Log the fetched map
          setReactionCounts(reactionsMap);
      } catch (error) { console.error("Failed to fetch reactions:", error); }
  };

  const handleToggleReaction = async (segmentId, type) => {
      if (!isLoggedIn) { Alert.alert("Login Required", "..."); navigation.navigate('Login'); return; }
      const currentSegmentReactions = reactionCounts[segmentId] || {};
      const currentCount = currentSegmentReactions[type] || 0;
      const optimisticReactions = { ...reactionCounts, [segmentId]: { ...currentSegmentReactions, [type]: currentCount + 1 } };
      setReactionCounts(optimisticReactions);
      try {
          const response = await toggleReaction(segmentId, type);
          if (!response.ok) { setReactionCounts(reactionCounts); throw new Error('Failed reaction toggle'); }
          const updatedReactions = await fetchReactionsForSegment(segmentId);
          setReactionCounts(prev => ({...prev, [segmentId]: updatedReactions || {} }));
      } catch (error) { setReactionCounts(reactionCounts); console.error(`Error toggle reaction ${type}:`, error); Alert.alert("Error", "..."); }
  };
  const handleSegmentLongPress = (segmentId) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedSegmentId(currentId => currentId === segmentId ? null : segmentId); };
  const handleSegmentShortPress = () => { if (expandedSegmentId !== null) { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpandedSegmentId(null); } };

  const styles = createThemedStyles(theme, currentFontSize);

  // Function to handle initial scroll on content size change
  const handleContentSizeChange = (contentWidth, contentHeight) => {
      // Use initialScrollY from route.params directly
      // Need to get initialScrollY from route params again
      const { initialScrollY } = route.params;
      // Only scroll if initialScrollY is provided, we haven't scrolled yet, and ref exists
      if (initialScrollY > 0 && !hasScrolledRef.current && flatListRef.current) {
          // Check if content height is sufficient to scroll to the target
          if (contentHeight >= initialScrollY) {
              // Use a minimal timeout to ensure layout is truly complete
              const timer = setTimeout(() => {
                  if (flatListRef.current) { // Check ref again inside timeout
                     flatListRef.current.scrollToOffset({ offset: initialScrollY, animated: true });
                     console.log(`Attempted scroll to initial via onContentSizeChange: ${initialScrollY}`);
                     hasScrolledRef.current = true; // Mark as attempted
                  }
              }, 150); // Increased delay
              // No cleanup needed for this simple timeout as useEffect isn't used here
          } else {
              console.log(`Content size (${contentHeight}) too small for initial scroll (${initialScrollY}), scrolling to end.`);
              const timer = setTimeout(() => {
                  if (flatListRef.current) {
                      flatListRef.current.scrollToEnd({ animated: true });
                      hasScrolledRef.current = true;
                  }
              }, 150); // Increased delay
              // No cleanup needed
          }
      }
  };

  // Restore original renderSegment structure
  // Define reaction emojis map outside render function for efficiency
  const reactionEmojis = { heart: '❤️', fire: '🔥', surprise: '😱', cry: '😭', angry: '😠' }; // Added angry emoji

  const renderSegment = ({ item }) => {
    const segmentReactions = reactionCounts[item.id] || {};
    const hasReactions = Object.values(segmentReactions).some(count => count > 0);
    const showReactionPreview = expandedSegmentId !== null && item.id !== expandedSegmentId && hasReactions;

    // Add logging inside renderSegment
    console.log(`--- Render Segment ${item.id} ---`);
    console.log(`  Expanded ID: ${expandedSegmentId}`);
    console.log(`  Segment Reactions: ${JSON.stringify(segmentReactions)}`);
    console.log(`  Has Reactions: ${hasReactions}`);
    console.log(`  Show Preview: ${showReactionPreview}`);

    return (
        <View style={styles.segmentOuterContainer}>
            <Pressable onLongPress={() => handleSegmentLongPress(item.id)} onPress={handleSegmentShortPress}>
                <Text style={styles.segmentText}>{item.textContent || "[No Text Content]"}</Text>
            </Pressable>

            {/* Reaction Preview for OTHER segments when one is expanded */}
            {showReactionPreview && (() => {
                // Filter, Sort, and Calculate Opacity for previews
                const validReactions = Object.entries(segmentReactions)
                    .filter(([type, count]) => count > 0 && reactionEmojis[type]);

                const sortedReactions = validReactions.sort(([, countA], [, countB]) => countB - countA);

                // Take only the top 3 reactions for the preview
                const top3Reactions = sortedReactions.slice(0, 3);

                const maxOpacity = 0.8; // Opacity for rank 1
                const midOpacity = 0.55; // Opacity for rank 2
                const minOpacity = 0.3; // Opacity for rank 3

                return (
                    <View style={styles.reactionPreviewContainer}>
                        {top3Reactions.map(([type, count], index) => {
                            // Calculate opacity based on rank (0, 1, or 2)
                            let opacity;
                            if (index === 0) opacity = maxOpacity;
                            else if (index === 1) opacity = midOpacity;
                            else opacity = minOpacity; // index === 2

                            return (
                                <Text key={type} style={[styles.reactionPreviewText, { opacity }]}>
                                    {reactionEmojis[type]} {count}
                                </Text>
                            );
                        })}
                    </View>
                );
            })()}

            {/* Comment Section for the CURRENTLY expanded segment */}
            {expandedSegmentId === item.id && (
                <CommentSection
                    segmentId={item.id} theme={theme} isLoggedIn={isLoggedIn} navigation={navigation}
                reactionCounts={reactionCounts[item.id] || {}} handleToggleReaction={handleToggleReaction}
                initialComments={allCommentsData[item.id] || []}
            />
        )}
        </View>
    );
  };


  if (loading && segments.length === 0) { return <View style={[styles.centered, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>; }
  if (error && segments.length === 0) { return <View style={[styles.centered, { backgroundColor: theme.background }]}><Text style={styles.errorText}>{error}</Text></View>; }

  // Revert to FlatList
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} >
        <FlatList
            ref={flatListRef} // Add ref back
            data={segments}
            renderItem={renderSegment}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={!loading ? <Text style={styles.emptyText}>Chapter content not available.</Text> : null}
            contentContainerStyle={styles.listContentContainer}
            extraData={expandedSegmentId || segments}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll} // Add scroll handler back for tracking
            scrollEventThrottle={100} // Throttle needed for tracking
            getItemLayout={(data, index) => ( // Add getItemLayout back
                { length: ESTIMATED_ITEM_HEIGHT, offset: ESTIMATED_ITEM_HEIGHT * index, index }
              )}
            onContentSizeChange={handleContentSizeChange} // Use onContentSizeChange for initial scroll 
              
            // Keep restoration props removed for now
            // onContentSizeChange={...}
            // onContentSizeChange={...}
        />
    </View>
  );
};

// --- Styles ---
const createThemedStyles = (theme, fontSize = 18) => StyleSheet.create({
  container: { flex: 1, },
  listContentContainer: { paddingBottom: 30, paddingHorizontal: 18, },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, },
  segmentOuterContainer: { marginBottom: 15, paddingBottom: 10, }, // Removed borderBottomWidth and borderBottomColor
  segmentText: {
      fontSize: fontSize,
      lineHeight: fontSize * 1.6,
      color: theme.text,
      marginBottom: 8, // Reduced margin slightly
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  reactionPreviewContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'center',
      marginTop: 0, // Position right below text
      marginBottom: 10, // Space before border
      paddingHorizontal: 5,
      opacity: 0.7, // Make it slightly less prominent
  },
  reactionPreviewText: {
      fontSize: 13,
      color: theme.textSecondary,
      marginRight: 10,
  },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: theme.textSecondary, padding: 20, },
  errorText: { color: 'red', textAlign: 'center', fontSize: 16, },
  commentSectionContainer: {
      marginTop: 15, marginBottom: 5, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 5,
      backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border,
      elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3,
      height: 280,
  },
  // Removed commentHeader style
  // Removed commentSectionTitle style
  reactionBar: {
      flexDirection: 'row',
      flexWrap: 'wrap', // Allow wrapping
      justifyContent: 'flex-start', // Align items to the left/start
      alignItems: 'center',
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingBottom: 8,
      paddingTop: 4, // Add some padding above if wrapped
      minHeight: 30,
  },
  reactionButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, paddingVertical: 4, paddingHorizontal: 2 },
  reactionEmoji: { fontSize: 17, },
  reactionCount: { fontSize: 13, color: theme.textSecondary, marginLeft: 3, minWidth: 10, textAlign: 'left', },
  commentList: { flex: 1, marginBottom: 10, },
  commentLoaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
  commentItem: {
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border + '60',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  commentContentContainer: { flex: 1, marginRight: 10, },
  commentUser: { fontWeight: 'bold', fontSize: 14, marginBottom: 3, },
  commentText: { fontSize: 15, color: theme.text, lineHeight: 21, },
  commentTextInline: { fontSize: 15, color: theme.text, lineHeight: 21, flexShrink: 1 },
  commentLikeButton: { flexDirection: 'row', alignItems: 'center', padding: 5, marginTop: -2, },
  commentLikeCount: { fontSize: 13, marginLeft: 4, },
  commentInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: theme.border,
    paddingTop: 12, paddingBottom: 5, marginTop: 8,
  },
  commentInput: {
    flex: 1, borderWidth: 1, borderRadius: 20, paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    paddingHorizontal: 15, marginRight: 10, maxHeight: 100, fontSize: 15,
  },
  loginPrompt: { textAlign: 'center', marginVertical: 15, fontSize: 14, },
  emptyCommentText: { textAlign: 'center', fontSize: 14, color: theme.textSecondary, paddingVertical: 15, }
});

export default ChapterReaderScreen;
