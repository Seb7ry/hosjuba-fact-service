import { SqlServerConnectionService } from "src/service/sqlServerConnection.service";

import { LogModule } from "./log.module";
import { Module } from "@nestjs/common";

@Module({
    imports: [
        LogModule
    ], 
    providers: [
        SqlServerConnectionService
    ], 
    exports: [
        SqlServerConnectionService
    ],
})
export class SqlServerConnectionModule{}