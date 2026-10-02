import { FormControl, FormGroup } from '@angular/forms';
import { rangeValidator } from './range.validator';

describe('rangeValidator', () => {
  const build = (min: number | null, max: number | null) =>
    new FormGroup(
      { min: new FormControl(min), max: new FormControl(max) },
      { validators: rangeValidator('min', 'max', 'range') }
    );

  it('should accept ordered or open ranges', () => {
    expect(build(1990, 2000).errors).toBeNull();
    expect(build(2000, 2000).errors).toBeNull();
    expect(build(5000, null).errors).toBeNull();
  });

  it('should flag a min greater than the max', () => {
    expect(build(2001, 2000).errors).toEqual({ range: true });
  });
});
