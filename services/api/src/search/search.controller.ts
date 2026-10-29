import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SolrService } from '../infra/solr.service';
import { MetricsService } from './metrics.service';
import { SearchService } from './search.service';
import type { Filters, Mode } from './types';

const MODES: Mode[] = ['lexical', 'vector', 'hybrid'];
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

type SearchQuery = Filters & { q?: string; mode?: string; limit?: string };

@Controller()
export class SearchController {
  constructor(
    private readonly search: SearchService,
    private readonly solr: SolrService,
    private readonly metrics: MetricsService,
  ) {}

  @Get('search')
  textSearch(@Query() query: SearchQuery) {
    const q = query.q?.trim();
    if (!q) throw new BadRequestException('q is required');
    const mode = (query.mode ?? 'hybrid') as Mode;
    if (!MODES.includes(mode)) throw new BadRequestException(`mode must be one of ${MODES.join(', ')}`);
    return this.search.search(q, mode, pickFilters(query), parseLimit(query.limit));
  }

  @Post('search/image')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_UPLOAD_BYTES } }))
  imageSearch(@UploadedFile() file: Express.Multer.File | undefined, @Query() query: SearchQuery) {
    if (!file) throw new BadRequestException('image file is required');
    return this.search.searchByImage(file, pickFilters(query), parseLimit(query.limit));
  }

  @Get('products/:id/similar')
  similar(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.search.similar(id, parseLimit(limit));
  }

  @Get('facets')
  facets() {
    return this.solr.facets();
  }

  @Get('stats')
  stats() {
    return this.metrics.snapshot();
  }
}

function pickFilters({ gender, articleType, baseColour, usage }: Filters): Filters {
  return { gender, articleType, baseColour, usage };
}

function parseLimit(raw?: string): number {
  const limit = Number(raw ?? 24);
  return Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 60) : 24;
}
