import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Request } from 'mssql';

import { AdmUsrService } from "./admusr.service";
import { TokenService } from "./token.service";
import { LogService } from "./log.service";

@Injectable()
export class AuthService {
    
    constructor(
        private readonly tokenService: TokenService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string; grupo: string }> {
        let user;

        try {
            user = await this.admUsrService.findByUser(username);
        } catch (error) {
            await this.logService.log('warn', `Usuario no encontrado: ${username}`, 'AuthService');
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        }
    
        if (password !== user.password.trim()) {
            await this.logService.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
            throw new HttpException('Credenciales incorrectas', HttpStatus.UNAUTHORIZED);
        }
    
        const { access_token } = await this.tokenService.generateAccessToken(user.username);
        const { refresh_token } = await this.tokenService.generateRefreshToken(user.username);

        await this.logService.log('info', 'Inicio de sesión.', 'Login', undefined, username);
        await this.tokenService.saveUserGroup(user.username , user.grupoId);
        return { 
            access_token, 
            refresh_token, 
            grupo: user.grupoId || 'SIN_GRUPO' 
        };
    }    

    async logout(req: Request, username: string): Promise<string> {
        const result = await this.tokenService.deleteToken(username);
        if (result) {
            await this.logService.log('info', `Cierre de sesión.`, 'Login', undefined, req.user.username);
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logService.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
