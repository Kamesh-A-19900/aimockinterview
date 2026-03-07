# ⚠️ IMPORTANT: Run Migration First!

## Before Starting the Server

You need to run the database migration ONCE to add the coding interview tables.

### Run This Command (One Time Only)

```bash
cd server
node database/migrate.js
```

You should see:
```
🔄 Running database migrations...
✅ Database migrations completed successfully
🌱 Seeding coding problems...
✅ Added: Two Sum (easy)
✅ Added: Valid Parentheses (easy)
✅ Added: Longest Substring Without Repeating Characters (medium)
✅ Added: Merge Intervals (medium)
✅ Added: LRU Cache (hard)
🎉 Coding problems seeded successfully!
```

---

## Then Start Normally

### Terminal 1 - Backend
```bash
cd server
npm start
```

### Terminal 2 - Frontend
```bash
cd client
npm start
```

---

## ✅ Done!

After running the migration once, you can start the servers normally with `npm start`.

The migration adds:
- ✅ `programming_language` column to `interview_sessions`
- ✅ `coding_problems` table with 5 problems
- ✅ `code_submissions` table
- ✅ `coding_chat_messages` table

---

## Quick Test

After starting both servers:
1. Go to `http://localhost:3000/interview`
2. Click "Coding Interview"
3. Select JavaScript + 60 minutes
4. Start interview
5. You should see "Problem 1: Two Sum"

---

**Status:** ✅ Migration Complete - Ready to Demo!
