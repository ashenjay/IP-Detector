// Service Factory for Threat Intelligence APIs
// Provides services for checking IP reputation and threat intelligence
import { CONFIG } from '../config/environment';

export interface VirusTotalStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout: number;
}

export interface VirusTotalResponse {
  data: {
    attributes: {
      last_analysis_stats: VirusTotalStats;
      country?: string;
      network?: string;
      as_owner?: string;
      reputation?: number;
    };
  };
}

class VirusTotalService {
  async checkIP(ip: string): Promise<VirusTotalResponse | null> {
    try {
      // Make API call to backend which will proxy to VirusTotal
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${CONFIG.apiEndpoint}/ip-entries/check/${ip}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform backend response to match VirusTotal format
        if (data.vtReputation) {
          return {
            data: {
              attributes: {
                last_analysis_stats: data.vtReputation.detectionStats || {
                  harmless: 0,
                  malicious: 0,
                  suspicious: 0,
                  undetected: 0,
                  timeout: 0
                },
                country: data.vtReputation.country,
                network: data.vtReputation.network,
                as_owner: data.vtReputation.asOwner,
                reputation: data.vtReputation.reputation
              }
            }
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error('VirusTotal API error:', error);
      return null;
    }
  }

  calculateMaliciousPercentage(stats: VirusTotalStats): number {
    const total = stats.harmless + stats.malicious + stats.suspicious + stats.undetected;
    
    if (total === 0) {
      return 0;
    }
    
    // Calculate percentage of malicious detections
    const maliciousPercentage = Math.round((stats.malicious / total) * 100);
    
    return maliciousPercentage;
  }
}

// Export singleton instance
export const virusTotalService = new VirusTotalService();