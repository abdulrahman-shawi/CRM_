import { NextRequest, NextResponse } from 'next/server';
import { createPublicCustomerForAffiliateOrder } from '@/server/affiliate';
import { createOrder } from '@/server/order';
import { calculateQuantityDiscountPricing } from '@/lib/ad-pricing';
import { prisma } from '@/lib/prisma';

interface ShopOrderItemInput {
  productId: number;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const customerName = String(body?.customerName || '').trim();
    const phone = String(body?.phone || '').trim();

    if (!customerName || !phone) {
      return NextResponse.json(
        { success: false, error: 'اسم العميل ورقم الهاتف مطلوبان' },
        { status: 400 }
      );
    }

    const rawItems: unknown[] = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'يجب أن يحتوي الطلب على منتج واحد على الأقل' },
        { status: 400 }
      );
    }

    // دمج المنتجات المكررة بجمع الكميات
    const mergedItems = new Map<number, number>();

    for (const rawItem of rawItems) {
      const productId = Number((rawItem as ShopOrderItemInput)?.productId || 0);
      const quantity = Number((rawItem as ShopOrderItemInput)?.quantity || 0);

      if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { success: false, error: 'بيانات منتجات الطلب غير صالحة' },
          { status: 400 }
        );
      }

      mergedItems.set(productId, (mergedItems.get(productId) || 0) + quantity);
    }

    const productIds = Array.from(mergedItems.keys());

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: {
        landingPage: true,
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { success: false, error: 'أحد المنتجات المطلوبة غير موجود أو غير متوفر حالياً' },
        { status: 400 }
      );
    }

    const customerResult = await createPublicCustomerForAffiliateOrder({
      name: customerName,
      phone,
      country: body?.country,
      city: body?.city,
    });

    if (!customerResult.success || !customerResult.data) {
      return NextResponse.json(
        { success: false, error: customerResult.error || 'تعذر إنشاء العميل' },
        { status: 400 }
      );
    }

    const items: Array<{ productId: string; quantity: number; price: number; discount: number }> = [];
    let subTotal = 0;
    let grandTotal = 0;

    for (const product of products) {
      const quantity = mergedItems.get(product.id) || 0;
      const orderPrice = Number(product.price || 0);
      const pricing = calculateQuantityDiscountPricing(
        orderPrice,
        quantity,
        product.landingPage?.quantityDiscountTiers
      );

      items.push({
        productId: String(product.id),
        quantity: pricing.quantity,
        price: orderPrice,
        discount: pricing.unitDiscountAmount,
      });

      subTotal = Number((subTotal + pricing.subtotal).toFixed(2));
      grandTotal = Number((grandTotal + pricing.finalAmount).toFixed(2));
    }

    const orderResult = await createOrder(
      {
        customerId: customerResult.data.id,
        status: 'طلب جديد',
        receiverName: String(body?.receiverName || customerName).trim(),
        receiverPhone: [phone],
        country: String(body?.country || '').trim(),
        city: String(body?.city || '').trim(),
        municipality: String(body?.municipality || '').trim(),
        fullAddress: String(body?.fullAddress || '').trim(),
        googleMapsLink: '',
        deliveryMethod: 'توصيل',
        amount: '',
        amountBank: grandTotal,
        deliveryNotes: String(body?.deliveryNotes || '').trim(),
        paymentMethod: String(body?.paymentMethod || 'عند الاستلام').trim() || 'عند الاستلام',
        additionalNotes: 'public-order|source:shop',
        grandTotal,
        overallDiscount: 0,
        subTotal,
      },
      items,
      null
    );

    if (!orderResult.success) {
      return NextResponse.json(
        { success: false, error: orderResult.error || 'تعذر إنشاء الطلب' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          orderNumber: orderResult.order?.orderNumber ?? orderResult.order?.id,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'حدث خطأ أثناء إنشاء الطلب' },
      { status: 500 }
    );
  }
}
