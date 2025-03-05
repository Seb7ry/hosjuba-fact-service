import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import * as dotenv from 'dotenv';
import { LogService } from './log.service';

dotenv.config();

/**
 * Servicio que gestiona la conexión a la base de datos SQL Server utilizando el paquete `mssql`.
 * 
 * Este servicio es responsable de establecer, mantener y cerrar las conexiones con la base de datos SQL Server
 * mediante un pool de conexiones. Además, proporciona métodos para obtener el pool de conexiones y liberar recursos 
 * cuando ya no son necesarios.
 * 
 * Funcionalidades:
 * - Conectar a la base de datos utilizando las credenciales y configuración proporcionadas por las variables de entorno.
 * - Proporcionar acceso al pool de conexiones activo.
 * - Cerrar la conexión de manera eficiente.
 */
@Injectable()
export class SqlServerConnectionService implements OnModuleInit {
    private readonly connectionPool: ConnectionPool;
    private readonly logService: LogService;

    /**
     * Constructor del servicio `SqlServerConnectionService`.
     * Este servicio gestiona la conexión a la base de datos SQL Server utilizando el paquete `mssql`.
     * 
     * La conexión se configura con los datos de autenticación y configuración de la base de datos obtenidos
     * desde las variables de entorno.
     */
    constructor() {
        this.connectionPool = new ConnectionPool({
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_HOST,
            database: process.env.DB_DATABASE,
            options: {
                encrypt: process.env.DB_ENCRYPT === 'true', 
                trustServerCertificate: true,               
                enableArithAbort: true,                     
            },
        });
    }

    /**
     * Método que se ejecuta cuando el módulo ha sido inicializado.
     * Este método establece una conexión con la base de datos SQL Server utilizando el `connectionPool`.
     */
    async onModuleInit() {
        try {
            await this.connectionPool.connect();
        } catch (error) {
            await this.logService.log('warn', `⚠️ Error al conectar con la base de datos: ${error.message}`, 'SqlServerConnectionService');
        }  
    }

    /**
     * Método que obtiene el pool de conexiones activas.
     * 
     * Este método es utilizado para obtener el objeto `connectionPool`, que se usa para interactuar con la base de datos.
     * 
     * @returns El `connectionPool` para interactuar con la base de datos.
     */
    getConnectionPool(): ConnectionPool {
        return this.connectionPool; 
    }

    /**
     * Método para cerrar la conexión a la base de datos.
     * 
     * Este método cierra el pool de conexiones activas. Es útil para asegurarse de liberar los recursos 
     * utilizados por la conexión a la base de datos una vez que ya no se necesiten.
     */
    async closeConnection() {
        try {
            await this.connectionPool.close();
        } catch (error) {
            await this.logService.log('error', `❌ Error al cerrar la conexión con la base de datos: ${error.message}`, 'SqlServerConnectionService');
        }
    }
}