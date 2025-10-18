const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const User = require('../database/schemas/user');

const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_VERIFY_ATTEMPTS = 3;
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

class AuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.EMAIL_CLIENT_ID,
      process.env.EMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // redirect (not used for refresh token flow)
    );
    this.oauth2Client.setCredentials({
      refresh_token: process.env.EMAIL_REFRESH_TOKEN
    });

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.EMAIL_CLIENT_ID,
        clientSecret: process.env.EMAIL_CLIENT_SECRET,
        refreshToken: process.env.EMAIL_REFRESH_TOKEN,
        accessToken: null // will be fetched per send
      }
    });
  }

  async _getAccessToken() {
    const res = await this.oauth2Client.getAccessToken();
    return res?.token || null;
  }

  async _sendMail(mailOptions) {
    const accessToken = await this._getAccessToken();
    if (!accessToken) throw new Error('Failed to obtain access token for email');
    this.transporter.set('auth', {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.EMAIL_CLIENT_ID,
      clientSecret: process.env.EMAIL_CLIENT_SECRET,
      refreshToken: process.env.EMAIL_REFRESH_TOKEN,
      accessToken
    });
    return this.transporter.sendMail(mailOptions);
  }

  async sendVerificationEmail(email, code) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verification code',
      text: `Your verification code: ${code}. It expires in 15 minutes.`
    };
    return this._sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email, token) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Password reset',
      text: `Reset your password: ${resetLink}. Link expires in 1 hour.`
    };
    return this._sendMail(mailOptions);
  }

  async register(email, password) {
    const existing = await User.findOne({ email });
    if (existing) throw new Error('Email already registered');

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      verificationExpires: Date.now() + VERIFICATION_TTL_MS,
      verifyAttempts: 0,
      isVerified: false
    });

    await this.sendVerificationEmail(email, verificationCode);
    return { id: user._id, email: user.email };
  }

  async resendVerification(email) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if (user.isVerified) throw new Error('Already verified');
    if ((user.verifyAttempts || 0) >= MAX_VERIFY_ATTEMPTS) throw new Error('Max verification attempts reached');

    user.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationExpires = Date.now() + VERIFICATION_TTL_MS;
    user.verifyAttempts = (user.verifyAttempts || 0) + 1;
    await user.save();

    await this.sendVerificationEmail(email, user.verificationCode);
    return true;
  }

  async verifyEmail(email, code) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');
    if (user.isVerified) return this.generateToken(user);

    if (!user.verificationCode || user.verificationCode !== code) {
      user.verifyAttempts = (user.verifyAttempts || 0) + 1;
      await user.save();
      if (user.verifyAttempts >= MAX_VERIFY_ATTEMPTS) throw new Error('Verification attempts exceeded');
      throw new Error('Invalid verification code');
    }

    if (Date.now() > (user.verificationExpires || 0)) {
      throw new Error('Verification code expired');
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    user.verifyAttempts = 0;
    await user.save();
    return this.generateToken(user);
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Invalid credentials');
    if (!await bcrypt.compare(password, user.password)) throw new Error('Invalid credentials');
    if (!user.isVerified) throw new Error('Email not verified');
    return this.generateToken(user);
  }

  generateToken(user) {
    return jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  async requestPasswordReset(email) {
    const user = await User.findOne({ email });
    if (!user) throw new Error('User not found');

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetExpires = Date.now() + RESET_TTL_MS;
    await user.save();

    await this.sendPasswordResetEmail(email, token);
    return true;
  }

  async resetPassword(token, newPassword) {
    const user = await User.findOne({ resetToken: token });
    if (!user) throw new Error('Invalid or expired token');
    if (Date.now() > (user.resetExpires || 0)) throw new Error('Reset token expired');

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetExpires = undefined;
    await user.save();
    return true;
  }
}

module.exports = new AuthService();