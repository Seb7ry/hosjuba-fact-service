import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class DataService {
    constructor(private readonly jwtService: JwtService) {}

    async extractUserFromToken(req: Request): Promise<any> {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No se proporcionó un token de acceso.');
        }

        const tokenParts = authHeader.split(' ');

        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            throw new UnauthorizedException('Formato de token inválido. Debe ser "Bearer <TOKEN>".');
        }

        const token = tokenParts[1];

        if (!token) {
            throw new UnauthorizedException('El token de acceso no puede estar vacío.');
        }

        try {
            const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
            return decoded;  // Regresamos los datos decodificados del usuario
        } catch (error) {
            throw new UnauthorizedException('Token inválido o expirado.');
        }
    }
}

