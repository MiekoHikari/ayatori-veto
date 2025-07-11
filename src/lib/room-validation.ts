import crypto from 'crypto';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class RoomValidation {
    // Validate maps selection
    static validateMaps(maps: string[], roundType: string): ValidationResult {
        const errors: string[] = [];

        // Available maps (should match your frontend map IDs)
        const availableMaps = [
            'area88', 'base404', 'cauchy_street', 'cosmite',
            'ocarnus', 'port_euler', 'space_lab', 'windy_town'
        ];

        // Check minimum maps based on round type
        const minMapsRequired = {
            'bo1': 3, // At least 3 for ban-ban-pick
            'bo3': 7, // Full veto process
            'bo5': 7, // Full veto process
        };

        const minRequired = minMapsRequired[roundType as keyof typeof minMapsRequired] || 7;

        if (maps.length < minRequired) {
            errors.push(`Minimum ${minRequired} maps required for ${roundType.toUpperCase()}`);
        }

        if (maps.length > availableMaps.length) {
            errors.push(`Maximum ${availableMaps.length} maps allowed`);
        }

        // Check if all selected maps are valid
        const invalidMaps = maps.filter(map => !availableMaps.includes(map));
        if (invalidMaps.length > 0) {
            errors.push(`Invalid maps: ${invalidMaps.join(', ')}`);
        }

        // Check for duplicates
        const uniqueMaps = new Set(maps);
        if (uniqueMaps.size !== maps.length) {
            errors.push('Duplicate maps are not allowed');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    // Validate round type
    static validateRoundType(roundType: string): ValidationResult {
        const errors: string[] = [];
        const validRoundTypes = ['bo1', 'bo3', 'bo5'];

        if (!validRoundTypes.includes(roundType)) {
            errors.push(`Invalid round type. Must be one of: ${validRoundTypes.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    // Generate cryptographically secure room ID
    static generateSecureRoomId(length = 8): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const randomBytes = crypto.randomBytes(length);
        let result = '';

        for (let i = 0; i < length; i++) {
            result += chars[randomBytes[i]! % chars.length];
        }

        return result;
    }

    // Validate room expiration
    static validateExpiration(expiresAt: string): ValidationResult {
        const errors: string[] = [];
        const expiration = new Date(expiresAt);
        const now = new Date();
        const maxDuration = 24 * 60 * 60 * 1000; // 24 hours
        const minDuration = 30 * 60 * 1000; // 30 minutes

        if (isNaN(expiration.getTime())) {
            errors.push('Invalid expiration date format');
            return { isValid: false, errors };
        }

        if (expiration <= now) {
            errors.push('Expiration date must be in the future');
        }

        const duration = expiration.getTime() - now.getTime();

        if (duration < minDuration) {
            errors.push('Room must be valid for at least 30 minutes');
        }

        if (duration > maxDuration) {
            errors.push('Room cannot be valid for more than 24 hours');
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }

    // Validate complete room creation request
    static validateRoomCreation(data: {
        maps: string[];
        roundType: string;
        expiresAt: string;
    }): ValidationResult {
        const errors: string[] = [];

        const mapValidation = this.validateMaps(data.maps, data.roundType);
        const roundTypeValidation = this.validateRoundType(data.roundType);
        const expirationValidation = this.validateExpiration(data.expiresAt);

        errors.push(...mapValidation.errors);
        errors.push(...roundTypeValidation.errors);
        errors.push(...expirationValidation.errors);

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}

// Security utilities
export class SecurityUtils {
    // Hash IP for privacy-preserving rate limiting
    static hashIp(ip: string): string {
        return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
    }

    // Generate unique room links with proper entropy
    static generateRoomLinks(baseUrl: string) {
        const masterRoomId = RoomValidation.generateSecureRoomId(8);
        const teamAId = RoomValidation.generateSecureRoomId(8);
        const teamBId = RoomValidation.generateSecureRoomId(8);

        return {
            masterRoomId,
            teamAId,
            teamBId,
            teamALink: `${baseUrl}/${teamAId}`,
            teamBLink: `${baseUrl}/${teamBId}`,
            spectatorLink: `${baseUrl}/${masterRoomId}`,
        };
    }

    // Validate user session for authenticated rate limiting
    static getUserIdentifier(userId?: string, ip?: string): string {
        if (userId) {
            return `user:${userId}`;
        }
        if (ip) {
            return `ip:${this.hashIp(ip)}`;
        }
        return 'anonymous';
    }
}
