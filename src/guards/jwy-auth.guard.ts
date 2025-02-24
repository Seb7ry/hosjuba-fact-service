import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService){}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if(!authHeader){
            throw new UnauthorizedException('No se proporcionó un token de acceso.');
        }

        const token = authHeader.split(' ')[1];
        try{
            const decoded = this.jwtService.verify(token);
            request.user = decoded;
            return true;
        } catch (error){
            throw new UnauthorizedException('Token de acceso inválido o expirado.');
        }
    }
}