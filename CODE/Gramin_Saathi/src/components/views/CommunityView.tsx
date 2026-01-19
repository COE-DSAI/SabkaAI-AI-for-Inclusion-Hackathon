import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  getDocs, 
  addDoc, 
  setDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  MessageCircle, 
  FileText, 
  Plus, 
  X, 
  Send, 
  Loader, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Bookmark, 
  BookmarkCheck, 
  Share2, 
  Trash2, 
  ChevronDown,
  Volume2
} from 'lucide-react';
import { getBlogPosts } from '../../data/blogPosts';

export function CommunityView({ lang, user, db, appId, profile }: any) {
  const [votes, setVotes] = useState<{[key: string]: number}>({});
  const [saved, setSaved] = useState<{[key: string]: boolean}>({});
  const [likeCounts, setLikeCounts] = useState<{[key: string]: number}>({});
  const [selectedPostId, setSelectedPostId] = useState<string | number | null>(null);
  const [comments, setComments] = useState<{[key: string]: any[]}>({});
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [activeTab, setActiveTab] = useState('articles');
  const [articleFilter, setArticleFilter] = useState('all');

  const blogPosts = getBlogPosts(lang);

  useEffect(() => {
    if (!db || !appId) return;
    
    const q = query(
      collection(db, 'artifacts', appId, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts: any[] = [];
      snapshot.forEach(doc => {
        posts.push({ id: doc.id, ...doc.data() });
      });
      setUserPosts(posts);
    }, (error) => {
      console.error('Error loading posts:', error);
    });
    
    return () => unsubscribe();
  }, [db, appId]);
  
  useEffect(() => {
    if (!selectedPostId || !db || !appId) return;
    
    const loadComments = async () => {
      setLoadingComments(true);
      try {
        const commentsRef = collection(db, 'artifacts', appId, 'blog', String(selectedPostId), 'comments');
        const q = query(commentsRef, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const postComments: any[] = [];
        snapshot.forEach(doc => postComments.push({ id: doc.id, ...doc.data() }));
        setComments(prev => ({ ...prev, [String(selectedPostId)]: postComments }));
      } catch (err) {
        console.error('Error loading comments:', err);
      }
      setLoadingComments(false);
    };
    
    loadComments();
  }, [selectedPostId, db, appId]);

  useEffect(() => {
    if (!user || !db || !appId) return;
    
    const loadUserInteractions = async () => {
      try {
        const savedSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'saved_posts'));
        const savedMap: {[key: string]: boolean} = {};
        savedSnap.forEach(doc => { savedMap[doc.id] = true; });
        setSaved(savedMap);

        const votesSnap = await getDocs(collection(db, 'artifacts', appId, 'users', user.uid, 'votes'));
        const votesMap: {[key: string]: number} = {};
        votesSnap.forEach(doc => { votesMap[doc.id] = doc.data().direction; });
        setVotes(votesMap);
      } catch (err) {
        console.error('Error loading interactions:', err);
      }
    };
    
    loadUserInteractions();
  }, [user, db, appId]);

  useEffect(() => {
    if (!db || !appId) return;
    
    const loadLikeCounts = async () => {
      const counts: {[key: string]: number} = {};
      for (const post of blogPosts) {
        try {
          const likesSnap = await getDocs(collection(db, 'artifacts', appId, 'blog', String(post.id), 'likes'));
          counts[post.id] = likesSnap.size;
        } catch {
          counts[post.id] = 0;
        }
      }
      setLikeCounts(counts);
    };
    
    loadLikeCounts();
  }, [db, appId, lang]);

  const requireAuth = (action: string) => {
    if (!user) {
      alert(lang === 'en' ? `Please login to ${action} this post.` : `इस पोस्ट को ${action === 'vote' ? 'वोट' : action === 'save' ? 'सेव' : 'शेयर'} करने के लिए लॉगिन करें।`);
      return false;
    }
    return true;
  };

  const handleVote = async (postId: string | number, direction: number) => {
    if (!requireAuth('vote')) return;
    
    const currentVote = votes[String(postId)] || 0;
    const newVote = currentVote === direction ? 0 : direction;
    
    setVotes(prev => ({...prev, [String(postId)]: newVote}));
    
    try {
      const voteRef = doc(db, 'artifacts', appId, 'users', user.uid, 'votes', String(postId));
      if (newVote === 0) {
        await deleteDoc(voteRef);
      } else {
        await setDoc(voteRef, { direction: newVote, updatedAt: serverTimestamp() });
      }
      
      const likeRef = doc(db, 'artifacts', appId, 'blog', String(postId), 'likes', user.uid);
      if (newVote === 1) {
        await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        setLikeCounts(prev => ({...prev, [String(postId)]: (prev[String(postId)] || 0) + 1}));
      } else if (currentVote === 1) {
        await deleteDoc(likeRef);
        setLikeCounts(prev => ({...prev, [String(postId)]: Math.max(0, (prev[String(postId)] || 0) - 1)}));
      }
    } catch (err) {
      console.error('Error saving vote:', err);
      setVotes(prev => ({...prev, [String(postId)]: currentVote}));
    }
  };

  const handleSave = async (postId: string | number) => {
    if (!requireAuth('save')) return;
    
    const isSaved = saved[String(postId)];
    setSaved(prev => ({...prev, [String(postId)]: !isSaved}));
    
    try {
      const saveRef = doc(db, 'artifacts', appId, 'users', user.uid, 'saved_posts', String(postId));
      if (isSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, { postId, savedAt: serverTimestamp() });
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setSaved(prev => ({...prev, [String(postId)]: isSaved}));
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || !selectedPostId) return;
    
    const comment = {
      text: newComment.trim(),
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      userAvatar: user.photoURL || null,
      createdAt: serverTimestamp()
    };
    
    try {
      const commentsRef = collection(db, 'artifacts', appId, 'blog', String(selectedPostId), 'comments');
      const docRef = await addDoc(commentsRef, comment);
      
      setComments(prev => ({
        ...prev,
        [String(selectedPostId)]: [
          { id: docRef.id, ...comment, createdAt: new Date() },
          ...(prev[String(selectedPostId)] || [])
        ]
      }));
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !selectedPostId) return;
    
    try {
      const commentRef = doc(db, 'artifacts', appId, 'blog', String(selectedPostId), 'comments', commentId);
      await deleteDoc(commentRef);
      
      setComments(prev => ({
        ...prev,
        [String(selectedPostId)]: (prev[String(selectedPostId)] || []).filter(c => c.id !== commentId)
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!user || !newPostTitle.trim() || !newPostContent.trim()) {
      alert(lang === 'en' ? 'Please fill in all fields' : 'कृपया सभी फ़ील्ड भरें');
      return;
    }
    
    setSubmittingPost(true);
    try {
      const postData = {
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        category: newPostCategory,
        authorId: user.uid,
        authorName: profile?.name || user.displayName || 'Anonymous',
        authorVillage: profile?.village || 'Unknown',
        createdAt: serverTimestamp(),
        likesCount: 0,
        commentsCount: 0
      };
      
      await addDoc(collection(db, 'artifacts', appId, 'community_posts'), postData);
      setNewPostTitle('');
      setNewPostContent('');
      setNewPostCategory('general');
      setShowCreatePost(false);
      alert(lang === 'en' ? 'Post shared successfully!' : 'पोस्ट सफलतापूर्वक साझा की गई!');
    } catch (err) {
      console.error('Error creating post:', err);
      alert(lang === 'en' ? 'Failed to create post' : 'पोस्ट बनाने में विफल');
    }
    setSubmittingPost(false);
  };
  
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (!user || user.uid !== authorId) return;
    if (!confirm(lang === 'en' ? 'Delete this post?' : 'इस पोस्ट को हटाएं?')) return;
    
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'community_posts', postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };
  
  const speakPost = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'en' ? 'en-US' : 'hi-IN';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full md:max-w-4xl md:mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-main)]">
            {lang === 'en' ? 'Community Forum' : 'समुदाय मंच'}
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-muted)]">
            {lang === 'en' ? 'Share experiences, ask questions, learn together' : 'अनुभव साझा करें, सवाल पूछें'}
          </p>
        </div>
        {user && (
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">{lang === 'en' ? 'New Post' : 'नया पोस्ट'}</span>
          </button>
        )}
      </div>
      
      {!selectedPostId && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'community'
                ? 'bg-[var(--primary)] text-white shadow-lg'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'
            }`}
          >
            {lang === 'en' ? `Community Posts (${userPosts.length})` : `समुदाय पोस्ट (${userPosts.length})`}
          </button>
          <button
            onClick={() => setActiveTab('articles')}
            className={`flex-1 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all ${
              activeTab === 'articles'
                ? 'bg-[var(--primary)] text-white shadow-lg'
                : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]'
            }`}
          >
            {lang === 'en' ? 'Articles (8)' : 'लेख (8)'}
          </button>
        </div>
      )}
      
      {showCreatePost && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 md:p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg text-[var(--text-main)]">
                {lang === 'en' ? 'Share Your Thoughts' : 'अपने विचार साझा करें'}
              </h3>
              <button onClick={() => setShowCreatePost(false)} className="p-1.5 hover:bg-[var(--bg-input)] rounded-lg">
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1.5 block">
                  {lang === 'en' ? 'Title' : 'शीर्षक'}
                </label>
                <input
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder={lang === 'en' ? "What's on your mind?" : "आपके मन में क्या है?"}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  maxLength={150}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1.5 block">
                  {lang === 'en' ? 'Category' : 'श्रेणी'}
                </label>
                <select
                  value={newPostCategory}
                  onChange={(e) => setNewPostCategory(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="general">{lang === 'en' ? 'General' : 'सामान्य'}</option>
                  <option value="problem">{lang === 'en' ? 'Problem/Issue' : 'समस्या/मुद्दा'}</option>
                  <option value="advice">{lang === 'en' ? 'Seeking Advice' : 'सलाह चाहिए'}</option>
                  <option value="success">{lang === 'en' ? 'Success Story' : 'सफलता की कहानी'}</option>
                  <option value="question">{lang === 'en' ? 'Question' : 'सवाल'}</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] mb-1.5 block">
                  {lang === 'en' ? 'Your Message' : 'आपका संदेश'}
                </label>
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder={lang === 'en' ? 'Share your experience, question, or issue...' : 'अपना अनुभव, सवाल या समस्या साझा करें...'}
                  className="w-full p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[120px] resize-none"
                  maxLength={2000}
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  {newPostContent.length}/2000 {lang === 'en' ? 'characters' : 'अक्षर'}
                </p>
              </div>
              
              <button
                onClick={handleCreatePost}
                disabled={submittingPost}
                className="w-full py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submittingPost ? (
                  <><Loader className="animate-spin" size={16} /> {lang === 'en' ? 'Posting...' : 'पोस्ट हो रहा है...'}</>
                ) : (
                  <><Send size={16} /> {lang === 'en' ? 'Share Post' : 'पोस्ट शेयर करें'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {selectedPostId ? (
        <div>
          <button
            onClick={() => setSelectedPostId(null)}
            className="mb-4 flex items-center gap-2 text-[var(--primary)] font-medium hover:underline"
          >
            <ChevronDown className="rotate-90" size={18} />
            {lang === 'en' ? 'Back' : 'वापस जाएं'}
          </button>

          {blogPosts.map(post => {
            if (post.id !== selectedPostId) return null;
            return (
              <article key={post.id} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-[var(--shadow-card)] p-6">
                <div className="mb-6">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 ${post.categoryColor}`}>
                    {lang === 'en' ? post.category.en : post.category.hi}
                  </span>
                  <h1 className="text-3xl font-bold text-[var(--text-main)] mb-4">{post.title}</h1>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-10 h-10 rounded-full ${post.author.color} flex items-center justify-center text-white font-bold`}>
                      {post.author.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-[var(--text-main)]">{post.author.name}</p>
                      <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime}</span>
                      </p>
                    </div>
                  </div>

                  <div className="relative mb-6">
                    <img 
                      src={post.image} 
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-96 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => speakPost(post.title + '. ' + post.content)}
                      className="absolute top-4 right-4 p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title={lang === 'en' ? 'Listen to article' : 'लेख सुनें'}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none mb-8">
                  <p className="text-base md:text-lg text-[var(--text-main)] leading-relaxed whitespace-pre-wrap">
                    {post.content.length > 500 ? (
                      <>
                        {post.content.slice(0, 500)}...
                        <button 
                          onClick={() => {
                            const el = document.getElementById(`full-content-${post.id}`);
                            if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                          }}
                          className="text-[var(--primary)] font-medium ml-2 hover:underline"
                        >
                          {lang === 'en' ? 'Read more' : 'और पढ़ें'}
                        </button>
                        <span id={`full-content-${post.id}`} style={{display: 'none'}}>
                          {post.content.slice(500)}
                        </span>
                      </>
                    ) : post.content}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleVote(post.id, 1)}
                      className={`p-2 rounded-lg transition-colors ${votes[String(post.id)] === 1 ? 'bg-green-100 text-green-600' : 'hover:bg-[var(--bg-glass)] text-[var(--text-muted)]'}`}
                      title={lang === 'en' ? 'Like' : 'पसंद करें'}
                    >
                      <ThumbsUp size={20} />
                    </button>
                    <span className="text-sm font-medium text-[var(--text-main)] min-w-[45px]">
                      {post.initialVotes + (likeCounts[String(post.id)] || 0)}
                    </span>
                    <button 
                      onClick={() => handleVote(post.id, -1)}
                      className={`p-2 rounded-lg transition-colors ${votes[String(post.id)] === -1 ? 'bg-red-100 text-red-600' : 'hover:bg-[var(--bg-glass)] text-[var(--text-muted)]'}`}
                      title={lang === 'en' ? 'Dislike' : 'नापसंद करें'}
                    >
                      <ThumbsDown size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleSave(post.id)}
                      className={`p-2 rounded-lg transition-colors ${saved[String(post.id)] ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'hover:bg-[var(--bg-glass)] text-[var(--text-muted)]'}`}
                      title={lang === 'en' ? 'Save' : 'सेव करें'}
                    >
                      {saved[String(post.id)] ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                    </button>

                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({ title: post.title, text: post.content.slice(0, 100) });
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)]"
                      title={lang === 'en' ? 'Share' : 'शेयर करें'}
                    >
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                  <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <MessageCircle size={18} className="text-[var(--primary)]" />
                    {lang === 'en' ? 'Comments' : 'टिप्पणियां'} ({(comments[String(post.id)] || []).length})
                  </h3>
                  
                  {user ? (
                    <div className="flex gap-3 mb-4">
                      {user.photoURL ? <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full" /> : <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold text-sm">{(user.displayName || 'U')[0]}</div>}
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={lang === 'en' ? 'Write a comment...' : 'टिप्पणी लिखें...'}
                          className="w-full p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
                          rows={2}
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim()}
                          className="mt-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center gap-1"
                        >
                          <Send size={14} />
                          {lang === 'en' ? 'Post' : 'पोस्ट करें'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] mb-4">
                      {lang === 'en' ? 'Login to post a comment' : 'टिप्पणी करने के लिए लॉगिन करें'}
                    </p>
                  )}

                  <div className="space-y-3">
                    {loadingComments ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader className="animate-spin text-[var(--primary)]" size={20} />
                      </div>
                    ) : (comments[String(post.id)] || []).length === 0 ? (
                      <p className="text-center text-sm text-[var(--text-muted)] py-4">
                        {lang === 'en' ? 'No comments yet. Be the first!' : 'अभी कोई टिप्पणी नहीं। पहले बनें!'}
                      </p>
                    ) : (comments[String(post.id)] || []).map(comment => (
                      <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-[var(--bg-glass)] border border-[var(--border)]">
                        {comment.userAvatar ? <img src={comment.userAvatar} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-[var(--secondary)] flex items-center justify-center text-white font-bold text-xs">{(comment.userName || 'A')[0]}</div>}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm text-[var(--text-main)]">{comment.userName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[var(--text-muted)]">
                                {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                              </span>
                              {user && comment.userId === user.uid && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-[var(--text-muted)]">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div>
          {activeTab === 'community' ? (
            <div>
              <div className="mb-4">
                <h2 className="text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <MessageCircle className="text-[var(--primary)]" size={20} />
                  {lang === 'en' ? 'Community Discussions' : 'समुदाय चर्चा'}
                </h2>
              </div>

              {userPosts.length === 0 ? (
                <div className="text-center py-10 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                  <MessageCircle className="mx-auto mb-3 opacity-30 text-[var(--text-muted)]" size={40} />
                  <p className="text-sm text-[var(--text-muted)] mb-4">
                    {lang === 'en' ? 'No posts yet. Be the first to share!' : 'अभी तक कोई पोस्ट नहीं। पहले शेयर करें!'}
                  </p>
                  {user && (
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                    >
                      {lang === 'en' ? 'Create First Post' : 'पहला पोस्ट बनाएं'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {userPosts.map(post => {
                    const categoryStyles: any = { 
                      general: 'bg-gray-100 text-gray-700', 
                      problem: 'bg-rose-100 text-rose-700', 
                      advice: 'bg-sky-100 text-sky-700', 
                      success: 'bg-emerald-100 text-emerald-700', 
                      question: 'bg-violet-100 text-violet-700' 
                    };
                    
                    return (
                      <article 
                        key={post.id} 
                        className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-3 shadow-sm hover:shadow-md transition-all hover:border-[var(--primary)] active:scale-[0.99]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {(post.authorName || 'U')[0]}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="font-bold text-sm text-[var(--text-main)]">{post.authorName}</p>
                                <p className="text-[10px] md:text-xs text-[var(--text-muted)]">
                                  {post.authorVillage} • {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString('en-IN') : 'Today'}
                                </p>
                              </div>
                              {user && user.uid === post.authorId && (
                                <button
                                  onClick={() => handleDeletePost(post.id, post.authorId)}
                                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title={lang === 'en' ? 'Delete' : 'हटाएं'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>

                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1.5 ${categoryStyles[post.category] || categoryStyles.general}`}>
                              {post.category === 'problem' ? (lang === 'en' ? 'Problem' : 'समस्या') :
                               post.category === 'advice' ? (lang === 'en' ? 'Advice' : 'सलाह') :
                               post.category === 'success' ? (lang === 'en' ? 'Success' : 'सफलता') :
                               post.category === 'question' ? (lang === 'en' ? 'Question' : 'सवाल') :
                               (lang === 'en' ? 'General' : 'सामान्य')}
                            </span>

                            <h3 className="font-bold text-sm md:text-base text-[var(--text-main)] mb-1 line-clamp-2">{post.title}</h3>
                            <p className="text-[var(--text-muted)] text-xs line-clamp-2 mb-2">{post.content}</p>

                            <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
                              <button 
                                onClick={() => handleVote(`user_${post.id}`, 1)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs ${votes[`user_${post.id}`] === 1 ? 'bg-green-100 text-green-600' : 'hover:bg-[var(--bg-glass)] text-[var(--text-muted)]'}`}
                              >
                                <ThumbsUp size={12} />
                                <span className="font-medium">{post.likesCount || 0}</span>
                              </button>
                              
                              <button 
                                onClick={() => handleVote(`user_${post.id}`, -1)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs ${votes[`user_${post.id}`] === -1 ? 'bg-red-100 text-red-600' : 'hover:bg-[var(--bg-glass)] text-[var(--text-muted)]'}`}
                              >
                                <ThumbsDown size={12} />
                              </button>
                              
                              <button 
                                onClick={() => setSelectedPostId(`user_${post.id}`)}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)] text-xs"
                              >
                                <MessageCircle size={12} />
                                <span>{post.commentsCount || 0}</span>
                              </button>
                              
                              <button 
                                onClick={() => {
                                  if ((window as any).shareContent) {
                                    (window as any).shareContent(post.title, post.content, window.location.href);
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--bg-glass)] text-[var(--text-muted)] text-xs ml-auto"
                              >
                                <Share2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h2 className="text-lg md:text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                  <FileText className="text-[var(--primary)]" size={20} />
                  {lang === 'en' ? 'Financial Literacy Corner' : 'वित्तीय साक्षरता कोना'}
                </h2>
              </div>

              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { id: 'all', label: lang === 'en' ? 'All' : 'सभी' },
                  { id: 'loans', label: lang === 'en' ? 'Loans' : 'ऋण' },
                  { id: 'security', label: lang === 'en' ? 'Security' : 'सुरक्षा' },
                  { id: 'savings', label: lang === 'en' ? 'Savings' : 'बचत' },
                  { id: 'schemes', label: lang === 'en' ? 'Schemes' : 'योजनाएं' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setArticleFilter(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      articleFilter === cat.id 
                        ? 'bg-[var(--primary)] text-white' 
                        : 'bg-[var(--bg-glass)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {blogPosts
                  .filter(post => {
                    if (articleFilter === 'all') return true;
                    const filterMatches: any = {
                      loans: ['Loans & Credit', 'Digital Banking'],
                      security: ['Security'],
                      savings: ['Savings'],
                      schemes: ['Insurance', 'Farming', 'Women Empowerment', 'Market Prices']
                    };
                    return filterMatches[articleFilter]?.includes(post.category.en);
                  })
                  .map(post => (
                  <article 
                    key={post.id} 
                    onClick={() => setSelectedPostId(post.id)}
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden shadow-lg hover:shadow-xl transition-all cursor-pointer hover:border-[var(--primary)]/50 active:scale-[0.99] group"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="w-20 h-20 md:w-28 md:h-28 flex-shrink-0 rounded-xl overflow-hidden">
                        <img 
                          src={post.image} 
                          alt={post.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mb-1.5 ${post.categoryColor}`}>
                            {lang === 'en' ? post.category.en : post.category.hi}
                          </span>
                          <h3 className="font-bold text-sm md:text-base text-[var(--text-main)] mb-1 line-clamp-2 leading-snug">
                            {post.title}
                          </h3>
                          <p className="text-[var(--text-muted)] text-xs line-clamp-2 hidden sm:block">
                            {post.content.length > 120 ? post.content.slice(0, 120) + '...' : post.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] md:text-xs text-[var(--text-muted)] mt-1">
                          <div className="flex items-center gap-1">
                            <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full ${post.author.color} flex items-center justify-center text-white text-[8px] md:text-[10px] font-bold`}>
                              {post.author.avatar}
                            </div>
                            <span>{post.author.name}</span>
                          </div>
                          <span>{post.date}</span>
                          <span className="flex items-center gap-0.5"><Clock size={10} />{post.readTime}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 justify-center">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVote(post.id, 1);
                          }}
                          className={`p-2 rounded-xl transition-all ${votes[String(post.id)] === 1 ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-glass)] hover:bg-emerald-500/20 text-[var(--text-muted)]'}`}
                        >
                          <ThumbsUp size={14} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(post.id);
                          }}
                          className={`p-2 rounded-xl transition-all ${saved[String(post.id)] ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg-glass)] hover:bg-[var(--primary)]/20 text-[var(--text-muted)]'}`}
                        >
                          {saved[String(post.id)] ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (navigator.share) {
                              navigator.share({ title: post.title, text: post.content.slice(0, 100) });
                            }
                          }}
                          className="p-2 rounded-xl bg-[var(--bg-glass)] hover:bg-sky-500/20 text-[var(--text-muted)] transition-all"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
