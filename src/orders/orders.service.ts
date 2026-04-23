import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateOrderDto } from './dto/create-order.dto';

// Stored in rupees to match the frontend and DB.
const SHIPPING_FEE = 50; // ₹50
const FREE_SHIPPING_THRESHOLD = 2000; // ₹2000

// Supported coupons (code -> percentage off the subtotal).
const COUPONS: Record<string, number> = {
  FAMILY: 50,
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentsService: PaymentsService,
  ) {}

  async create(dto: CreateOrderDto, userId?: string) {
    if (!dto.items?.length) {
      throw new BadRequestException('Cart is empty');
    }

    // Fetch products from DB to get authoritative prices
    const slugs = dto.items.map((i) => i.slug);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, active: true },
    });

    if (products.length !== slugs.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Calculate totals server-side
    let subtotal = 0;
    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.slug === item.slug)!;
      if (product.stock < item.qty) {
        throw new BadRequestException(`${product.title} is out of stock`);
      }
      subtotal += product.price * item.qty;
      return {
        productId: product.id,
        title: product.title,
        price: product.price,
        qty: item.qty,
      };
    });

    // Apply coupon (if any) to the subtotal.
    let discount = 0;
    let appliedCoupon: string | undefined;
    if (dto.coupon) {
      const code = dto.coupon.trim().toUpperCase();
      const pct = COUPONS[code];
      if (!pct) {
        throw new BadRequestException('Invalid coupon code');
      }
      discount = Math.round((subtotal * pct) / 100);
      appliedCoupon = code;
    }
    const discountedSubtotal = subtotal - discount;

    const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const total = discountedSubtotal + shipping;

    // Create order in DB (PENDING)
    const order = await this.prisma.order.create({
      data: {
        userId,
        subtotal,
        shipping,
        total,
        status: 'PENDING',
        guestEmail: !userId ? dto.guestEmail : undefined,
        guestName: !userId ? dto.guestName : undefined,
        guestPhone: !userId ? dto.guestPhone : undefined,
        shippingDetails: {
          ...dto.shipping,
          ...(appliedCoupon ? { coupon: appliedCoupon, discount } : {}),
        } as any,
        items: { create: orderItems },
      },
      include: { items: true },
    });

    // Create Razorpay order (Razorpay requires amount in paise)
    const amountInPaise = total * 100;
    const razorpayOrder = await this.paymentsService.createRazorpayOrder({
      amount: amountInPaise,
      receipt: order.id,
      notes: { orderId: order.id },
    });

    // Save Razorpay order id
    await this.prisma.order.update({
      where: { id: order.id },
      data: { razorpayOrderId: razorpayOrder.id },
    });

    return {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise, // in paise, required by Razorpay SDK on the frontend
      currency: 'INR',
      keyId: this.paymentsService.getPublicKey(),
    };
  }

  async findAllForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId && order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
