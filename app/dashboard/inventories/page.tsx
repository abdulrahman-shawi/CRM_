'use client';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { BarcodeScannerModal } from '@/components/ui/barcode-scanner';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/select-form';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, isAdmin } from '@/lib/utils';
import { createCountry, deleteCountry, getCountries, updateCountry } from '@/server/country';
import { createCity, deleteCity, getCities, updateCity } from '@/server/city';
import { createWarehouse, deleteWarehouse, getWarehouse, getWarehouseDetails, updateWarehouse } from '@/server/warehouse';
import { createMovementAction, getInventoryData } from '@/server/move';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Trash2, Eye, Package, FileText, ArrowRightLeft, Plus, X, Loader2, ShieldCheck, Search, Building2, Trash, ScanLine } from 'lucide-react';
import * as React from 'react';
import toast from 'react-hot-toast';
import z from 'zod';

interface ICategoriesLayoutProps { }

const warehouseSchema = z.object({
    name: z.string().min(3, "اسم المستودع مطلوب"),
    countryId: z.string().min(1, "بلد المستودع مطلوب"),
    cityId: z.string().min(1, "مدينة المستودع مطلوبة"),
});

const countrySchema = z.object({
    name: z.string().min(2, "اسم البلد مطلوب"),
});

const citySchema = z.object({
    name: z.string().min(2, 'اسم المدينة مطلوب'),
    countryId: z.string().min(1, 'بلد المدينة مطلوب'),
});

const movementTabs = [
    { key: 'IN', label: 'توريد (IN)' },
    { key: 'OUT', label: 'صرف (OUT)' },
    { key: 'TRANSFER', label: 'تحويل' },
    { key: 'ADJUSTMENT', label: 'جرد / تسوية' },
];

type MovementItem = {
    id: string;
    productId: string;
    productName: string;
    quantity: string;
};

const CategoriesLayout: React.FunctionComponent<ICategoriesLayoutProps> = (props) => {
    const [isWarehouseOpen, setIsWarehouseOpen] = React.useState(false);
    const [warehouseEditId, setWarehouseEditId] = React.useState<string | null>(null);
    const [warehouseFormData, setWarehouseFormData] = React.useState<any>(null);
    const [warehouses, setWarehouses] = React.useState<any[]>([]);
    const [countries, setCountries] = React.useState<any[]>([]);
    const [cities, setCities] = React.useState<any[]>([]);
    const [isCountryOpen, setIsCountryOpen] = React.useState(false);
    const [countryEditId, setCountryEditId] = React.useState<string | null>(null);
    const [countryFormData, setCountryFormData] = React.useState<any>(null);
    // ===== المدن =====
    const [isCityOpen, setIsCityOpen] = React.useState(false);
    const [cityEditId, setCityEditId] = React.useState<string | null>(null);
    const [cityFormData, setCityFormData] = React.useState<any>(null);

    const { user } = useAuth()
    const isAdminUser = user?.accountType === 'ADMIN';
    const countryOptions = countries.map((country) => ({
        value: String(country.id),
        label: country.name,
    }));
    const cityOptions = (countryId: string) => cities
        .filter((city) => String(city.countryId) === countryId)
        .map((city) => ({
            value: String(city.id),
            label: city.name,
        }));

    // ===== تفاصيل المستودع =====
    const [detailsOpen, setDetailsOpen] = React.useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = React.useState<any>(null);
    const [warehouseDetails, setWarehouseDetails] = React.useState<any>(null);
    const [detailsTab, setDetailsTab] = React.useState<'products' | 'orders' | 'movements' | 'warranties'>('products');
    const [detailsLoading, setDetailsLoading] = React.useState(false);

    // ===== حركة المخزون =====
    const [movementOpen, setMovementOpen] = React.useState(false);
    const [movementLoading, setMovementLoading] = React.useState(false);
    const [movementType, setMovementType] = React.useState<string>('IN');
    const [inventoryData, setInventoryData] = React.useState<any>(null);
    const [sourceWarehouseId, setSourceWarehouseId] = React.useState<string>('');
    const [movementItems, setMovementItems] = React.useState<MovementItem[]>([{ id: '1', productId: '', productName: '', quantity: '' }]);
    const [productSearch, setProductSearch] = React.useState<Record<string, string>>({});
    const [productDropdownOpen, setProductDropdownOpen] = React.useState<Record<string, boolean>>({});
    const [movementReason, setMovementReason] = React.useState('');
    const [isScannerOpen, setIsScannerOpen] = React.useState(false);

    const handleWarehouseClose = () => {
        setIsWarehouseOpen(false);
        setWarehouseEditId(null);
        setWarehouseFormData(null);
    };

    const handleCountryClose = () => {
        setIsCountryOpen(false);
        setCountryEditId(null);
        setCountryFormData(null);
    };

    const handleCityClose = () => {
        setIsCityOpen(false);
        setCityEditId(null);
        setCityFormData(null);
    };

    const handleEdit = (data: any) => {
        setWarehouseEditId(String(data.id));
        setWarehouseFormData({
            name: data.name,
            countryId: data.countryId ? String(data.countryId) : '',
            cityId: data.cityId ? String(data.cityId) : ''
        });
        setIsWarehouseOpen(true);
    }

    const handleCountryEdit = (data: any) => {
        setCountryEditId(String(data.id));
        setCountryFormData({
            name: data.name,
        });
        setIsCountryOpen(true);
    };

    const handleCityEdit = (data: any) => {
        setCityEditId(String(data.id));
        setCityFormData({
            name: data.name,
            countryId: data.countryId ? String(data.countryId) : '',
        });
        setIsCityOpen(true);
    };

    const handledelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف المستودع...');
        const confirmed = confirm("هل أنت متأكد من حذف هذا المستودع؟");
        if (confirmed) {
            try {
                const res = await deleteWarehouse(data.id)
                if (res.success) {
                    toast.success("تم حذف المستودع بنجاح")
                } else {
                    toast.error("حدث خطأ أثناء حذف المستودع: " + (res.error || "فشل في حذف المستودع، قد يكون مرتبطًا بسجلات أخرى"))
                }
            } catch (error: any) {
                toast.error("خطأ", error)
            } finally {
                toast.dismiss(loadingToast)
                getData()
            }
        }
    }
    const handleCountryDelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف البلد...');
        const confirmed = confirm('هل أنت متأكد من حذف هذا البلد؟');
        if (confirmed) {
            try {
                const res = await deleteCountry(String(data.id));
                if (res.success) {
                    toast.success('تم حذف البلد بنجاح');
                } else {
                    toast.error(res.error || 'تعذر حذف البلد');
                }
            } catch (error: any) {
                toast.error('حدث خطأ أثناء حذف البلد');
                console.error(error);
            } finally {
                toast.dismiss(loadingToast);
                getData();
            }
        } else {
            toast.dismiss(loadingToast);
        }
    };

    const handleCityDelete = async (data: any) => {
        const loadingToast = toast.loading('جاري حذف المدينة...');
        const confirmed = confirm('هل أنت متأكد من حذف هذه المدينة؟');
        if (!confirmed) {
            toast.dismiss(loadingToast);
            return;
        }
        try {
            const result = await deleteCity(String(data.id));
            if (result.success) {
                toast.success('تم حذف المدينة بنجاح');
            } else {
                toast.error(result.error || 'تعذر حذف المدينة');
            }
        } catch (error: any) {
            toast.error('حدث خطأ أثناء حذف المدينة');
            console.error(error);
        } finally {
            toast.dismiss(loadingToast);
            getData();
        }
    };

    const onWarehouseSubmit = async (data: z.infer<typeof warehouseSchema>) => {
        const loadingToast = toast.loading(warehouseEditId ? 'جاري تحديث البيانات...' : 'جاري إنشاء المستودع...');
        try {
            if (warehouseEditId) {
                const result = await updateWarehouse(warehouseEditId, data);
                if (result.success) {
                    toast.success('تم تحديث بيانات المستودع بنجاح');
                    handleWarehouseClose();
                } else {
                    toast.error(result.error || 'فشل في تحديث بيانات المستودع');
                }
            } else {
                const result = await createWarehouse(data);
                if (result.success) {
                    toast.success('تم إنشاء المستودع بنجاح');
                    handleWarehouseClose();
                } else {
                    toast.error(result.error || 'فشل في إنشاء المستودع، يرجى التحقق من المدخلات');
                }
            }
        } catch (error) {
            toast.error('حدث خطأ غير متوقع');
            console.error(error);
        } finally {
            toast.dismiss(loadingToast);
            getData();
        }
    };

    const onCountrySubmit = async (data: z.infer<typeof countrySchema>) => {
        const loadingToast = toast.loading(countryEditId ? 'جاري تحديث البلد...' : 'جاري إنشاء البلد...');
        try {
            if (countryEditId) {
                const result = await updateCountry(countryEditId, data);
                if (result.success) {
                    toast.success('تم تحديث البلد بنجاح');
                    handleCountryClose();
                } else {
                    toast.error(result.error || 'فشل في تحديث البلد');
                }
            } else {
                const result = await createCountry(data);
                if (result.success) {
                    toast.success('تم إنشاء البلد بنجاح');
                    handleCountryClose();
                } else {
                    toast.error(result.error || 'فشل في إنشاء البلد');
                }
            }
        } catch (error) {
            toast.error('حدث خطأ غير متوقع');
            console.error(error);
        } finally {
            toast.dismiss(loadingToast);
            getData();
        }
    };

    const onCitySubmit = async (data: z.infer<typeof citySchema>) => {
        const loadingToast = toast.loading(cityEditId ? 'جاري تحديث المدينة...' : 'جاري إنشاء المدينة...');
        try {
            const result = cityEditId ? await updateCity(cityEditId, data) : await createCity(data);
            if (result.success) {
                toast.success(cityEditId ? 'تم تحديث المدينة بنجاح' : 'تم إنشاء المدينة بنجاح');
                handleCityClose();
            } else {
                toast.error(result.error || 'فشل في حفظ المدينة');
            }
        } catch (error) {
            toast.error('حدث خطأ غير متوقع');
            console.error(error);
        } finally {
            toast.dismiss(loadingToast);
            getData();
        }
    };

    const getData = async () => {
        const [warehouseRows, countryRows, cityRows] = await Promise.all([
            getWarehouse(),
            getCountries(),
            getCities(),
        ]);

        setWarehouses(warehouseRows);
        setCountries(countryRows);
        setCities(cityRows);
    }

    React.useEffect(() => { getData(); }, []);

    // ===== تفاصيل المستودع =====
    const openWarehouseDetails = async (warehouse: any) => {
        setSelectedWarehouse(warehouse);
        setDetailsOpen(true);
        setDetailsLoading(true);
        setDetailsTab('products');
        try {
            const res = await getWarehouseDetails(String(warehouse.id));
            if (res.success) {
                setWarehouseDetails(res.data);
            } else {
                toast.error(res.error || 'فشل في جلب تفاصيل المستودع');
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء جلب التفاصيل');
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetails = () => {
        setDetailsOpen(false);
        setSelectedWarehouse(null);
        setWarehouseDetails(null);
        setDetailsTab('products');
    };

    // ===== حركة المخزون =====
    const openMovement = async (warehouse?: any) => {
        setMovementOpen(true);
        setMovementType('IN');
        setSourceWarehouseId(warehouse ? String(warehouse.id) : '');
        setMovementItems([{ id: '1', productId: '', productName: '', quantity: '' }]);
        setProductSearch({});
        setProductDropdownOpen({});
        setMovementReason('');
        if (!inventoryData) {
            try {
                const data = await getInventoryData();
                setInventoryData(data);
            } catch (error) {
                toast.error('فشل في تحميل بيانات المخزون');
            }
        }
    };

    const closeMovement = () => {
        setMovementOpen(false);
        setSourceWarehouseId('');
        setMovementItems([{ id: '1', productId: '', productName: '', quantity: '' }]);
        setProductSearch({});
        setProductDropdownOpen({});
        setMovementReason('');
    };

    const handleMovementSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!sourceWarehouseId) {
            toast.error('يرجى اختيار المستودع');
            return;
        }
        const validItems = movementItems
            .filter(item => item.productId && Number(item.quantity) > 0)
            .map(item => ({ productId: Number(item.productId), quantity: Number(item.quantity) }));

        if (validItems.length === 0) {
            toast.error('يرجى إضافة منتج واحد على الأقل بكمية صحيحة');
            return;
        }

        if (movementType === 'TRANSFER') {
            const targetId = (e.currentTarget.elements.namedItem('targetWarehouseId') as HTMLSelectElement)?.value;
            if (!targetId) {
                toast.error('يرجى اختيار مستودع الوجهة');
                return;
            }
        }

        setMovementLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await createMovementAction({
            items: validItems,
            warehouseId: Number(sourceWarehouseId),
            targetWarehouseId: formData.get("targetWarehouseId") ? Number(formData.get("targetWarehouseId")) : null,
            type: movementType,
            reason: movementReason,
        });
        if (res.success) {
            toast.success('تم تسجيل الحركة بنجاح');
            closeMovement();
            if (detailsOpen && selectedWarehouse) {
                openWarehouseDetails(selectedWarehouse);
            }
            getData();
        } else {
            toast.error(res.error || 'فشل في تسجيل الحركة');
        }
        setMovementLoading(false);
    };

    const availableWarehousesForMovement = (inventoryData?.warehouses || []).filter((w: any) => w.id !== Number(sourceWarehouseId));

    const movementProductOptions = React.useMemo(() => {
        if (!inventoryData) return [];
        if (movementType === 'IN') {
            return inventoryData.products || [];
        }
        return Array.from(new Map(
            (inventoryData.stocks || [])
                .filter((s: any) => Number(s.warehouseId) === Number(sourceWarehouseId) && (Number(s.quantity) > 0 || movementType === 'ADJUSTMENT'))
                .map((s: any) => [s.product.id, s.product])
        ).values());
    }, [inventoryData, movementType, sourceWarehouseId]);

    const addMovementItem = () => {
        const newId = String(Date.now() + Math.random());
        setMovementItems((prev) => [...prev, { id: newId, productId: '', productName: '', quantity: '' }]);
    };

    const removeMovementItem = (id: string) => {
        setMovementItems((prev) => prev.filter((item) => item.id !== id));
    };

    const updateMovementItem = (id: string, updates: Partial<MovementItem>) => {
        setMovementItems((prev) => prev.map((item) => item.id === id ? { ...item, ...updates } : item));
    };

    const filteredProductOptions = (term: string) => {
        const normalized = term.trim().toLowerCase();
        return normalized
            ? movementProductOptions.filter((p: any) => String(p.name || '').toLowerCase().includes(normalized))
            : movementProductOptions;
    };

    // مسح الباركود: يضيف المنتج لبنود الحركة أو يزيد كميته بمقدار 1
    const handleMovementScan = (code: string) => {
        const product = movementProductOptions.find((p: any) => String(p?.barcode || '') === code);
        if (!product) {
            toast.error('لم يتم العثور على منتج بهذا الباركود');
            return;
        }

        const productId = String(product.id);
        const existingItem = movementItems.find((item) => item.productId === productId);
        if (existingItem) {
            updateMovementItem(existingItem.id, { quantity: String(Number(existingItem.quantity || 0) + 1) });
        } else {
            const emptyItem = movementItems.find((item) => !item.productId);
            if (emptyItem) {
                updateMovementItem(emptyItem.id, { productId, productName: product.name, quantity: '1' });
                setProductSearch((prev) => ({ ...prev, [emptyItem.id]: product.name }));
                setProductDropdownOpen((prev) => ({ ...prev, [emptyItem.id]: false }));
            } else {
                const newId = String(Date.now() + Math.random());
                setMovementItems((prev) => [...prev, { id: newId, productId, productName: product.name, quantity: '1' }]);
                setProductSearch((prev) => ({ ...prev, [newId]: product.name }));
            }
        }
        toast.success(`تم مسح: ${product.name}`);
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة البلدان</div>
                {isAdminUser && (
                    <Button
                        onClick={() => { setCountryEditId(null); setCountryFormData(null); setIsCountryOpen(true); }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                    >
                        إضافة بلد جديدة
                    </Button>
                )}
            </div>

            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {countries.map((country: any) => (
                        <motion.div
                            key={country.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-emerald-500 transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                                        {country.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {(country._count?.warehouses || 0)} مستودع مرتبط
                                    </p>
                                </div>

                                {isAdminUser && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleCountryEdit(country)}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleCountryDelete(country)}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>

            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة المدن</div>
                {isAdminUser && (
                    <Button
                        onClick={() => {
                            if (countries.length === 0) {
                                toast.error('أضف بلدًا واحدًا على الأقل قبل إنشاء مدينة');
                                return;
                            }
                            setCityEditId(null);
                            setCityFormData(null);
                            setIsCityOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                    >
                        إضافة مدينة جديدة
                    </Button>
                )}
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 mb-10">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-right">
                        <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                            <tr>
                                <th className="px-6 py-4">اسم المدينة</th>
                                <th className="px-6 py-4">البلد</th>
                                <th className="px-6 py-4">تاريخ الإنشاء</th>
                                <th className="px-6 py-4">إجراء</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            <AnimatePresence initial={false}>
                                {cities.map((city) => (
                                    <motion.tr
                                        key={city.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/30"
                                    >
                                        <td className="px-6 py-5 font-bold text-slate-900 dark:text-white">{city.name}</td>
                                        <td className="px-6 py-5 text-slate-600 dark:text-slate-300">{city.country?.name || '—'}</td>
                                        <td className="px-6 py-5 text-slate-500 dark:text-slate-400">{new Date(city.createdAt).toLocaleDateString('ar-EG')}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-2">
                                                {isAdminUser && (
                                                    <button
                                                        onClick={() => handleCityEdit(city)}
                                                        className="rounded-xl bg-slate-50 p-2.5 text-blue-600 transition-all hover:bg-blue-600 hover:text-white dark:bg-slate-800"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                                {isAdminUser && (
                                                    <button
                                                        onClick={() => handleCityDelete(city)}
                                                        className="rounded-xl bg-slate-50 p-2.5 text-red-500 transition-all hover:bg-red-500 hover:text-white dark:bg-slate-800"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <div className="text-xl font-bold">إدارة المستودعات

                </div>
                <div className="flex gap-2">
                    {isAdminUser && (
                        <Button
                            onClick={() => openMovement()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                        >
                            <ArrowRightLeft size={18} className="ml-2" />
                            حركة مخزون
                        </Button>
                    )}
                    {
                        user && hasPermission(user, "addCategories") && (
                            <Button
                                onClick={() => {
                                    if (countries.length === 0) {
                                        toast.error('أضف بلدًا واحدًا على الأقل قبل إنشاء مستودع');
                                        return;
                                    }
                                    setWarehouseEditId(null);
                                    setWarehouseFormData(null);
                                    setIsWarehouseOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            >
                                إضافة مستودع جديدة
                            </Button>
                        )
                    }
                </div>
            </div>

            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((cat: any) => (
                        <motion.div
                            key={cat.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm group hover:border-blue-500 transition-all"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-xl text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {cat.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{cat.location}</p>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {(cat._count?.stocks || 0)} منتج مرتبط
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openWarehouseDetails(cat)}
                                        className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                        title="عرض التفاصيل"
                                    >
                                        <Eye size={16} />
                                    </button>
                                    {user && hasPermission(user, "editCategories") && (
                                        <button
                                            onClick={() => handleEdit(cat)}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {user && hasPermission(user, "deleteCategories") && (
                                        <button
                                            onClick={() => handledelete(cat)}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </AnimatePresence>

            {/* مودال تفاصيل المستودع */}
            {detailsOpen && selectedWarehouse && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] overflow-y-auto p-4">
                    <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2.5rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-10">
                                <div>
                                    <h3 className="font-black text-xl dark:text-white">{selectedWarehouse.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedWarehouse.location}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAdminUser && (
                                        <button
                                            onClick={() => openMovement(selectedWarehouse)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition"
                                        >
                                            <Plus size={16} />
                                            حركة مخزون
                                        </button>
                                    )}
                                    <button onClick={closeDetails} className="p-2 dark:text-white hover:text-red-500 transition"><X size={22} /></button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 border-b dark:border-slate-800 sticky top-[85px] z-10">
                                {[
                                    { key: 'products', label: 'المنتجات', icon: Package },
                                    { key: 'orders', label: 'الطلبات', icon: FileText },
                                    { key: 'movements', label: 'حركات المخزون', icon: ArrowRightLeft },
                                    { key: 'warranties', label: 'الكفالات', icon: ShieldCheck },
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setDetailsTab(tab.key as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${detailsTab === tab.key ? 'bg-white dark:bg-slate-700 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        <tab.icon size={16} />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6">
                                {detailsLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="animate-spin text-blue-600" size={32} />
                                    </div>
                                ) : !warehouseDetails ? (
                                    <div className="text-center py-12 text-slate-500 dark:text-slate-400 font-bold">لا توجد بيانات</div>
                                ) : (
                                    <div>
                                        {detailsTab === 'products' && (
                                            <div className="overflow-x-auto rounded-[1.5rem] border dark:border-slate-800">
                                                <table className="w-full min-w-[600px]">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs text-center">
                                                        <tr>
                                                            <th className="p-4 text-right">المنتج</th>
                                                            <th className="p-4">رقم الموديل</th>
                                                            <th className="p-4">الكمية</th>
                                                            <th className="p-4">سعر الجملة</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-slate-800">
                                                        {(warehouseDetails.stocks || []).length === 0 ? (
                                                            <tr><td colSpan={4} className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد منتجات في هذا المستودع</td></tr>
                                                        ) : (
                                                            warehouseDetails.stocks.map((stock: any) => (
                                                                <tr key={stock.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-center">
                                                                    <td className="p-4 text-right font-bold dark:text-slate-200">{stock.product?.name}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-300">{stock.product?.modelNumber || '—'}</td>
                                                                    <td className="p-4 text-lg font-mono font-bold text-blue-600 dark:text-blue-400">{stock.quantity}</td>
                                                                    <td className="p-4 text-slate-700 dark:text-slate-200">{Number(stock.price || 0).toLocaleString()} $</td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {detailsTab === 'orders' && (
                                            <div className="overflow-x-auto rounded-[1.5rem] border dark:border-slate-800">
                                                <table className="w-full min-w-[700px]">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs text-center">
                                                        <tr>
                                                            <th className="p-4 text-right">رقم الطلب</th>
                                                            <th className="p-4">العميل</th>
                                                            <th className="p-4">الحالة</th>
                                                            <th className="p-4">المبلغ</th>
                                                            <th className="p-4">التاريخ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-slate-800">
                                                        {(warehouseDetails.orders || []).length === 0 ? (
                                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد طلبات مرتبطة بهذا المستودع</td></tr>
                                                        ) : (
                                                            warehouseDetails.orders.map((order: any) => (
                                                                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-center">
                                                                    <td className="p-4 text-right font-bold dark:text-slate-200">#{order.id}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-300">{order.customer?.name || order.receiverName || '—'}</td>
                                                                    <td className="p-4"><span className="px-3 py-1 rounded-lg text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">{order.status}</span></td>
                                                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{Number(order.finalAmount || 0).toLocaleString()} $</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                                                        {new Date(order.manualCreatedAt || order.createdAt).toLocaleDateString('ar-EG')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {detailsTab === 'movements' && (
                                            <div className="overflow-x-auto rounded-[1.5rem] border dark:border-slate-800">
                                                <table className="w-full min-w-[700px]">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs text-center">
                                                        <tr>
                                                            <th className="p-4 text-right">المنتج</th>
                                                            <th className="p-4">النوع</th>
                                                            <th className="p-4">الكمية</th>
                                                            <th className="p-4">الموظف</th>
                                                            <th className="p-4">التاريخ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-slate-800">
                                                        {(warehouseDetails.movements || []).length === 0 ? (
                                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد حركات مخزون</td></tr>
                                                        ) : (
                                                            warehouseDetails.movements.map((movement: any) => (
                                                                <tr key={movement.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-center">
                                                                    <td className="p-4 text-right font-bold dark:text-slate-200">{movement.product?.name}</td>
                                                                    <td className="p-4">
                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                                                            movement.type === 'IN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                                            movement.type === 'OUT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                            movement.type === 'TRANSFER' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                                        }`}>
                                                                            {movement.type === 'IN' && 'توريد'}
                                                                            {movement.type === 'OUT' && 'صرف'}
                                                                            {movement.type === 'TRANSFER' && 'تحويل'}
                                                                            {movement.type === 'ADJUSTMENT' && 'تسوية'}
                                                                            {movement.type === 'RETURN' && 'مرتجع'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-lg font-mono font-bold text-slate-700 dark:text-slate-200">{movement.quantity}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">{movement.user?.username || '—'}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                                                        {new Date(movement.createdAt).toLocaleDateString('ar-EG')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {detailsTab === 'warranties' && (
                                            <div className="overflow-x-auto rounded-[1.5rem] border dark:border-slate-800">
                                                <table className="w-full min-w-[700px]">
                                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs text-center">
                                                        <tr>
                                                            <th className="p-4 text-right">المنتج</th>
                                                            <th className="p-4">النوع</th>
                                                            <th className="p-4">الكمية</th>
                                                            <th className="p-4">العميل</th>
                                                            <th className="p-4">التاريخ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y dark:divide-slate-800">
                                                        {(warehouseDetails.warranties || []).length === 0 ? (
                                                            <tr><td colSpan={5} className="p-8 text-center text-slate-500 dark:text-slate-400">لا يوجد كفالات مرتبطة بهذا المستودع</td></tr>
                                                        ) : (
                                                            warehouseDetails.warranties.map((warranty: any) => (
                                                                <tr key={warranty.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition text-center">
                                                                    <td className="p-4 text-right font-bold dark:text-slate-200">{warranty.product?.name}</td>
                                                                    <td className="p-4">
                                                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                                                            warranty.type === 'REPLACEMENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                            warranty.type === 'MAINTENANCE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                                        }`}>
                                                                            {warranty.type === 'REPLACEMENT' && 'تبديل'}
                                                                            {warranty.type === 'MAINTENANCE' && 'صيانة'}
                                                                            {warranty.type === 'DAMAGED' && 'تالف'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-4 text-lg font-mono font-bold text-slate-700 dark:text-slate-200">{warranty.quantity}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-300">{warranty.customer?.name || '—'}</td>
                                                                    <td className="p-4 text-sm text-slate-500 dark:text-slate-400">
                                                                        {new Date(warranty.createdAt).toLocaleDateString('ar-EG')}
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* مودال حركة المخزون */}
            {movementOpen && inventoryData && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] overflow-y-auto p-4">
                    <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2.5rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-10">
                                <h3 className="font-black text-xl dark:text-white">إضافة حركة مخزون</h3>
                                <button onClick={closeMovement} className="dark:text-white hover:text-red-500 transition"><X size={22} /></button>
                            </div>

                            <form onSubmit={handleMovementSubmit} className="p-8 space-y-6">
                                <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
                                    {movementTabs.map((tab) => (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setMovementType(tab.key)}
                                            className={`min-w-[80px] flex-1 py-3 rounded-xl font-bold text-sm transition ${movementType === tab.key ? 'bg-white dark:bg-slate-700 dark:text-white shadow-md' : 'text-slate-400'}`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold dark:text-slate-500 uppercase mr-2">المستودع {movementType === 'TRANSFER' ? '(من)' : ''}</label>
                                        <select
                                            name="warehouseId"
                                            value={sourceWarehouseId}
                                            onChange={(e) => setSourceWarehouseId(e.target.value)}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none"
                                            required
                                        >
                                            <option value="">اختر المستودع...</option>
                                            {(inventoryData.warehouses || []).map((w: any) => (
                                                <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {movementType === 'TRANSFER' && (
                                        <div className="space-y-2 animate-in slide-in-from-right">
                                            <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mr-2">إلى مستودع (الوجهة)</label>
                                            <select
                                                name="targetWarehouseId"
                                                className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 dark:text-white border border-blue-200 dark:border-blue-800 rounded-2xl outline-none"
                                                required
                                            >
                                                <option value="">اختر الوجهة...</option>
                                                {availableWarehousesForMovement.map((w: any) => (
                                                    <option key={w.id} value={w.id}>{w.name} ({w.location})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs font-bold dark:text-slate-500 uppercase">المنتجات</label>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsScannerOpen(true)}
                                                className="flex items-center gap-1 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition"
                                            >
                                                <ScanLine size={16} />
                                                مسح بالباركود
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addMovementItem}
                                                className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700 transition"
                                            >
                                                <Plus size={16} />
                                                إضافة منتج
                                            </button>
                                        </div>
                                    </div>

                                    {movementItems.map((item, index) => (
                                        <div key={item.id} className="relative p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 space-y-3">
                                            {movementItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeMovementItem(item.id)}
                                                    className="absolute left-3 top-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                            <div className="space-y-2 relative">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">المنتج {index + 1}</label>
                                                <div className="relative">
                                                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="ابحث عن منتج..."
                                                        value={productSearch[item.id] || ''}
                                                        onChange={(e) => {
                                                            setProductSearch((prev) => ({ ...prev, [item.id]: e.target.value }));
                                                            setProductDropdownOpen((prev) => ({ ...prev, [item.id]: true }));
                                                            if (item.productId) updateMovementItem(item.id, { productId: '', productName: '' });
                                                        }}
                                                        onFocus={() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: true }))}
                                                        onBlur={() => setTimeout(() => setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false })), 200)}
                                                        className="w-full p-4 pr-10 bg-white dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500"
                                                    />
                                                    {item.productId && (
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                                            تم الاختيار
                                                        </span>
                                                    )}
                                                </div>
                                                {productDropdownOpen[item.id] && (
                                                    <div className="absolute z-20 w-full mt-1 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-xl">
                                                        {(() => {
                                                            const filtered = filteredProductOptions(productSearch[item.id] || '');
                                                            if (filtered.length === 0) {
                                                                return <div className="p-4 text-sm text-center text-slate-500 dark:text-slate-400">لا يوجد منتجات مطابقة</div>;
                                                            }
                                                            return filtered.map((p: any) => (
                                                                <button
                                                                    key={p.id}
                                                                    type="button"
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        updateMovementItem(item.id, { productId: String(p.id), productName: p.name });
                                                                        setProductSearch((prev) => ({ ...prev, [item.id]: p.name }));
                                                                        setProductDropdownOpen((prev) => ({ ...prev, [item.id]: false }));
                                                                    }}
                                                                    className={`w-full text-right px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition ${item.productId === String(p.id) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                                                                >
                                                                    {p.name}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                )}
                                                {movementProductOptions.length === 0 && sourceWarehouseId && movementType !== 'IN' && (
                                                    <p className="text-xs text-red-500 mt-1">لا يوجد منتجات متاحة في هذا المستودع</p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{movementType === 'ADJUSTMENT' ? 'الكمية الفعلية' : 'الكمية'}</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={item.quantity}
                                                    onChange={(e) => updateMovementItem(item.id, { quantity: e.target.value })}
                                                    className="w-full p-4 bg-white dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold dark:text-slate-500 uppercase mr-2">ملاحظات</label>
                                    <input
                                        value={movementReason}
                                        onChange={(e) => setMovementReason(e.target.value)}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500"
                                    />
                                </div>

                                <button disabled={movementLoading} className="w-full bg-blue-600 dark:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                                    {movementLoading ? "جاري الحفظ..." : "تأكيد العملية"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ماسح الباركود — يظهر فوق مودال حركة المخزون */}
            <div className="relative z-[100]">
                <BarcodeScannerModal
                    isOpen={isScannerOpen}
                    onClose={() => setIsScannerOpen(false)}
                    onScan={handleMovementScan}
                    title="مسح باركود المنتجات"
                    continuous
                />
            </div>

            <AppModal
                title={warehouseEditId ? "تعديل بيانات المستودع" : "إضافة مستودع جديدة"}
                isOpen={isWarehouseOpen}
                onClose={handleWarehouseClose}
            >
                <div className="p-2 max-h-[80vh]">
                    <DynamicForm
                        schema={warehouseSchema}
                        onSubmit={onWarehouseSubmit}
                        defaultValues={warehouseFormData}
                        key={warehouseEditId || 'create'}
                        submitLabel={warehouseEditId ? 'تحديث البيانات' : 'إرسال البيانات'}
                    >
                        {({ register, watch, setValue, formState: { errors } }) => {
                            const selectedCountryId = watch('countryId');
                            const availableCities = cityOptions(selectedCountryId);
                            return (
                                <div className="grid gap-4">
                                    <FormInput
                                        className='text-gray-800 dark:text-white'
                                        label="اسم المستودع"
                                        {...register("name")}
                                        error={errors.name?.message as string}
                                    />
                                    <FormSelect
                                        options={countryOptions}
                                        className='text-gray-800 dark:text-white'
                                        label="بلد المستودع"
                                        {...register("countryId", {
                                            onChange: () => setValue('cityId', ''),
                                        })}
                                        error={errors.countryId?.message as string}
                                    />
                                    <FormSelect
                                        options={availableCities}
                                        className='text-gray-800 dark:text-white'
                                        label="مدينة المستودع"
                                        {...register("cityId")}
                                        error={errors.cityId?.message as string}
                                    />
                                </div>
                            );
                        }}
                    </DynamicForm>
                </div>
            </AppModal>
            <AppModal
                title={countryEditId ? 'تعديل البلد' : 'إضافة بلد جديدة'}
                isOpen={isCountryOpen}
                onClose={handleCountryClose}
            >
                <div className="p-2 max-h-[80vh]">
                    <DynamicForm
                        schema={countrySchema}
                        onSubmit={onCountrySubmit}
                        defaultValues={countryFormData}
                        key={countryEditId || 'country-create'}
                        submitLabel={countryEditId ? 'تحديث البلد' : 'إرسال البيانات'}
                    >
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <FormInput
                                    className='text-gray-800 dark:text-white'
                                    label="اسم البلد"
                                    {...register('name')}
                                    error={errors.name?.message as string}
                                />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
            <AppModal
                title={cityEditId ? 'تعديل المدينة' : 'إضافة مدينة جديدة'}
                isOpen={isCityOpen}
                onClose={handleCityClose}
            >
                <div className="p-2 max-h-[80vh]">
                    <DynamicForm
                        schema={citySchema}
                        onSubmit={onCitySubmit}
                        defaultValues={cityFormData}
                        key={cityEditId || 'city-create'}
                        submitLabel={cityEditId ? 'تحديث المدينة' : 'إرسال البيانات'}
                    >
                        {({ register, formState: { errors } }) => (
                            <div className="grid gap-4">
                                <FormInput
                                    className='text-gray-800 dark:text-white'
                                    label="اسم المدينة"
                                    {...register('name')}
                                    error={errors.name?.message as string}
                                />
                                <FormSelect
                                    options={countryOptions}
                                    className='text-gray-800 dark:text-white'
                                    label="بلد المدينة"
                                    {...register('countryId')}
                                    error={errors.countryId?.message as string}
                                />
                            </div>
                        )}
                    </DynamicForm>
                </div>
            </AppModal>
        </div>
    );
};

export default CategoriesLayout;
