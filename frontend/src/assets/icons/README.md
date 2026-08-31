# Icons Barrel File

This directory contains SVG icons for the MotoFleet application. The `index.ts` file serves as a barrel export, making it easy to import icons throughout the project.

## Usage

### Option 1: Import from barrel (Recommended)
```typescript
import { bell, trash_2, check, plus } from '@/assets/icons';

// In your component
<img src={bell} alt="Notifications" className="w-5 h-5" />
```

### Option 2: Direct import (Legacy)
```typescript
import bell from '@/assets/icons/bell.svg';

// In your component
<img src={bell} alt="Notifications" className="w-5 h-5" />
```

## Available Icons

### Action Icons
- `alarm` - Alarm/reminder icon
- `bell` - Notification bell
- `bookmark_check` - Bookmarked/completed
- `calendar_dots` - Calendar with dots
- `caret_left` - Left caret/arrow
- `check` - Single checkmark
- `check_check` - Double checkmark
- `envelope_simple` - Email icon
- `eye` - Eye/view icon
- `eye_off` - Eye with slash/hidden
- `note_pencil` - Edit/note icon
- `plus` - Plus/add icon
- `trash_2` - Trash/delete icon
- `x` - Close icon
- `x_light` - Close icon (light variant)

### Chart & Analytics
- `chart_bar` - Bar chart icon

### User & Auth
- `person_simple_bike` - Rider/biker profile
- `signIn` - Sign in icon
- `signOut` - Sign out icon

### Theme Icons
- `moon` - Dark mode/moon
- `moonBlack` - Moon (black variant)
- `sun` - Light mode/sun
- `sunLight` - Sun (light variant)

### Login Variants
- `logInDark` - Login button (dark)
- `logInLight` - Login button (light)
- `logInPrimary` - Login button (primary color)
- `logOutDark` - Logout button (dark)
- `logOutLight` - Logout button (light)
- `logOutPrimary` - Logout button (primary color)

### Domain-Specific Icons
- `motorcycle` - Motorcycle icon
- `image` - Image/gallery icon
- `package_icon` - Package/delivery icon
- `phone` - Phone icon
- `wallet` - Wallet/payment icon

### Logo
- `logo_fvr_v1_svg` - FVR logo (SVG)
- `logo_fvr_v1_png` - FVR logo (PNG)

## Best Practices

1. **Use the barrel import** - It's cleaner and makes refactoring easier
2. **Name icons consistently** - Use snake_case for multi-word icon names
3. **Add alt text** - Always include descriptive alt text for accessibility
4. **Keep SVGs optimized** - Use tools like SVGO to reduce file size
5. **Add aria-hidden** - When icons are decorative, use `aria-hidden="true"`

## Example Component

```typescript
import React from 'react';
import { bell, trash_2, check } from '@/assets/icons';

export const NotificationItem: React.FC<{ notification: Notification }> = ({ notification }) => {
  return (
    <div className="flex items-center gap-3">
      <img src={bell} alt="" aria-hidden="true" className="w-5 h-5" />
      <p>{notification.message}</p>
      <button>
        <img src={check} alt="Mark as read" className="w-4 h-4" />
      </button>
      <button>
        <img src={trash_2} alt="Delete notification" className="w-4 h-4" />
      </button>
    </div>
  );
};
```

## Adding New Icons

1. Add the SVG file to this directory
2. Update the `index.ts` barrel file with the new export
3. Update this README with the new icon in the appropriate category
4. Use the icon with the barrel import: `import { your_icon } from '@/assets/icons'`

## TypeScript Support

The barrel file provides full TypeScript support. When using the icons, TypeScript will correctly infer them as SVG imports.

```typescript
import type { ReactElement } from 'react';
import { bell } from '@/assets/icons';

// bell is typed as a string (SVG module)
const iconUrl: string = bell;
```
