# Amazon Price Tracker - Project TODO

## Phase 1: Database Schema & Backend Infrastructure
- [x] Define database schema (products, price_history, users tables)
- [x] Set up tRPC procedures for product operations
- [x] Create database helper functions in server/db.ts
- [x] Configure environment variables for API keys and email service

## Phase 2: Backend API Endpoints
- [x] Create POST /api/trpc/products.add endpoint to add tracked products
- [x] Create GET /api/trpc/products.list endpoint to fetch user's tracked products
- [x] Create DELETE /api/trpc/products.remove endpoint to stop tracking
- [x] Create PUT /api/trpc/products.updateTarget endpoint to update target price
- [x] Create GET /api/trpc/priceHistory.get endpoint to fetch price history

## Phase 3: Price Scraping & Cron Job
- [x] Implement Amazon product URL parser to extract ASIN
- [x] Set up price scraping logic (using API or proxy service)
- [ ] Create daily cron job scheduler to check prices
- [ ] Implement price comparison logic and notification trigger
- [ ] Create background job handler for price checking

## Phase 4: Frontend UI Components
- [x] Build product URL input form with validation
- [x] Build target price and email input form
- [x] Create product tracking dashboard with list view
- [x] Create price history chart/graph component
- [x] Build product detail view with price trends
- [x] Add loading states and error handling

## Phase 5: Email Notifications & Testing
- [x] Set up email service integration (SendGrid or similar)
- [x] Create email template for price drop alerts
- [ ] Implement email sending logic in price check job
- [ ] Test end-to-end: add product → check price → send email
- [ ] Test multiple products tracking simultaneously
- [ ] Verify cron job runs daily without manual intervention

## Phase 6: Deployment & Delivery
- [ ] Final testing and bug fixes
- [ ] Create checkpoint for deployment
- [ ] Deliver website to user
