import { Module } from "@nestjs/common";
import { SqlServerConnectionService } from "src/service/sqlServerConnection.service";
import { LogModule } from "./log.module";

@Module({
    imports: [
        LogModule
    ],
    providers: [SqlServerConnectionService],
    exports: [SqlServerConnectionService],
})
export class SqlServerConnectionModule{}