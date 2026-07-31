/**
 * Input validation utilities for forms across the application.
 */

export interface ValidationOptions {
  min?: number;
  max?: number;
  fieldName?: string;
}

export interface ValidationResult {
  isValid: boolean;
  value: number;
  error?: string;
}

/**
 * Validates 'number of years' inputs (e.g., span or count of years to generate).
 * Ensures the value is a positive whole integer, within min and max constraints.
 */
export function validateNumberOfYears(
  input: string | number,
  options: ValidationOptions = {}
): ValidationResult {
  const { min = 1, max = 30, fieldName = 'Number of years' } = options;

  if (input === '' || input === null || input === undefined) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} is required.`,
    };
  }

  const str = String(input).trim();
  if (!str) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} cannot be empty.`,
    };
  }

  // Check for non-digit characters or decimals
  if (!/^\d+$/.test(str)) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must be a positive whole number (no decimals or negative values).`,
    };
  }

  const num = parseInt(str, 10);

  if (isNaN(num)) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must be a valid integer.`,
    };
  }

  if (num < min) {
    return {
      isValid: false,
      value: num,
      error: `${fieldName} must be at least ${min}.`,
    };
  }

  if (num > max) {
    return {
      isValid: false,
      value: num,
      error: `${fieldName} cannot exceed ${max}.`,
    };
  }

  return {
    isValid: true,
    value: num,
  };
}

/**
 * Validates a calendar year input (e.g. 2024, 2025).
 */
export function validateYearInput(
  input: string | number,
  options: { minYear?: number; maxYear?: number; fieldName?: string } = {}
): ValidationResult {
  const currentYear = new Date().getFullYear();
  const { minYear = 1900, maxYear = currentYear + 10, fieldName = 'Latest year' } = options;

  if (input === '' || input === null || input === undefined) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} is required.`,
    };
  }

  const str = String(input).trim();
  if (!str) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} cannot be empty.`,
    };
  }

  const match = str.match(/\b(19\d\d|20\d\d)\b/) || str.match(/\b\d{4}\b/);
  const num = match ? parseInt(match[0], 10) : parseInt(str, 10);

  if (isNaN(num) || !/^\d+$/.test(match ? match[0] : str)) {
    return {
      isValid: false,
      value: 0,
      error: `${fieldName} must contain a valid 4-digit year (e.g. ${currentYear}).`,
    };
  }

  if (num < minYear) {
    return {
      isValid: false,
      value: num,
      error: `${fieldName} must be no earlier than ${minYear}.`,
    };
  }

  if (num > maxYear) {
    return {
      isValid: false,
      value: num,
      error: `${fieldName} cannot exceed ${maxYear}.`,
    };
  }

  return {
    isValid: true,
    value: num,
  };
}
