import { Input } from "@/components/ui/Input";
import { GHANA_REGIONS } from "@/lib/constants";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { CheckoutFormValues } from "@/lib/validations/schema";

interface CheckoutDeliveryFormProps {
  register: UseFormRegister<CheckoutFormValues>;
  errors: FieldErrors<CheckoutFormValues>;
}

export default function CheckoutDeliveryForm({ register, errors }: CheckoutDeliveryFormProps) {
  return (
    <>
      {/* Contact */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" placeholder="Kwame Mensah" {...register("fullName")} error={errors.fullName?.message} />
          <Input label="Phone Number" placeholder="054XXXXXXX" {...register("phone")} error={errors.phone?.message} />
          <div className="md:col-span-2">
            <Input label="Email Address" type="email" placeholder="kwame@example.com" {...register("email")} error={errors.email?.message} />
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Delivery Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Region</label>
            <select {...register("region")} className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Region</option>
                {GHANA_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
            </select>
            {errors.region && <p className="text-xs text-red-500">{errors.region.message}</p>}
          </div>
          <Input label="City / Town" placeholder="Accra" {...register("city")} error={errors.city?.message} />
          <div className="md:col-span-2">
            <Input label="Street Name / Landmark" placeholder="Near the Catholic Church" {...register("address")} error={errors.address?.message} />
          </div>
          <div className="md:col-span-2">
            <Input label="GhanaPost GPS (Optional)" placeholder="GA-183-8164" {...register("gpsAddress")} error={errors.gpsAddress?.message} />
            <p className="text-[10px] text-slate-400 mt-1">Helps our riders find you faster.</p>
          </div>
        </div>
      </div>
    </>
  );
}
