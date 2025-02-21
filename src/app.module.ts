import { ConfigurableModuleBuilder, Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './service/database.service';
import { AdmUsr } from './entities/admusr.entity';
import { AdmUsrController } from './controllers/admusr.controller';
import { AdmUsrService } from './service/admusr.service';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      synchronize: false,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        enableArithAbort: process.env.DB_ENABLE_ARITH_ABORT === 'true',
      },
      autoLoadEntities: true,
    }),
    TypeOrmModule.forFeature([AdmUsr]),
  ],
  controllers: [
    AppController,
    AdmUsrController],
  providers: [
    AppService,
    DatabaseService,
    AdmUsrService],
})
export class AppModule implements OnModuleInit{
  constructor(private databaseService: DatabaseService){};
  async onModuleInit(){
    console.log('Servidor SQL:', process.env.DB_HOST);
    console.log('me conecté a la base de datos por fin la pta madre :DDDD');

    const tableCount = await this.databaseService.countTablesVerf();
    console.log(`cantidad de tablas ${tableCount} joa mano :c `);

    const tables = await this.databaseService.listTables();
    console.log('📋 Tablas en la base de datos:', tables);
  }
}
