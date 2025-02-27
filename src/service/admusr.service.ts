import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { LogService } from './log.service';
import { DataSource } from 'typeorm';

/**
 * Servicio para la gestión de usuarios administrativos en la base de datos.
 * - Permite obtener todos los usuarios.
 * - Realiza búsquedas por ID y por nombre de usuario.
 */
@Injectable()
export class AdmUsrService {
    constructor(
        private readonly datasource: DataSource,
        private readonly logService: LogService
    ) {}

    /**
     * Obtiene todos los usuarios de la tabla ADMUSR.
     * @returns Lista de usuarios con credenciales desencriptadas.
     * @throws InternalServerErrorException si ocurre un error en la consulta.
     */
    async findAll(): Promise<any[]> {
        await this.logService.log('info', "📢 Consultando todos los usuarios...", 'AdmUsrService');

        const query = `
            SELECT 
                dbo.desencriptar(AUsrId) AS AUsrId,
                AUsrDsc,
                dbo.desencriptar(AUsrPsw) AS AUsrPsw,
                AgrpId
            FROM ADMUSR
        `;

        try {
            const users = await this.datasource.query(query);
            await this.logService.log('info', `✅ Se encontraron ${users.length} usuarios.`, 'AdmUsrService');
            return users;
        } catch (error) {
            await this.logService.log('error', `❌ Error al obtener usuarios: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener la lista de usuarios.");
        }
    }

    /**
     * Busca un usuario por su ID en la base de datos.
     * @param id - Identificador único del usuario.
     * @returns Datos del usuario si existe, o `null` si no se encuentra.
     * @throws InternalServerErrorException si ocurre un error en la consulta.
     */
    async findById(id: string): Promise<any | null> {
        await this.logService.log('info', `📢 Buscando usuario por ID: ${id}`, 'AdmUsrService');

        const query = `
            SELECT 
                dbo.desencriptar(AUsrId) AS AUsrId,
                AUsrDsc,
                dbo.desencriptar(AUsrPsw) AS AUsrPsw,
                AgrpId
            FROM ADMUSR 
            WHERE AUsrId = @0
        `;

        try {
            const result = await this.datasource.query(query, [id]);

            if (result.length === 0) {
                await this.logService.log('warn', `⚠️ Usuario con ID ${id} no encontrado.`, 'AdmUsrService');
                return null;
            }

            await this.logService.log('info', `✅ Usuario con ID ${id} encontrado.`, 'AdmUsrService');
            return result[0];
        } catch (error) {
            await this.logService.log('error', `❌ Error al buscar usuario por ID ${id}: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }

    /**
     * Busca un usuario por su nombre de usuario desencriptado.
     * @param username - Nombre de usuario en texto claro.
     * @returns Datos del usuario si existe, o `null` si no se encuentra.
     * @throws InternalServerErrorException si ocurre un error en la consulta.
     */
    async findByUser(username: string): Promise<any | null> {
        await this.logService.log('info', `📢 Buscando usuario por nombre de usuario: ${username}`, 'AdmUsrService');

        const query = `
            SELECT
                dbo.desencriptar(AUsrId) AS AUsrId,
                AUsrDsc,
                dbo.desencriptar(AUsrPsw) AS AUsrPsw,
                AgrpId
            FROM ADMUSR 
            WHERE dbo.desencriptar(AUsrId) = @0
        `;

        try {
            const user = await this.datasource.query(query, [username]);

            if (user.length === 0) {
                await this.logService.log('warn', `⚠️ Usuario con nombre ${username} no encontrado.`, 'AdmUsrService');
                return null;
            }

            await this.logService.log('info', `✅ Usuario con nombre ${username} encontrado.`, 'AdmUsrService');
            return user[0];
        } catch (error) {
            await this.logService.log('error', `❌ Error al buscar usuario ${username}: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }
}