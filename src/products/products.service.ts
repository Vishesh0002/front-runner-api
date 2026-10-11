import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(slug: string) {
    return this.prisma.product.findUnique({
      where: { slug },
    });
  }

  async create(dto: CreateProductDto) {
    const baseSlug = (dto.title || 'product')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    let slug = baseSlug || `product-${Date.now()}`;
    let counter = 1;
    while (await this.prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    return this.prisma.product.create({
      data: {
        title: dto.title,
        description: dto.description || `${dto.title} - premium quality supplement.`,
        image: dto.image,
        price: Number(dto.price),
        mrp: Number(dto.mrp || dto.price),
        stock: dto.stock !== undefined ? Number(dto.stock) : 100,
        tag: dto.tag || null,
        badge: dto.badge || null,
        active: true,
        slug,
      },
    });
  }

  async delete(id: string) {
    try {
      return await this.prisma.product.delete({ where: { id } });
    } catch {
      return await this.prisma.product.update({
        where: { id },
        data: { active: false },
      });
    }
  }
}
