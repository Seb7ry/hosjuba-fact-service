// src/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { TokenService } from '../service/token.service'; // Asegúrate de importar TokenService

/**
 * Estrategia JWT para autenticación con Passport.
 * 
 * Esta estrategia valida tokens JWT y enriquece el payload con el refreshToken
 * almacenado en la base de datos.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Configura la estrategia JWT con:
   * - Extracción del token desde header Authorization como Bearer token
   * - Validación de expiración
   * - Secreto para verificación firmada
   * 
   * @param tokenService Servicio para operaciones con tokens
   */
  constructor(private readonly tokenService: TokenService) { // Inyecta TokenService
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  /**
   * Valida y enriquece el payload JWT.
   * 
   * @param payload - Datos decodificados del token JWT
   * @returns Payload aumentado con el refreshToken desde BD
   * 
   * @example
   * // Retorna:
   * {
   *   ...payloadOriginal,
   *   refreshToken: 'eyJhbGciOiJIUz...'
   * }
   */
  async validate(payload: any) {
    // Busca el refreshToken desde la base de datos
    const tokenRecord = await this.tokenService.findTokenByName(payload.username);
    return {
      ...payload,
      refreshToken: tokenRecord?.refreshToken, // Añade el refreshToken al objeto user
    };
  }
}