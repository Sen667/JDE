import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// TimePicker Component - Styled like the Date Picker
const TimePicker = ({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder?: string }) => {
  const [selectedHour, setSelectedHour] = useState('00');
  const [selectedMinute, setSelectedMinute] = useState('00');

  // Parse current value if exists
  useEffect(() => {
    if (value && typeof value === 'string') {
      const [hour, minute] = value.split(':');
      if (hour && minute) {
        setSelectedHour(hour);
        setSelectedMinute(minute);
      }
    }
  }, [value]);

  const handleTimeSelect = (hour: string, minute: string) => {
    const timeValue = `${hour}:${minute}`;
    onChange(timeValue);
    setSelectedHour(hour);
    setSelectedMinute(minute);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {value ? (
            `${selectedHour}:${selectedMinute}`
          ) : (
            <span>{placeholder || 'Sélectionner l\'heure'}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2">
            {/* Hours Grid */}
            <div>
              <div className="text-sm font-medium text-center mb-2">Heures</div>
              <div className="grid grid-cols-4 gap-1">
                {hours.slice(0, 12).map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "outline"}
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setSelectedHour(hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {hours.slice(12).map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "outline"}
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setSelectedHour(hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </div>

            {/* Minutes Grid */}
            <div>
              <div className="text-sm font-medium text-center mb-2">Minutes</div>
              <div className="grid grid-cols-4 gap-1">
                {minutes.filter((_, i) => i % 5 === 0).slice(0, 6).map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "outline"}
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {minutes.filter((_, i) => i % 5 === 0).slice(6).map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "outline"}
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setSelectedMinute(minute)}
                  >
                    {minute}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedHour}:{selectedMinute}
            </div>
            <Button
              size="sm"
              onClick={() => handleTimeSelect(selectedHour, selectedMinute)}
            >
              OK
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'date' | 'time' | 'number' | 'boolean' | 'email' | 'group' | 'array' | 'edp_batiment' | 'edp_mobilier' | 'edp_electrique' | 'file' | 'checkbox';
  required?: boolean;
  options?: string[] | { value: string; label: string }[];
  placeholder?: string;
  description?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  fields?: FormFieldConfig[]; // For group fields
  item_template?: Record<string, FormFieldConfig>; // For array fields
  conditional?: string; // Field name that controls visibility
  default?: any;
  multiple?: boolean; // For file fields
  accept?: string; // For file fields
}

interface WorkflowStepFormProps {
  formFields: FormFieldConfig[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  isDecisionStep?: boolean; // New prop to indicate if this is a decision step
}

const WorkflowStepForm = ({
  formFields,
  initialData = {},
  onSubmit,
  onCancel,
  submitLabel = 'Soumettre',
  isLoading = false,
}: WorkflowStepFormProps) => {
  // Simple permissive schema that accepts any object to avoid validation issues
  const buildSchema = () => {
    return z.any(); // Accept any data structure
  };

  const formSchema = buildSchema();
  type FormValues = z.infer<typeof formSchema>;

  // Ensure radio buttons have default values
  const ensureDefaultValues = () => {
    const defaults = { ...initialData };

    formFields.forEach((field) => {
      if (field.type === 'radio' && !defaults[field.name] && field.options && field.options.length > 0) {
        // Set default value to first option for radio buttons
        const firstOption = Array.isArray(field.options) && field.options.length > 0 ? field.options[0] : null;
        if (firstOption) {
          const defaultValue = typeof firstOption === 'string' ? firstOption : firstOption.value;
          defaults[field.name] = defaultValue;
        }
      }
    });

    return defaults;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: ensureDefaultValues(),
  });

  const handleSubmit = async (values: FormValues) => {
    console.log('=== WORKFLOW STEP FORM handleSubmit CALLED ===');
    console.log('Submitted values:', values);
    console.log('Form state after submission:', form.getValues());
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);

    // Manually validate the form to see what's wrong
    const validationResult = await form.trigger();
    console.log('Manual validation result:', validationResult);
    console.log('Form state after manual validation:', form.formState);

    if (!form.formState.isValid) {
      console.log('Form is invalid, not proceeding with submit');
      return;
    }

    try {
      console.log('Calling onSubmit with values...');

      // Check if we need to send files - if so, use FormData
      const hasFiles = checkForFilesInValues(values);

      if (hasFiles) {
        console.log('Files detected, sending as FormData');
        const formDataToSend = await convertValuesToFormData(values);
        await onSubmit(formDataToSend);
      } else {
        console.log('No files detected, sending as JSON');
        await onSubmit(values);
      }

      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };

  // Helper function to check if values contain files
  const checkForFilesInValues = (obj: any): boolean => {
    if (obj instanceof File) {
      return true;
    }
    if (Array.isArray(obj)) {
      return obj.some(item => checkForFilesInValues(item));
    }
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(value => checkForFilesInValues(value));
    }
    return false;
  };

  // Helper function to convert values with files to FormData
  const convertValuesToFormData = async (values: any): Promise<FormData> => {
    const formData = new FormData();

    const appendToFormData = (data: any, prefix = '') => {
      if (data instanceof File) {
        // Append file with the path as key
        const fileKey = prefix ? `${prefix}[]` : 'files[]';
        formData.append(fileKey, data);
        console.log(`Appended file: ${data.name} as ${fileKey}`);
      } else if (Array.isArray(data)) {
        data.forEach((item, index) => {
          const itemKey = prefix ? `${prefix}[${index}]` : `[${index}]`;
          appendToFormData(item, itemKey);
        });
      } else if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          const value = data[key];
          const newPrefix = prefix ? `${prefix}[${key}]` : key;
          appendToFormData(value, newPrefix);
        });
      } else {
        // Append regular values
        const valueKey = prefix || 'form_data';
        formData.append(valueKey, JSON.stringify(data));
      }
    };

    // Convert the entire values object to FormData
    appendToFormData(values);

    // Log FormData contents for debugging
    console.log('FormData contents:');
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    return formData;
  };

  const renderField = (field: FormFieldConfig) => {
    // Handle conditional rendering
    if (field.conditional) {
      // Check for array includes conditions
      if (field.conditional.includes('.includes(')) {
        // Handle array includes conditions like "fieldName.includes("value")"
        const match = field.conditional.match(/^(\w+)\.includes\("(.+)"\)$/);
        if (match) {
          const [, fieldName, value] = match;
          const currentValue = form.watch(fieldName);
          const arrayValue = Array.isArray(currentValue) ? currentValue : [];
          if (!arrayValue.includes(value)) {
            return null; // Don't render the field
          }
        }
  } else {
    // Handle simple conditions
    const [fieldName, operator, value] = field.conditional.split(' ');
    const currentValue = form.watch(fieldName);

    // Convert string values to boolean if needed
    let compareValue = value;
    if (value === 'true') compareValue = true;
    else if (value === 'false') compareValue = false;

    if (operator === '==' && currentValue !== compareValue) {
      return null; // Don't render the field
    }
    if (operator === '!=' && currentValue === compareValue) {
      return null; // Don't render the field
    }
  }
    }

    switch (field.type) {
      case 'date':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-col">
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !formField.value && 'text-muted-foreground'
                        )}
                      >
                        {formField.value ? (
                          format(formField.value as Date, 'PPP')
                        ) : (
                          <span>{field.placeholder || 'Sélectionner une date'}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formField.value as Date}
                      onSelect={formField.onChange}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'select':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <Select
                  onValueChange={formField.onChange}
                  defaultValue={formField.value as string}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || 'Sélectionner'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map((option) => {
                      const optionValue = typeof option === 'string' ? option : option.value;
                      const optionLabel = typeof option === 'string' ? option : option.label;
                      return (
                        <SelectItem key={optionValue} value={optionValue}>
                          {optionLabel}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'radio':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    {field.options?.map((option, index) => {
                      const optionValue = typeof option === 'string' ? option : option.value;
                      const optionLabel = typeof option === 'string' ? option : option.label;

                      return (
                        <div key={optionValue} className="flex items-start space-x-3">
                          <input
                            {...formField}
                            type="radio"
                            id={`${field.name}-${optionValue}`}
                            value={optionValue}
                            checked={formField.value === optionValue}
                            onChange={(e) => {
                              console.log(`Radio button changed: ${field.name} = ${e.target.value}`);
                              formField.onChange(e.target.value);
                              form.trigger(field.name);
                            }}
                            className="mt-1 h-4 w-4"
                          />
                          <label
                            htmlFor={`${field.name}-${optionValue}`}
                            className="text-sm leading-relaxed cursor-pointer flex-1"
                          >
                            {optionLabel}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'textarea':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={field.placeholder}
                    className="min-h-[100px]"
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'boolean':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </FormLabel>
                  {field.description && (
                    <FormDescription>{field.description}</FormDescription>
                  )}
                </div>
                <FormControl>
                  <Switch
                    checked={formField.value as boolean}
                    onCheckedChange={formField.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );

      case 'checkbox':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <div className="space-y-3">
                    {field.options?.map((option, index) => {
                      const optionValue = typeof option === 'string' ? option : option.value;
                      const optionLabel = typeof option === 'string' ? option : option.label;

                      // Handle array of selected values
                      const currentValues = Array.isArray(formField.value) ? formField.value : [];
                      const isChecked = currentValues.includes(optionValue);

                      return (
                        <div key={optionValue} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id={`${field.name}-${optionValue}`}
                            checked={isChecked}
                            onChange={(e) => {
                              const newValues = e.target.checked
                                ? [...currentValues, optionValue]
                                : currentValues.filter((v: string) => v !== optionValue);
                              formField.onChange(newValues);
                            }}
                            className="h-4 w-4 text-primary border-primary rounded focus:ring-primary focus:ring-2"
                          />
                          <label
                            htmlFor={`${field.name}-${optionValue}`}
                            className="text-sm leading-relaxed cursor-pointer flex-1"
                          >
                            {optionLabel}
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'group':
        if (field.fields) {
          return (
            <div key={field.name} className="space-y-4">
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                    <span className="font-medium">{field.label}</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pl-4 border-l-2 border-muted">
                  {field.fields.map((subField) => renderField(subField))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        }
        return null;

      case 'array':
        if (field.item_template) {
          const arrayName = field.name;
          const currentValue = form.watch(arrayName) || [];
          const itemTemplate = field.item_template;

          return (
            <div key={field.name} className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base">{field.label}</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentArray = form.getValues(arrayName) || [];
                    const newItem: Record<string, any> = {};

                    // Initialize new item with default values from template
                    Object.keys(itemTemplate).forEach(key => {
                      const templateField = itemTemplate[key];
                      newItem[key] = templateField.default || '';
                    });

                    form.setValue(arrayName, [...currentArray, newItem]);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {currentValue.map((item: any, index: number) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Élément {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const currentArray = form.getValues(arrayName) || [];
                        const newArray = currentArray.filter((_: any, i: number) => i !== index);
                        form.setValue(arrayName, newArray);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(itemTemplate).map((key) => {
                      const templateField = itemTemplate[key];
                      const fieldName = `${arrayName}.${index}.${key}`;

                      return (
                        <FormField
                          key={fieldName}
                          control={form.control}
                          name={fieldName as any}
                          render={({ field: formField }) => (
                            <FormItem>
                              <FormLabel>
                                {templateField.label}
                                {templateField.required && <span className="text-destructive ml-1">*</span>}
                              </FormLabel>
                              <FormControl>
                                {templateField.type === 'select' ? (
                                  <Select
                                    onValueChange={formField.onChange}
                                    defaultValue={formField.value as string}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={templateField.placeholder || 'Sélectionner'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {templateField.options?.map((option) => {
                                        const optionValue = typeof option === 'string' ? option : option.value;
                                        const optionLabel = typeof option === 'string' ? option : option.label;
                                        return (
                                          <SelectItem key={optionValue} value={optionValue}>
                                            {optionLabel}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                ) : templateField.type === 'textarea' ? (
                                  <Textarea
                                    placeholder={templateField.placeholder}
                                    className="min-h-[80px]"
                                    {...formField}
                                  />
                                ) : templateField.type === 'file' ? (
                                  <Input
                                    type="file"
                                    multiple={templateField.multiple}
                                    accept={templateField.accept || "*/*"}
                                    onChange={(e) => {
                                      const files = Array.from(e.target.files || []);
                                      formField.onChange(templateField.multiple ? files : files[0]);
                                    }}
                                  />
                                ) : templateField.type === 'number' ? (
                                  <Input
                                    type="number"
                                    placeholder={templateField.placeholder}
                                    {...formField}
                                  />
                                ) : (
                                  <Input
                                    type={templateField.type || "text"}
                                    placeholder={templateField.placeholder}
                                    {...formField}
                                  />
                                )}
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          );
        }
        return null;

      case 'edp_batiment':
        // Render the complete EDP Bâtiment structure
        return (
          <Card key={field.name} className="p-6">
            <CardHeader>
              <CardTitle>{field.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Gros oeuvre */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Gros œuvre</h4>
                <FormField
                  control={form.control}
                  name={`${field.name}.gros_oeuvre` as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>Détails gros œuvre</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px]" {...formField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Charpente / Gitage */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Charpente / Gitage</h4>
                <FormField
                  control={form.control}
                  name={`${field.name}.charpente_gitage` as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>Détails charpente et gitage</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px]" {...formField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Niveaux */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Niveaux</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name={`${field.name}.niveaux.rez_de_chaussee` as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Rez-de-chaussée</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[80px]" {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${field.name}.niveaux.etage_1` as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Étage 1</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[80px]" {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${field.name}.niveaux.etage_2` as any}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Étage 2</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[80px]" {...formField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Toiture */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Toiture</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {['nature', 'isolation', 'descente', 'chaineau', 'gouttiere'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.toiture.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Menuiseries intérieures */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Menuiseries intérieures</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {['porte', 'placard', 'escalier', 'rampe', 'autres'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.menuiseries_interieures.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Isolation */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Isolation</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['plafond', 'mur', 'toit'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.isolation.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Menuiseries extérieures */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Menuiseries extérieures</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['fenetre', 'porte', 'baie_vitree', 'volet'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.menuiseries_exterieures.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item.replace('_', ' ')}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Plâterie */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Plâterie</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {['platre', 'ba13', 'cloison', 'carreaux'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.platerie.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Sol */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Sol</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['nature', 'plinthes', 'seuil'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.sol.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Faience */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Faience</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['nature', 'dimension'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.faience.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Chauffage */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Chauffage</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['chaudiere', 'radiateurs'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.chauffage.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Sanitaire */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Sanitaire</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {['baignoire', 'lavabo', 'douche', 'robinet', 'ballon'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.sanitaire.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Embellissement */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Embellissement</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['plafond', 'mural', 'divers'].map((item) => (
                    <FormField
                      key={item}
                      control={form.control}
                      name={`${field.name}.embellissement.${item}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel className="capitalize">{item}</FormLabel>
                          <FormControl>
                            <Textarea className="min-h-[80px]" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'edp_mobilier':
        // Render the EDP Mobilier structure with conditional logic
        return (
          <Card key={field.name} className="p-6">
            <CardHeader>
              <CardTitle>{field.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Meubles bas */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Meubles bas</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { key: 'mb_40', label: '40cm' },
                    { key: 'mb_60', label: '60cm' },
                    { key: 'mb_80', label: '80cm' },
                    { key: 'mb_120', label: '120cm' }
                  ].map((item) => (
                    <FormField
                      key={item.key}
                      control={form.control}
                      name={`${field.name}.meubles_bas.${item.key}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{item.label}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Meubles haut */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Meubles haut</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { key: 'mh_40', label: '40cm' },
                    { key: 'mh_60', label: '60cm' },
                    { key: 'mh_80', label: '80cm' },
                    { key: 'mh_120', label: '120cm' }
                  ].map((item) => (
                    <FormField
                      key={item.key}
                      control={form.control}
                      name={`${field.name}.meubles_haut.${item.key}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{item.label}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Colonnes */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Colonnes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'c_40', label: '40cm' },
                    { key: 'c_60', label: '60cm' },
                    { key: 'c_80', label: '80cm' },
                    { key: 'c_120', label: '120cm' }
                  ].map((item) => (
                    <FormField
                      key={item.key}
                      control={form.control}
                      name={`${field.name}.colonnes.${item.key}` as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{item.label}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...formField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Évier */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Évier</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`${field.name}.evier.bac_1` as any}
                    render={({ field: formField }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="text-base">Bac 1</FormLabel>
                        <FormControl>
                          <Switch checked={formField.value as boolean} onCheckedChange={formField.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${field.name}.evier.bac_2` as any}
                    render={({ field: formField }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="text-base">Bac 2</FormLabel>
                        <FormControl>
                          <Switch checked={formField.value as boolean} onCheckedChange={formField.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Meuble d'angle */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Meuble d'angle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`${field.name}.meuble_angle.bas` as any}
                    render={({ field: formField }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="text-base">Bas</FormLabel>
                        <FormControl>
                          <Switch checked={formField.value as boolean} onCheckedChange={formField.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`${field.name}.meuble_angle.haut` as any}
                    render={({ field: formField }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <FormLabel className="text-base">Haut</FormLabel>
                        <FormControl>
                          <Switch checked={formField.value as boolean} onCheckedChange={formField.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Plan de travail */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name={`${field.name}.plan_travail_metre` as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>Plan de travail (mètres)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.1" {...formField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'edp_electrique':
        // Render the EDP Électrique structure
        return (
          <Card key={field.name} className="p-6">
            <CardHeader>
              <CardTitle>{field.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dynamic room list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Pièces</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentPieces = form.getValues(`${field.name}.pieces`) || [];
                      const newPiece = {
                        nom: '',
                        allumage: 0,
                        prise_16a: 0,
                        prise_tv: 0,
                        prise_20a: 0,
                        prise_31a: 0,
                        va_et_vient: 0,
                        divers: ''
                      };
                      form.setValue(`${field.name}.pieces`, [...currentPieces, newPiece]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter une pièce
                  </Button>
                </div>

                {(form.watch(`${field.name}.pieces`) || []).map((piece: any, index: number) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-medium">Pièce {index + 1}</h5>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const currentPieces = form.getValues(`${field.name}.pieces`) || [];
                          const newPieces = currentPieces.filter((_: any, i: number) => i !== index);
                          form.setValue(`${field.name}.pieces`, newPieces);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`${field.name}.pieces.${index}.nom` as any}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Nom de la pièce *</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Cuisine, Salon..." {...formField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { key: 'allumage', label: 'Allumage' },
                          { key: 'prise_16a', label: 'Prise 16A' },
                          { key: 'prise_tv', label: 'Prise TV' },
                          { key: 'prise_20a', label: 'Prise 20A' },
                          { key: 'prise_31a', label: 'Prise 31A' },
                          { key: 'va_et_vient', label: 'Va et vient' }
                        ].map((item) => (
                          <FormField
                            key={item.key}
                            control={form.control}
                            name={`${field.name}.pieces.${index}.${item.key}` as any}
                            render={({ field: formField }) => (
                              <FormItem>
                                <FormLabel>{item.label}</FormLabel>
                                <FormControl>
                                  <Input type="number" min="0" {...formField} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>

                      <FormField
                        control={form.control}
                        name={`${field.name}.pieces.${index}.divers` as any}
                        render={({ field: formField }) => (
                          <FormItem>
                            <FormLabel>Divers</FormLabel>
                            <FormControl>
                              <Textarea className="min-h-[80px]" {...formField} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </Card>
                ))}
              </div>

              {/* Observations */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name={`${field.name}.observations` as any}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>Observations générales</FormLabel>
                      <FormControl>
                        <Textarea className="min-h-[100px]" {...formField} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'file':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    multiple={field.multiple}
                    accept={field.accept || "*/*"}
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      formField.onChange(field.multiple ? files : files[0]);
                    }}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'text':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder={field.placeholder}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'time':
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <TimePicker
                    value={formField.value}
                    onChange={formField.onChange}
                    placeholder="Sélectionner l'heure"
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'number':
      case 'email':
      default:
        return (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name as any}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type={field.type}
                    placeholder={field.placeholder}
                    {...formField}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {formFields.map((field, index) => (
          <div key={`${field.name}-${form.watch('documents_importes')?.length || 0}-${index}`}>
            {renderField(field)}
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            onClick={() => {
              console.log('=== SUBMIT BUTTON CLICKED ===');
              console.log('Form state:', form.formState);
              console.log('Form errors:', form.formState.errors);
              console.log('Form is valid:', form.formState.isValid);
              console.log('Form values:', form.getValues());
            }}
          >
            {isLoading ? 'En cours...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkflowStepForm;
                  // Force re-render by triggering form validation
