import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AdmUsr } from './entities/admusr.entity';
import { AdmUsrController } from './controllers/admusr.controller';
import { AdmUsrService } from './service/admusr.service';
import * as dotenv from 'dotenv';
import { AuthModule } from './modules/auth.module';
import { MongooseModule } from '@nestjs/mongoose';
import { TokenModule } from './modules/token.module';

dotenv.config();

@Module({
  imports: [
    AuthModule,
    TokenModule,
    MongooseModule.forRoot(`mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}` +
                          `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=${process.env.MONGO_AUTH_SOURCE}`),
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
    AdmUsrService],
})
export class AppModule implements OnModuleInit{
  constructor(){};
  async onModuleInit(){
  }
}
