import { useEffect } from "react";

import { Controller, useForm } from "react-hook-form";

// hooks
import useToast from "hooks/use-toast";
// services
import userService from "services/user.service";
// ui
import { CustomSelect, Input, PrimaryButton } from "components/ui";
// types
import { IUser } from "types";
// constant
import { USER_ROLES } from "constants/workspace";

const defaultValues: Partial<IUser> = {
  first_name: "",
  last_name: "",
  role: "",
};

type Props = {
  user?: IUser;
  setStep: React.Dispatch<React.SetStateAction<number | null>>;
  setUserRole: React.Dispatch<React.SetStateAction<string | null>>;
};

export const UserDetails: React.FC<Props> = ({ user, setStep, setUserRole }) => {
  const { setToastAlert } = useToast();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IUser>({
    defaultValues,
  });

  const onSubmit = async (formData: IUser) => {
    await userService
      .updateUser(formData)
      .then(() => {
        setToastAlert({
          title: "User details updated successfully!",
          type: "success",
        });
        setStep(2);
      })
      .catch((err) => {
        console.log(err);
      });
  };

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      });
      setUserRole(user.role);
    }
  }, [user, reset, setUserRole]);

  return (
    <form className="flex w-full items-center justify-center" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex w-full max-w-xl flex-col gap-7">
        <div className="flex flex-col rounded-[10px] bg-brand-base shadow-md">
          <div className="flex flex-col gap-2 justify-center px-7 pt-7 pb-3.5">
            <h3 className="text-base font-semibold text-brand-base">User Details</h3>
            <p className="text-sm text-brand-secondary">
              Enter your details as a first step to open your Plane account.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-4 px-7 py-3.5 sm:flex-row">
            <div className="flex flex-col items-start justify-center gap-1 w-full sm:w-1/2">
              <span className="mb-1.5">First name</span>
              <Input
                name="first_name"
                autoComplete="off"
                register={register}
                validations={{
                  required: "First name is required",
                }}
                error={errors.first_name}
              />
            </div>
            <div className="flex flex-col items-start justify-center gap-1 w-full sm:w-1/2">
              <span className="mb-1.5">Last name</span>
              <Input
                name="last_name"
                autoComplete="off"
                register={register}
                validations={{
                  required: "Last name is required",
                }}
                error={errors.last_name}
              />
            </div>
          </div>

          <div className="flex flex-col items-start justify-center gap-2.5 border-t border-brand-base px-7 pt-3.5 pb-7">
            <span>What is your role?</span>
            <div className="w-full">
              <Controller
                name="role"
                control={control}
                rules={{ required: "This field is required" }}
                render={({ field: { value, onChange } }) => (
                  <CustomSelect
                    value={value}
                    onChange={(value: any) => {
                      onChange(value);
                      setUserRole(value ?? null);
                    }}
                    label={value ? value.toString() : "Select your role"}
                    input
                    width="w-full"
                  >
                    {USER_ROLES.map((item) => (
                      <CustomSelect.Option key={item.value} value={item.value}>
                        {item.label}
                      </CustomSelect.Option>
                    ))}
                  </CustomSelect>
                )}
              />
              {errors.role && <span className="text-sm text-red-500">{errors.role.message}</span>}
            </div>
          </div>
        </div>

        <div className="flex w-full items-center justify-center ">
          <PrimaryButton
            type="submit"
            className="flex w-1/2 items-center justify-center text-center"
            size="md"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Continue"}
          </PrimaryButton>
        </div>
      </div>
    </form>
  );
};
