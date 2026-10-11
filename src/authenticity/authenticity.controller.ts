import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  Query,
  Ip,
  Headers,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthenticityService } from './authenticity.service';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { GenerateBatchDto } from './dto/generate-batch.dto';
import { ConfigService } from '@nestjs/config';

@Controller('authenticity')
export class AuthenticityController {
  constructor(
    private readonly authenticityService: AuthenticityService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Public endpoint: Customer enters scratch code & optional mobile number
   */
  @Post('verify')
  async verify(
    @Body() dto: VerifyCodeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = (
      typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ip
    ) || 'unknown';

    return this.authenticityService.verifyCode(
      dto.code,
      dto.phone,
      clientIp,
      userAgent,
    );
  }

  /**
   * Admin endpoint: Generate a batch of scratch codes
   */
  @Post('admin/generate')
  async generateBatch(@Body() dto: GenerateBatchDto) {
    return this.authenticityService.generateBatch(dto);
  }

  /**
   * Admin endpoint: List all generated batches and their verification stats
   */
  @Get('admin/batches')
  async getBatches() {
    return this.authenticityService.getBatches();
  }

  /**
   * Admin endpoint: Download CSV for packaging & label printing press
   */
  @Get('admin/export/:batchNumber')
  async exportBatchCsv(
    @Param('batchNumber') batchNumber: string,
    @Res() res: Response,
    @Query('frontendUrl') frontendUrl?: string,
  ) {
    const baseUrl =
      frontendUrl ||
      this.configService.get<string>('FRONTEND_URL') ||
      'https://frontrunner.fit';

    const csvData = await this.authenticityService.exportBatchCsv(
      batchNumber,
      baseUrl,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${batchNumber}-scratch-codes.csv"`,
    );
    return res.send(csvData);
  }
}
