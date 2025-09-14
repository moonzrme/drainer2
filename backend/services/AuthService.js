const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../database/schemas/user');
const nodemailer = require('nodemailer');

class AuthService {
  constructor() {
    this.emailTransporter = nodemailer.createTransport({
      // Configure your email service
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async register(email, password) {
    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      email,
      password: hashedPassword,
      verificationCode
    });

    await this.sendVerificationEmail(email, verificationCode);
    return user;
  }

  async verifyEmail(email, code) {
    const user = await User.findOne({ email });
    if (user.verificationCode !== code) {
      throw new Error('Invalid verification code');
    }
    
    user.isVerified = true;
    await user.save();
    return this.generateToken(user);
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      throw new Error('Invalid credentials');
    }
    
    return this.generateToken(user);
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }
}

module.exports = new AuthService();