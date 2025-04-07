import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { TokenService } from '../service/token.service';
import { LogService } from 'src/service/log.service';

/**
 * Interceptor para manejo automático de refresh tokens
 * 
 * Funcionalidades:
 * - Detecta peticiones autenticadas
 * - Refresca el access token si es válido el refresh token en BD
 * - Devuelve el nuevo token en el cuerpo de la respuesta (body)
 */
@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  constructor(
    private readonly tokenService: TokenService,
    private readonly logService: LogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    if (!request.user?.username) {
      return next.handle();
    }

    const { username } = request.user;

    return next.handle().pipe(
      mergeMap(async (data) => {
        const access_token = await this.refreshToken(username);

        return {
          ...(typeof data === 'object' ? data : { data }),
          ...(access_token ? { access_token } : {}),
        };
      }),
    );
  }

  private async refreshToken(username: string): Promise<string | null> {
    try {
      const tokenRecord = await this.tokenService.findTokenByName(username);

      if (!tokenRecord?.refreshToken) {
        throw new Error(`No se encontró refreshToken para ${username}`);
      }

      const { access_token } = await this.tokenService.refreshAccessToken(
        username,
        tokenRecord.refreshToken,
      );

      return access_token;
    } catch (error) {
      this.logService.log(
        'warn',
        `Error al refrescar token (no crítico): ${error.message}`,
        'RefreshTokenInterceptor',
      );
      return null;
    }
  }
}
