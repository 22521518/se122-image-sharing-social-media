import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';

import { GraphModule } from './graph/graph.module';

@Module({
  imports: [CommonModule, GraphModule],
  controllers: [],
  providers: [],
  exports: [GraphModule],
})
export class SocialModule { }
