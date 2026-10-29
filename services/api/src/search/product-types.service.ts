import { Injectable, Logger } from '@nestjs/common';
import { SolrService } from '../infra/solr.service';
import { buildProductTypeIndex, detectProductTypes, ProductTypeIndex } from './product-types';

/** Builds the product-type vocabulary from the live catalog on first use. */
@Injectable()
export class ProductTypeService {
  private readonly logger = new Logger(ProductTypeService.name);
  private index?: Promise<ProductTypeIndex>;

  constructor(private readonly solr: SolrService) {}

  async detect(query: string): Promise<string[]> {
    this.index ??= this.solr.articleTypes().then(buildProductTypeIndex);
    try {
      return detectProductTypes(query, await this.index);
    } catch (err) {
      // Retry on the next query; searching without type detection is still correct.
      this.index = undefined;
      this.logger.warn(`Product types unavailable: ${(err as Error).message}`);
      return [];
    }
  }
}
