interface FieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function Field({
  label,
  name,
  type = "text",
  value,
  placeholder,
  required,
  minLength,
  autoComplete,
  onChange,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}
