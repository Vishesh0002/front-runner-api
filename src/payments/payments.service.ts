import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Razorpay = require('razorpay');

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: any;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    const keyId = this.config.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      this.logger.warn('Razorpay keys missing — payments will not work');
    }
    this.razorpay = new Razorpay({
      key_id: keyId || 'missing',
      key_secret: keySecret || 'missing',
    });
  }

  getPublicKey(): string {
    return this.config.get<string>('RAZORPAY_KEY_ID') || '';
  }

  async createRazorpayOrder(opts: {
    amount: number; // in paise
    receipt: string;
    notes?: Record<string, string>;
  }) {
    try {
      return await this.razorpay.orders.create({
        amount: opts.amount,
        currency: 'INR',
        receipt: opts.receipt,
        notes: opts.notes,
      });
    } catch (err) {
      this.logger.error('Razorpay order create failed', err);
      throw new InternalServerErrorException('Payment gateway error');
    }
  }

  /**
   * Verify Razorpay signature after successful payment on frontend.
   * Marks the order as PAID and decrements stock.
   */
  async verifyPayment(data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) throw new InternalServerErrorException('Secret missing');

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== data.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const order = await this.prisma.order.findUnique({
      where: { razorpayOrderId: data.razorpayOrderId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Order not found');

    // Update order and decrement stock atomically
    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          razorpayPaymentId: data.razorpayPaymentId,
          razorpaySignature: data.razorpaySignature,
        },
        include: { items: true },
      });
      for (const item of order.items) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.qty } },
          });
        }
      }
      return updatedOrder;
    });

    return { success: true, order: updated };
  }

  /**
   * Verify webhook signature from Razorpay dashboard webhook.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) return false;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    return expected === signature;
  }
}
