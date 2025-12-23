import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GraphController],
  providers: [GraphService],
  exports: [GraphService],
})
export class GraphModule { }
