"use client";

import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "value"> {
  value?: number | string;
  onChange?: (value: string, numericValue: number | undefined) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  formatOnBlur?: boolean; // If true, formats only on blur, otherwise formats as user types
}

/**
 * NumberInput component that automatically formats numbers with commas
 * while maintaining the numeric value for form handling
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onChange, onBlur, formatOnBlur = false, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>("");
    const inputRef = React.useRef<HTMLInputElement>(null);
    const combinedRef = React.useMemo(() => {
      if (typeof ref === "function") {
        return (node: HTMLInputElement | null) => {
          inputRef.current = node;
          ref(node);
        };
      } else if (ref) {
        return (node: HTMLInputElement | null) => {
          inputRef.current = node;
          ref.current = node;
        };
      }
      return (node: HTMLInputElement | null) => {
        inputRef.current = node;
      };
    }, [ref]);

    // Parse number from string, removing commas
    const parseNumericValue = (str: string): number | undefined => {
      const cleaned = str.replace(/,/g, "");
      if (cleaned === "" || cleaned === "-" || cleaned === ".") {
        return undefined;
      }
      const num = parseFloat(cleaned);
      return isNaN(num) ? undefined : num;
    };

    // Format number with commas
    const formatNumber = (num: number | string | undefined): string => {
      if (num === undefined || num === null || num === "") {
        return "";
      }
      const numValue = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
      if (isNaN(numValue)) {
        return "";
      }
      
      // Get the decimal part
      const parts = numValue.toString().split(".");
      const integerPart = parts[0];
      const decimalPart = parts[1];
      
      // Format integer part with commas
      const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      // Combine with decimal part if exists
      return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
    };

    // Update display value when external value changes
    React.useEffect(() => {
      if (value === undefined || value === null || value === "") {
        setDisplayValue("");
        return;
      }
      
      const numValue = typeof value === "string" 
        ? parseFloat(value.replace(/,/g, "")) 
        : typeof value === "number" 
        ? value 
        : parseFloat(String(value).replace(/,/g, ""));
      
      if (!isNaN(numValue) && numValue !== undefined) {
        setDisplayValue(formatNumber(numValue));
      } else {
        setDisplayValue("");
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow empty, minus sign, and decimal point during typing
      if (inputValue === "" || inputValue === "-" || inputValue === ".") {
        setDisplayValue(inputValue);
        onChange?.(inputValue, undefined);
        return;
      }

      // Remove all commas and parse
      const cleaned = inputValue.replace(/,/g, "");
      const numericValue = parseNumericValue(cleaned);

      if (formatOnBlur) {
        // Don't format while typing, just store the raw value
        setDisplayValue(cleaned);
      } else {
        // Format with commas as user types
        if (numericValue !== undefined) {
          setDisplayValue(formatNumber(numericValue));
        } else {
          setDisplayValue(cleaned);
        }
      }

      onChange?.(inputValue, numericValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Always format on blur
      const numericValue = parseNumericValue(displayValue);
      if (numericValue !== undefined) {
        setDisplayValue(formatNumber(numericValue));
      }
      onBlur?.(e);
    };

    return (
      <Input
        {...props}
        ref={combinedRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

