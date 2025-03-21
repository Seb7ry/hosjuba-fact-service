import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConnectionPool, Request } from 'mssql';
import { AdmUsr } from 'src/model/admusr.model';
import { LogService } from './log.service';
import { DataSource } from 'typeorm';

/**
 * Servicio para la gestión de usuarios administrativos en la base de datos SQL Server.
 * 
 * Este servicio permite interactuar con la base de datos SQL Server para realizar operaciones de obtención
 * de datos sobre los usuarios administrativos, incluyendo la obtención de todos los usuarios, búsqueda de 
 * un usuario por su ID o por su nombre de usuario.
 * 
 * Funcionalidades:
 * - Obtener todos los usuarios.
 * - Buscar un usuario por ID.
 * - Buscar un usuario por nombre de usuario.
 */
@Injectable()
export class AdmUsrService {
    
    /**
     * Constructor del servicio `AdmUsrService`.
     * @param datasource - Fuente de datos de TypeORM para interactuar con la base de datos SQL Server.
     * @param logService - Servicio para registrar los logs.
     */
    constructor(
        private readonly datasource: DataSource,
        private readonly logService: LogService
    ) { }

    /**
     * Obtiene todos los usuarios almacenados en la base de datos.
     * 
     * Realiza una consulta SQL para obtener todos los registros de usuarios de la base de datos.
     * Devuelve una lista de objetos `AdmUsr` con la información de los usuarios, como el nombre, descripción, 
     * contraseña y grupo del usuario.
     * 
     * @returns {Promise<AdmUsr[]>} Lista de todos los usuarios en la base de datos.
     * @throws {InternalServerErrorException} Si ocurre un error al obtener los usuarios.
     */
    async findAll(): Promise<AdmUsr[]> {
        const query = `
            SELECT 
                LTRIM(RTRIM(dbo.desencriptar(AUsrId))) AS username, 
                LTRIM(RTRIM(AUsrDsc)) AS description, 
                LTRIM(RTRIM(dbo.desencriptar(AUsrPsw))) AS password, 
                LTRIM(RTRIM(AgrpId)) AS grupoId
            FROM ADMUSR
        `;

        try {
            const users = await this.datasource.query(query);
            return users.map(user => new AdmUsr(user.username, user.description, user.password, user.grupoId));
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener usuarios de SQLServer: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener la lista de usuarios.");
        }
    }

    /**
     * Busca un usuario específico por su ID.
     * 
     * Realiza una consulta SQL para buscar un usuario por su ID. Si el usuario no existe en la base de datos,
     * devuelve `null`. Si el usuario se encuentra, devuelve un objeto `AdmUsr` con los datos del usuario.
     * 
     * @param id - El ID del usuario a buscar.
     * @returns {Promise<AdmUsr | null>} El usuario encontrado o `null` si no existe.
     * @throws {InternalServerErrorException} Si ocurre un error al buscar el usuario.
     */
    async findById(id: string): Promise<any | null> {

        const query = `
            SELECT 
                LTRIM(RTRIM(dbo.desencriptar(AUsrId))) AS username, 
                LTRIM(RTRIM(AUsrDsc)) AS description, 
                LTRIM(RTRIM(dbo.desencriptar(AUsrPsw))) AS password, 
                LTRIM(RTRIM(AgrpId)) AS grupoId
            FROM ADMUSR 
            WHERE dbo.desencriptar(AUsrId) = @0
        `;

        try {
            const result = await this.datasource.query(query, [id]); 
            if (result.length === 0) {
                await this.logService.logAndThrow('warn', `Usuario con ID ${id} no encontrado.`, 'AdmUsrService');
                return null;
            }

            return new AdmUsr(result[0].username, result[0].description, result[0].password, result[0].grupoId);
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al buscar usuario por ID ${id}: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }

    /**
     * Busca un usuario específico por su nombre de usuario.
     * 
     * Realiza una consulta SQL para buscar un usuario por su nombre de usuario en la base de datos.
     * Si no se encuentra el usuario, devuelve `null`. Si se encuentra, devuelve un objeto `AdmUsr` con los 
     * datos del usuario.
     * 
     * @param {string} username - El nombre de usuario a buscar.
     * @returns {Promise<AdmUsr | null>} El usuario encontrado o `null` si no existe.
     * @throws {InternalServerErrorException} Si ocurre un error al buscar el usuario.
     */
    async findByUser(username: string): Promise<any | null> {
        const query = `
            SELECT 
                LTRIM(RTRIM(dbo.desencriptar(AUsrId))) AS username, 
                LTRIM(RTRIM(AUsrDsc)) AS description, 
                LTRIM(RTRIM(dbo.desencriptar(AUsrPsw))) AS password, 
                LTRIM(RTRIM(AgrpId)) AS grupoId
            FROM ADMUSR 
            WHERE dbo.desencriptar(AUsrId) = @0
        `;

        try {
            const result = await this.datasource.query(query, [username]);
            if (result.length === 0) {
                await this.logService.logAndThrow('warn', `Usuario con nombre ${username} no encontrado.`, 'AdmUsrService');
                return null;
            }

            return new AdmUsr(result[0].username, result[0].description, result[0].password, result[0].grupoId);
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al buscar usuario ${username}: ${error.message}`, 'AdmUsrService');
            throw new InternalServerErrorException("No se pudo obtener el usuario.");
        }
    }
}
