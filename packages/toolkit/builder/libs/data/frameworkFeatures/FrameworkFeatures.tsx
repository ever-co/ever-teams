import { ComparisonRow } from "../../../types";

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Registration Required',
    plasmic: 'Yes',
    builder: 'Yes',
    grapes: 'No',
    craft: 'No'
  },
  {
    feature: 'Token/API Key Required',
    plasmic: 'Yes',
    builder: 'Yes',
    grapes: 'No',
    craft: 'Optional (for wrapper)'
  },
  {
    feature: 'Pricing',
    plasmic: (
      <>
        Free for basic;<br />
        Paid for advanced
      </>
    ),
    builder: (
      <>
        Free up to 10k views;<br />
        Paid for more
      </>
    ),
    grapes: 'Free',
    craft: 'Free (custom dev required)'
  },
  {
    feature: 'Integration Type',
    plasmic: 'SDK + Manual Embed',
    builder: 'SDK + Auto/Manual Embed',
    grapes: 'Manual Embed',
    craft: 'Custom Embed'
  },
  {
    feature: 'Customization',
    plasmic: 'Drag-and-Drop',
    builder: 'Drag-and-Drop',
    grapes: 'HTML/CSS Only',
    craft: 'React/Next.js Focused'
  },
  {
    feature: 'Embed Options',
    plasmic: 'Copy Code',
    builder: 'Copy Code/Publish',
    grapes: 'Copy Code/Download',
    craft: 'Code/Wrapper'
  },
  {
    feature: 'Limitation',
    plasmic: 'Token security, paid license',
    builder: 'Paid for high views',
    grapes: 'Limited ReactJS support',
    craft: 'Requires custom dev'
  }
];