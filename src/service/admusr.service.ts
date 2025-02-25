import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdmUsr } from '../entities/admusr.entity';

/**
 * Servicio para la gestión de usuarios administrativos.
 */
@Injectable()
export class AdmUsrService {
    private readonly logger = new Logger(AdmUsrService.name);

    constructor(private readonly datasource: DataSource) {}

    /**
     * Obtiene todos los usuarios de la tabla ADMUSR.
     * @returns Lista de usuarios con sus credenciales desencriptadas.
     */
    async findAll(): Promise<any[]> {
        this.logger.log("📢 Consultando todos los usuarios...");
        
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
            return users;
        } catch (error) {
            this.logger.error(`❌ Error al obtener usuarios: ${error.message}`);
            throw new InternalServerErrorException("No se pudo obtener la lista de usuarios.");
        }
    }

    /**
     * Busca un usuario por su ID.
     * @param id - Identificador del usuario.
     * @returns Datos del usuario si existe, o `null` si no se encuentra.
     */
    async findById(id: string): Promise<any | null> {
        this.logger.log(`📢 Buscando usuario por ID: ${id}`);

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
                this.logger.warn(`⚠️ Usuario con ID ${id} no encontrado.`);
                return null;
            }
            return result[0];
        } catch (error) {
            this.logger.error(`❌ Error al buscar usuario por ID ${id}: ${error.message}`);
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }

    /**
     * Busca un usuario por su nombre de usuario.
     * @param username - Nombre de usuario desencriptado.
     * @returns Datos del usuario si existe, o `null` si no se encuentra.
     */
    async findByUser(username: string): Promise<any | null> {
        this.logger.log(`📢 Buscando usuario por nombre de usuario: ${username}`);

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
                this.logger.warn(`⚠️ Usuario con nombre ${username} no encontrado.`);
                return null;
            }
            return user[0];
        } catch (error) {
            this.logger.error(`❌ Error al buscar usuario ${username}: ${error.message}`);
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }
}