import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

// Group validator: sets `errorKey` when the min control is greater than the max one.
export function rangeValidator(
  minKey: string,
  maxKey: string,
  errorKey: string
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const min = group.get(minKey)?.value;
    const max = group.get(maxKey)?.value;
    if (isEmpty(min) || isEmpty(max)) {
      return null;
    }
    return Number(min) > Number(max) ? { [errorKey]: true } : null;
  };
}
