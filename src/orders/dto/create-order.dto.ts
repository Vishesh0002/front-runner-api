import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ description: 'Product slug (e.g. product-1)' })
  @IsString()
  slug: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  qty: number;
}

export class ShippingDetailsDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  line1: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  line2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  pincode: string;

  @ApiProperty()
  @IsString()
  phone: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @ValidateNested()
  @Type(() => ShippingDetailsDto)
  shipping: ShippingDetailsDto;

  // Guest checkout fields
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiProperty({ required: false, description: 'Coupon code (e.g. FAMILY)' })
  @IsOptional()
  @IsString()
  coupon?: string;
}
