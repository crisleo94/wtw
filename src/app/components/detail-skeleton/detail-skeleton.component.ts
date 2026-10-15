import { Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

// Placeholder shapes while the movie loads; it pulses only without reduced motion.
@Component({
  selector: 'app-detail-skeleton',
  imports: [TranslocoPipe],
  template: `
    <div class="skeleton" role="status">
      <span class="visually-hidden">{{ 'detail.loading' | transloco }}</span>
      <div class="hero">
        <div class="block poster"></div>
        <div class="lines">
          <div class="block line wide"></div>
          <div class="block line"></div>
          <div class="block line short"></div>
        </div>
      </div>
      <div class="block line wide"></div>
      <div class="block line wide"></div>
    </div>
  `,
  styles: `
    .skeleton
      display: grid
      gap: 16px
    .block
      border-radius: 8px
      background: var(--mat-sys-surface-container-high)
      @media (prefers-reduced-motion: no-preference)
        animation: pulse 1.2s ease-in-out infinite alternate
    .hero
      display: grid
      grid-template-columns: 220px minmax(0, 1fr)
      gap: 24px
      @media (max-width: 767.98px)
        grid-template-columns: minmax(0, 1fr)
    .poster
      aspect-ratio: 2 / 3
      max-width: 220px
    .lines
      display: grid
      gap: 12px
      align-content: start
    .line
      height: 20px
      width: 60%
      &.wide
        width: 100%
      &.short
        width: 30%
    @keyframes pulse
      to
        opacity: .5
  `,
})
export class DetailSkeletonComponent {}
