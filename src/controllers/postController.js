import Post from "../models/post.js";
import User from "../models/user.js";
import { publishEvent } from "../config/aws.js";
import { v4 as uuidv4 } from 'uuid';

// Create new post
export async function createPostController(req, res) {
  const { authorId, title, content } = req.body;

  try {
    // Check if author exists
    const author = await User.findOne({ userId: authorId });
    if (!author) {
      return res.status(404).json({ 
        success: false, 
        error: 'Author not found' 
      });
    }

    // Create post
    const post = new Post({
      postId: uuidv4(),
      authorId,
      title,
      content,
      likes: [],
      likeCount: 0
    });

    await post.save();

    // Return post with author information
    const postWithAuthor = {
      ...post.toObject(),
      author: {
        userId: author.userId,
        name: author.name,
        email: author.email
      }
    };

    res.status(201).json({ 
      success: true, 
      data: postWithAuthor,
      message: 'Post created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get all posts with author information
export async function getAllPostsController(req, res) {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(20);

    // Get author information for each post
    const postsWithAuthors = await Promise.all(
      posts.map(async (post) => {
        const author = await User.findOne({ userId: post.authorId });
        return {
          ...post.toObject(),
          author: author ? {
            userId: author.userId,
            name: author.name,
            email: author.email
          } : null
        };
      })
    );

    res.json({ 
      success: true, 
      data: postsWithAuthors,
      count: postsWithAuthors.length
    });

  } catch (error) {
    console.error('❌ Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get post by ID with author information
export async function getPostController(req, res) {
  const { postId } = req.params;

  try {
    const post = await Post.findOne({ postId });
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Get author information
    const author = await User.findOne({ userId: post.authorId });
    const postWithAuthor = {
      ...post.toObject(),
      author: author ? {
        userId: author.userId,
        name: author.name,
        email: author.email
      } : null
    };

    res.json({ 
      success: true, 
      data: postWithAuthor 
    });

  } catch (error) {
    console.error('❌ Error fetching post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get posts by author
export async function getPostsByAuthorController(req, res) {
  const { authorId } = req.params;

  try {
    // Check if author exists
    const author = await User.findOne({ userId: authorId });
    if (!author) {
      return res.status(404).json({ 
        success: false, 
        error: 'Author not found' 
      });
    }

    const posts = await Post.find({ authorId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Add author information to each post
    const postsWithAuthor = posts.map(post => ({
      ...post.toObject(),
      author: {
        userId: author.userId,
        name: author.name,
        email: author.email
      }
    }));

    res.json({ 
      success: true, 
      data: postsWithAuthor,
      count: postsWithAuthor.length
    });

  } catch (error) {
    console.error('❌ Error fetching posts by author:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Like a post (triggers notification event)
export async function likePostController(req, res) {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // Check if post and user exist
    const [post, user] = await Promise.all([
      Post.findOne({ postId }),
      User.findOne({ userId })
    ]);

    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if already liked
    if (post.likes.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Post already liked' 
      });
    }

    // Check if user is trying to like their own post
    if (post.authorId === userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot like your own post' 
      });
    }

    // 1. Save like to database
    const updatedPost = await Post.findOneAndUpdate(
      { postId },
      { $addToSet: { likes: userId }, $inc: { likeCount: 1 } },
      { new: true }
    );

    // 2. ⚡ RESPOND IMMEDIATELY (don't wait for EventBridge)
    res.json({ 
      success: true,
      data: {
        postId,
        userId,
        likeCount: updatedPost.likeCount,
        eventPublished: true
      },
      message: 'Post liked successfully'
    });

    // 3. 🚀 PUBLISH EVENT ASYNCHRONOUSLY with AUTHOR EMAIL
    // Get author's email from database
    User.findOne({ userId: post.authorId })
      .then(author => {
        if (!author) {
          console.log('⚠️ Author not found for post:', postId);
          return;
        }

        // Don't await - let it run in background
        publishEvent('Post Liked', {
          postId,
          userId,
          authorId: post.authorId,
          authorEmail: author.email,
          authorName: author.name,
          postTitle: post.title,
          likerName: user.name,
          likerEmail: user.email,
          category: 'engagement',
          priority: 'medium'
        }).then(result => {
          console.log('📊 Event published with author email:', {
            authorEmail: author.email,
            result
          });
        }).catch(error => {
          console.error('❌ Background event publishing failed:', error);
        });
      })
      .catch(error => {
        console.error('❌ Error fetching author:', error);
      });

  } catch (error) {
    console.error('❌ Error liking post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Unlike a post
export async function unlikePostController(req, res) {
  const { postId } = req.params;
  const { userId } = req.body;

  try {
    // Get the post first to check if it exists
    const post = await Post.findOne({ postId });
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Check if user actually liked the post
    if (!post.likes.includes(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Post not liked by this user' 
      });
    }

    // Remove like from database
    const updatedPost = await Post.findOneAndUpdate(
      { postId },
      { $pull: { likes: userId }, $inc: { likeCount: -1 } },
      { new: true }
    );

    // Respond immediately
    res.json({ 
      success: true,
      data: {
        postId,
        userId,
        likeCount: Math.max(0, updatedPost.likeCount), // Ensure non-negative
      },
      message: 'Post unliked successfully'
    });

  } catch (error) {
    console.error('❌ Error unliking post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get post likes (users who liked the post)
export async function getPostLikesController(req, res) {
  const { postId } = req.params;

  try {
    const post = await Post.findOne({ postId });
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Get user details for all users who liked the post
    const likedUsers = await User.find({ 
      userId: { $in: post.likes } 
    }).select('userId name email');

    res.json({ 
      success: true, 
      data: {
        postId,
        likeCount: post.likeCount,
        likes: likedUsers
      }
    });

  } catch (error) {
    console.error('❌ Error fetching post likes:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Update post
export async function updatePostController(req, res) {
  const { postId } = req.params;
  const { title, content } = req.body;

  try {
    const updatedPost = await Post.findOneAndUpdate(
      { postId },
      { 
        ...(title && { title }), 
        ...(content && { content }) 
      },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    // Get author information
    const author = await User.findOne({ userId: updatedPost.authorId });
    const postWithAuthor = {
      ...updatedPost.toObject(),
      author: author ? {
        userId: author.userId,
        name: author.name,
        email: author.email
      } : null
    };

    res.json({ 
      success: true,
      data: postWithAuthor,
      message: 'Post updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Delete post
export async function deletePostController(req, res) {
  const { postId } = req.params;

  try {
    const deletedPost = await Post.findOneAndDelete({ postId });

    if (!deletedPost) {
      return res.status(404).json({ 
        success: false, 
        error: 'Post not found' 
      });
    }

    res.json({ 
      success: true,
      data: { postId },
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
