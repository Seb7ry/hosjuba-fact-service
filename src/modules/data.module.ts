import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DataService } from 'src/service/data.service';  // Importamos UserService

@Module({
  imports: [
    JwtModule.register({
                secret: process.env.JWT_SECRET,
                signOptions: { expiresIn: process.env.TIME_SESSION },
            }),
  ],
  providers: [DataService],  // Registramos el servicio
  exports: [DataService],    // Exportamos para que otros módulos lo usen
})
export class DataModule {}
