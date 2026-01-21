/* 
    * BELAFRICA - Plateforme diaspora africaine
    * Copyright © 2025 Rollin Loic Tianga. Tous droits réservés.
    * Code source confidentiel - Usage interdit sans autorisation
    */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeolocationData {
  country: string;
  countryCode: string;
  city?: string;
  region?: string;
  ip?: string;
  isProxy?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private ipApiUrl = 'http://ip-api.com/json';
  private ipifyUrl = 'https://api.ipify.org?format=json';

  constructor(private http: HttpClient) {}

  detectLocation(): Observable<GeolocationData> {
    return new Observable<GeolocationData>(observer => {
      console.log('📍 Début détection géolocalisation...');
      
      this.detectWithBrowser()
        .then(location => {
          console.log('✅ Géolocalisation navigateur:', location);
          observer.next(location);
          observer.complete();
        })
        .catch(browserError => {
          console.warn('⚠️ Géolocalisation navigateur échouée, fallback IP:', browserError);
          
          this.detectWithIP()
            .then(ipLocation => {
              console.log('✅ Géolocalisation IP:', ipLocation);
              observer.next(ipLocation);
              observer.complete();
            })
            .catch(ipError => {
              console.error('❌ Toutes les méthodes ont échoué:', ipError);
              observer.error(new Error('Impossible de détecter votre localisation.'));
            });
        });
    });
  }

  private async detectWithBrowser(): Promise<GeolocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Géolocalisation non supportée'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const location = await this.reverseGeocode(latitude, longitude);
            resolve({
              ...location,
              ip: 'navigator',
              isProxy: false
            });
          } catch (error) {
            reject(error);
          }
        },
        (error) => {
          reject(new Error(`Géolocalisation refusée: ${error.message}`));
        },
        { 
          timeout: 10000, 
          enableHighAccuracy: true,
          maximumAge: 0
        }
      );
    });
  }

  private async detectWithIP(): Promise<GeolocationData> {
    try {
      const ipResponse = await fetch(this.ipifyUrl);
      const ipData = await ipResponse.json();
      const clientIP = ipData.ip;

      const geoResponse = await fetch(`${this.ipApiUrl}/${clientIP}`);
      const geoData = await geoResponse.json();

      if (geoData.status === 'fail') {
        throw new Error(`API IP échouée: ${geoData.message}`);
      }

      return {
        ip: clientIP,
        country: geoData.country,
        countryCode: geoData.countryCode,
        city: geoData.city,
        region: geoData.regionName,
        isProxy: geoData.proxy || geoData.hosting || false
      };
    } catch (error: any) {
      console.error('❌ Erreur détection IP:', error);
      throw new Error('Erreur détection par IP');
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<{country: string, countryCode: string}> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      
      if (!response.ok) throw new Error('Erreur géocodage');
      
      const data = await response.json();
      
      return {
        country: data.address.country,
        countryCode: data.address.country_code.toUpperCase()
      };
    } catch (error) {
      throw new Error('Impossible de déterminer la localisation');
    }
  }

  validateCountryMatch(phoneCountryCode: string, detectedCountryCode: string): { isValid: boolean; error?: string } {
    console.log('🔍 Validation strict pays:', { phoneCountryCode, detectedCountryCode });

    const phoneToCountryMap: Record<string, {code: string, name: string}[]> = {
      '+33': [{ code: 'FR', name: 'France' }],
      '+32': [{ code: 'BE', name: 'Belgique' }],
      '+49': [{ code: 'DE', name: 'Allemagne' }],
      '+39': [{ code: 'IT', name: 'Italie' }],
      '+34': [{ code: 'ES', name: 'Espagne' }],
      '+41': [{ code: 'CH', name: 'Suisse' }],
      '+44': [{ code: 'GB', name: 'Royaume-Uni' }],
      '+1': [{ code: 'CA', name: 'Canada' }],
      '+7': [{ code: 'RU', name: 'Russie' }],
      '+375': [{ code: 'BY', name: 'Biélorussie' }]
    };

    const allowedCountries = phoneToCountryMap[phoneCountryCode];
    
    if (!allowedCountries) {
      return {
        isValid: false,
        error: `Code pays ${phoneCountryCode} non autorisé. BELAFRICA n'est disponible que dans les pays ciblés.`
      };
    }

    const cleanDetectedCode = detectedCountryCode.toUpperCase().trim();
    const isValid = allowedCountries.some(country => country.code === cleanDetectedCode);

    if (!isValid) {
      const detectedCountryName = this.getCountryNameFromCode(cleanDetectedCode);
      const expectedCountries = allowedCountries.map(c => c.name).join(', ');
      
      return {
        isValid: false,
        error: `❌ ACCÈS REFUSÉ\n\nVous êtes localisé en ${detectedCountryName} (${cleanDetectedCode}) mais vous utilisez un numéro ${phoneCountryCode}.\n\nBELAFRICA nécessite que votre numéro corresponde exactement à votre pays de résidence.\n\nPays acceptés pour ${phoneCountryCode}: ${expectedCountries}`
      };
    }

    return { isValid: true };
  }

  async validateLocationBeforeOTP(phoneCountryCode: string): Promise<{
    isValid: boolean;
    detectedCountry?: string;
    detectedCountryCode?: string;
    error?: string;
  }> {
    try {
      console.log('🌍 Début validation géolocalisation pour:', phoneCountryCode);
      
      const location = await this.detectLocation().toPromise();
      if (!location) throw new Error('Localisation non détectée');

      const allowedCountries = ['FR', 'BE', 'DE', 'IT', 'ES', 'CH', 'GB', 'CA', 'RU', 'BY'];
      if (!allowedCountries.includes(location.countryCode.toUpperCase())) {
        return {
          isValid: false,
          detectedCountry: location.country,
          detectedCountryCode: location.countryCode,
          error: `🚫 BELAFRICA n'est pas disponible dans votre pays (${location.country}).\n\nApplication réservée aux pays européens ciblés.`
        };
      }

      const validation = this.validateCountryMatch(phoneCountryCode, location.countryCode);
      
      if (!validation.isValid) {
        return {
          isValid: false,
          detectedCountry: location.country,
          detectedCountryCode: location.countryCode,
          error: validation.error
        };
      }

      if (location.isProxy) {
        console.warn('⚠️ Proxy/VPN détecté. Localisation potentiellement fausse.');
      }

      return {
        isValid: true,
        detectedCountry: location.country,
        detectedCountryCode: location.countryCode
      };
    } 
    catch (error: any) {
      console.error('❌ Erreur validation géolocalisation:', error);
      
      return {
        isValid: false,
        error: `🔒 IMPOSSIBLE DE VÉRIFIER VOTRE LOCALISATION\n\n${error.message || 'Erreur inconnue'}\n\nAssurez-vous que:\n• Votre VPN est désactivé\n• La géolocalisation est activée\n• Vous êtes dans un pays autorisé`
      };
    }
  }

  private getCountryNameFromCode(code: string): string {
    const countries: Record<string, string> = {
      'FR': 'France',
      'BE': 'Belgique',
      'DE': 'Allemagne',
      'IT': 'Italie',
      'ES': 'Espagne',
      'CH': 'Suisse',
      'GB': 'Royaume-Uni',
      'CA': 'Canada',
      'RU': 'Russie',
      'BY': 'Biélorussie'
    };
    return countries[code.toUpperCase()] || code;
  }

  getAllowedCountries(): Array<{code: string, name: string}> {
    return [
      { code: '+33', name: 'France' },
      { code: '+32', name: 'Belgique' },
      { code: '+49', name: 'Allemagne' },
      { code: '+39', name: 'Italie' },
      { code: '+34', name: 'Espagne' },
      { code: '+41', name: 'Suisse' },
      { code: '+44', name: 'Royaume-Uni' },
      { code: '+1', name: 'Canada' },
      { code: '+7', name: 'Russie' },
      { code: '+375', name: 'Biélorussie' }
    ];
  }
}