# Project Memory - Flow Writer

## shadcn/ui + Tailwind CSS Setup (2025-10-02)

### Critical Lessons Learned

#### Always Verify Before Declaring Success
- **MUST** test the application renders correctly before completion
- **MUST** check both frontend and backend outputs for errors
- **MUST** monitor background processes during testing
- Run `pnpm run tauri dev` and verify no errors in console

#### Tailwind CSS Version Compatibility
- **Tailwind CSS v4+**: Requires `@tailwindcss/postcss` (new architecture)
- **Tailwind CSS v3.x**: Works with standard PostCSS plugin setup
- **shadcn/ui**: Compatible with Tailwind CSS v3 (tested with v3.4.18)
- **Error Pattern**: If seeing `[postcss] It looks like you're trying to use 'tailwindcss' directly as a PostCSS plugin`, downgrade to v3.x

#### Installation Commands
```bash
# Install correct Tailwind version for shadcn
pnpm remove tailwindcss
pnpm add -D tailwindcss@^3.4.0

# Install shadcn dependencies
pnpm add -D tailwindcss@^3.4.0 postcss autoprefixer tailwindcss-animate
pnpm add class-variance-authority clsx tailwind-merge next-themes lucide-react
```

#### Required Configuration Files
1. **jsconfig.json** - Required for shadcn CLI to work
2. **components.json** - shadcn configuration
3. **tailwind.config.js** - Use v3 syntax with `require("tailwindcss-animate")`
4. **postcss.config.js** - Standard PostCSS setup
5. **vite.config.js** - Add path alias for `@` to `./src`

#### Theme Setup
- Use `next-themes` for theme management
- Add `suppressHydrationWarning` to html tag
- Wrap app with `ThemeProvider` with `attribute="class"` and `enableSystem`
- Import `index.css` in `main.jsx`

### Project Structure
```
src/
├── components/
│   ├── ui/              # shadcn components
│   │   └── button.jsx
│   ├── theme-provider.jsx
│   └── theme-toggle.jsx
├── lib/
│   └── utils.js         # cn() helper
├── index.css            # Tailwind directives + CSS variables
├── App.jsx
└── main.jsx
```

### Best Practices
- Stop all background processes when done testing
- Test dev server before declaring task complete
- Verify no console errors in both Vite and Tauri outputs
