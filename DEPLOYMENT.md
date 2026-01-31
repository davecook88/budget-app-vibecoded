# 🚀 Presupuesto Deployment Checklist

## Pre-Deployment Setup

### 1. Supabase Configuration

- [ ] Create a new Supabase project at [supabase.com](https://supabase.com)
- [ ] Copy your project URL and anon key from Settings → API
- [ ] Run the SQL schema:
  1. Open SQL Editor in Supabase
  2. Copy entire contents of `supabase/schema.sql`
  3. Execute the SQL
  4. Verify all tables were created successfully

### 2. Environment Variables

- [ ] Create `.env.local` file in project root
- [ ] Add Supabase credentials:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
  ```

### 3. Local Testing

- [ ] Install dependencies: `npm install`
- [ ] Run development server: `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Create a test account
- [ ] Create a wallet
- [ ] Add a test transaction
- [ ] Verify offline mode (turn off wifi, add transaction, turn on wifi)

### 4. PWA Icons (Optional)

The app works without custom icons, but for a better experience:

- [ ] Create app icon (512x512 PNG)
- [ ] Generate all icon sizes using a tool like [RealFaviconGenerator](https://realfavicongenerator.net/)
- [ ] Place icons in `public/icons/` directory
- [ ] Update paths in `public/manifest.json` if needed

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy on Vercel

- [ ] Go to [vercel.com](https://vercel.com)
- [ ] Click "New Project"
- [ ] Import your GitHub repository
- [ ] Configure project:
  - Framework Preset: **Next.js**
  - Root Directory: `./`
  - Build Command: `npm run build`
  - Output Directory: `.next`

### 3. Add Environment Variables in Vercel

- [ ] Go to Project Settings → Environment Variables
- [ ] Add both variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Apply to: Production, Preview, and Development

### 4. Deploy

- [ ] Click "Deploy"
- [ ] Wait for build to complete (~2-3 minutes)
- [ ] Visit your deployed URL

## Post-Deployment Testing

### Mobile PWA Installation (iOS)

- [ ] Open site in Safari on iPhone
- [ ] Tap Share button (square with arrow)
- [ ] Scroll down and tap "Add to Home Screen"
- [ ] Tap "Add"
- [ ] Open app from home screen
- [ ] Verify it opens in standalone mode (no browser UI)

### Mobile PWA Installation (Android)

- [ ] Open site in Chrome on Android
- [ ] Tap menu (⋮)
- [ ] Tap "Install app" or "Add to Home Screen"
- [ ] Tap "Install"
- [ ] Open app from home screen
- [ ] Verify standalone mode

### Offline Functionality

- [ ] While connected, add a transaction
- [ ] Turn on Airplane Mode
- [ ] Add another transaction
- [ ] Verify "Pending sync" indicator appears
- [ ] Turn off Airplane Mode
- [ ] Wait 5-10 seconds
- [ ] Verify transaction syncs automatically
- [ ] Check Supabase dashboard to confirm data

### Multi-Currency Testing

- [ ] Create two wallets (one MXN, one USD)
- [ ] Add expense from MXN wallet
- [ ] Add expense from USD wallet
- [ ] Verify both show correctly on dashboard
- [ ] Set budget in MXN
- [ ] Set budget in USD
- [ ] Verify both calculate correctly

### Household Mode

- [ ] Create second user account (use different email)
- [ ] In first account, create a shared wallet
- [ ] Add shared transaction
- [ ] Switch to household view
- [ ] Verify shared transaction appears
- [ ] Switch back to personal view
- [ ] Verify only personal transactions show

### Trip Mode

- [ ] Create a new trip
- [ ] Activate the trip
- [ ] Add transactions
- [ ] Verify dashboard shows only trip transactions
- [ ] Deactivate trip
- [ ] Verify dashboard returns to normal

## Production Monitoring

### Week 1 Checks

- [ ] Monitor Supabase usage (Database, Auth, Storage)
- [ ] Check for any error logs in Vercel
- [ ] Verify all features working for real users
- [ ] Monitor service worker registration
- [ ] Check PWA manifest loads correctly

### Ongoing Maintenance

- [ ] Weekly backup of Supabase database
- [ ] Monthly review of error logs
- [ ] Update dependencies quarterly
- [ ] Monitor Supabase free tier limits

## Troubleshooting

### Build Fails on Vercel

- Verify `package.json` has all dependencies
- Check Node.js version (should be 18+)
- Review build logs for specific error
- Try building locally: `npm run build`

### Users Can't Sign Up

- Check Supabase Auth settings
- Verify environment variables are set
- Check email confirmation settings in Supabase

### Transactions Not Syncing

- Verify Row Level Security policies are active
- Check user has proper authentication
- Review browser console for errors
- Verify service worker is registered

### PWA Not Installing

- Ensure site is served over HTTPS
- Check manifest.json is accessible
- Verify service worker is registered
- Review browser console for manifest errors

## Security Considerations

- [ ] Review Row Level Security policies in Supabase
- [ ] Ensure `.env.local` is in `.gitignore`
- [ ] Never commit API keys to git
- [ ] Enable Supabase email confirmation (optional)
- [ ] Set up Supabase database backups
- [ ] Review Auth provider settings

## Performance Optimization

### Optional Enhancements

- [ ] Add database indexes for frequently queried fields
- [ ] Enable Supabase Edge Functions for complex calculations
- [ ] Configure CDN caching in Vercel
- [ ] Optimize images if added later
- [ ] Consider using Supabase Realtime for live updates

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **PWA Guidelines**: https://web.dev/progressive-web-apps/

## Success Criteria

✅ App loads on mobile and desktop
✅ Users can create accounts
✅ Transactions can be added online and offline
✅ PWA installs on iOS and Android
✅ Multi-currency tracking works correctly
✅ Budgets calculate and display properly
✅ Trip mode isolates transactions
✅ Household view shows shared expenses
✅ Service worker caches assets for offline use
✅ Auto-sync works when connection restored

---

**Last Updated**: December 30, 2025
**Version**: 1.0.0
