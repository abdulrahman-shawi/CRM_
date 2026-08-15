import React from 'react';
import { getOrders, getOrdersByUser } from '@/server/order';
import { getCustomerList } from '@/server/customer';
import { getProductCatalog } from '@/server/product';

interface User {
  id: string;
  username?: string;
  name?: string;
}

export const useOrderData = (user?: User) => {
  const [products, setProduct] = React.useState<any[]>([]);
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [orders, setOrders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSupportingDataLoading, setIsSupportingDataLoading] = React.useState(false);
  const supportingDataPromiseRef = React.useRef<Promise<void> | null>(null);

  const refreshOrders = async () => {
    setIsLoading(true);
    try {
      const ordersRes = await getOrders();
      setOrders(ordersRes?.success ? (ordersRes.data || []) : []);
    } catch (error) {
      console.error("Error refreshing orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    await refreshOrders();
  };

  // جلب طلبات عميل محدد
  const loadOrdersByCustomer = async (customerId: string) => {
    try {
      const res = await getOrdersByUser(customerId);
      if (res.success) {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error("Error loading customer orders:", error);
      return [];
    }
  };

  const refreshCustomers = async () => {
    try {
      const customersRes = await getCustomerList();
      setCustomers(customersRes?.success ? (customersRes.data || []) : []);
    } catch (error) {
      console.error("Error refreshing customers:", error);
    }
  };

  const refreshProducts = async () => {
    try {
      const productsRes = await getProductCatalog();
      setProduct(Array.isArray(productsRes) ? productsRes : []);
    } catch (error) {
      console.error("Error refreshing products:", error);
    }
  };

  const ensureSupportingDataLoaded = async () => {
    const hasProducts = products.length > 0;
    const hasCustomers = customers.length > 0;

    if (hasProducts && hasCustomers) {
      return;
    }

    if (supportingDataPromiseRef.current) {
      return supportingDataPromiseRef.current;
    }

    setIsSupportingDataLoading(true);

    supportingDataPromiseRef.current = (async () => {
      try {
        const [productsData, customersRes] = await Promise.all([
          hasProducts ? Promise.resolve(products) : getProductCatalog(),
          hasCustomers ? Promise.resolve({ success: true, data: customers }) : getCustomerList(),
        ]);

        if (!hasProducts) {
          setProduct(Array.isArray(productsData) ? productsData : []);
        }

        if (!hasCustomers) {
          setCustomers(customersRes?.success ? (customersRes.data || []) : []);
        }
      } finally {
        supportingDataPromiseRef.current = null;
        setIsSupportingDataLoading(false);
      }
    })();

    return supportingDataPromiseRef.current;
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return {
    products,
    setProduct,
    customers,
    setCustomers,
    orders,
    setOrders,
    isLoading,
    isSupportingDataLoading,
    loadData,
    loadOrdersByCustomer,
    refreshOrders,
    refreshCustomers,
    refreshProducts,
    ensureSupportingDataLoaded,
  };
};
