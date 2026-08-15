'use client';

import { DataTable } from '@/components/shared/DataTable';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MultiFileUpload } from '@/components/ui/ImageUpload';
import { useAuth } from '@/context/AuthContext';
import { buildAdFullUrl } from '@/lib/affiliate';
import { formatSiteCurrency, useSiteCurrency } from '@/lib/currency';
import { getallcategory } from '@/server/category';
import { saveProductWithFiles, updateProductWithFiles } from '@/server/image';
import { deleteProduct, getProduct, toggleProductActive, toggleProductShowInAds, upsertProductLandingPage, LandingPageInput } from '@/server/product';
import { getColors, getSizes, createColor, createSize } from '@/server/variants';
import { Barcode } from '@/components/ui/barcode';
import { BarcodeScannerModal } from '@/components/ui/barcode-scanner';
import { generateBarcodeValue } from '@/lib/barcode';
import Link from 'next/link';
import { FileDown, Mail, Plus, FileText, ScanLine } from 'lucide-react';
import * as React from 'react';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import z from 'zod';
import * as XLSX from 'xlsx';

const createProductFileClientId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getFileNameFromUrl = (url?: string) => {
    const normalizedUrl = String(url || '').trim();
    if (!normalizedUrl) return 'file';

    const lastSegment = normalizedUrl.split('/').pop() || normalizedUrl;
    return decodeURIComponent(lastSegment.split('?')[0] || 'file');
};

const productschama = z.object({
    name: z.string().min(3, "اسم المنتج مطلوب"),
    modelNumber: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    metaTitle: z.string().optional().nullable(),
    metaDescription: z.string().optional().nullable(),
    metaKeywords: z.string().optional().nullable(),
    categoryId: z.coerce.number().min(1, "يرجى اختيار فئة"),
    price: z.coerce.number().min(0, "سعر المنتج يجب أن يكون صفر أو أكثر").optional().default(0),
    affiliatePrice: z.coerce.number().min(0, "سعر الأفلييت يجب أن يكون صفر أو أكثر").optional().default(0),
    affiliateCommissionRate: z.preprocess(
        (value) => value === '' || value == null ? null : Number(value),
        z.number().min(0, "نسبة عمولة الأفلييت يجب أن تكون صفر أو أكثر").nullable().optional()
    ),
    variants: z.array(
        z.object({
            colorId: z.preprocess(
                (value) => value === '' || value == null ? null : Number(value),
                z.number().min(1, "يرجى اختيار لون صحيح").nullable().optional()
            ),
            sizeId: z.preprocess(
                (value) => value === '' || value == null ? null : Number(value),
                z.number().min(1, "يرجى اختيار مقاس صحيح").nullable().optional()
            ),
            price: z.coerce.number().min(0, "يرجى إدخال سعر صحيح"),
        }).refine(
            (variant) => variant.colorId != null || variant.sizeId != null,
            { message: "اختر لوناً أو مقاساً على الأقل" }
        )
    ).optional().default([]),
    isActive: z.boolean().optional().default(true),
    files: z.array(z.any()).optional().default([]), // استخدام any هنا لتسهيل التعامل مع File objects
});

const landingPageSchema = z.object({
    heroTitle: z.string().optional().nullable(),
    heroSubtitle: z.string().optional().nullable(),
    heroDescription: z.string().optional().nullable(),
    badgeText: z.string().optional().nullable(),
    discountPercent: z.coerce.number().min(0).max(100).optional().nullable(),
    quantityDiscountTiers: z.array(
        z.object({
            minQuantity: z.coerce.number().int().min(1, 'الحد الأدنى للكمية يجب أن يكون 1 أو أكثر'),
            discountPercent: z.coerce.number().min(0.01, 'الخصم يجب أن يكون أكبر من صفر').max(100, 'الخصم يجب أن يكون 100 أو أقل'),
        })
    ).optional().default([]),
    features: z.array(
        z.object({
            title: z.string().min(1, "عنوان الميزة مطلوب"),
            description: z.string().optional().nullable(),
        })
    ).optional().default([]),
    showReviews: z.boolean().optional().default(true),
    showGuarantee: z.boolean().optional().default(true),
    guaranteeTitle: z.string().optional().nullable(),
    guaranteeText: z.string().optional().nullable(),
    ctaText: z.string().optional().nullable(),
    isActive: z.boolean().optional().default(true),
});

const FeaturesFields = ({ control, register, errors }: any) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'features'
    });

    return (
        <div className="md:col-span-2 border rounded-lg p-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-800 dark:text-slate-200">مميزات المنتج</h3>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ title: '', description: '' })}
                >
                    إضافة ميزة
                </Button>
            </div>

            <div className="grid gap-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end border border-slate-200 dark:border-slate-800 rounded-md p-2">
                        <FormInput
                            label="عنوان الميزة"
                            {...register(`features.${index}.title`)}
                            error={errors?.features?.[index]?.title?.message as string}
                        />
                        <FormInput
                            label="وصف الميزة"
                            {...register(`features.${index}.description`)}
                            error={errors?.features?.[index]?.description?.message as string}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => remove(index)}
                        >
                            حذف
                        </Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد مميزات مضافة.</p>
                )}
            </div>
        </div>
    );
};

const QuantityDiscountFields = ({ control, register, errors }: any) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'quantityDiscountTiers'
    });

    return (
        <div className="md:col-span-2 border rounded-lg p-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">خصومات الكمية</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">كل شريحة تُطبق تلقائيًا عندما تصل الكمية إلى الحد الأدنى المحدد.</p>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ minQuantity: 2, discountPercent: 5 })}
                >
                    إضافة شريحة خصم
                </Button>
            </div>

            <div className="grid gap-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end border border-slate-200 dark:border-slate-800 rounded-md p-2">
                        <FormInput
                            type="number"
                            label="من كمية"
                            {...register(`quantityDiscountTiers.${index}.minQuantity`)}
                            error={errors?.quantityDiscountTiers?.[index]?.minQuantity?.message as string}
                        />
                        <FormInput
                            type="number"
                            step="0.01"
                            label="نسبة الخصم %"
                            {...register(`quantityDiscountTiers.${index}.discountPercent`)}
                            error={errors?.quantityDiscountTiers?.[index]?.discountPercent?.message as string}
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => remove(index)}
                        >
                            حذف
                        </Button>
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد شرائح خصم مضافة.</p>
                )}
            </div>
        </div>
    );
};

const VariantColorSwatch = ({ control, index, colors }: any) => {
    const colorId = useWatch({ control, name: `variants.${index}.colorId` });
    const color = colors.find((c: any) => String(c.id) === String(colorId));
    if (!color?.hexCode) return null;
    return (
        <span
            className="inline-block w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 shrink-0"
            style={{ backgroundColor: color.hexCode }}
        />
    );
};

const VariantsFields = ({ control, register, errors, colors, sizes, onCreateColor, onCreateSize }: any) => {
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'variants'
    });
    const [showColorForm, setShowColorForm] = React.useState(false);
    const [showSizeForm, setShowSizeForm] = React.useState(false);
    const [newColorName, setNewColorName] = React.useState('');
    const [newColorHex, setNewColorHex] = React.useState('#000000');
    const [newSizeName, setNewSizeName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);

    const handleCreateColor = async () => {
        if (!newColorName.trim() || isSaving) return;
        setIsSaving(true);
        const created = await onCreateColor(newColorName.trim(), newColorHex);
        setIsSaving(false);
        if (created) {
            setNewColorName('');
            setNewColorHex('#000000');
            setShowColorForm(false);
        }
    };

    const handleCreateSize = async () => {
        if (!newSizeName.trim() || isSaving) return;
        setIsSaving(true);
        const created = await onCreateSize(newSizeName.trim());
        setIsSaving(false);
        if (created) {
            setNewSizeName('');
            setShowSizeForm(false);
        }
    };

    return (
        <div className="md:col-span-2 border rounded-lg p-3 border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">الألوان والمقاسات</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">حدد سعراً مختلفاً لكل تركيبة لون/مقاس (اختياري).</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowColorForm((v: boolean) => !v); setShowSizeForm(false); }}
                    >
                        لون جديد
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowSizeForm((v: boolean) => !v); setShowColorForm(false); }}
                    >
                        مقاس جديد
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => append({ colorId: '', sizeId: '', price: 0 })}
                    >
                        إضافة متغير
                    </Button>
                </div>
            </div>

            {showColorForm && (
                <div className="flex flex-wrap items-end gap-2 border border-slate-200 dark:border-slate-800 rounded-md p-2 mb-3 bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                        <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">اسم اللون</label>
                        <input
                            type="text"
                            value={newColorName}
                            onChange={(e) => setNewColorName(e.target.value)}
                            placeholder="مثال: أحمر"
                            className="h-10 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">كود اللون</label>
                        <input
                            type="color"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            className="h-10 w-14 cursor-pointer rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-1"
                        />
                    </div>
                    <Button type="button" onClick={handleCreateColor} disabled={isSaving || !newColorName.trim()}>
                        حفظ اللون
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowColorForm(false)}>
                        إلغاء
                    </Button>
                </div>
            )}

            {showSizeForm && (
                <div className="flex flex-wrap items-end gap-2 border border-slate-200 dark:border-slate-800 rounded-md p-2 mb-3 bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
                        <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">اسم المقاس</label>
                        <input
                            type="text"
                            value={newSizeName}
                            onChange={(e) => setNewSizeName(e.target.value)}
                            placeholder="مثال: XL"
                            className="h-10 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <Button type="button" onClick={handleCreateSize} disabled={isSaving || !newSizeName.trim()}>
                        حفظ المقاس
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowSizeForm(false)}>
                        إلغاء
                    </Button>
                </div>
            )}

            <div className="grid gap-3">
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end border border-slate-200 dark:border-slate-800 rounded-md p-2">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">اللون (اختياري)</label>
                            <div className="flex items-center gap-2">
                                <VariantColorSwatch control={control} index={index} colors={colors} />
                                <select
                                    {...register(`variants.${index}.colorId`)}
                                    className="h-10 flex-1 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">بدون لون</option>
                                    {colors.map((color: any) => (
                                        <option key={color.id} value={color.id}>
                                            {color.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {errors?.variants?.[index]?.colorId && (
                                <p className="text-xs text-red-500">{errors.variants[index].colorId.message as string}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">المقاس (اختياري)</label>
                            <select
                                {...register(`variants.${index}.sizeId`)}
                                className="h-10 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="">بدون مقاس</option>
                                {sizes.map((size: any) => (
                                    <option key={size.id} value={size.id}>
                                        {size.name}
                                    </option>
                                ))}
                            </select>
                            {errors?.variants?.[index]?.sizeId && (
                                <p className="text-xs text-red-500">{errors.variants[index].sizeId.message as string}</p>
                            )}
                        </div>

                        <FormInput
                            className='text-slate-900 dark:text-slate-100'
                            type="number"
                            step="0.01"
                            label="السعر"
                            {...register(`variants.${index}.price`)}
                            error={errors?.variants?.[index]?.price?.message as string}
                        />

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => remove(index)}
                        >
                            حذف
                        </Button>
                        {errors?.variants?.[index]?.root?.message && (
                            <p className="text-xs text-red-500 md:col-span-4">{errors.variants[index].root.message as string}</p>
                        )}
                    </div>
                ))}
                {fields.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد ألوان أو مقاسات مضافة.</p>
                )}
            </div>
        </div>
    );
};


const ProductLayout = () => {
    const { settings } = useSiteCurrency();
    const [isOpen, setIsOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | number | null>(null);
    const [categories, setCategories] = React.useState<any[]>([]);
    const [products, setProducts] = React.useState<any[]>([]);
    const [colors, setColors] = React.useState<any[]>([]);
    const [sizes, setSizes] = React.useState<any[]>([]);
    const [tab, setTab] = React.useState<'table' | "grid">('table');
    const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [isLandingOpen, setIsLandingOpen] = React.useState(false);
    const [landingProduct, setLandingProduct] = React.useState<any>(null);
    const [forData, setFormData] = React.useState<any>(null);
    const [page, setPage] = React.useState(1);
    const [nameFilter, setNameFilter] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);
    const { user } = useAuth()
    const PAGE_SIZE = 10;

    React.useEffect(() => {
        getallcategory().then(setCategories).catch(console.error);
        getProduct().then((products) => {
            setProducts(products);
        }).catch(console.error);
        getColors().then(setColors).catch(console.error);
        getSizes().then(setSizes).catch(console.error);

    }, []);

    const handleCreateColor = async (name: string, hexCode: string) => {
        const res = await createColor(name, hexCode);
        if (res.success) {
            toast.success("تم إضافة اللون");
            setColors((prev) => [...prev, res.data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
            return true;
        }
        toast.error(res.error || "فشل في إنشاء اللون");
        return false;
    };

    const handleCreateSize = async (name: string) => {
        const res = await createSize(name);
        if (res.success) {
            toast.success("تم إضافة المقاس");
            setSizes((prev) => [...prev, res.data].sort((a, b) => String(a.name).localeCompare(String(b.name))));
            return true;
        }
        toast.error(res.error || "فشل في إنشاء المقاس");
        return false;
    };

    const handleClose = () => {
        setIsOpen(false);
        setEditId(null);
        setFormData(null);
    };

    const handleShowDetails = (product: any) => {
        setSelectedProduct(product);
        setIsPreviewOpen(true);
    };

    const openLandingModal = (product: any) => {
        setLandingProduct(product);
        setIsLandingOpen(true);
    };

    const closeLandingModal = () => {
        setIsLandingOpen(false);
        setLandingProduct(null);
    };

    const landingProductAdUrl = React.useMemo(() => {
        if (!landingProduct?.id) return '';
        return buildAdFullUrl(landingProduct.id);
    }, [landingProduct]);

    const refreshProducts = React.useCallback(() => {
        getProduct().then((products) => {
            setProducts(products);
        }).catch(console.error);
    }, []);

    const onSubmit = async (data: z.infer<typeof productschama>) => {
        const loadingToast = toast.loading(editId ? 'جاري تحديث المنتج...' : 'جاري اضافة المنتج...');
        try {
            if (editId) {
                const formData = new FormData();
                formData.append('name', data.name);
                formData.append('modelNumber', data.modelNumber || '');
                formData.append('barcode', data.barcode || '');
                formData.append('categoryId', data.categoryId.toString());
                formData.append('description', data.description || '');
                formData.append('metaTitle', data.metaTitle || '');
                formData.append('metaDescription', data.metaDescription || '');
                formData.append('metaKeywords', data.metaKeywords || '');
                formData.append('isActive', String(data.isActive ?? true));
                formData.append('price', String(data.price ?? 0));
                formData.append('affiliatePrice', String(data.affiliatePrice ?? 0));
                formData.append('affiliateCommissionRate', data.affiliateCommissionRate == null ? '' : String(data.affiliateCommissionRate));
                formData.append('variants', JSON.stringify(data.variants || []));

                const fileManifest = Array.isArray(data.files)
                    ? data.files.map((fileItem: any) => ({
                        clientId: String(fileItem?.clientId || ''),
                        url: fileItem?.rawFile instanceof File ? null : String(fileItem?.url || ''),
                        type: String(fileItem?.type || ''),
                        isNew: fileItem?.rawFile instanceof File,
                    }))
                    : [];

                formData.append('existingFiles', JSON.stringify(fileManifest));
                if (data.files && data.files.length > 0) {
                    data.files.forEach((fileItem: any) => {
                        if (fileItem.rawFile instanceof File) {
                            formData.append('files', fileItem.rawFile);
                            formData.append('newFileClientIds', String(fileItem.clientId || ''));
                        }
                    });
                }
                const res = await updateProductWithFiles(Number(editId), formData);
                if (res.success) {
                    toast.success("تم تحديث المنتج بنجاح")
                    handleClose();
                    getallcategory().then(setCategories).catch(console.error);
                    refreshProducts();
                } else {
                    toast.error(`خطأ ${res.error}`)
                }
            } else {
                const formData = new FormData();
                formData.append('name', data.name);
                formData.append('modelNumber', data.modelNumber || '');
                formData.append('barcode', data.barcode || '');
                formData.append('categoryId', data.categoryId.toString());
                formData.append('description', data.description || '');
                formData.append('metaTitle', data.metaTitle || '');
                formData.append('metaDescription', data.metaDescription || '');
                formData.append('metaKeywords', data.metaKeywords || '');
                formData.append('isActive', String(data.isActive ?? true));
                formData.append('price', String(data.price ?? 0));
                formData.append('affiliatePrice', String(data.affiliatePrice ?? 0));
                formData.append('affiliateCommissionRate', data.affiliateCommissionRate == null ? '' : String(data.affiliateCommissionRate));
                formData.append('variants', JSON.stringify(data.variants || []));

                // معالجة الملفات - استخراج الملف الحقيقي rawFile
                if (data.files && data.files.length > 0) {
                    data.files.forEach((fileItem: any) => {
                        if (fileItem.rawFile instanceof File) {
                            formData.append('files', fileItem.rawFile);
                        }
                    });
                }

                const result = await saveProductWithFiles(formData);

                if (result.success) {
                    toast.success("تم الحفظ بنجاح")
                    handleClose();
                    getallcategory().then(setCategories).catch(console.error);
                    refreshProducts();
                } else {
                    toast.error("خطأ: " + result.error);
                }
            }
        } catch (error) {
            toast.error(` خطأ ${error}`);
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const openEditForm = (data: any) => {
        setEditId(data.id);
        setFormData({
            name: data.name,
            modelNumber: data.modelNumber || '',
            barcode: data.barcode || '',
            categoryId: data.categoryId,
            description: data.description,
            metaTitle: data.metaTitle || '',
            metaDescription: data.metaDescription || '',
            metaKeywords: data.metaKeywords || '',
            price: Number(data.price ?? 0),
            affiliatePrice: Number(data.affiliatePrice ?? 0),
            affiliateCommissionRate: data.affiliateCommissionRate ?? null,
            variants: Array.isArray(data.variants)
                ? data.variants.map((variant: any) => ({
                    colorId: variant.colorId ?? '',
                    sizeId: variant.sizeId ?? '',
                    price: Number(variant.price ?? 0),
                }))
                : [],
            isActive: data.isActive ?? true,
            files: Array.isArray(data.images)
                ? data.images.map((image: any, index: number) => ({
                    clientId: image?.clientId || `existing-${image?.id || index}-${createProductFileClientId()}`,
                    url: image.url,
                    type: image.type,
                    name: getFileNameFromUrl(image.url),
                }))
                : []
        });
        setIsOpen(true);
    };



    const displayProducts = React.useMemo(() => {
        const normalizedNameFilter = nameFilter.trim().toLowerCase();

        return products.filter((product: any) => {
            const matchesName = !normalizedNameFilter
                || String(product?.name || '').toLowerCase().includes(normalizedNameFilter)
                || String(product?.barcode || '').toLowerCase().includes(normalizedNameFilter);
            const matchesCategory = categoryFilter === 'all' || String(product?.categoryId || '') === categoryFilter;
            return matchesName && matchesCategory;
        });
    }, [products, nameFilter, categoryFilter]);

    const ExportToExcel = () => {
        // تجهيز البيانات بشكل مقروء
        const excelData = displayProducts.map((product: any) => ({
            "اسم المنتج": product.name,
            "التصنيف": product.categoryId ? (categories.find(c => c.id === product.categoryId)?.name || "غير محدد") : "غير محدد",
            "الباركود": product.barcode || "—",
            "السعر": formatSiteCurrency(Number(product.price || 0), settings),
            "سعر الأفلييت": formatSiteCurrency(Number(product.affiliatePrice || 0), settings),
            "تاريخ الجرد": new Date().toLocaleDateString('ar-EG')
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "المنتجات");

            // تحسين: ضبط عرض الأعمدة تلقائياً
            const maxWidth = 20;
            worksheet["!cols"] = [
              { wch: maxWidth }, { wch: maxWidth }, { wch: maxWidth }, { wch: maxWidth }, { wch: maxWidth }, { wch: maxWidth }
            ];

            XLSX.writeFile(workbook, `products_${new Date().getTime()}.xlsx`);
    };

    const tableActions: any[] = [
        (user && (user.accountType === "ADMIN" || user.permission?.editProducts === true)) &&
        {
            label: "تعديل",
            icon: <Mail size={14} />,
            onClick: (data: any) => {
                openEditForm(data);
            }
        },
        (user && (user.accountType === "ADMIN" || user.permission?.deleteProducts === true)) &&
        {
            label: "حذف",
            icon: <Plus className="rotate-45" size={14} />,
            variant: "danger",
            onClick: async (data: any) => {
                const confirm = window.confirm(`هل أنت متأكد من حذف هذا المنتج؟`);
                if (confirm) {
                    const loadingToast = toast.loading('جاري الحذف...');
                    try {
                        const res = await deleteProduct(Number(data.id))
                        if (res.success) {
                            toast.success("تم حذف المنتج بنجاح")
                            refreshProducts();
                        } else {
                            toast.error(res.error || "فشل حذف المنتج")
                        }
                    } catch (error) {
                        toast.error('فشل في حذف المنتج');
                    } finally {
                        toast.dismiss(loadingToast);
                    }
                }
            }
        },
    ].filter(Boolean);

    React.useEffect(() => {
        setPage(1);
    }, [nameFilter, categoryFilter]);


    return (
        <div className="p-4" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold">إدارة المنتجات</h1>
                <div className="flex items-center gap-2">
                    <Link href="/dashboard/barcode-labels">
                        <Button variant="outline">ملصقات الباركود</Button>
                    </Link>
                    {(user && (user.accountType === "ADMIN" || user.permission?.addProducts === true))
                        && (
                            <Button onClick={() => { setEditId(null); setFormData(null); setIsOpen(true); }}>إضافة منتج جديد</Button>
                        )
                    }
                </div>

            </div>
            <div className="flex flex-wrap justify-between items-center gap-3">
                <div className="flex gap-4 mb-4">
                    <Button onClick={() => setTab("grid")} >قائمة</Button>
                    <Button onClick={() => setTab("table")} >جدول</Button>
                    <button
                        onClick={ExportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
                    >
                        <FileDown size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="mb-4 max-w-xs">
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                        بحث بالاسم أو الباركود
                    </label>
                    <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={nameFilter}
                        onChange={(e) => {
                            setNameFilter(e.target.value);
                            setPage(1);
                        }}
                        placeholder="اسم المنتج"
                        className="h-10 w-full border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        title="مسح الباركود بالكاميرا"
                        className="h-10 w-10 shrink-0 flex items-center justify-center border rounded-md bg-white dark:bg-slate-950 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:border-blue-500 transition-all"
                    >
                        <ScanLine size={18} />
                    </button>
                    </div>
                </div>

                <div className="mb-4 max-w-xs">
                    <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-200">
                        عرض حسب التصنيف
                    </label>
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPage(1);
                        }}
                        className="h-10 w-full border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="all">كل التصنيفات</option>
                        {categories.map((category: any) => (
                            <option key={category.id} value={String(category.id)}>{category.name}</option>
                        ))}
                    </select>
                </div>
                </div>
            </div>

            {tab === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayProducts.map((product: any) => (
                        <div
                            key={product.id}
                            className="group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col"
                        >
                            {/* Image Section */}
                            <div className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800">
                                {product.images && product.images.length > 0 ? (
                                    <img
                                        src={product.images[0].url}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <img src="/uploads/icon.png" className="w-16 opacity-20" alt="no-image" />
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="p-4 flex flex-col flex-grow">
                                <div className="flex justify-between items-start mb-2">
                                    <h2 className="font-bold text-lg line-clamp-1 text-slate-800 dark:text-slate-100">{product.name}</h2>
                                </div>

                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10">
                                    {product.description ? product.description : "لا يوجد وصف لهذا المنتج."}
                                </p>

                                <div className="mt-auto flex items-center justify-between">
                                    <div>
                                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                            {formatSiteCurrency(Number(product?.price || 0), settings)}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleShowDetails(product)}
                                        className="rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                                    >
                                        تفاصيل
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- مودال عرض تفاصيل المنتج --- */}
            <AppModal
                title="تفاصيل المنتج"
                size="xl"
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
            >
                {selectedProduct && (
                    <div className="p-2 md:p-4 text-right" dir="rtl">
                        {/* Header: صورة + اسم + معلومات أساسية */}
                        <div className="flex flex-col md:flex-row gap-6 mb-6">
                            {/* Main Image */}
                            <div className="w-full md:w-2/5">
                                <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 border dark:border-slate-800">
                                    <img
                                        src={selectedProduct.images?.[0]?.url || "/uploads/icon.png"}
                                        className="w-full h-full object-contain"
                                        alt={selectedProduct.name}
                                    />
                                </div>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 flex flex-col gap-4">
                                <div>
                                    <span className="text-xs text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                                        {categories.find(c => c.id === selectedProduct.categoryId)?.name || "تصنيف عام"}
                                    </span>
                                    <h1 className="text-2xl font-bold mt-2 text-slate-900 dark:text-white">
                                        {selectedProduct.name}
                                    </h1>
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                                    <span>التقييمات {selectedProduct.reviews?.length || 0}</span>
                                    <span>|</span>
                                    <span>الطلبات {selectedProduct.orderItems?.length || 0}</span>
                                </div>

                                {selectedProduct.googleLink && (
                                    <a
                                        href={selectedProduct.googleLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 w-fit px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="w-4 h-4 rounded-full border-2 border-slate-400" />
                                        View live
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* معلومات السعر + معلومات عامة تحت الصورة والاسم */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Price information */}
                            <div className="border rounded-xl p-4 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">معلومات السعر</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">سعر القطعة</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {formatSiteCurrency(Number(selectedProduct?.price || 0), settings)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-3 dark:border-slate-800">
                                        <span className="text-slate-500 dark:text-slate-400">سعر الأفلييت</span>
                                        <span className="font-bold text-blue-600">
                                            {formatSiteCurrency(Number(selectedProduct?.affiliatePrice || 0), settings)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* General information */}
                            <div className="border rounded-xl p-4 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">معلومات عامة</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">الباركود</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100" dir="ltr">
                                            {selectedProduct?.barcode || "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">العرض في المتجر</span>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${selectedProduct.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                                            {selectedProduct.isActive ? "نعم" : "لا"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 dark:text-slate-400">تاريخ الإنشاء</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleDateString('ar-EG') : "—"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* الألوان والمقاسات */}
                        {Array.isArray(selectedProduct?.variants) && selectedProduct.variants.length > 0 && (
                            <div className="border rounded-xl p-4 mb-6 dark:border-slate-800">
                                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">الألوان والمقاسات</h3>
                                <div className="space-y-2 text-sm">
                                    {selectedProduct.variants.map((variant: any) => (
                                        <div key={variant.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0 dark:border-slate-800">
                                            <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                                {variant.color?.hexCode && (
                                                    <span
                                                        className="inline-block w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
                                                        style={{ backgroundColor: variant.color.hexCode }}
                                                    />
                                                )}
                                                {[variant.color?.name, variant.size?.name].filter(Boolean).join(' / ') || "متغير"}
                                            </span>
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {formatSiteCurrency(Number(variant.price || 0), settings)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="border-t pt-4 dark:border-slate-800">
                            <h3 className="font-semibold mb-2 text-slate-800 dark:text-slate-100">الوصف:</h3>
                            {selectedProduct.description ? (
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400 leading-relaxed tiptap-description"
                                    dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                                />
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">لا يوجد وصف لهذا المنتج حالياً.</p>
                            )}
                        </div>

                        {/* الصور والملفات المرتبطة بالمنتج */}
                        <div className="border-t pt-4 mt-6 dark:border-slate-800">
                            <h3 className="font-semibold mb-4 text-slate-800 dark:text-slate-100">الصور والملفات المرتبطة:</h3>
                            {selectedProduct.images?.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {selectedProduct.images.map((file: any, idx: number) => {
                                        const isImage = file.type?.startsWith('image/');
                                        const isVideo = file.type?.startsWith('video/');
                                        const isPdf = file.type === 'application/pdf' || file.url?.toLowerCase().endsWith('.pdf');

                                        return (
                                            <div key={idx} className="border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 dark:border-slate-800 hover:shadow-md transition-shadow">
                                                {isImage && (
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="block aspect-square">
                                                        <img
                                                            src={file.url}
                                                            alt={`ملف ${idx + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </a>
                                                )}
                                                {isVideo && (
                                                    <div className="aspect-square">
                                                        <video
                                                            src={file.url}
                                                            controls
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                {isPdf && (
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col items-center justify-center aspect-square p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <FileText className="w-12 h-12 text-red-500 mb-2" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">ملف PDF</span>
                                                        <span className="text-xs text-blue-600 mt-1">فتح الملف</span>
                                                    </a>
                                                )}
                                                {!isImage && !isVideo && !isPdf && (
                                                    <a
                                                        href={file.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex flex-col items-center justify-center aspect-square p-4 text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    >
                                                        <FileText className="w-12 h-12 text-slate-400 mb-2" />
                                                        <span className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">ملف مرفق</span>
                                                        <span className="text-xs text-blue-600 mt-1">فتح الملف</span>
                                                    </a>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-slate-500 dark:text-slate-400">لا توجد صور أو ملفات مرتبطة بهذا المنتج.</p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="mt-6 pt-4 border-t dark:border-slate-800 flex gap-2">
                            <Button className="flex-1" onClick={() => {
                                openEditForm(selectedProduct);
                                setIsPreviewOpen(false);
                            }}>
                                تعديل البيانات
                            </Button>
                            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>إغلاق</Button>
                        </div>
                    </div>
                )}
            </AppModal>
            {tab === 'table' && (
                <DataTable
                    data={displayProducts}
                    rowKey={"id"}
                    totalCount={displayProducts.length}
                    pageSize={PAGE_SIZE}
                    currentPage={page}
                    onPageChange={(newPage) => setPage(newPage)}
                    actions={tableActions}
                    columns={[
                        {
                            header: "المنتج",
                            accessor: (row: any) => (
                                <div className="flex items-center gap-2">
                                    <img
                                        src={row.images?.[0]?.url || "/uploads/icon.png"}
                                        alt=""
                                        className="w-8 h-8 rounded object-cover border"
                                    />
                                    <span>{row.name}</span>
                                </div>
                            )
                        },
                        {
                            header: "التصنيف",
                            accessor: (row: any) => {
                                const category = categories.find(c => c.id === row.categoryId);
                                return category ? category.name : "غير محدد";
                            }
                        },
                        {
                            header: "الباركود",
                            accessor: (row: any) => row.barcode ? (
                                <div className="text-slate-800 dark:text-slate-100" dir="ltr">
                                    <Barcode value={row.barcode} height={30} showValue={false} />
                                    <span className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 text-center">{row.barcode}</span>
                                </div>
                            ) : "—"
                        },
                        {
                            header: "السعر",
                            accessor: (row: any) => formatSiteCurrency(Number(row?.price || 0), settings)
                        },
                        {
                            header: "الألوان والمقاسات",
                            accessor: (row: any) => {
                                const variants = Array.isArray(row?.variants) ? row.variants : [];
                                if (!variants.length) return "—";
                                return (
                                    <div className="flex flex-wrap gap-1 max-w-[240px]">
                                        {variants.map((variant: any) => (
                                            <span
                                                key={variant.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                                            >
                                                {variant.color?.hexCode && (
                                                    <span
                                                        className="inline-block w-3 h-3 rounded-full border border-slate-300 dark:border-slate-600"
                                                        style={{ backgroundColor: variant.color.hexCode }}
                                                    />
                                                )}
                                                <span>
                                                    {[variant.color?.name, variant.size?.name].filter(Boolean).join(' / ')}
                                                </span>
                                                <span className="text-slate-400">•</span>
                                                <span>{formatSiteCurrency(Number(variant.price || 0), settings)}</span>
                                            </span>
                                        ))}
                                    </div>
                                );
                            }
                        },
                        {
                            header: "العرض في المتجر",
                            accessor: (row: any) => (
                                <button
                                    onClick={async () => {
                                        const loadingToast = toast.loading("جاري تحديث الحالة...");
                                        try {
                                            const res = await toggleProductActive(Number(row.id), !row.isActive);
                                            if (res.success) {
                                                toast.success("تم تحديث حالة العرض");
                                                refreshProducts();
                                            } else {
                                                toast.error(res.error || "فشل تحديث الحالة");
                                            }
                                        } catch (err) {
                                            toast.error("حدث خطأ أثناء التحديث");
                                        } finally {
                                            toast.dismiss(loadingToast);
                                        }
                                    }}
                                    disabled={!(user && (user.accountType === "ADMIN" || user.permission?.editProducts === true))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${row.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.isActive ? "translate-x-6" : "translate-x-1"}`}
                                    />
                                </button>
                            )
                        },
                        {
                            header: "عرض في الإعلانات",
                            accessor: (row: any) => (
                                <button
                                    onClick={async () => {
                                        const canEdit = user && (user.accountType === "ADMIN" || user.permission?.editProducts === true);
                                        if (!canEdit) return;

                                        if (!row.showInAds) {
                                            openLandingModal(row);
                                            return;
                                        }

                                        const loadingToast = toast.loading("جاري تحديث الحالة...");
                                        try {
                                            const res = await toggleProductShowInAds(Number(row.id), false);
                                            if (res.success) {
                                                toast.success("تم إيقاف عرض الإعلان");
                                                refreshProducts();
                                            } else {
                                                toast.error(res.error || "فشل تحديث الحالة");
                                            }
                                        } catch (err) {
                                            toast.error("حدث خطأ أثناء التحديث");
                                        } finally {
                                            toast.dismiss(loadingToast);
                                        }
                                    }}
                                    disabled={!(user && (user.accountType === "ADMIN" || user.permission?.editProducts === true))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${row.showInAds ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-700"}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.showInAds ? "translate-x-6" : "translate-x-1"}`}
                                    />
                                </button>
                            )
                        },

                    ]}
                />
            )}

            <AppModal title={editId ? "تعديل منتج" : "منتج جديد"} isOpen={isOpen} onClose={handleClose} size="full">
                <div className="p-4">
                    <DynamicForm
                        schema={productschama}
                        onSubmit={onSubmit}
                        defaultValues={forData || { variants: [] }}
                        submitLabel={editId ? "تعديل المنتج" : "حفظ المنتج"}
                    >
                        {({ register, control, setValue, watch, formState: { errors } }) => (
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput className='col-span-2' label="اسم المنتج" {...register("name")} error={errors.name?.message as string} />
                                <FormInput className='col-span-2' label="رقم الموديل" {...register("modelNumber")} error={errors.modelNumber?.message as string} />
                                <div className='col-span-2 space-y-2'>
                                    <div className="flex items-end gap-2">
                                        <FormInput className='flex-1' label="الباركود" {...register("barcode")} error={errors.barcode?.message as string} dir="ltr" />
                                        <button
                                            type="button"
                                            onClick={() => setValue("barcode", generateBarcodeValue())}
                                            className="h-10 px-4 rounded-md bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                                        >
                                            توليد تلقائي
                                        </button>
                                    </div>
                                    {watch("barcode") && (
                                        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-2 inline-block text-slate-900 dark:text-slate-100" dir="ltr">
                                            <Barcode value={watch("barcode")} height={44} />
                                        </div>
                                    )}
                                </div>
                                <FormInput className='col-span-2' label="Meta Title" {...register("metaTitle")} error={errors.metaTitle?.message as string} />
                                <FormInput className='col-span-2' label="Meta Description" {...register("metaDescription")} error={errors.metaDescription?.message as string} />
                                <FormInput className='col-span-2' label="Meta Keywords" {...register("metaKeywords")} error={errors.metaKeywords?.message as string} />

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm text-right font-medium text-slate-800 dark:text-slate-200">التصنيف</label>
                                    <select
                                        {...register("categoryId")}
                                        className="h-10 border rounded-md px-3 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    >
                                        <option value="">اختر التصنيف</option>
                                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                    {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId.message as string}</p>}
                                </div>
                                <FormInput
                                    type="number"
                                    step="0.01"
                                    label="سعر المنتج"
                                    {...register("price")}
                                    error={errors.price?.message as string}
                                />
                                <FormInput
                                    type="number"
                                    step="0.01"
                                    label="سعر الأفلييت"
                                    {...register("affiliatePrice")}
                                    error={errors.affiliatePrice?.message as string}
                                />
                                <FormInput
                                    type="number"
                                    step="0.01"
                                    label="نسبة عمولة الأفلييت %"
                                    {...register("affiliateCommissionRate")}
                                    error={errors.affiliateCommissionRate?.message as string}
                                />
                                <VariantsFields
                                    control={control}
                                    register={register}
                                    errors={errors}
                                    colors={colors}
                                    sizes={sizes}
                                    onCreateColor={handleCreateColor}
                                    onCreateSize={handleCreateSize}
                                />
                                <div className="col-span-2">
                                    <Controller
                                        name="description"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                label="وصف المنتج"
                                                placeholder="اكتب وصف المنتج هنا..."
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                                error={errors.description?.message as string}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center gap-3">
                                    <Controller
                                        name="isActive"
                                        control={control}
                                        render={({ field }) => (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">عرض في المتجر</span>
                                            </label>
                                        )}
                                    />
                                </div>
                                <div className="md:col-span-2 border-t pt-4">
                                    <Controller
                                        name="files"
                                        control={control}
                                        render={({ field }) => (
                                            <MultiFileUpload
                                                label="صور وملفات المنتج"
                                                value={field.value}
                                                onChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>

            <AppModal
                title={`إعدادات صفحة الهبوط - ${landingProduct?.name || ''}`}
                size="xl"
                isOpen={isLandingOpen}
                onClose={closeLandingModal}
            >
                <div className="p-4">
                    {landingProductAdUrl ? (
                        <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">رابط الإعلان</div>
                                    <div className="break-all text-sm text-blue-700 dark:text-blue-300" dir="ltr">{landingProductAdUrl}</div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(landingProductAdUrl);
                                            toast.success('تم نسخ رابط الإعلان');
                                        } catch {
                                            toast.error('تعذر نسخ رابط الإعلان');
                                        }
                                    }}
                                >
                                    نسخ الرابط
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    <DynamicForm
                        schema={landingPageSchema}
                        onSubmit={async (data: z.infer<typeof landingPageSchema>) => {
                            const loadingToast = toast.loading('جاري حفظ صفحة الهبوط...');
                            try {
                                const payload: LandingPageInput = {
                                    ...data,
                                    quantityDiscountTiers: (data.quantityDiscountTiers || []).map(tier => ({
                                        minQuantity: Number(tier.minQuantity || 1),
                                        discountPercent: Number(tier.discountPercent || 0),
                                    })),
                                    features: (data.features || []).map(f => ({
                                        title: f.title,
                                        description: f.description || '',
                                    })),
                                };
                                const res = await upsertProductLandingPage(Number(landingProduct.id), payload);
                                if (res.success) {
                                    toast.success('تم حفظ صفحة الهبوط وتفعيل الإعلان بنجاح');
                                    closeLandingModal();
                                    refreshProducts();
                                } else {
                                    toast.error(res.error || 'فشل حفظ صفحة الهبوط');
                                }
                            } catch (err) {
                                toast.error('حدث خطأ أثناء الحفظ');
                            } finally {
                                toast.dismiss(loadingToast);
                            }
                        }}
                        defaultValues={landingProduct?.landingPage ? {
                            heroTitle: landingProduct.landingPage.heroTitle || '',
                            heroSubtitle: landingProduct.landingPage.heroSubtitle || '',
                            heroDescription: landingProduct.landingPage.heroDescription || '',
                            badgeText: landingProduct.landingPage.badgeText || '',
                            discountPercent: landingProduct.landingPage.discountPercent ?? null,
                            quantityDiscountTiers: Array.isArray(landingProduct.landingPage.quantityDiscountTiers)
                                ? landingProduct.landingPage.quantityDiscountTiers.map((tier: any) => ({
                                    minQuantity: Number(tier?.minQuantity || 1),
                                    discountPercent: Number(tier?.discountPercent || 0),
                                }))
                                : [],
                            features: Array.isArray(landingProduct.landingPage.features)
                                ? landingProduct.landingPage.features.map((f: any) => ({
                                    title: f.title || '',
                                    description: f.description || '',
                                }))
                                : [],
                            showReviews: landingProduct.landingPage.showReviews ?? true,
                            showGuarantee: landingProduct.landingPage.showGuarantee ?? true,
                            guaranteeTitle: landingProduct.landingPage.guaranteeTitle || '',
                            guaranteeText: landingProduct.landingPage.guaranteeText || '',
                            ctaText: landingProduct.landingPage.ctaText || '',
                            isActive: landingProduct.landingPage.isActive ?? true,
                        } : {
                            quantityDiscountTiers: [],
                            features: [],
                            showReviews: true,
                            showGuarantee: true,
                            isActive: true,
                        }}
                        submitLabel="حفظ صفحة الهبوط"
                    >
                        {({ register, control, formState: { errors } }) => (
                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput label="عنوان الهيرو" {...register("heroTitle")} error={errors.heroTitle?.message as string} />
                                <FormInput label="العنوان الفرعي" {...register("heroSubtitle")} error={errors.heroSubtitle?.message as string} />
                                <div className="md:col-span-2">
                                    <Controller
                                        name="heroDescription"
                                        control={control}
                                        render={({ field }) => (
                                            <RichTextEditor
                                                label="وصف الهيرو"
                                                placeholder="اكتب وصف الهيرو هنا..."
                                                value={field.value || ""}
                                                onChange={field.onChange}
                                                error={errors.heroDescription?.message as string}
                                            />
                                        )}
                                    />
                                </div>
                                <FormInput label="نص الشارة" {...register("badgeText")} error={errors.badgeText?.message as string} />
                                <FormInput type="number" label="نسبة الخصم (%)" {...register("discountPercent")} error={errors.discountPercent?.message as string} />
                                <QuantityDiscountFields control={control} register={register} errors={errors} />
                                <FeaturesFields control={control} register={register} errors={errors} />
                                <FormInput label="عنوان الضمان" {...register("guaranteeTitle")} error={errors.guaranteeTitle?.message as string} />
                                <FormInput label="نص الضمان" {...register("guaranteeText")} error={errors.guaranteeText?.message as string} />
                                <FormInput label="نص زر الدعوة" {...register("ctaText")} error={errors.ctaText?.message as string} />
                                <div className="md:col-span-2 flex flex-wrap items-center gap-6">
                                    <Controller
                                        name="showReviews"
                                        control={control}
                                        render={({ field }) => (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">عرض التقييمات</span>
                                            </label>
                                        )}
                                    />
                                    <Controller
                                        name="showGuarantee"
                                        control={control}
                                        render={({ field }) => (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">عرض الضمان</span>
                                            </label>
                                        )}
                                    />
                                    <Controller
                                        name="isActive"
                                        control={control}
                                        render={({ field }) => (
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">صفحة الهبوط نشطة</span>
                                            </label>
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>

            <BarcodeScannerModal
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                onScan={(code) => {
                    setNameFilter(code);
                    setPage(1);
                }}
                title="مسح باركود المنتج"
            />
        </div>
    );
};

export default ProductLayout;
