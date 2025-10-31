# LLM Styleguide

## Layout Structure

The interface follows a standard enterprise application layout with three main sections:

### Header (64px height, 100% width)
- **Background**: White (#FFFFFF)
- **Shadow**: `0px 2px 4px 0px rgba(1,5,50,0.04), 0px 4px 5px 0px rgba(1,5,50,0.04), 0px 1px 10px 0px rgba(1,5,50,0.08)`
- **Content**: 
  - Left: Brand logo + product name ("Passkey Engine")
  - Right: User actions (Docs button, Profile dropdown with avatar)
- **Padding**: 12px horizontal, 0px vertical

### Left Navigation (240px width, 100% height)
- **Background**: White (#FFFFFF)
- **Shadow**: `0px 2px 2px 0px rgba(1,5,50,0.02), 0px 3px 4px 0px rgba(1,5,50,0.02), 0px 1px 5px 0px rgba(1,5,50,0.04)`
- **Structure**: Hierarchical menu with expandable sections
- **Active states**: Blue accent bar (#041295) on left edge

### Content Area (fills the rest of the width)
- **Content Header**: Light gray background (#F7F7F9), 138px height
  - **Page title**: Roboto Medium, 42px, weight 500, line-height 50px, color #333344 (not primary blue)
  - **Page description**: Roboto Regular, 16px, weight 400, line-height 24px, color #131319
- **Main Content**: White background, 822px height, 32px padding

## Navigation Structure

The left navigation uses a hierarchical structure where:
- **Parent items** (Home, Devices) are expandable but not selectable
- **Child items** (Dashboard, Event logs, Inventory, Connected devices) are selectable
- **Terminal items** (Device policies, Identity providers) are directly selectable

### Navigation Item Styles
- **Font**: Roboto Regular, 16px, #131319
- **Active child items**: Bold weight, blue background (#E6E7F4)
- **Icons**: 24px size, positioned 16px from left edge
- **Icon usage**: Only top-level menu items should have icons; child items should not have icons
- **Padding**: 18px vertical, 16px left, 12px right
- **Child item indentation**: 48px from left edge

## Text Styles

### Headings
- **H1**: Roboto Medium, 42px, weight 500, line-height 50px, color #041295
- **H2**: Roboto SemiBold, 28px, weight 600, line-height 36px, color #041295  
- **H3**: Roboto Bold, 20px, weight 700, line-height 28px, color #041295
- **H4**: Roboto Bold, 16px, weight 700, line-height 24px, color #041295

### Body Text
- **Body 1 Regular**: Roboto Regular, 16px, weight 400, line-height 24px, color #131319
- **Body 1 Medium**: Roboto Medium, 16px, weight 500, line-height 24px, color #131319
- **Body 1 Bold**: Roboto Bold, 16px, weight 700, line-height 24px, color #131319
- **Body 2 Regular**: Roboto Regular, 14px, weight 400, line-height 20px, color #5D607E
- **Body 2 Medium**: Roboto Medium, 14px, weight 500, line-height 20px, color #383A4B

## Button Styles

### Primary Button
- **Background**: #041295 (primary blue)
- **Text**: White, Roboto Medium, 14px, weight 500
- **Border**: None
- **Border radius**: 2px
- **Height**: 40px
- **Padding**: 12px horizontal, 8px vertical
- **Icons**: 20px size, 8px gap from text

### Secondary Button  
- **Background**: Transparent
- **Text**: #041295 (primary blue), Roboto Medium, 14px, weight 500
- **Border**: 1px solid #041295
- **Border radius**: 2px
- **Height**: 40px
- **Padding**: 12px horizontal, 8px vertical
- **Icons**: 20px size, 8px gap from text

### Tertiary Button
- **Background**: Transparent
- **Text**: #383A4B (dark gray), Roboto Medium, 14px, weight 500
- **Border**: None
- **Border radius**: 2px
- **Height**: 40px
- **Padding**: 12px horizontal, 8px vertical

## Input Field Styles

### Default Input Field
- **Background**: White (#FFFFFF)
- **Border**: 1px solid #5D607E (gray-500)
- **Border radius**: 2px
- **Height**: 40px (medium size)
- **Padding**: 8px horizontal, 12px vertical
- **Text**: Roboto Regular, 14px, weight 400, line-height 20px
- **Placeholder text**: #5D607E (gray-500)
- **Input text**: #131319 (gray-900)

### Input Field States
- **Default**: Border #5D607E, placeholder #5D607E
- **Error**: Border #E01E00 (red-500), caption text #E01E00
- **Success**: Border #00BBDD (light blue), caption text #00BBDD
- **Warning**: Border #FFA500, caption text #FFA500
- **Disabled**: Background #F7F7F9, border #E6E7F4, text #5D607E

### Input Field Elements
- **Label**: Roboto Regular, 14px, weight 400, line-height 20px, color #131319
- **Required indicator**: Red asterisk (*), Roboto Medium, 14px, color #E01E00
- **Caption**: Roboto Regular, 12px, weight 400, line-height 16px, color #5D607E
- **Icons**: 20px size, positioned with 8px gap from text
- **Left/Right icons**: Optional, inherit text color

### Input Field Layout
- **Container**: Flex column with 2px gap between elements
- **Label + Input**: 4px gap between label and input field
- **Caption**: 2px gap below input field
- **Icon spacing**: 8px gap between icon and text

## Color Palette

### Primary Colors
- **Primary Blue**: #041295
- **Light Blue**: #00BBDD
- **Blue 50**: #E6E7F4 (light accent)

### Status Colors
- **Error Red**: #E01E00
- **Success Green**: #00BBDD (light blue)
- **Warning Orange**: #FFA500

### Neutral Colors
- **White**: #FFFFFF
- **Gray 25**: #F7F7F9 (light background)
- **Gray 500**: #5D607E (secondary text)
- **Gray 700**: #383A4B (tertiary text)
- **Gray 750**: #333344 (page titles)
- **Gray 900**: #131319 (primary text)

## Spacing System

- **Base unit**: 4px
- **Small**: 8px
- **Medium**: 12px
- **Large**: 16px
- **XLarge**: 24px
- **XXLarge**: 32px

## Icon Guidelines

- **Icon library**: Material Design Icons (Material Icons)
- **Navigation icons**: 24px size
- **Button icons**: 20px size
- **Header icons**: 20px size
- **Icon style**: Outlined, consistent stroke weight
- **Color**: Inherit from parent text color

## Implementation Notes

- Use semantic color tokens when available
- Maintain consistent spacing using the 4px grid system
- Ensure proper contrast ratios for accessibility
- Icons should be SVG format for scalability
- All interactive elements should have proper hover and focus states

## Forms guidelines

### Form Structure and Layout
Forms are arranged in a vertical layout with each form component placed on its own line. Sometimes form fields flow horizontally when two closely related fields need to be arranged side by side. Use your best judgment for case-by-case exceptions.

### Spacing
- **Section and Title Spacing**: 4px between section title and description text, 16px between section title and form field, 40px between sections
- **Form Field Spacing**: 24px between form fields, 24px between form field and sub-section, 24px between form field and form button, 16px between form fields arranged side by side
- **Checkbox and Radio Button Spacing**: 4px between label and checkbox/radio button, 12px between checkbox/radio buttons in a group, 24px between checkbox/radio button and unrelated form field
- **Dependent and Nested Field Spacing**: 8px between form field and dependent form field, 8px between parent form field and first nested form field, 32px left indentation for nested form fields revealed by parent control
- **Divider and Validation Spacing**: 24px between divider and other form fields, 40px between form field and form validation, 32px minimum between form validation and bottom of screen

### Form Field Sizing
Form field widths range from two to six columns. The minimum width is 2 columns, maximum is 6 columns for fields like URLs. Field length is based on whichever is longer: the expected length of the value or the length of the label. When the form field's value and label are small with no caption or helper text needed, the field can occupy a single column.

### Button Structure and Positioning
Forms use three types of buttons with specific positioning:
- **Object buttons**: Affect the entire object, positioned in the Content Header, may be outlined, ghost, or nested within a context menu
- **Form buttons**: Impact form fields, positioned directly below corresponding fields, styled as outlined buttons
- **Validation buttons**: Include Save (primary, filled) and Cancel (ghost, neutral) buttons positioned below the form, with Save appearing first

### Long Forms
Display long forms on a single page to allow free scrolling. Use steppers only for four or more distinct steps. For forms longer than average screen size, implement steppers with anchor links that scroll users to the top of corresponding sections and set focus to the first input field. Highlight the current step using primary blue and provide step completion feedback indicating whether steps are finished, require validation, or contain errors.

### Unsaved Changes Management
Protect against data loss by showing confirmation messages when users try to leave or discard unsaved changes. Use two types of confirmations:
- **Browser navigation**: Enable `beforeunload` event for closing browser/tab, clicking back button, or reloading
- **In-app navigation**: Trigger modal confirmation for Cancel button, Content Header back button, or side navigation to different sections

Only display modals when there are actual unsaved changes. Use Cancel for new object screens or object detail screens (returns to overview screen). Use Discard for overview screens with no previous screen to return to. Discard resets form changes without clearing the form, returning fields to their original state.

### Dynamic Forms
When form field values impact other fields:
- **Hide inapplicable fields** rather than disable to reduce form noise. Default shown/hidden fields are determined by page default values based on primary use case
- **Show fields as disabled** when one field forces other fields to have specific values, allowing users to see values while understanding they cannot change them
- **Add tooltip explanations** on hover when affected values are far from the controlling field
