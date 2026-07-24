'use client';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { AppModal } from '@/components/ui/app-modal';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/ui/form-input';
import { FormSelect } from '@/components/ui/select-form';
import { useAuth } from '@/context/AuthContext';
import { hasPermission, isAdmin } from '@/lib/utils';
import { createCountry, deleteCountry, getCountries, updateCountry } from '@/server/country';
import { createCity, deleteCity, getCities } from '@/server/city';
import { createWarehouse, deleteWarehouse, getWarehouse, getWarehouseDetails, updateWarehouse } from '@/server/warehouse';
import { createMovementAction, getInventoryData } from '@/server/move';
import { AnimatePresence, motion } from 'framer-motion';
import { Edit, Trash2, Eye, Package, FileText, ArrowRightLeft, Plus, X, Loader2 } from 'lucide-react';
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

const movementTabs = [
    { key: 'IN', label: 'توريد (IN)' },
    { key: 'OUT', label: 'صرف (OUT)' },
    { key: 'TRANSFER', label: 'تحويل' },
    { key: 'ADJUSTMENT', label: 'جرد / تسوية' },
];

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
    const [detailsTab, setDetailsTab] = React.useState<'products' | 'orders' | 'movements'>('products');
    const [detailsLoading, setDetailsLoading] = React.useState(false);

    // ===== حركة المخزون =====
    const [movementOpen, setMovementOpen] = React.useState(false);
    const [movementLoading, setMovementLoading] = React.useState(false);
    const [movementType, setMovementType] = React.useState<string>('IN');
    const [inventoryData, setInventoryData] = React.useState<any>(null);
    const [sourceWarehouseId, setSourceWarehouseId] = React.useState<string>('');
    const [movementFormKey, setMovementFormKey] = React.useState(0);

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
        setMovementFormKey((k) => k + 1);
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
    };

    const handleMovementSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMovementLoading(true);
        const formData = new FormData(e.currentTarget);
        const res = await createMovementAction({
            productId: Number(formData.get("productId")),
            warehouseId: Number(formData.get("warehouseId")),
            targetWarehouseId: formData.get("targetWarehouseId") ? Number(formData.get("targetWarehouseId")) : null,
            quantity: Number(formData.get("quantity")),
            type: movementType,
            reason: formData.get("reason"),
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

    const countryOptionsForMovement = inventoryData?.countries?.map((country: any) => ({
        value: String(country.id),
        label: country.name,
    })) || [];

    const availableWarehousesForMovement = (inventoryData?.warehouses || []).filter((w: any) => w.id !== Number(sourceWarehouseId));

    const movementProductOptions = React.useMemo(() => {
        if (!inventoryData) return [];
        if (movementType === 'IN') {
            return inventoryData.products || [];
        }
        // لباقي العمليات نعرض فقط المنتجات التي لها رصيد في المستودع المصدر
        return Array.from(new Map(
            (inventoryData.stocks || [])
                .filter((s: any) => Number(s.warehouseId) === Number(sourceWarehouseId) && (Number(s.quantity) > 0 || movementType === 'ADJUSTMENT'))
                .map((s: any) => [s.product.id, s.product])
        ).values());
    }, [inventoryData, movementType, sourceWarehouseId]);

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
                        <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[2.5rem] shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200">
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex justify-between items-center sticky top-0 z-10">
                                <h3 className="font-black text-xl dark:text-white">إضافة حركة مخزون</h3>
                                <button onClick={closeMovement} className="dark:text-white hover:text-red-500 transition"><X size={22} /></button>
                            </div>

                            <form key={movementFormKey} onSubmit={handleMovementSubmit} className="p-8 space-y-6">
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

                                <div className="space-y-2">
                                    <label className="text-xs font-bold dark:text-slate-500 uppercase mr-2">المنتج</label>
                                    <select
                                        name="productId"
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none"
                                        required
                                    >
                                        <option value="">اختر المنتج...</option>
                                        {movementProductOptions.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {movementProductOptions.length === 0 && sourceWarehouseId && movementType !== 'IN' && (
                                        <p className="text-xs text-red-500 mt-1">لا يوجد منتجات متاحة في هذا المستودع</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold dark:text-slate-500 uppercase mr-2">{movementType === 'ADJUSTMENT' ? 'الكمية الفعلية' : 'الكمية'}</label>
                                        <input name="quantity" type="number" step="any" className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold dark:text-slate-500 uppercase mr-2">ملاحظات</label>
                                        <input name="reason" className="w-full p-4 bg-slate-50 dark:bg-slate-950 dark:text-white border dark:border-slate-800 rounded-2xl outline-none focus:ring-2 ring-blue-500" />
                                    </div>
                                </div>

                                <button disabled={movementLoading} className="w-full bg-blue-600 dark:bg-blue-500 text-white py-5 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                                    {movementLoading ? "جاري الحفظ..." : "تأكيد العملية"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

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
        </div>
    );
};

export default CategoriesLayout;
