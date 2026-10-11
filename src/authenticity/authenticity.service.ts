import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateBatchDto } from './dto/generate-batch.dto';
import * as crypto from 'crypto';

const CODE_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 32 chars, excludes 0, O, 1, I, L

@Injectable()
export class AuthenticityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cleans code input: trims, removes spaces and dashes, converts to uppercase
   */
  cleanCode(input: string): string {
    return (input || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * Generates a single cryptographically secure random alphanumeric code
   */
  generateRandomCode(length = 10): string {
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
    }
    return result;
  }

  /**
   * Customer verification of a scratch code
   */
  async verifyCode(
    rawCode: string,
    phone?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const code = this.cleanCode(rawCode);
    if (!code || code.length < 6) {
      return {
        status: 'INVALID',
        message: 'Invalid code format. Please verify the code on your product.',
      };
    }

    const record = await this.prisma.verificationCode.findUnique({
      where: { code },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            image: true,
            tag: true,
            badge: true,
            slug: true,
          },
        },
      },
    });

    // 1. Code not found in database
    if (!record) {
      return {
        status: 'INVALID',
        message:
          'This scratch code is invalid or counterfeit. It does not exist in our authentic product database.',
      };
    }

    // 2. Code blocked for fraud or recall
    if (record.status === 'BLOCKED') {
      return {
        status: 'BLOCKED',
        message:
          'This product batch has been blocked or recalled. Please contact Front-Runner support immediately.',
        batchNumber: record.batchNumber,
      };
    }

    const now = new Date();

    // 3. First time verification (Authentic!)
    if (record.verificationCount === 0) {
      const updated = await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: {
          status: 'VERIFIED',
          verificationCount: 1,
          firstVerifiedAt: now,
          lastVerifiedAt: now,
          verifiedPhone: phone || null,
        },
        include: {
          product: true,
        },
      });

      await this.prisma.verificationLog.create({
        data: {
          codeId: record.id,
          status: 'FIRST_TIME',
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          phone: phone || null,
        },
      });

      return {
        status: 'AUTHENTIC',
        message: 'Congratulations! Your product is 100% Genuine & Authentic.',
        code: record.code,
        batchNumber: record.batchNumber,
        mfgDate: record.mfgDate,
        expDate: record.expDate,
        firstVerifiedAt: updated.firstVerifiedAt,
        verificationCount: 1,
        product: updated.product
          ? {
              id: updated.product.id,
              title: updated.product.title,
              image: updated.product.image,
              slug: updated.product.slug,
            }
          : null,
      };
    }

    // 4. Duplicate scan (Already verified before!)
    const updated = await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: {
        verificationCount: { increment: 1 },
        lastVerifiedAt: now,
      },
      include: {
        product: true,
      },
    });

    await this.prisma.verificationLog.create({
      data: {
        codeId: record.id,
        status: 'DUPLICATE_ATTEMPT',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        phone: phone || null,
      },
    });

    return {
      status: 'ALREADY_VERIFIED',
      message:
        '⚠️ Warning: This code has ALREADY been authenticated earlier! If you just scratched the foil for the first time, this product may be counterfeit.',
      code: record.code,
      batchNumber: record.batchNumber,
      mfgDate: record.mfgDate,
      expDate: record.expDate,
      firstVerifiedAt: record.firstVerifiedAt,
      lastVerifiedAt: updated.lastVerifiedAt,
      verificationCount: updated.verificationCount,
      product: updated.product
        ? {
            id: updated.product.id,
            title: updated.product.title,
            image: updated.product.image,
            slug: updated.product.slug,
          }
        : null,
    };
  }

  /**
   * Generates a batch of unique random codes
   */
  async generateBatch(dto: GenerateBatchDto) {
    const { batchNumber, productId, count, mfgDate, expDate } = dto;
    if (count < 1 || count > 50000) {
      throw new BadRequestException('Count must be between 1 and 50,000');
    }

    // Validate product if provided
    if (productId) {
      const prod = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      if (!prod) {
        throw new NotFoundException(`Product ID ${productId} not found`);
      }
    }

    const uniqueCodes = new Set<string>();
    while (uniqueCodes.size < count) {
      uniqueCodes.add(this.generateRandomCode(10));
    }

    const codesArray = Array.from(uniqueCodes).map((code) => ({
      code,
      batchNumber,
      productId: productId || null,
      mfgDate: mfgDate ? new Date(mfgDate) : null,
      expDate: expDate ? new Date(expDate) : null,
    }));

    // Insert in chunks of 1000 for database performance
    const chunkSize = 1000;
    let inserted = 0;
    for (let i = 0; i < codesArray.length; i += chunkSize) {
      const chunk = codesArray.slice(i, i + chunkSize);
      const res = await this.prisma.verificationCode.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      inserted += res.count;
    }

    return {
      success: true,
      batchNumber,
      requestedCount: count,
      insertedCount: inserted,
    };
  }

  /**
   * Lists summary of all batches
   */
  async getBatches() {
    const batches = await this.prisma.verificationCode.groupBy({
      by: ['batchNumber'],
      _count: {
        code: true,
      },
    });

    // Get detailed status counts for each batch
    const results = await Promise.all(
      batches.map(async (b) => {
        const [verified, duplicates, firstRecord] = await Promise.all([
          this.prisma.verificationCode.count({
            where: {
              batchNumber: b.batchNumber,
              verificationCount: { gt: 0 },
            },
          }),
          this.prisma.verificationCode.count({
            where: {
              batchNumber: b.batchNumber,
              verificationCount: { gt: 1 },
            },
          }),
          this.prisma.verificationCode.findFirst({
            where: { batchNumber: b.batchNumber },
            include: {
              product: {
                select: { id: true, title: true, slug: true },
              },
            },
          }),
        ]);

        return {
          batchNumber: b.batchNumber,
          totalCodes: b._count.code,
          verifiedCodes: verified,
          duplicateScans: duplicates,
          product: firstRecord?.product || null,
          mfgDate: firstRecord?.mfgDate,
          expDate: firstRecord?.expDate,
          createdAt: firstRecord?.createdAt,
        };
      }),
    );

    return results.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }

  /**
   * Generates CSV string for a given batch for packaging label printing
   */
  async exportBatchCsv(batchNumber: string, frontendUrl = 'https://frontrunner.fit') {
    const codes = await this.prisma.verificationCode.findMany({
      where: { batchNumber },
      include: {
        product: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!codes.length) {
      throw new NotFoundException(`No codes found for batch ${batchNumber}`);
    }

    const headers = [
      'ID',
      'ScratchCode',
      'FormattedCode',
      'BatchNumber',
      'ProductTitle',
      'MfgDate',
      'ExpDate',
      'QR_VerificationUrl',
    ];

    const rows = codes.map((c, index) => {
      // Formatted as XXXX-XXXXXX for human reading under the scratch foil
      const formatted = `${c.code.slice(0, 4)}-${c.code.slice(4)}`;
      const qrUrl = `${frontendUrl}/authenticate?code=${c.code}`;
      const mfg = c.mfgDate ? c.mfgDate.toISOString().split('T')[0] : '';
      const exp = c.expDate ? c.expDate.toISOString().split('T')[0] : '';
      const productTitle = c.product?.title ? `"${c.product.title.replace(/"/g, '""')}"` : '""';

      return [
        index + 1,
        c.code,
        formatted,
        c.batchNumber,
        productTitle,
        mfg,
        exp,
        qrUrl,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}
