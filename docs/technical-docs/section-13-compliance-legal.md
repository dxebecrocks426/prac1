## 13. Compliance & Legal

### Geo-Restrictions

GoDark implements comprehensive geographic restrictions to comply with regulatory requirements and reduce legal risk.

#### Restricted Regions

**Complete List of Blocked Jurisdictions:**

**North America:**
- United States (all states and territories)
- Canada: Quebec and Ontario only

**Central and South America:**
- Bolivia
- Ecuador
- Cuba

**Europe:**
- United Kingdom
- France
- Belarus
- Russia
- Ukraine (entire country)
- Crimea (UA-40)
- Donetsk (UA-14)
- Luhansk (UA-09)

**Asia:**
- China (mainland, excluding Hong Kong and Macau)
- North Korea
- Iran
- Iraq
- Syria
- Bangladesh
- Myanmar
- Nepal

**Africa:**
- Algeria
- Morocco
- Egypt

---

### IP Blocking Implementation

#### Geographic Detection Service

```typescript
import axios from 'axios';
import { LRUCache } from 'lru-cache';

class GeoRestrictionService {
    private geoCache: LRUCache<string, GeoLocation>;
    private blockedCountries: Set<string>;
    private blockedRegions: Set<string>;
    
    constructor() {
        this.geoCache = new LRUCache({ max: 10000, ttl: 3600000 }); // 1 hour
        
        this.blockedCountries = new Set([
            'US', 'CA-QC', 'CA-ON', 'BO', 'EC', 'CU',
            'GB', 'FR', 'BY', 'RU', 'UA',
            'CN', 'KP', 'IR', 'IQ', 'SY', 'BD', 'MM', 'NP',
            'DZ', 'MA', 'EG'
        ]);
        
        this.blockedRegions = new Set([
            'UA-40',  // Crimea
            'UA-14',  // Donetsk
            'UA-09'   // Luhansk
        ]);
    }
    
    async checkAccess(ip: string): Promise<AccessCheckResult> {
        // 1. Check cache
        let geo = this.geoCache.get(ip);
        
        // 2. Lookup if not cached
        if (!geo) {
            geo = await this.lookupGeoLocation(ip);
            this.geoCache.set(ip, geo);
        }
        
        // 3. Check if blocked
        const isBlocked = this.isRestricted(geo);
        
        // 4. Check for VPN/Proxy
        const isVPN = await this.detectVPN(ip);
        
        // 5. Log attempt if blocked
        if (isBlocked || isVPN) {
            await this.logBlockedAccess(ip, geo, isVPN);
        }
        
        return {
            allowed: !isBlocked && !isVPN,
            country: geo.country,
            region: geo.region,
            isVPN,
            reason: isBlocked ? 'RESTRICTED_REGION' : (isVPN ? 'VPN_DETECTED' : null)
        };
    }
    
    private async lookupGeoLocation(ip: string): Promise<GeoLocation> {
        try {
            // Use MaxMind GeoIP2 or similar service
            const response = await axios.get(`https://geoip.maxmind.com/geoip/v2.1/city/${ip}`, {
                auth: {
                    username: process.env.MAXMIND_ACCOUNT_ID,
                    password: process.env.MAXMIND_LICENSE_KEY
                }
            });
            
            return {
                ip,
                country: response.data.country.iso_code,
                region: response.data.subdivisions?.[0]?.iso_code,
                city: response.data.city?.names?.en,
                latitude: response.data.location.latitude,
                longitude: response.data.location.longitude,
                timestamp: Date.now()
            };
        } catch (error) {
            // Fallback to IP-API (free tier)
            const response = await axios.get(`http://ip-api.com/json/${ip}`);
            return {
                ip,
                country: response.data.countryCode,
                region: response.data.region,
                city: response.data.city,
                latitude: response.data.lat,
                longitude: response.data.lon,
                timestamp: Date.now()
            };
        }
    }
    
    private isRestricted(geo: GeoLocation): boolean {
        // Check country-level restriction
        if (this.blockedCountries.has(geo.country)) {
            return true;
        }
        
        // Check region-level restriction
        const regionCode = `${geo.country}-${geo.region}`;
        if (this.blockedRegions.has(regionCode)) {
            return true;
        }
        
        return false;
    }
    
    private async detectVPN(ip: string): Promise<boolean> {
        try {
            // Use IPQualityScore or similar VPN detection service
            const response = await axios.get(`https://ipqualityscore.com/api/json/ip/${process.env.IPQS_KEY}/${ip}`, {
                params: {
                    strictness: 1,
                    allow_public_access_points: true
                }
            });
            
            return response.data.vpn || 
                   response.data.tor || 
                   response.data.proxy ||
                   response.data.bot_status;
        } catch (error) {
            // Don't block on detection service failure
            console.error('VPN detection failed:', error);
            return false;
        }
    }
    
    private async logBlockedAccess(ip: string, geo: GeoLocation, isVPN: boolean): Promise<void> {
        await db.blockedAccess.insert({
            ip,
            country: geo.country,
            region: geo.region,
            city: geo.city,
            isVPN,
            timestamp: Date.now(),
            userAgent: this.getUserAgent()
        });
    }
}
```

#### Middleware Implementation

```typescript
// Express middleware for geo-restriction
export function geoRestrictionMiddleware(geoService: GeoRestrictionService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const ip = req.ip || req.socket.remoteAddress;
        
        // Skip check for health endpoints
        if (req.path === '/health' || req.path === '/status') {
            return next();
        }
        
        try {
            const accessCheck = await geoService.checkAccess(ip);
            
            if (!accessCheck.allowed) {
                return res.status(451).json({
                    error: 'REGION_RESTRICTED',
                    message: 'Access to GoDark is not available in your region',
                    country: accessCheck.country,
                    reason: accessCheck.reason
                });
            }
            
            // Attach geo info to request
            req.geo = accessCheck;
            next();
        } catch (error) {
            // Log error but don't block user on detection failure
            console.error('Geo-restriction check failed:', error);
            next();
        }
    };
}
```

---

### VPN/Proxy Detection

#### Multi-Layer Detection

```typescript
class VPNDetection {
    private readonly DETECTION_SERVICES = [
        'IPQualityScore',
        'IPHub',
        'VPNBlocker'
    ];
    
    async detectVPN(ip: string): Promise<VPNDetectionResult> {
        // Run multiple detection services in parallel
        const results = await Promise.allSettled([
            this.checkIPQS(ip),
            this.checkIPHub(ip),
            this.checkVPNBlocker(ip)
        ]);
        
        // Count positive detections
        const positiveDetections = results.filter(
            r => r.status === 'fulfilled' && r.value === true
        ).length;
        
        // Require 2+ services to agree
        const isVPN = positiveDetections >= 2;
        
        return {
            isVPN,
            confidence: positiveDetections / results.length,
            services: results.map((r, i) => ({
                service: this.DETECTION_SERVICES[i],
                result: r.status === 'fulfilled' ? r.value : 'error'
            }))
        };
    }
    
    private async checkIPQS(ip: string): Promise<boolean> {
        const response = await axios.get(
            `https://ipqualityscore.com/api/json/ip/${process.env.IPQS_KEY}/${ip}`
        );
        
        return response.data.vpn || 
               response.data.tor || 
               response.data.proxy;
    }
    
    private async checkIPHub(ip: string): Promise<boolean> {
        const response = await axios.get(`https://v2.api.iphub.info/ip/${ip}`, {
            headers: { 'X-Key': process.env.IPHUB_KEY }
        });
        
        // block = 1 means VPN/proxy
        return response.data.block === 1;
    }
    
    private async checkVPNBlocker(ip: string): Promise<boolean> {
        const response = await axios.get(
            `https://vpnblocker.net/api/check/${ip}`,
            { params: { key: process.env.VPNBLOCKER_KEY } }
        );
        
        return response.data.host === 'true';
    }
}
```

#### Allowlist for Known Good IPs

```typescript
// Some legitimate users may use corporate VPNs
class IPAllowlist {
    private allowlist: Set<string>;
    
    async isAllowlisted(ip: string): Promise<boolean> {
        // Check if IP is in allowlist
        if (this.allowlist.has(ip)) {
            return true;
        }
        
        // Check if user has been manually verified
        const user = await this.getUserByIP(ip);
        if (user?.vpnVerified) {
            return true;
        }
        
        return false;
    }
    
    async requestAllowlist(userId: string, ip: string, reason: string): Promise<void> {
        await db.allowlistRequests.insert({
            userId,
            ip,
            reason,
            status: 'PENDING',
            requestedAt: Date.now()
        });
        
        // Notify admin team for review
        await this.notifyAdminTeam({
            type: 'ALLOWLIST_REQUEST',
            userId,
            ip,
            reason
        });
    }
}
```

---

### KYC Requirements

#### Risk-Based KYC Approach

```typescript
interface KYCRequirement {
    level: 'NONE' | 'BASIC' | 'ENHANCED';
    triggers: string[];
    documentation: string[];
    verificationTime: string;
}

const KYC_TIERS: KYCRequirement[] = [
    {
        level: 'NONE',
        triggers: [
            'Volume < $10,000/month',
            'Balance < $5,000'
        ],
        documentation: [],
        verificationTime: 'N/A'
    },
    {
        level: 'BASIC',
        triggers: [
            'Volume $10,000 - $100,000/month',
            'Balance > $5,000',
            'First withdrawal > $5,000'
        ],
        documentation: [
            'Government ID',
            'Proof of address',
            'Selfie verification'
        ],
        verificationTime: '24-48 hours'
    },
    {
        level: 'ENHANCED',
        triggers: [
            'Volume > $100,000/month',
            'Balance > $50,000',
            'Suspicious activity flagged'
        ],
        documentation: [
            'All BASIC requirements',
            'Source of funds',
            'Bank statements',
            'Tax returns (optional)',
            'Video verification call'
        ],
        verificationTime: '5-7 business days'
    }
];

class KYCService {
    async checkKYCRequirement(userId: string): Promise<KYCRequirement> {
        const user = await db.accounts.findOne({ _id: userId });
        const stats = await this.getUserStats(userId);
        
        // Check triggers for enhanced KYC
        if (stats.monthlyVolume > 100000 || stats.currentBalance > 50000) {
            return KYC_TIERS.find(t => t.level === 'ENHANCED');
        }
        
        // Check triggers for basic KYC
        if (stats.monthlyVolume > 10000 || stats.currentBalance > 5000) {
            return KYC_TIERS.find(t => t.level === 'BASIC');
        }
        
        // No KYC required
        return KYC_TIERS.find(t => t.level === 'NONE');
    }
    
    async enforceKYCRequirement(userId: string): Promise<void> {
        const requirement = await this.checkKYCRequirement(userId);
        const user = await db.accounts.findOne({ _id: userId });
        
        if (requirement.level === 'NONE') {
            return; // No action needed
        }
        
        if (user.kycLevel < requirement.level) {
            // Restrict certain actions until KYC completed
            await this.restrictUser(userId, {
                canDeposit: true,
                canTrade: requirement.level === 'BASIC', // Allow trading for BASIC
                canWithdraw: false, // No withdrawal until verified
                reason: `${requirement.level} KYC required`
            });
            
            // Notify user
            await this.notifyKYCRequired(userId, requirement);
        }
    }
}
```

#### KYC Provider Integration

```typescript
// Integration with Persona, Onfido, or similar
class KYCProvider {
    async createVerificationSession(userId: string): Promise<string> {
        const response = await axios.post('https://api.withpersona.com/api/v1/inquiries', {
            data: {
                type: 'inquiry',
                attributes: {
                    'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
                    'reference-id': userId
                }
            }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
                'Persona-Version': '2023-01-05'
            }
        });
        
        return response.data.data.attributes['session-token'];
    }
    
    async checkVerificationStatus(userId: string): Promise<KYCStatus> {
        const response = await axios.get(
            `https://api.withpersona.com/api/v1/inquiries?filter[reference-id]=${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`
                }
            }
        );
        
        const inquiry = response.data.data[0];
        
        return {
            status: inquiry.attributes.status,
            level: this.mapStatusToLevel(inquiry.attributes.status),
            completedAt: inquiry.attributes['completed-at'],
            fields: inquiry.attributes.fields
        };
    }
}
```

---

### Terms of Service Integration

#### Acceptance Tracking

```typescript
interface TOSAcceptance {
    userId: string;
    version: string;
    acceptedAt: number;
    ipAddress: string;
    userAgent: string;
}

class TOSService {
    private readonly CURRENT_VERSION = 'v1.0';
    
    async requireAcceptance(userId: string): Promise<boolean> {
        const latestAcceptance = await db.tosAcceptances.findOne(
            { userId },
            { sort: { acceptedAt: -1 } }
        );
        
        // Check if user has accepted current version
        if (!latestAcceptance || latestAcceptance.version !== this.CURRENT_VERSION) {
            return true; // Acceptance required
        }
        
        return false;
    }
    
    async recordAcceptance(userId: string, ip: string, userAgent: string): Promise<void> {
        await db.tosAcceptances.insert({
            userId,
            version: this.CURRENT_VERSION,
            acceptedAt: Date.now(),
            ipAddress: ip,
            userAgent
        });
        
        // Update user account
        await db.accounts.updateOne(
            { _id: userId },
            { $set: { tosAccepted: true, tosVersion: this.CURRENT_VERSION } }
        );
    }
    
    async notifyTOSUpdate(version: string): Promise<void> {
        // Get all active users
        const users = await db.accounts.find({ status: 'ACTIVE' });
        
        for (const user of users) {
            // Send email notification
            await this.emailService.send({
                to: user.email,
                subject: 'Updated Terms of Service',
                template: 'tos-update',
                data: {
                    version,
                    changesUrl: `https://godark.xyz/legal/tos/${version}/changes`,
                    acceptUrl: `https://app.godark.xyz/accept-tos`
                }
            });
        }
    }
}
```

#### TOS Content

```markdown
# GoDark DEX Terms of Service

Last Updated: [DATE]
Version: v1.0

## 1. Acceptance of Terms

By accessing or using GoDark DEX, you agree to be bound by these Terms of Service...

## 2. Eligibility

You must:
- Be at least 18 years old
- Not be a resident of restricted jurisdictions
- Comply with all applicable laws
- Not use VPN to circumvent geo-restrictions

## 3. Risks

Trading perpetual futures involves significant risk:
- High leverage can result in total loss of funds
- Prices are volatile and unpredictable
- Platform may experience downtime or technical issues
- Smart contracts may contain undiscovered vulnerabilities

## 4. Non-Custodial Nature

- You maintain control of your private keys
- GoDark cannot recover lost keys
- You are responsible for securing your account

## 5. Fees

- Trading fees as disclosed on the platform
- Funding rates paid/received hourly
- Network transaction fees (gas)

## 6. Prohibited Activities

You may not:
- Manipulate markets
- Engage in wash trading
- Use automated systems without approval
- Circumvent security measures

## 7. Limitation of Liability

GoDark is provided "as is" without warranties...

## 8. Dispute Resolution

Any disputes shall be resolved through binding arbitration...

[Full terms continue...]
```

---

### Data Privacy and GDPR Considerations

#### Privacy Policy

```typescript
interface PrivacyCompliance {
    dataCollected: string[];
    purpose: string;
    retention: string;
    sharing: string[];
    userRights: string[];
}

const PRIVACY_POLICY: PrivacyCompliance = {
    dataCollected: [
        'Email address',
        'Wallet address',
        'IP address',
        'Trading activity',
        'Device information',
        'KYC documents (if applicable)'
    ],
    purpose: 'Provide trading services, comply with regulations, prevent fraud',
    retention: '7 years (regulatory requirement)',
    sharing: [
        'Service providers (hosting, KYC)',
        'Law enforcement (if required)',
        'Never sold to third parties'
    ],
    userRights: [
        'Access your data',
        'Correct inaccurate data',
        'Delete your data (with limitations)',
        'Export your data',
        'Opt-out of marketing'
    ]
};
```

#### Data Export

```typescript
class DataExportService {
    async exportUserData(userId: string): Promise<UserDataExport> {
        const user = await db.accounts.findOne({ _id: userId });
        const orders = await db.orders.find({ user_id: userId });
        const trades = await db.trades.find({
            $or: [{ buyer_id: userId }, { seller_id: userId }]
        });
        const positions = await db.positions.find({ user_id: userId });
        
        return {
            account: {
                email: user.email,
                createdAt: user.created_at,
                kycLevel: user.kyc_level
            },
            orders: orders.map(o => ({
                id: o.id,
                symbol: o.symbol,
                side: o.side,
                size: o.size,
                price: o.price,
                timestamp: o.created_at
            })),
            trades: trades.map(t => ({
                id: t.id,
                symbol: t.symbol,
                price: t.price,
                size: t.size,
                fee: t.fee,
                timestamp: t.executed_at
            })),
            positions: positions.map(p => ({
                symbol: p.symbol,
                size: p.size,
                entryPrice: p.entry_price,
                realizedPnl: p.realized_pnl,
                openedAt: p.open_timestamp
            }))
        };
    }
}
```

---

### AML/CTF Compliance Measures

#### Transaction Monitoring

```typescript
class AMLMonitoring {
    async monitorTransaction(transaction: Transaction): Promise<AMLAlert[]> {
        const alerts: AMLAlert[] = [];
        
        // 1. Check transaction amount
        if (transaction.amount > 10000) {
            alerts.push({
                type: 'LARGE_TRANSACTION',
                severity: 'MEDIUM',
                amount: transaction.amount,
                threshold: 10000
            });
        }
        
        // 2. Check rapid succession
        const recentTxs = await this.getRecentTransactions(transaction.userId, 3600);
        if (recentTxs.length > 10) {
            alerts.push({
                type: 'RAPID_TRADING',
                severity: 'LOW',
                count: recentTxs.length,
                timeWindow: '1 hour'
            });
        }
        
        // 3. Check for structuring (breaking up large amounts)
        const dayTxs = await this.getRecentTransactions(transaction.userId, 86400);
        const totalAmount = dayTxs.reduce((sum, tx) => sum + tx.amount, 0);
        if (totalAmount > 50000 && dayTxs.length > 20) {
            alerts.push({
                type: 'POSSIBLE_STRUCTURING',
                severity: 'HIGH',
                totalAmount,
                transactionCount: dayTxs.length
            });
        }
        
        // 4. Check against OFAC sanctions list
        const isSanctioned = await this.checkSanctionsList(transaction.walletAddress);
        if (isSanctioned) {
            alerts.push({
                type: 'SANCTIONED_WALLET',
                severity: 'CRITICAL',
                wallet: transaction.walletAddress
            });
            
            // Immediately freeze account
            await this.freezeAccount(transaction.userId);
        }
        
        return alerts;
    }
    
    private async checkSanctionsList(wallet: string): Promise<boolean> {
        // Check against Chainalysis, TRM Labs, or similar
        try {
            const response = await axios.post('https://api.chainalysis.com/api/risk/v2/entities', {
                address: wallet
            }, {
                headers: { 'X-API-Key': process.env.CHAINALYSIS_KEY }
            });
            
            return response.data.risk === 'severe';
        } catch (error) {
            console.error('Sanctions check failed:', error);
            return false;
        }
    }
}
```

---

### Regulatory Status and Disclaimers

#### Legal Disclaimers

```typescript
const LEGAL_DISCLAIMERS = {
    notSecurities: `
        DARK tokens are utility tokens and are not securities.
        They have not been registered with any securities commission.
    `,
    
    notInvestmentAdvice: `
        Nothing on this platform constitutes investment advice.
        Trading involves substantial risk of loss.
    `,
    
    noGuarantees: `
        Past performance does not guarantee future results.
        GoDark makes no guarantees about profitability.
    `,
    
    technicalRisks: `
        Smart contracts may contain bugs or vulnerabilities.
        The platform may experience downtime or data loss.
    `,
    
    regulatoryRisks: `
        Regulatory status of cryptocurrencies is uncertain and evolving.
        Future regulations may impact the platform's operations.
    `
};
```

---

### Legal Entity Structure

```
GoDark Foundation (Panama)
├── Purpose: Protocol governance and development
├── Structure: Non-profit foundation
└── Assets: DARK token treasury

GoDark Technologies Inc. (Delaware)
├── Purpose: Commercial operations
├── Structure: C-Corporation
└── Services: Platform hosting and support

Subsidiaries (Future):
├── GoDark EU (Estonia) - European operations
├── GoDark Asia (Singapore) - Asian operations
└── GoDark MENA (Dubai) - Middle East operations
```

---

### Regulatory Compliance Roadmap

```typescript
const COMPLIANCE_ROADMAP = {
    phase1: {
        timeline: 'Launch',
        items: [
            'TOS and Privacy Policy',
            'Geo-restrictions',
            'Basic AML monitoring',
            'OFAC sanctions screening'
        ]
    },
    phase2: {
        timeline: 'Month 6',
        items: [
            'Risk-based KYC',
            'Enhanced transaction monitoring',
            'SAR filing procedures',
            'Audit trail implementation'
        ]
    },
    phase3: {
        timeline: 'Month 12',
        items: [
            'MSB registration (if required)',
            'State-by-state licensing review',
            'ISO 27001 certification',
            'SOC 2 Type II audit'
        ]
    },
    phase4: {
        timeline: 'Year 2',
        items: [
            'MiCA compliance (EU)',
            'FCA review (if UK expansion)',
            'MAS license (Singapore)',
            'Full regulatory compliance globally'
        ]
    }
};
```

---


