# FileFlow Firestore Setup

## Security Rules (paste in Rules tab)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isUser(userId) { return isAuth() && request.auth.uid == userId; }
    function isOwner(resource) { return isAuth() && request.auth.uid == resource.data.userId; }

    match /users/{userId} {
      allow read: if isUser(userId);
      allow create: if isAuth() && isUser(userId);
      allow update: if isUser(userId);
      allow delete: if isUser(userId);
    }
    match /conversions/{conversionId} {
      allow read: if isAuth() && isOwner(resource);
      allow create: if isAuth() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuth() && isOwner(resource);
      allow delete: if isAuth() && isOwner(resource);
    }
    match /subscriptions/{subId} {
      allow read: if isAuth() && isOwner(resource);
      allow write: if false;
    }
    match /invoices/{invoiceId} {
      allow read: if isAuth() && isOwner(resource);
      allow write: if false;
    }
    match /payments/{paymentId} {
      allow read: if isAuth() && isOwner(resource);
      allow write: if false;
    }
    match /analytics/{doc=**} {
      allow read, write: if false;
    }
  }
}
```

## Indexes (create each one)

### Index 1
- Collection: conversions
- Field 1: userId — Ascending
- Field 2: createdAt — Descending

### Index 2
- Collection: conversions
- Field 1: userId — Ascending
- Field 2: status — Ascending
- Field 3: createdAt — Descending

### Index 3
- Collection: subscriptions
- Field 1: userId — Ascending
- Field 2: status — Ascending

### Index 4
- Collection: invoices
- Field 1: userId — Ascending
- Field 2: createdAt — Descending

### Index 5
- Collection: payments
- Field 1: userId — Ascending
- Field 2: createdAt — Descending

## TTL Policy
- Collection: conversions
- Field: expiresAt

## Storage Rules (paste in Storage > Rules tab)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isAuth() { return request.auth != null; }
    function isUser(userId) { return isAuth() && request.auth.uid == userId; }

    match /users/{userId}/{allPaths=**} {
      allow read: if isUser(userId);
      allow write: if false;
      allow delete: if false;
    }

    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## Collections Created by App

The app automatically creates these collections when users interact:

1. **users** — User profiles (created on signup/login)
2. **conversions** — Conversion history (created on each conversion)
3. **subscriptions** — Active subscriptions (created on upgrade)
4. **invoices** — Payment invoices (created on payment)
5. **payments** — Transaction records (created on payment)
