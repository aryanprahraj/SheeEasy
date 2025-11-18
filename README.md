# SheeEasy - Full-Featured Online Spreadsheet Application

A complete, modern spreadsheet application built with Next.js 14, React 18, TailwindCSS, and Supabase.

## Features

### ✨ Core Spreadsheet Features
- **Editable Grid**: Fully interactive spreadsheet grid with cell selection and editing
- **Formula Bar**: Display and edit cell values and formulas
- **Keyboard Navigation**: Arrow keys, Enter, Tab, Escape for efficient navigation
- **Cut/Copy/Paste**: Full clipboard support with Ctrl+C, Ctrl+X, Ctrl+V
- **Row & Column Resizing**: Drag to resize rows and columns
- **Multiple Sheet Tabs**: Create, rename, duplicate, and delete sheets
- **Undo/Redo**: Local history system for reverting changes

### 🎨 Styling & Formatting
- **Text Formatting**: Bold, italic, underline
- **Colors**: Background color and text color picker
- **Font Styling**: Customizable cell appearance

### 📐 Formula Engine
- **A1 Notation**: Standard cell reference format (A1, B2, etc.)
- **Arithmetic Operations**: +, -, *, /, ^ (exponentiation)
- **Excel Functions**: 
  - Mathematical: SUM, AVERAGE, MIN, MAX, COUNT, ABS, ROUND, SQRT, POWER
  - Text: CONCATENATE, UPPER, LOWER, LEN, LEFT, RIGHT, MID
  - Logical: IF, COUNTA
- **Nested Formulas**: Support for complex formula combinations
- **Dependency Graph**: Automatic recalculation of dependent cells
- **Circular Dependency Detection**: Prevents infinite calculation loops

### 💾 Data Management
- **Auto-Save**: Saves locally immediately, syncs to Supabase after 3 seconds of inactivity
- **Offline Support**: Works offline using localStorage, syncs when online
- **Import/Export**:
  - CSV import/export
  - XLSX (Excel) import/export
  - JSON export

### 🔐 Authentication & Security
- **Email/Password Authentication**
- **Google OAuth**
- **GitHub OAuth**
- **Row Level Security**: Users can only see and edit their own spreadsheets

### 📊 Dashboard
- **Create Spreadsheets**: Quick creation with custom titles
- **Rename**: Edit spreadsheet titles
- **Duplicate**: Clone existing spreadsheets
- **Delete**: Remove spreadsheets with confirmation
- **Sort by Date**: Most recently updated first

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand with Immer
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (Supabase)
- **Import/Export**: SheetJS (xlsx), Papaparse
- **Keyboard Shortcuts**: react-hotkeys-hook
- **Gestures**: @use-gesture/react

## Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase account and project

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd SheeEasy
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to find your credentials
3. Run the database migration:
   - Go to SQL Editor in Supabase Dashboard
   - Copy and run the contents of `supabase/migrations/001_create_spreadsheets.sql`

### 3. Configure Environment Variables

Create `.env.local` file:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Configure OAuth Providers (Optional)

To enable Google and GitHub sign-in:

1. In Supabase Dashboard, go to Authentication > Providers
2. Enable Google:
   - Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
   - Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
   - Add Client ID and Secret to Supabase
3. Enable GitHub:
   - Create OAuth app in [GitHub Settings](https://github.com/settings/developers)
   - Add callback URL: `https://your-project.supabase.co/auth/v1/callback`
   - Add Client ID and Secret to Supabase

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
SheeEasy/
├── app/
│   ├── auth/callback/       # OAuth callback handler
│   ├── dashboard/           # User dashboard page
│   ├── spreadsheet/[id]/    # Spreadsheet editor page
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Login page
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx    # Authentication form
│   ├── dashboard/
│   │   └── DashboardClient.tsx  # Dashboard interface
│   └── spreadsheet/
│       ├── Cell.tsx         # Individual cell component
│       ├── FormulaBar.tsx   # Formula input bar
│       ├── Grid.tsx         # Spreadsheet grid
│       ├── SheetTabs.tsx    # Sheet tab navigation
│       ├── SpreadsheetEditor.tsx  # Main editor wrapper
│       └── Toolbar.tsx      # Formatting toolbar
├── lib/
│   ├── formulas/
│   │   ├── dependencyGraph.ts  # Formula dependency tracking
│   │   ├── evaluator.ts        # Formula evaluation engine
│   │   ├── functions.ts        # Excel function implementations
│   │   ├── parser.ts           # Formula tokenizer/parser
│   │   └── utils.ts            # A1 notation utilities
│   ├── store/
│   │   └── spreadsheetStore.ts  # Zustand state management
│   ├── supabase/
│   │   ├── client.ts        # Client-side Supabase client
│   │   └── server.ts        # Server-side Supabase client
│   ├── import-export.ts     # CSV/XLSX import/export
│   └── offline.ts           # LocalStorage offline support
├── types/
│   ├── spreadsheet.ts       # Spreadsheet data types
│   └── supabase.ts          # Database schema types
└── supabase/
    └── migrations/
        └── 001_create_spreadsheets.sql  # Database schema

```

## Usage Guide

### Creating a Spreadsheet

1. Sign up or log in
2. Click "New Spreadsheet" on the dashboard
3. Enter a title and click "Create"

### Editing Cells

- **Single click**: Select a cell
- **Double click** or **Enter**: Edit a cell
- **Type**: Start typing to edit
- **Escape**: Cancel editing
- **Enter**: Save and move down
- **Tab**: Save and move right

### Using Formulas

Start any cell with `=` to create a formula:

```
=A1+B1           // Add two cells
=SUM(A1:A10)     // Sum a range
=AVERAGE(B1:B5)  // Average of cells
=IF(A1>10,"Yes","No")  // Conditional
=A1*B1+C1        // Arithmetic
```

### Keyboard Shortcuts

- `Ctrl+C` / `Cmd+C`: Copy
- `Ctrl+X` / `Cmd+X`: Cut
- `Ctrl+V` / `Cmd+V`: Paste
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Y`: Redo
- `Arrow Keys`: Navigate cells
- `Enter`: Edit cell or move down
- `Tab`: Move right
- `Escape`: Cancel editing

### Importing Data

1. Click "Import" button
2. Select CSV or XLSX file
3. Data will be loaded into current spreadsheet

### Exporting Data

1. Click "Export" dropdown
2. Choose format (CSV, XLSX, or JSON)
3. File will be downloaded

### Offline Mode

- Spreadsheets automatically save to localStorage
- Changes sync to Supabase when online
- Offline indicator shows when disconnected

## Database Schema

### spreadsheets table

```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to auth.users)
- title: TEXT
- sheet_data: JSONB (stores cells, formulas, styles, etc.)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

Row Level Security ensures users can only access their own spreadsheets.

## Architecture Highlights

### State Management
- **Zustand** for global state with **Immer** for immutable updates
- Separate stores for spreadsheet data and UI state
- History system for undo/redo functionality

### Formula Engine
- Custom tokenizer and parser for Excel-like formulas
- Dependency graph tracks cell relationships
- Automatic recalculation when dependencies change
- Support for nested formulas and ranges

### Auto-Save System
- Immediate save to localStorage (0ms)
- Debounced save to Supabase (3 seconds after last change)
- Conflict resolution on sync

### Offline Support
- All spreadsheet data cached in localStorage
- Automatic sync when connection restored
- Works completely offline with full functionality

## Building for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS
- Digital Ocean

Make sure to set the environment variables in your deployment platform.

## Troubleshooting

### Formulas not calculating
- Check for circular references
- Ensure cell references are valid
- Check browser console for errors

### Auth not working
- Verify Supabase credentials in `.env.local`
- Check Supabase project is active
- Ensure redirect URLs are configured

### Data not saving
- Check browser console for errors
- Verify Supabase connection
- Check Row Level Security policies

## Future Enhancements

Potential features for future versions:
- Real-time collaboration
- Chart creation
- Conditional formatting
- Data validation
- Pivot tables
- Filter and sort
- Cell comments
- Version history
- Template library
- Mobile app

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js, React, and Supabase
