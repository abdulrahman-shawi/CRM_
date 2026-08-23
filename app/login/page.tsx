'use client';
import { DynamicForm } from '@/components/shared/dynamic-form';
import { FormInput } from '@/components/ui/form-input';
import { useAuth } from '@/context/AuthContext';

import * as React from 'react';
import toast from 'react-hot-toast';
import z from 'zod';

interface ILogInProps {
}

const logInSchema = z.object({
  email: z.string().email("يجب أن يكون بريد إلكتروني صالح"),
  password: z.string().min(5, "كلمة المرور يجب أن تكون 5 أحرف على الأقل"),
});

const handleSubmit = async (data: z.infer<typeof logInSchema>) => {
  try {
    const response = await fetch(`/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (response.status === 200) {
      toast.success("تم تسجيل الدخول بنجاح");
      // يفضل استخدام router.push من next/navigation بدلاً من window.location
      window.location.href = "/dashboard"; 
    } else {
      toast.error(result.error || "فشل تسجيل الدخول");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    toast.error("حدث خطأ في الاتصال بالسيرفر");
  }
}

const LogIn: React.FunctionComponent<ILogInProps> = (props) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Log In</h1>
        <DynamicForm
        schema={logInSchema}
        onSubmit={handleSubmit}
        >
          {({ register, formState: { errors } }) => (
          <div className="grid gap-4 py-4">
            <FormInput
              label="البريد الإلكتروني"
              {...register("email")}
              error={typeof errors.email?.message === "string" ? errors.email.message : undefined}
            />
            <FormInput
              label="كلمة المرور"
              {...register("password")}
              error={typeof errors.password?.message === "string" ? errors.password.message : undefined}
            />
          </div>
        )}
        </DynamicForm>
        {user && (<div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          مرحباً، {user.accountType}!
        </div>
        )}
      </div>
    </div>
  );
};

export default LogIn;
