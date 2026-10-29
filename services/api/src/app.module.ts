import { Module } from '@nestjs/common';
import { EmbedderService } from './infra/embedder.service';
import { SolrService } from './infra/solr.service';
import { MetricsService } from './search/metrics.service';
import { ProductTypeService } from './search/product-types.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SolrService, EmbedderService, MetricsService, ProductTypeService],
})
export class AppModule {}
