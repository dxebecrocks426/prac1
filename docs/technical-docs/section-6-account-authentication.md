## 6. Account & Authentication

### Email/Password Account Creation Flow

GoDark requires account creation separate from wallet connection to enable multi-device access, API key management, and account recovery.

#### Registration Process

```typescript
interface AccountRegistration {
    email: string;
    password: string;
    confirmPassword: string;
    agreedToTerms: boolean;
    referralCode?: string;
}

class AccountService {
    async registerAccount(registration: AccountRegistration): Promise<Account> {
        // 1. Validate input
        this.validateEmail(registration.email);
        this.validatePassword(registration.password);
        
        if (registration.password !== registration.confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        // 2. Check if email already exists
        const existing = await db.accounts.findOne({ 
            email: registration.email.toLowerCase() 
        });
        
        if (existing) {
            throw new Error('Email already registered');
        }
        
        // 3. Hash password (bcrypt with cost factor 12)
        const passwordHash = await bcrypt.hash(registration.password, 12);
        
        // 4. Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        // 5. Create account
        const account = await db.accounts.insert({
            email: registration.email.toLowerCase(),
            passwordHash,
            verificationToken,
            verificationExpiry,
            isVerified: false,
            twoFactorEnabled: false,
            createdAt: Date.now(),
            linkedWallet: null,
            status: 'PENDING_VERIFICATION'
        });
        
        // 6. Send verification email
        await this.sendVerificationEmail(account.email, verificationToken);
        
        // 7. Process referral if provided
        if (registration.referralCode) {
            await this.processReferral(account.id, registration.referralCode);
        }
        
        return account;
    }
    
    validateEmail(email: string): void {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
        
        // Block disposable email domains
        const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
        const domain = email.split('@')[1];
        if (disposableDomains.includes(domain)) {
            throw new Error('Disposable email addresses not allowed');
        }
    }
    
    validatePassword(password: string): void {
        if (password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecial) {
            throw new Error('Password must contain uppercase, lowercase, number, and special character');
        }
        
        // Check against common passwords
        if (this.isCommonPassword(password)) {
            throw new Error('Password is too common. Please choose a stronger password.');
        }
    }
}
```

---

### Email Verification Process

#### Verification Flow

```typescript
class EmailVerification {
    async sendVerificationEmail(email: string, token: string): Promise<void> {
        const verificationLink = `https://app.godark.xyz/verify-email?token=${token}`;
        
        await this.emailService.send({
            to: email,
            subject: 'Verify your GoDark account',
            template: 'email-verification',
            data: {
                verificationLink,
                expiryHours: 24
            }
        });
    }
    
    async verifyEmail(token: string): Promise<void> {
        const account = await db.accounts.findOne({ verificationToken: token });
        
        if (!account) {
            throw new Error('Invalid verification token');
        }
        
        if (Date.now() > account.verificationExpiry) {
            throw new Error('Verification token expired');
        }
        
        // Update account
        await db.accounts.updateOne(
            { _id: account._id },
            {
                $set: {
                    isVerified: true,
                    status: 'ACTIVE',
                    verifiedAt: Date.now()
                },
                $unset: {
                    verificationToken: '',
                    verificationExpiry: ''
                }
            }
        );
        
        // Send welcome email
        await this.sendWelcomeEmail(account.email);
    }
    
    async resendVerification(email: string): Promise<void> {
        const account = await db.accounts.findOne({ email });
        
        if (!account) {
            // Don't reveal if email exists
            return;
        }
        
        if (account.isVerified) {
            throw new Error('Email already verified');
        }
        
        // Generate new token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = Date.now() + (24 * 60 * 60 * 1000);
        
        await db.accounts.updateOne(
            { _id: account._id },
            {
                $set: {
                    verificationToken,
                    verificationExpiry
                }
            }
        );
        
        await this.sendVerificationEmail(account.email, verificationToken);
    }
}
```

---

### 2FA Setup (Authenticator App)

#### TOTP (Time-Based One-Time Password) Implementation

```typescript
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

class TwoFactorAuth {
    async generateSecret(accountId: string): Promise<TwoFactorSetup> {
        const secret = speakeasy.generateSecret({
            name: 'GoDark',
            issuer: 'GoDark DEX',
            length: 32
        });
        
        // Store encrypted secret temporarily
        await db.twoFactorSetup.insert({
            accountId,
            secret: this.encrypt(secret.base32),
            createdAt: Date.now(),
            expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes
            isConfirmed: false
        });
        
        // Generate QR code
        const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
        
        return {
            secret: secret.base32,
            qrCode: qrCodeDataURL,
            manualEntryKey: secret.base32
        };
    }
    
    async confirmTwoFactor(accountId: string, token: string): Promise<void> {
        const setup = await db.twoFactorSetup.findOne({ accountId, isConfirmed: false });
        
        if (!setup) {
            throw new Error('No pending 2FA setup');
        }
        
        if (Date.now() > setup.expiresAt) {
            throw new Error('2FA setup expired');
        }
        
        const secret = this.decrypt(setup.secret);
        
        // Verify token
        const isValid = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1 // Allow 1 time step tolerance
        });
        
        if (!isValid) {
            throw new Error('Invalid 2FA code');
        }
        
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        
        // Enable 2FA for account
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: {
                    twoFactorEnabled: true,
                    twoFactorSecret: this.encrypt(secret),
                    backupCodes: backupCodes.map(code => bcrypt.hashSync(code, 10)),
                    twoFactorEnabledAt: Date.now()
                }
            }
        );
        
        // Clean up setup
        await db.twoFactorSetup.deleteOne({ _id: setup._id });
        
        return { backupCodes };
    }
    
    async verifyTwoFactorToken(accountId: string, token: string): Promise<boolean> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        if (!account.twoFactorEnabled) {
            return true; // 2FA not enabled
        }
        
        const secret = this.decrypt(account.twoFactorSecret);
        
        // Check if it's a backup code
        for (const hashedBackupCode of account.backupCodes || []) {
            if (bcrypt.compareSync(token, hashedBackupCode)) {
                // Remove used backup code
                await db.accounts.updateOne(
                    { _id: accountId },
                    {
                        $pull: { backupCodes: hashedBackupCode }
                    }
                );
                return true;
            }
        }
        
        // Verify TOTP token
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 1
        });
    }
    
    private generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
    
    async disableTwoFactor(accountId: string, password: string, token: string): Promise<void> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        // Verify password
        const passwordValid = await bcrypt.compare(password, account.passwordHash);
        if (!passwordValid) {
            throw new Error('Invalid password');
        }
        
        // Verify 2FA token
        const tokenValid = await this.verifyTwoFactorToken(accountId, token);
        if (!tokenValid) {
            throw new Error('Invalid 2FA code');
        }
        
        // Disable 2FA
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: {
                    twoFactorEnabled: false
                },
                $unset: {
                    twoFactorSecret: '',
                    backupCodes: ''
                }
            }
        );
    }
}
```

---

### Wallet Linking (One Per Account)

```typescript
class WalletLinking {
    async linkWallet(accountId: string, walletAddress: string, signature: string): Promise<void> {
        // 1. Verify account exists
        const account = await db.accounts.findOne({ _id: accountId });
        if (!account) {
            throw new Error('Account not found');
        }
        
        // 2. Check if wallet already linked
        if (account.linkedWallet) {
            throw new Error('Account already has a linked wallet. Unlink first.');
        }
        
        // 3. Check if wallet is linked to another account
        const existingLink = await db.accounts.findOne({ linkedWallet: walletAddress });
        if (existingLink) {
            throw new Error('This wallet is already linked to another account');
        }
        
        // 4. Verify wallet ownership
        const message = `Link wallet to GoDark account\nAccount: ${account.email}\nTimestamp: ${Date.now()}`;
        const isValid = await this.verifySignature(walletAddress, message, signature);
        
        if (!isValid) {
            throw new Error('Invalid signature');
        }
        
        // 5. Link wallet
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: {
                    linkedWallet: walletAddress,
                    walletLinkedAt: Date.now()
                }
            }
        );
        
        // 6. Create vault if doesn't exist
        await this.createVaultIfNeeded(walletAddress);
    }
    
    async unlinkWallet(accountId: string, password: string, twoFactorToken?: string): Promise<void> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        // Verify password
        const passwordValid = await bcrypt.compare(password, account.passwordHash);
        if (!passwordValid) {
            throw new Error('Invalid password');
        }
        
        // Verify 2FA if enabled
        if (account.twoFactorEnabled) {
            if (!twoFactorToken) {
                throw new Error('2FA code required');
            }
            const twoFactorValid = await this.twoFactorAuth.verifyTwoFactorToken(accountId, twoFactorToken);
            if (!twoFactorValid) {
                throw new Error('Invalid 2FA code');
            }
        }
        
        // Check for open positions
        const openPositions = await this.getOpenPositions(account.linkedWallet);
        if (openPositions.length > 0) {
            throw new Error('Close all positions before unlinking wallet');
        }
        
        // Unlink wallet
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $unset: {
                    linkedWallet: '',
                    walletLinkedAt: ''
                }
            }
        );
    }
    
    private async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
        try {
            const publicKey = new PublicKey(address);
            const messageBytes = new TextEncoder().encode(message);
            const signatureBytes = bs58.decode(signature);
            
            return nacl.sign.detached.verify(
                messageBytes,
                signatureBytes,
                publicKey.toBytes()
            );
        } catch (error) {
            return false;
        }
    }
}
```

---

### Session Management (JWT Tokens)

```typescript
interface JWTPayload {
    accountId: string;
    email: string;
    walletAddress?: string;
    role: string;
    iat: number;      // Issued at
    exp: number;      // Expiry
}

class SessionManager {
    private readonly JWT_SECRET = process.env.JWT_SECRET;
    private readonly ACCESS_TOKEN_EXPIRY = 15 * 60; // 15 minutes
    private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days
    
    async createSession(accountId: string): Promise<SessionTokens> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        // Create access token
        const accessToken = jwt.sign(
            {
                accountId: account._id,
                email: account.email,
                walletAddress: account.linkedWallet,
                role: 'USER'
            },
            this.JWT_SECRET,
            { expiresIn: this.ACCESS_TOKEN_EXPIRY }
        );
        
        // Create refresh token
        const refreshToken = crypto.randomBytes(32).toString('hex');
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
        
        // Store refresh token
        await db.refreshTokens.insert({
            accountId: account._id,
            tokenHash: refreshTokenHash,
            createdAt: Date.now(),
            expiresAt: Date.now() + (this.REFRESH_TOKEN_EXPIRY * 1000),
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent()
        });
        
        return {
            accessToken,
            refreshToken,
            expiresIn: this.ACCESS_TOKEN_EXPIRY
        };
    }
    
    async refreshAccessToken(refreshToken: string): Promise<string> {
        // Find matching refresh token
        const tokens = await db.refreshTokens.find({ 
            expiresAt: { $gt: Date.now() } 
        });
        
        let matchedToken = null;
        for (const token of tokens) {
            if (await bcrypt.compare(refreshToken, token.tokenHash)) {
                matchedToken = token;
                break;
            }
        }
        
        if (!matchedToken) {
            throw new Error('Invalid refresh token');
        }
        
        // Get account
        const account = await db.accounts.findOne({ _id: matchedToken.accountId });
        
        // Create new access token
        const accessToken = jwt.sign(
            {
                accountId: account._id,
                email: account.email,
                walletAddress: account.linkedWallet,
                role: 'USER'
            },
            this.JWT_SECRET,
            { expiresIn: this.ACCESS_TOKEN_EXPIRY }
        );
        
        return accessToken;
    }
    
    async revokeSession(refreshToken: string): Promise<void> {
        const tokens = await db.refreshTokens.find({});
        
        for (const token of tokens) {
            if (await bcrypt.compare(refreshToken, token.tokenHash)) {
                await db.refreshTokens.deleteOne({ _id: token._id });
                return;
            }
        }
    }
    
    async revokeAllSessions(accountId: string): Promise<void> {
        await db.refreshTokens.deleteMany({ accountId });
    }
    
    verifyAccessToken(token: string): JWTPayload {
        try {
            return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
```

---

### API Key Generation and Management

```typescript
interface APIKey {
    id: string;
    accountId: string;
    name: string;
    apiKey: string;           // Public
    secretKeyHash: string;    // Hashed
    passphrase: string;       // User-provided
    ipWhitelist: string[];
    permissions: string[];
    createdAt: number;
    lastUsedAt: number;
    expiresAt?: number;
    isActive: boolean;
}

class APIKeyManager {
    async generateAPIKey(accountId: string, config: APIKeyConfig): Promise<APIKeyCredentials> {
        // 1. Validate API key limit (max 5 per account)
        const existingKeys = await db.apiKeys.count({ accountId, isActive: true });
        if (existingKeys >= 5) {
            throw new Error('Maximum 5 API keys per account');
        }
        
        // 2. Generate credentials
        const apiKey = `gq_${crypto.randomBytes(16).toString('hex')}`;
        const secretKey = crypto.randomBytes(32).toString('hex');
        const secretKeyHash = await bcrypt.hash(secretKey, 12);
        
        // 3. Validate passphrase
        if (!config.passphrase || config.passphrase.length < 8) {
            throw new Error('Passphrase must be at least 8 characters');
        }
        
        // 4. Store API key
        const keyRecord: APIKey = {
            id: crypto.randomUUID(),
            accountId,
            name: config.name,
            apiKey,
            secretKeyHash,
            passphrase: config.passphrase,
            ipWhitelist: config.ipWhitelist || [],
            permissions: config.permissions || ['READ', 'TRADE'],
            createdAt: Date.now(),
            lastUsedAt: null,
            expiresAt: config.expiresAt,
            isActive: true
        };
        
        await db.apiKeys.insert(keyRecord);
        
        // 5. Return credentials (secret shown only once)
        return {
            apiKey,
            secretKey, // ⚠️ Show only once
            passphrase: config.passphrase,
            permissions: keyRecord.permissions
        };
    }
    
    async authenticateAPIRequest(apiKey: string, signature: string, timestamp: number): Promise<APIKey> {
        // 1. Find API key
        const keyRecord = await db.apiKeys.findOne({ apiKey, isActive: true });
        if (!keyRecord) {
            throw new Error('Invalid API key');
        }
        
        // 2. Check expiry
        if (keyRecord.expiresAt && Date.now() > keyRecord.expiresAt) {
            throw new Error('API key expired');
        }
        
        // 3. Check timestamp (prevent replay attacks)
        const now = Date.now();
        if (Math.abs(now - timestamp) > 5000) { // 5 second window
            throw new Error('Request timestamp too old');
        }
        
        // 4. Verify IP whitelist
        if (keyRecord.ipWhitelist.length > 0) {
            const clientIP = this.getClientIP();
            if (!keyRecord.ipWhitelist.includes(clientIP)) {
                throw new Error('IP address not whitelisted');
            }
        }
        
        // 5. Verify signature
        // Expected format: HMAC-SHA256(timestamp + method + path + body, secretKey)
        const message = `${timestamp}${this.method}${this.path}${this.body}`;
        
        // We can't directly verify without the secret, so we check against stored hash
        // In practice, secret would be stored encrypted and decrypted for verification
        const isValid = await this.verifyHMAC(message, signature, keyRecord.secretKeyHash);
        
        if (!isValid) {
            throw new Error('Invalid signature');
        }
        
        // 6. Update last used
        await db.apiKeys.updateOne(
            { _id: keyRecord.id },
            { $set: { lastUsedAt: Date.now() } }
        );
        
        return keyRecord;
    }
    
    async updateAPIKey(keyId: string, updates: Partial<APIKey>): Promise<void> {
        // Only allow updating: name, ipWhitelist, permissions
        const allowedUpdates = ['name', 'ipWhitelist', 'permissions'];
        const filteredUpdates = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});
        
        await db.apiKeys.updateOne(
            { id: keyId },
            { $set: filteredUpdates }
        );
    }
    
    async deleteAPIKey(keyId: string, accountId: string, password: string): Promise<void> {
        // Verify password
        const account = await db.accounts.findOne({ _id: accountId });
        const passwordValid = await bcrypt.compare(password, account.passwordHash);
        
        if (!passwordValid) {
            throw new Error('Invalid password');
        }
        
        // Soft delete (deactivate)
        await db.apiKeys.updateOne(
            { id: keyId, accountId },
            { 
                $set: { 
                    isActive: false,
                    deletedAt: Date.now()
                } 
            }
        );
    }
}
```

---

### Password Reset and Account Recovery

```typescript
class PasswordReset {
    async requestPasswordReset(email: string): Promise<void> {
        const account = await db.accounts.findOne({ email: email.toLowerCase() });
        
        // Don't reveal if email exists
        if (!account) {
            return;
        }
        
        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = await bcrypt.hash(resetToken, 10);
        const resetExpiry = Date.now() + (1 * 60 * 60 * 1000); // 1 hour
        
        // Store reset token
        await db.accounts.updateOne(
            { _id: account._id },
            {
                $set: {
                    resetToken: resetTokenHash,
                    resetExpiry
                }
            }
        );
        
        // Send reset email
        const resetLink = `https://app.godark.xyz/reset-password?token=${resetToken}`;
        await this.emailService.send({
            to: email,
            subject: 'Reset your GoDark password',
            template: 'password-reset',
            data: { resetLink, expiryHours: 1 }
        });
    }
    
    async resetPassword(token: string, newPassword: string): Promise<void> {
        // Find account with valid token
        const accounts = await db.accounts.find({
            resetExpiry: { $gt: Date.now() }
        });
        
        let matchedAccount = null;
        for (const account of accounts) {
            if (account.resetToken && await bcrypt.compare(token, account.resetToken)) {
                matchedAccount = account;
                break;
            }
        }
        
        if (!matchedAccount) {
            throw new Error('Invalid or expired reset token');
        }
        
        // Validate new password
        this.validatePassword(newPassword);
        
        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 12);
        
        // Update password
        await db.accounts.updateOne(
            { _id: matchedAccount._id },
            {
                $set: { passwordHash },
                $unset: { resetToken: '', resetExpiry: '' }
            }
        );
        
        // Revoke all sessions
        await this.sessionManager.revokeAllSessions(matchedAccount._id);
        
        // Send confirmation email
        await this.emailService.send({
            to: matchedAccount.email,
            subject: 'Your password has been reset',
            template: 'password-reset-confirmation'
        });
    }
}
```

---

### Account Deletion Process

```typescript
class AccountDeletion {
    async requestAccountDeletion(accountId: string, password: string, reason?: string): Promise<void> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        // Verify password
        const passwordValid = await bcrypt.compare(password, account.passwordHash);
        if (!passwordValid) {
            throw new Error('Invalid password');
        }
        
        // Check for open positions
        if (account.linkedWallet) {
            const openPositions = await this.getOpenPositions(account.linkedWallet);
            if (openPositions.length > 0) {
                throw new Error('Close all positions before deleting account');
            }
            
            // Check for locked funds
            const vault = await this.getVault(account.linkedWallet);
            if (vault.used_amount > 0) {
                throw new Error('Withdraw all funds before deleting account');
            }
        }
        
        // Mark for deletion (7-day grace period)
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: {
                    status: 'PENDING_DELETION',
                    deletionRequestedAt: Date.now(),
                    deletionScheduledFor: Date.now() + (7 * 24 * 60 * 60 * 1000),
                    deletionReason: reason
                }
            }
        );
        
        // Send confirmation email
        await this.emailService.send({
            to: account.email,
            subject: 'Account deletion scheduled',
            template: 'account-deletion-scheduled',
            data: {
                deletionDate: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)),
                cancelLink: 'https://app.godark.xyz/cancel-deletion'
            }
        });
    }
    
    async cancelAccountDeletion(accountId: string): Promise<void> {
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: { status: 'ACTIVE' },
                $unset: {
                    deletionRequestedAt: '',
                    deletionScheduledFor: '',
                    deletionReason: ''
                }
            }
        );
    }
    
    async executeAccountDeletion(accountId: string): Promise<void> {
        const account = await db.accounts.findOne({ _id: accountId });
        
        if (account.status !== 'PENDING_DELETION') {
            throw new Error('Account not scheduled for deletion');
        }
        
        if (Date.now() < account.deletionScheduledFor) {
            throw new Error('Deletion grace period not elapsed');
        }
        
        // 1. Anonymize personal data
        await db.accounts.updateOne(
            { _id: accountId },
            {
                $set: {
                    email: `deleted_${accountId}@deleted.local`,
                    status: 'DELETED',
                    deletedAt: Date.now()
                },
                $unset: {
                    passwordHash: '',
                    twoFactorSecret: '',
                    backupCodes: '',
                    linkedWallet: '',
                    resetToken: '',
                    verificationToken: ''
                }
            }
        );
        
        // 2. Delete API keys
        await db.apiKeys.deleteMany({ accountId });
        
        // 3. Delete sessions
        await db.refreshTokens.deleteMany({ accountId });
        
        // 4. Anonymize trade history (keep for analytics)
        await db.trades.updateMany(
            { userId: accountId },
            { $set: { userId: 'DELETED_USER' } }
        );
        
        // 5. Delete vault if exists
        if (account.linkedWallet) {
            await this.cleanupVault(account.linkedWallet);
        }
    }
}
```

---

### Activity Logging

```typescript
interface ActivityLog {
    accountId: string;
    action: string;
    timestamp: number;
    ipAddress: string;
    userAgent: string;
    deviceInfo: DeviceInfo;
    location?: GeoLocation;
    success: boolean;
    metadata?: any;
}

class ActivityLogger {
    async logActivity(accountId: string, action: string, metadata?: any): Promise<void> {
        const log: ActivityLog = {
            accountId,
            action,
            timestamp: Date.now(),
            ipAddress: this.getClientIP(),
            userAgent: this.getUserAgent(),
            deviceInfo: this.parseDeviceInfo(),
            location: await this.getGeoLocation(this.getClientIP()),
            success: true,
            metadata
        };
        
        await db.activityLogs.insert(log);
        
        // Check for suspicious activity
        await this.checkSuspiciousActivity(accountId, log);
    }
    
    async getLastLogin(accountId: string): Promise<ActivityLog> {
        return await db.activityLogs.findOne(
            { accountId, action: 'LOGIN', success: true },
            { sort: { timestamp: -1 } }
        );
    }
    
    async getRecentActivity(accountId: string, limit: number = 20): Promise<ActivityLog[]> {
        return await db.activityLogs.find(
            { accountId },
            { sort: { timestamp: -1 }, limit }
        );
    }
    
    private async checkSuspiciousActivity(accountId: string, log: ActivityLog): Promise<void> {
        // Check for multiple failed login attempts
        if (log.action === 'LOGIN' && !log.success) {
            const recentFailed = await db.activityLogs.count({
                accountId,
                action: 'LOGIN',
                success: false,
                timestamp: { $gt: Date.now() - (15 * 60 * 1000) } // Last 15 min
            });
            
            if (recentFailed >= 5) {
                await this.lockAccount(accountId, '15 minutes');
                await this.alertUser(accountId, 'ACCOUNT_LOCKED');
            }
        }
        
        // Check for login from new location
        const recentLogins = await db.activityLogs.find({
            accountId,
            action: 'LOGIN',
            success: true,
            timestamp: { $gt: Date.now() - (30 * 24 * 60 * 60 * 1000) } // Last 30 days
        });
        
        const knownLocations = recentLogins.map(l => l.location?.country);
        
        if (log.location && !knownLocations.includes(log.location.country)) {
            await this.alertUser(accountId, 'NEW_LOCATION_LOGIN', { location: log.location });
        }
    }
}
```

---


