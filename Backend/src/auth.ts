import jwt from 'jsonwebtoken';

const secret: string | undefined = process.env.JWT_SECRET

// Function to generate a JWT token
export const generateToken = (user: { id: string, email: string, username: string }): string => {
  const secret = process.env.JWT_SECRET;

  // Ensure that the JWT secret is defined
  if (!secret) {
    throw new Error('JWT secret is not defined in environment variables');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
    },
    secret,
    { expiresIn: '1h' } // Token expires in 1 hour
  );
};

export const generateRememberMeToken = (user: { id: string, email: string, username: string }): string => {
  const secret = process.env.JWT_SECRET;

  // Ensure that the JWT secret is defined
  if (!secret) {
    throw new Error('JWT secret is not defined in environment variables');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
    },
    secret,
    { expiresIn: '30d' }
  );
};



export const verifyToken = (token: string | undefined): boolean => {
  const secret = process.env.JWT_SECRET;

  if (!token) {

    return false;
  }

  if (!secret) {
    return false;
  }

  try {
    const decoded = jwt.verify(token, secret);
    return true;
  } catch (error) {
    return false;
  }
};
