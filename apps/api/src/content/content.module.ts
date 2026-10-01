import { Module } from '@nestjs/common';
import { AssetsModule } from '../assets/assets.module';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
@Module({
  imports: [AssetsModule],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
