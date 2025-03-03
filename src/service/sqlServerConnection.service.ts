import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConnectionPool } from 'mssql';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class SqlServerConnectionService implements OnModuleInit {
    private readonly connectionPool: ConnectionPool;

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

    async onModuleInit() {
        await this.connectionPool.connect();  
    }

    getConnectionPool(): ConnectionPool {
        return this.connectionPool; 
    }

    async closeConnection() {
        await this.connectionPool.close(); 
    }
}