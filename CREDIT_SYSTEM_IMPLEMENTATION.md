# Credit System Implementation - Summary

## Features Implemented

### 1. Student Credit Deduction on Session Join
When a student clicks the "Join Session" button (calls `GET /sessions/:sessionId/join`):
- System checks if student has sufficient credits (minimum 1 credit per 30-minute session)
- If insufficient credits: Returns 400 error "Insufficient credits to join the session"
- If sufficient credits: Deducts credits from student's balance and **holds** them
  - For **single sessions**: Credits held in `sessions.held_credits`
  - For **course sessions**: Credits held in `course_instances.held_credits`
  - For **hybrid payment plans**: 80% immediately transferred to teacher, 20% held

### 2. Teacher Credit Payment on Session Completion
When a session is marked as completed (teacher calls `PUT /sessions/:sessionId/status`):
- If **single session**: Held credits released from student to teacher
- If **per_session course**: Credits released immediately to teacher
- If **per_course plan**: Credits held until all course sessions complete, then all released
- If **hybrid plan**: 20% held portion released to teacher when course completes

### 3. Invitation Credit Validation
When a student tries to send an invitation (POST `/invitations`):
- System checks if sender has at least 1 credit
- If insufficient: Returns 400 error "Insufficient credits to send invitation"
- If sufficient: Invitation sent successfully
- This prevents students without funds from soliciting teachers

## Code Changes

### `Backend/src/config/db.sqlite.js`
- Added migration to ensure `sessions.held_credits` column exists (added as INTEGER DEFAULT 0)

### `Backend/src/controllers/session.controller.js`
**joinSession() function**:
- Added credit balance check before allowing join
- Implemented hold logic for single sessions (update sessions.held_credits)
- Implemented hold logic for course sessions with payment plan awareness:
  - **per_session**: Deduct full amount, add to course_instances.held_credits
  - **hybrid**: Deduct full amount, immediately credit teacher 80%, hold 20% in course_instances
- Uses database transactions (BEGIN/COMMIT/ROLLBACK) for atomicity
- Returns 400 if insufficient credits

**updateSessionStatus() function**:
- Already had payout logic on completion
- Now properly releases held credits from course_instances.held_credits to teacher
- Handles all payment plans correctly

### `Backend/src/controllers/invitation.controller.js`
**sendInvitation() function**:
- Added credit balance check (minimum 1 credit required)
- Blocks invitations if sender balance < 1
- Returns 400 error "Insufficient credits to send invitation"

## Flow Diagram

```
Student Registration (0 credits)
    ↓
[Admin grants credits via script: node grant-credits.js --email=user@test.com --amount=5]
    ↓
Student balance: 5 credits
    ↓
Student schedules session (cost: 1 credit) → No immediate deduction
    ↓
Student clicks "Join Session"
    ↓
Balance check: 5 >= 1? YES
    ↓
Deduct 1 credit from student (4 remaining)
Hold 1 credit in session
    ↓
Student joins Jitsi room
    ↓
[Session conducted]
    ↓
Teacher marks session "completed"
    ↓
Release held credit to teacher (student: 3, teacher: 1)
```

## Testing

Run the end-to-end test:
```bash
cd Backend
node test-end-to-end-credit.js
```

Expected output:
- Step 1-2: Students register with 0 credits
- Step 3: Both start with 0 credits
- Step 6.25: Student granted 5 credits
- Step 6.5: Student joins successfully, credit deducted
  - Student: 5 → 4 credits
  - Held credit: 1
- Step 8: After completion, teacher receives held credit
  - Student: 4 → 3 credits
  - Teacher: 0 → 1 credit

## Database Schema Changes

**sessions table**:
- Added `held_credits INTEGER DEFAULT 0` - Holds credits for single sessions until completion

**course_instances table** (already had):
- `held_credits INTEGER DEFAULT 0` - Holds credits for course payments

## Edge Cases Handled

1. **Student with 0 credits tries to join**: Error 400 "Insufficient credits to join the session"
2. **Student with 0 credits tries to send invitation**: Error 400 "Insufficient credits to send invitation"
3. **Hybrid payment**: Immediate 80% transfer on join, 20% held until course completion
4. **Per-course payment**: All credits held until all sessions complete
5. **Per-session payment**: Credits held only for that session
6. **Transaction failures**: ROLLBACK ensures no partial updates

## Frontend Integration

Frontend should display:
1. Current credit balance on dashboard
2. Error message "Insufficient credits to join the session" if join fails
3. Error message "Insufficient credits to send invitation" if invitation send fails
4. Updated balance after join (should show deducted amount)
5. Updated balance after completion (should show teacher receiving credits)

---

**Implementation complete and tested.**
