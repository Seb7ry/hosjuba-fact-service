import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AdmUsr } from 'src/model/admusr.model';
import { LogService } from './log.service';

@Injectable()
export class AdmUsrService {

    private readonly users: AdmUsr[] = [
        new AdmUsr('ADMIN', 'Administrador del sistema', '1234', 'ADMINISTRADOR'),
        new AdmUsr('USER', 'Usuario del sistema', '1234', 'TEST USER'),
      ];
    
    constructor(
        private readonly logService: LogService
    ) { }

    async findAll(): Promise<AdmUsr[]> {
        try {
            return this.users;
          } catch (error) {
            await this.logService.logAndThrow(
              'error',
              `Error al obtener usuarios locales: ${error.message}`,
              'AdmUsrService',
            );
            throw new InternalServerErrorException('No se pudo obtener la lista de usuarios.');
          }
    }

    async findByUser(username: string): Promise<any | null> {
        try {
            const user = this.users.find((u) => u.username === username);
      
            if (!user) {
              await this.logService.logAndThrow(
                'warn',
                `Usuario con nombre ${username} no encontrado.`,
                'AdmUsrService',
              );
              return null;
            }
      
            return user;
          } catch (error) {
            await this.logService.logAndThrow(
              'error',
              `Error al buscar usuario ${username}: ${error.message}`,
              'AdmUsrService',
            );
            throw new InternalServerErrorException('No se pudo obtener el usuario.');
          }
    }
}
