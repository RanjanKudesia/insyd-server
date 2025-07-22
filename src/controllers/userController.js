import User from "../models/user.js";
import { v4 as uuidv4 } from 'uuid';

// Create new user
export async function createUserController(req, res) {
  const { name, email } = req.body;

  try {
    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name and email are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User already exists with this email' 
      });
    }

    // Create user with simplified schema
    const user = new User({
      userId: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim()
    });

    await user.save();

    res.status(201).json({ 
      success: true, 
      data: user,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get user by ID
export async function getUserController(req, res) {
  const { userId } = req.params;

  try {
    const user = await User.findOne({ userId });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true, 
      data: user 
    });

  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get user by email (useful for testing and lookups)
export async function getUserByEmailController(req, res) {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found with this email' 
      });
    }

    res.json({ 
      success: true, 
      data: user 
    });

  } catch (error) {
    console.error('❌ Error fetching user by email:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Update user profile
export async function updateUserController(req, res) {
  const { userId } = req.params;
  const { name, email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if email is being changed and if new email already exists
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email already exists' 
        });
      }
    }

    // Update user
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();

    const updatedUser = await User.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    res.json({ 
      success: true,
      data: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get all users (for demo purposes)
export async function getAllUsersController(req, res) {
  try {
    const users = await User.find({})
      .select('userId name email createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ 
      success: true, 
      data: users,
      count: users.length,
      message: `Found ${users.length} users`
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Delete user (for testing/cleanup)
export async function deleteUserController(req, res) {
  const { userId } = req.params;

  try {
    const deletedUser = await User.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    res.json({ 
      success: true,
      data: { 
        userId: deletedUser.userId,
        name: deletedUser.name,
        email: deletedUser.email
      },
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Search users by name or email (useful for demo)
export async function searchUsersController(req, res) {
  const { query } = req.query;

  try {
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query must be at least 2 characters' 
      });
    }

    const searchRegex = new RegExp(query.trim(), 'i');
    
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ]
    })
    .select('userId name email createdAt')
    .sort({ name: 1 })
    .limit(20);

    res.json({ 
      success: true, 
      data: users,
      count: users.length,
      query: query.trim(),
      message: `Found ${users.length} users matching "${query}"`
    });

  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
