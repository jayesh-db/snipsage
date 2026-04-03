import jwt from 'jsonwebtoken';
import User from '../models/User';
import { SignupPayload, LoginPayload, AuthResponse, JwtPayload, IUser } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(user: IUser): string {
  const payload: JwtPayload = {
    userId: user._id.toString(),
    email: user.email,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

function formatUserResponse(user: IUser, token: string): AuthResponse {
  return {
    token,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
  };
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { email, name, password } = payload;

  // Validate input
  if (!email || !name || !password) {
    throw new Error('Email, name, and password are required.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('An account with this email already exists.');
  }

  // Create user (password will be hashed by pre-save hook)
  const user = new User({
    email: email.toLowerCase(),
    name,
    passwordHash: password,
  });

  await user.save();

  const token = generateToken(user);
  return formatUserResponse(user, token);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { email, password } = payload;

  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new Error('Invalid email or password.');
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password.');
  }

  const token = generateToken(user);
  return formatUserResponse(user, token);
}

export async function getUserById(userId: string): Promise<Omit<AuthResponse['user'], never> | null> {
  const user = await User.findById(userId).select('-passwordHash');
  if (!user) {
    return null;
  }
  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
  };
}
