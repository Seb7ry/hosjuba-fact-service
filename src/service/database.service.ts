import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
    constructor(private dataSource: DataSource){}

    async countTablesVerf(): Promise<number> {
        const result = await this.dataSource.query(
            `SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`);
            return result[0].total;

    }

    async listTables(): Promise<string[]> {
        const result = await this.dataSource.query(`
          SELECT TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_TYPE = 'BASE TABLE'`);
        return result.map(row => row.TABLE_NAME);
      }
}