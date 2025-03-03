import { Module } from "@nestjs/common";
import { SqlServerConnectionService } from "src/service/sqlServerConnection.service";

@Module({
    providers: [SqlServerConnectionService],
    exports: [SqlServerConnectionService],
})
export class SqlServerConnectionModule{}