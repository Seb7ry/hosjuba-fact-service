import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { TokenService } from '../service/token.service';

/**
 * Interceptor para manejo automático de refresh tokens
 * 
 * Funcionalidades:
 * - Detecta peticiones autenticadas (con usuario en request)
 * - Automáticamente refresca el access token si es necesario
 * - Agrega el nuevo token como cookie segura
 * - Continúa el flujo normal aunque falle el refresh
 * 
 * Uso:
 * @UseInterceptors(RefreshTokenInterceptor)
 */
@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Método principal del interceptor
   * @param context Contexto de ejecución
   * @param next Manejador del siguiente paso
   * @returns Observable con el flujo de la petición
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Si no hay usuario autenticado, continuar sin hacer nada
    if (!request.user?.username) {
      return next.handle();
    }

    const { username } = request.user;

    return next.handle().pipe(
      mergeMap((data) => {
        // Ejecutar en paralelo: refresh token + mantener datos originales
        return from(this.refreshToken(username, response)).pipe(
          mergeMap(() => of(data)) // Mantener los datos originales del response
        );
      })
    );
  }

  /**
   * Lógica para refrescar el token de acceso
   * @param username Nombre de usuario autenticado
   * @param response Objeto Response para setear cookies
   * @returns Promesa vacía (operación asíncrona)
   */
  private async refreshToken(username: string, response: any): Promise<void> {
    try {
      const tokenRecord = await this.tokenService.findTokenByName(username);

      if (!tokenRecord?.refreshToken) {
        throw new Error(`No se encontró refreshToken para ${username}`);
      }

      // Generar nuevo access token usando el refresh token
      const { access_token } = await this.tokenService.refreshAccessToken(
        username,
        tokenRecord.refreshToken,
      );

      // Configurar cookie segura con el nuevo token
      response.cookie('access_token', access_token, {
        httpOnly: true,    // No accesible desde JS
        secure: true,      // Solo HTTPS
        sameSite: 'strict', // Protección CSRF
        maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRATION) * 1000 // Tiempo de vida
      });

      console.log(`✅ Token refrescado para ${username}`);
    } catch (error) {
      console.warn('⚠️ Error al refrescar token (no crítico):', error.message);
      // No se propaga el error para no interrumpir la petición principal
    }
  }
}